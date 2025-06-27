const express = require("express");
const router = express.Router();
const {authMiddleware} = require("../../middlewares/authMiddleware");
const {
  applyForEvent,
  getAppliedEvents
} = require("../controllers/EventApplication/eventApplication");

router.post(
  "/applyEvent",
  authMiddleware(["artist"]),
  applyForEvent
);

router.get("/event/applied", authMiddleware(["artist"]), getAppliedEvents);

module.exports = router;