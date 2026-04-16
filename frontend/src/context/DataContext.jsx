import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const [sharedData, setSharedData] = useState(() => {
    const saved = localStorage.getItem("sharedData");
    return saved ? JSON.parse(saved) : null;
  });
  const [mode, setMode] = useState("upload");
  const [liveData, setLiveData] = useState(null);
  const [liveStatus, setLiveStatus] = useState("Stopped");
  const [currentIP, setCurrentIP] = useState("-");
  const socketRef = useRef(null);

  const saveSharedData = useCallback((data) => {
    setSharedData(data);
    localStorage.setItem("sharedData", JSON.stringify(data));
  }, []);

  const fetchSharedData = useCallback(async () => {
    const res = await fetch("http://127.0.0.1:5000/data");
    if (!res.ok) {
      if (res.status === 404) {
        setSharedData(null);
        localStorage.removeItem("sharedData");
        return null;
      }
      throw new Error("Failed to fetch shared data");
    }

    const data = await res.json();
    saveSharedData(data);
    return data;
  }, [saveSharedData]);

  const startMonitoring = useCallback(() => {
    setMode("live");
    setLiveStatus("Running");
    if (socketRef.current) return;

    const socket = io("http://127.0.0.1:5000", {
      transports: ["websocket", "polling"]
    });

    socket.on("live_update", (payload) => {
      const summary = payload?.summary || null;
      const row = payload?.row || null;
      if (summary) setLiveData(summary);
      if (row && row["Source IP"]) setCurrentIP(row["Source IP"]);
    });

    socket.on("disconnect", () => {
      setLiveStatus("Stopped");
    });

    socketRef.current = socket;
  }, []);

  const stopMonitoring = useCallback(() => {
    setLiveStatus("Stopped");
    setMode("upload");
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, []);

  const value = useMemo(
    () => ({
      sharedData,
      setSharedData: saveSharedData,
      fetchSharedData,
      mode,
      setMode,
      liveData,
      liveStatus,
      currentIP,
      startMonitoring,
      stopMonitoring
    }),
    [
      sharedData,
      saveSharedData,
      fetchSharedData,
      mode,
      liveData,
      liveStatus,
      currentIP,
      startMonitoring,
      stopMonitoring
    ]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useDataStore() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useDataStore must be used inside DataProvider");
  return ctx;
}
