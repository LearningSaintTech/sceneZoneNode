const express = require('express');
const router = express.Router();
const bookingController = require('../controller/bookingController');

// Create a new booking
router.post('/', bookingController.createBooking);

// Get all bookings
router.get('/', bookingController.getAllBookings);

// Get a single booking by ID
router.get('/:id', bookingController.getBookingById);

// Update a booking by ID
router.put('/:id', bookingController.updateBooking);

// Delete a booking by ID
router.delete('/:id', bookingController.deleteBooking);

// Update payment status for first or second payment
router.patch('/:id/payment', bookingController.updatePaymentStatus);

module.exports = router;