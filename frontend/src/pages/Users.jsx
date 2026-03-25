import React, { useState } from "react";
import Sidebar from "../components/Sidebar";
import "../App.css";

function Users() {
  const [user, setUser] = useState("");
  const [users, setUsers] = useState(["Admin"]);
  const [collapsed, setCollapsed] = useState(false);

  const addUser = () => {
    if (!user) return;
    setUsers([...users, user]);
    setUser("");
  };

  return (
    <div>
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />

      <div className={`main ${collapsed ? "collapsed" : ""}`}>

        <h1 style={{ marginBottom: 20 }}>👥 Users Management</h1>

        {/* ADD USER CARD */}
        <div
          style={{
            background: "#fff",
            padding: 20,
            borderRadius: 10,
            boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
            display: "flex",
            gap: 10,
            alignItems: "center",
            marginBottom: 20
          }}
        >
          <input
            placeholder="Enter user"
            value={user}
            onChange={(e) => setUser(e.target.value)}
            style={{
              flex: 1,
              padding: 10,
              borderRadius: 6,
              border: "1px solid #ccc"
            }}
          />

          <button onClick={addUser}>
            Add User
          </button>
        </div>

        {/* USERS LIST CARD */}
        <div
          style={{
            background: "#fff",
            padding: 20,
            borderRadius: 10,
            boxShadow: "0 4px 10px rgba(0,0,0,0.1)"
          }}
        >
          <h3 style={{ marginBottom: 10 }}>User List</h3>

          <ul style={{ listStyle: "none", padding: 0 }}>
            {users.map((u, i) => (
              <li
                key={i}
                style={{
                  padding: "10px",
                  borderBottom: "1px solid #eee",
                  display: "flex",
                  justifyContent: "space-between"
                }}
              >
                <span>{u}</span>

                <span style={{
                  background: "#3b82f6",
                  color: "white",
                  padding: "3px 8px",
                  borderRadius: 5,
                  fontSize: 12
                }}>
                  Active
                </span>
              </li>
            ))}
          </ul>
        </div>

      </div>
    </div>
  );
}

export default Users;