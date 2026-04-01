import React, { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import AppLayout from "../components/AppLayout";

function Dashboard() {
  const [results, setResults] = useState(null);

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem("results"));
    const rows = JSON.parse(localStorage.getItem("rows")) || [];
    if (data) setResults({ ...data, rows });
  }, []);

  const summary = useMemo(() => {
    if (!results) return null;
    const total = results.rows.length || 1;
    const attackCount = results["Detected Attacks"] || 0;
    const normalCount = results["Detected Normal"] || 0;
    const confidence = ((Math.max(attackCount, normalCount) / total) * 100).toFixed(1);
    const topAttack = Object.entries(results["Attack Type Distribution"] || {}).sort(
      (a, b) => b[1] - a[1]
    )[0];

    const trendData = results.rows.slice(0, 40).map((row, i) => ({
      point: i + 1,
      risk: row.Risk || 0,
      attack: row.Status === "Attack" ? 1 : 0
    }));

    const trafficData = results.rows.slice(0, 20).map((row, i) => ({
      sample: i + 1,
      sourcePort: Number(row["Source Port"]) || 0,
      destinationPort: Number(row["Destination Port"]) || 0
    }));

    const distribution = [
      { name: "Attack", value: attackCount },
      { name: "Normal", value: normalCount }
    ];

    const recommendations = [
      {
        title: "Tighten Firewall Rules",
        description: "Block repeated malicious source IP patterns from recent detections."
      },
      {
        title: "Increase Monitoring",
        description: "Track high-risk traffic sessions and inspect unusual destination ports."
      },
      {
        title: "Patch Critical Systems",
        description: "Prioritize endpoints exposed to top detected attack categories."
      }
    ];

    return {
      confidence,
      topAttack: topAttack ? topAttack[0] : "Normal",
      trendData,
      trafficData,
      distribution,
      recommendations
    };
  }, [results]);

  if (!results || !summary) {
    return (
      <AppLayout title="Dashboard" subtitle="Security overview">
        <div className="glass-card empty-state">
          No data available. Upload dataset first.
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Dashboard" subtitle="Real-time threat intelligence view">
      <section className="metric-grid">
        <article className="glass-card metric-card">
          <h3>Prediction Result</h3>
          <p className="metric-value">
            {(results["Detected Attacks"] || 0) > (results["Detected Normal"] || 0)
              ? "Attack"
              : "Normal"}
          </p>
        </article>
        <article className="glass-card metric-card">
          <h3>Attack Type</h3>
          <p className="metric-value">{summary.topAttack}</p>
        </article>
        <article className="glass-card metric-card">
          <h3>Confidence Score</h3>
          <p className="metric-value">{summary.confidence}%</p>
        </article>
      </section>

      <section className="chart-grid">
        <article className="glass-card chart-card">
          <h3>Attack Trends</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={summary.trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="point" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="risk" stroke="#22d3ee" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </article>

        <article className="glass-card chart-card">
          <h3>Traffic Features</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={summary.trafficData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="sample" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip />
              <Legend />
              <Bar dataKey="sourcePort" fill="#a855f7" />
              <Bar dataKey="destinationPort" fill="#38bdf8" />
            </BarChart>
          </ResponsiveContainer>
        </article>

        <article className="glass-card chart-card">
          <h3>Prediction Distribution</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={summary.distribution}>
              <defs>
                <linearGradient id="dashboardArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ec4899" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#ec4899" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip />
              <Area type="monotone" dataKey="value" stroke="#f472b6" fill="url(#dashboardArea)" />
            </AreaChart>
          </ResponsiveContainer>
        </article>
      </section>

      <section className="recommendation-grid">
        {summary.recommendations.map((item) => (
          <article key={item.title} className="glass-card recommendation-card">
            <div className="recommendation-icon">REC</div>
            <div>
              <h4>{item.title}</h4>
              <p>{item.description}</p>
            </div>
          </article>
        ))}
      </section>
    </AppLayout>
  );
}

export default Dashboard;
