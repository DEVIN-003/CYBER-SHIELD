import React, { useState } from "react";
import {
  PieChart, Pie, Cell,
  BarChart, Bar,
  XAxis, YAxis,
  Tooltip, CartesianGrid,
  LineChart, Line,
  Legend
} from "recharts";

function App() {

  const [file, setFile] = useState(null);
  const [results, setResults] = useState(null);
  const [selected, setSelected] = useState(null);

  // =========================
  // FILE UPLOAD
  // =========================

  const upload = async () => {

    if (!file) {
      alert("Please select a file");
      return;
    }

    const form = new FormData();
    form.append("file", file);

    try {
      const res = await fetch("http://127.0.0.1:5000/upload", {
        method: "POST",
        body: form
      });

      const data = await res.json();
      setResults(data);

    } catch (e) {
      alert("Error connecting to backend");
    }
  };

  // =========================
  // INITIAL SCREEN
  // =========================

  if (!results) {
    return (
      <div style={{ padding: 40 }}>
        <h1>Hybrid CyberShield Dashboard</h1>

        <input
          type="file"
          onChange={e => setFile(e.target.files[0])}
        />

        <button onClick={upload}>
          Analyze
        </button>
      </div>
    );
  }

  // =========================
  // DATA
  // =========================

  const pieData = [
    { name: "Attack", value: results["Detected Attacks"] || 0 },
    { name: "Normal", value: results["Detected Normal"] || 0 }
  ];

  const barData = Object.entries(results["Attack Type Distribution"] || {})
    .map(([k, v]) => ({ name: k, value: v }));

  const lineData = results.rows.map((r, i) => ({
    time: i + 1,
    value:
      r.Status === "Attack"
        ? 0.75 + Math.random() * 0.25
        : 0.2 + Math.random() * 0.2,
    isAttack: r.Status === "Attack"
  }));

  // =========================
  // UI
  // =========================

  return (
    <div style={{
      padding: 20,
      height: "100vh",
      overflowY: "scroll"
    }}>

      <h1>Hybrid Intrusion Detection Dashboard</h1>

      <h3>Total Records: {results["Total Records"]}</h3>
      <h3>Attacks: {results["Detected Attacks"]}</h3>
      <h3>Normal: {results["Detected Normal"]}</h3>

      <div style={{ display: "flex", marginTop: 20 }}>

        {/* TABLE */}
        <div style={{
          width: "65%",
          maxHeight: 500,
          overflow: "auto"
        }}>

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
              {results.rows.map(r => (
                <tr
                  key={r.ID}
                  onClick={() => setSelected(r)}
                  style={{
                    cursor: "pointer",
                    backgroundColor:
                      r.Risk > 80 ? "#ff4d4d" :
                      r.Risk > 40 ? "#ffd11a" :
                      "#ccffcc"
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
                  <td>{r.Risk}%</td>
                </tr>
              ))}
            </tbody>
          </table>

        </div>

        {/* PANEL */}
        <div style={{
          width: "35%",
          paddingLeft: 20
        }}>

          <h2>🛡️ Threat Intelligence Panel</h2>

          {selected ? (

            <div style={{
              background: "#111",
              color: "#fff",
              padding: 20,
              borderRadius: 12,
              boxShadow: "0 0 15px rgba(0,0,0,0.5)"
            }}>

              <h3 style={{
                color: selected.Risk > 70 ? "#ff4d4d" :
                       selected.Risk > 40 ? "#ffd11a" :
                       "#00ff00"
              }}>
                {selected["Attack Type"].toUpperCase()} DETECTED
              </h3>

              <p><b>Status:</b> {selected.Status}</p>
              <p><b>Risk Score:</b> {selected.Risk}%</p>

              <p>
                <b>Severity:</b>
                <span style={{
                  marginLeft: 10,
                  padding: "4px 10px",
                  borderRadius: 6,
                  background:
                    selected.Risk > 70 ? "#ff4d4d" :
                    selected.Risk > 40 ? "#ffd11a" :
                    "#00cc66",
                  color: "#000"
                }}>
                  {selected.Risk > 70 ? "HIGH" :
                   selected.Risk > 40 ? "MEDIUM" :
                   "LOW"}
                </span>
              </p>

              <hr style={{ borderColor: "#333" }} />

              {/* SAFE REASON */}
              <h4>🔍 Why this attack happened?</h4>
              <p>{selected.Reason || "No detailed reason available"}</p>

              <hr style={{ borderColor: "#333" }} />

              {/* SAFE STEPS */}
              <h4>⚙️ Recommended Actions</h4>

              {Array.isArray(selected.Steps) ? (
                <ol>
                  {selected.Steps.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              ) : (
                <p>No steps available</p>
              )}

              <hr style={{ borderColor: "#333" }} />

              <p><b>Trust Score:</b> {100 - selected.Risk}%</p>

            </div>

          ) : (
            <p>Select a row to view details</p>
          )}

        </div>

      </div>

      {/* CHARTS */}

      <h2 style={{ marginTop: 40 }}>Analytics</h2>

      {/* PIE */}
      <PieChart width={350} height={300}>
        <Pie data={pieData} dataKey="value" outerRadius={120}>
          <Cell fill="red" />
          <Cell fill="green" />
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>

      {/* BAR */}
      <BarChart width={600} height={300} data={barData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="value" fill="#8884d8" />
      </BarChart>

      {/* GRAPH */}
      <div style={{
        background: "black",
        padding: 20,
        borderRadius: 10,
        marginTop: 40,
        overflowX: "auto"
      }}>
        <LineChart width={1200} height={400} data={lineData}>

          <CartesianGrid stroke="#333" />

          <XAxis
            dataKey="time"
            stroke="#aaa"
            label={{
              value: "Time / Network Packets",
              position: "insideBottom",
              fill: "#fff"
            }}
          />

          <YAxis
            domain={[0, 1]}
            stroke="#aaa"
            label={{
              value: "Network Activity Level",
              angle: -90,
              position: "insideLeft",
              fill: "#fff"
            }}
          />

          <Tooltip />
          <Legend wrapperStyle={{ color: "white" }} />

          <Line
            type="monotone"
            dataKey="value"
            name="Network Activity"
            stroke="#00ff00"
            strokeWidth={2}
            dot={false}
          />

          <Line
            type="monotone"
            dataKey="value"
            name="Attack Spike"
            stroke="#ff0000"
            strokeWidth={3}
            dot={false}
            data={lineData.map(d => d.isAttack ? d : { ...d, value: null })}
          />

        </LineChart>
      </div>

    </div>
  );
}

export default App;