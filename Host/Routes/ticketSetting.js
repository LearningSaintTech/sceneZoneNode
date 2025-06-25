const express = require("express");
const router = express.Router();
const { setTicketSetting, getTicketSetting, deleteTicketSetting } = require("../../Host/controllers/Ticket/ticketSettingController");
const { authMiddleware } = require("../../middlewares/authMiddleware");

// Host sets ticket settings
router.post("/set-ticket-setting", authMiddleware(["host"]), setTicketSetting);

// Anyone can view ticket settings for an event
router.get("/get-ticket-setting/:eventId", getTicketSetting);


// Host deletes ticket settings for an event
router.delete("/delete-ticket-setting/:eventId", authMiddleware(["host"]), deleteTicketSetting);
module.exports = router;