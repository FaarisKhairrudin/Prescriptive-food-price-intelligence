import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";

export function OnboardingTour() {
  const [step, setStep] = useState(1);
  const { profile, setProfile, saveProfile, isOnboardingOpen, setIsOnboardingOpen } = useAppContext();
  const navigate = useNavigate();

  useEffect(() => {
    if (isOnboardingOpen && step === 6) {
      saveProfile(profile);
    }
  }, [step, isOnboardingOpen]);

  if (!isOnboardingOpen) return null;

  function updateField(field, value) {
    setProfile((prev) => ({ ...prev, [field]: value }));
  }

  function handleFinish() {
    localStorage.setItem("narapangan:v2:onboarding_completed", "true");
    setIsOnboardingOpen(false);
    navigate("/dashboard/prediksi");
  }

  const stepsCount = 6;

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-modal">
        <div className="onboarding-header">
          <h2 className="onboarding-title">
            {step === 1 && "Selamat Datang di Narapangan!"}
            {step === 2 && "Profil Bisnis Anda"}
            {step === 3 && "Kebutuhan Cabai"}
            {step === 4 && "Manajemen Stok"}
            {step === 5 && "Preferensi Belanja"}
            {step === 6 && "Setup Selesai!"}
          </h2>
          <span className="onboarding-step">
            Langkah {step} dari {stepsCount}
          </span>
        </div>

        <div className="onboarding-body">
          {step === 1 && (
            <p style={{ lineHeight: 1.6 }}>
              Aplikasi ini membantu Anda merencanakan pengadaan cabai dengan prediksi harga yang cerdas. Mari kita atur profil UMKM Anda agar rekomendasi dari AI semakin akurat!
            </p>
          )}

          {step === 2 && (
            <div className="settings-field" style={{ width: "100%" }}>
              <span>Jenis usaha (contoh: Seblak, Warung Nasi)</span>
              <input
                placeholder="Jenis usaha..."
                value={profile.business_type || ""}
                onChange={(e) => updateField("business_type", e.target.value)}
                autoFocus
              />
            </div>
          )}

          {step === 3 && (
            <div className="settings-field" style={{ width: "100%" }}>
              <span>Berapa pemakaian cabai rata-rata per hari? (kg/hari)</span>
              <input
                type="number"
                min="0"
                step="0.1"
                placeholder="contoh: 1.5 atau 3"
                value={profile.daily_usage_kg || ""}
                onChange={(e) => updateField("daily_usage_kg", e.target.value)}
                autoFocus
              />
            </div>
          )}

          {step === 4 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div className="settings-field" style={{ width: "100%" }}>
                <span>Stok saat ini cukup untuk berapa hari?</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="contoh: 3"
                  value={profile.stock_days || ""}
                  onChange={(e) => updateField("stock_days", e.target.value)}
                  autoFocus
                />
              </div>
              <div className="settings-field" style={{ width: "100%" }}>
                <span>Kapasitas penyimpanan maksimal (kg)</span>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="contoh: 10"
                  value={profile.storage_capacity_kg || ""}
                  onChange={(e) => updateField("storage_capacity_kg", e.target.value)}
                />
              </div>
            </div>
          )}

          {step === 5 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div className="settings-field" style={{ width: "100%" }}>
                <span>Gaya belanja</span>
                <select
                  value={profile.buying_style || "Aman stok"}
                  onChange={(e) => updateField("buying_style", e.target.value)}
                >
                  <option>Aman stok</option>
                  <option>Hemat cashflow</option>
                  <option>Agresif stok saat murah</option>
                </select>
              </div>
              <div className="settings-field" style={{ width: "100%" }}>
                <span>Fleksibilitas Harga Menu</span>
                <select
                  value={profile.can_adjust_price || "Sulit naik harga"}
                  onChange={(e) => updateField("can_adjust_price", e.target.value)}
                >
                  <option>Sulit naik harga</option>
                  <option>Bisa naik sedikit</option>
                  <option>Fleksibel ikut pasar</option>
                </select>
              </div>
            </div>
          )}

          {step === 6 && (
            <div style={{ lineHeight: 1.6 }}>
              <div className="onboarding-summary-card" style={{
                background: "rgba(197, 230, 54, 0.08)",
                border: "1px solid rgba(197, 230, 54, 0.2)",
                padding: "16px",
                borderRadius: "12px",
                marginBottom: "16px"
              }}>
                <h4 style={{ margin: "0 0 10px 0", color: "var(--ink)", fontWeight: 700 }}>Ringkasan Profil Bisnis:</h4>
                <ul style={{ margin: 0, paddingLeft: "20px", color: "var(--body)" }}>
                  <li><strong>Jenis Usaha:</strong> {profile.business_type || "-"}</li>
                  <li><strong>Pemakaian Harian:</strong> {profile.daily_usage_kg || "0"} Kg/Hari</li>
                  <li><strong>Kapasitas Penyimpanan:</strong> {profile.storage_capacity_kg || "0"} Kg</li>
                  <li><strong>Gaya Belanja:</strong> {profile.buying_style || "Aman stok"}</li>
                </ul>
              </div>
              <p style={{ margin: 0, color: "var(--body)", fontSize: "13px" }}>
                <strong>Bagaimana rekomendasi dihitung?</strong><br />
                Sistem membandingkan proyeksi tren harga pasar Caringin dengan pemakaian harian ({profile.daily_usage_kg || 0} Kg) dan kapasitas penyimpanan ({profile.storage_capacity_kg || 0} Kg) untuk menghitung kuantitas pembelian optimal di setiap minggu secara otomatis.
              </p>
            </div>
          )}
        </div>

        <div className="onboarding-footer">
          <button className="onboarding-btn skip" onClick={handleFinish}>
            Lewati
          </button>
          
          <div style={{ display: "flex", gap: "10px" }}>
            {step > 1 && (
              <button className="onboarding-btn prev" onClick={() => setStep((s) => s - 1)}>
                Sebelumnya
              </button>
            )}
            
            {step < stepsCount ? (
              <button className="onboarding-btn next" onClick={() => setStep((s) => s + 1)}>
                Lanjut
              </button>
            ) : (
              <button className="onboarding-btn finish" onClick={handleFinish} style={{
                animation: "pulse 2s infinite"
              }}>
                Mulai Rencana Pengadaan
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
