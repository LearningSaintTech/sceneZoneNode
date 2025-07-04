const express = require("express");
const router = express.Router();
const {
  sendEventInvitation,

} = require("../controllers/InviteArtist/inviteArtist");
const {
  updateEventApplicationStatus,
} = require("../controllers/RespondToApplication/applicationRespond");
const { authMiddleware } = require("../../middlewares/authMiddleware");

router.post("/send-invitation", authMiddleware(["host"]), sendEventInvitation);

router.post(
  "/respond-to-application",
  authMiddleware(["host"]),
  updateEventApplicationStatus
);

module.exports = router;
