import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./App.css";

import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import UploadPage from "./pages/UploadPage";
import Alerts from "./pages/Alerts";
import Analytics from "./pages/Analytics";
import Firewall from "./pages/Firewall";
import Users from "./pages/Users";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/alerts" element={<Alerts />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/firewall" element={<Firewall />} />
        <Route path="/users" element={<Users />} />
      </Routes>
    </Router>
  );
}

export default App;