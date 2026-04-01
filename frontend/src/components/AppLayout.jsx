import React, { useState } from "react";
import Sidebar from "./Sidebar";

function AppLayout({ title, subtitle, children }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="app-shell">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />

      <div className={`app-content ${collapsed ? "collapsed" : ""}`}>
        <header className="topbar glass-card">
          <div>
            <h1 className="page-title">{title}</h1>
            {subtitle ? <p className="page-subtitle">{subtitle}</p> : null}
          </div>
          <div className="topbar-badge">Cyber Shield IDS</div>
        </header>

        <main className="page-content">{children}</main>
      </div>
    </div>
  );
}

export default AppLayout;
