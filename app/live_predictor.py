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
    return f"{attack.upper()} attack detected from {src} targeting {dst}.", steps


def predict_live_data(records):
    if not records:
        return []

    df = pd.DataFrame(records)
    model_df = df.copy()
    drop_cols = ["source_ip", "destination_ip", "timestamp"]
    model_df = model_df.drop(columns=[c for c in drop_cols if c in model_df.columns])

    categorical_cols = ["protocol_type", "service", "flag", "attack_category"]
    existing = [c for c in categorical_cols if c in model_df.columns]
    model_df = pd.get_dummies(model_df, columns=existing)

    expected_features = getattr(scaler, "feature_names_in_", feature_columns)
    model_df = model_df.reindex(columns=expected_features, fill_value=0)
    model_df = model_df.apply(pd.to_numeric, errors="coerce").fillna(0)
    scaled = scaler.transform(model_df)

    rf_prob = rf.predict_proba(scaled)
    svm_prob = svm.predict_proba(scaled)
    mlp_prob = mlp.predict_proba(scaled)
    ada_prob = ada.predict_proba(scaled)

    final_prob = (
        rf_prob * weights["rf"] +
        svm_prob * weights["svm"] +
        mlp_prob * weights["mlp"] +
        ada_prob * weights["ada"]
    )

    classes = label_encoder.classes_
    smurf_index = list(classes).index("smurf")
    neptune_index = list(classes).index("neptune")

    final_prob[:, smurf_index] *= 1.3
    for i in range(len(final_prob)):
        smurf_prob = final_prob[i][smurf_index]
        neptune_prob = final_prob[i][neptune_index]
        if smurf_prob > 0.20 and smurf_prob < neptune_prob:
            final_prob[i][smurf_index] += 0.25
        if abs(smurf_prob - neptune_prob) < 0.15:
            final_prob[i][smurf_index] += 0.30
        final_prob[i] = final_prob[i] / np.sum(final_prob[i])

    final_pred = np.argmax(final_prob, axis=1)
    labels = label_encoder.inverse_transform(final_pred)
    confidence = np.max(final_prob, axis=1)
    risk_scores = (confidence * 100).astype(int)

    out = []
    for i, attack in enumerate(labels):
        row = records[i]
        risk = int(risk_scores[i])
        status = "Normal" if attack == "normal" else "Attack"
        attack_type = "None" if attack == "normal" else str(attack)
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
            "Risk": risk,
            "Reason": reason,
            "Steps": steps,
            "attack_category": category,
            "anomaly_score": round(float(1 - confidence[i]), 4),
            "attack_success": 0 if status == "Normal" else 1
        })

    return out
