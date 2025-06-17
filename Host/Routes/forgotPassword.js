const express = require("express");
const router = express.Router();
const {
 
  emailSendOtp,
  verifyEmailOtp,
  setNewPassword,
} = require("../controllers/ForgotPassword/forogtPassword");



router.post("/email-sendOtp", emailSendOtp);
router.post("/email-verifyOtp", verifyEmailOtp);
router.post("/set-newpassword",setNewPassword);


module.exports = router;

