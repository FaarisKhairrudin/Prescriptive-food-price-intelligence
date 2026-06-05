import { useState, useEffect } from "react";
import { Loader2, CheckCircle2, Circle } from "lucide-react";

const STEPS = [
  {
    title: "Menghubungkan ke PIHPS...",
    desc: "Mengakses database Panel Informasi Harga Pangan Strategis Nasional",
  },
  {
    title: "Mengunduh data harga pasar",
    desc: "Mengambil harga cabai rawit merah terbaru dari Pasar Bandung",
  },
  {
    title: "Mempersiapkan dataset",
    desc: "Mengolah fitur ekonomi, kalender, dan musiman sebagai input model",
  },
  {
    title: "Menjalankan model NBEATSx",
    desc: "Memprediksi harga 4 minggu ke depan dengan neural network",
  },
  {
    title: "Menganalisis tren & risiko",
    desc: "Menghitung pergerakan harga dan menentukan sinyal pengadaan",
  },
  {
    title: "Menyusun rekomendasi",
    desc: "Memformulasikan strategi stok optimal untuk UMKM Anda",
  },
];

export function InteractiveLoader() {
  const [pct, setPct] = useState(0);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPct((p) => {
        if (p >= 95) return p;
        const inc = p < 30 ? 4 : p < 60 ? 3 : p < 85 ? 1.5 : 0.3;
        return Math.min(95, p + inc);
      });
    }, 400);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((s) => Math.min(STEPS.length - 1, s + 1));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="loading-overlay">
      <div className="loader-header">
        <Loader2 className="spin" size={28} style={{ color: "var(--lime)" }} />
        <div>
          <div className="loader-msg">{STEPS[activeStep].title}</div>
          <div className="loader-pct">{Math.floor(pct)}% Selesai</div>
        </div>
      </div>

      <div className="loader-progress-bar">
        <div className="loader-progress-fill" style={{ width: `${pct}%` }} />
      </div>

      <div className="loader-steps">
        {STEPS.map((step, i) => (
          <div
            key={i}
            className={`loader-step ${i < activeStep ? "done" : i === activeStep ? "active" : "pending"}`}
          >
            <div className="loader-step-icon">
              {i < activeStep ? (
                <CheckCircle2 size={18} />
              ) : i === activeStep ? (
                <Loader2 size={18} className="spin" />
              ) : (
                <Circle size={18} />
              )}
            </div>
            <div className="loader-step-text">
              <div className="loader-step-title">{step.title}</div>
              <div className="loader-step-desc">{step.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
