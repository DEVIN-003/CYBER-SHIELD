import React, { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";

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
    <div>
      <Sidebar />

      <div className="main">

        <h2 style={{ marginBottom: 20 }}>🔥 Trusted IP Management</h2>

        {/* ADD IP SECTION */}
        <div style={{
          background: "#fff",
          padding: 20,
          borderRadius: 10,
          boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
          marginBottom: 20,
          display: "flex",
          gap: 10,
          alignItems: "center"
        }}>
          <input
            placeholder="Enter IP manually"
            value={newIP}
            onChange={(e) => setNewIP(e.target.value)}
            style={{
              flex: 1,
              padding: 10,
              borderRadius: 6,
              border: "1px solid #ccc"
            }}
          />

          <button onClick={addManualIP}>
            Add IP
          </button>
        </div>

        {/* TABLE CARD */}
        <div style={{
          background: "#fff",
          padding: 20,
          borderRadius: 10,
          boxShadow: "0 4px 10px rgba(0,0,0,0.1)"
        }}>

          <table border="1" width="100%">
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
                        <span style={{
                          color: "white",
                          background: "red",
                          padding: "4px 10px",
                          borderRadius: 5
                        }}>
                          Blocked
                        </span>
                      ) : (
                        <span style={{
                          color: "white",
                          background: "green",
                          padding: "4px 10px",
                          borderRadius: 5
                        }}>
                          Allowed
                        </span>
                      )}
                    </td>

                    <td>
                      {isBlocked ? (
                        <button
                          onClick={() => allowIP(ip)}
                          style={{ background: "green" }}
                        >
                          Allow
                        </button>
                      ) : (
                        <button
                          onClick={() => blockIP(ip)}
                          style={{ background: "red" }}
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
    </div>
  );
}

export default Firewall;