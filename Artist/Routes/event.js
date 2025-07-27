const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../../middlewares/authMiddleware");
const { getAllEventsForArtist, getBookedEventsForArtist } = require("../controllers/EventApplication/event");


router.get(
  "/get-all-events-artist",
  authMiddleware(["artist"]),
  getAllEventsForArtist
);

router.get(
  "/get-booked-events-artist",
  authMiddleware(["artist"]),
  getBookedEventsForArtist
);

module.exports = router;