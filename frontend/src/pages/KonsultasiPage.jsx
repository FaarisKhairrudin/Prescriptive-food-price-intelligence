import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, Loader2, Plus, MessageSquare, Clock } from "lucide-react";
import { QUICK_QUESTIONS } from "../utils/constants";
import { MarkdownText } from "../components/ForecastCard";
import { formatDate } from "../utils/helpers";
import { useAppContext } from "../context/AppContext";

export function KonsultasiPage() {
  const { payload, profile, token, user } = useAppContext();
  const userName = profile?.business_type || (user?.email ? user.email.split("@")[0] : "Pemilik Usaha");
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState("idle");
  const messagesEndRef = useRef(null);

  // Chat History Logic
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);

  useEffect(() => {
    if (token) {
      fetchSessions();
    }
  }, [token]);

  async function fetchSessions() {
    try {
      const res = await fetch("/api/chat/sessions", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
        if (data.sessions && data.sessions.length > 0) {
          if (!currentSessionId) {
            setMessages(data.sessions[0].messages);
            setCurrentSessionId(data.sessions[0].id);
          } else {
            const cur = data.sessions.find(s => s.id === currentSessionId);
            if (cur) setMessages(cur.messages);
          }
        } else if (!currentSessionId) {
          setCurrentSessionId(Date.now().toString());
        }
      }
    } catch (err) {
      console.error("Gagal memuat sesi chat:", err);
    }
  }

  function loadSession(id) {
    const s = sessions.find((x) => x.id === id);
    if (s) {
      setMessages(s.messages);
      setCurrentSessionId(s.id);
    }
  }

  async function deleteSession(e, id) {
    e.stopPropagation();
    try {
      const res = await fetch("/api/chat/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ session_id: id })
      });
      if (res.ok) {
        setSessions((prev) => prev.filter((s) => s.id !== id));
        if (id === currentSessionId) {
          setMessages([]);
          setCurrentSessionId(Date.now().toString());
        }
      }
    } catch (err) {
      console.error("Gagal menghapus sesi chat:", err);
    }
  }

  function clearChat() {
    setMessages([]);
    setCurrentSessionId(Date.now().toString());
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
          session_id: currentSessionId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.error || "Konsultasi gagal.");
      setMessages((prev) => [...prev, { role: "assistant", text: data.reply, source: data.source }]);
      setStatus("done");
      fetchSessions();
    } catch (err) {
      setMessages((prev) => [...prev, { role: "assistant", text: `Maaf, konsultasi AI sedang gagal. ${err.message}`, source: "error" }]);
      setStatus("error");
    }
  }

  const summary = payload?.summary;
  const greeting = summary
    ? `Selamat siang, ${userName}. Berdasarkan prediksi minggu ini, harga cabai rawit merah di Bandung diperkirakan ${summary.pct_change_avg >= 0 ? "naik" : "turun"} ${Math.abs(summary.pct_change_avg).toFixed(1)}% pekan depan. Ada yang ingin Anda diskusikan?`
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
