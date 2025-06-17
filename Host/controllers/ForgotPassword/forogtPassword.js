const Host = require("../../models/Auth/Auth"); // Correct model name
const Otp = require("../../models/OTP/OTP");
const jwt = require("jsonwebtoken");
const HostProfile = require("../../models/Profile/profile");
const bcrypt = require('bcryptjs');
const {sendEmail} = require("../../../utils/emailService");
const { apiResponse } = require("../../../utils/apiResponse");



const generateOTP = () => Math.floor(1000 + Math.random() * 9000).toString();

exports.emailSendOtp = async (req, res) => {
  const { email } = req.body;
  console.log("email",email);

  try {
    //  Validate that email exists in HostProfile
    const host = await HostProfile.findOne({ email });
    console.log("11",host)
    if (!host) {
      return apiResponse(res, {
        success: false,
        message: "Email is not registered as a Host",
        statusCode: 404,
      });
    }

    //  Generate new OTP
    const otpCode = generateOTP();

    //  Remove existing OTPs
    await Otp.deleteMany({ email });

    // Save new OTP
    const otp = new Otp({
      email,
      code: otpCode,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
    });
    await otp.save();

    //  Send email using utility
    sendEmail(
      email,
      "Your OTP Code",
      `Your OTP code is ${otpCode}. It will expire in 5 minutes.`
    );

    return apiResponse(res, {
      message: "OTP sent to email",
      data: { otp: otpCode }, // ⚠️ For testing only
    });
  } catch (error) {
    console.error("Email OTP error:", error);
    return apiResponse(res, {
      success: false,
      message: "Failed to send OTP to email",
      data: { error: error.message },
      statusCode: 500,
    });
  }
};



exports.verifyEmailOtp = async (req, res) => {
  const { email, code } = req.body;

  try {
    const otpRecord = await Otp.findOne({ email, code });


    if (!otpRecord) {
      return apiResponse(res, {
        success: false,
        message: "Invalid OTP",
        statusCode: 400,
      });
    }


    if (otpRecord.expiresAt < new Date()) {
      await Otp.deleteOne({ _id: otpRecord._id });
      return apiResponse(res, {
        success: false,
        message: "OTP expired",
        statusCode: 400,
      });
    }



    const profile = await HostProfile.findOne({ email });
    if (!profile) {
      return apiResponse(res, {
        success: false,
        message: "Email not found in profile",
        statusCode: 404,
      });
    }

    const user = await Host.findById(profile.hostId);
    if (!user) {
      return apiResponse(res, {
        success: false,
        message: "Host not found",
        statusCode: 404,
      });
    }

    user.isEmailVerified = true;
    await user.save();
    await Otp.deleteOne({ _id: otpRecord._id });

    return apiResponse(res, {
      message: "Email verified successfully",
      success: true,
    });
  } catch (error) {
    console.error("Verify OTP error:", error);
    return apiResponse(res, {
      success: false,
      message: "OTP verification failed",
      data: { error: error.message },
      statusCode: 500,
    });
  }
};



exports.setNewPassword = async (req, res) => {
  const { email, password } = req.body;

  try {
    const profile = await HostProfile.findOne({ email });
    if (!profile) {
      return apiResponse(res, {
        success: false,
        message: "Profile with this email not found",
        statusCode: 404,
      });
    }

    const user = await Host.findById(profile.hostId);
    if (!user) {
      return apiResponse(res, {
        success: false,
        message: "Host not found",
        statusCode: 404,
      });
    }

    if (!user.isEmailVerified) {
      return apiResponse(res, {
        success: false,
        message: "Email is not verified",
        statusCode: 400,
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    user.isEmailVerified = false; // reset email verified flag
    await user.save();

    return apiResponse(res, {
      message: "Password updated successfully",
      success: true,
    });
  } catch (error) {
    console.error("Set password error:", error);
    return apiResponse(res, {
      success: false,
      message: "Failed to update password",
      data: { error: error.message },
      statusCode: 500,
    });
  }
};
