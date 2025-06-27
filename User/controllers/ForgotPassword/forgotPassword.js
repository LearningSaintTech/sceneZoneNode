const Otp = require("../../models/OTP/OTP");
const UserProfile = require("../../models/Profile/UserProfile");
const User = require("../../models/Auth/Auth");
const { sendEmail } = require("../../../utils/emailService");
const { apiResponse } = require("../../../utils/apiResponse");
const bcrypt = require("bcryptjs");

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
    let userProfile;
    let userAuth;

    // If email is provided, fetch from UserProfile
    if (email) {
      userProfile = await UserProfile.findOne({ email });
      if (!userProfile) {
        return apiResponse(res, {
          success: false,
          message: "Email not found in UserProfile",
          statusCode: 404,
        });
      }
    }

    // If mobileNumber is provided, fetch from User
    if (mobileNumber) {
      userAuth = await User.findOne({ mobileNumber });
      if (!userAuth) {
        return apiResponse(res, {
          success: false,
          message: "Mobile number not found in User",
          statusCode: 404,
        });
      }
    }

    // Generate OTP
    otpCode = generateOTP();

    // Delete existing OTPs based on email, mobileNumber, or both
    const deleteQuery = {};
    if (email) deleteQuery.email = email;
    if (mobileNumber) deleteQuery.mobileNumber = mobileNumber;
    await Otp.deleteMany({ $or: [deleteQuery] });

    // Save OTP to database
    const otp = new Otp({
      email: email || userProfile?.email,
      mobileNumber: mobileNumber || userAuth?.mobileNumber,
      code: otpCode,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });
    await otp.save();

    // If email is provided, send OTP via email using nodemailer
    if (email) {
      const transporter = nodemailer.createTransport({
        service: 'gmail', // Use your email service
        auth: {
          user: process.env.EMAIL, // Your email address
          pass: process.env.EMAIL_PASSWORD, // Your email password or app-specific password
        },
      });

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Your OTP Code',
        text: `Your OTP is ${otpCode}. It expires in 5 minutes.`,
      };

      await transporter.sendMail(mailOptions);
    }

    // Return OTP in response (remove otpCode from response in production)
    return apiResponse(res, {
      success: true,
      message: email ? "OTP sent to user email" : "OTP generated for mobile number",
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
      const profile = await UserProfile.findOne({ email });
      if (!profile) {
        return apiResponse(res, {
          success: false,
          message: "UserProfile not found",
          statusCode: 404,
        });
      }
      user = await User.findById(profile.userId);
    } else if (mobileNumber) {
      user = await User.findOne({ mobileNumber });
    }

    if (!user) {
      return apiResponse(res, {
        success: false,
        message: "User not found",
        statusCode: 404,
      });
    }

    if (email) {
      profile.isEmailVerified = true;
    } else if (mobileNumber) {
      user.isMobileVerified = true;
    }
    await user.save();
    await Otp.deleteOne({ _id: otpRecord._id });

    return apiResponse(res, {
      message: email ? "User email verified successfully" : "User mobile number verified successfully",
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
      const profile = await UserProfile.findOne({ email });
      if (!profile) {
        return apiResponse(res, {
          success: false,
          message: "Profile with this email not found",
          statusCode: 404,
        });
      }
      user = await User.findById(profile.userId);
    } else if (mobileNumber) {
      user = await User.findOne({ mobileNumber });
    }

    if (!user) {
      return apiResponse(res, {
        success: false,
        message: "User not found",
        statusCode: 404,
      });
    }

    if (email && !profile.isEmailVerified) {
      return apiResponse(res, {
        success: false,
        message: "Email is not verified",
        statusCode: 400,
      });
    }
console.log("user.isMobileVerified",user)
    if (mobileNumber && !user.isMobileVerified) {
      return apiResponse(res, {
        success: false,
        message: "Mobile number is not verified",
        statusCode: 400,
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
  
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