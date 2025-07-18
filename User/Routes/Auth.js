const express = require("express");
const router = express.Router();
const {
  signup,
  verifyOtp,
  resendOtp,
  login,
  loginWithPassword,
  getUser,
  deleteAccount
} = require("../controllers/Auth/Auth");


 
const { authMiddleware } = require("../../middlewares/authMiddleware"); // Adjust path if needed

// Public routes
router.post("/signup", signup);
router.post("/verify-otp", verifyOtp);
router.post("/resend-otp", resendOtp);
router.post("/login", login);
router.post("/loginFromPassword", loginWithPassword);

// Protected route (only accessible with valid token & role "user")
router.get("/get-user", authMiddleware(["user"]), getUser);
router.delete("/deleteAccount", authMiddleware(["user"]), deleteAccount);

module.exports = router;
