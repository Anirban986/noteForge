import "./KpiGrid.css";
import { KPI_SPARK } from "../data/adminData";

const KPIS = [
  { label:"Total Users",      value:"1,447", icon:"👥", variant:"cyan",    delta:"+117",   deltaUp:true, metaLabel:"this month", sparkKey:"users"   },
  { label:"Premium Subs",     value:"382",   icon:"⭐", variant:"emerald", delta:"+37",    deltaUp:true, metaLabel:"this month", sparkKey:"premium" },
  { label:"Notes Uploaded",   value:"6,841", icon:"📄", variant:"amber",   delta:"+824",   deltaUp:true, metaLabel:"this month", sparkKey:"uploads" },
  { label:"Monthly Revenue",  value:"$3,438",icon:"💰", variant:"violet",  delta:"+12.4%", deltaUp:true, metaLabel:"vs last month", sparkKey:"revenue" },
];

const SPARK_COLORS = {
  cyan:    "#00d4ff",
  emerald: "#00e5a0",
  amber:   "#ffb547",
  violet:  "#a78bfa",
};

function Sparkline({ data, color }) {
  const max = Math.max(...data);
  return (
    <div className="adm-kpi__sparkline">
      {data.map((v, i) => (
        <div
          key={i}
          className={`adm-kpi__spark-bar ${i === data.length - 1 ? "adm-kpi__spark-bar--last" : ""}`}
          style={{ height: `${(v / max) * 36}px`, background: color }}
        />
      ))}
    </div>
  );
}

export default function KpiGrid() {
  return (
    <div className="adm-kpi-grid">
      {KPIS.map(k => (
        <div key={k.label} className={`adm-kpi adm-kpi--${k.variant}`}>
          <div className="adm-kpi__header">
            <div className="adm-kpi__label">{k.label}</div>
            <div className={`adm-kpi__icon adm-kpi__icon--${k.variant}`}>{k.icon}</div>
          </div>

          <div className={`adm-kpi__value adm-kpi__value--${k.variant}`}>{k.value}</div>

          <div className="adm-kpi__meta">
            <span className={`adm-kpi__delta adm-kpi__delta--${k.deltaUp ? "up" : "down"}`}>
              {k.deltaUp ? "+" : ""}{k.delta}
            </span>
            <span className="adm-kpi__meta-label">{k.metaLabel}</span>
          </div>

          <Sparkline data={KPI_SPARK[k.sparkKey]} color={SPARK_COLORS[k.variant]} />
        </div>
      ))}
    </div>
  );
}
