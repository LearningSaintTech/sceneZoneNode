const artist = require("../../models/Auth/Auth"); // Correct model name
const ArtistProfile = require("../../models/Profile/profile")
const Otp = require("../../models/OTP/OTP");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { apiResponse } = require("../../../utils/apiResponse");
const HostAuth = require("../../../Host/models/Auth/Auth");
const UserAuth = require("../../../User/models/Auth/Auth");
const mongoose=require("mongoose")
const ArtistAuthentication=require("../../../Artist/models/Auth/Auth")

require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET;
const generateOTP = () => Math.floor(1000 + Math.random() * 9000).toString();

// signup
exports.signup = async (req, res) => {
  const { fullName, mobileNumber, password, isRememberMe } = req.body;

  try {

    // Check if number exists in Host or User Auth collections
    const hostExists = await HostAuth.findOne({ mobileNumber });
    if (hostExists) {
      return apiResponse(res, {
        success: false,
        statusCode: 400,
        message: "This mobile number is already registered as a Host. Use a different number.",
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
    const existingUser = await artist.findOne({ mobileNumber }); // Consistency in field name

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
      existingUser.fullName = fullName;
      existingUser.mobileNumber = mobileNumber;
      if (password) {
        existingUser.password = await bcrypt.hash(password, 10); // Hash password
      }
      user = await existingUser.save();
    } else {
      const hashedPassword = await bcrypt.hash(password, 10); // Hash password
      user = new artist({
        fullName,
        mobileNumber,
        password: hashedPassword, // Save hashed password
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
      data: { otp: otpCode },
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
  const { mobileNumber, code } = req.body; // Consistent field names

  try {
    // --- Check OTP record ---
    const otpRecord = await Otp.findOne({ mobileNumber, code }); // Consistency in field names

    if (!otpRecord) {
      return apiResponse(res, {
        success: false,
        message: "Invalid OTP",
        statusCode: 400,
      });
    }

    if (otpRecord.expiresAt < new Date()) {
      await Otp.deleteOne({ _id: otpRecord._id }); // clean up expired OTP
      return apiResponse(res, {
        success: false,
        message: "OTP has expired",
        statusCode: 400,
      });
    }

    // --- Verify user ---
    const user = await artist.findOneAndUpdate(
      { mobileNumber }, // Consistent field names
      { isVerified: true },
      { new: true }
    );

    if (!user) {
      return apiResponse(res, {
        success: false,
        message: "User not found",
        statusCode: 404,
      });
    }

    // --- Clean up OTP after verification ---
    await Otp.deleteOne({ _id: otpRecord._id });

    // --- Generate JWT token ---
    const token = jwt.sign(
      { artistId: user._id, role: user.role },
      JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    return apiResponse(res, {
      message: "Phone verified successfully",
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
    let user;

    // Check for valid input
    if (!mobileNumber && !email) {
      return apiResponse(res, {
        success: false,
        message: "Please provide either a mobile number or an email.",
        statusCode: 400,
      });
    }

    // Find artist by mobileNumber or email
    if (mobileNumber) {
      user = await artist.findOne({ mobileNumber });
      if (!user) {
        return apiResponse(res, {
          success: false,
          message: "Artist with this phone number does not exist",
          statusCode: 404,
        });
      }
      await Otp.deleteMany({ mobileNumber });
    } else if (email) {
      console.log("emaill",email)
      user = await ArtistProfile.findOne({ email });
      console.log("artistemaill",user)
      if (!user) {
        return apiResponse(res, {
          success: false,
          message: "Artist with this email does not exist",
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
};

exports.login = async (req, res) => {
  console.log("111");
  const { mobileNumber } = req.body;

  try {
    // Check if user exists
    const user = await artist.findOne({ mobileNumber });
    if (!user) {
      return apiResponse(res, {
        success: false,
        message: "Phone number is not registered.Signup first",
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
      success: true,
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



exports.loginWithPassword = async (req, res) => {
  const { mobileNumber, password } = req.body;

  try {
    const user = await artist.findOne({ mobileNumber });
    if (!user) {
      return apiResponse(res, {
        success: false,
        message: "Artist not found",
        statusCode: 404,
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return apiResponse(res, {
        success: false,
        message: "Invalid password",
        statusCode: 400,
      });
    }

    const token = jwt.sign(
      { artistId: user._id, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return apiResponse(res, {
      message: "Login successful",
      data: { token, user },
    });
  } catch (error) {
    console.error("Password login error:", error);
    return apiResponse(res, {
      success: false,
      message: "Login failed",
      data: { error: error.message },
      statusCode: 500,
    });
  }
};

// Get Artist
exports.getArtists = async (req, res) => {
  try {
    const { artistId } = req.user;

    // Validate artistId
    if (!mongoose.isValidObjectId(artistId)) {
      return apiResponse(res, {
        success: false,
        statusCode: 400,
        message: "Invalid artist ID.",
      });
    }

    // Fetch artist, excluding password
    const artist = await ArtistAuthentication.findById(artistId).select("-password");

    if (!artist) {
      return apiResponse(res, {
        success: false,
        statusCode: 404,
        message: "Artist not found",
      });
    }

    return apiResponse(res, {
      success: true,
      statusCode: 200,
      message: "Artist fetched successfully",
      data: artist,
    });
  } catch (err) {
    console.error("Get Artist Error:", err);
    return apiResponse(res, {
      success: false,
      statusCode: 500,
      message: "Server error",
      data: { error: err.message },
    });
  }
};