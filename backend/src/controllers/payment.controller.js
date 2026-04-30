const paymentService = require("../services/payment.service");

// 🔹 Create Order
exports.createOrder = async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount) {
      return res.status(400).json({ message: "Amount is required" });
    }

    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = req.user.id;

    const order = await paymentService.createOrderService(
      amount,
      userId
    );

    res.json(order);
  } catch (err) {
    console.error("CREATE ORDER ERROR:", err);
    res.status(500).json({ message: err.message });
  }
};

// 🔹 Verify Payment
exports.verifyPaymentController = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = req.user.id;

    const result = await paymentService.verifyPaymentService(
      req.body,
      userId
    );

    res.json({
      message: "Payment successful & plan upgraded",
      ...result,
    });
  } catch (err) {
    console.error("🔥 VERIFY ERROR:", err);

    if (err.message === "PAYMENT_VERIFICATION_FAILED") {
      return res.status(400).json({ message: "Invalid payment" });
    }

    res.status(500).json({ message: err.message });
  }
};