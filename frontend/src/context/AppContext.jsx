import { createContext, useContext, useState, useEffect } from "react";
import { DEFAULT_PROFILE, PAYLOAD_KEY } from "../utils/constants";
import { readStored, writeStored } from "../utils/helpers";

const AppContext = createContext();

export function AppProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("narapangan:v2:token") || "");
  const [user, setUser] = useState(() => readStored("narapangan:v2:user"));
  const [profile, setProfile] = useState(() => readStored("narapangan:v2:profile") || DEFAULT_PROFILE);
  const [payload, setPayload] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  
  // Onboarding modal visibility managed at AppContext level
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  // Transition: Clear old client-side auth key if present
  useEffect(() => {
    if (localStorage.getItem("narapangan:v2:auth")) {
      localStorage.removeItem("narapangan:v2:auth");
    }
    const cached = readStored(PAYLOAD_KEY);
    if (cached) {
      setPayload(cached);
    }
  }, []);

  // Fetch profile and predictions automatically when token is set/changed
  useEffect(() => {
    if (token) {
      fetchProfileAndPredictions();
    } else {
      setPayload(null);
      setProfile(DEFAULT_PROFILE);
      setUser(null);
      setIsOnboardingOpen(false);
    }
  }, [token]);

  async function fetchProfileAndPredictions() {
    setStatus("loading");
    setError("");
    try {
      // 1. Fetch user profile from DB
      const profileRes = await fetch("/api/users/profile", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (profileRes.status === 401) {
        logout();
        return;
      }
      
      let currentProfile = profile;
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        const p = profileData.profile;
        setProfile(p);
        writeStored("narapangan:v2:profile", p);
        currentProfile = p;

        // Auto-open onboarding if profile is incomplete and user hasn't finished onboarding
        const incomplete = !p.business_type || !p.daily_usage_kg || !p.storage_capacity_kg;
        const tourCompleted = localStorage.getItem("narapangan:v2:onboarding_completed") === "true";
        if (incomplete && !tourCompleted && !user?.is_admin && !p.is_admin) {
          setIsOnboardingOpen(true);
        }
      }

      // Check if user is admin to skip predictions fetching
      const storedUser = readStored("narapangan:v2:user");
      if (storedUser?.is_admin || user?.is_admin) {
        setStatus("done");
        return;
      }

      // 2. Fetch predictions
      const predictRes = await fetch("/api/predict", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });

      if (predictRes.status === 401) {
        logout();
        return;
      }

      const data = await predictRes.json();
      if (!predictRes.ok) throw new Error(data.detail || data.error || "Gagal mengambil data prediksi.");
      
      if (data.status === "generating") {
        console.log("[AppContext] Forecast is generating. Starting background poll...");
        pollPredictions(1);
        return;
      }
      
      const enriched = { ...data, saved_at: new Date().toISOString() };
      setPayload(enriched);
      writeStored(PAYLOAD_KEY, enriched);
      setStatus("done");
    } catch (err) {
      setError(err.message);
      setStatus("error");
    }
  }

  async function login(email, password) {
    setStatus("loading");
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login gagal.");

      localStorage.setItem("narapangan:v2:token", data.token);
      writeStored("narapangan:v2:user", data.user);
      writeStored("narapangan:v2:profile", data.profile);
      
      // Clear previous cached payload before loading new user
      localStorage.removeItem(PAYLOAD_KEY);
      setPayload(null);
      
      setToken(data.token);
      setUser(data.user);
      setProfile(data.profile);
      setStatus("done");
      return true;
    } catch (err) {
      setError(err.message);
      setStatus("error");
      return false;
    }
  }

  async function register(email, password) {
    setStatus("loading");
    setError("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registrasi gagal.");

      localStorage.setItem("narapangan:v2:token", data.token);
      writeStored("narapangan:v2:user", data.user);
      writeStored("narapangan:v2:profile", data.profile);
      
      // Reset onboarding tour status for a clean new registration experience
      localStorage.removeItem("narapangan:v2:onboarding_completed");
      
      localStorage.removeItem(PAYLOAD_KEY);
      setPayload(null);
      
      setToken(data.token);
      setUser(data.user);
      setProfile(data.profile);
      setIsOnboardingOpen(true);
      setStatus("done");
      return true;
    } catch (err) {
      setError(err.message);
      setStatus("error");
      return false;
    }
  }

  async function loginWithGoogle(email) {
    setStatus("loading");
    setError("");
    try {
      const res = await fetch("/api/auth/google-simulated", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Google auth gagal.");

      localStorage.setItem("narapangan:v2:token", data.token);
      writeStored("narapangan:v2:user", data.user);
      writeStored("narapangan:v2:profile", data.profile);
      
      // Clear previous cached payload before loading new user
      localStorage.removeItem(PAYLOAD_KEY);
      setPayload(null);

      // Check if registration was triggered (empty profile)
      const p = data.profile;
      const incomplete = !p.business_type || !p.daily_usage_kg || !p.storage_capacity_kg;
      if (incomplete) {
        localStorage.removeItem("narapangan:v2:onboarding_completed");
        setIsOnboardingOpen(true);
      }
      
      setToken(data.token);
      setUser(data.user);
      setProfile(data.profile);
      setStatus("done");
      return true;
    } catch (err) {
      setError(err.message);
      setStatus("error");
      return false;
    }
  }

  function logout() {
    localStorage.removeItem("narapangan:v2:token");
    localStorage.removeItem("narapangan:v2:user");
    localStorage.removeItem("narapangan:v2:profile");
    localStorage.removeItem(PAYLOAD_KEY);
    localStorage.removeItem("narapangan:v2:auth");
    setToken("");
    setUser(null);
    setProfile(DEFAULT_PROFILE);
    setPayload(null);
    setIsOnboardingOpen(false);
    setStatus("idle");
    setError("");
  }

  async function saveProfile(updatedProfile) {
    setStatus("loading");
    setError("");
    try {
      const res = await fetch("/api/users/profile", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ profile: updatedProfile }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memperbarui profil.");
      
      setProfile(data.profile);
      writeStored("narapangan:v2:profile", data.profile);
      
      // Trigger background prediction refresh to adapt to the new profile
      await runPrediction();
      setStatus("done");
      return true;
    } catch (err) {
      setError(err.message);
      setStatus("error");
      return false;
    }
  }

  async function pollPredictions(attempt = 1, simProps = null) {
    if (!token) return;
    const isSimUpdate = simProps && typeof simProps === "object" && !simProps.nativeEvent && (simProps.simulated_usage !== undefined || simProps.simulated_storage !== undefined);
    const actualSimProps = isSimUpdate ? { simulated_usage: simProps.simulated_usage, simulated_storage: simProps.simulated_storage } : null;

    try {
      console.log(`[AppContext] Polling predictions, attempt ${attempt}...`);
      const res = await fetch("/api/predict", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(actualSimProps || {})
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.error || "Gagal mengambil data prediksi.");
      
      if (data.status === "generating") {
        if (attempt < 20) {
          setTimeout(() => pollPredictions(attempt + 1, actualSimProps), 3000);
        } else {
          throw new Error("Waktu tunggu habis. Silakan refresh halaman.");
        }
        return;
      }
      
      const enriched = { ...data, saved_at: new Date().toISOString() };
      setPayload(enriched);
      if (!isSimUpdate) {
        writeStored(PAYLOAD_KEY, enriched);
      }
      setStatus("done");
    } catch (err) {
      setError(err.message);
      setStatus("error");
    }
  }

  async function runPrediction(simProps = null) {
    if (!token) return;
    const storedUser = readStored("narapangan:v2:user");
    if (storedUser?.is_admin || user?.is_admin) return;

    const isSimUpdate = simProps && typeof simProps === "object" && !simProps.nativeEvent && (simProps.simulated_usage !== undefined || simProps.simulated_storage !== undefined);
    const actualSimProps = isSimUpdate ? { simulated_usage: simProps.simulated_usage, simulated_storage: simProps.simulated_storage } : null;

    if (!isSimUpdate) setStatus("loading");
    setError("");
    try {
      const res = await fetch("/api/predict", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(actualSimProps || {})
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.error || "Pipeline gagal.");
      
      if (data.status === "generating") {
        console.log("[AppContext] Forecast is generating. Starting background poll...");
        pollPredictions(1, actualSimProps);
        return;
      }

      const enriched = { ...data, saved_at: new Date().toISOString() };
      setPayload(enriched);
      if (!isSimUpdate) {
        writeStored(PAYLOAD_KEY, enriched);
      }
      setStatus("done");
    } catch (err) {
      setError(err.message);
      setStatus("error");
    }
  }

  const isLoading = status === "loading";
  const isAuthenticated = !!token;
  
  // Calculate Demo Mode dynamically
  const isDemoMode = !profile.business_type || !profile.daily_usage_kg || !profile.storage_capacity_kg;

  return (
    <AppContext.Provider value={{
      payload,
      setPayload,
      status,
      isLoading,
      error,
      profile,
      setProfile,
      isAuthenticated,
      user,
      token,
      login,
      logout,
      saveProfile,
      runPrediction,
      register,
      loginWithGoogle,
      isDemoMode,
      isOnboardingOpen,
      setIsOnboardingOpen
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  return useContext(AppContext);
}
