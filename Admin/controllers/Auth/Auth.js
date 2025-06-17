const Admin = require("../../models/Auth/Auth");
const Otp = require("../../models/OTP/Otp");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { apiResponse } = require("../../../utils/apiResponse");
const AdminProfile = require("../../models/Profile/profile");

require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET;
const generateOTP = () => Math.floor(1000 + Math.random() * 9000).toString();

// Admin Signup
exports.signup = async (req, res) => {
  const { fullName, mobileNumber, password, isRememberMe } = req.body;

  try {
    const existingAdmin = await Admin.findOne({ mobileNumber });

    if (existingAdmin && existingAdmin.isVerified) {
      return apiResponse(res, {
        success: false,
        message: "Admin already registered and verified",
        statusCode: 400,
      });
    }

    let admin;

    if (existingAdmin && !existingAdmin.isVerified) {
      existingAdmin.fullName = fullName;
      existingAdmin.password = await bcrypt.hash(password, 10);
      existingAdmin.isRememberMe = isRememberMe;
      admin = await existingAdmin.save();
    } else {
      const hashedPassword = await bcrypt.hash(password, 10);
      admin = new Admin({
        fullName,
        mobileNumber,
        password: hashedPassword,
        isRememberMe,
      });
      await admin.save();
    }

    // ✅ Create AdminProfile with fullName & mobileNumber auto-filled
    const existingProfile = await AdminProfile.findOne({ adminId: admin._id });

    if (!existingProfile) {
      const profile = new AdminProfile({
        adminId: admin._id,
        fullName: admin.fullName,
        mobileNumber: admin.mobileNumber,
        dob: null,
        gender: null,
        address: null,
        city: null,
        pincode: null,
        email:null,
        state: null
      });
      await profile.save();
    }

    // Generate & save OTP
    await Otp.deleteMany({ mobileNumber });

    const otpCode = generateOTP();
    const otp = new Otp({
      mobileNumber,
      code: otpCode,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
    });

    await otp.save();

    return apiResponse(res, {
      message: "OTP sent",
      data: { otp: otpCode },
    });
  } catch (error) {
    return apiResponse(res, {
      success: false,
      message: "Admin Signup Failed",
      data: { error: error.message },
      statusCode: 500,
    });
  }
};

// Admin OTP Verification
exports.verifyOtp = async (req, res) => {
  const { mobileNumber, code } = req.body;

  try {
    const otpRecord = await Otp.findOne({ mobileNumber, code });

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

    const admin = await Admin.findOneAndUpdate(
      { mobileNumber },
      { isVerified: true },
      { new: true }
    );

    await Otp.deleteOne({ _id: otpRecord._id });

    const token = jwt.sign(
      { adminId: admin._id, role: admin.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return apiResponse(res, {
      message: "Phone verified successfully",
      data: { token, admin },
    });
  } catch (error) {
    return apiResponse(res, {
      success: false,
      message: "OTP verification failed",
      data: { error: error.message },
      statusCode: 500,
    });
  }
};

// Resend OTP
exports.resendOtp = async (req, res) => {
  const { mobileNumber } = req.body;

  try {
    const admin = await Admin.findOne({ mobileNumber });
    if (!admin) {
      return apiResponse(res, {
        success: false,
        message: "Admin not found",
        statusCode: 404,
      });
    }

    await Otp.deleteMany({ mobileNumber });

    const otpCode = generateOTP();
    const otp = new Otp({
      mobileNumber,
      code: otpCode,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    await otp.save();

    return apiResponse(res, {
      message: "OTP resent successfully",
      data: { otp: otpCode },
    });
  } catch (error) {
    return apiResponse(res, {
      success: false,
      message: "Resend OTP failed",
      data: { error: error.message },
      statusCode: 500,
    });
  }
};

// Login with OTP
exports.login = async (req, res) => {
  const { mobileNumber } = req.body;

  try {
    const admin = await Admin.findOne({ mobileNumber });

    if (!admin) {
      return apiResponse(res, {
        success: false,
        message: "Admin not found",
        statusCode: 404,
      });
    }

    await Otp.deleteMany({ mobileNumber });

    const otpCode = generateOTP();
    const otp = new Otp({
      mobileNumber,
      code: otpCode,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    await otp.save();

    return apiResponse(res, {
      message: "OTP sent successfully",
      data: { otp: otpCode },
    });
  } catch (error) {
    return apiResponse(res, {
      success: false,
      message: "Login failed",
      data: { error: error.message },
      statusCode: 500,
    });
  }
};

// Login with Password
exports.loginWithPassword = async (req, res) => {
  const { mobileNumber, password } = req.body;

  try {
    const admin = await Admin.findOne({ mobileNumber });

    if (!admin) {
      return apiResponse(res, {
        success: false,
        message: "Admin not found",
        statusCode: 404,
      });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return apiResponse(res, {
        success: false,
        message: "Invalid password",
        statusCode: 400,
      });
    }

    const token = jwt.sign(
      { adminId: admin._id, role: admin.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return apiResponse(res, {
      message: "Login successful",
      data: { token, admin },
    });
  } catch (error) {
    return apiResponse(res, {
      success: false,
      message: "Login failed",
      data: { error: error.message },
      statusCode: 500,
    });
  }
};
