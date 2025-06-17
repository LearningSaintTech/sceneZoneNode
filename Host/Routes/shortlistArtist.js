const express = require("express");
const router = express.Router();
const {
  shortlistArtist,
  getShortlistedArtists,
} = require("../controllers/ShortlistArtist/shortlistArtist");
const {authMiddleware} = require("../../middlewares/authMiddleware");

router.post("/shortlistArtist", authMiddleware(['host']), shortlistArtist);
router.get("/getShortlistedArtists", authMiddleware(['host']), getShortlistedArtists);
module.exports = router;
