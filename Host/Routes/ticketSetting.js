const express = require("express");
const router = express.Router();
const {
  getTicketSettings,
  updateTicketSettings,
  deleteTicketSettings,
} = require("../../Host/controllers/Ticket/ticketSettingController");
const { authMiddleware } = require("../../middlewares/authMiddleware");

// Host updates ticket settings for an event
router.put("/:eventId/ticket-settings", authMiddleware(["host"]), updateTicketSettings);

// Anyone can view ticket settings for an event
router.get("/:eventId/ticket-settings", getTicketSettings);

// Host deletes ticket settings for an event
router.delete("/:eventId/ticket-settings", authMiddleware(["host"]), deleteTicketSettings);

module.exports = router;