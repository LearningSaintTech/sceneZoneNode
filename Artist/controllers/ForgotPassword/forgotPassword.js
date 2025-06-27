const bcrypt = require("bcryptjs");
const ArtistProfile = require("../../models/Profile/profile");
const artist = require("../../models/Auth/Auth");
const Otp = require("../../models/OTP/OTP");
const { sendEmail } = require("../../../utils/emailService");
const { apiResponse } = require("../../../utils/apiResponse");

const generateOTP = () => Math.floor(1000 + Math.random() * 9000).toString();

exports.emailNumberSendOtp = async (req, res) => {
  const { email, mobileNumber } = req.body;

  if (!email && !mobileNumber) {
    return apiResponse(res, {
      success: false,
      message: "Either email or mobileNumber is required",
      statusCode: 400,
    });
  }

  try {
    let otpCode;
    let artistProfile;
    let artistAuth;

    if (email) {
      artistProfile = await ArtistProfile.findOne({ email });
      if (!artistProfile) {
        return apiResponse(res, {
          success: false,
          message: "Email not found in ArtistProfile",
          statusCode: 404,
        });
      }
    }

    if (mobileNumber) {
      artistAuth = await artist.findOne({ mobileNumber });
      if (!artistAuth) {
        return apiResponse(res, {
          success: false,
          message: "Mobile number not found in Artist",
          statusCode: 404,
        });
      }
    }

    otpCode = generateOTP();

    const deleteQuery = {};
    if (email) deleteQuery.email = email;
    if (mobileNumber) deleteQuery.mobileNumber = mobileNumber;
    await Otp.deleteMany({ $or: [deleteQuery] });

    const otp = new Otp({
      email: email || artistProfile?.email,
      mobileNumber: mobileNumber || artistAuth?.mobileNumber,
      code: otpCode,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });
    await otp.save();

    if (email) {
      await sendEmail(
        email,
        "Your OTP Code",
        `Your OTP is ${otpCode}. It expires in 5 minutes.`
      );
    }

    return apiResponse(res, {
      success: true,
      message: email ? "OTP sent to artist email" : "OTP generated for mobile number",
      data: { otp: otpCode }, // Remove in production
      statusCode: 200,
    });
  } catch (error) {
    console.error("Send Artist OTP error:", error);
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

  if (!email && !mobileNumber) {
    return apiResponse(res, {
      success: false,
      message: "Either email or mobileNumber is required",
      statusCode: 400,
    });
  }

  try {
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
    let profile;
    if (email) {
      profile = await ArtistProfile.findOne({ email });
      if (!profile) {
        return apiResponse(res, {
          success: false,
          message: "ArtistProfile not found",
          statusCode: 404,
        });
      }
      user = await artist.findById(profile.artistId);
    } else if (mobileNumber) {
      user = await artist.findOne({ mobileNumber });
    }

    if (!user) {
      return apiResponse(res, {
        success: false,
        message: "Artist not found",
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
      success: true,
      message: email ? "Artist email verified successfully" : "Artist mobile number verified successfully",
    });
  } catch (error) {
    console.error("Verify Artist OTP error:", error);
    return apiResponse(res, {
      success: false,
      message: "OTP verification failed",
      error: error.message,
      statusCode: 500,
    });
  }
};

exports.setNewPassword = async (req, res) => {
  const { email, mobileNumber, password } = req.body;

  if (!email && !mobileNumber) {
    return apiResponse(res, {
      success: false,
      message: "Either email or mobileNumber is required",
      statusCode: 400,
    });
  }

  try {
    let user;
    let profile;
    if (email) {
      profile = await ArtistProfile.findOne({ email });
      if (!profile) {
        return apiResponse(res, {
          success: false,
          message: "Profile with this email not found",
          statusCode: 404,
        });
      }
      user = await artist.findById(profile.artistId);
    } else if (mobileNumber) {
      user = await artist.findOne({ mobileNumber });
    }

    if (!user) {
      return apiResponse(res, {
        success: false,
        message: "Artist not found",
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
      success: true,
      message: "Artist password updated successfully",
    });
  } catch (error) {
    console.error("Set Artist Password error:", error);
    return apiResponse(res, {
      success: false,
      message: "Failed to update password",
      error: error.message,
      statusCode: 500,
    });
  }
};