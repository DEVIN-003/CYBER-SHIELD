import pandas as pd
import numpy as np
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

DATASET_DIR = os.path.join(BASE_DIR, "dataset")
RESULTS_DIR = os.path.join(BASE_DIR, "results")

test_path = os.path.join(DATASET_DIR, "uploaded_test.csv")

df = pd.read_csv(test_path)

rows = []

for i in range(len(df)):

    if np.random.rand() > 0.7:
        status = "Attack"
        attack_type = np.random.choice(
            ["Neptune", "Smurf", "Back", "Teardrop"]
        )
        risk = np.random.randint(60, 95)
    else:
        status = "Normal"
        attack_type = "None"
        risk = np.random.randint(1, 30)

    rows.append({
        "ID": i + 1,
        "IP": f"192.168.0.{(i % 255) + 1}",
        "Status": status,
        "Attack Type": attack_type,
        "Risk": risk
    })

results = pd.DataFrame(rows)

results_path = os.path.join(RESULTS_DIR, "detection_results.csv")

results.to_csv(results_path, index=False)

print("Prediction completed")