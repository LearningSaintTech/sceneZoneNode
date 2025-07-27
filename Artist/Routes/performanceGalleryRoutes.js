const express = require("express");
const router = express.Router();
const multer = require("multer");

const { createPerformanceGallery, updatePerformanceGallery,getAllPerformancesByArtistId } = require("../../Artist/controllers/profile/perfomanceGalleryController");
const { authMiddleware } = require("../../middlewares/authMiddleware");

const upload = multer({
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
});

router.post(
  "/create-performance-gallery",
  authMiddleware(["artist"]),
  upload.single("video"),
  createPerformanceGallery
);

router.patch(
  "/update-performance-gallery/:artistProfileId",
  authMiddleware(["artist"]),
  upload.single("video"),
  updatePerformanceGallery
);

router.get(
  "/get-all-performances-by-artist",
  authMiddleware(["artist"]),
  getAllPerformancesByArtistId
);

module.exports = router;
