import { useAppContext } from "../context/AppContext";

export function PengaturanPage() {
  const { profile, setProfile } = useAppContext();

  function updateField(field, value) {
    setProfile((prev) => ({ ...prev, [field]: value }));
  }

  return (
    <div className="page-container">
      <section className="settings-section">
        <h3 className="settings-title">Profil UMKM</h3>
        <div className="settings-grid">
          <label className="settings-field">
            <span>Jenis usaha</span>
            <input
              placeholder="Seblak, ayam geprek, warung nasi"
              value={profile.business_type}
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
              value={profile.daily_usage_kg}
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
              value={profile.stock_days}
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
              value={profile.storage_capacity_kg}
              onChange={(e) => updateField("storage_capacity_kg", e.target.value)}
            />
          </label>
          <label className="settings-field">
            <span>Gaya belanja</span>
            <select
              value={profile.buying_style}
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
              value={profile.can_adjust_price}
              onChange={(e) => updateField("can_adjust_price", e.target.value)}
            >
              <option>Sulit naik harga</option>
              <option>Bisa naik sedikit</option>
              <option>Fleksibel ikut pasar</option>
            </select>
          </label>
        </div>
      </section>

      <section className="settings-section">
        <h3 className="settings-title">Preferensi</h3>
        <p style={{ color: "#9e9a93", fontSize: 14 }}>
          Pengaturan notifikasi, bahasa, dan tampilan akan tersedia di pembaruan mendatang.
        </p>
      </section>
    </div>
  );
}
