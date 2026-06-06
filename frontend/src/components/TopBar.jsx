import { Bell, Search, Eye } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { formatDate } from "../utils/helpers";
import { useAppContext } from "../context/AppContext";

const PAGE_TITLES = {
  "/dashboard": "Overview",
  "/dashboard/prediksi": "Prediksi Harga Cabai Rawit Merah",
  "/dashboard/riwayat": "Riwayat Prediksi",
  "/dashboard/konsultasi": "Konsultasi AI Narapangan",
  "/dashboard/pengaturan": "Pengaturan UMKM",
};

export function TopBar() {
  const { pathname } = useLocation();
  const { payload, profile, isDemoMode } = useAppContext();
  const title = PAGE_TITLES[pathname] || "Dashboard";
  const isOverview = pathname === "/dashboard";

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [hasRead, setHasRead] = useState(false);
  const dropdownRef = useRef(null);

  const summary = payload?.summary;

  useEffect(() => {
    setHasRead(false);
  }, [isDemoMode, summary?.signal_code]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNotifClick = () => {
    setIsNotifOpen(!isNotifOpen);
    setHasRead(true);
  };

  const notifications = [];
  if (isDemoMode) {
    notifications.push({
      type: "warning",
      title: "Profil Belum Lengkap",
      message: "Atur profil bisnis Anda di Pengaturan untuk menyesuaikan saran pengadaan."
    });
  }
  if (summary?.signal_code === "stock_early") {
    notifications.push({
      type: "warning",
      title: "Sinyal Beli Aktif",
      message: "Proyeksi rata-rata 4 minggu naik +5%. Disarankan stok lebih awal."
    });
  }
  if (summary?.signal_code === "hold_purchase") {
    notifications.push({
      type: "info",
      title: "Sinyal Tahan Aktif",
      message: "Proyeksi rata-rata 4 minggu turun -5%. Disarankan beli minimum saja."
    });
  }

  return (
    <header className="top-bar">
      <div>
        <div className="page-date">{formatDate(new Date().toISOString())}</div>
        <h1 className="page-title">{title}</h1>
        <div className="page-subtitle">
          {isOverview ? `Pantau harga cabai rawit merah Bandung` : 'Pasar Bandung'}
        </div>
      </div>
      <div className="top-bar-actions">
        <div className="selector-group">
          <select className="premium-select" defaultValue="cabai-rawit-merah">
            <option value="cabai-rawit-merah">Cabai Rawit Merah</option>
            <option value="bawang-merah" disabled>Bawang Merah (Segera)</option>
            <option value="bawang-putih" disabled>Bawang Putih (Segera)</option>
          </select>
          <select className="premium-select" defaultValue="pasar-caringin">
            <option value="pasar-caringin">Pasar Caringin</option>
            <option value="pasar-sederhana" disabled>Pasar Sederhana (Segera)</option>
            <option value="pasar-kosambi" disabled>Pasar Kosambi (Segera)</option>
          </select>
        </div>
        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input type="text" placeholder="Cari komoditas, wilayah..." />
        </div>
        <div className="notif-wrapper" style={{ position: "relative" }} ref={dropdownRef}>
          <button className="notif-btn" onClick={handleNotifClick}>
            <Bell size={18} />
            {notifications.length > 0 && !hasRead && <span className="notif-badge"></span>}
          </button>
          {isNotifOpen && (
            <div className="notif-dropdown">
              <div className="notif-dropdown-header">
                <h4>Notifikasi</h4>
                {notifications.length > 0 && (
                  <span className="notif-count">{notifications.length} Baru</span>
                )}
              </div>
              <div className="notif-dropdown-body">
                {notifications.length === 0 ? (
                  <div className="notif-empty">Tidak ada notifikasi baru</div>
                ) : (
                  notifications.map((n, i) => (
                    <div key={i} className={`notif-item ${n.type}`}>
                      <div className="notif-item-title">{n.title}</div>
                      <div className="notif-item-message">{n.message}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
