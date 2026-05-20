import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CloudSun,
  DatabaseZap,
  LineChart as LineChartIcon,
  Loader2,
  MessageCircle,
  RefreshCw,
  Send,
  ShoppingBasket,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useMemo, useState } from "react";

const LAST_PAYLOAD_KEY = "narapangan:v2:last-prediction";
const PREVIOUS_PAYLOAD_KEY = "narapangan:v2:previous-prediction";
const CHART_COLORS = {
  grid: "#ded2c0",
  actual: "#3f6257",
  forecast: "#9f5a43",
  forecastFill: "#b5812d",
  tooltipBorder: "#ded2c0",
  tooltipShadow: "0 18px 50px rgba(38, 52, 47, 0.12)",
};
const DEFAULT_BUSINESS_PROFILE = {
  business_type: "",
  daily_usage_kg: "",
  stock_days: "",
  storage_capacity_kg: "",
  buying_style: "Aman stok",
  can_adjust_price: "Sulit naik harga",
};

function readStoredPayload(key) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeStoredPayload(key, value) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function formatCurrency(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatDate(value, options = { day: "2-digit", month: "short" }) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", options).format(new Date(value));
}

function formatDateTime(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatSigned(value) {
  const number = Number(value || 0);
  const sign = number > 0 ? "+" : "";
  return `${sign}${number.toFixed(2)}%`;
}

function buildChartData(payload) {
  const history = payload.history.map((row) => ({
    date: row.ds,
    label: formatDate(row.ds),
    actual: row.actual_price,
    forecast: null,
  }));

  const lastActual = payload.history[payload.history.length - 1];
  const bridge = {
    date: lastActual.ds,
    label: formatDate(lastActual.ds),
    actual: lastActual.actual_price,
    forecast: lastActual.actual_price,
  };

  const forecast = payload.forecast.map((row) => ({
    date: row.ds,
    label: formatDate(row.ds),
    actual: null,
    forecast: row.predicted_price,
  }));

  return [...history.slice(0, -1), bridge, ...forecast];
}

function signalIcon(signalCode) {
  if (signalCode === "stock_early") return <TrendingUp size={22} />;
  if (signalCode === "hold_purchase") return <TrendingDown size={22} />;
  return <CheckCircle2 size={22} />;
}

function renderInlineMarkdown(text, keyPrefix) {
  const parts = String(text || "").split(/(\*\*[^*\n]+?\*\*|\*[^*\n]+?\*)/g);

  return parts.map((part, index) => {
    const key = `${keyPrefix}-${index}`;
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={key}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

function MarkdownText({ text }) {
  const lines = String(text || "").split("\n");

  return (
    <p className="markdown-text">
      {lines.map((line, index) => (
        <span className="markdown-line" key={`line-${index}`}>
          {renderInlineMarkdown(line, `line-${index}`)}
          {index < lines.length - 1 ? <br /> : null}
        </span>
      ))}
    </p>
  );
}

function MetricCard({ label, value, detail, icon }) {
  return (
    <section className="metric-card">
      <div className="metric-icon">{icon}</div>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        {detail ? <span>{detail}</span> : null}
      </div>
    </section>
  );
}

function ModelStep({ icon, title, children }) {
  return (
    <article className="model-step">
      <div className="model-step-icon">{icon}</div>
      <div>
        <strong>{title}</strong>
        <p>{children}</p>
      </div>
    </article>
  );
}

function ProfileField({ label, children }) {
  return (
    <label className="profile-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function BusinessProfileForm({ profile, onChange }) {
  function updateField(field, value) {
    onChange({
      ...profile,
      [field]: value,
    });
  }

  return (
    <div className="profile-card">
      <div className="profile-card-heading">
        <MessageCircle size={20} />
        <div>
          <strong>Profil singkat UMKM</strong>
          <span>Opsional. Isi estimasi kasar saja agar jawaban AI lebih personal.</span>
        </div>
      </div>

      <div className="profile-grid">
        <ProfileField label="Jenis usaha">
          <input
            placeholder="Seblak, ayam geprek, warung nasi"
            value={profile.business_type}
            onChange={(event) => updateField("business_type", event.target.value)}
          />
        </ProfileField>
        <ProfileField label="Pemakaian cabai per hari (kg/hari)">
          <input
            type="number"
            min="0"
            step="0.1"
            placeholder="contoh: 1.5 atau 3"
            value={profile.daily_usage_kg}
            onChange={(event) => updateField("daily_usage_kg", event.target.value)}
          />
        </ProfileField>
        <ProfileField label="Stok saat ini cukup untuk (hari)">
          <input
            type="number"
            min="0"
            step="1"
            placeholder="contoh: 3"
            value={profile.stock_days}
            onChange={(event) => updateField("stock_days", event.target.value)}
          />
        </ProfileField>
        <ProfileField label="Kapasitas simpan cabai (kg)">
          <input
            type="number"
            min="0"
            step="0.5"
            placeholder="contoh: 10"
            value={profile.storage_capacity_kg}
            onChange={(event) => updateField("storage_capacity_kg", event.target.value)}
          />
        </ProfileField>
        <ProfileField label="Gaya belanja">
          <select
            value={profile.buying_style}
            onChange={(event) => updateField("buying_style", event.target.value)}
          >
            <option>Aman stok</option>
            <option>Hemat cashflow</option>
            <option>Agresif stok saat murah</option>
          </select>
        </ProfileField>
        <ProfileField label="Harga menu">
          <select
            value={profile.can_adjust_price}
            onChange={(event) => updateField("can_adjust_price", event.target.value)}
          >
            <option>Sulit naik harga</option>
            <option>Bisa naik sedikit</option>
            <option>Fleksibel ikut pasar</option>
          </select>
        </ProfileField>
      </div>
    </div>
  );
}

function StoredPredictionCard({ savedPayload, onOpen }) {
  if (!savedPayload) return null;

  const summary = savedPayload.summary;
  return (
    <aside className="stored-card">
      <span>Prediksi terakhir tersimpan</span>
      <h3>{summary.signal_label}</h3>
      <p>
        Rata-rata {formatCurrency(summary.avg_predicted_price)}/kg, berubah{" "}
        {formatSigned(summary.pct_change_avg)} dari harga terakhir.
      </p>
      <div className="stored-meta">
        <CalendarDays size={16} />
        <span>{formatDateTime(savedPayload.saved_at)}</span>
      </div>
      <button className="ghost-button" type="button" onClick={onOpen}>
        Lihat hasil tersimpan
        <ChevronRight size={17} />
      </button>
    </aside>
  );
}

function ConsultationPanel({ payload, businessProfile }) {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState("idle");

  async function askQuestion(event) {
    event.preventDefault();
    const cleanQuestion = question.trim();
    if (!cleanQuestion) return;

    setMessages((items) => [...items, { role: "user", text: cleanQuestion }]);
    setQuestion("");
    setStatus("running");

    try {
      const chatHistory = messages.slice(-8).map((item) => ({
        role: item.role,
        text: item.text,
      }));
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payload,
          question: cleanQuestion,
          business_profile: businessProfile,
          chat_history: chatHistory,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || data.error || "Konsultasi gagal.");
      }

      setMessages((items) => [
        ...items,
        { role: "assistant", text: data.reply, source: data.source },
      ]);
      setStatus("done");
    } catch (err) {
      setMessages((items) => [
        ...items,
        {
          role: "assistant",
          text: `Maaf, konsultasi AI sedang gagal. ${err.message}`,
          source: "error",
        },
      ]);
      setStatus("error");
    }
  }

  const quickQuestions = [
    "Kalau stok saya cuma cukup 3 hari, beli berapa kg?",
    "Minggu mana yang paling berisiko buat belanja cabai?",
    "Kalau modal terbatas, strategi belanjanya gimana?",
  ];

  return (
    <section className="consult-panel" id="konsultasi-ai">
      <div className="panel-heading compact">
        <div>
          <span>Konsultasi AI</span>
          <h2>Tanya strategi belanja cabai.</h2>
        </div>
        <MessageCircle size={22} />
      </div>
      <p>
        Setelah forecast keluar, kamu bisa bertanya sesuai kondisi usaha. AI
        akan memakai hasil prediksi, profil UMKM, dan sinyal pengadaan terbaru.
      </p>
      <p className="chat-disclaimer">
        Jawaban AI berbasis hasil prediksi dan profil yang kamu isi. Gunakan
        sebagai bahan bantu pertimbangan, bukan kepastian harga pasar.
      </p>

      <div className="quick-question-label">Contoh pertanyaan</div>
      <div className="quick-questions">
        {quickQuestions.map((item) => (
          <button key={item} type="button" onClick={() => setQuestion(item)}>
            {item}
          </button>
        ))}
      </div>

      <div className="chat-thread">
        {messages.length === 0 ? (
          <div className="chat-empty">
            Isi profil UMKM di atas, lalu tanyakan skenario belanja yang ingin
            kamu simulasikan.
          </div>
        ) : (
          messages.map((item, index) => (
            <div className={`chat-bubble ${item.role}`} key={`${item.role}-${index}`}>
              <span className="chat-speaker">
                {item.role === "user" ? "Kamu" : "AI Narapangan"}
              </span>
              <MarkdownText text={item.text} />
              {item.source === "rule_based" || item.source === "rate_limited" ? (
                <small>
                  {item.source === "rate_limited"
                    ? "Fallback karena kuota Gemini sedang penuh"
                    : "Fallback tanpa Gemini API"}
                </small>
              ) : null}
            </div>
          ))
        )}
      </div>

      <form className="chat-form" onSubmit={askQuestion}>
        <input
          placeholder="Tanya contoh: saya jualan seblak, stok aman berapa hari?"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
        />
        <button type="submit" disabled={status === "running"}>
          {status === "running" ? <Loader2 className="spin" size={18} /> : <Send size={18} />}
          <span>Kirim</span>
        </button>
      </form>
    </section>
  );
}

function PredictionResults({ payload, previousPayload, businessProfile }) {
  const chartData = useMemo(() => buildChartData(payload), [payload]);
  const summary = payload.summary;
  const latestForecast = payload.forecast[0];
  const peakForecast = useMemo(
    () =>
      payload.forecast.reduce((peak, row) =>
        row.predicted_price > peak.predicted_price ? row : peak,
      ),
    [payload],
  );

  return (
    <section className="results-shell" id="hasil">
      <div className="section-heading wide">
        <span>Hasil analisis terbaru</span>
        <h2>AI selesai membaca data dan menyusun bahan pertimbangan.</h2>
        <p>
          Hasil ini menggabungkan harga mingguan Bandung, cuaca Garut yang
          tertunda efeknya, dan kalender Hijriah. Garis penuh adalah histori,
          garis putus-putus adalah proyeksi empat minggu ke depan, sehingga
          keputusan stok tetap perlu disesuaikan dengan kondisi usaha.
        </p>
      </div>

      <section className="result-hero">
        <aside className={`signal-panel signal-${summary.signal_tone}`}>
          <div className="signal-icon">{signalIcon(summary.signal_code)}</div>
          <span>Sinyal Pengadaan</span>
          <h2>{summary.signal_label}</h2>
          <p>{summary.recommendation}</p>
          <div className="signal-stat">
            <strong>{formatSigned(summary.pct_change_avg)}</strong>
            <span>rata-rata 4 minggu</span>
          </div>
        </aside>

        <div className="analyst-panel">
          <div className="panel-heading compact">
            <div>
              <span>{payload.explanation.title}</span>
              <h2>{payload.explanation.headline}</h2>
            </div>
            <Sparkles size={22} />
          </div>
          <p>{payload.explanation.body}</p>
          <div className="analysis-meta">
            {payload.explanation.source ? (
              <span className={`analysis-status source-${payload.explanation.source}`}>
                {payload.explanation.source === "gemini"
                  ? "Gemini aktif"
                  : payload.explanation.source === "rate_limited"
                    ? "Fallback sementara"
                    : "Insight lokal"}
              </span>
            ) : null}
            <span className="analysis-disclaimer">
              Estimasi prediksi, bukan kepastian pasar. Sesuaikan dengan stok, modal, dan pemasok.
            </span>
          </div>
          {payload.explanation.offer ? (
            <a
              className="ai-offer"
              href="#konsultasi-ai"
              aria-label="Buka konsultasi AI Narapangan"
            >
              <span className="ai-offer-icon">
                <MessageCircle size={18} />
              </span>
              <span className="ai-offer-copy">
                <strong>Tanya strategi stok di chat AI</strong>
                <small>{payload.explanation.offer}</small>
              </span>
              <ChevronRight className="ai-offer-arrow" size={20} />
            </a>
          ) : null}
        </div>
      </section>

      <section className="metric-grid">
        <MetricCard
          label="Harga terakhir"
          value={formatCurrency(summary.last_actual_price)}
          detail={summary.last_actual_date}
          icon={<ShoppingBasket size={20} />}
        />
        <MetricCard
          label="Rata-rata prediksi"
          value={formatCurrency(summary.avg_predicted_price)}
          detail={`${summary.horizon_weeks} minggu ke depan`}
          icon={<LineChartIcon size={20} />}
        />
        <MetricCard
          label="Prediksi minggu depan"
          value={formatCurrency(latestForecast.predicted_price)}
          detail={formatSigned(latestForecast.change_from_last_pct)}
          icon={<TrendingUp size={20} />}
        />
        <MetricCard
          label="Titik tertinggi"
          value={formatCurrency(peakForecast.predicted_price)}
          detail={formatDate(peakForecast.ds)}
          icon={<CloudSun size={20} />}
        />
      </section>

      <section className="content-grid">
        <section className="chart-panel">
          <div className="panel-heading">
            <div>
              <span>12 minggu histori dan 4 minggu proyeksi</span>
              <h2>Pergerakan harga cabai</h2>
            </div>
            <div className="legend-row">
              <span className="legend actual">Historis</span>
              <span className="legend forecast">Prediksi</span>
            </div>
          </div>

          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={350}>
              <ComposedChart data={chartData} margin={{ top: 18, right: 16, left: 0, bottom: 8 }}>
                <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={16} />
                <YAxis
                  tickFormatter={(value) => `${Math.round(value / 1000)}k`}
                  tickLine={false}
                  axisLine={false}
                  width={48}
                />
                <Tooltip
                  formatter={(value) => formatCurrency(value)}
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
        </section>

        <section className="forecast-panel">
          <div className="panel-heading">
            <div>
              <span>Rincian mingguan</span>
              <h2>Forecast harga</h2>
            </div>
          </div>

          <div className="forecast-table">
            {payload.forecast.map((row) => (
              <article className="forecast-row" key={row.ds}>
                <div>
                  <span>Minggu {row.week}</span>
                  <strong>{formatDate(row.ds)}</strong>
                </div>
                <div>
                  <span>Prediksi</span>
                  <strong>{formatCurrency(row.predicted_price)}</strong>
                </div>
                <div>
                  <span>Dari harga terakhir</span>
                  <strong className={row.change_from_last_pct >= 0 ? "up" : "down"}>
                    {formatSigned(row.change_from_last_pct)}
                  </strong>
                </div>
                <div className="holiday-cell">
                  {row.is_ramadan ? <span>Ramadan</span> : null}
                  {row.is_idul_fitri ? <span>Idul Fitri</span> : null}
                  {row.is_idul_adha ? <span>Idul Adha</span> : null}
                  {!row.is_ramadan && !row.is_idul_fitri && !row.is_idul_adha ? (
                    <span>Normal</span>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>

      <ConsultationPanel payload={payload} businessProfile={businessProfile} />
    </section>
  );
}

function App() {
  const [payload, setPayload] = useState(null);
  const [savedPayload, setSavedPayload] = useState(() => readStoredPayload(LAST_PAYLOAD_KEY));
  const [previousPayload, setPreviousPayload] = useState(() =>
    readStoredPayload(PREVIOUS_PAYLOAD_KEY),
  );
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [endDate, setEndDate] = useState("2026-05-20");
  const [showResults, setShowResults] = useState(false);
  const [businessProfile, setBusinessProfile] = useState(DEFAULT_BUSINESS_PROFILE);

  async function runPrediction() {
    setStatus("running");
    setError("");
    setShowResults(false);

    try {
      const response = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          end_date: endDate || null,
          business_profile: businessProfile,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || data.error || "Pipeline gagal berjalan.");
      }

      const currentSaved = savedPayload || payload;
      if (currentSaved) {
        setPreviousPayload(currentSaved);
        writeStoredPayload(PREVIOUS_PAYLOAD_KEY, currentSaved);
      }

      const enrichedPayload = {
        ...data,
        saved_at: new Date().toISOString(),
      };

      setPayload(enrichedPayload);
      setSavedPayload(enrichedPayload);
      writeStoredPayload(LAST_PAYLOAD_KEY, enrichedPayload);
      setShowResults(true);
      setStatus("done");

      requestAnimationFrame(() => {
        document.getElementById("hasil")?.scrollIntoView({ behavior: "smooth" });
      });
    } catch (err) {
      setError(err.message);
      setStatus("error");
    }
  }

  function openSavedPrediction() {
    if (!savedPayload) return;
    setPayload(savedPayload);
    if (savedPayload.business_profile) {
      setBusinessProfile({
        ...DEFAULT_BUSINESS_PROFILE,
        ...savedPayload.business_profile,
      });
    }
    setShowResults(true);
    requestAnimationFrame(() => {
      document.getElementById("hasil")?.scrollIntoView({ behavior: "smooth" });
    });
  }

  const isRunning = status === "running";
  const activePayload = showResults ? payload : null;

  return (
    <main className="app-shell">
      <header className="site-header">
        <div className="brand-lockup">
          <div className="brand-mark">N</div>
          <div>
            <strong>Narapangan</strong>
            <span>Prescriptive food price intelligence</span>
          </div>
        </div>
        <nav className="site-nav" aria-label="Navigasi utama">
          <a href="#cerita">Cerita</a>
          <a href="#model">Model</a>
          <a href="#prediksi">Prediksi</a>
        </nav>
      </header>

      <section className="landing-hero" id="cerita">
        <div className="hero-narrative">
          <span className="eyebrow">Untuk UMKM makanan di Bandung</span>
          <h1>Dari cuaca Garut ke keputusan belanja cabai minggu depan.</h1>
          <p>
            Harga cabai sering berubah sebelum pelaku usaha sempat menyesuaikan
            stok. Narapangan membaca data harga, cuaca produsen, dan momen
            kalender untuk membantu UMKM menentukan kapan perlu menahan,
            menormalkan, atau mempercepat pembelian.
          </p>
          <div className="hero-actions">
            <a className="primary-link" href="#prediksi">
              Coba Prediksi
              <ChevronRight size={18} />
            </a>
            <a className="secondary-link" href="#model">
              Lihat cara AI bekerja
            </a>
          </div>
        </div>

        <aside className="story-card">
          <div className="story-card-top">
            <Sparkles size={22} />
            <span>Analis Narapangan</span>
          </div>
          <p>
            Saya membantu UMKM membaca kemungkinan arah harga cabai beberapa
            minggu ke depan. Angka prediksi diubah menjadi cerita singkat agar
            keputusan stok, belanja, dan menu lebih mudah dipertimbangkan.
          </p>
          <div className="story-meter">
            <span>Harga</span>
            <span>Cuaca</span>
            <span>Hijriah</span>
            <span>Sinyal</span>
          </div>
        </aside>
      </section>

      <section className="model-section" id="model">
        <div className="section-heading">
          <span>Pipeline saat prediksi diklik</span>
          <h2>Dari data terbaru menjadi insight stok dalam beberapa langkah.</h2>
          <p>
            Saat tombol prediksi ditekan, Narapangan memakai model terbaik yang
            sudah dievaluasi tim. Model membaca data terbaru untuk memperkirakan
            harga empat minggu ke depan, lalu AI menjelaskan hasilnya dalam
            bahasa yang lebih dekat dengan kebutuhan UMKM.
          </p>
        </div>

        <div className="model-grid">
          <ModelStep icon={<DatabaseZap size={22} />} title="Perbarui data pasar">
            Sistem mengambil harga cabai rawit merah Bandung dan cuaca Garut
            sebagai konteks dari kota produsen.
          </ModelStep>
          <ModelStep icon={<CloudSun size={22} />} title="Susun konteks mingguan">
            Data dirapikan menjadi pola mingguan, termasuk jejak cuaca Garut
            sekitar 2 sampai 3 bulan sebelumnya.
          </ModelStep>
          <ModelStep icon={<CalendarDays size={22} />} title="Tambahkan kalender pasar">
            Ramadan, Idul Fitri, dan Idul Adha pada minggu prediksi ikut
            dibaca sebagai konteks perubahan permintaan.
          </ModelStep>
          <ModelStep icon={<LineChartIcon size={22} />} title="Jadikan insight UMKM">
            Model menghasilkan estimasi harga, lalu AI merangkumnya menjadi
            sinyal risiko dan bahan pertimbangan belanja.
          </ModelStep>
        </div>

        <div className="model-assurance">
          <div className="model-step-icon">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <strong>Model yang dipakai adalah pilihan terbaik tim Narapangan.</strong>
            <p>
              Sebelum masuk ke aplikasi, beberapa pendekatan prediksi
              dibandingkan oleh tim Narapangan. Model ini dipilih karena hasil
              evaluasinya paling baik dan stabil, lalu outputnya tetap dibaca
              sebagai estimasi untuk membantu keputusan UMKM.
            </p>
          </div>
        </div>
      </section>

      <section className="prediction-lab" id="prediksi">
        <div className="lab-copy">
          <span className="eyebrow">Coba pipeline hidup</span>
          <h2>Jalankan prediksi saat kamu siap melihat hasilnya.</h2>
          <p>
            Hasil tidak ditampilkan sebelum tombol ditekan. Saat prediksi baru
            selesai, hasil sebelumnya tetap disimpan di browser supaya kamu bisa
            membandingkan perubahan estimasi dari pembaruan data terakhir.
          </p>
          <div className="action-row">
            <label className="date-control">
              <span>Tanggal data akhir</span>
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </label>
            <button
              className="primary-button"
              type="button"
              onClick={runPrediction}
              disabled={isRunning}
            >
              {isRunning ? <Loader2 className="spin" size={18} /> : <RefreshCw size={18} />}
              <span>{isRunning ? "Menganalisis Data" : "Mulai Prediksi"}</span>
            </button>
          </div>
          <BusinessProfileForm
            profile={businessProfile}
            onChange={setBusinessProfile}
          />
          {error ? (
            <div className="error-banner">
              <AlertTriangle size={18} />
              <span>{error}</span>
            </div>
          ) : null}
        </div>

        <StoredPredictionCard savedPayload={savedPayload} onOpen={openSavedPrediction} />
      </section>

      {isRunning ? (
        <section className="loading-panel" aria-live="polite">
          <Loader2 className="spin" size={26} />
          <div>
            <strong>Pipeline sedang berjalan.</strong>
            <p>
              Narapangan sedang mengambil data, membaca jeda cuaca Garut,
              memanggil AI prediksi, lalu menyusun narasi keputusan.
            </p>
          </div>
        </section>
      ) : null}

      {activePayload ? (
        <PredictionResults
          payload={activePayload}
          previousPayload={previousPayload}
          businessProfile={businessProfile}
        />
      ) : null}
    </main>
  );
}

export default App;
