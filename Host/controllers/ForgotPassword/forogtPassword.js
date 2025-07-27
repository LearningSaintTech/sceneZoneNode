const Host = require("../../models/Auth/Auth");
const Otp = require("../../models/OTP/OTP");
const bcrypt = require("bcryptjs");
const { sendEmail } = require("../../../utils/emailService");
const { apiResponse } = require("../../../utils/apiResponse");

const generateOTP = () => Math.floor(1000 + Math.random() * 9000).toString();

exports.emailNumberSendOtp = async (req, res) => {
  const { email, mobileNumber } = req.body;

  // Validate that at least one of email or mobileNumber is provided
  if (!email && !mobileNumber) {
    return apiResponse(res, {
      success: false,
      message: "Either email or mobileNumber is required",
      statusCode: 400,
    });
  }

  try {
    let otpCode;
    let host;

    // Check if user exists with provided email or mobileNumber
    const query = {};
    if (email) query.email = email;
    if (mobileNumber) query.mobileNumber = mobileNumber;
    
    host = await Host.findOne({ $or: [query] });
    if (!host) {
      return apiResponse(res, {
        success: false,
        message: "Email or mobile number not found",
        statusCode: 404,
      });
    }

    // Generate OTP
    otpCode = generateOTP();

    // Delete existing OTPs
    await Otp.deleteMany({ $or: [{ email }, { mobileNumber }] });

    // Save OTP to database
    const otp = new Otp({
      email: email || host.email,
      mobileNumber: mobileNumber || host.mobileNumber,
      code: otpCode,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });
    await otp.save();

    // If email is provided, send OTP via email
    if (email) {
      await sendEmail(
        email,
        "Your OTP Code",
        `Your OTP is ${otpCode}. It expires in 5 minutes.`
      );
    }

    // Return OTP in response (remove otpCode from response in production)
    return apiResponse(res, {
      success: true,
      message: email ? "OTP sent to host email" : "OTP generated for mobile number",
      data: { otp: otpCode }, // Remove in production
      statusCode: 200,
    });
  } catch (error) {
    console.error("Send OTP error:", error);
    return apiResponse(res, {
      success: false,
      message: "Failed to send OTP",
      error: error.message,
      statusCode: 500,
    });
  }
};

exports.verifyEmailNumberOtp = async (req, res) => {
  const { email, mobileNumber, code } = req.body;

  // Validate that at least one of email or mobileNumber is provided
  if (!email && !mobileNumber) {
    return apiResponse(res, {
      success: false,
      message: "Either email or mobileNumber is required",
      statusCode: 400,
    });
  }

  try {
    // Build query to find OTP record
    const query = { code };
    if (email) query.email = email;
    if (mobileNumber) query.mobileNumber = mobileNumber;

    const otpRecord = await Otp.findOne(query);
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

    let user;
    if (email) {
      user = await Host.findOne({ email });
      if (!user) {
        return apiResponse(res, {
          success: false,
          message: "Host not found",
          statusCode: 404,
        });
      }
      user.isEmailVerified = true;
    } else if (mobileNumber) {
      user = await Host.findOne({ mobileNumber });
      if (!user) {
        return apiResponse(res, {
          success: false,
          message: "Host not found",
          statusCode: 404,
        });
      }
      user.isMobileVerified = true;
    }

    await user.save();
    await Otp.deleteOne({ _id: otpRecord._id });

    return apiResponse(res, {
      success: true,
      message: email ? "Host email verified successfully" : "Host mobile number verified successfully",
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
  const { email, mobileNumber, password } = req.body;

  // Validate that at least one of email or mobileNumber is provided
  if (!email && !mobileNumber) {
    return apiResponse(res, {
      success: false,
      message: "Either email or mobileNumber is required",
      statusCode: 400,
    });
  }

  try {
    let user;
    if (email) {
      user = await Host.findOne({ email });
      if (!user) {
        return apiResponse(res, {
          success: false,
          message: "Host with this email not found",
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
    } else if (mobileNumber) {
      user = await Host.findOne({ mobileNumber });
      if (!user) {
        return apiResponse(res, {
          success: false,
          message: "Host with this mobile number not found",
          statusCode: 404,
        });
      }
      if (!user.isMobileVerified) {
        return apiResponse(res, {
          success: false,
          message: "Mobile number is not verified",
          statusCode: 400,
        });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    user.isEmailVerified = false; // Reset after password change
    user.isMobileVerified = false; // Reset after password change
    await user.save();

    return apiResponse(res, {
      success: true,
      message: "Host password updated successfully",
    });
  } catch (error) {
    console.error("Set Host Password error:", error);
    return apiResponse(res, {
      success: false,
      message: "Failed to update password",
      data: { error: error.message },
      statusCode: 500,
    });
  }
};