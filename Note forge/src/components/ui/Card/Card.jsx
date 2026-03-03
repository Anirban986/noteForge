import "./Card.css";

/**
 * Card
 * @param {boolean} hover   — enables lift-on-hover effect
 * @param {function} onClick
 */
export default function Card({ children, style, hover, onClick, className = "" }) {
  return (
    <div
      className={`card ${hover ? "card--hover" : ""} ${className}`}
      style={style}
      onClick={onClick}
    >
      {children}
    </div>
  );
}