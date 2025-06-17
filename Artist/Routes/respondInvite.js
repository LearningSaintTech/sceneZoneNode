const express = require("express");
const router = express.Router();
const {authMiddleware} = require("../../middlewares/authMiddleware");

const {
  respondToInvitation,
} = require("../controllers/RespondToInvitation/RespondInvite");

router.post(
  "/respond-to-invitation",
  authMiddleware(["artist"]),
  respondToInvitation
);

module.exports = router;