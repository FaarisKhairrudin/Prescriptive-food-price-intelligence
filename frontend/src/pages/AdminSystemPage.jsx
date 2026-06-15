import { useState, useEffect, useRef } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { Activity, Play, RefreshCw, CheckCircle, XCircle, AlertTriangle, Database, ShieldAlert, Cpu, Heart, AlertCircle, Clock } from "lucide-react";
import { useAppContext } from "../context/AppContext";
import { formatRp, formatDate } from "../utils/helpers";

export function AdminSystemPage() {
  const { token } = useAppContext();
  
  // Data States
  const [stats, setStats] = useState(null);
  const [health, setHealth] = useState(null);
  const [dataHealth, setDataHealth] = useState(null);
  const [activeRun, setActiveRun] = useState(null);
  const [recentRuns, setRecentRuns] = useState([]);
  const [accuracy, setAccuracy] = useState(null);
  const [chartData, setChartData] = useState([]);
  
  // UI States
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [runLoading, setRunLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  // Polling reference
  const pollTimerRef = useRef(null);

  useEffect(() => {
    fetchAllData();
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  // Set up polling if there's an active running pipeline
  useEffect(() => {
    if (activeRun && activeRun.status === "running") {
      if (!pollTimerRef.current) {
        pollTimerRef.current = setInterval(pollPipelineMonitor, 3000);
      }
    } else {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    }
  }, [activeRun]);

  async function fetchAllData() {
    setIsRefreshing(true);
    setError("");
    try {
      await Promise.all([
        fetchSystemStatus(),
        fetchDataHealth(),
        fetchPipelineMonitor(),
        fetchForecastAudit()
      ]);
    } catch (err) {
      setError("Gagal memperbarui beberapa modul data.");
    } finally {
      setIsRefreshing(false);
    }
  }

  async function fetchSystemStatus() {
    const res = await fetch("/api/admin/system-status", {
      headers: { "Authorization": `Bearer ${token}` }
    });
    const data = await res.json();
    if (res.ok) {
      setStats(data.stats);
      setHealth(data.health);
    }
  }

  async function fetchDataHealth() {
    const res = await fetch("/api/admin/data-health", {
      headers: { "Authorization": `Bearer ${token}` }
    });
    const data = await res.json();
    if (res.ok) {
      setDataHealth(data);
    }
  }

  async function fetchPipelineMonitor() {
    const res = await fetch("/api/admin/pipeline-monitor", {
      headers: { "Authorization": `Bearer ${token}` }
    });
    const data = await res.json();
    if (res.ok) {
      setActiveRun(data.active_run);
      setRecentRuns(data.recent_runs || []);
    }
  }

  async function pollPipelineMonitor() {
    try {
      const res = await fetch("/api/admin/pipeline-monitor", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setActiveRun(data.active_run);
        setRecentRuns(data.recent_runs || []);
        
        // If the pipeline has just finished, refresh all system status
        if (!data.active_run) {
          fetchSystemStatus();
          fetchDataHealth();
          fetchForecastAudit();
        }
      }
    } catch (e) {
      console.error("Polling error:", e);
    }
  }

  async function fetchForecastAudit() {
    const res = await fetch("/api/admin/forecast-audit", {
      headers: { "Authorization": `Bearer ${token}` }
    });
    const data = await res.json();
    if (res.ok) {
      setAccuracy(data.summary);
      
      // Transform accuracy history for plotting
      // We want to sort chronologically for a correct line direction (ascending target_date)
      const sortedHistory = [...(data.accuracy_history || [])]
        .reverse() // from oldest to newest
        .map(pt => {
          const d = new Date(pt.target_date);
          const formattedDate = `${d.getDate()}/${d.getMonth() + 1}`;
          return {
            date: formattedDate,
            "Harga Proyeksi": pt.predicted_price,
            "Harga Aktual": pt.actual_price ?? null,
            Error: pt.error_pct == null ? null : Math.round(pt.error_pct * 1000) / 10
          };
        });
      setChartData(sortedHistory);
    }
  }

  async function handleTriggerPipeline() {
    if (runLoading || (activeRun && activeRun.status === "running")) return;
    setRunLoading(true);
    setError("");
    setSuccess("");
    
    try {
      const res = await fetch("/api/admin/run-pipeline", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (res.status === 409) {
        setError("Pipeline saat ini sudah berjalan.");
      } else if (!res.ok) {
        throw new Error(data.error || "Gagal memicu eksekusi pipeline.");
      } else {
        setSuccess("Pipeline berhasil dijalankan di latar belakang!");
        await fetchPipelineMonitor(); // immediately poll
        setTimeout(() => setSuccess(""), 4000);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setRunLoading(false);
    }
  }

  const renderStageIcon = (stageStatus) => {
    switch (stageStatus) {
      case "success":
        return <CheckCircle size={16} style={{ color: "var(--primary)" }} />;
      case "failed":
        return <XCircle size={16} style={{ color: "#dc2626" }} />;
      case "running":
        return <RefreshCw size={16} className="spin" style={{ color: "var(--primary)" }} />;
      case "pending":
      default:
        return <Clock size={16} style={{ color: "var(--muted)" }} />;
    }
  };

  const getHealthBadge = (healthStatus) => {
    switch (healthStatus) {
      case "healthy":
        return <span className="health-badge healthy">Sehat</span>;
      case "warning":
        return <span className="health-badge warning">Peringatan</span>;
      case "critical":
      default:
        return <span className="health-badge critical">Kritis</span>;
    }
  };

  // List of stages in pipeline sequence
  const pipelineStages = [
    { key: "scraping", label: "Scraping PIHPS" },
    { key: "weather", label: "Weather Fetch" },
    { key: "feat_eng", label: "Feature Engineering" },
    { key: "forecast", label: "Generating Predictions" },
    { key: "payload", label: "Assembling Payload" },
    { key: "cache", label: "Updating Cache" }
  ];

  const formatAuditTooltip = (value, name) => {
    if (value == null) return ["Belum tersedia", name];
    if (name === "Error") return [`${value}%`, name];
    return [formatRp(value), name];
  };

  return (
    <div className="page-container">
      <style>{`
        .admin-sys-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 16px;
        }
        .admin-sys-title {
          font-size: 24px;
          font-weight: 800;
          color: var(--ink);
          margin: 0;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .admin-sys-refresh-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: var(--card);
          border: 1px solid var(--card-border);
          border-radius: 10px;
          font-weight: 600;
          color: var(--ink);
          font-family: inherit;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .admin-sys-refresh-btn:hover {
          background: #f4f6f4;
        }
        .spin {
          animation: spin-anim 1s linear infinite;
        }
        @keyframes spin-anim {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .admin-sys-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 20px;
          margin-bottom: 24px;
        }
        .sys-card {
          background: var(--card);
          border: 1px solid var(--card-border);
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.02);
        }
        .sys-card-title {
          font-size: 14px;
          font-weight: 700;
          color: var(--muted);
          text-transform: uppercase;
          margin-top: 0;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .health-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 0;
          border-bottom: 1px solid rgba(0, 0, 0, 0.04);
        }
        .health-row:last-child {
          border-bottom: none;
        }
        .health-row-label {
          font-weight: 600;
          font-size: 14px;
        }
        .health-badge {
          font-size: 11px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 20px;
          text-transform: uppercase;
        }
        .health-badge.healthy {
          background: rgba(22, 101, 52, 0.1);
          color: #166534;
        }
        .health-badge.warning {
          background: rgba(180, 83, 9, 0.1);
          color: #b45309;
        }
        .health-badge.critical {
          background: rgba(153, 27, 27, 0.1);
          color: #dc2626;
        }
        .pipeline-progress-container {
          margin-top: 12px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .pipeline-stage-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          background: rgba(0,0,0,0.02);
          border-radius: 8px;
          border: 1px solid rgba(0,0,0,0.02);
        }
        .pipeline-stage-item.running {
          background: rgba(42, 69, 53, 0.05);
          border-color: rgba(42, 69, 53, 0.15);
        }
        .pipeline-stage-item.success {
          background: rgba(22, 101, 52, 0.02);
        }
        .pipeline-stage-name {
          font-size: 13px;
          font-weight: 600;
          color: var(--ink);
        }
        .pipeline-stage-time {
          font-size: 11px;
          color: var(--muted);
        }
        .pipeline-run-btn {
          width: 100%;
          padding: 12px;
          background: var(--lime);
          color: var(--ink);
          border: none;
          border-radius: 10px;
          font-weight: 700;
          font-family: inherit;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s ease;
        }
        .pipeline-run-btn:hover:not(:disabled) {
          background: var(--lime-hover);
        }
        .pipeline-run-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .metric-mini-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }
        .metric-mini-card {
          background: rgba(0,0,0,0.02);
          border-radius: 10px;
          padding: 12px;
          text-align: center;
        }
        .metric-mini-label {
          font-size: 10px;
          font-weight: 700;
          color: var(--muted);
          text-transform: uppercase;
          display: block;
          margin-bottom: 4px;
        }
        .metric-mini-value {
          font-size: 18px;
          font-weight: 800;
          color: var(--ink);
        }
        .warnings-box {
          background: rgba(180, 83, 9, 0.05);
          border: 1px solid rgba(180, 83, 9, 0.15);
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 24px;
          color: #b45309;
        }
        .warnings-box-title {
          font-weight: 700;
          margin-top: 0;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .warnings-list {
          margin: 0;
          padding-left: 20px;
          font-size: 14px;
        }
        .warnings-list li {
          margin-bottom: 4px;
        }
        .recent-runs-list {
          max-height: 200px;
          overflow-y: auto;
          margin-top: 12px;
        }
        .recent-run-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid rgba(0,0,0,0.04);
          font-size: 13px;
        }
        .recent-run-item:last-child {
          border-bottom: none;
        }
        .recent-run-meta {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .chart-container {
          background: var(--card);
          border: 1px solid var(--card-border);
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 24px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.02);
        }
        .chart-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .chart-title {
          font-size: 16px;
          font-weight: 700;
          color: var(--ink);
          margin: 0;
        }
      `}</style>

      <div className="admin-sys-header">
        <h2 className="admin-sys-title">
          <Activity size={26} />
          Sistem & Pipeline
        </h2>
        <button className="admin-sys-refresh-btn" onClick={fetchAllData} disabled={isRefreshing}>
          <RefreshCw size={16} className={isRefreshing ? "spin" : ""} />
          Refresh Data
        </button>
      </div>

      {error && (
        <div className="status-banner error" style={{ marginBottom: 20 }}>
          <ShieldAlert size={18} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="status-banner success" style={{ marginBottom: 20 }}>
          <span>{success}</span>
        </div>
      )}

      {/* Warnings Banner if any */}
      {dataHealth && dataHealth.warnings && dataHealth.warnings.length > 0 && (
        <div className="warnings-box">
          <h4 className="warnings-box-title">
            <AlertTriangle size={18} />
            Pemberitahuan Kesehatan Data
          </h4>
          <ul className="warnings-list">
            {dataHealth.warnings.map((warn, i) => (
              <li key={i}>{warn}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="admin-sys-grid">
        {/* Module 1: Dashboard Status */}
        <div className="sys-card">
          <h3 className="sys-card-title">
            <Heart size={18} />
            Indikator Kesehatan
          </h3>
          {health ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div className="health-row">
                <span className="health-row-label">Data Peramalan</span>
                {getHealthBadge(health.forecast_data?.status)}
              </div>
              <div className="health-row">
                <span className="health-row-label">Status Pipeline</span>
                {getHealthBadge(health.pipeline?.status)}
              </div>
              <div className="health-row">
                <span className="health-row-label">Layer Cache</span>
                {getHealthBadge(health.cache_layer?.status)}
              </div>
              <div style={{ marginTop: 12, fontSize: 12, color: "var(--muted)" }}>
                <div>Cache: {health.cache_layer?.message}</div>
                <div>Status: {health.forecast_data?.message}</div>
              </div>
            </div>
          ) : (
            <div style={{ color: "var(--muted)", fontSize: 14 }}>Memuat data kesehatan...</div>
          )}
        </div>

        {/* Module 2: Database Stats */}
        <div className="sys-card">
          <h3 className="sys-card-title">
            <Database size={18} />
            Statistik Database
          </h3>
          {stats ? (
            <div className="metric-mini-grid">
              <div className="metric-mini-card">
                <span className="metric-mini-label">Total Users</span>
                <span className="metric-mini-value">{stats.total_users}</span>
              </div>
              <div className="metric-mini-card">
                <span className="metric-mini-label">Active Users</span>
                <span className="metric-mini-value">{stats.active_users}</span>
              </div>
              <div className="metric-mini-card">
                <span className="metric-mini-label">Harga Cabai</span>
                <span className="metric-mini-value">{stats.price_records}</span>
              </div>
              <div className="metric-mini-card">
                <span className="metric-mini-label">Prediksi</span>
                <span className="metric-mini-value">{stats.forecast_records}</span>
              </div>
            </div>
          ) : (
            <div style={{ color: "var(--muted)", fontSize: 14 }}>Memuat data statistik...</div>
          )}
        </div>

        {/* Module 3: Model Accuracy (Calculated on the fly) */}
        <div className="sys-card">
          <h3 className="sys-card-title">
            <Cpu size={18} />
            Akurasi Model (Kuantitatif)
          </h3>
          {accuracy ? (
            <div>
              <div className="metric-mini-grid" style={{ marginBottom: 12 }}>
                <div className="metric-mini-card">
                  <span className="metric-mini-label">MAE (Error Riil)</span>
                  <span className="metric-mini-value" style={{ fontSize: 15 }}>
                    {accuracy.n_points > 0 ? formatRp(accuracy.mae) : "-"}
                  </span>
                </div>
                <div className="metric-mini-card">
                  <span className="metric-mini-label">MAPE (Persentase)</span>
                  <span className="metric-mini-value" style={{ fontSize: 15 }}>
                    {accuracy.n_points > 0 ? `${(accuracy.mape * 100).toFixed(2)}%` : "-"}
                  </span>
                </div>
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)", textAlign: "center" }}>
                {accuracy.n_points > 0 ? (
                  <>Dihitung langsung dari <strong>{accuracy.n_points}</strong> titik data historis vs prediksi (Pasar Caringin).</>
                ) : (
                  <>Harga aktual untuk target forecast terbaru belum tersedia.</>
                )}
              </div>
            </div>
          ) : (
            <div style={{ color: "var(--muted)", fontSize: 14 }}>Memuat data akurasi...</div>
          )}
        </div>

        {/* Module 4: Directional Accuracy */}
        <div className="sys-card">
          <h3 className="sys-card-title">
            <Activity size={18} />
            Akurasi Arah Tren (DA)
          </h3>
          {accuracy ? (
            <div>
              <div className="metric-mini-grid" style={{ marginBottom: 12 }}>
                <div className="metric-mini-card" style={{ gridColumn: "span 2" }}>
                  <span className="metric-mini-label">Directional Accuracy</span>
                  <span className="metric-mini-value" style={{ fontSize: 24, color: "var(--primary)" }}>{(accuracy.da * 100).toFixed(2)}%</span>
                </div>
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)", textAlign: "center" }}>
                Ketepatan model memprediksi naik/turunnya harga cabai dibanding minggu sebelumnya.
              </div>
            </div>
          ) : (
            <div style={{ color: "var(--muted)", fontSize: 14 }}>Memuat data DA...</div>
          )}
        </div>
      </div>

      <div className="admin-sys-grid" style={{ gridTemplateColumns: "1fr 1.5fr" }}>
        {/* Pipeline Control & Status Panel */}
        <div className="sys-card" style={{ display: "flex", flexDirection: "column" }}>
          <h3 className="sys-card-title">
            <Cpu size={18} />
            Kontrol & Monitor Pipeline
          </h3>

          {activeRun ? (
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--primary)" }}>RUN AKTIF #{activeRun.id}</span>
                <span style={{ fontSize: 11, color: "var(--muted)" }}>Triggered: {activeRun.trigger_type}</span>
              </div>
              <div className="pipeline-progress-container">
                {pipelineStages.map((stage) => {
                  const stageData = activeRun.stages[stage.key] || { status: "pending" };
                  const isCurrent = stageData.status === "running";
                  return (
                    <div className={`pipeline-stage-item ${stageData.status}`} key={stage.key}>
                      <span className="pipeline-stage-name" style={{ color: isCurrent ? "var(--primary)" : "inherit" }}>
                        {stage.label}
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {stageData.timestamp && (
                          <span className="pipeline-stage-time">{stageData.timestamp}</span>
                        )}
                        {renderStageIcon(stageData.status)}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--muted)" }}>
                <span>Durasi aktif:</span>
                <span>{activeRun.duration_seconds.toFixed(0)} dtk</span>
              </div>
            </div>
          ) : (
            <div style={{ padding: "16px 0", textAlign: "center", color: "var(--muted)", fontSize: 14, flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <Heart size={32} style={{ margin: "0 auto 10px auto", opacity: 0.3 }} />
              Pipeline saat ini diam (idle).
            </div>
          )}

          <button
            className="pipeline-run-btn"
            onClick={handleTriggerPipeline}
            disabled={runLoading || (activeRun && activeRun.status === "running")}
          >
            {runLoading ? (
              <>
                <RefreshCw size={16} className="spin" />
                Memulai...
              </>
            ) : activeRun && activeRun.status === "running" ? (
              <>
                <RefreshCw size={16} className="spin" />
                Pipeline Sedang Berjalan
              </>
            ) : (
              <>
                <Play size={16} />
                Jalankan Pipeline Manual
              </>
            )}
          </button>

          <div style={{ margin: "16px 0 8px 0", borderBottom: "1px solid rgba(0,0,0,0.06)" }}></div>
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>20 Eksekusi Terakhir</span>
          
          <div className="recent-runs-list">
            {recentRuns.length === 0 ? (
              <div style={{ fontSize: 12, color: "var(--muted)", padding: "10px 0" }}>Belum ada riwayat eksekusi.</div>
            ) : (
              recentRuns.map((run) => (
                <div className="recent-run-item" key={run.id}>
                  <div className="recent-run-meta">
                    <span style={{ fontWeight: 600 }}>Run #{run.id} ({run.trigger_type})</span>
                    <span style={{ fontSize: 10, color: "var(--muted)" }}>Target: {run.run_date}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {run.status === "success" ? (
                      <span className="health-badge healthy" style={{ fontSize: 9 }}>Sukses</span>
                    ) : (
                      <span className="health-badge critical" style={{ fontSize: 9 }} title={run.error_message}>Gagal</span>
                    )}
                    <span style={{ fontSize: 11, color: "var(--muted)" }}>
                      {run.duration_seconds ? `${run.duration_seconds.toFixed(0)}s` : "-"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Prediction vs Actual Chart */}
        <div className="chart-container" style={{ display: "flex", flexDirection: "column" }}>
          <div className="chart-header">
            <h4 className="chart-title">Audit Prediksi vs Harga Pasar</h4>
            <span className="context-badge">Cabai Rawit Merah · Caringin</span>
          </div>

          <div style={{ flex: 1, minHeight: 300, position: "relative" }}>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.04)" />
                  <XAxis dataKey="date" stroke="var(--muted)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis
                    stroke="var(--muted)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    domain={["auto", "auto"]}
                    tickFormatter={(v) => `${v / 1000}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "rgba(255, 255, 255, 0.95)",
                      border: "1px solid var(--card-border)",
                      borderRadius: "10px",
                      boxShadow: "0 4px 20px rgba(0,0,0,0.08)"
                    }}
                    formatter={formatAuditTooltip}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  <Line
                    name="Harga Aktual"
                    type="monotone"
                    dataKey="Harga Aktual"
                    stroke="#2a4535"
                    strokeWidth={2.5}
                    dot={{ r: 4, strokeWidth: 0, fill: "#2a4535" }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    name="Harga Proyeksi"
                    type="monotone"
                    dataKey="Harga Proyeksi"
                    stroke="#dc2626"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={{ r: 3, strokeWidth: 0, fill: "#dc2626" }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--muted)", fontSize: 14 }}>
                Belum ada data perbandingan audit.
              </div>
            )}
          </div>
          <div style={{ marginTop: 12, fontSize: 11, color: "var(--muted)", textAlign: "center" }}>
            {accuracy?.n_points > 0
              ? "Membandingkan nilai proyeksi model 1 minggu ke depan vs realisasi harga pasar yang diinput PIHPS."
              : "Menampilkan proyeksi terbaru; harga aktual PIHPS akan muncul saat tanggal target tersedia."}
          </div>
        </div>
      </div>
    </div>
  );
}
