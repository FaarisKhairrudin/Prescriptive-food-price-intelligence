import { Calendar, ArrowUpRight, ArrowDownRight, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { formatRp, formatSigned, formatDate, formatCurrency, buildChartData } from "../utils/helpers";
import { CHART_COLORS } from "../utils/constants";
import { useAppContext } from "../context/AppContext";
import { EmptyState } from "../components/EmptyState";
import { ForecastCard } from "../components/ForecastCard";

export function OverviewPage() {
  const { payload, profile, isDemoMode, setIsOnboardingOpen } = useAppContext();
  const [timeRange, setTimeRange] = useState("3m");

  if (!payload) return <EmptyState />;

  const { summary, history, forecast } = payload;
  const chartData = useMemo(() => buildChartData(history, forecast), [history, forecast]);

  const filteredChartData = useMemo(() => {
    if (!chartData || chartData.length === 0) return [];
    const actuals = chartData.filter(d => d.actual !== null && d.forecast === null);
    const bridgeAndForecasts = chartData.filter(d => d.forecast !== null);
    
    let sliceCount = 12;
    if (timeRange === "1m") sliceCount = 4;
    if (timeRange === "3m") sliceCount = 12;
    if (timeRange === "6m") sliceCount = 26;
    if (timeRange === "1y") sliceCount = 52;
    
    const slicedActuals = actuals.slice(-sliceCount);
    return [...slicedActuals, ...bridgeAndForecasts];
  }, [chartData, timeRange]);

  const actionBadge = summary.signal_code === "stock_early"
    ? "BELI SEKARANG"
    : summary.signal_code === "hold_purchase"
      ? "TAHAN"
      : "NORMAL";

  const formattedSavedAt = payload.saved_at
    ? new Date(payload.saved_at).toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' })
    : "";

  return (
    <div className="page-container">
      <div className="overview-greeting" style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "10px" }}>
        <div>
          <h2 style={{ margin: "0 0 4px 0" }}>Selamat datang kembali, {profile.business_type || 'Pengguna'} 👋</h2>
          <p style={{ margin: 0, color: "var(--muted)" }}>Data per {formatDate(new Date().toISOString())}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span className="context-badge">
            <span className="context-badge-dot"></span>
            Profil: {isDemoMode ? "Mode Demo" : (profile.business_type || "Umum")} · {isDemoMode ? "2.0 Kg/Hari" : `${profile.daily_usage_kg || 0} Kg/Hari`}
          </span>
          {formattedSavedAt && (
            <span style={{ fontSize: "12px", color: "var(--muted)" }}>
              Pukul {formattedSavedAt}
            </span>
          )}
        </div>
      </div>

      {isDemoMode && (
        <div className="demo-mode-banner">
          <p className="demo-mode-text">
            ⚠️ <strong>Mode Demo Aktif</strong> — Prediksi dan rekomendasi ini menggunakan parameter default (2.0 Kg/Hari, 10 Kg Simpan). Lengkapi profil bisnis Anda untuk mengaktifkan rencana pengadaan kustom.
          </p>
          <button className="demo-mode-btn" onClick={() => setIsOnboardingOpen(true)}>
            Mulai Atur Profil Usaha
          </button>
        </div>
      )}

      <div className="metric-row">
        {/* Card 1: Harga Terakhir */}
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">HARGA TERAKHIR</span>
            <span className="metric-badge live">LIVE</span>
          </div>
          <div className="metric-value-row">
            <span className="metric-value">{formatRp(summary.last_actual_price)}</span>
            <span className="metric-unit">/kg</span>
          </div>
          <div className="metric-detail">
            <Calendar size={14} className="metric-detail-icon" />
            <span className="metric-detail-text">{formatDate(summary.last_actual_date)} · Caringin</span>
          </div>
        </div>

        {/* Card 2: Harga Mendatang (4 Minggu) */}
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">HARGA MENDATANG (4 MINGGU)</span>
            <span className="metric-badge dots">···</span>
          </div>
          <div className="metric-value-row">
            <span className="metric-value">{formatRp(summary.avg_predicted_price)}</span>
            <span className="metric-unit">/kg</span>
          </div>
          <div className="metric-detail">
            <span className={`change-badge ${summary.pct_change_avg >= 0 ? "up" : "down"}`}>
              {summary.pct_change_avg >= 0 ? <ArrowUpRight size={12} className="arrow-icon" /> : <ArrowDownRight size={12} className="arrow-icon" />}
              {formatSigned(summary.pct_change_avg)}
            </span>
            <span className="metric-detail-text">Rata-rata 4 minggu ke depan</span>
          </div>
        </div>

        {/* Card 3: Sinyal Pengadaan */}
        <div className="metric-card signal">
          <div className="metric-header">
            <span className="metric-label">SINYAL PENGADAAN</span>
          </div>
          <div className="metric-value-row">
            <span className="metric-value">{actionBadge}</span>
          </div>
          <div className="metric-detail">
            <span className="metric-detail-text">{summary?.recommendation_short || summary.recommendation || summary.signal_label}</span>
          </div>
        </div>
      </div>

      {/* AI Insight Card */}
      {payload.explanation && (
        <div className="ai-insight-card">
          <div className="ai-insight-header">
            <div className="ai-badge">
              <Sparkles size={14} className="ai-sparkle-icon" />
              <span>ANALISIS AI NARAPANGAN</span>
            </div>
            {payload.explanation.source === "gemini" && (
              <span className="source-badge gemini">Gemini AI</span>
            )}
            {payload.explanation.source === "rule_based" && (
              <span className="source-badge fallback">Sistem</span>
            )}
          </div>
          
          <h4 className="ai-insight-headline">{payload.explanation.headline}</h4>
          <p className="ai-insight-body">{payload.explanation.body}</p>
          
          {payload.explanation.drivers && payload.explanation.drivers.length > 0 && (
            <div className="ai-insight-drivers">
              <span className="drivers-label">FAKTOR PENGGERAK HARGA:</span>
              <div className="drivers-list">
                {payload.explanation.drivers.map((drv, idx) => (
                  <span key={idx} className="driver-pill">{drv}</span>
                ))}
              </div>
            </div>
          )}
          
          <div className="ai-insight-footer">
            <span className="ai-insight-offer">{payload.explanation.offer}</span>
            <Link to="/dashboard/konsultasi" className="ai-insight-btn">
              Konsultasi Strategi &rarr;
            </Link>
          </div>
        </div>
      )}

      <div className="content-grid">
        <div className="chart-panel">
          <div className="chart-header">
            <div>
              <h3 className="chart-title">Pergerakan Harga Bandung</h3>
              <p className="chart-subtitle">Pasar Caringin · Historis + Prediksi 4 minggu</p>
            </div>
            <div className="chart-controls-legend-wrapper">
              <div className="chart-controls">
                {["1m", "3m", "6m", "1y"].map((range) => (
                  <button
                    key={range}
                    className={`chart-filter-btn ${timeRange === range ? "active" : ""}`}
                    onClick={() => setTimeRange(range)}
                  >
                    {range === "1m" ? "1B" : range === "3m" ? "3B" : range === "6m" ? "6B" : "1T"}
                  </button>
                ))}
              </div>
              <div className="chart-legend">
                <span className="legend-item"><span className="legend-dot actual"></span>Historis</span>
                <span className="legend-item"><span className="legend-dot forecast"></span>Prediksi</span>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={filteredChartData} margin={{ top: 18, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="4 4" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={16} />
              <YAxis
                tickFormatter={(v) => `${Math.round(v / 1000)}k`}
                tickLine={false}
                axisLine={false}
                width={48}
              />
              <Tooltip
                formatter={(v) => formatCurrency(v)}
                labelFormatter={(_, rows) => rows?.[0]?.payload?.date || ""}
                contentStyle={{
                  borderRadius: 8,
                  border: `1px solid ${CHART_COLORS.tooltipBorder}`,
                  boxShadow: CHART_COLORS.tooltipShadow,
                }}
              />
              <Area
                type="monotone"
                dataKey="forecast"
                fill={CHART_COLORS.forecastFill}
                fillOpacity={0.22}
                stroke="none"
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="actual"
                stroke={CHART_COLORS.actual}
                strokeWidth={3}
                dot={{ r: 4, fill: CHART_COLORS.actual }}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="forecast"
                stroke={CHART_COLORS.forecast}
                strokeWidth={3}
                strokeDasharray="8 7"
                dot={{ r: 4, fill: CHART_COLORS.forecast }}
                connectNulls
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="forecast-panel">
          <div className="forecast-header">
            <div>
              <h3 className="forecast-title">Forecast Mingguan</h3>
              <p className="forecast-subtitle">4 minggu ke depan</p>
            </div>
          </div>
          <div className="forecast-list">
            {forecast.map((row, i) => (
              <ForecastCard key={row.ds} row={row} index={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
