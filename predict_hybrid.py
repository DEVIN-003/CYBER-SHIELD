import pandas as pd
import numpy as np
import pickle
import os
from scipy.stats import mode

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

MODEL_DIR = os.path.join(BASE_DIR, "model")
DATASET_DIR = os.path.join(BASE_DIR, "dataset")
RESULTS_DIR = os.path.join(BASE_DIR, "results")

# LOAD MODELS
rf = pickle.load(open(os.path.join(MODEL_DIR, "rf_model.pkl"), "rb"))
svm = pickle.load(open(os.path.join(MODEL_DIR, "svm_model.pkl"), "rb"))
mlp = pickle.load(open(os.path.join(MODEL_DIR, "mlp_model.pkl"), "rb"))
ada = pickle.load(open(os.path.join(MODEL_DIR, "ada_model.pkl"), "rb"))

scaler = pickle.load(open(os.path.join(MODEL_DIR, "scaler.pkl"), "rb"))
feature_columns = pickle.load(open(os.path.join(MODEL_DIR, "feature_columns.pkl"), "rb"))
label_encoder = pickle.load(open(os.path.join(MODEL_DIR, "label_encoder.pkl"), "rb"))

print("Models loaded")

# LOAD DATA
test_path = os.path.join(DATASET_DIR, "uploaded_test.csv")
test_df = pd.read_csv(test_path)

# PREPROCESS
X = test_df.drop(columns=["class", "classnum"], errors="ignore")

drop_cols = ["source_ip", "destination_ip", "timestamp"]
X = X.drop(columns=[c for c in drop_cols if c in X.columns])

categorical_cols = ["protocol_type", "service", "flag", "attack_category"]
existing = [c for c in categorical_cols if c in X.columns]

X = pd.get_dummies(X, columns=existing)
X = X.reindex(columns=feature_columns, fill_value=0)
X = X.apply(pd.to_numeric, errors="coerce").fillna(0)
X = scaler.transform(X)

# PREDICTION
rf_pred = rf.predict(X)
svm_pred = svm.predict(X)
mlp_pred = mlp.predict(X)
ada_pred = ada.predict(X)

all_preds = np.vstack([rf_pred, svm_pred, mlp_pred, ada_pred])
final_pred = mode(all_preds, axis=0)[0].flatten()

attack_labels = label_encoder.inverse_transform(final_pred)

# ================================
# INTELLIGENT ENGINE
# ================================

def get_attack_category(attack):
    if attack in ["neptune", "smurf", "back", "teardrop"]:
        return "DoS"
    elif attack in ["buffer_overflow", "rootkit"]:
        return "U2R"
    elif attack in ["guess_passwd", "ftp_write"]:
        return "R2L"
    elif attack in ["ipsweep", "portsweep", "nmap"]:
        return "Probe"
    else:
        return "Unknown"

def generate_recommendation(row, attack, risk, anomaly):

    src = row.get("source_ip", "")
    dst = row.get("destination_ip", "")
    port = row.get("destination_port", "")
    session = row.get("session_time", "")

    category = get_attack_category(attack)

    # ALWAYS provide steps
    steps = [
        f"Block source IP {src} immediately.",
        "Enable firewall filtering rules.",
        "Monitor traffic logs for suspicious activity.",
        "Apply intrusion detection system (IDS).",
        "Restrict unnecessary open ports.",
        "Enable rate limiting to prevent flooding."
    ]

    if attack == "smurf":
        reason = f"Smurf attack detected. ICMP flood from {src} to {dst}. Causes traffic amplification and network congestion."

    elif category == "DoS":
        reason = f"Denial of Service attack detected from {src} targeting {dst} on port {port}. Overloads server resources."

    elif category == "Probe":
        reason = f"Probe attack detected from {src}. Attacker is scanning ports/services on {dst}."

    elif category == "U2R":
        reason = f"User-to-root attack detected. Unauthorized privilege escalation attempt from {src}."

    elif category == "R2L":
        reason = f"Remote-to-local attack detected. Unauthorized access attempt from {src}."

    elif attack == "normal":
        reason = f"Normal traffic between {src} and {dst}. No malicious activity detected."
        steps = ["No action required. Continue monitoring."]

    else:
        reason = f"Suspicious activity detected from {src} targeting {dst}."

    return reason, steps, category

# ================================
# BUILD RESULTS
# ================================

results = []

for i, attack in enumerate(attack_labels):

    row = test_df.iloc[i]

    risk = int(row.get("risk_score", 50))
    anomaly = float(row.get("anomaly_score", 0.5))

    if attack == "normal":
        status = "Normal"
        attack_type = "None"
    else:
        status = "Attack"
        attack_type = str(attack)

    reason, steps, category = generate_recommendation(row, attack, risk, anomaly)

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
        "Category": category,   # 🔥 NEW
        "Risk": risk,
        "Reason": reason,
        "Steps": steps
    })

df = pd.DataFrame(results)

os.makedirs(RESULTS_DIR, exist_ok=True)
df.to_csv(os.path.join(RESULTS_DIR, "detection_results.csv"), index=False)

print("Done!")