const Otp = require("../../models/OTP/Otp");
const AdminProfile = require("../../models/Profile/profile");
const Admin = require("../../models/Auth/Auth");
const { sendEmail } = require("../../../utils/emailService");
const { apiResponse } = require("../../../utils/apiResponse");
const bcrypt = require("bcryptjs");

const generateOTP = () => Math.floor(1000 + Math.random() * 9000).toString();

// Send OTP
exports.emailSendOtp = async (req, res) => {
  const { email } = req.body;

  try {
    const profile = await AdminProfile.findOne({ email });
    if (!profile) {
      return apiResponse(res, {
        success: false,
        message: "Email not found in AdminProfile",
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
      message: "OTP sent to Admin email",
      data: { otp: otpCode }, 
    });
  } catch (error) {
    console.error("Send Admin OTP error:", error);
    return apiResponse(res, {
      success: false,
      message: "Failed to send OTP",
      data: { error: error.message },
      statusCode: 500,
    });
  }
};

// Verify OTP
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

    const profile = await AdminProfile.findOne({ email });
    if (!profile) {
      return apiResponse(res, {
        success: false,
        message: "AdminProfile not found",
        statusCode: 404,
      });
    }

    const admin = await Admin.findById(profile.adminId);
    if (!admin) {
      return apiResponse(res, {
        success: false,
        message: "Admin not found",
        statusCode: 404,
      });
    }

    admin.isEmailVerified = true;
    await admin.save(); 
    await Otp.deleteOne({ _id: otpRecord._id });

    return apiResponse(res, {
      message: "Admin email verified successfully",
      success: true,
    });
  } catch (error) {
    console.error("Verify Admin OTP error:", error);
    return apiResponse(res, {
      success: false,
      message: "OTP verification failed",
      data: { error: error.message },
      statusCode: 500,
    });
  }
};

// Set New Password
exports.setNewPassword = async (req, res) => {
  const { email, password } = req.body;

  try {
    const profile = await AdminProfile.findOne({ email });
    if (!profile) {
      return apiResponse(res, {
        success: false,
        message: "Profile with this email not found",
        statusCode: 404,
      });
    }

    const admin = await Admin.findById(profile.adminId); 
    if (!admin) {
      return apiResponse(res, {
        success: false,
        message: "Admin not found",
        statusCode: 404,
      });
    }

    if (!admin.isEmailVerified) {
      return apiResponse(res, {
        success: false,
        message: "Email is not verified",
        statusCode: 400,
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    admin.password = hashedPassword;
    admin.isEmailVerified = false; 
    await admin.save();

    return apiResponse(res, {
      message: "Admin password updated successfully",
      success: true,
    });
  } catch (error) {
    console.error("Set Admin Password error:", error);
    return apiResponse(res, {
      success: false,
      message: "Failed to update password",
      data: { error: error.message },
      statusCode: 500,
    });
  }
};
