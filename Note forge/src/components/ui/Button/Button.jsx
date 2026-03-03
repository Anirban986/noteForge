import "./Button.css";

/**
 * Button
 * @param {"primary"|"secondary"|"ghost"|"danger"} variant
 * @param {"sm"|"md"|"lg"} size
 */
export default function Button({
  children,
  variant = "primary",
  size = "md",
  onClick,
  style,
  disabled,
  className = "",
  type = "button",
}) {
  return (
    <button
      type={type}
      className={`btn btn--${size} btn--${variant} ${className}`}
      style={style}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}