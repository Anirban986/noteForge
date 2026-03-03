import "./ProgressBar.css";

/**
 * ProgressBar
 * @param {number} value   — current value
 * @param {number} max     — max value (default 100)
 * @param {string} color   — fill colour (CSS value)
 * @param {number} height  — bar height in px (default 6)
 * @param {string} label   — optional label text (shows left + percent right)
 */
export default function ProgressBar({
  value,
  max = 100,
  color = "#3b5bdb",
  height = 6,
  label,
}) {
  const pct = Math.min(100, Math.round((value / max) * 100));

  return (
    <div className="progress-bar">
      {label && (
        <div className="progress-bar__labels">
          <span>{label}</span>
          <strong>{pct}%</strong>
        </div>
      )}
      <div className="progress-bar__track" style={{ height }}>
        <div
          className="progress-bar__fill"
          style={{ width: `${pct}%`, background: color, height }}
        />
      </div>
    </div>
  );
}