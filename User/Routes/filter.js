const express = require("express");
const router = express.Router();
const { filterEvents, searchEvents, getLatestEvents } = require("../controllers/filterEvent/filterEvent"); // Adjust path to your controller file
const { authMiddleware } = require("../../middlewares/authMiddleware");

// Route to filter events based on date, price, and location
router.post("/filter",  filterEvents);

// Route to search events based on keyword
router.post("/search",  searchEvents);

// Route to get latest events
router.post("/latest", getLatestEvents);
module.exports = router;