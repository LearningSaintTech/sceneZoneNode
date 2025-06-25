const express = require("express");
const router = express.Router();
const multer = require("multer");
const { apiResponse } = require("../../utils/apiResponse");
const {
  createArtistProfile,
  deleteArtistProfile,
  getArtistProfile,
  updateArtistProfile,
  getAllArtists,
  getArtistPerformance,
} = require("../../Artist/controllers/profile/artistProfile");
const { shortlistArtist, getShortlistedArtists } = require("../../Host/controllers/ShortlistArtist/shortlistArtist");
const { authMiddleware } = require("../../middlewares/authMiddleware");


const upload = multer();

router.post(
  "/create-profile",
  authMiddleware(["artist"]),
  upload.single("profileImageUrl"),
  createArtistProfile
);

router.get(
  "/get-profile/:artistId",
  authMiddleware(["artist", "host", "admin"]),
  getArtistProfile
);


router.patch(
  "/update-profile",
  authMiddleware(["artist"]),
  upload.single("profileImageUrl"),
  updateArtistProfile
);

router.get(
  "/get-all-artists",
  authMiddleware(["host", "admin"]),
  getAllArtists
);

router.delete(
  "/delete-profile",
  authMiddleware(["artist", "admin"]),
  deleteArtistProfile
);

router.get(
  "/get-artist-performance/:artistId",
  authMiddleware(["host"]),
  getArtistPerformance
);

router.post(
  "/shortlist-artist",
  authMiddleware(["host"]),
  shortlistArtist
);

router.get(
  "/get-shortlisted-artists",
  authMiddleware(["host"]),
  getShortlistedArtists
);


module.exports = router;