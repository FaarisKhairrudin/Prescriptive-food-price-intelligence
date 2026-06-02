export function formatRp(val) {
  if (val == null) return "Rp0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(val);
}

export function formatSigned(val) {
  if (val == null) return "0%";
  const sign = val >= 0 ? "+" : "";
  return `${sign}${val.toFixed(1)}%`;
}

export function formatCurrency(val) {
  if (val == null) return "Rp0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(val);
}

export function formatDate(dateString) {
  if (!dateString) return "";
  const d = new Date(dateString);
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

export function getCalendarLabel(row) {
  if (!row.ds) return "";
  const d = new Date(row.ds);
  return new Intl.DateTimeFormat("id-ID", { month: "short", year: "2-digit" }).format(d);
}

export function getStockAction(pct) {
  if (pct < -2.0) return { text: "Tahan", cls: "hold" };
  if (pct > 2.0) return { text: "Beli", cls: "buy" };
  return { text: "Normal", cls: "normal" };
}

export function writeStored(key, payload) {
  try {
    localStorage.setItem(key, JSON.stringify(payload));
  } catch (e) {
    console.error("Storage error:", e);
  }
}

export function readStored(key) {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : null;
  } catch (e) {
    console.error("Storage error:", e);
    return null;
  }
}
