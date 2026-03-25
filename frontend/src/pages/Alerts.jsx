import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";

function Alerts() {

  const [results, setResults] = useState(null);
  const [selected, setSelected] = useState(null);
  const [blocked, setBlocked] = useState([]);

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem("results"));
    const rows = JSON.parse(localStorage.getItem("rows")) || [];

    setResults({ ...data, rows });

    const blockedData = JSON.parse(localStorage.getItem("blockedIPs")) || [];
    setBlocked(blockedData);

  }, []);

  // ✅ NEW FUNCTION (Attack → Category)
  const getAttackCategory = (attack) => {
    if (!attack) return "Normal";

    const a = attack.toLowerCase();

    if (["neptune", "smurf", "back", "teardrop"].includes(a)) return "DoS";
    if (["guess_passwd", "ftp_write"].includes(a)) return "R2L";
    if (["buffer_overflow", "rootkit"].includes(a)) return "U2R";
    if (["ipsweep", "portsweep", "nmap"].includes(a)) return "Probe";

    return "Normal";
  };

  if (!results) {
    return (
      <div>
        <Sidebar />
        <div className="main">
          <h2>No data found. Upload dataset first.</h2>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Sidebar />

      <div className="main">

        <h1 style={{ marginBottom: 20 }}>🚨 Alerts Dashboard</h1>

        {/* TABLE */}
        <div style={{
          background: "#fff",
          padding: 20,
          borderRadius: 10,
          boxShadow: "0 4px 10px rgba(0,0,0,0.1)"
        }}>

          <h3 style={{ marginBottom: 10 }}>Detected Traffic</h3>

          <div style={{ maxHeight: 400, overflow: "auto" }}>

            <table border="1" width="100%">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Src IP</th>
                  <th>Dst IP</th>
                  <th>Src Port</th>
                  <th>Dst Port</th>
                  <th>Status</th>
                  <th>Attack</th>
                  <th>Session</th>
                  <th>Timestamp</th>
                  <th>Risk</th>
                </tr>
              </thead>

              <tbody>
                {results.rows.map((r) => {

                  const rowColor =
                    r.Status === "Attack" ? "#ff4d4d" : "#ccffcc";

                  return (
                    <tr
                      key={r.ID}
                      onClick={() => setSelected(r)}
                      style={{
                        backgroundColor: rowColor,
                        cursor: "pointer"
                      }}
                    >
                      <td>{r.ID}</td>
                      <td>{r["Source IP"]}</td>
                      <td>{r["Destination IP"]}</td>
                      <td>{r["Source Port"]}</td>
                      <td>{r["Destination Port"]}</td>
                      <td>{r.Status}</td>
                      <td>{r["Attack Type"]}</td>
                      <td>{r["Session Time"]}</td>
                      <td>{r.Timestamp}</td>

                      <td
                        style={{
                          backgroundColor:
                            r.Risk >= 80
                              ? "#ff4d4d"
                              : r.Risk >= 50
                              ? "#ffd11a"
                              : "#66cc66",
                          color: r.Risk >= 50 ? "#000" : "#fff",
                          fontWeight: "bold"
                        }}
                      >
                        {r.Risk}%
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>

          </div>
        </div>

        {/* BLOCKED IPS */}
        <div style={{
          background: "#fff",
          padding: 20,
          borderRadius: 10,
          boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
          marginTop: 30
        }}>

          <h2 style={{ marginBottom: 10 }}>🚫 Blocked IPs</h2>

          <table border="1" width="100%">
            <thead>
              <tr>
                <th>IP Address</th>
                <th>Reason</th>
              </tr>
            </thead>

            <tbody>
              {blocked.map((b, i) => (
                <tr key={i} style={{ background: "#ffcccc" }}>
                  <td>{b.ip}</td>
                  <td>{b.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>

        </div>

        {/* POPUP */}
        {selected && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0,0,0,0.7)"
          }}>
            <div style={{
              background: "#111",
              color: "#fff",
              padding: 25,
              width: "420px",
              margin: "100px auto",
              borderRadius: 10
            }}>

              <h3>
                {(selected["Attack Type"] || "Normal").toUpperCase()}
              </h3>

              {/* ✅ NEW CATEGORY */}
              <p>
                <b>Attack Category:</b>{" "}
                {getAttackCategory(selected["Attack Type"])}
              </p>

              <p><b>Status:</b> {selected.Status}</p>
              <p><b>Risk:</b> {selected.Risk}%</p>

              <p>
                <b>Reason:</b>{" "}
                {selected.Reason ||
                  `Traffic detected between ${selected["Source IP"]} and destination.`}
              </p>

              <h4>Recommended Actions</h4>

              {selected.Steps ? (
                <ul>
                  {selected.Steps.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ul>
              ) : (
                <ul>
                  <li>Monitor this traffic</li>
                  <li>Enable firewall filtering</li>
                  <li>Block IP if suspicious</li>
                </ul>
              )}

              <button onClick={() => setSelected(null)}>Close</button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default Alerts;