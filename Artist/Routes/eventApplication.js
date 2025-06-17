const express = require("express");
const router = express.Router();
const {authMiddleware} = require("../../middlewares/authMiddleware");
const {
  applyForEvent,
} = require("../controllers/EventApplication/eventApplication");

router.post(
  "/apply-event",
  authMiddleware(["artist"]),
  applyForEvent
);

module.exports = router;