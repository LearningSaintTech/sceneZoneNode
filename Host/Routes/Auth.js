const express = require("express");
const router = express.Router();
const multer = require("multer");

const {
  signup,
  verifyOtp,
  resendOtp,
  login,
  loginFromPassword,
  getHost,
  updateHost,
  deleteHost,
} = require("../controllers/Auth/Auth");

const {authMiddleware}=require("../../middlewares/authMiddleware")
const upload = multer();

router.post("/signup", signup);
router.post("/verify-otp", verifyOtp);
router.post("/resend-otp", resendOtp);
router.post("/login", login);
router.post("/loginFromPassword", loginFromPassword);
router.put("/updateHost", authMiddleware(["host"]),upload.single("profileImageUrl"),updateHost);
router.delete("/deleteHost", authMiddleware(["host"]),deleteHost);
router.get("/getHost", authMiddleware(["host"]),getHost);



module.exports = router;