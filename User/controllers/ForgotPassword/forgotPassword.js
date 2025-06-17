const Otp = require("../../models/OTP/OTP");
const UserProfile = require("../../models/Profile/UserProfile");
const User = require("../../models/Auth/Auth");
const { sendEmail } = require("../../../utils/emailService");
const { apiResponse } = require("../../../utils/apiResponse");
const bcrypt = require("bcryptjs");

const generateOTP = () => Math.floor(1000 + Math.random() * 9000).toString();

exports.emailSendOtp = async (req, res) => {
  const { email } = req.body;

  try {
    const profile = await UserProfile.findOne({ email });
    if (!profile) {
      return apiResponse(res, {
        success: false,
        message: "Email not found in UserProfile",
        statusCode: 404,
      });
    }

    const otpCode = generateOTP();
    await Otp.deleteMany({ email });

    const otp = new Otp({
      email,
      code: otpCode,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });
    await otp.save();

    sendEmail(
      email,
      "Your OTP Code",
      `Your OTP is ${otpCode}. It expires in 5 minutes.`
    );

    return apiResponse(res, {
      message: "OTP sent to user email",
      data: { otp: otpCode }, // Remove in production
    });
  } catch (error) {
    console.error("Send User OTP error:", error);
    return apiResponse(res, {
      success: false,
      message: "Failed to send OTP",
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

    const profile = await UserProfile.findOne({ email });
    if (!profile) {
      return apiResponse(res, {
        success: false,
        message: "UserProfile not found",
        statusCode: 404,
      });
    }

    const user = await User.findById(profile.userId);
    if (!user) {
      return apiResponse(res, {
        success: false,
        message: "User not found",
        statusCode: 404,
      });
    }

    user.isEmailVerified = true;
    await user.save();
    await Otp.deleteOne({ _id: otpRecord._id });

    return apiResponse(res, {
      message: "User email verified successfully",
      success: true,
    });
  } catch (error) {
    console.error("Verify User OTP error:", error);
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
    const profile = await UserProfile.findOne({ email });
    if (!profile) {
      return apiResponse(res, {
        success: false,
        message: "Profile with this email not found",
        statusCode: 404,
      });
    }

    const user = await User.findById(profile.userId);
    if (!user) {
      return apiResponse(res, {
        success: false,
        message: "User not found",
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
    user.isEmailVerified = false;
    await user.save();

    return apiResponse(res, {
      message: "User password updated successfully",
      success: true,
    });
  } catch (error) {
    console.error("Set User Password error:", error);
    return apiResponse(res, {
      success: false,
      message: "Failed to update password",
      data: { error: error.message },
      statusCode: 500,
    });
  }
};
  