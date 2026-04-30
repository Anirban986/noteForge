import "./UpgradeModal.css";
import Button from "../../ui/Button/Button";
import axios from "axios";
import { useState } from "react";

const FEATURES = [
  "Unlimited PDF uploads",
  "Regenerate & refine AI notes",
  "Full Exam Mode workspace",
  "Subject → Chapter → Topic tree",
  "AI-generated mock tests",
  "Performance analytics dashboard",
];

export default function UpgradeModal({ onClose }) {
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    try {
      setLoading(true);
    
      
      // 🔹 Step 1: Create order
      const { data: order } = await axios.post(
        "http://localhost:3000/api/payment/create-order",
        { amount: 99 }, // ₹99
        {
          
             withCredentials: true,
          
        }
      );

      console.log("Order created:", order);
      

      // 🔹 Step 2: Open Razorpay
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: "NoteForge",
        description: "Premium Subscription",
        order_id: order.id,

        handler: async function (response) {
          try {
            // 🔹 Step 3: Verify payment
            await axios.post(
              "http://localhost:3000/api/payment/verify-payment",
              response,
              {
                 withCredentials: true,
              }
            );

            alert("🎉 Payment successful! Premium activated.");
            onClose();
            window.location.reload(); // optional

          } catch (err) {
            console.error(err);
            alert("Payment verification failed");
          }
        },

        prefill: {
          name: "User",
          email: "user@example.com",
        },

        theme: {
          color: "#6366f1",
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();

    } catch (err) {
      console.error(err);
      alert("Payment initiation failed");
    } finally {
      setLoading(false);
    }
  };

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
            onClick={handleUpgrade}
            disabled={loading}
          >
            {loading ? "Processing..." : "✨ Upgrade — Get Unlimited Access"}
          </Button>
          <Button variant="secondary" onClick={onClose}>Later</Button>
        </div>
      </div>
    </div>
  );
}