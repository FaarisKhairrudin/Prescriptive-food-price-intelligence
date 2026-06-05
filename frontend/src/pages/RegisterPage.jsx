import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAppContext } from "../context/AppContext";

export function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const navigate = useNavigate();
  const { register, loginWithGoogle, isLoading, error: contextError, isAuthenticated } = useAppContext();
  const [localError, setLocalError] = useState("");
  const [showGoogleSim, setShowGoogleSim] = useState(false);
  const [googleEmail, setGoogleEmail] = useState("");

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setLocalError("");

    if (password !== confirmPassword) {
      setLocalError("Konfirmasi password tidak cocok.");
      return;
    }
    
    if (email && password) {
      const success = await register(email, password);
      if (success) {
        navigate("/dashboard/prediksi");
      }
    }
  }

  async function handleGoogleLogin(emailStr) {
    setShowGoogleSim(false);
    const success = await loginWithGoogle(emailStr);
    if (success) {
      navigate("/dashboard/prediksi");
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <img src="/logo.png" alt="Narapangan" />
          <h2 className="auth-title">Daftar Akun Baru</h2>
          <p className="auth-subtitle">Kelola pengadaan bahan F&B Anda secara cerdas</p>
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
          <div className="auth-field">
            <label>Konfirmasi Password</label>
            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required placeholder="••••••••" />
          </div>
          <button type="submit" className="auth-submit" disabled={isLoading}>
            {isLoading ? "Memuat..." : "Daftar"}
          </button>
          
          <div className="auth-divider">
            <span>atau</span>
          </div>

          <button
            type="button"
            className="auth-google-btn"
            onClick={() => setShowGoogleSim(true)}
            disabled={isLoading}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: 8 }}>
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
            </svg>
            <span>Daftar dengan Google</span>
          </button>

          <div className="auth-footer-link">
            Sudah punya akun? <Link to="/">Masuk di sini</Link>
          </div>
        </form>
      </div>

      {/* Google Simulation Consent Modal Overlay */}
      {showGoogleSim && (
        <div className="google-sim-overlay">
          <div className="google-sim-modal">
            <div className="google-sim-header">
              <svg viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: 8 }}>
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
              </svg>
              <h3 style={{ margin: 0, fontWeight: 700, color: "#1a1f36" }}>Pilih Akun Google</h3>
            </div>
            <p className="google-sim-desc">Pilih akun Google Demo untuk daftar di Narapangan:</p>
            <div className="google-sim-accounts">
              <button onClick={() => handleGoogleLogin("warung.seblak@gmail.com")} className="google-sim-account-row">
                <div className="google-sim-avatar">S</div>
                <div className="google-sim-details">
                  <span className="google-sim-name">Seblak Premium Caringin</span>
                  <span className="google-sim-email">warung.seblak@gmail.com</span>
                </div>
              </button>
              <button onClick={() => handleGoogleLogin("ayamgeprek.bandung@gmail.com")} className="google-sim-account-row">
                <div className="google-sim-avatar">A</div>
                <div className="google-sim-details">
                  <span className="google-sim-name">Ayam Geprek Caringin</span>
                  <span className="google-sim-email">ayamgeprek.bandung@gmail.com</span>
                </div>
              </button>
            </div>

            <div className="google-sim-custom">
              <span className="google-sim-or">Atau masukkan email Google kustom:</span>
              <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                <input
                  type="email"
                  placeholder="nama.usaha@gmail.com"
                  value={googleEmail}
                  onChange={(e) => setGoogleEmail(e.target.value)}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "1px solid var(--card-border)",
                    fontSize: "13px"
                  }}
                />
                <button
                  onClick={() => {
                    if (googleEmail.trim()) {
                      handleGoogleLogin(googleEmail.trim());
                    }
                  }}
                  className="sim-btn-save"
                  style={{ padding: "8px 16px", borderRadius: "6px" }}
                >
                  Daftar
                </button>
              </div>
            </div>

            <button onClick={() => setShowGoogleSim(false)} className="google-sim-close-btn">
              Batal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
