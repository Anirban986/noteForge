import "./Badge.css";

/**
 * Badge
 * @param {"accent"|"red"|"orange"|"green"|"amber"|"gray"} color
 * @param {"sm"|"xs"} size
 */
export default function Badge({ color = "accent", size = "sm", children }) {
  return (
    <span className={`badge badge--${size} badge--${color}`}>
      {children}
    </span>
  );
}