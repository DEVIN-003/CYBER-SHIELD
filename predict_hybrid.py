import pandas as pd
import numpy as np
import pickle
import os

# ================================
# PATH
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
weights = pickle.load(open(os.path.join(MODEL_DIR, "model_weights.pkl"), "rb"))

print("Classes:", label_encoder.classes_)
print("Models loaded successfully!")

# ================================
# LOAD DATA
# ================================

test_path = os.path.join(DATASET_DIR, "uploaded_test.csv")
test_df = pd.read_csv(test_path)

print("Test dataset loaded:", test_df.shape)

# ================================
# PREPROCESS
# ================================

X = test_df.copy()

drop_cols = ["source_ip", "destination_ip", "timestamp"]
X = X.drop(columns=[c for c in drop_cols if c in X.columns])

categorical_cols = ["protocol_type", "service", "flag", "attack_category"]
existing = [c for c in categorical_cols if c in X.columns]

X = pd.get_dummies(X, columns=existing)

# Align with training/scaler features
# NOTE: Some saved artifacts (feature_columns.pkl) can be out of sync with the fitted scaler
# depending on sklearn versions. Prefer the scaler's own expected feature names when present.
expected_features = getattr(scaler, "feature_names_in_", feature_columns)
X = X.reindex(columns=expected_features, fill_value=0)

X = X.apply(pd.to_numeric, errors="coerce").fillna(0)

# Scale
X = scaler.transform(X)

# ================================
# 🔥 ENSEMBLE PREDICTION
# ================================

rf_prob = rf.predict_proba(X)
svm_prob = svm.predict_proba(X)
mlp_prob = mlp.predict_proba(X)
ada_prob = ada.predict_proba(X)

final_prob = (
    rf_prob * weights["rf"] +
    svm_prob * weights["svm"] +
    mlp_prob * weights["mlp"] +
    ada_prob * weights["ada"]
)

# ================================
# 🔥 SMART CLASS BALANCING FIX
# ================================

classes = label_encoder.classes_
smurf_index = list(classes).index("smurf")
neptune_index = list(classes).index("neptune")

# 🔥 Global boost for smurf
final_prob[:, smurf_index] *= 1.3

for i in range(len(final_prob)):

    smurf_prob = final_prob[i][smurf_index]
    neptune_prob = final_prob[i][neptune_index]

    # If smurf is somewhat close → promote
    if smurf_prob > 0.20 and smurf_prob < neptune_prob:
        final_prob[i][smurf_index] += 0.25

    # If both are very close → prioritize smurf
    if abs(smurf_prob - neptune_prob) < 0.15:
        final_prob[i][smurf_index] += 0.30

    # Normalize probabilities
    final_prob[i] = final_prob[i] / np.sum(final_prob[i])

# ================================
# FINAL PREDICTION
# ================================

final_pred = np.argmax(final_prob, axis=1)
attack_labels = label_encoder.inverse_transform(final_pred)

# ================================
# 🔥 RISK SCORE
# ================================

confidence = np.max(final_prob, axis=1)
risk_scores = (confidence * 100).astype(int)

print("\nPrediction Distribution:")
print(pd.Series(attack_labels).value_counts())

# ================================
# CATEGORY FUNCTION
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
        return "Normal"

# ================================
# RECOMMENDATION ENGINE
# ================================

def generate_recommendation(row, attack):

    src = row.get("source_ip", "")
    dst = row.get("destination_ip", "")
    port = row.get("destination_port", "")

    if attack == "normal":
        return (
            f"Normal traffic between {src} and {dst}.",
            ["No action required. Continue monitoring."]
        )

    steps = [
        f"Block source IP {src}.",
        "Enable firewall filtering.",
        "Monitor logs.",
        "Enable IDS/IPS.",
        f"Restrict port {port}.",
        "Apply rate limiting."
    ]

    reason = f"{attack.upper()} attack detected from {src} targeting {dst}."

    return reason, steps

# ================================
# BUILD RESULTS
# ================================

results = []

for i, attack in enumerate(attack_labels):

    row = test_df.iloc[i]
    risk = int(risk_scores[i])

    if attack == "normal":
        status = "Normal"
        attack_type = "None"
    else:
        status = "Attack"
        attack_type = str(attack)

    category = get_attack_category(attack)
    reason, steps = generate_recommendation(row, attack)

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
        "Category": category,
        "Risk": risk,
        "Reason": reason,
        "Steps": steps
    })

# ================================
# SAVE RESULTS
# ================================

df = pd.DataFrame(results)

os.makedirs(RESULTS_DIR, exist_ok=True)
df.to_csv(os.path.join(RESULTS_DIR, "detection_results.csv"), index=False)

print("\nPrediction completed successfully!")