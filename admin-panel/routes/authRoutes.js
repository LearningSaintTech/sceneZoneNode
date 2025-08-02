const express = require('express');
const router = express.Router();
const {  verifyOTP , resendOTP , login} = require('../controllers/Auth/authController');

// Route for OTP verification
router.post('/verify-otp',verifyOTP);

// Route for resend-otp
router.post('/resend-otp',resendOTP)

//Route for login
router.post("/login",login);


module.exports = router;