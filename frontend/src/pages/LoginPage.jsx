import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import { PAYLOAD_KEY } from "../utils/constants";
import { readStored } from "../utils/helpers";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const { setPayload, runPrediction } = useAppContext();

  function handleSubmit(e) {
    e.preventDefault();
    if (email && password) {
      localStorage.setItem("narapangan:v2:auth", "true");
      
      const cached = readStored(PAYLOAD_KEY);
      if (cached) {
        setPayload(cached);
      }
      
      navigate("/dashboard");
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
          <div className="auth-field">
            <label>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="email@contoh.com" />
          </div>
          <div className="auth-field">
            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" />
          </div>
          <button type="submit" className="auth-submit">Masuk</button>
        </form>
      </div>
    </div>
  );
}
