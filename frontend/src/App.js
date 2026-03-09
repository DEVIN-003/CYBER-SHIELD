import React, { useState } from "react";
import {
  PieChart, Pie, Cell,
  BarChart, Bar,
  XAxis, YAxis,
  Tooltip, CartesianGrid,
  LineChart, Line
} from "recharts";

function App() {

  const [file, setFile] = useState(null);
  const [results, setResults] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);

  const handleUpload = async () => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("http://127.0.0.1:5000/upload", {
      method: "POST",
      body: formData
    });

    const data = await response.json();

    // Generate fake per-record list (simulation for UI)
    const rows = Array.from({ length: data["Total Records"] }, (_, i) => ({
      id: i + 1,
      ip: "192.168.0." + ((i % 50) + 1),
      status: i < data["Detected Attacks"] ? "Attack" : "Normal",
      attackType: data["Most Frequent Attack"],
      risk: Math.floor(Math.random() * 100)
    }));

    setResults({ ...data, rows });
  };

  if (!results) {
    return (
      <div style={{ padding: 40 }}>
        <h1>Hybrid CyberShield Dashboard</h1>
        <input type="file" onChange={e => setFile(e.target.files[0])} />
        <button onClick={handleUpload}>Analyze</button>
      </div>
    );
  }

  const pieData = [
    { name: "Attack", value: results["Detected Attacks"] },
    { name: "Normal", value: results["Detected Normal"] }
  ];

  const attackDistribution = Object.entries(
    results["Attack Type Distribution"]
  ).map(([key, value]) => ({
    name: key,
    value
  }));

  const timelineData = Array.from({ length: 10 }, (_, i) => ({
    time: "T" + i,
    attacks: Math.floor(Math.random() * 100)
  }));

  return (
    <div style={{ padding: 20 }}>

      <h1>Hybrid Intrusion Detection Dashboard</h1>

      <div style={{ display: "flex" }}>

        {/* Detection Table */}
        <div style={{ width: "60%", maxHeight: 400, overflow: "auto" }}>
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
                  key={row.id}
                  onClick={() => setSelectedRow(row)}
                  style={{
                    backgroundColor:
                      row.status === "Attack" ? "#ffcccc" : "#ccffcc"
                  }}
                >
                  <td>{row.id}</td>
                  <td>{row.ip}</td>
                  <td>{row.status}</td>
                  <td>{row.attackType}</td>
                  <td>{row.risk}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Recommendation Panel */}
        <div style={{ width: "40%", paddingLeft: 20 }}>
          <h2>Recommendation Panel</h2>
          {selectedRow ? (
            <div>
              <p><strong>Attack Type:</strong> {selectedRow.attackType}</p>
              <p><strong>Status:</strong> {selectedRow.status}</p>
              <p><strong>Risk:</strong> {selectedRow.risk}%</p>
              <p><strong>Severity:</strong> {selectedRow.risk > 70 ? "High" : selectedRow.risk > 40 ? "Medium" : "Low"}</p>
              <p><strong>Recommended Action:</strong> Block IP / Monitor Traffic</p>
              <p><strong>Trust Score:</strong> {100 - selectedRow.risk}%</p>
            </div>
          ) : (
            <p>Select a row to see details</p>
          )}
        </div>

      </div>

      {/* Analytics Section */}
      <h2>Analytics</h2>

      <div style={{ display: "flex", justifyContent: "space-between" }}>

        {/* Pie Chart */}
        <PieChart width={300} height={300}>
          <Pie data={pieData} dataKey="value" outerRadius={100}>
            <Cell fill="red" />
            <Cell fill="green" />
          </Pie>
          <Tooltip />
        </PieChart>

        {/* Attack Distribution */}
        <BarChart width={400} height={300} data={attackDistribution}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="value" fill="#8884d8" />
        </BarChart>

        {/* Timeline Trend */}
        <LineChart width={400} height={300} data={timelineData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="attacks" stroke="#ff0000" />
        </LineChart>

      </div>

    </div>
  );
}

export default App;