import React, { useEffect, useState } from "react";
import AppLayout from "../components/AppLayout";

function Firewall() {

  const [ips, setIps] = useState([]);
  const [blocked, setBlocked] = useState([]);
  const [newIP, setNewIP] = useState("");

  // LOAD DATA
  useEffect(() => {

    // ✅ FIX: READ FROM rows (NOT results)
    const rows = JSON.parse(localStorage.getItem("rows")) || [];

    if (rows.length > 0) {
      const uniqueIPs = [
        ...new Set(rows.map(r => r["Source IP"]))
      ].slice(0, 10);

      setIps(uniqueIPs);
    }

    const savedBlocked =
      JSON.parse(localStorage.getItem("blockedIPs")) || [];

    setBlocked(savedBlocked);

  }, []);

  // ADD NEW IP
  const addManualIP = () => {
    if (!newIP) {
      alert("Enter IP");
      return;
    }

    if (!ips.includes(newIP)) {
      setIps([...ips, newIP]);
    }

    setNewIP("");
  };

  // BLOCK
  const blockIP = (ip) => {
    const reason = prompt("Enter reason for blocking:");

    if (!reason) return;

    const newBlocked = [...blocked, { ip, reason }];

    setBlocked(newBlocked);
    localStorage.setItem("blockedIPs", JSON.stringify(newBlocked));
  };

  // ALLOW
  const allowIP = (ip) => {
    const updated = blocked.filter(b => b.ip !== ip);
    setBlocked(updated);
    localStorage.setItem("blockedIPs", JSON.stringify(updated));
  };

  return (
    <AppLayout title="Firewall" subtitle="Trusted and blocked IP management">
      <div className="glass-card panel-row">
        <input
          placeholder="Enter IP manually"
          value={newIP}
          onChange={(e) => setNewIP(e.target.value)}
        />
        <button onClick={addManualIP} className="primary-btn" type="button">
          Add IP
        </button>
      </div>

      <div className="glass-card table-card">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>IP Address</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {ips.map((ip, i) => {

                const isBlocked = blocked.find(b => b.ip === ip);

                return (
                  <tr key={i}>
                    <td>{ip}</td>

                    <td>
                      {isBlocked ? (
                        <span className="tag-red">Blocked</span>
                      ) : (
                        <span className="tag-green">Allowed</span>
                      )}
                    </td>

                    <td>
                      {isBlocked ? (
                        <button
                          onClick={() => allowIP(ip)}
                          className="primary-btn"
                          type="button"
                        >
                          Allow
                        </button>
                      ) : (
                        <button
                          onClick={() => blockIP(ip)}
                          className="danger-btn"
                          type="button"
                        >
                          Block
                        </button>
                      )}
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}

export default Firewall;