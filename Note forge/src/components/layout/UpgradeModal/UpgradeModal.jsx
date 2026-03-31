import "./UpgradeModal.css";
import Button from "../../ui/Button/Button";

const FEATURES = [
  "Unlimited PDF uploads",
  "Regenerate & refine AI notes",
  "Full Exam Mode workspace",
  "Subject → Chapter → Topic tree",
  "AI-generated mock tests",
  "Performance analytics dashboard",
];

export default function UpgradeModal({ onClose, onUpgrade }) {
  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal fade-up">
        <button className="modal__close" onClick={onClose}>✕</button>

        <div className="modal__icon">✨</div>
        <h2 className="modal__title">Unlock NoteForge Premium</h2>
        <p className="modal__desc">
          Get unlimited PDF uploads, AI note regeneration, and access to the full Exam Mode workspace.
        </p>

        <div className="modal__features">
          {FEATURES.map((f) => (
            <div key={f} className="modal__feature">
              <div className="modal__feature__check">✓</div>
              {f}
            </div>
          ))}
        </div>

        <div className="modal__pricing">
          <span className="modal__pricing__price">Rs.99</span>
          <span className="modal__pricing__period"> /month · cancel anytime</span>
        </div>

        <div className="modal__actions">
          <Button
            size="lg"
            style={{ flex: 1, justifyContent: "center" }}
            onClick={onUpgrade}
          >
            ✨ Upgrade — Get Unlimited Access
          </Button>
          <Button variant="secondary" onClick={onClose}>Later</Button>
        </div>
      </div>
    </div>
  );
}