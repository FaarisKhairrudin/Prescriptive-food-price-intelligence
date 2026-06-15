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
    history.forEach((h, i) => {
      const d = new Date(h.ds);
      const isLast = i === history.length - 1;
      rows.push({
        date: h.ds,
        label: `${d.getDate()} ${monthNames[d.getMonth()]}`,
        actual: h.actual_price,
        forecast: isLast && forecast && forecast.length > 0 ? h.actual_price : null, // bridge starts at last actual
      });
    });
  }

  // Add forecast data points
  if (forecast && forecast.length > 0) {
    forecast.forEach((f) => {
      const d = new Date(f.ds);
      rows.push({
        date: f.ds,
        label: `${d.getDate()} ${monthNames[d.getMonth()]}`,
        actual: null,
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

export function isTokenExpired(token) {
  if (!token) return true;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return true;
    let b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) {
      b64 += "=";
    }
    const payload = JSON.parse(atob(b64));
    if (payload.exp && payload.exp < Date.now() / 1000) {
      return true;
    }
    return false;
  } catch (e) {
    return true;
  }
}
