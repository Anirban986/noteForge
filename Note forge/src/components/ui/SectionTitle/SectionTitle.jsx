import "./SectionTitle.css";

/**
 * SectionTitle
 * @param {ReactNode} action — optional right-side slot (e.g. a button)
 */
export default function SectionTitle({ children, action }) {
  return (
    <div className="section-title">
      <span className="section-title__text">{children}</span>
      {action && <div>{action}</div>}
    </div>
  );
}