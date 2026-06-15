import { formatRp, formatSigned } from "../utils/helpers";
import { useAppContext } from "../context/AppContext";

export function ForecastCard({ row, index, showAction = false, dailyUsage, storageCapacity, previousPrice }) {
  const { profile, isDemoMode } = useAppContext();
  
  // Parse date to get just the day (e.g., "26")
  const dateObj = new Date(row.ds);
  const day = dateObj.getDate().toString().padStart(2, '0');

  const activeUsage = dailyUsage !== undefined ? dailyUsage : (parseFloat(profile.daily_usage_kg) || 2.0);
  const activeStorage = storageCapacity !== undefined ? storageCapacity : (parseFloat(profile.storage_capacity_kg) || 10.0);

  // Calculate percentage change relative to previous week's price (or last actual price)
  const basePrice = previousPrice !== undefined && previousPrice !== null ? previousPrice : row.predicted_price;
  const pct = basePrice > 0 ? ((row.predicted_price - basePrice) / basePrice * 100) : 0;
  
  const isUp = pct >= 0;

  let actionText = "Pantau";
  let actionCls = "pantau";
  let purchaseQty = 0;

  if (pct > 2.0) {
    actionText = isDemoMode ? "Demo (Beli)" : "Beli";
    actionCls = "beli";
    purchaseQty = Math.min(activeStorage, activeUsage * 14);
  } else if (pct < -2.0) {
    actionText = isDemoMode ? "Demo (Tahan)" : "Tahan";
    actionCls = "simpan";
    purchaseQty = activeUsage * 3.5;
  } else {
    actionText = isDemoMode ? "Demo (Pantau)" : "Pantau";
    actionCls = "pantau";
    purchaseQty = Math.min(activeStorage, activeUsage * 7);
  }

  let tagText = "Normal";
  let tagClass = "normal";
  if (row.is_ramadan) { tagText = "Ramadan"; tagClass = "ramadan"; }
  else if (row.is_idul_fitri) { tagText = "Idul Fitri"; tagClass = "fitri"; }
  else if (row.is_idul_adha) { tagText = "Idul Adha"; tagClass = "adha"; }

  return (
    <div className="forecast-item-new">
      <div className="fi-week-pill">
        <span className="fi-w">W+{index + 1}</span>
        <span className="fi-date">{day}</span>
      </div>
      <div className="fi-main">
        <div className="fi-price">{formatRp(row.predicted_price)}</div>
        <div className={`fi-tag ${tagClass}`}>{tagText}</div>
      </div>
      <div className={`fi-change ${isUp ? "up" : "down"}`}>
        {isUp ? "↗" : "↘"} {formatSigned(pct)}
      </div>
      {showAction && (
        <div className={`fi-action ${actionCls}`}>
          {actionText} {purchaseQty != null && (
            actionCls === "simpan"
              ? `(Beli Min ${purchaseQty.toFixed(1)} Kg)`
              : `(${purchaseQty.toFixed(1)} Kg)`
          )}
        </div>
      )}
    </div>
  );
}

export function MarkdownText({ text }) {
  if (!text) return null;
  const blocks = text.split("\n\n");
  return (
    <div className="md-text">
      {blocks.map((b, i) => (
        <p key={i} style={{ margin: "0 0 8px 0" }}>
          {b.replace(/\*\*(.*?)\*\*/g, "$1")} 
        </p>
      ))}
    </div>
  );
}
