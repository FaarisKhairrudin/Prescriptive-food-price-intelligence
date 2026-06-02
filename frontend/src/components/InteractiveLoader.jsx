import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

export function InteractiveLoader() {
  const [pct, setPct] = useState(0);
  const [msgIdx, setMsgIdx] = useState(0);

  const messages = [
    "Menghubungkan ke server AI...",
    "Memuat model prediksi v2.4...",
    "Mengambil harga pasar terbaru...",
    "Menghitung probabilitas pergerakan...",
    "Menyusun rekomendasi strategi stok...",
    "Finalisasi hasil prediksi..."
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setPct(p => {
        if (p >= 95) return p;
        const inc = p < 50 ? 5 : (p < 80 ? 2 : 0.5);
        return Math.min(95, p + inc);
      });
    }, 500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const msgInterval = setInterval(() => {
      setMsgIdx(i => Math.min(messages.length - 1, i + 1));
    }, 3000);
    return () => clearInterval(msgInterval);
  }, [messages.length]);

  return (
    <div className="loading-overlay">
      <Loader2 className="spin" size={32} style={{ color: "var(--lime)" }} />
      <div className="loader-text-wrap">
        <div className="loader-msg">{messages[msgIdx]}</div>
        <div className="loader-pct">{Math.floor(pct)}% Selesai</div>
      </div>
      <div className="loader-progress-bar">
        <div className="loader-progress-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
