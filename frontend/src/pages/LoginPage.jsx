import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import { PAYLOAD_KEY } from "../utils/constants";
import { readStored } from "../utils/helpers";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const { login, isLoading, error: contextError } = useAppContext();
  const [localError, setLocalError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setLocalError("");
    
    if (email && password) {
      const success = await login(email, password);
      if (success) {
        navigate("/dashboard");
      }
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <img src="/logo.png" alt="Narapangan" />
          <h2 className="auth-title">Selamat Datang</h2>
          <p className="auth-subtitle">Masuk ke akun UMKM Anda</p>
        </div>
        <form className="auth-form" onSubmit={handleSubmit}>
          {(localError || contextError) && (
            <div className="auth-error-banner" style={{ color: "var(--live-red)", fontSize: 13, marginBottom: 14, fontWeight: "600" }}>
              {localError || contextError}
            </div>
          )}
          <div className="auth-field">
            <label>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="email@contoh.com" />
          </div>
          <div className="auth-field">
            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" />
          </div>
          <button type="submit" className="auth-submit" disabled={isLoading}>
            {isLoading ? "Memuat..." : "Masuk"}
          </button>
        </form>
      </div>
    </div>
  );
}
