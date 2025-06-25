const express = require("express");
const router = express.Router();
const { bookTicket, confirmBooking } = require("../../Host/controllers/Ticket/ticketBookingController");
const { authMiddleware } = require("../../middlewares/authMiddleware");

// User books ticket (creates Razorpay order)
router.post("/book", authMiddleware(["user"]), bookTicket);

// User confirms booking after payment
router.post("/confirm", authMiddleware(["user"]), confirmBooking);

module.exports = router;