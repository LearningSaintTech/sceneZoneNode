const Host = require("../../models/Auth/Auth"); // Correct model name
const Otp = require("../../models/OTP/OTP");
const jwt = require("jsonwebtoken");
const HostProfile = require("../../models/Profile/profile");
const bcrypt = require('bcryptjs');
const ArtistAuth = require("../../../Artist/models/Auth/Auth");
const UserAuth = require("../../../User/models/Auth/Auth");
const { apiResponse } = require("../../../utils/apiResponse");

require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET;
const generateOTP = () => Math.floor(1000 + Math.random() * 9000).toString();

// signup
exports.signup = async (req, res) => {
  console.log("signupp hitted");
  const { fullName, mobileNumber, location, password, isRememberMe } = req.body;

  try {

    // Check if number exists in Artist or User Auth collections
    const artistExists = await ArtistAuth.findOne({ mobileNumber });
    if (artistExists) {
      return apiResponse(res, {
        success: false,
        statusCode: 400,
        message: "This mobile number is already registered as an Artist. Use a different number.",
      });
    }

    const userExists = await UserAuth.findOne({ mobileNumber });
    if (userExists) {
      return apiResponse(res, {
        success: false,
        statusCode: 400,
        message: "This mobile number is already registered as a User. Use a different number.",
      });
    }

    // Fix: search by mobileNumber
    const existingUser = await Host.findOne({ mobileNumber }); // Consistency in field name

    // Case: Already registered and verified
    if (existingUser && existingUser.isVerified) {
      return apiResponse(res, {
        success: false,
        message: "Phone Number already registered and verified",
        statusCode: 400,
      });
    }

    let user;
    if (existingUser && !existingUser.isVerified) {
      // Case: User exists but not verified → update user details
      existingUser.fullName = fullName;
      existingUser.mobileNumber = mobileNumber;
      existingUser.location = location; // Added location field
      if (password) {
        existingUser.password = await bcrypt.hash(password, 10); // Hash password
      }
      existingUser.isRememberMe = isRememberMe;
      user = await existingUser.save();
    } else {
      const hashedPassword = await bcrypt.hash(password, 10);
      // Case: Fresh new user
      user = new Host({
        fullName,
        mobileNumber,
        location, // Added location field
        password: hashedPassword,
        isRememberMe,
      });
      await user.save();
    }

    // Generate new OTP
    const otpCode = generateOTP();

    // Remove previous OTPs for this mobile number if any
    await Otp.deleteMany({ mobileNumber });

    const otp = new Otp({
      mobileNumber, // Consistent field name with User model
      code: otpCode,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // OTP valid for 5 minutes
    });
    await otp.save();

    return apiResponse(res, {
      message: "OTP sent",
      data: { otp: otpCode }, // Return in `data` field
    });
  } catch (error) {
    console.error("Signup error:", error);
    return apiResponse(res, {
      success: false,
      message: "Signup failed",
      data: { error: error.message },
      statusCode: 500,
    });
  }
};

exports.verifyOtp = async (req, res) => {
  const { mobileNumber,code } = req.body;

  try {
    // --- Find OTP ---
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
        message: "OTP has expired",
        statusCode: 400,
      });
    }

    // --- Verify the host ---
    const user = await Host.findOneAndUpdate(
      { mobileNumber },
      { isVerified: true },
      { new: true }
    );

    if (!user) {
      return apiResponse(res, {
        success: false,
        message: "Host not found",
        statusCode: 404,
      });
    }

    // --- Create profile if not already exists ---
    const existingProfile = await HostProfile.findOne({ hostId: user._id });
    if (!existingProfile) {
      const newProfile = new HostProfile({
        hostId: user._id,
        fullName: user.fullName,
        mobileNumber: user.mobileNumber,
        location: user.location,
        email: null,
        profileImageUrl: null,
        isProfile: true,
      });

      await newProfile.save();
    }

    // --- Clean up OTP ---
    await Otp.deleteOne({ _id: otpRecord._id });

    // --- Generate token ---
    const token = jwt.sign({ hostId: user._id, role: user.role }, JWT_SECRET, {
      expiresIn: "7d",
    });

    return apiResponse(res, {
      message: "Phone Number verified successfully",
      data: { token, user },
    });
  } catch (error) {
    console.error("OTP verification error:", error);
    return apiResponse(res, {
      success: false,
      message: "OTP verification failed",
      data: { error: error.message },
      statusCode: 500,
    });
  }
};

exports.resendOtp = async (req, res) => {
  const { mobileNumber, email } = req.body;

  try {
    let host;

    // Check for valid input
    if (!mobileNumber && !email) {
      return apiResponse(res, {
        success: false,
        message: "Please provide either a mobile number or an email.",
        statusCode: 400,
      });
    }

    // Find host by mobileNumber or email
    if (mobileNumber) {
      host = await Host.findOne({ mobileNumber });
      if (!host) {
        return apiResponse(res, {
          success: false,
          message: "Host with this phone number does not exist",
          statusCode: 404,
        });
      }
      await Otp.deleteMany({ mobileNumber });
    } else if (email) {
      host = await HostProfile.findOne({ email });
      if (!host) {
        return apiResponse(res, {
          success: false,
          message: "Host with this email does not exist",
          statusCode: 404,
        });
      }
      await Otp.deleteMany({ email });
    }

    // Generate and save new OTP
    const otpCode = generateOTP();
    const otpData = {
      code: otpCode,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    };

    if (mobileNumber) otpData.mobileNumber = mobileNumber;
    if (email) otpData.email = email;

    const otp = new Otp(otpData);
    await otp.save();

    return apiResponse(res, {
      message: "OTP resent successfully",
      data: { otp: otpCode },
    });
  } catch (error) {
    console.error("Error resending OTP:", error);
    return apiResponse(res, {
      success: false,
      message: "Resending OTP failed",
      data: { error: error.message },
      statusCode: 500,
    });

  }
}

exports.login = async (req, res) => {
  const { mobileNumber } = req.body;

  try {
    // Check if user exists
    const user = await Host.findOne({ mobileNumber });
    if (!user) {
      return apiResponse(res, {
        success: false,
        message: "Host not found",
        statusCode: 404,
      });
    }

    // Delete existing OTPs for this number
    await Otp.deleteMany({ mobileNumber }); // FIXED: field name

    // Generate new OTP
    const otpCode = generateOTP();
    const otp = new Otp({
      mobileNumber, // FIXED: field name
      code: otpCode,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
    });

    await otp.save();

    return apiResponse(res, {
      message: "OTP sent successfully",
      data: { otp: otpCode },
    });
  } catch (error) {
    console.error("Login error:", error);
    return apiResponse(res, {
      success: false,
      message: "Login failed",
      data: { error: error.message },
      statusCode: 500,
    });
  }
};



exports.loginFromPassword = async (req, res) => {
  const { mobileNumber, password } = req.body;

  try {
    // Find user by mobile number
    const user = await Host.findOne({ mobileNumber });
    if (!user) {
      return apiResponse(res, {
        success: false,
        message: "Host not found",
        statusCode: 404,
      });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return apiResponse(res, {
        success: false,
        message: "Invalid password",
        statusCode: 400,
      });
    }

    // Generate JWT token
    const token = jwt.sign({ hostId: user._id, role: user.role }, JWT_SECRET, {
      expiresIn: "7d",
    });

    return apiResponse(res, {
      message: "Login successful",
      data: { token, user },
    });
  } catch (error) {
    console.error("Login from password error:", error);
    return apiResponse(res, {
      success: false,
      message: "Login failed",
      data: { error: error.message },
      statusCode: 500,
    });
  }
};


