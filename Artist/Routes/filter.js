const express = require("express");
const router = express.Router();
const {authMiddleware} = require("../../middlewares/authMiddleware");
const {
  getFilteredEvents,
} = require("../controllers/Filter/filter");

router.get("/filter-events", authMiddleware(["artist"]), getFilteredEvents);

module.exports = router;