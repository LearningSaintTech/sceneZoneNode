const express = require("express");
const router = express.Router();
const {
  emailNumberSendOtp,
  verifyEmailNumberOtp,
  setNewPassword,
} = require("../controllers/ForgotPassword/forogtPassword");

router.post("/email-sendOtp", emailNumberSendOtp);
router.post("/email-verifyOtp", verifyEmailNumberOtp);
router.post("/set-newpassword", setNewPassword);

module.exports = router;