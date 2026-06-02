import { Sparkles, TrendingUp } from "lucide-react";
import { useAppContext } from "../context/AppContext";

export function EmptyState() {
  const { runPrediction } = useAppContext();
  
  return (
    <div className="empty-state">
      <div className="empty-state-content">
        <div className="empty-icon"><Sparkles size={48} style={{ color: "var(--lime)" }} /></div>
        <h2>Belum Ada Prediksi</h2>
        <p>Jalankan model AI pertama Anda untuk memuat harga komoditas terbaru dan mendapatkan rekomendasi stok yang cerdas.</p>
        <button className="btn-primary empty-btn" onClick={runPrediction}>
          <TrendingUp size={20} />
          Jalankan Prediksi
        </button>
      </div>
    </div>
  );
}
