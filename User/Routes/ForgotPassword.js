const express = require("express");
const router = express.Router();

const {
  emailNumberSendOtp,
  verifyEmailNumberOtp,
  setNewPassword,
} = require("../controllers/ForgotPassword/forgotPassword");

// Updated routes to match controller function names
router.post("/email-number-send-otp", emailNumberSendOtp);
router.post("/verify-email-number-otp", verifyEmailNumberOtp);
router.post("/set-new-password", setNewPassword);

module.exports = router;
