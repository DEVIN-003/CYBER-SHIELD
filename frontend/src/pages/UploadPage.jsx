import React, { useState } from "react";
import AppLayout from "../components/AppLayout";
import { useDataStore } from "../context/DataContext";

function UploadPage() {
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { setSharedData, setMode } = useDataStore();

  const upload = async () => {
    if (!file) {
      alert("Please select file");
      return;
    }

    setUploading(true);
    setProgress(20);

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("http://127.0.0.1:5000/upload", {
      method: "POST",
      body: formData
    });

    setProgress(80);
    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Upload failed");
      setUploading(false);
      setProgress(0);
      return;
    }

    const limitedRows = data.rows.slice(0, 200);

    localStorage.setItem("results", JSON.stringify({
      "Detected Attacks": data["Detected Attacks"],
      "Detected Normal": data["Detected Normal"],
      "Attack Type Distribution": data["Attack Type Distribution"]
    }));

    localStorage.setItem("rows", JSON.stringify(limitedRows));
    setSharedData({ ...data, rows: limitedRows });
    setMode("upload");

    setProgress(100);
    alert("Upload & Analysis Completed ✅");
    setUploading(false);
    window.location.href = "/alerts";
  };

  const onDrop = (event) => {
    event.preventDefault();
    setDragOver(false);
    const droppedFile = event.dataTransfer.files && event.dataTransfer.files[0];
    if (droppedFile) setFile(droppedFile);
  };

  return (
    <AppLayout title="Upload" subtitle="Upload current data for IDS analysis">
      <div className="upload-wrapper">
        <div
          className={`glass-card upload-dropzone ${dragOver ? "drag-over" : ""}`}
          onDragOver={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
        >
          <h2>Upload Current Data</h2>
          <p>Drag and drop a file here or choose from your device.</p>

          <input
            type="file"
            onChange={(e) => setFile(e.target.files[0])}
            className="file-input"
          />

          <div className="upload-meta">
            <span>{file ? file.name : "No file selected"}</span>
            <button
              onClick={upload}
              className="primary-btn"
              disabled={uploading}
              type="button"
            >
              {uploading ? "Analyzing..." : "Analyze"}
            </button>
          </div>

          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default UploadPage;