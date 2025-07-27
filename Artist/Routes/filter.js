const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../../middlewares/authMiddleware");
const { getFilteredEvents } = require("../controllers/Filter/filter");

router.post("/filter-events", (req, res, next) => {
  console.log("🎯 HIT /api/artist/filter-events route");
  console.log("Request body:", req.body);
  console.log("Request headers:", req.headers);
  next();
}, authMiddleware(["artist", "user", "admin"]), getFilteredEvents);

module.exports = router;