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
  const [selectedRow, setSelectedRow] = useState(null);

  // ==============================
  // Upload Handler
  // ==============================

  const handleUpload = async () => {

    const formData = new FormData();
    formData.append("file", file);

    try {

      const response = await fetch("http://127.0.0.1:5000/upload", {
        method: "POST",
        body: formData
      });

      const data = await response.json();

      setResults(data);

    } catch {
      alert("Error connecting to backend.");
    }
  };

  // ==============================
  // Recommendation Logic
  // ==============================

  const getRecommendation = (attackType, risk) => {

    if (!attackType || attackType === "None") {
      return {
        action: "No action required",
        reason: "Traffic is normal and no malicious behavior detected"
      };
    }

    const type = attackType.toLowerCase();

    if (type.includes("back") || type.includes("dos")) {
      return {
        action: "Block IP immediately and apply rate limiting",
        reason: "High traffic flood detected indicating Denial-of-Service attack"
      };
    }

    if (type.includes("probe")) {
      return {
        action: "Monitor traffic and enable intrusion alerts",
        reason: "Suspicious scanning activity detected (port/service probing)"
      };
    }

    if (type.includes("r2l")) {
      return {
        action: "Restrict remote access and enforce authentication",
        reason: "Unauthorized remote login attempt detected"
      };
    }

    if (type.includes("u2r")) {
      return {
        action: "Isolate system and audit user privileges",
        reason: "Privilege escalation attack detected"
      };
    }

    return {
      action: "Monitor traffic",
      reason: "Unusual behavior detected in network activity"
    };
  };

  // ==============================
  // Initial Upload Screen
  // ==============================

  if (!results) {
    return (
      <div style={{ padding: 40 }}>
        <h1>Hybrid CyberShield Dashboard</h1>

        <input
          type="file"
          onChange={(e) => setFile(e.target.files[0])}
        />

        <button onClick={handleUpload}>
          Analyze
        </button>
      </div>
    );
  }

  // ==============================
  // Charts Data
  // ==============================

  const pieData = [
    { name: "Attack", value: results["Detected Attacks"] },
    { name: "Normal", value: results["Detected Normal"] }
  ];

  const attackDistribution =
    Object.entries(results["Attack Type Distribution"])
      .map(([key, value]) => ({
        name: key,
        value
      }));

  const timelineData =
    Array.from({ length: 10 }, (_, i) => ({
      time: "T" + i,
      attacks: Math.floor(Math.random() * 100)
    }));

  return (

    <div style={{
      padding: 30,
      height: "100vh",
      overflowY: "scroll"
    }}>

      <h1>Hybrid CyberShield Dashboard</h1>

      {/* SUMMARY */}

      <h2>Summary</h2>

      <p>Total Records: {results["Total Records"]}</p>
      <p>Detected Attacks: {results["Detected Attacks"]}</p>
      <p>Detected Normal: {results["Detected Normal"]}</p>
      <p>Most Frequent Attack: {results["Most Frequent Attack"]}</p>

      <div style={{ display: "flex", marginTop: 20 }}>

        {/* TABLE */}

        <div style={{
          width: "60%",
          maxHeight: 500,
          overflow: "auto"
        }}>

          <h2>Detection Results</h2>

          <table border="1" width="100%">

            <thead>
              <tr>
                <th>ID</th>
                <th>IP</th>
                <th>Status</th>
                <th>Attack Type</th>
                <th>Risk</th>
              </tr>
            </thead>

            <tbody>

              {results.rows.slice(0, 200).map(row => (

                <tr
                  key={row.ID}
                  onClick={() => setSelectedRow(row)}
                  style={{
                    backgroundColor:
                      row.Status === "Attack"
                        ? "#ffcccc"
                        : "#ccffcc",
                    cursor: "pointer"
                  }}
                >

                  <td>{row.ID}</td>
                  <td>{row.IP}</td>
                  <td>{row.Status}</td>
                  <td>{row["Attack Type"]}</td>
                  <td>{row.Risk}</td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>

        {/* RECOMMENDATION PANEL */}

        <div style={{
          width: "40%",
          paddingLeft: 20
        }}>

          <h2>Recommendation Panel</h2>

          {selectedRow ? (() => {

            const rec = getRecommendation(
              selectedRow["Attack Type"],
              selectedRow.Risk
            );

            return (
              <div>

                <p><b>Attack Type:</b> {selectedRow["Attack Type"]}</p>

                <p><b>Status:</b> {selectedRow.Status}</p>

                <p><b>Risk:</b> {selectedRow.Risk}</p>

                <p>
                  <b>Severity:</b>
                  {parseInt(selectedRow.Risk) > 70
                    ? " High"
                    : parseInt(selectedRow.Risk) > 40
                    ? " Medium"
                    : " Low"}
                </p>

                <p><b>Reason:</b> {rec.reason}</p>

                <p><b>Recommended Action:</b> {rec.action}</p>

                <p>
                  <b>Trust Score:</b>
                  {100 - parseInt(selectedRow.Risk)}%
                </p>

              </div>
            );

          })() : (

            <p>Select a row to see details</p>

          )}

        </div>

      </div>

      {/* ANALYTICS */}

      <h2 style={{ marginTop: 50 }}>Analytics</h2>

      <div style={{
        display: "flex",
        justifyContent: "space-around",
        marginTop: 30
      }}>

        {/* PIE */}

        <PieChart width={450} height={350}>
          <Pie data={pieData} dataKey="value" outerRadius={130} label>
            <Cell fill="red" />
            <Cell fill="green" />
          </Pie>
          <Legend />
          <Tooltip />
        </PieChart>

        {/* BAR */}

        <BarChart width={550} height={350} data={attackDistribution}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="value" fill="#8884d8" />
        </BarChart>

        {/* LINE */}

        <LineChart width={550} height={350} data={timelineData}>
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