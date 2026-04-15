import time
import socket
from datetime import datetime
import requests
import psutil

API_URL = "http://127.0.0.1:5000/api/live-data"
INTERVAL_SECONDS = 2


def map_service(port):
    mapping = {80: "http", 443: "http", 21: "ftp", 22: "ssh", 53: "dns", 123: "ntp"}
    return mapping.get(port, "http")


def infer_protocol(conn_type):
    if conn_type == socket.SOCK_STREAM:
        return "tcp"
    if conn_type == socket.SOCK_DGRAM:
        return "udp"
    return "icmp"


def default_record():
    return {
        "duration": 1,
        "protocol_type": "tcp",
        "service": "http",
        "flag": "SF",
        "src_bytes": 0,
        "dst_bytes": 0,
        "num_failed_logins": 0,
        "num_compromised": 0,
        "is_host_login": 0,
        "is_guest_login": 0,
        "count": 1,
        "source_ip": "127.0.0.1",
        "destination_ip": "127.0.0.1",
        "source_port": 0,
        "destination_port": 0,
        "session_time": 1,
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "previous_attack_count": 0,
        "risk_score": 0.5,
        "trust_score": 0.8,
        "attack_category": "normal",
        "anomaly_score": 0.0,
        "attack_success": 0
    }


def collect_connections():
    records = []
    net_io = psutil.net_io_counters()
    sent = int(net_io.bytes_sent / 1024)
    recv = int(net_io.bytes_recv / 1024)
    conns = psutil.net_connections(kind="inet")

    for conn in conns[:20]:
        rec = default_record()
        laddr = conn.laddr if conn.laddr else None
        raddr = conn.raddr if conn.raddr else None
        rec["source_ip"] = getattr(laddr, "ip", "127.0.0.1")
        rec["source_port"] = getattr(laddr, "port", 0)
        rec["destination_ip"] = getattr(raddr, "ip", "127.0.0.1")
        rec["destination_port"] = getattr(raddr, "port", 0)
        rec["protocol_type"] = infer_protocol(conn.type)
        rec["service"] = map_service(rec["destination_port"])
        rec["src_bytes"] = sent
        rec["dst_bytes"] = recv
        rec["count"] = len(conns)
        rec["session_time"] = 2
        rec["duration"] = 2
        records.append(rec)

    if not records:
        records.append(default_record())
    return records


def send_live_data(records):
    try:
        res = requests.post(API_URL, json={"records": records}, timeout=5)
        if res.ok:
            print(f"[LIVE] sent {len(records)} records")
        else:
            print(f"[LIVE] backend error: {res.status_code} {res.text}")
    except Exception as exc:
        print(f"[LIVE] send failed: {exc}")


if __name__ == "__main__":
    print("Starting live network monitor. Press Ctrl+C to stop.")
    while True:
        payload = collect_connections()
        send_live_data(payload)
        time.sleep(INTERVAL_SECONDS)
