import { ArrowUpRight, ArrowDownRight, RefreshCw } from "lucide-react";
import { ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { formatRp, formatSigned, formatCurrency } from "../utils/helpers";
import { CHART_COLORS } from "../utils/constants";
import { ForecastCard } from "../components/ForecastCard";
import { AIConsultSection } from "../components/AIConsultSection";
import { useAppContext } from "../context/AppContext";
import { EmptyState } from "../components/EmptyState";

export function PrediksiPage() {
  const { payload, runPrediction, isLoading, profile } = useAppContext();
  
  if (!payload) return <EmptyState />;

  const { summary, chartData, forecast } = payload;

  return (
    <div className="page-container">
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <button
          className="notif-btn"
          onClick={runPrediction}
          disabled={isLoading}
          title="Refresh prediksi"
        >
          <RefreshCw size={16} className={isLoading ? "spin" : ""} />
        </button>
      </div>

      <div className="metric-row">
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">PREDIKSI MINGGU DEPAN</span>
            <span className="metric-badge dots">···</span>
          </div>
          <div className="metric-value-row">
            <span className="metric-value">{formatRp(forecast[0].predicted_price)}</span>
            <span className="metric-unit">/kg</span>
          </div>
          <div className="metric-detail">
            <span className={`change-badge ${forecast[0].pct_change >= 0 ? "up" : "down"}`}>
              {forecast[0].pct_change >= 0 ? <ArrowUpRight size={12} className="arrow-icon" /> : <ArrowDownRight size={12} className="arrow-icon" />}
              {formatSigned(forecast[0].pct_change)}
            </span>
            <span className="metric-detail-text">vs harga terakhir</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">RATA-RATA PREDIKSI 4 MINGGU</span>
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
            <span className="metric-detail-text">vs minggu ini</span>
          </div>
        </div>

        <div className="metric-card signal">
          <div className="metric-header">
            <span className="metric-label">SINYAL PENGADAAN</span>
          </div>
          <div className="metric-value-row">
            <span className="metric-value">
              {summary.signal_code === "stock_early" ? "BELI SEKARANG" : summary.signal_code === "hold_purchase" ? "TAHAN" : "NORMAL"}
            </span>
          </div>
          <div className="metric-detail">
            <span className="metric-detail-text">{summary.recommendation_short}</span>
          </div>
        </div>
      </div>

      <div className="content-grid">
        <div className="chart-panel">
          <h3 className="chart-title">Tren Harga (Historis & Prediksi AI)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={chartData} margin={{ top: 18, right: 16, left: 0, bottom: 8 }}>
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
              <h3 className="forecast-title">Panel keputusan stok</h3>
              <p className="forecast-subtitle">4 minggu ke depan</p>
            </div>
            <span className="forecast-ai-label">AI v2.4</span>
          </div>
          <div className="forecast-list">
            {forecast.map((row, i) => (
              <ForecastCard key={row.ds} row={row} index={i} showAction={true} allForecast={forecast} />
            ))}
          </div>
        </div>
      </div>

      <AIConsultSection payload={payload} businessProfile={profile} />
    </div>
  );
}
