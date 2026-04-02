import React, { useState, useEffect } from "react";
import AppLayout from "../components/AppLayout";
import { useDataStore } from "../context/DataContext";

function Alerts() {

  const [results, setResults] = useState(null);
  const [selected, setSelected] = useState(null);
  const [blocked, setBlocked] = useState([]);
  const { sharedData, fetchSharedData } = useDataStore();

  useEffect(() => {
    const load = async () => {
      if (sharedData) {
        setResults(sharedData);
      } else {
        const data = await fetchSharedData();
        if (data) setResults(data);
      }
    };
    load();

    const blockedData = JSON.parse(localStorage.getItem("blockedIPs")) || [];
    setBlocked(blockedData);

  }, [sharedData, fetchSharedData]);

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
      <AppLayout title="Alerts" subtitle="Threat alert monitoring">
        <div className="glass-card empty-state">No data found. Upload dataset first.</div>
      </AppLayout>
    );
  }

  const highSeverity = results.rows.filter((row) => row.Risk >= 80).slice(0, 4);

  return (
    <AppLayout title="Alerts" subtitle="Detected traffic and event response">
      <section className="alert-card-grid">
        {highSeverity.length === 0 ? (
          <article className="glass-card alert-card medium">
            <h4>No high severity alerts</h4>
            <p>Upload new traffic data to detect critical threats.</p>
          </article>
        ) : (
          highSeverity.map((row) => (
            <article
              key={`${row.ID}-alert`}
              className={`glass-card alert-card ${row.Risk >= 80 ? "high" : "medium"}`}
            >
              <h4>{(row["Attack Type"] || "Unknown").toUpperCase()}</h4>
              <p>{row["Source IP"]} - {row["Destination IP"]}</p>
              <span>Risk {row.Risk}%</span>
            </article>
          ))
        )}
      </section>

      <div className="glass-card table-card">
        <h3>Detected Traffic</h3>
        <div className="table-wrap">
          <table className="data-table">
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
              {results.rows.map((r) => (
                <tr
                  key={r.ID}
                  onClick={() => setSelected(r)}
                  className={r.Status === "Attack" ? "attack-row" : "normal-row"}
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
                  <td className={r.Risk >= 80 ? "risk-high" : r.Risk >= 50 ? "risk-medium" : "risk-low"}>
                    {r.Risk}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="glass-card table-card">
        <h3>Blocked IPs</h3>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>IP Address</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {blocked.map((b, i) => (
                <tr key={i} className="attack-row">
                  <td>{b.ip}</td>
                  <td>{b.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div className="modal-backdrop">
          <div className="glass-card detail-modal">
            <h3>{(selected["Attack Type"] || "Normal").toUpperCase()}</h3>
            <p><b>Attack Category:</b> {getAttackCategory(selected["Attack Type"])}</p>
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
            <button onClick={() => setSelected(null)} className="primary-btn" type="button">Close</button>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

export default Alerts;