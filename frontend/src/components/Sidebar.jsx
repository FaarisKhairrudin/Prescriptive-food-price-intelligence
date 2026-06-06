import { useState } from "react";
import { LayoutDashboard, TrendingUp, History, MessageSquare, Settings, AlertCircle, TriangleAlert, ChevronRight, LogOut } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAppContext } from "../context/AppContext";

export function Sidebar() {
  const { pathname } = useLocation();
  const { payload, profile, logout, user } = useAppContext();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const getAlert = () => {
    if (!payload?.summary) return null;
    const code = payload.summary.signal_code;
    const pct = Math.abs(payload.summary.pct_change_avg).toFixed(1);

    if (code === "stock_early") {
      return { type: "warning", title: "Peringatan", text: `Harga diproyeksi naik ${pct}%` };
    } else if (code === "hold_purchase") {
      return { type: "info", title: "Info", text: `Harga diproyeksi turun ${pct}%` };
    }
    return null;
  };

  const alert = getAlert();

  const navItems = [
    { to: "/dashboard", icon: LayoutDashboard, label: "Overview" },
    { to: "/dashboard/prediksi", icon: TrendingUp, label: "Prediksi" },
    { to: "/dashboard/riwayat", icon: History, label: "Riwayat" },
    { to: "/dashboard/konsultasi", icon: MessageSquare, label: "Konsultasi AI" },
    { to: "/dashboard/pengaturan", icon: Settings, label: "Pengaturan" },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <img src="/logo.png" alt="Narapangan" style={{ height: 32 }} />
      </div>

      <div className="sidebar-label">MENU</div>
      <nav className="sidebar-nav">
        {navItems.map(({ to, icon: Icon, label }) => {
          const isActive = pathname === to;
          return (
            <Link key={to} to={to} className={`nav-item ${isActive ? "active" : ""}`}>
              <Icon size={20} className="nav-icon" />
              <span className="nav-label">{label}</span>
              {isActive && <ChevronRight size={16} className="nav-chevron" />}
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-spacer" />

      {alert && (
        <div className={`sidebar-alert ${alert.type}`}>
          <div className="sidebar-alert-header">
            {alert.type === "warning" ? (
              <TriangleAlert className="sidebar-alert-icon" size={16} />
            ) : (
              <AlertCircle className="sidebar-alert-icon" size={16} />
            )}
            <span className="sidebar-alert-title">{alert.title}</span>
          </div>
          <p className="sidebar-alert-text">{alert.text}</p>
        </div>
      )}

      <button className="sidebar-user" onClick={() => setShowLogoutConfirm(true)} title="Klik untuk keluar">
        <div className="sidebar-avatar">{profile.business_type ? profile.business_type[0].toUpperCase() : "U"}</div>
        <div className="sidebar-user-info">
          <div className="sidebar-user-name" title={user?.email || "Pengguna"}>{user?.email || "Pengguna"}</div>
          <div className="sidebar-user-role" title={`${profile.business_type || "UMKM"} · Keluar`}>
            {profile.business_type || "UMKM"} · Keluar
          </div>
        </div>
      </button>

      {showLogoutConfirm && (
        <div className="confirm-overlay" onClick={() => setShowLogoutConfirm(false)}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-icon-wrapper">
              <LogOut size={28} />
            </div>
            <h3 className="confirm-title">Konfirmasi Keluar</h3>
            <p className="confirm-text">
              Apakah Anda yakin ingin keluar dari Narapangan? Sesi Anda akan diakhiri.
            </p>
            <div className="confirm-buttons">
              <button className="confirm-btn confirm-btn-cancel" onClick={() => setShowLogoutConfirm(false)}>
                Batal
              </button>
              <button className="confirm-btn confirm-btn-danger" onClick={logout}>
                Keluar
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
