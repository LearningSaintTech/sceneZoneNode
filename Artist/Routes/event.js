const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../../middlewares/authMiddleware");
const { getAllEventsForArtist } = require("../controllers/EventApplication/event");


router.get(
  "/get-all-events-artist",
  authMiddleware(["artist"]),
  getAllEventsForArtist
);

module.exports = router;