import { useState, useEffect } from "react";
import { useAppContext } from "../context/AppContext";

export function PengaturanPage() {
  const { profile, saveProfile, isLoading } = useAppContext();
  const [localProfile, setLocalProfile] = useState(profile);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (profile) {
      setLocalProfile(profile);
    }
  }, [profile]);

  function updateField(field, value) {
    setLocalProfile((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaveSuccess(false);
    const success = await saveProfile(localProfile);
    if (success) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  }

  return (
    <div className="page-container">
      <form onSubmit={handleSave}>
        <section className="settings-section">
          <h3 className="settings-title">Profil UMKM</h3>
          <div className="settings-grid">
            <label className="settings-field">
              <span>Jenis usaha</span>
              <input
                placeholder="Seblak, ayam geprek, warung nasi"
                value={localProfile.business_type || ""}
                onChange={(e) => updateField("business_type", e.target.value)}
              />
            </label>
            <label className="settings-field">
              <span>Pemakaian cabai per hari (kg/hari)</span>
              <input
                type="number"
                min="0"
                step="0.1"
                placeholder="contoh: 1.5 atau 3"
                value={localProfile.daily_usage_kg || ""}
                onChange={(e) => updateField("daily_usage_kg", e.target.value)}
              />
            </label>
            <label className="settings-field">
              <span>Stok saat ini cukup untuk (hari)</span>
              <input
                type="number"
                min="0"
                step="1"
                placeholder="contoh: 3"
                value={localProfile.stock_days || ""}
                onChange={(e) => updateField("stock_days", e.target.value)}
              />
            </label>
            <label className="settings-field">
              <span>Kapasitas simpan cabai (kg)</span>
              <input
                type="number"
                min="0"
                step="0.5"
                placeholder="contoh: 10"
                value={localProfile.storage_capacity_kg || ""}
                onChange={(e) => updateField("storage_capacity_kg", e.target.value)}
              />
            </label>
            <label className="settings-field">
              <span>Gaya belanja</span>
              <select
                value={localProfile.buying_style || "Aman stok"}
                onChange={(e) => updateField("buying_style", e.target.value)}
              >
                <option>Aman stok</option>
                <option>Hemat cashflow</option>
                <option>Agresif stok saat murah</option>
              </select>
            </label>
            <label className="settings-field">
              <span>Harga menu</span>
              <select
                value={localProfile.can_adjust_price || "Sulit naik harga"}
                onChange={(e) => updateField("can_adjust_price", e.target.value)}
              >
                <option>Sulit naik harga</option>
                <option>Bisa naik sedikit</option>
                <option>Fleksibel ikut pasar</option>
              </select>
            </label>
          </div>
          <div className="settings-actions" style={{ marginTop: 24, display: "flex", alignItems: "center", gap: 14 }}>
            <button type="submit" className="btn-primary save-btn" disabled={isLoading}>
              {isLoading ? "Menyimpan..." : "Simpan Pengaturan"}
            </button>
            {saveSuccess && (
              <span className="save-success-msg" style={{ color: "var(--down)", fontWeight: "600", fontSize: 13 }}>
                ✓ Pengaturan berhasil disimpan & ramalan diperbarui
              </span>
            )}
          </div>
        </section>
      </form>

      <section className="settings-section">
        <h3 className="settings-title">Preferensi</h3>
        <p style={{ color: "#9e9a93", fontSize: 14 }}>
          Pengaturan notifikasi, bahasa, dan tampilan akan tersedia di pembaruan mendatang.
        </p>
      </section>
    </div>
  );
}
