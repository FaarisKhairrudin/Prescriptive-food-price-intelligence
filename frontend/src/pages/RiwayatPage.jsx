import { formatRp, formatDate, getCalendarLabel } from "../utils/helpers";
import { AIConsultSection } from "../components/AIConsultSection";
import { useAppContext } from "../context/AppContext";
import { DEFAULT_PROFILE } from "../utils/constants";

export function RiwayatPage() {
  const { payload } = useAppContext();

  return (
    <div className="page-container">
      <div className="metric-row four">
        <div className="metric-card">
          <div className="metric-header"><span className="metric-label">AKURASI RATA-RATA</span></div>
          <div className="metric-value-row"><span className="metric-value">--</span></div>
          <div className="metric-detail"><span className="metric-detail-text">Belum tersedia</span></div>
        </div>
        <div className="metric-card">
          <div className="metric-header"><span className="metric-label">MAE (Rp)</span></div>
          <div className="metric-value-row"><span className="metric-value">--</span></div>
          <div className="metric-detail"><span className="metric-detail-text">Belum tersedia</span></div>
        </div>
        <div className="metric-card">
          <div className="metric-header"><span className="metric-label">MAPE (%)</span></div>
          <div className="metric-value-row"><span className="metric-value">--</span></div>
          <div className="metric-detail"><span className="metric-detail-text">Belum tersedia</span></div>
        </div>
        <div className="metric-card">
          <div className="metric-header"><span className="metric-label">TOTAL PREDIKSI</span></div>
          <div className="metric-value-row"><span className="metric-value">{payload ? "1" : "0"}</span></div>
          <div className="metric-detail"><span className="metric-detail-text">{payload ? "Prediksi tersimpan" : "Belum ada prediksi"}</span></div>
        </div>
      </div>

      <section className="riwayat-section">
        <div className="riwayat-header">
          <h3 className="riwayat-title">Seberapa tepat tebakan AI?</h3>
          <p className="riwayat-subtitle">
            Perbandingan antara harga yang diprediksi AI minggu lalu dengan harga aktual yang tercatat di pasar.
            Fitur ini akan aktif setelah tersedia data prediksi sebelumnya yang bisa dibandingkan dengan harga aktual terbaru.
          </p>
        </div>

        {payload && payload.forecast ? (
          <div className="comparison-list">
            {payload.forecast.map((row) => (
              <div className="comparison-row" key={row.ds}>
                <div className="comparison-week">
                  <span className="comp-label">Minggu {row.week}</span>
                  <span>{formatDate(row.ds)}</span>
                </div>
                <div className="comparison-predicted">
                  <span className="comp-label">Prediksi</span>
                  <span>{formatRp(row.predicted_price)}</span>
                </div>
                <div className="comparison-actual">
                  <span className="comp-label">Aktual</span>
                  <span>Belum tersedia</span>
                </div>
                <div className="comparison-diff">
                  <span className="comp-label">Selisih</span>
                  <span>--</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: "#9e9a93", fontSize: 14, marginTop: 16 }}>
            Jalankan prediksi terlebih dahulu untuk melihat riwayat.
          </p>
        )}
      </section>

      {payload && <AIConsultSection payload={payload} businessProfile={DEFAULT_PROFILE} />}
    </div>
  );
}
