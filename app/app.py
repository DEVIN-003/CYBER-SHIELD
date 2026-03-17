from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import subprocess
import os

app = Flask(__name__)
CORS(app)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATASET_DIR = os.path.join(BASE_DIR, "dataset")
RESULTS_DIR = os.path.join(BASE_DIR, "results")

@app.route("/upload", methods=["POST"])
def upload_file():

    file = request.files["file"]

    dataset_path = os.path.join(DATASET_DIR, "uploaded_test.csv")
    file.save(dataset_path)

    # Run prediction script
    subprocess.run(["d:/anaconda/python.exe", os.path.join(BASE_DIR, "predict_hybrid.py")])

    results_path = os.path.join(RESULTS_DIR, "detection_results.csv")

    results = pd.read_csv(results_path)
    results = results.fillna("None")

    total_records = len(results)
    attacks = int((results["Status"] == "Attack").sum())
    normal = int((results["Status"] == "Normal").sum())

    attack_dist = results["Attack Type"].value_counts().to_dict()

    most_attack = "None"
    if len(attack_dist) > 0:
        most_attack = list(attack_dist.keys())[0]

    return jsonify({
        "Total Records": total_records,
        "Detected Attacks": attacks,
        "Detected Normal": normal,
        "Most Frequent Attack": most_attack,
        "Attack Type Distribution": attack_dist,
        "rows": results.to_dict(orient="records")
    })


if __name__ == "__main__":
    app.run(port=5000)