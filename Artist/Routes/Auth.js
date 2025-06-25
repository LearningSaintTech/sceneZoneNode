const express = require("express");
const router = express.Router();
const {
  signup,
  verifyOtp,
  resendOtp,
  login,
  loginWithPassword,
  getArtists
} = require("../controllers/Auth/Auth");

const {authMiddleware}=require("../../middlewares/authMiddleware")

router.post("/signup", signup);
router.post("/verify-otp", verifyOtp);
router.post("/resend-otp", resendOtp);
router.post("/login", login);
router.post("/loginFromPassword", loginWithPassword);
router.get("/get-artist",authMiddleware(["artist"]),getArtists)
module.exports = router;

