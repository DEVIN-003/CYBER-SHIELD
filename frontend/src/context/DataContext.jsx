import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const [sharedData, setSharedData] = useState(() => {
    const saved = localStorage.getItem("sharedData");
    return saved ? JSON.parse(saved) : null;
  });

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

  const value = useMemo(
    () => ({ sharedData, setSharedData: saveSharedData, fetchSharedData }),
    [sharedData, saveSharedData, fetchSharedData]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useDataStore() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useDataStore must be used inside DataProvider");
  return ctx;
}
