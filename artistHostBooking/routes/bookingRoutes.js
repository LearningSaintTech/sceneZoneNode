const express = require('express');
const router = express.Router();
const bookingController = require('../controller/bookingController');
const { authMiddleware } = require('../../middlewares/authMiddleware');

// Create a Razorpay order
router.post('/create-order', authMiddleware(['host']), bookingController.createOrder);

// Verify Razorpay payment and create booking
router.post('/verify-payment', authMiddleware(['host']), bookingController.verifyPayment);

// Get all events assigned to the current artist
router.get('/assigned-events', authMiddleware(['artist']), bookingController.getAssignedEventsForArtist);

module.exports = router;