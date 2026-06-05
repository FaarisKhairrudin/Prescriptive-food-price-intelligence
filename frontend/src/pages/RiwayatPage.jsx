import { formatRp, formatDate } from "../utils/helpers";
import { useAppContext } from "../context/AppContext";

export function RiwayatPage() {
  const { payload } = useAppContext();

  return (
    <div className="page-container">
      <div className="metric-row four">
        <div className="metric-card">
          <div className="metric-header"><span className="metric-label">AKURASI ARAH (DIRECTIONAL)</span></div>
          <div className="metric-value-row"><span className="metric-value">--</span></div>
          <div className="metric-detail"><span className="metric-detail-text">Belum tersedia</span></div>
        </div>
        <div className="metric-card">
          <div className="metric-header"><span className="metric-label">RATA-RATA ERROR (MAE)</span></div>
          <div className="metric-value-row"><span className="metric-value">--</span></div>
          <div className="metric-detail"><span className="metric-detail-text">Belum tersedia</span></div>
        </div>
        <div className="metric-card">
          <div className="metric-header"><span className="metric-label">MARGIN ERROR (MAPE)</span></div>
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
            Membandingkan harga yang ditebak AI vs harga yang benar-benar terjadi di pasar — 4 minggu terakhir
          </p>
        </div>

        {payload && payload.forecast ? (
          <div className="comparison-list">
            {payload.forecast.map((row, i) => {
              const dateObj = new Date(row.ds);
              const day = dateObj.getDate().toString().padStart(2, '0');
              const monthNames = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
              const month = monthNames[dateObj.getMonth()];
              const year = dateObj.getFullYear();

              return (
                <div className="comparison-row-new" key={row.ds}>
                  <div className="comp-week-pill">
                    <span className="comp-w">W+{i + 1}</span>
                    <span className="comp-day">{day}</span>
                  </div>
                  <div className="comp-date-label">
                    {day} {month} {year}
                  </div>

                  <div className="comp-cell">
                    <div className="comp-price">{formatRp(row.predicted_price)}</div>
                    <span className="comp-tag prediksi">Prediksi</span>
                  </div>

                  <div className="comp-cell">
                    <div className="comp-price muted">Belum tersedia</div>
                    <span className="comp-tag aktual">Harga Riil</span>
                  </div>

                  <div className="comp-selisih">
                    Selisih--
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p style={{ color: "#9e9a93", fontSize: 14, marginTop: 16 }}>
            Jalankan prediksi terlebih dahulu untuk melihat riwayat.
          </p>
        )}
      </section>
    </div>
  );
}
