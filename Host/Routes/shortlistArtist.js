const express = require("express");
const router = express.Router();
const {
  shortlistArtist,
  getShortlistedArtists,
  removeShortlistArtist,
  updateShortlistArtist
} = require("../controllers/ShortlistArtist/shortlistArtist");
const { authMiddleware } = require("../../middlewares/authMiddleware");

// Route to add an artist to a host's shortlist
// POST /shortlistArtist
// Restricted to authenticated hosts only
router.post("/shortlistArtist", authMiddleware(['host']), shortlistArtist);

// Route to fetch all shortlisted artists for a host
// GET /getShortlistedArtists
// Restricted to authenticated hosts only
router.get("/getShortlistedArtists", authMiddleware(['host']), getShortlistedArtists);

// Route to remove an artist from a host's shortlist
// DELETE /removeShortlistArtist/:artistId
// Restricted to authenticated hosts only
router.delete("/removeShortlistArtist/:artistId", authMiddleware(['host']), removeShortlistArtist);

// Route to update a shortlist entry (e.g., isSalaryBasis or assignedEvents)
// PUT /updateShortlistArtist
// Restricted to authenticated hosts only
router.patch("/updateShortlistArtist", authMiddleware(['host']), updateShortlistArtist);

module.exports = router;