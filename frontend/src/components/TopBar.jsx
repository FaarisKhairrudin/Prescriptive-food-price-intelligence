import { Bell, Search, Eye } from "lucide-react";
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
  const { profile } = useAppContext();
  const title = PAGE_TITLES[pathname] || "Dashboard";
  const isOverview = pathname === "/dashboard";

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
            <option value="cabai-rawit-merah">🌶️ Cabai Rawit Merah</option>
            <option value="bawang-merah" disabled>🧅 Bawang Merah (Segera)</option>
            <option value="bawang-putih" disabled>🧄 Bawang Putih (Segera)</option>
          </select>
          <select className="premium-select" defaultValue="pasar-caringin">
            <option value="pasar-caringin">🏪 Pasar Caringin</option>
            <option value="pasar-sederhana" disabled>🏪 Pasar Sederhana (Segera)</option>
            <option value="pasar-kosambi" disabled>🏪 Pasar Kosambi (Segera)</option>
          </select>
        </div>
        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input type="text" placeholder="Cari komoditas, wilayah..." />
        </div>
        <button className="notif-btn">
          <Bell size={18} />
        </button>
      </div>
    </header>
  );
}
