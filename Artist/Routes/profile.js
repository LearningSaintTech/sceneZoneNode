const express = require("express");
const router = express.Router();
const multer = require("multer");
const {apiResponse} = require("../../utils/apiResponse");
const {
  createArtistProfile,
  deleteArtistProfile,
  getArtistProfile,
  updateArtistProfile,
  getAllArtists,
  getArtistPerformance
} = require("../controllers/profile/artistProfile");

const { authMiddleware } = require("../../middlewares/authMiddleware");
const MAX_PERFORMANCE_VIDEOS = 5;
// Multer setup
const upload = multer();

// Routes
router.post(
  "/create-profile",
  authMiddleware(["artist"]),
  (req, res, next) => {
    upload.fields([
      { name: "profileImageUrl", maxCount: 1 },
      { name: "performanceUrl", maxCount: 5 },
    ])(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        // Handle Multer-specific errors
        if (err.code === "LIMIT_UNEXPECTED_FILE") {
          return res
            .status(400)
            .json({ message: "Maximum 5 performance videos are allowed." });
        }
      } else if (err) {
        // Handle other errors
        return apiResponse(res, {
          success: false,
          statusCode: 500,
          message: "File upload error",
          data: { error: err.message },
        });
      }
      next();
    });
  },
  createArtistProfile
);

router.get("/get-profile", authMiddleware(["artist","host","admin"]), getArtistProfile);

router.patch(
  "/update-profile",
  authMiddleware(["artist"]),
  (req, res, next) => {
    upload.fields([
      { name: "profileImageUrl", maxCount: 1 },
      { name: "performanceUrl", maxCount: MAX_PERFORMANCE_VIDEOS },
    ])(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_UNEXPECTED_FILE") {
            return apiResponse(res, {
            success: false,
            statusCode: 400,
            message: `Maximum ${MAX_PERFORMANCE_VIDEOS} performance videos are allowed.`,
          });
        }
      } else if (err) {
        return apiResponse(res, {
          success: false,
          statusCode: 500,
          message: "File upload error",
          data: { error: err.message },
        });
      }
      next();
    });
  },
  updateArtistProfile
);

router.get("/get-all-artists", authMiddleware(["host","admin"]), getAllArtists);

router.delete(
  "/delete-profile",
  authMiddleware(["artist","admin"]),
  deleteArtistProfile
);

router.get("/get-Artist-Performance",authMiddleware(['host']),getArtistPerformance)
module.exports = router;
