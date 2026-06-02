import { createContext, useContext, useState, useEffect } from "react";
import { DEFAULT_PROFILE, PAYLOAD_KEY } from "../utils/constants";
import { readStored, writeStored } from "../utils/helpers";

const AppContext = createContext();

export function AppProvider({ children }) {
  const [payload, setPayload] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [profile, setProfile] = useState(DEFAULT_PROFILE);

  useEffect(() => {
    const cached = readStored(PAYLOAD_KEY);
    if (cached) {
      setPayload(cached);
    }
  }, []);

  async function runPrediction() {
    setStatus("loading");
    setError("");
    try {
      const res = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ business_profile: profile }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.error || "Pipeline gagal.");
      const enriched = { ...data, saved_at: new Date().toISOString() };
      setPayload(enriched);
      writeStored(PAYLOAD_KEY, enriched);
      setStatus("done");
    } catch (err) {
      setError(err.message);
      setStatus("error");
    }
  }

  const isLoading = status === "loading";

  return (
    <AppContext.Provider value={{
      payload,
      setPayload,
      status,
      isLoading,
      error,
      profile,
      setProfile,
      runPrediction
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  return useContext(AppContext);
}
