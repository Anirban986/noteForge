const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/payment.controller");
const userMiddleware = require("../middleware/user.middleware");

// Create order
router.post(
  "/create-order",
  userMiddleware.userMiddleware,
  paymentController.createOrder
);

// Verify payment
router.post(
  "/verify-payment",
  userMiddleware.userMiddleware,
  paymentController.verifyPaymentController
);

module.exports = router;