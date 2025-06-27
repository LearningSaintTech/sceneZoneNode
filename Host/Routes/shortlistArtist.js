const express = require("express");
const router = express.Router();
const {
  shortlistArtist,
  getShortlistedArtists,
  removeShortlistArtist
} = require("../controllers/ShortlistArtist/shortlistArtist");
const {authMiddleware} = require("../../middlewares/authMiddleware");

router.post("/shortlistArtist", authMiddleware(['host',"user "]), shortlistArtist);
router.get("/getShortlistedArtists", authMiddleware(['host']), getShortlistedArtists);
router.delete("/removeShortlistArtist/:artistId", authMiddleware(['host']), removeShortlistArtist);
module.exports = router;
