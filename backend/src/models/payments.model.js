const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: true,
  },

  orderId: {
    type: String,
    required: true,
  },

  paymentId: {
    type: String,
    default: "",
  },

  signature: {
    type: String,
    default: "",
  },

  amount: {
    type: Number,
    required: true,
  },

  currency: {
    type: String,
    default: "INR",
  },

  status: {
    type: String,
    enum: ["created", "success", "failed"],
    default: "created",
  },

  plan: {
    type: String,
    default: "premium",
  },

}, { timestamps: true });

module.exports = mongoose.model("Payment", paymentSchema);