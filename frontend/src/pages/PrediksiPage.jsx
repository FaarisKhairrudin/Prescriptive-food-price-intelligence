import { ArrowUpRight, ArrowDownRight, RefreshCw, Calendar, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { formatRp, formatSigned, formatCurrency, formatDate, buildChartData } from "../utils/helpers";
import { CHART_COLORS } from "../utils/constants";
import { ForecastCard } from "../components/ForecastCard";
import { AIConsultSection } from "../components/AIConsultSection";
import { useAppContext } from "../context/AppContext";
import { EmptyState } from "../components/EmptyState";

export function PrediksiPage() {
  const { payload, runPrediction, isLoading, profile, setProfile } = useAppContext();
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

  const peak = useMemo(
    () => forecast.reduce((a, b) => a.predicted_price > b.predicted_price ? a : b),
    [forecast]
  );

  return (
    <div className="page-container">

      {/* 4 KPI Cards */}
      <div className="metric-row four">
        {/* Card 1: Harga Saat Ini */}
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">HARGA SAAT INI</span>
            <span className="metric-badge live">LIVE</span>
          </div>
          <div className="metric-value-row">
            <span className="metric-value">{formatRp(summary.last_actual_price)}</span>
            <span className="metric-unit">/kg</span>
          </div>
          <div className="metric-detail">
            <Calendar size={14} className="metric-detail-icon" />
            <span className="metric-detail-text">{formatDate(summary.last_actual_date)} · Pasar Caringin</span>
          </div>
        </div>

        {/* Card 2: Prediksi Minggu 1 */}
        <div className="metric-card highlighted">
          <div className="metric-header">
            <span className="metric-label">PREDIKSI MINGGU 1</span>
            <span className="metric-badge action">W+1</span>
          </div>
          <div className="metric-value-row">
            <span className="metric-value">{formatRp(forecast[0].predicted_price)}</span>
            <span className="metric-unit">/kg</span>
          </div>
          <div className="metric-detail">
            <span className={`change-badge ${forecast[0].change_from_last_pct >= 0 ? "up" : "down"}`}>
              {forecast[0].change_from_last_pct >= 0 ? <ArrowUpRight size={12} className="arrow-icon" /> : <ArrowDownRight size={12} className="arrow-icon" />}
              {formatSigned(forecast[0].change_from_last_pct)}
            </span>
            <span className="metric-detail-text">vs harga terakhir</span>
          </div>
        </div>

        {/* Card 3: Puncak Prediksi */}
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">PUNCAK PREDIKSI</span>
            <span className="metric-badge dots">···</span>
          </div>
          <div className="metric-value-row">
            <span className="metric-value">{formatRp(peak.predicted_price)}</span>
            <span className="metric-unit">/kg</span>
          </div>
          <div className="metric-detail">
            <Calendar size={14} className="metric-detail-icon" />
            <span className="metric-detail-text">{formatDate(peak.ds)}</span>
          </div>
        </div>

        {/* Card 4: Tren Keseluruhan */}
        <div className="metric-card signal">
          <div className="metric-header">
            <span className="metric-label">TREN KESELURUHAN</span>
          </div>
          <div className="metric-value-row">
            <span className="metric-value">{formatSigned(summary.pct_change_avg)}</span>
          </div>
          <div className="metric-detail">
            <span className="metric-detail-text">Rata-rata 4 minggu ke depan</span>
          </div>
        </div>
      </div>

      {/* Chart + Panel Keputusan Stok */}
      <div className="content-grid">
        <div className="chart-panel">
          <div className="chart-header">
            <div>
              <h3 className="chart-title">Proyeksi Transmisi Harga 4 Minggu ke Depan</h3>
              <p className="chart-subtitle">
                {profile.business_type || "UMKM"} · {profile.daily_usage_kg ? `${profile.daily_usage_kg} Kg/Hari` : "Pasar Caringin"}
              </p>
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
              <h3 className="forecast-title">Panel Keputusan Stok</h3>
              <p className="forecast-subtitle">4 minggu ke depan</p>
            </div>
          </div>
          <div className="forecast-list">
            {forecast.map((row, i) => (
              <ForecastCard key={row.ds} row={row} index={i} showAction={true} />
            ))}
          </div>
        </div>
      </div>

      <AIConsultSection payload={payload} businessProfile={profile} />
    </div>
  );
}
