import pandas as pd
import numpy as np
import pickle
import os
from scipy.stats import mode

# ================================
# PATH (CORRECT)
# ================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

MODEL_DIR = os.path.join(BASE_DIR, "model")
DATASET_DIR = os.path.join(BASE_DIR, "dataset")
RESULTS_DIR = os.path.join(BASE_DIR, "results")

# ================================
# LOAD MODELS
# ================================

rf = pickle.load(open(os.path.join(MODEL_DIR, "rf_model.pkl"), "rb"))
svm = pickle.load(open(os.path.join(MODEL_DIR, "svm_model.pkl"), "rb"))
mlp = pickle.load(open(os.path.join(MODEL_DIR, "mlp_model.pkl"), "rb"))
ada = pickle.load(open(os.path.join(MODEL_DIR, "ada_model.pkl"), "rb"))

scaler = pickle.load(open(os.path.join(MODEL_DIR, "scaler.pkl"), "rb"))
feature_columns = pickle.load(open(os.path.join(MODEL_DIR, "feature_columns.pkl"), "rb"))
label_encoder = pickle.load(open(os.path.join(MODEL_DIR, "label_encoder.pkl"), "rb"))

print("All models loaded successfully!")

# ================================
# LOAD DATA
# ================================

test_path = os.path.join(DATASET_DIR, "uploaded_test.csv")

if not os.path.exists(test_path):
    raise FileNotFoundError("uploaded_test.csv not found")

test_df = pd.read_csv(test_path)

print("Test dataset loaded:", test_df.shape)

# ================================
# PREPROCESS
# ================================

X = test_df.drop(columns=["class", "classnum"], errors="ignore")

drop_cols = ["source_ip", "destination_ip", "timestamp"]
X = X.drop(columns=[c for c in drop_cols if c in X.columns])

categorical_cols = ["protocol_type", "service", "flag", "attack_category"]
existing = [c for c in categorical_cols if c in X.columns]

X = pd.get_dummies(X, columns=existing)

X = X.reindex(columns=feature_columns, fill_value=0)
X = X.apply(pd.to_numeric, errors="coerce").fillna(0)

X = scaler.transform(X)

# ================================
# PREDICTION
# ================================

rf_pred = rf.predict(X)
svm_pred = svm.predict(X)
mlp_pred = mlp.predict(X)
ada_pred = ada.predict(X)

all_preds = np.vstack([rf_pred, svm_pred, mlp_pred, ada_pred])
final_pred = mode(all_preds, axis=0)[0].flatten()

attack_labels = label_encoder.inverse_transform(final_pred)

# ================================
# BUILD RESULTS
# ================================

results = []

for i, attack in enumerate(attack_labels):

    row = test_df.iloc[i]

    risk = int(row.get("risk_score", 50))
    anomaly = float(row.get("anomaly_score", 0.5))
    prev = int(row.get("previous_attack_count", 0))

    if attack == "normal":
        status = "Normal"
        attack_type = "None"
    else:
        status = "Attack"
        attack_type = str(attack)

    # Recommendation logic
    if risk > 80:
        action = "🚨 Block IP"
        reason = "High risk"
    elif prev > 5:
        action = "⚠️ Repeat attacker"
        reason = "Multiple previous attacks"
    elif anomaly > 0.8:
        action = "🟡 Monitor"
        reason = "High anomaly"
    else:
        action = "🟢 Safe"
        reason = "Normal behavior"

    results.append({
        "ID": i + 1,
        "Source IP": row.get("source_ip", ""),
        "Destination IP": row.get("destination_ip", ""),
        "Source Port": row.get("source_port", 0),
        "Destination Port": row.get("destination_port", 0),
        "Session Time": row.get("session_time", 0),
        "Timestamp": row.get("timestamp", ""),
        "Status": status,
        "Attack Type": attack_type,
        "Risk": risk,
        "Recommendation": action,
        "Reason": reason
    })

df = pd.DataFrame(results)

os.makedirs(RESULTS_DIR, exist_ok=True)

result_path = os.path.join(RESULTS_DIR, "detection_results.csv")
df.to_csv(result_path, index=False)

print("Prediction completed!")
print("Results saved to:", result_path)