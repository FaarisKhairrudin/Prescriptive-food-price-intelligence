import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, Loader2, Plus, MessageSquare, Clock } from "lucide-react";
import { QUICK_QUESTIONS } from "../utils/constants";
import { MarkdownText } from "../components/ForecastCard";
import { formatDate } from "../utils/helpers";
import { useAppContext } from "../context/AppContext";

export function KonsultasiPage() {
  const { payload, profile, token } = useAppContext();
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState("idle");
  const messagesEndRef = useRef(null);

  // Chat History Logic
  const [sessions, setSessions] = useState(() => {
    const s = localStorage.getItem("narapangan:chat_sessions");
    return s ? JSON.parse(s) : [];
  });
  const [currentSessionId, setCurrentSessionId] = useState(Date.now());

  useEffect(() => {
    if (messages.length > 0) {
      setSessions((prev) => {
        const exists = prev.find((s) => s.id === currentSessionId);
        const title = messages[0]?.text.slice(0, 30) + (messages[0]?.text.length > 30 ? "..." : "");
        const updated = exists
          ? prev.map((s) => (s.id === currentSessionId ? { ...s, messages, updatedAt: Date.now() } : s))
          : [{ id: currentSessionId, title, messages, updatedAt: Date.now() }, ...prev];
        localStorage.setItem("narapangan:chat_sessions", JSON.stringify(updated));
        return updated;
      });
    }
  }, [messages, currentSessionId]);

  function loadSession(id) {
    const s = sessions.find((x) => x.id === id);
    if (s) {
      setMessages(s.messages);
      setCurrentSessionId(s.id);
    }
  }

  function deleteSession(e, id) {
    e.stopPropagation();
    const updated = sessions.filter((s) => s.id !== id);
    setSessions(updated);
    localStorage.setItem("narapangan:chat_sessions", JSON.stringify(updated));
    if (id === currentSessionId) {
      setMessages([]);
      setCurrentSessionId(Date.now());
    }
  }

  function clearChat() {
    setMessages([]);
    setCurrentSessionId(Date.now());
    setStatus("idle");
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e) {
    e.preventDefault();
    const q = question.trim();
    if (!q) return;

    setMessages((prev) => [...prev, { role: "user", text: q }]);
    setQuestion("");
    setStatus("running");

    try {
      const chatHistory = messages.slice(-8).map((m) => ({ role: m.role, text: m.text }));
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          payload,
          question: q,
          business_profile: profile,
          chat_history: chatHistory,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.error || "Konsultasi gagal.");
      setMessages((prev) => [...prev, { role: "assistant", text: data.reply, source: data.source }]);
      setStatus("done");
    } catch (err) {
      setMessages((prev) => [...prev, { role: "assistant", text: `Maaf, konsultasi AI sedang gagal. ${err.message}`, source: "error" }]);
      setStatus("error");
    }
  }

  const summary = payload?.summary;
  const greeting = summary
    ? `Selamat siang, [User]. Berdasarkan prediksi minggu ini, harga cabai rawit merah di Bandung diperkirakan ${summary.pct_change_avg >= 0 ? "naik" : "turun"} ${Math.abs(summary.pct_change_avg).toFixed(1)}% pekan depan. Ada yang ingin Anda diskusikan?`
    : "Selamat siang! Jalankan prediksi terlebih dahulu agar saya bisa memberikan saran yang lebih akurat.";

  function formatTimeAgo(ts) {
    if (!ts) return "";
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Baru saja";
    if (mins < 60) return `${mins} menit lalu`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} jam lalu`;
    const days = Math.floor(hours / 24);
    return `${days} hari lalu`;
  }

  return (
    <div className="chat-page">
      <aside className="chat-sidebar-panel">
        <button className="new-chat-btn" onClick={clearChat}>
          <Plus size={16} />
          <span>Pesan Baru</span>
        </button>

        {/* Quick Questions Section */}
        <div className="chat-sidebar-section">
          <div className="chat-sidebar-section-title">PERTANYAAN CEPAT</div>
          <div className="quick-questions-grid">
            {QUICK_QUESTIONS.map((q) => (
              <button key={q} className="quick-chip" onClick={() => setQuestion(q)}>
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="chat-sidebar-divider" />

        {/* Chat History Section */}
        <div className="chat-sidebar-section history-section">
          <div className="chat-sidebar-section-title">
            <Clock size={12} />
            RIWAYAT PERCAKAPAN
          </div>
          <div className="chat-history-list">
            {sessions.length > 0 ? (
              sessions.map((s) => (
                <div
                  key={s.id}
                  className={`chat-history-card ${s.id === currentSessionId ? "active" : ""}`}
                  onClick={() => loadSession(s.id)}
                >
                  <div className="chat-history-card-icon">
                    <MessageSquare size={14} />
                  </div>
                  <div className="chat-history-card-content">
                    <div className="chat-history-card-title">{s.title}</div>
                    <div className="chat-history-card-meta">
                      {s.messages?.length || 0} pesan · {formatTimeAgo(s.updatedAt || s.id)}
                    </div>
                  </div>
                  <button
                    className="chat-history-card-delete"
                    onClick={(e) => deleteSession(e, s.id)}
                    title="Hapus"
                  >×</button>
                </div>
              ))
            ) : (
              <div className="chat-history-empty">
                <MessageSquare size={20} />
                <span>Belum ada riwayat percakapan</span>
              </div>
            )}
          </div>
        </div>
      </aside>

      <div className="chat-main-panel">
        <div className="chat-panel-header">
          <h3 className="chat-panel-title">Percakapan</h3>
          <span className="context-badge">
            <span className="context-badge-dot"></span>
            Konteks Aktif: Bandung ({formatDate(new Date().toISOString())})
          </span>
        </div>
        <div className="chat-messages">
          {messages.length === 0 ? (
            <div className="chat-bubble assistant">
              <span className="chat-speaker">
                <Sparkles size={12} className="ai-chat-speaker-icon" /> AI Narapangan
              </span>
              <MarkdownText text={greeting} />
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={`chat-msg-${i}`} className={`chat-bubble ${m.role}`}>
                <span className="chat-speaker">
                  {m.role === "user" ? (
                    "Anda"
                  ) : (
                    <><Sparkles size={12} className="ai-chat-speaker-icon" /> AI Narapangan</>
                  )}
                </span>
                <MarkdownText text={m.text} />
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <form className="chat-form" onSubmit={handleSend}>
          <input
            className="chat-input"
            placeholder="Tanya strategi pengadaan cabai…"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
          <button className="chat-send-btn" type="submit" disabled={status === "running"}>
            {status === "running" ? <Loader2 className="spin" size={18} /> : <Send size={18} />}
          </button>
        </form>
      </div>
    </div>
  );
}
