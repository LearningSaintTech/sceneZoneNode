const express = require("express");
const router = express.Router();
const {signup ,verifyOtp,resendOtp,login,loginWithPassword} = require("../controllers/Auth/Auth");


router.post("/signup", signup);
router.post("/verify-Otp",verifyOtp);
router.post("/resend-Otp",resendOtp);
router.post("/login",login);
router.post("/loginWithPassword",loginWithPassword);


module.exports = router;

