import "./RevenueTickers.css";
import { TICKER_DATA } from "../data/adminData";

export default function RevenueTickers() {
  return (
    <div className="adm-tickers">
      {TICKER_DATA.map(t => (
        <div key={t.label} className="adm-ticker">
          <div className="adm-ticker__label">{t.label}</div>
          <div className="adm-ticker__val">{t.val}</div>
          <div className={`adm-ticker__change adm-ticker__change--${t.up ? "up" : "down"}`}>
            {t.up ? "▲" : "▼"} {t.change}
          </div>
        </div>
      ))}
    </div>
  );
}
