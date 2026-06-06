import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";

export function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAppContext();

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="landing-page">
      <nav className="landing-nav">
        <div className="landing-brand">
          <img src="/logo.png" alt="Narapangan" />
        </div>
      </nav>
      <main className="landing-hero">
        <h1 className="landing-title">
          Prediksi Harga Cabai <span>Cerdas</span><br />Untuk UMKM Anda
        </h1>
        <p className="landing-subtitle">
          Narapangan membantu Anda memprediksi pergerakan harga cabai rawit merah di Bandung menggunakan teknologi AI. Ambil keputusan stok yang lebih baik hari ini.
        </p>
        <button className="btn-primary" onClick={() => navigate(isAuthenticated ? "/dashboard" : "/login")}>
          {isAuthenticated ? "Masuk ke Dashboard" : "Mulai Sekarang"}
        </button>
      </main>
    </div>
  );
}
