import React, { useEffect, useState } from "react";
import AppLayout from "../components/AppLayout";
import { useAuth } from "../context/AuthContext";

function Users() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "Staff"
  });

  const loadUsers = async () => {
    const res = await fetch("http://127.0.0.1:5000/users");
    const data = await res.json();
    if (res.ok) setUsers(data.users || []);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const addUser = async () => {
    if (!form.name || !form.email || !form.password) {
      alert("All fields are required");
      return;
    }

    const res = await fetch("http://127.0.0.1:5000/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        actorRole: currentUser?.role
      })
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Unable to create user");
      return;
    }

    setUsers((prev) => [...prev, data.user]);
    setForm({ name: "", email: "", password: "", role: "Staff" });
    setShowModal(false);
  };

  return (
    <AppLayout title="Users" subtitle="Identity and access overview">
      <div className="glass-card panel-row">
        <span className="panel-label">Manage platform users</span>
        <button
          onClick={() => setShowModal(true)}
          className="primary-btn"
          type="button"
          disabled={currentUser?.role !== "Admin"}
        >
          Add User
        </button>
      </div>

      <div className="glass-card list-card">
        <h3>User List</h3>
        <ul className="user-list">
          {users.map((u) => (
            <li key={u.id || u.email}>
              <span>{u.name} ({u.email})</span>
              <span className={u.role === "Admin" ? "tag-pink" : "tag-cyan"}>{u.role}</span>
            </li>
          ))}
        </ul>
      </div>

      {showModal && (
        <div className="modal-backdrop">
          <div className="glass-card detail-modal">
            <h3>Create User</h3>
            <input
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            />
            <input
              placeholder="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            />
            <input
              placeholder="Password"
              type="password"
              value={form.password}
              onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
            />
            <select
              value={form.role}
              onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
              className="role-select"
            >
              <option value="Admin">Admin</option>
              <option value="Staff">Staff</option>
            </select>
            <div className="modal-actions">
              <button onClick={() => setShowModal(false)} className="danger-btn" type="button">
                Cancel
              </button>
              <button onClick={addUser} className="primary-btn" type="button">
                Save User
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

export default Users;