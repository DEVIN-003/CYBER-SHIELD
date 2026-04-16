import warnings

import pandas as pd
import numpy as np
import pickle
import os

try:
    from sklearn.exceptions import InconsistentVersionWarning
    warnings.filterwarnings("ignore", category=InconsistentVersionWarning)
except Exception:
    pass

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


def ensure_derived_features(frame):
    derived = frame.copy()

    if "risk_score" not in derived.columns:
        anomaly = pd.to_numeric(derived.get("anomaly_score", 0), errors="coerce").fillna(0)
        trust = pd.to_numeric(derived.get("trust_score", 0.5), errors="coerce").fillna(0.5)
        success = pd.to_numeric(derived.get("attack_success", 0), errors="coerce").fillna(0)
        derived["risk_score"] = (anomaly * 0.5 + (1 - trust) * 0.3 + success * 0.2).clip(0, 1)

    if "attack_category" not in derived.columns:
        service = derived.get("service", "").astype(str).str.lower()
        protocol = derived.get("protocol_type", "").astype(str).str.lower()
        failed = pd.to_numeric(derived.get("num_failed_logins", 0), errors="coerce").fillna(0)
        count = pd.to_numeric(derived.get("count", 0), errors="coerce").fillna(0)
        success = pd.to_numeric(derived.get("attack_success", 0), errors="coerce").fillna(0)

        derived["attack_category"] = np.select(
            [
                service.eq("ftp") | failed.gt(0),
                protocol.eq("icmp") | count.gt(80) | success.gt(0),
            ],
            ["R2L", "DoS"],
            default="normal",
        )

    return derived


X = ensure_derived_features(X)

drop_cols = ["source_ip", "destination_ip", "timestamp"]
X = X.drop(columns=[c for c in drop_cols if c in X.columns])

# Encode categoricals, then align strictly to the saved training feature list.
X = pd.get_dummies(X)
X = X.reindex(columns=feature_columns, fill_value=0)

print("Feature count expected:", len(feature_columns))
print("Feature count actual:", X.shape[1])

X = X.apply(pd.to_numeric, errors="coerce").fillna(0)

# Scale
scaler_features = list(getattr(scaler, "feature_names_in_", feature_columns))
X = X.reindex(columns=scaler_features, fill_value=0)
X_scaled = scaler.transform(X)

# ================================
# 🔥 ENSEMBLE PREDICTION
# ================================

def align_probs(probs, model_classes, target_classes):
    prob_df = pd.DataFrame(probs, columns=model_classes)
    prob_df = prob_df.reindex(columns=target_classes, fill_value=0)
    return prob_df.values


classes = rf.classes_

rf_prob = align_probs(rf.predict_proba(X_scaled), rf.classes_, classes)
svm_prob = align_probs(svm.predict_proba(X_scaled), svm.classes_, classes)
mlp_prob = align_probs(mlp.predict_proba(X_scaled), mlp.classes_, classes)
ada_prob = align_probs(ada.predict_proba(X_scaled), ada.classes_, classes)

final_prob = (
    rf_prob * 0.3 +
    svm_prob * 0.2 +
    mlp_prob * 0.3 +
    ada_prob * 0.2
)

# ================================
# FINAL PREDICTION
# ================================

predictions = np.argmax(final_prob, axis=1)
encoded_labels = classes[predictions].astype(int)
attack_labels = label_encoder.inverse_transform(encoded_labels)

# ================================
# 🔥 RISK SCORE
# ================================

confidence = np.max(final_prob, axis=1)
risk_scores = (confidence * 100).astype(int)

print("\nPrediction Distribution:")
print(pd.Series(attack_labels).value_counts())
print("Unique predictions:", set(attack_labels))

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

def get_recommendations(attack_type, source_ip, destination_port):
    """
    Returns a list of recommended mitigation steps.
    Contract:
      - normal -> exactly 1 message
      - any other attack -> exactly 6 recommendations (2 common + 4 attack-specific)
    """
    if attack_type == "normal":
        return ["No action required. Continue monitoring."]

    # Common recommendations (must be present in every attack)
    common = [
        f"Block source IP {source_ip}",
        f"Restrict port {destination_port}",
    ]

    if attack_type == "neptune":
        return common + [
            "Enable rate limiting",
            "Configure firewall traffic filtering",
            "Activate DDoS protection",
            "Monitor network traffic spikes",
        ]

    if attack_type == "smurf":
        return common + [
            "Disable ICMP broadcast",
            "Enable anti-spoofing protection",
            "Configure router filtering rules",
            "Drop malformed ICMP packets",
        ]

    if attack_type == "guess_passwd":
        return common + [
            "Enable account lockout policy",
            "Enforce strong password rules",
            "Enable multi-factor authentication",
            "Monitor failed login attempts",
        ]

    # Fallback for unexpected classes (keeps exact length contract)
    return common + [
        "Monitor logs",
        "Enable IDS/IPS",
        "Apply rate limiting",
        "Enable firewall traffic filtering",
    ]

def generate_recommendation(row, attack):
    src = row.get("source_ip", "")
    dst = row.get("destination_ip", "")
    port = row.get("destination_port", "")

    if attack == "normal":
        return (
            f"Normal traffic between {src} and {dst}.",
            get_recommendations(attack, src, port),
        )

    reason = f"{attack.upper()} attack detected from {src} targeting {dst}."
    steps = get_recommendations(attack, src, port)
    return reason, steps

# ================================
# BUILD RESULTS
# ================================

results = []

for i, attack in enumerate(attack_labels):

    row = test_df.iloc[i]
    risk = int(risk_scores[i])

    prediction = "Normal" if attack == "normal" else "Attack"
    status = prediction
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
        "prediction": prediction,
        "attack_type": str(attack),
        "attack_category": str(attack),
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