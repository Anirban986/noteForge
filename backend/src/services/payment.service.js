const Razorpay = require("razorpay");
const crypto = require("crypto");
const paymentRepository = require("../repositories/payment.repository");
const userService = require("./user.services");

require("dotenv").config();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// 🔹 Create Order + Save in DB
exports.createOrderService = async (amount, userId) => {
  const options = {
    amount: amount * 100,
    currency: "INR",
    receipt: "receipt_" + Date.now(),
  };

  const order = await razorpay.orders.create(options);

  // ✅ Save order in DB (IMPORTANT)
  await paymentRepository.createPayment({
    user: userId,
    orderId: order.id,
    amount: amount,
    status: "created",
    plan: "premium",
  });

  return order;
};

// 🔹 Verify Payment
exports.verifyPaymentService = async (data, userId) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  } = data;

  // 🔐 Signature verification
  const generated_signature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(razorpay_order_id + "|" + razorpay_payment_id)
    .digest("hex");

  if (generated_signature !== razorpay_signature) {
    throw new Error("PAYMENT_VERIFICATION_FAILED");
  }

  // 🔍 Fetch payment from DB
  const payment = await paymentRepository.findByOrderId(
    razorpay_order_id
  );

  if (!payment) {
    throw new Error("PAYMENT_RECORD_NOT_FOUND");
  }

  if (payment.status === "success") {
    return { success: true, message: "Already processed" };
  }

  // ✅ Update payment
  await paymentRepository.updatePaymentSuccess(razorpay_order_id, {
    paymentId: razorpay_payment_id,
    signature: razorpay_signature,
  });

  // ✅ Upgrade user
  await userService.upgradePlanService(userId);

  return {
    success: true,
    paymentId: razorpay_payment_id,
  };
};