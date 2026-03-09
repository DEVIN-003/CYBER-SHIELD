from flask import Flask, jsonify, request
from flask_cors import CORS
import pickle
import pandas as pd
import numpy as np
import os

app = Flask(__name__)
CORS(app)

# -------------------------
# Load Models
# -------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "..", "model")

with open(os.path.join(MODEL_DIR, "rf_model.pkl"), "rb") as f:
    rf = pickle.load(f)

with open(os.path.join(MODEL_DIR, "svm_model.pkl"), "rb") as f:
    svm = pickle.load(f)

with open(os.path.join(MODEL_DIR, "mlp_model.pkl"), "rb") as f:
    mlp = pickle.load(f)

with open(os.path.join(MODEL_DIR, "ada_model.pkl"), "rb") as f:
    ada = pickle.load(f)

with open(os.path.join(MODEL_DIR, "model_weights.pkl"), "rb") as f:
    weights = pickle.load(f)

# -------------------------
# Home Route
# -------------------------
@app.route("/")
def home():
    return "HYBRID CYBER-SHIELD Ensemble IDS Running"


# -------------------------
# Upload & Analyze Route
# -------------------------
@app.route("/upload", methods=["POST"])
def upload_file():

    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]

    try:
        df = pd.read_csv(file)
        total_records = len(df)

        # Clean attack labels
        attack_type_counts = {}
        if "class" in df.columns:
            df["class"] = df["class"].astype(str).str.replace(".", "", regex=False)
            attack_type_counts = df["class"].value_counts().to_dict()

        # Drop label columns
        if "class" in df.columns:
            df = df.drop(columns=["class"])
        if "classnum" in df.columns:
            df = df.drop(columns=["classnum"])

        # One-hot encoding
        categorical_cols = ["protocol_type", "service", "flag"]
        df = pd.get_dummies(
            df,
            columns=[col for col in categorical_cols if col in df.columns]
        )

        # Align columns with RF (all models share same features)
        missing_cols = set(rf.feature_names_in_) - set(df.columns)
        for col in missing_cols:
            df[col] = 0

        df = df[rf.feature_names_in_]

        # -------------------------
        # Ensemble Prediction
        # -------------------------

        rf_prob = rf.predict_proba(df)[:, 1]
        mlp_prob = mlp.predict_proba(df)[:, 1]
        ada_prob = ada.predict_proba(df)[:, 1]

        # SGDClassifier does not have predict_proba
        svm_decision = svm.decision_function(df)
        svm_prob = 1 / (1 + np.exp(-svm_decision))  # sigmoid conversion

        # Weighted probability
        final_prob = (
            weights["rf"] * rf_prob +
            weights["svm"] * svm_prob +
            weights["mlp"] * mlp_prob +
            weights["ada"] * ada_prob
        )

        final_predictions = (final_prob > 0.5).astype(int)

        attack_count = int(np.sum(final_predictions == 1))
        normal_count = int(np.sum(final_predictions == 0))

        attack_percentage = round((attack_count / total_records) * 100, 2)
        avg_confidence = round(float(np.mean(final_prob)) * 100, 2)

        filtered_attacks = {
            k: v for k, v in attack_type_counts.items()
            if k.lower() != "normal"
        }

        most_frequent_attack = (
            max(filtered_attacks, key=filtered_attacks.get)
            if filtered_attacks else "None"
        )

        return jsonify({
            "Total Records": total_records,
            "Detected Attacks": attack_count,
            "Detected Normal": normal_count,
            "Attack Percentage": attack_percentage,
            "Average Confidence": avg_confidence,
            "Most Frequent Attack": most_frequent_attack,
            "Attack Type Distribution": filtered_attacks
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True)