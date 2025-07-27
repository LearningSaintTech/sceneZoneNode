const express = require("express");
const router = express.Router();
const {authMiddleware} = require("../../middlewares/authMiddleware");
const {
  rateEvent,
} = require("../controllers/Rating/rating");

router.post(
  "/rate-event",
  authMiddleware(["artist","user"]),
  rateEvent
);

module.exports = router;