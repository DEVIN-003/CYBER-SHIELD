import React, { useState } from "react";
import AppLayout from "../components/AppLayout";

function Users() {
  const [user, setUser] = useState("");
  const [users, setUsers] = useState(["Admin"]);

  const addUser = () => {
    if (!user) return;
    setUsers([...users, user]);
    setUser("");
  };

  return (
    <AppLayout title="Users" subtitle="Identity and access overview">
      <div className="glass-card panel-row">
        <input
          placeholder="Enter user"
          value={user}
          onChange={(e) => setUser(e.target.value)}
        />
        <button onClick={addUser} className="primary-btn" type="button">
          Add User
        </button>
      </div>

      <div className="glass-card list-card">
        <h3>User List</h3>
        <ul className="user-list">
            {users.map((u, i) => (
              <li key={i}>
                <span>{u}</span>
                <span className="tag-cyan">Active</span>
              </li>
            ))}
        </ul>
      </div>
    </AppLayout>
  );
}

export default Users;