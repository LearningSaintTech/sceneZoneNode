const express = require("express");
const router = express.Router();
const {
  signup,
  verifyOtp,
  resendOtp,
  login,
  loginWithPassword,
  getArtist,
  getArtistById,
  deleteAccount
} = require("../controllers/Auth/Auth");

const {authMiddleware}=require("../../middlewares/authMiddleware")

router.post("/signup", signup);
router.post("/verify-otp", verifyOtp);
router.post("/resend-otp", resendOtp);
router.post("/login", login);
router.post("/loginFromPassword", loginWithPassword);
router.get("/get-artist",authMiddleware(["artist"]),getArtist)
router.get("/get-artist/:artistId", authMiddleware(["host", "artist", "admin"]), getArtistById);
router.delete("/deleteAccount", authMiddleware(["artist"]), deleteAccount);
module.exports = router;

