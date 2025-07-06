const express = require('express');
const router = express.Router();
const bookingController = require('../controller/bookingController');
const { authMiddleware } = require('../../middlewares/authMiddleware');

// Create a Razorpay order
router.post('/create-order', authMiddleware(['host']), bookingController.createOrder);

// Verify Razorpay payment and create booking
router.post('/verify-payment', authMiddleware(['host']), bookingController.verifyPayment);

module.exports = router;