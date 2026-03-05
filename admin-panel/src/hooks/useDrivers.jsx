// src/hooks/useDrivers.js
import { useState, useEffect, useCallback } from "react";

const BASE_URL = import.meta.env.VITE_BASE_URL || "http://localhost:3000";

export function useDrivers() {
  const [drivers, setDrivers]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error,   setError]     = useState(null);

  const fetchDrivers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch(`${BASE_URL}/api/drivers`);
      const data = await res.json();
      setDrivers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("useDrivers fetch error:", err);
      setError("Failed to load drivers");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers]);
 return { drivers, loading, error, refetch: fetchDrivers };
}