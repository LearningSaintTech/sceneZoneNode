const express = require("express");
const router = express.Router();
const { uploadBanner, updateBanner, deleteBanner, getAllBanners } = require("../../Admin/controllers/Banner/banner");
const { authMiddleware } = require("../../middlewares/authMiddleware"); // Adjust path as per your file structure
const multer = require("multer");

// Multer configuration for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Routes
router.post("/upload",authMiddleware(["admin"]), upload.single("bannerImage"), uploadBanner);
router.put("/update/:id", authMiddleware(["admin"]), upload.single("bannerImage"), updateBanner);
router.delete("/delete/:id", authMiddleware(["admin"]), deleteBanner);
router.get("/all", getAllBanners);

module.exports = router;