from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import subprocess
import os

app = Flask(__name__)
CORS(app)

# ================================
# PATH SETUP
# ================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(BASE_DIR)

DATASET_PATH = os.path.join(ROOT_DIR, "dataset", "uploaded_test.csv")
RESULT_PATH = os.path.join(ROOT_DIR, "results", "detection_results.csv")
PREDICT_SCRIPT = os.path.join(ROOT_DIR, "predict_hybrid.py")

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
            ["d:/anaconda/python.exe", PREDICT_SCRIPT],
            check=True
        )

        # Load results
        df = pd.read_csv(RESULT_PATH)

        # 🔥 FIX: Remove NaN (IMPORTANT)
        df = df.fillna("")

        # Summary
        total = len(df)
        attacks = len(df[df["Status"] == "Attack"])
        normal = len(df[df["Status"] == "Normal"])

        attack_dist = df["Attack Type"].value_counts().to_dict()

        most_attack = max(attack_dist, key=attack_dist.get) if attack_dist else "None"

        return jsonify({
            "Total Records": total,
            "Detected Attacks": attacks,
            "Detected Normal": normal,
            "Attack Type Distribution": attack_dist,
            "Most Frequent Attack": most_attack,
            "rows": df.to_dict(orient="records")
        })

    except Exception as e:
        print("ERROR:", str(e))
        return jsonify({"error": str(e)}), 500


# ================================
# RUN SERVER
# ================================

if __name__ == "__main__":
    app.run(debug=True)