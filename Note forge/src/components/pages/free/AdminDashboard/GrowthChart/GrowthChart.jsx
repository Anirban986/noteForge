import "./GrowthChart.css";
import { GROWTH_DATA } from "../data/adminData";

const W = 600, H = 200;
const PAD = { l: 40, b: 24, t: 10, r: 16 };
const CW  = W - PAD.l - PAD.r;
const CH  = H - PAD.b - PAD.t;

function toX(i, n)  { return PAD.l + i * (CW / (n - 1)); }
function toY(v, max){ return PAD.t + CH - (v / max) * CH; }

function makePath(arr, max) {
  return arr.map((v, i) =>
    `${i === 0 ? "M" : "L"}${toX(i, arr.length).toFixed(1)},${toY(v, max).toFixed(1)}`
  ).join(" ");
}

function makeArea(arr, max) {
  const n    = arr.length;
  const yB   = PAD.t + CH;
  const line = makePath(arr, max);
  return `${line} L${toX(n-1, n).toFixed(1)},${yB} L${toX(0, n).toFixed(1)},${yB} Z`;
}

export default function GrowthChart({ range, onRangeChange }) {
  const data   = GROWTH_DATA[range];
  const maxVal = Math.max(...data.total) * 1.1;
  const n      = data.labels.length;
  const yLines = [0, 0.25, 0.5, 0.75, 1].map(t => Math.round(maxVal * t));

  return (
    <div className="adm-gc">
      <div className="adm-gc__head">
        <div>
          <div className="adm-gc__title">Subscriber Growth</div>
          <div className="adm-gc__sub">Total vs Premium over time</div>
        </div>
        <div className="adm-gc__tabs">
          {["daily","weekly","monthly"].map(r => (
            <button
              key={r}
              className={`adm-gc__tab ${range === r ? "adm-gc__tab--active" : ""}`}
              onClick={() => onRangeChange(r)}
            >
              {r.charAt(0).toUpperCase() + r.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="adm-gc__body">
        <div className="adm-gc__svg-wrap">
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
            <defs>
              <linearGradient id="adm-gc-grad-cyan" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#00d4ff" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#00d4ff" stopOpacity="0.01" />
              </linearGradient>
              <linearGradient id="adm-gc-grad-emerald" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#00e5a0" stopOpacity="0.2"  />
                <stop offset="100%" stopColor="#00e5a0" stopOpacity="0.01" />
              </linearGradient>
            </defs>

            {/* Grid + Y labels */}
            {yLines.map((v, i) => (
              <g key={i}>
                <line
                  x1={PAD.l} x2={W - PAD.r}
                  y1={toY(v, maxVal)} y2={toY(v, maxVal)}
                  className="adm-gc__grid-line"
                />
                <text x={PAD.l - 6} y={toY(v, maxVal) + 3} className="adm-gc__axis-text" textAnchor="end">
                  {v >= 1000 ? `${(v/1000).toFixed(1)}k` : v}
                </text>
              </g>
            ))}

            {/* X labels */}
            {data.labels.map((l, i) => (
              <text key={i} x={toX(i, n)} y={H - 4} className="adm-gc__axis-text" textAnchor="middle">{l}</text>
            ))}

            {/* Areas */}
            <path d={makeArea(data.total,   maxVal)} fill="url(#adm-gc-grad-cyan)"    opacity="0.6" />
            <path d={makeArea(data.premium, maxVal)} fill="url(#adm-gc-grad-emerald)" opacity="0.5" />

            {/* Lines */}
            <path d={makePath(data.total,   maxVal)} className="adm-gc__line-cyan"    />
            <path d={makePath(data.premium, maxVal)} className="adm-gc__line-emerald" />

            {/* End dots */}
            {[{arr:data.total,stroke:"#00d4ff"},{arr:data.premium,stroke:"#00e5a0"}].map(({arr,stroke})=>(
              <circle key={stroke}
                cx={toX(arr.length-1, arr.length)} cy={toY(arr[arr.length-1], maxVal)}
                r={4} className="adm-gc__dot" stroke={stroke}
              />
            ))}
          </svg>
        </div>

        <div className="adm-gc__legend">
          <div className="adm-gc__legend-item">
            <div className="adm-gc__legend-dot" style={{ background:"#00d4ff" }} />
            Total Users
          </div>
          <div className="adm-gc__legend-item">
            <div className="adm-gc__legend-dot" style={{ background:"#00e5a0" }} />
            Premium Users
          </div>
        </div>
      </div>
    </div>
  );
}
