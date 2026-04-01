import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

function LoginPage() {

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const navigate = useNavigate();

  const login = () => {
    if (email === "admin@gmail.com" && password === "admin") {
      navigate("/dashboard");
    } else {
      alert("Invalid credentials");
    }
  };

  return (
    <div className="login-page">
      <div className="glass-card login-card">
        <h1>Cyber Shield</h1>
        <p>Intrusion Detection System</p>
        <input
          type="email"
          placeholder="Enter Email"
          value={email || ""}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Enter Password"
          value={password || ""}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={login}
          className="primary-btn full-width"
          type="button"
        >
          Login
        </button>
      </div>
    </div>
  );
}

export default LoginPage;