const Payment = require("../models/payments.model");

// 🔹 Create payment (order creation stage)
exports.createPayment = async (data) => {
  return await Payment.create(data);
};

// 🔹 Find by orderId
exports.findByOrderId = async (orderId) => {
  return await Payment.findOne({ orderId });
};

// 🔹 Update payment after success
exports.updatePaymentSuccess = async (orderId, data) => {
  return await Payment.findOneAndUpdate(
    { orderId },
    {
      $set: {
        paymentId: data.paymentId,
        signature: data.signature,
        status: "success",
      },
    },
    { new: true }
  );
};