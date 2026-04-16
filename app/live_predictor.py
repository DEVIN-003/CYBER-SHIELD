import os
import pickle
import numpy as np
import pandas as pd

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_DIR = os.path.join(BASE_DIR, "model")


def _load_pickle(name):
    with open(os.path.join(MODEL_DIR, name), "rb") as file:
        return pickle.load(file)


rf = _load_pickle("rf_model.pkl")
svm = _load_pickle("svm_model.pkl")
mlp = _load_pickle("mlp_model.pkl")
ada = _load_pickle("ada_model.pkl")
scaler = _load_pickle("scaler.pkl")
feature_columns = _load_pickle("feature_columns.pkl")
label_encoder = _load_pickle("label_encoder.pkl")
weights = _load_pickle("model_weights.pkl")


def get_attack_category(attack):
    if attack in ["neptune", "smurf", "back", "teardrop"]:
        return "DoS"
    if attack in ["buffer_overflow", "rootkit"]:
        return "U2R"
    if attack in ["guess_passwd", "ftp_write"]:
        return "R2L"
    if attack in ["ipsweep", "portsweep", "nmap"]:
        return "Probe"
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
            ["No action required. Continue monitoring."]
        )

    steps = get_recommendations(attack, src, port)
    return f"{attack.upper()} attack detected from {src} targeting {dst}.", steps


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


def predict_live_data(records):
    if not records:
        return []

    df = pd.DataFrame(records)
    model_df = ensure_derived_features(df)
    drop_cols = ["source_ip", "destination_ip", "timestamp"]
    model_df = model_df.drop(columns=[c for c in drop_cols if c in model_df.columns])

    model_df = pd.get_dummies(model_df)

    model_df = model_df.reindex(columns=feature_columns, fill_value=0)
    model_df = model_df.apply(pd.to_numeric, errors="coerce").fillna(0)
    scaler_features = list(getattr(scaler, "feature_names_in_", feature_columns))
    model_df = model_df.reindex(columns=scaler_features, fill_value=0)
    scaled = scaler.transform(model_df)

    def align_probs(probs, model_classes, target_classes):
        prob_df = pd.DataFrame(probs, columns=model_classes)
        prob_df = prob_df.reindex(columns=target_classes, fill_value=0)
        return prob_df.values

    classes = rf.classes_

    rf_prob = align_probs(rf.predict_proba(scaled), rf.classes_, classes)
    svm_prob = align_probs(svm.predict_proba(scaled), svm.classes_, classes)
    mlp_prob = align_probs(mlp.predict_proba(scaled), mlp.classes_, classes)
    ada_prob = align_probs(ada.predict_proba(scaled), ada.classes_, classes)

    final_prob = (
        rf_prob * 0.3 +
        svm_prob * 0.2 +
        mlp_prob * 0.3 +
        ada_prob * 0.2
    )

    predictions = np.argmax(final_prob, axis=1)
    encoded_labels = classes[predictions].astype(int)
    labels = label_encoder.inverse_transform(encoded_labels)
    confidence = np.max(final_prob, axis=1)
    risk_scores = (confidence * 100).astype(int)

    out = []
    for i, attack in enumerate(labels):
        row = records[i]
        risk = int(risk_scores[i])
        prediction = "Normal" if attack == "normal" else "Attack"
        status = prediction
        attack_type = str(attack)
        category = get_attack_category(attack)
        reason, steps = generate_recommendation(row, attack)
        out.append({
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
            "Steps": steps,
            "anomaly_score": round(float(1 - confidence[i]), 4),
            "attack_success": 0 if status == "Normal" else 1
        })

    return out
