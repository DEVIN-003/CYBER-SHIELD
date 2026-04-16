from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO
import warnings

import pandas as pd
import subprocess
import os
import ast   # ✅ SAFE conversion
import sys
import json
import uuid
import bcrypt

try:
    from sklearn.exceptions import InconsistentVersionWarning
    warnings.filterwarnings("ignore", category=InconsistentVersionWarning)
except Exception:
    pass

try:
    from live_predictor import predict_live_data
except ImportError:
    from app.live_predictor import predict_live_data

app = Flask(__name__)
CORS(app)
# threading avoids eventlet/gevent on Windows (no compiler / VS Build Tools required)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")

# ================================
# PATH SETUP
# ================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(BASE_DIR)

DATASET_PATH = os.path.join(ROOT_DIR, "dataset", "uploaded_test.csv")
RESULT_PATH = os.path.join(ROOT_DIR, "results", "detection_results.csv")
PREDICT_SCRIPT = os.path.join(ROOT_DIR, "predict_hybrid.py")
USERS_PATH = os.path.join(BASE_DIR, "users.json")
LATEST_DATA_PATH = os.path.join(BASE_DIR, "latest_data.json")


def load_users():
    if not os.path.exists(USERS_PATH):
        return []
    with open(USERS_PATH, "r", encoding="utf-8") as file:
        return json.load(file)


def save_users(users):
    with open(USERS_PATH, "w", encoding="utf-8") as file:
        json.dump(users, file, indent=2)


def to_public_user(user):
    return {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "role": user["role"]
    }


def ensure_default_admin():
    users = load_users()
    if any(u["email"].lower() == "admin@gmail.com" for u in users):
        return

    password_hash = bcrypt.hashpw("admin".encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    users.append({
        "id": str(uuid.uuid4()),
        "name": "Admin",
        "email": "admin@gmail.com",
        "password": password_hash,
        "role": "Admin"
    })
    save_users(users)


ensure_default_admin()


def load_latest_data():
    if not os.path.exists(LATEST_DATA_PATH):
        return None
    with open(LATEST_DATA_PATH, "r", encoding="utf-8") as file:
        return json.load(file)


def save_latest_data(data):
    with open(LATEST_DATA_PATH, "w", encoding="utf-8") as file:
        json.dump(data, file, indent=2)


LATEST_DATA = load_latest_data()
LIVE_ROWS = []


def summarize_rows(rows):
    attack_dist = {}
    attacks = 0
    for row in rows:
        if row.get("Status") == "Attack":
            attacks += 1
        attack_type = row.get("Attack Type", "")
        attack_dist[attack_type] = attack_dist.get(attack_type, 0) + 1
    return {
        "Total Records": len(rows),
        "Detected Attacks": attacks,
        "Detected Normal": len(rows) - attacks,
        "Attack Type Distribution": attack_dist,
        "Most Frequent Attack": max(attack_dist, key=attack_dist.get) if attack_dist else "None",
        "rows": rows
    }


@app.route("/login", methods=["POST"])
def login():
    try:
        payload = request.get_json(silent=True) or {}
        email = str(payload.get("email", "")).strip().lower()
        password = str(payload.get("password", ""))

        if not email or not password:
            return jsonify({"error": "Email and password are required"}), 400

        users = load_users()
        user = next((u for u in users if u["email"].lower() == email), None)
        if not user:
            return jsonify({"error": "Invalid credentials"}), 401

        if not bcrypt.checkpw(password.encode("utf-8"), user["password"].encode("utf-8")):
            return jsonify({"error": "Invalid credentials"}), 401

        return jsonify({"user": to_public_user(user)})
    except Exception as e:
        print("LOGIN ERROR:", str(e))
        return jsonify({"error": str(e)}), 500


@app.route("/users", methods=["GET"])
def get_users():
    try:
        users = load_users()
        return jsonify({"users": [to_public_user(user) for user in users]})
    except Exception as e:
        print("GET USERS ERROR:", str(e))
        return jsonify({"error": str(e)}), 500


@app.route("/users", methods=["POST"])
def create_user():
    try:
        payload = request.get_json(silent=True) or {}
        actor_role = str(payload.get("actorRole", "")).strip()
        name = str(payload.get("name", "")).strip()
        email = str(payload.get("email", "")).strip().lower()
        password = str(payload.get("password", ""))
        role = str(payload.get("role", "")).strip()

        if actor_role != "Admin":
            return jsonify({"error": "Only admin can create users"}), 403

        if not name or not email or not password or role not in ["Admin", "Staff"]:
            return jsonify({"error": "Name, email, password and valid role are required"}), 400

        users = load_users()
        if any(u["email"].lower() == email for u in users):
            return jsonify({"error": "User already exists"}), 409

        password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
        user = {
            "id": str(uuid.uuid4()),
            "name": name,
            "email": email,
            "password": password_hash,
            "role": role
        }
        users.append(user)
        save_users(users)

        return jsonify({"user": to_public_user(user)}), 201
    except Exception as e:
        print("CREATE USER ERROR:", str(e))
        return jsonify({"error": str(e)}), 500

# ================================
# UPLOAD API
# ================================

@app.route("/upload", methods=["POST"])
def upload():

    try:
        file = request.files["file"]

        # Save uploaded dataset
        file.save(DATASET_PATH)

        # Run prediction script
        subprocess.run(
            [sys.executable, PREDICT_SCRIPT],
            check=True
        )

        # Load results
        df = pd.read_csv(RESULT_PATH)

        # ================================
        # 🔥 FIX 1: HANDLE NaN
        # ================================
        df = df.fillna("")

        # ================================
        # 🔥 FIX 2: CONVERT STEPS STRING → LIST
        # ================================
        if "Steps" in df.columns:
            def convert_steps(x):
                try:
                    if isinstance(x, str) and x.startswith("["):
                        return ast.literal_eval(x)   # ✅ safe conversion
                    else:
                        return []
                except:
                    return []

            df["Steps"] = df["Steps"].apply(convert_steps)

        # ================================
        # SUMMARY
        # ================================
        total = len(df)
        attacks = len(df[df["Status"] == "Attack"])
        normal = len(df[df["Status"] == "Normal"])

        attack_dist = df["Attack Type"].value_counts().to_dict()
        most_attack = max(attack_dist, key=attack_dist.get) if attack_dist else "None"

        # ================================
        # RESPONSE
        # ================================
        response_data = {
            "Total Records": total,
            "Detected Attacks": attacks,
            "Detected Normal": normal,
            "Attack Type Distribution": attack_dist,
            "Most Frequent Attack": most_attack,
            "rows": df.to_dict(orient="records")
        }

        global LATEST_DATA
        LATEST_DATA = response_data
        save_latest_data(response_data)

        return jsonify(response_data)

    except Exception as e:
        print("ERROR:", str(e))
        return jsonify({"error": str(e)}), 500


@app.route("/data", methods=["GET"])
def get_data():
    if not LATEST_DATA:
        return jsonify({"error": "No data available. Upload data first."}), 404
    return jsonify(LATEST_DATA)


@app.route("/api/live-data", methods=["POST"])
def ingest_live_data():
    try:
        payload = request.get_json(silent=True) or {}
        if isinstance(payload, dict) and "records" in payload:
            records = payload.get("records") or []
        elif isinstance(payload, list):
            records = payload
        else:
            records = [payload] if payload else []

        if not records:
            return jsonify({"error": "No live records provided"}), 400

        processed = predict_live_data(records)

        global LIVE_ROWS
        LIVE_ROWS.extend(processed)
        LIVE_ROWS = LIVE_ROWS[-300:]

        summary = summarize_rows(LIVE_ROWS)
        socketio.emit("live_update", {
            "row": processed[-1],
            "summary": summary
        })
        return jsonify({"processed": processed, "summary": summary})
    except Exception as e:
        print("LIVE DATA ERROR:", str(e))
        return jsonify({"error": str(e)}), 500


# ================================
# RUN SERVER
# ================================

if __name__ == "__main__":
    # allow_unsafe_werkzeug: required by flask-socketio 5.4+ when using the Werkzeug dev server
    socketio.run(app, debug=True, allow_unsafe_werkzeug=True)