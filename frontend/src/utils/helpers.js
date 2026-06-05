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
  return formatRp(val);
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
  if (pct > 2.0) return { text: "Beli", cls: "beli" };
  if (pct < -2.0) return { text: "Tahan", cls: "simpan" };
  return { text: "Pantau", cls: "pantau" };
}

export function writeStored(key, payload) {
  try {
    localStorage.setItem(key, JSON.stringify(payload));
  } catch (e) {
    console.error("Storage error:", e);
  }
}

export function buildChartData(history, forecast) {
  const monthNames = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  const rows = [];

  // Add historical data points
  if (history && history.length > 0) {
    history.forEach((h) => {
      const d = new Date(h.ds);
      rows.push({
        date: h.ds,
        label: `${d.getDate()} ${monthNames[d.getMonth()]}`,
        actual: h.actual_price,
        forecast: null,
      });
    });
  }

  // Add forecast data points — first forecast connects to last actual
  if (forecast && forecast.length > 0) {
    const lastActual = history && history.length > 0 ? history[history.length - 1].actual_price : null;

    forecast.forEach((f, i) => {
      const d = new Date(f.ds);
      rows.push({
        date: f.ds,
        label: `${d.getDate()} ${monthNames[d.getMonth()]}`,
        actual: i === 0 ? lastActual : null,  // bridge point
        forecast: f.predicted_price,
      });
    });
  }

  return rows;
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
