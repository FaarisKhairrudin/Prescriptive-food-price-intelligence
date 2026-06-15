import { useState, useEffect } from "react";
import { formatRp, formatDate } from "../utils/helpers";
import { useAppContext } from "../context/AppContext";

export function RiwayatPage() {
  const { token } = useAppContext();
  const [auditData, setAuditData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchAudit() {
      setIsLoading(true);
      setError("");
      try {
        const res = await fetch("/api/predict/audit", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) {
          setAuditData(data);
        } else {
          setError(data.error || "Gagal mengambil riwayat prediksi.");
        }
      } catch (err) {
        setError("Gagal menghubungi server untuk mengambil data riwayat.");
      } finally {
        setIsLoading(false);
      }
    }

    if (token) {
      fetchAudit();
    }
  }, [token]);

  const { summary = {}, accuracy_history = [] } = auditData || {};

  return (
    <div className="page-container">
      {isLoading ? (
        <div style={{ color: "var(--muted)", padding: "40px 0", textAlign: "center" }}>
          Memuat data riwayat evaluasi prediksi...
        </div>
      ) : error ? (
        <div className="status-banner error" style={{ marginBottom: 20 }}>
          <span>{error}</span>
        </div>
      ) : (
        <>
          <div className="metric-row four">
            <div className="metric-card">
              <div className="metric-header"><span className="metric-label">AKURASI ARAH (DIRECTIONAL)</span></div>
              <div className="metric-value-row">
                <span className="metric-value">
                  {summary.da !== undefined && summary.da !== null ? `${(summary.da * 100).toFixed(1)}%` : "--"}
                </span>
              </div>
              <div className="metric-detail">
                <span className="metric-detail-text">
                  {summary.da !== undefined ? "Arah tren tertebak" : "Belum tersedia"}
                </span>
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-header"><span className="metric-label">RATA-RATA ERROR (MAE)</span></div>
              <div className="metric-value-row">
                <span className="metric-value">
                  {summary.mae ? formatRp(summary.mae) : "--"}
                </span>
              </div>
              <div className="metric-detail">
                <span className="metric-detail-text">
                  {summary.mae ? "Selisih nominal rata-rata" : "Belum tersedia"}
                </span>
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-header"><span className="metric-label">MARGIN ERROR (MAPE)</span></div>
              <div className="metric-value-row">
                <span className="metric-value">
                  {summary.mape !== undefined && summary.mape !== null ? `${(summary.mape * 100).toFixed(2)}%` : "--"}
                </span>
              </div>
              <div className="metric-detail">
                <span className="metric-detail-text">
                  {summary.mape !== undefined ? "Persentase error rata-rata" : "Belum tersedia"}
                </span>
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-header"><span className="metric-label">TOTAL TITIK AUDIT</span></div>
              <div className="metric-value-row">
                <span className="metric-value">{summary.n_points || 0}</span>
              </div>
              <div className="metric-detail">
                <span className="metric-detail-text">Prediksi terevaluasi</span>
              </div>
            </div>
          </div>

          <section className="riwayat-section">
            <div className="riwayat-header">
              <h3 className="riwayat-title">Seberapa tepat tebakan AI?</h3>
              <p className="riwayat-subtitle">
                Membandingkan harga yang ditebak AI vs harga yang benar-benar terjadi di pasar (Pasar Caringin)
              </p>
            </div>

            {accuracy_history && accuracy_history.length > 0 ? (
              <div className="comparison-list">
                {accuracy_history.map((row, i) => {
                  const dateObj = new Date(row.target_date);
                  const day = dateObj.getDate().toString().padStart(2, '0');
                  const monthNames = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
                  const month = monthNames[dateObj.getMonth()];
                  const year = dateObj.getFullYear();

                  const diff = row.predicted_price - row.actual_price;
                  const isUp = diff >= 0;
                  const diffPct = row.actual_price > 0 ? (Math.abs(diff) / row.actual_price * 100) : 0;

                  return (
                    <div className="comparison-row-new" key={row.target_date}>
                      <div className="comp-week-pill">
                        <span className="comp-w">Audit</span>
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
                        <div className="comp-price">{formatRp(row.actual_price)}</div>
                        <span className="comp-tag aktual">Harga Riil</span>
                      </div>

                      <div className="comp-selisih">
                        <span style={{ fontWeight: 700, color: isUp ? "#dc2626" : "#166534" }}>
                          {isUp ? "+" : "-"}{formatRp(Math.abs(diff))}
                        </span>
                        <span style={{ fontSize: 11, color: "var(--muted)", display: "block" }}>
                          ({diffPct.toFixed(1)}% error)
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={{ color: "#9e9a93", fontSize: 14, marginTop: 16 }}>
                Belum ada data evaluasi karena target tanggal prediksi belum terlewati atau data harga riil belum masuk ke sistem.
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
