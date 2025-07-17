const User = require("../../models/Auth/Auth"); // Correct model name
const UserProfile = require("../../models/Profile/UserProfile")
const Otp = require("../../models/OTP/OTP");
const jwt = require("jsonwebtoken");
const HostAuth = require("../../../Host/models/Auth/Auth");
const ArtistAuth = require("../../../Artist/models/Auth/Auth");
const { apiResponse } = require("../../../utils/apiResponse");
const bcrypt = require("bcryptjs");

require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET;
const generateOTP = () => Math.floor(1000 + Math.random() * 9000).toString();

// signup
exports.signup = async (req, res) => {
  const { fullName, mobileNumber, password, isRememberMe } = req.body;

  try {
    // Validate input
    if (!fullName || !mobileNumber || !password) {
      return apiResponse(res, {
        success: false,
        statusCode: 400,
        message: "Full name, mobile number, and password are required",
      });
    }

    // Check if number exists in Host or Artist Auth collections
    const hostExists = await HostAuth.findOne({ mobileNumber });
    if (hostExists) {
      return apiResponse(res, {
        success: false,
        statusCode: 400,
        message: "This mobile number is already registered as a Host. Use a different number",
      });
    }

    const artistExists = await ArtistAuth.findOne({ mobileNumber });
    if (artistExists) {
      return apiResponse(res, {
        success: false,
        statusCode: 400,
        message: "This mobile number is already registered as an Artist. Use a different number",
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({ mobileNumber });
    if (existingUser && existingUser.isMobileVerified) {
      return apiResponse(res, {
        success: false,
        statusCode: 400,
        message: "Phone number already registered and verified",
      });
    }

    let user;
    if (existingUser && !existingUser.isMobileVerified) {
      // Update existing unverified user
      existingUser.fullName = fullName;
      existingUser.mobileNumber = mobileNumber;
      existingUser.password = await bcrypt.hash(password, 10);
      existingUser.isRememberMe = isRememberMe || false;
      user = await existingUser.save();
    } else {
      // Create new user
      const hashedPassword = await bcrypt.hash(password, 10);
      user = new User({
        fullName,
        mobileNumber,
        password: hashedPassword,
        isRememberMe: isRememberMe || false,
      });
      await user.save();
    }

    // Generate OTP
    const otpCode = generateOTP();
    await Otp.deleteMany({ mobileNumber });
    const otp = new Otp({
      mobileNumber,
      code: otpCode,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });
    await otp.save();

    // TODO: Send OTP via SMS (e.g., integrate with an SMS service)
    console.log(`OTP for ${mobileNumber}: ${otpCode}`); // For testing only

    return apiResponse(res, {
      success: true,
      message: "OTP sent successfully",
      data:otp.code
    });
  } catch (error) {
    console.error("Signup error:", error);
    return apiResponse(res, {
      success: false,
      message: "Signup failed",
      error: error.message,
      statusCode: 500,
    });
  }
};

exports.verifyOtp = async (req, res) => {
  const { mobileNumber, code } = req.body;

  try {
    // Validate OTP
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

    // Find and update user
    const user = await User.findOne({ mobileNumber });
    if (!user) {
      return apiResponse(res, {
        success: false,
        message: "User not found",
        statusCode: 404,
      });
    }

    // if (user.isMobileVerified) {
    //   return apiResponse(res, {
    //     success: false,
    //     message: "Mobile number already verified",
    //     statusCode: 400,
    //   });
    // }

    // Update verification status
    user.isMobileVerified = true;
    user.isVerified = true; // Set to true if mobile verification is the only step
    await user.save();

    // Clean up OTP
    await Otp.deleteOne({ _id: otpRecord._id });

    // Generate JWT token
    const token = jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, {
      expiresIn: "24h",
    });

    // Set token in response header
    res.setHeader("Authorization", `Bearer ${token}`);

    return apiResponse(res, {
      success: true,
      message: "Mobile number verified successfully",
      data: { user: await User.findById(user._id).select("-password") },
    });
  } catch (error) {
    console.error("OTP verification error:", error);
    return apiResponse(res, {
      success: false,
      message: "OTP verification failed",
      error: error.message,
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

    // Find user by mobileNumber or email
    if (mobileNumber) {
      user = await User.findOne({ mobileNumber });
      if (!user) {
        return apiResponse(res, {
          success: false,
          message: "User with this phone number does not exist",
          statusCode: 404,
        });
      }
      await Otp.deleteMany({ mobileNumber });
    } else if (email) {
      user = await UserProfile.findOne({ email });
      if (!user) {
        return apiResponse(res, {
          success: false,
          message: "User with this email does not exist",
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
    const user = await User.findOne({ mobileNumber });
    if (!user) {
      return apiResponse(res, {
        success: false,
        message: "User not found",
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
      error: error.message,
      statusCode: 500,
    });
  }
};


exports.loginWithPassword = async (req, res) => {
  const { mobileNumber, password } = req.body;
console.log("mobileNumber",mobileNumber)
console.log("password",password)

  try {
    // Find user by mobile number
    const user = await User.findOne({ mobileNumber: mobileNumber});
    console.log("user",user)
    if (!user) {
      return apiResponse(res, {
        success: false,
        message: "User not found",
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

    const token = jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, {
  expiresIn: "24h",
});

// Set token in response header
res.setHeader("Authorization", `Bearer ${token}`);

return apiResponse(res, {
  message: "Login successful",
  data: { user }, // You can still include `token` here if you want
});
  } catch (error) {
    console.error("Login with password error:", error);
    return apiResponse(res, {
      success: false,
      message: "Login failed",
      error: error.message,
      statusCode: 500,
    });
  }
};

exports.getUser = async (req, res) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return apiResponse(res, {
        success: false,
        message: "Authorization token missing",
        statusCode: 401,
      });
    }

    const token = authHeader.split(" ")[1];

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;

    // Fetch user from database
    const user = await User.findById(userId).select("-password"); // Exclude password

    if (!user) {
      return apiResponse(res, {
        success: false,
        message: "User not found",
        statusCode: 404,
      });
    }

    return apiResponse(res, {
      message: "User fetched successfully",
      data: { user },
    });
  } catch (error) {
    console.error("Get user error:", error);
    return apiResponse(res, {
      success: false,
      message: "Failed to fetch user",
      error: error.message,
      statusCode: 500,
    });
  }
};
