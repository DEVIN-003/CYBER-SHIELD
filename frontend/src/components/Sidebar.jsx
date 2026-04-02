import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Sidebar({ collapsed = false, setCollapsed = () => {} }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const onLogout = () => {
    logout();
    navigate("/");
  };

  const adminItems = [
    { to: "/dashboard", label: "Dashboard", icon: "DB" },
    { to: "/alerts", label: "Alerts", icon: "AL" },
    { to: "/analytics", label: "Analytics", icon: "AN" },
    { to: "/firewall", label: "Firewall", icon: "FW" },
    { to: "/users", label: "Users", icon: "US" },
    { to: "/upload", label: "Upload", icon: "UP" }
  ];
  const staffItems = adminItems.filter((item) =>
    ["/dashboard", "/alerts", "/analytics"].includes(item.to)
  );
  const navItems = user?.role === "Admin" ? adminItems : staffItems;

  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      <button
        className="sidebar-toggle"
        onClick={() => setCollapsed(!collapsed)}
        type="button"
      >
        {collapsed ? ">>" : "<<"}
      </button>

      <div className="brand-wrap">
        <div className="brand-mark">CS</div>
        {!collapsed && (
          <div>
            <h2>Cyber Shield</h2>
            <small className="user-role">{user?.role || "Guest"}</small>
          </div>
        )}
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `nav-item ${isActive ? "active" : ""}`
            }
          >
            <span className="nav-icon">{item.icon}</span>
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <button onClick={onLogout} className="logout-btn" type="button">
        {collapsed ? "OUT" : "Logout"}
      </button>
    </aside>
  );
}

export default Sidebar;