const artist = require("../../models/Auth/Auth");
const ArtistProfile = require("../../models/Profile/profile");
const Otp = require("../../models/OTP/OTP");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { apiResponse } = require("../../../utils/apiResponse");
const HostAuth = require("../../../Host/models/Auth/Auth");
const UserAuth = require("../../../User/models/Auth/Auth");
require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET;
const generateOTP = () => Math.floor(1000 + Math.random() * 9000).toString();

// Signup
exports.signup = async (req, res) => {
  const { fullName, mobileNumber, password, isRememberMe } = req.body;

  try {
    // Validate input
    if (!fullName || !mobileNumber || !password) {
      return apiResponse(res, {
        success: false,
        statusCode: 400,
        message: 'Full name, mobile number, and password are required',
      });
    }

    // Check if number exists in Host or User Auth collections
    const hostExists = await HostAuth.findOne({ mobileNumber });
    if (hostExists) {
      return apiResponse(res, {
        success: false,
        statusCode: 400,
        message: 'This mobile number is already registered as a Host. Use a different number.',
      });
    }

    const userExists = await UserAuth.findOne({ mobileNumber });
    if (userExists) {
      return apiResponse(res, {
        success: false,
        statusCode: 400,
        message: 'This mobile number is already registered as a User. Use a different number.',
      });
    }

    // Check if artist exists
    const existingArtist = await artist.findOne({ mobileNumber });
    if (existingArtist && existingArtist.isMobileVerified) {
      return apiResponse(res, {
        success: false,
        statusCode: 400,
        message: 'Phone number already registered and verified',
      });
    }

    let artistUser;
    if (existingArtist && !existingArtist.isMobileVerified) {
      // Update existing unverified artist
      existingArtist.fullName = fullName;
      existingArtist.mobileNumber = mobileNumber;
      existingArtist.password = await bcrypt.hash(password, 10);
      existingArtist.isRememberMe = isRememberMe || false;
      artistUser = await existingArtist.save();
    } else {
      // Create new artist
      const hashedPassword = await bcrypt.hash(password, 10);
      artistUser = new artist({
        fullName,
        mobileNumber,
        password: hashedPassword,
        isRememberMe: isRememberMe || false,
      });
      await artistUser.save();
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
      message: 'OTP sent successfully',
      data:otp.code
    });
  } catch (error) {
    console.error('Signup error:', error);
    return apiResponse(res, {
      success: false,
      message: 'Signup failed',
      error: error.message,
      statusCode: 500,
    });
  }
};

// Verify OTP
exports.verifyOtp = async (req, res) => {
  const { mobileNumber, code } = req.body;

  try {
    // Validate OTP
    const otpRecord = await Otp.findOne({ mobileNumber, code });
    if (!otpRecord) {
      return apiResponse(res, {
        success: false,
        message: 'Invalid OTP',
        statusCode: 400,
      });
    }

    if (otpRecord.expiresAt < new Date()) {
      await Otp.deleteOne({ _id: otpRecord._id });
      return apiResponse(res, {
        success: false,
        message: 'OTP has expired',
        statusCode: 400,
      });
    }

    // Find and update artist
    const artistUser = await artist.findOne({ mobileNumber });
    if (!artistUser) {
      return apiResponse(res, {
        success: false,
        message: 'Artist not found',
        statusCode: 404,
      });
    }

    // if (artistUser.isMobileVerified) {
    //   return apiResponse(res, {
    //     success: false,
    //     message: 'Mobile number already verified',
    //     statusCode: 400,
    //   });
    // }

    // Update verification status
    artistUser.isMobileVerified = true;
    artistUser.isVerified = true; // Set to true if mobile verification is the only step
    await artistUser.save();

    // Clean up OTP
    await Otp.deleteOne({ _id: otpRecord._id });

    // Generate JWT token
    const token = jwt.sign(
      { artistId: artistUser._id, role: artistUser.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Set token in response header
    res.setHeader('Authorization', `Bearer ${token}`);

    return apiResponse(res, {
      success: true,
      message: 'Mobile number verified successfully',
      data: { user: await artist.findById(artistUser._id).select('-password') },
    });
  } catch (error) {
    console.error('OTP verification error:', error);
    return apiResponse(res, {
      success: false,
      message: 'OTP verification failed',
      error: error.message,
      statusCode: 500,
    });
  }
};

// Resend OTP
exports.resendOtp = async (req, res) => {
  const { mobileNumber, email } = req.body;

  try {
    // Check for valid input
    if (!mobileNumber && !email) {
      return apiResponse(res, {
        success: false,
        message: 'Please provide either a mobile number or an email.',
        statusCode: 400,
      });
    }

    let user;
    if (mobileNumber) {
      user = await artist.findOne({ mobileNumber });
      if (!user) {
        return apiResponse(res, {
          success: false,
          message: 'Artist with this phone number does not exist',
          statusCode: 404,
        });
      }
      if (user.isMobileVerified) {
        return apiResponse(res, {
          success: false,
          message: 'Mobile number already verified',
          statusCode: 400,
        });
      }
      await Otp.deleteMany({ mobileNumber });
    } else if (email) {
      user = await ArtistProfile.findOne({ email });
      if (!user) {
        return apiResponse(res, {
          success: false,
          message: 'Artist with this email does not exist',
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

    // TODO: Send OTP via SMS or email (e.g., integrate with an SMS/email service)
    console.log(`OTP for ${mobileNumber || email}: ${otpCode}`); // For testing only

    return apiResponse(res, {
      success: true,
      message: 'OTP resent successfully',
      data:otp.code
    });
  } catch (error) {
    console.error('Error resending OTP:', error);
    return apiResponse(res, {
      success: false,
      message: 'Resending OTP failed',
      error: error.message,
      statusCode: 500,
    });
  }
};

// Login
exports.login = async (req, res) => {
  const { mobileNumber } = req.body;

  try {
    // Validate input
    if (!mobileNumber) {
      return apiResponse(res, {
        success: false,
        message: 'Mobile number is required',
        statusCode: 400,
      });
    }

    // Check if artist exists
    const artistUser = await artist.findOne({ mobileNumber });
    if (!artistUser) {
      return apiResponse(res, {
        success: false,
        message: 'Phone number is not registered. Signup first',
        statusCode: 404,
      });
    }

    // Delete existing OTPs
    await Otp.deleteMany({ mobileNumber });

    // Generate new OTP
    const otpCode = generateOTP();
    const otp = new Otp({
      mobileNumber,
      code: otpCode,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    await otp.save();

    // TODO: Send OTP via SMS
    console.log(`OTP for ${mobileNumber}: ${otpCode}`); // For testing only

    return apiResponse(res, {
      success: true,
      message: 'OTP sent successfully',
      data:otp.code
    });
  } catch (error) {
    console.error('Login error:', error);
    return apiResponse(res, {
      success: false,
      message: 'Login failed',
      error: error.message,
      statusCode: 500,
    });
  }
};

// Login with Password
exports.loginWithPassword = async (req, res) => {
  const { mobileNumber, password } = req.body;

  try {
    // Validate input
    if (!mobileNumber || !password) {
      return apiResponse(res, {
        success: false,
        message: 'Mobile number and password are required',
        statusCode: 400,
      });
    }

    // Find artist
    const artistUser = await artist.findOne({ mobileNumber });
    if (!artistUser) {
      return apiResponse(res, {
        success: false,
        message: 'Artist not found',
        statusCode: 404,
      });
    }

    // Check if artist is verified
    if (!artistUser.isVerified) {
      return apiResponse(res, {
        success: false,
        message: 'Artist account not verified. Please verify your mobile number.',
        statusCode: 403,
      });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, artistUser.password);
    if (!isMatch) {
      return apiResponse(res, {
        success: false,
        message: 'Invalid password',
        statusCode: 400,
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { artistId: artistUser._id, role: artistUser.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Set token in response header
    res.setHeader('Authorization', `Bearer ${token}`);

    return apiResponse(res, {
      success: true,
      message: 'Login successful',
      data: { user: await artist.findById(artistUser._id).select('-password') },
    });
  } catch (error) {
    console.error('Password login error:', error);
    return apiResponse(res, {
      success: false,
      message: 'Login failed',
      error: error.message,
      statusCode: 500,
    });
  }
};

exports.getArtist = async (req, res) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return apiResponse(res, {
        success: false,
        message: 'Authorization token missing',
        statusCode: 401,
      });
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    const artistId = decoded.artistId;

    // Fetch artist
    const artistUser = await artist.findById(artistId).select('-password');

    if (!artistUser) {
      return apiResponse(res, {
        success: false,
        message: 'Artist not found',
        statusCode: 404,
      });
    }

    return apiResponse(res, {
      success: true,
      message: 'Artist fetched successfully',
      data: { user: artistUser },
    });
  } catch (error) {
    console.error('Get artist error:', error);
    return apiResponse(res, {
      success: false,
      message: 'Failed to fetch artist',
      error: error.message,
      statusCode: 500,
    });
  }
};