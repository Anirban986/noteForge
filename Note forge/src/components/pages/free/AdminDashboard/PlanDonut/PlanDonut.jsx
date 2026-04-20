import "./PlanDonut.css";
import { PLAN_BREAKDOWN } from "../data/adminData";

export default function PlanDonut() {
  const total = PLAN_BREAKDOWN.reduce((s, d) => s + d.val, 0);
  const R = 58, CX = 80, CY = 80, strokeW = 18;
  const circ = 2 * Math.PI * R;

  let offset = 0;
  const slices = PLAN_BREAKDOWN.map(d => {
    const dash  = (d.val / total) * circ;
    const slice = { ...d, dash, gap: circ - dash, offset };
    offset += dash;
    return slice;
  });

  return (
    <div className="adm-donut-card">
      <div className="adm-donut-card__head">
        <div className="adm-donut-card__title">Plan Breakdown</div>
        <div className="adm-donut-card__sub">{total} total premium subscribers</div>
      </div>

      <div className="adm-donut-card__body">
        <div className="adm-donut-wrap">
          <svg viewBox="0 0 160 160">
            {slices.map(s => (
              <circle key={s.label}
                cx={CX} cy={CY} r={R}
                fill="none"
                stroke={s.color}
                strokeWidth={strokeW}
                strokeDasharray={`${s.dash} ${s.gap}`}
                strokeDashoffset={-s.offset}
                style={{ opacity: 0.9 }}
              />
            ))}
            <circle cx={CX} cy={CY} r={R - strokeW/2 - 3}
              fill="none"
              stroke="rgba(255,255,255,0.04)"
              strokeWidth={1}
            />
          </svg>
          <div className="adm-donut-center">
            <div className="adm-donut-center__val">{total}</div>
            <div className="adm-donut-center__label">premium</div>
          </div>
        </div>

        <div className="adm-donut-legend">
          {PLAN_BREAKDOWN.map(d => (
            <div key={d.label} className="adm-donut-legend__row">
              <div className="adm-donut-legend__swatch" style={{ background: d.color }} />
              <span className="adm-donut-legend__label">{d.label}</span>
              <span className="adm-donut-legend__val">{d.val}</span>
              <span className="adm-donut-legend__pct">{d.pct}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
