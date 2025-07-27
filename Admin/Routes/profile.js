const {updateProfile,getProfile,deleteProfile} = require("../controllers/Profile/profile");
const {authMiddleware} = require("../../middlewares/authMiddleware");
const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer();

router.put("/update-profile",authMiddleware(['admin']),  upload.single("profileImageUrl"),updateProfile);
router.get("/get-profile",authMiddleware(['admin']),getProfile);
router.delete("/delete-profile",authMiddleware(['admin']),deleteProfile);

module.exports = router;