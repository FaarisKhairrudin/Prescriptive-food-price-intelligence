export const PAYLOAD_KEY = "narapangan:v2:payload";

export const COMMODITY_OPTIONS = [
  { value: "cabai-rawit-merah", label: "Cabai Rawit Merah" },
  { value: "telur-ayam-ras", label: "Telur Ayam Ras" },
  { value: "bawang-merah", label: "Bawang Merah" },
  { value: "bawang-putih", label: "Bawang Putih" },
];

export const MARKET_OPTIONS = [
  { value: "pasar-caringin", label: "Pasar Caringin" },
];

export const DEFAULT_PROFILE = {
  business_type: "",
  daily_usage_kg: "",
  stock_days: "",
  storage_capacity_kg: "",
  buying_style: "Aman stok",
  can_adjust_price: "Sulit naik harga"
};

export const CHART_COLORS = {
  forecast: "#c8e64a",
  actual: "#1a2e1a",
  grid: "rgba(0,0,0,0.06)",
  tooltipBorder: "rgba(0,0,0,0.1)",
  tooltipShadow: "0 4px 20px rgba(0,0,0,0.08)",
  forecastFill: "#c8e64a"
};

export const QUICK_QUESTIONS = [
  "Berapa harga cabai rawit minggu ini?",
  "Apakah saya harus nyetok sekarang?",
  "Kapan prediksi harga cabai akan turun?",
  "Bagaimana strategi anggaran 4 minggu ke depan?",
  "Bantu estimasi pemakaian cabai harian usaha saya",
  "Berapa kapasitas penyimpanan cabai yang ideal?"
];
