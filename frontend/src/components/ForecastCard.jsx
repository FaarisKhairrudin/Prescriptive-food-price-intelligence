import { formatRp, formatSigned, getStockAction } from "../utils/helpers";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

export function ForecastCard({ row, index, showAction = false }) {
  const isUp = row.pct_change >= 0;
  
  // Parse date to get just the day (e.g., "26")
  const dateObj = new Date(row.ds);
  const day = dateObj.getDate().toString().padStart(2, '0');

  const action = getStockAction(row.pct_change);

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
        {isUp ? "↗" : "↘"} {formatSigned(row.pct_change)}
      </div>
      {showAction && (
        <div className={`fi-action ${action.cls.replace('action-', '')}`}>
          {action.text}
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
