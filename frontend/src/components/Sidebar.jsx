import { LayoutDashboard, TrendingUp, History, MessageSquare, Settings, AlertCircle, TriangleAlert, ChevronRight } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAppContext } from "../context/AppContext";

export function Sidebar() {
  const { pathname } = useLocation();
  const { payload, profile } = useAppContext();

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
            {alert.type === "warning" ? <TriangleAlert size={16} /> : <AlertCircle size={16} />}
            <span className="sidebar-alert-title">{alert.title}</span>
          </div>
          <p className="sidebar-alert-text">{alert.text}</p>
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
