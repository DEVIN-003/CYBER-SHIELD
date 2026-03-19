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

      if (!res.ok) {
        const err = await res.text();
        console.error(err);
        alert("Backend error");
        return;
      }

      const data = await res.json();
      console.log("Response:", data);

      setResults(data);

    } catch (e) {
      console.error(e);
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
  // DATA FOR CHARTS
  // =========================

  const pie = [
    { name: "Attack", value: results["Detected Attacks"] },
    { name: "Normal", value: results["Detected Normal"] }
  ];

  const bar = Object.entries(results["Attack Type Distribution"])
    .map(([k, v]) => ({ name: k, value: v }));

  const line = results.rows.map((r, i) => ({
    time: i + 1,
    attacks: r.Status === "Attack" ? 1 : 0
  }));

  // =========================
  // MAIN UI
  // =========================

  return (
    <div style={{
      padding: 20,
      height: "100vh",
      overflowY: "scroll"
    }}>

      <h1>Hybrid Intrusion Detection Dashboard</h1>

      {/* SUMMARY */}
      <h3>Total Records: {results["Total Records"]}</h3>
      <h3>Attacks: {results["Detected Attacks"]}</h3>
      <h3>Normal: {results["Detected Normal"]}</h3>

      <div style={{ display: "flex", marginTop: 20 }}>

        {/* ================= TABLE ================= */}
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

        {/* ================= RECOMMENDATION ================= */}
        <div style={{
          width: "35%",
          paddingLeft: 20
        }}>

          <h2>Recommendation Panel</h2>

          {selected ? (
            <div>
              <p><b>Attack Type:</b> {selected["Attack Type"]}</p>
              <p><b>Status:</b> {selected.Status}</p>
              <p><b>Risk:</b> {selected.Risk}%</p>

              <p>
                <b>Severity:</b>
                {selected.Risk > 70 ? " High" :
                 selected.Risk > 40 ? " Medium" :
                 " Low"}
              </p>

              <p><b>Reason:</b> {selected.Reason}</p>
              <p><b>Action:</b> {selected.Recommendation}</p>

              <p><b>Trust Score:</b> {100 - selected.Risk}%</p>
            </div>
          ) : (
            <p>Select a row</p>
          )}

        </div>

      </div>

      {/* ================= CHARTS ================= */}

      <h2 style={{ marginTop: 40 }}>Analytics</h2>

      <div style={{
        display: "flex",
        justifyContent: "space-around",
        marginTop: 20
      }}>

        {/* PIE */}
        <PieChart width={350} height={300}>
          <Pie data={pie} dataKey="value" outerRadius={120}>
            <Cell fill="red" />
            <Cell fill="green" />
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>

        {/* BAR */}
        <BarChart width={450} height={300} data={bar}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="value" fill="#8884d8" />
        </BarChart>

        {/* LINE */}
        <LineChart width={450} height={300} data={line}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="attacks" stroke="#ff0000" />
        </LineChart>

      </div>

    </div>
  );
}

export default App;