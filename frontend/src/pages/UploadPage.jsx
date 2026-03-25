import React, { useState } from "react";
import Sidebar from "../components/Sidebar";

function UploadPage() {

  const [file, setFile] = useState(null);

  const upload = async () => {

    if (!file) {
      alert("Please select file");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("http://127.0.0.1:5000/upload", {
      method: "POST",
      body: formData
    });

    const data = await res.json();

    const limitedRows = data.rows.slice(0, 200);

    localStorage.setItem("results", JSON.stringify({
      "Detected Attacks": data["Detected Attacks"],
      "Detected Normal": data["Detected Normal"],
      "Attack Type Distribution": data["Attack Type Distribution"]
    }));

    localStorage.setItem("rows", JSON.stringify(limitedRows));

    alert("Upload & Analysis Completed ✅");

    window.location.href = "/alerts";
  };

  return (
    <div>
      <Sidebar />

      {/* TOP CENTERED CONTAINER */}
      <div className="main" style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",   // 🔥 TOP alignment
        paddingTop: "80px"          // space from top
      }}>

        {/* CARD */}
        <div style={{
          background: "#fff",
          padding: "40px",
          borderRadius: "12px",
          boxShadow: "0 6px 15px rgba(0,0,0,0.15)",
          textAlign: "center",
          width: "400px"
        }}>

          <h1 style={{ marginBottom: "20px" }}>📂 Upload Dataset</h1>

          <input
            type="file"
            onChange={(e) => setFile(e.target.files[0])}
            style={{ marginBottom: "20px" }}
          />

          <br />

          <button
            onClick={upload}
            style={{
              padding: "10px 20px",
              background: "#2563eb",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer"
            }}
          >
            Analyze
          </button>

        </div>

      </div>
    </div>
  );
}

export default UploadPage;