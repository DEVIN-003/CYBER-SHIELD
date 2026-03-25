import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../App.css";

function LoginPage() {

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const navigate = useNavigate();

  const login = () => {
    if (email === "admin@gmail.com" && password === "admin") {
      navigate("/upload");
    } else {
      alert("Invalid credentials");
    }
  };

  return (

    <div style={{
      height: "100vh",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      background: "#f3f4f6"
    }}>

      {/* LOGIN CARD */}
      <div style={{
        background: "white",
        padding: 30,
        borderRadius: 12,
        width: 350,
        boxShadow: "0 5px 20px rgba(0,0,0,0.2)"
      }}>

        <h1>CyberShield 🔐</h1>
        <p style={{ marginBottom: 20 }}>
          Intrusion Detection System
        </p>

        <input
          type="email"
          placeholder="Enter Email"
          value={email || ""}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            width: "100%",
            padding: 10,
            marginBottom: 10,
            borderRadius: 6,
            border: "1px solid #ccc"
          }}
        />

        <input
          type="password"
          placeholder="Enter Password"
          value={password || ""}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            width: "100%",
            padding: 10,
            marginBottom: 15,
            borderRadius: 6,
            border: "1px solid #ccc"
          }}
        />

        <button
          onClick={login}
          style={{
            width: "100%",
            padding: 10,
            background: "#3b82f6",
            color: "white",
            border: "none",
            borderRadius: 6,
            cursor: "pointer"
          }}
        >
          Login
        </button>

      </div>

    </div>
  );
}

export default LoginPage;