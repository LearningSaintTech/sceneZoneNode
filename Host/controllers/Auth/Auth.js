const Host = require("../../models/Auth/Auth");
const Otp = require("../../models/OTP/OTP");
const jwt = require("jsonwebtoken");
const HostProfile = require("../../models/Profile/profile");
const bcrypt = require("bcryptjs");
const ArtistAuth = require("../../../Artist/models/Auth/Auth");
const UserAuth = require("../../../User/models/Auth/Auth");
const { apiResponse } = require("../../../utils/apiResponse");
const { uploadImage, deleteImage } = require("../../../utils/s3Functions");

require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET;
const generateOTP = () => Math.floor(1000 + Math.random() * 9000).toString();

// Signup
exports.signup = async (req, res) => {
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

    const existingUser = await Host.findOne({ mobileNumber });

    if (existingUser && existingUser.isVerified) {
      return apiResponse(res, {
        success: false,
        statusCode: 400,
        message: "Phone Number already registered and verified",
      });
    }

    let user;
    if (existingUser && !existingUser.isVerified) {
      existingUser.fullName = fullName;
      existingUser.mobileNumber = mobileNumber;
      existingUser.location = location;
      if (password) {
        existingUser.password = await bcrypt.hash(password, 10);
      }
      existingUser.isRememberMe = isRememberMe;
      user = await existingUser.save();
    } else {
      const hashedPassword = await bcrypt.hash(password, 10);
      user = new Host({
        fullName,
        mobileNumber,
        location,
        password: hashedPassword,
        isRememberMe,
      });
      await user.save();
    }

    const otpCode = generateOTP();
    await Otp.deleteMany({ mobileNumber });

    const otp = new Otp({
      mobileNumber,
      code: otpCode,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });
    await otp.save();

    return apiResponse(res, {
      success: true,
      message: "OTP sent successfully",
      data: { otp: otpCode },
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

// Verify OTP
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
        message: "OTP has expired",
        statusCode: 400,
      });
    }

    const user = await Host.findOneAndUpdate(
      { mobileNumber },
      { isVerified: true, isMobileVerified: true },
      { new: true }
    );

    if (!user) {
      return apiResponse(res, {
        success: false,
        message: "Host not found",
        statusCode: 404,
      });
    }

    await Otp.deleteOne({ _id: otpRecord._id });

    const token = jwt.sign(
      { hostId: user._id, role: user.role },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.setHeader("Authorization", `Bearer ${token}`);

    return apiResponse(res, {
      success: true,
      message: "Phone Number verified successfully",
      data: { user },
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

// Resend OTP
exports.resendOtp = async (req, res) => {
  const { mobileNumber, email } = req.body;

  try {
    if (!mobileNumber && !email) {
      return apiResponse(res, {
        success: false,
        message: "Please provide either a mobile number or an email.",
        statusCode: 400,
      });
    }

    let user;
    if (mobileNumber) {
      user = await Host.findOne({ mobileNumber });
      if (!user) {
        return apiResponse(res, {
          success: false,
          message: "Host with this phone number does not exist",
          statusCode: 404,
        });
      }
      await Otp.deleteMany({ mobileNumber });
    } else if (email) {
      user = await HostProfile.findOne({ email });
      if (!user) {
        return apiResponse(res, {
          success: false,
          message: "Host with this email does not exist",
          statusCode: 404,
        });
      }
      await Otp.deleteMany({ email });
    }

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
      success: true,
      message: "OTP resent successfully",
      data: { otp: otpCode },
    });
  } catch (error) {
    console.error("Error resending OTP:", error);
    return apiResponse(res, {
      success: false,
      message: "Resending OTP failed",
      error: error.message,
      statusCode: 500,
    });
  }
};

// Login
exports.login = async (req, res) => {
  const { mobileNumber } = req.body;

  try {
    const user = await Host.findOne({ mobileNumber });
    if (!user) {
      return apiResponse(res, {
        success: false,
        message: "Host not found",
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
      success: true,
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

// Login with Password
exports.loginFromPassword = async (req, res) => {
  const { mobileNumber, password } = req.body;

  try {
    const user = await Host.findOne({ mobileNumber });
    if (!user) {
      return apiResponse(res, {
        success: false,
        message: "Host not found",
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
      { hostId: user._id, role: user.role },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.setHeader("Authorization", `Bearer ${token}`);

    return apiResponse(res, {
      success: true,
      message: "Login successful",
      data: { user },
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

// Get Host
exports.getHost = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return apiResponse(res, {
        success: false,
        message: "Authorization token missing",
        statusCode: 401,
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const hostId = decoded.hostId;

    const user = await Host.findById(hostId).select("-password");

    if (!user) {
      return apiResponse(res, {
        success: false,
        message: "Host not found",
        statusCode: 404,
      });
    }

    return apiResponse(res, {
      success: true,
      message: "Host fetched successfully",
      data: { user },
    });
  } catch (error) {
    console.error("Get host error:", error);
    return apiResponse(res, {
      success: false,
      message: "Failed to fetch host",
      error: error.message,
      statusCode: 500,
    });
  }
};

// Update Host
exports.updateHost = async (req, res) => {
  try {
    const { fullName, location, email, mobileNumber } = req.body;
    const hostId = req.user.hostId; // From authMiddleware

    const updateData = {};
    if (fullName) updateData.fullName = fullName;
    if (location) updateData.location = location;
    if (email) updateData.email = email;
    if (mobileNumber) updateData.mobileNumber = mobileNumber;

    // Handle profile image update
    if (req.file) {
      console.log("Uploading new profile image:", req.file.originalname);
      const newFileName = `Host/profileImage/host_${hostId}_${Date.now()}-${req.file.originalname}`;
      const newProfileImageUrl = await uploadImage(req.file, newFileName);

      // Fetch current user to check for existing profile image
      const currentUser = await Host.findById(hostId);
      if (!currentUser) {
        return apiResponse(res, {
          success: false,
          message: "Host not found",
          statusCode: 404,
        });
      }

      // Delete old profile image if it exists
      if (currentUser.profileImageUrl) {
        try {
          const oldFileName = currentUser.profileImageUrl.split(".com/")[1];
          await deleteImage(oldFileName);
        } catch (error) {
          console.warn("Failed to delete old profile image:", error.message);
        }
      }

      updateData.profileImageUrl = newProfileImageUrl;
    }

    const user = await Host.findByIdAndUpdate(
      hostId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) {
      return apiResponse(res, {
        success: false,
        message: "Host not found",
        statusCode: 404,
      });
    }

    return apiResponse(res, {
      success: true,
      message: "Host updated successfully",
      data: { user },
    });
  } catch (error) {
    console.error("Update host error:", error);
    return apiResponse(res, {
      success: false,
      message: "Failed to update host",
      error: error.message,
      statusCode: error.message.includes("Only images") ? 400 : 500,
    });
  }
};

// Delete Host
exports.deleteHost = async (req, res) => {
  try {
    const hostId = req.user.hostId; // Use hostId from authMiddleware

    const user = await Host.findByIdAndDelete(hostId);

    if (!user) {
      return apiResponse(res, {
        success: false,
        message: "Host not found",
        statusCode: 404,
      });
    }

    // Clean up related OTP records
    await Otp.deleteMany({ mobileNumber: user.mobileNumber });

    return apiResponse(res, {
      success: true,
      message: "Host deleted successfully",
    });
  } catch (error) {
    console.error("Delete host error:", error);
    return apiResponse(res, {
      success: false,
      message: "Failed to delete host",
      error: error.message,
      statusCode: 500,
    });
  }
};
