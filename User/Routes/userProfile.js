const express = require("express");
const router = express.Router();
const multer = require("multer");
const {
  createUserProfile,
  deleteUserProfile,
  getUserProfile,
  updateUserProfile,
} = require("../controllers/Profile/UserProfile");
const {authMiddleware} = require("../../middlewares/authMiddleware");
const upload = multer();


router.post("/create-profile",authMiddleware(['user','admin']),upload.single("profileImageUrl"), createUserProfile);
router.get("/get-profile",authMiddleware(['user','admin']), getUserProfile);
router.delete("/delete-profile",authMiddleware(['user','admin']), deleteUserProfile);
router.patch("/update-profile",authMiddleware(['user','admin']),upload.single("profileImageUrl"), updateUserProfile);

module.exports = router;

