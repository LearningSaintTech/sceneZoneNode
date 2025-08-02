const express = require('express');
const router = express.Router();
const { getEvents,getEventCount,getEventStatusCount,exportEventsToCsv,getEventTicketBuyers,searchEvents,searchEventTicketBuyers} = require('../controllers/getEvents/getEventController');
const {authMiddleware} = require("../../middlewares/authMiddleware")

router.get("/get-all-Events",authMiddleware(['admin']),getEvents);
router.get("/get-event-counts",authMiddleware(['admin']),getEventCount);
router.get("/get-event-status-count",authMiddleware(['admin']),getEventStatusCount);
router.get("/get-events-csv",authMiddleware(['admin']),exportEventsToCsv);
router.get("/get-ticket-buyers/:eventId",authMiddleware(['admin']),getEventTicketBuyers);

router.get("/search-events",authMiddleware(['admin']),searchEvents);
router.get("/search-ticket-buyers",authMiddleware(['admin']),searchEventTicketBuyers)

module.exports = router;