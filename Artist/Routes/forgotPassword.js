const express = require("express");
const router = express.Router();
const {
  emailNumberSendOtp,
  verifyEmailNumberOtp,
  setNewPassword,
} = require("../controllers/ForgotPassword/forgotPassword");

router.post("/email-number-send-otp", emailNumberSendOtp);
router.post("/verify-email-number-otp", verifyEmailNumberOtp);
router.post("/set-newpassword", setNewPassword);

module.exports = router;