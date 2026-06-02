import { LayoutDashboard, TrendingUp, History, MessageSquare, Settings, AlertCircle, TriangleAlert } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { formatSigned } from "../utils/helpers";
import { useAppContext } from "../context/AppContext";

export function Sidebar() {
  const { pathname } = useLocation();
  const { payload, profile } = useAppContext();

  const getAlert = () => {
    if (!payload?.summary) return null;
    const code = payload.summary.signal_code;
    const isUp = payload.summary.pct_change_avg >= 0;
    const pct = Math.abs(payload.summary.pct_change_avg).toFixed(1);

    if (code === "stock_early") {
      return { type: "warning", title: "Peringatan", text: `Harga diproyeksi naik ${pct}%` };
    } else if (code === "hold_purchase") {
      return { type: "info", title: "Info", text: `Harga diproyeksi turun ${pct}%` };
    }
    return null;
  };

  const alert = getAlert();

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <img src="/logo.png" alt="Narapangan" style={{ height: 32 }} />
      </div>

      <div className="sidebar-label">MENU</div>
      <nav className="sidebar-nav">
        <Link to="/dashboard" className={`nav-item ${pathname === "/dashboard" ? "active" : ""}`}>
          <LayoutDashboard size={20} className="nav-icon" /> Overview
        </Link>
        <Link to="/dashboard/prediksi" className={`nav-item ${pathname === "/dashboard/prediksi" ? "active" : ""}`}>
          <TrendingUp size={20} className="nav-icon" /> Prediksi
        </Link>
        <Link to="/dashboard/riwayat" className={`nav-item ${pathname === "/dashboard/riwayat" ? "active" : ""}`}>
          <History size={20} className="nav-icon" /> Riwayat
        </Link>
        <Link to="/dashboard/konsultasi" className={`nav-item ${pathname === "/dashboard/konsultasi" ? "active" : ""}`}>
          <MessageSquare size={20} className="nav-icon" /> Konsultasi AI
        </Link>
        <Link to="/dashboard/pengaturan" className={`nav-item ${pathname === "/dashboard/pengaturan" ? "active" : ""}`}>
          <Settings size={20} className="nav-icon" /> Pengaturan
        </Link>
      </nav>

      <div className="sidebar-spacer" />

      {alert && (
        <div className={`sidebar-alert ${alert.type}`}>
          <div className="sidebar-alert-icon">
            {alert.type === "warning" ? <TriangleAlert size={16} /> : <AlertCircle size={16} />}
          </div>
          <div className="sidebar-alert-content">
            <strong>{alert.title}</strong>
            <p>{alert.text}</p>
          </div>
        </div>
      )}

      <button className="sidebar-user">
        <div className="sidebar-avatar">{profile.business_type ? profile.business_type[0].toUpperCase() : "U"}</div>
        <div className="sidebar-user-info">
          <div className="sidebar-user-name">[User]</div>
          <div className="sidebar-user-role">{profile.business_type || "UMKM"}</div>
        </div>
      </button>
    </aside>
  );
}
