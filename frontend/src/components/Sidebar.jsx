import React from "react";
import { Link, useNavigate } from "react-router-dom";

function Sidebar({ collapsed = false, setCollapsed = () => {} }) {

  const navigate = useNavigate();

  const logout = () => {
    localStorage.clear();
    navigate("/");
  };

  return (
    <div className={`sidebar ${collapsed ? "collapsed" : ""}`}>

      {/* TOGGLE */}
      <h2
        style={{ cursor: "pointer" }}
        onClick={() => setCollapsed(!collapsed)}
      >
        ☰
      </h2>

      {!collapsed && <h2>CyberShield</h2>}

      <Link to="/upload">Upload</Link>
      <Link to="/alerts">Alerts</Link>
      <Link to="/analytics">Analytics</Link>
      <Link to="/firewall">Firewall</Link>
      <Link to="/users">Users</Link>

      {/* ✅ FIXED LOGOUT POSITION */}
      <div style={{ marginTop: "40px" }}>
        <button
          onClick={logout}
          style={{
            width: "100%",
            padding: "10px",
            background: "#ef4444",
            border: "none",
            borderRadius: "6px",
            color: "white",
            cursor: "pointer"
          }}
        >
          Logout
        </button>
      </div>

    </div>
  );
}

export default Sidebar;