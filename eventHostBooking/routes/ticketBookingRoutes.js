const express = require('express');
const { authMiddleware } = require('../../middlewares/authMiddleware');
const { bookTicket, getUserTickets, createTicketOrder } = require('../controller/ticketBookingController');

const router = express.Router();

router.post('/book', authMiddleware(['user']), bookTicket);
router.get('/user-tickets', authMiddleware(['user']), getUserTickets);
router.post('/create-order', authMiddleware(['user']), createTicketOrder);

module.exports = router;