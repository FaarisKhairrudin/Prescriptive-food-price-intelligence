import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, Loader2 } from "lucide-react";
import { MarkdownText } from "./ForecastCard";
import { QUICK_QUESTIONS } from "../utils/constants";
import { useAppContext } from "../context/AppContext";

export function AIConsultSection({ payload, businessProfile }) {
  const { token, user } = useAppContext();
  const userName = businessProfile?.business_type || (user?.email ? user.email.split("@")[0] : "Pemilik Usaha");
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState("idle");
  const messagesEndRef = useRef(null);

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
          business_profile: businessProfile,
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
  const commodityName = payload?.commodity?.display_name || payload?.summary?.commodity || "Cabai Rawit Merah";
  const pctText = summary ? `${Math.abs(summary.pct_change_avg).toFixed(1)}%` : "";
  const greeting = summary
    ? `Selamat siang, ${userName}. Berdasarkan prediksi minggu ini, harga ${commodityName.toLowerCase()} di Bandung diperkirakan ${summary.pct_change_avg >= 0 ? "naik" : "turun"} ${pctText} pekan depan. Ada yang ingin Anda diskusikan?`
    : "Selamat siang! Jalankan prediksi terlebih dahulu agar saya bisa membantu Anda.";

  return (
    <section className="ai-section">
      <div className="ai-grid">
        <div className="ai-info">
          <div className="ai-assistant-badge">
            <Sparkles size={14} className="ai-assistant-icon" />
            <span className="ai-assistant-text">AI ASSISTANT</span>
          </div>
          <h3 className="ai-info-title">Konsultasi AI Narapangan</h3>
          <p className="ai-info-desc">
            Tanyakan apa saja tentang strategi pengadaan, anggaran, dan risiko pasar untuk UMKM Anda.
          </p>
          <div className="quick-label">PERTANYAAN CEPAT</div>
          <div className="quick-list">
            {QUICK_QUESTIONS.map((q) => (
              <button key={q} className="quick-btn" onClick={() => setQuestion(q)}>{q}</button>
            ))}
          </div>
        </div>

        <div className="ai-chat-preview">
          <div className="ai-chat-messages">
            {messages.length === 0 ? (
              <div className="ai-chat-bubble assistant">
                <span className="ai-chat-speaker">
                  <Sparkles size={12} className="ai-chat-speaker-icon" /> AI Narapangan
                </span>
                <MarkdownText text={greeting} />
              </div>
            ) : (
              messages.map((m, i) => (
                <div key={`ai-msg-${i}`} className={`ai-chat-bubble ${m.role}`}>
                  <span className="ai-chat-speaker">
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
          <form className="ai-chat-form" onSubmit={handleSend}>
            <input
              className="ai-chat-input"
              placeholder={`Tanya strategi stok ${commodityName.toLowerCase()}…`}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
            <button className="ai-send-btn" type="submit" disabled={status === "running"}>
              {status === "running" ? <Loader2 className="spin" size={16} /> : <Send size={16} />}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
