const express = require("express");
const router = express.Router();
const { filterEvents } = require("../../User/controllers/filterEvent/filterEvent"); // Adjust path to your controller
const { authMiddleware } = require("../../middlewares/authMiddleware");

// Route to filter events based on date, price, and location
router.get("/filter", authMiddleware(['user']),filterEvents);

module.exports = router;