const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../../middlewares/authMiddleware");
const { updateEventApplicationStatus } = require("../controllers/Events/eventApplicationController");

// API Endpoint: PATCH /api/host/event-applications/:applicationId/status
// Description: Updates the status of an event application, accessible only to hosts
router.patch(
  "/event-applications/:applicationId/status",
  authMiddleware(["host"]),
  updateEventApplicationStatus
);

module.exports = router;