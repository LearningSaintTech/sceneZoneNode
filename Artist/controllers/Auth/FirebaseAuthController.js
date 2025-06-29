/**
 * Firebase Authentication Controller
 * File: server/Artist/Controllers/Auth/FirebaseAuthController.js
 */
const { auth } = require('../../../config/firebase');
const { apiResponse } = require('../../../utils/apiResponse');
const Artist = require('../../models/Auth/Auth');
const HostAuth = require('../../../Host/models/Auth/Auth');
const UserAuth = require('../../../User/models/Auth/Auth');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET;

const validatePassword = (password) => {
  // const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/;
  return (password);
};

// Send OTP
exports.sendFirebaseOtp = async (req, res) => {
  const { mobileNumber, fullName, password, isRememberMe } = req.body;

  console.log('sendFirebaseOtp called with body:', { mobileNumber, fullName, password: '****', isRememberMe });

  try {
    // Input validation
    if (!mobileNumber || !fullName || !password) {
      console.log('sendFirebaseOtp validation failed: Missing required fields');
      return apiResponse(res, {
        success: false,
        statusCode: 400,
        message: 'Full name, mobile number, and password are required',
      });
    }

    if (!validatePassword(password)) {
      console.log('sendFirebaseOtp validation failed: Invalid password format');
      return apiResponse(res, {
        success: false,
        statusCode: 400,
        message: 'Password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, and one number',
      });
    }

    // Validate mobile number format
    const phoneRegex = /^\+\d{1,3}\d{9,15}$/;
    if (!phoneRegex.test(mobileNumber)) {
      console.log('sendFirebaseOtp validation failed: Invalid mobile number format', { mobileNumber });
      return apiResponse(res, {
        success: false,
        statusCode: 400,
        message: 'Invalid mobile number format. Use format: +<country code><number>',
      });
    }

    // Check for existing users
    console.log('Checking for existing users with mobileNumber:', mobileNumber);
    const hostExists = await HostAuth.findOne({ mobileNumber });
    if (hostExists) {
      console.log('sendFirebaseOtp failed: Mobile number registered as Host', { mobileNumber });
      return apiResponse(res, {
        success: false,
        statusCode: 400,
        message: 'This mobile number is already registered as a Host. Use a different number.',
      });
    }

    const userExists = await UserAuth.findOne({ mobileNumber });
    if (userExists) {
      console.log('sendFirebaseOtp failed: Mobile number registered as User', { mobileNumber });
      return apiResponse(res, {
        success: false,
        statusCode: 400,
        message: 'This mobile number is already registered as a User. Use a different number.',
      });
    }

    const existingArtist = await Artist.findOne({ mobileNumber });
    if (existingArtist && existingArtist.isMobileVerified) {
      console.log('sendFirebaseOtp failed: Mobile number already verified', { mobileNumber });
      return apiResponse(res, {
        success: false,
        statusCode: 400,
        message: 'Phone number already registered and verified',
      });
    }

    let artistUser;
    if (existingArtist && !existingArtist.isMobileVerified) {
      // Update existing unverified artist
      console.log('Updating existing unverified artist:', { mobileNumber, fullName });
      existingArtist.fullName = fullName;
      existingArtist.mobileNumber = mobileNumber;
      existingArtist.password = await bcrypt.hash(password, 10);
      existingArtist.isRememberMe = isRememberMe || false;
      artistUser = await existingArtist.save();
      console.log('Artist updated successfully:', { artistId: artistUser._id });
    } else {
      // Create new artist
      console.log('Creating new artist:', { mobileNumber, fullName });
      const hashedPassword = await bcrypt.hash(password, 10);
      artistUser = new Artist({
        fullName,
        mobileNumber,
        password: hashedPassword,
        isRememberMe: isRememberMe || false,
      });
      await artistUser.save();
      console.log('Artist created successfully:', { artistId: artistUser._id });
    }

    console.log('sendFirebaseOtp response:', { userId: artistUser._id, mobileNumber });
    return apiResponse(res, {
      success: true,
      message: 'Artist registered successfully, proceed to OTP verification',
      data: { userId: artistUser._id, mobileNumber },
    });
  } catch (error) {
    console.error('Firebase OTP send error:', error);
    return apiResponse(res, {
      success: false,
      message: 'Failed to initiate OTP',
      error: error.message,
      statusCode: 500,
    });
  }
};

// Verify Firebase OTP
exports.verifyFirebaseOtp = async (req, res) => {
  const { mobileNumber, idToken } = req.body;

  console.log('verifyFirebaseOtp called with body:', { mobileNumber, idToken: '****' });

  try {
    // Validate input
    if (!mobileNumber || !idToken) {
      console.log('verifyFirebaseOtp validation failed: Missing required fields');
      return apiResponse(res, {
        success: false,
        statusCode: 400,
        message: 'Mobile number and ID token are required',
      });
    }

    // Verify Firebase ID token
    console.log('Verifying Firebase ID token...');
    const decodedToken = await auth.verifyIdToken(idToken);
    console.log('Firebase ID token verified:', { phone_number: decodedToken.phone_number, uid: decodedToken.uid });
    const phoneNumber = decodedToken.phone_number;

    if (phoneNumber !== mobileNumber) {
      console.log('verifyFirebaseOtp failed: Phone number mismatch', { received: phoneNumber, expected: mobileNumber });
      return apiResponse(res, {
        success: false,
        statusCode: 400,
        message: 'Phone number mismatch',
      });
    }

    // Find artist
    console.log('Finding artist with mobileNumber:', mobileNumber);
    const artistUser = await Artist.findOne({ mobileNumber });
    if (!artistUser) {
      console.log('verifyFirebaseOtp failed: Artist not found', { mobileNumber });
      return apiResponse(res, {
        success: false,
        statusCode: 404,
        message: 'Artist not found',
      });
    }

    // Update verification status and Firebase UID
    console.log('Updating artist verification status:', { artistId: artistUser._id });
    artistUser.isMobileVerified = true;
    artistUser.isVerified = true;
    artistUser.firebaseUid = decodedToken.uid;
    await artistUser.save();
    console.log('Artist updated successfully:', { artistId: artistUser._id, firebaseUid: decodedToken.uid });

    // Generate JWT token
    console.log('Generating JWT token for artist:', { artistId: artistUser._id, role: artistUser.role });
    const token = jwt.sign(
      { artistId: artistUser._id, role: artistUser.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.setHeader('Authorization', `Bearer ${token}`);
    console.log('verifyFirebaseOtp response:', { userId: artistUser._id });

    return apiResponse(res, {
      success: true,
      message: 'Mobile number verified successfully',
      data: { user: await Artist.findById(artistUser._id).select('-password') },
    });
  } catch (error) {
    console.error('Firebase OTP verification error:', error);
    let errorMessage = 'OTP verification failed';
    let statusCode = 500;
    if (error.code === 'auth/invalid-id-token') {
      errorMessage = 'Invalid ID token';
      statusCode = 400;
    } else if (error.code === 'auth/id-token-expired') {
      errorMessage = 'ID token has expired';
      statusCode = 400;
    }
    return apiResponse(res, {
      success: false,
      message: errorMessage,
      error: error.message,
      statusCode,
    });
  }
};

// Firebase Login
exports.firebaseLogin = async (req, res) => {
  const { mobileNumber } = req.body;

  console.log('firebaseLogin called with body:', { mobileNumber });

  try {
    // Validate input
    if (!mobileNumber) {
      console.log('firebaseLogin validation failed: Missing mobile number');
      return apiResponse(res, {
        success: false,
        statusCode: 400,
        message: 'Mobile number is required',
      });
    }

    // Validate mobile number format
    const phoneRegex = /^\+\d{1,3}\d{9,15}$/;
    if (!phoneRegex.test(mobileNumber)) {
      console.log('firebaseLogin validation failed: Invalid mobile number format', { mobileNumber });
      return apiResponse(res, {
        success: false,
        statusCode: 400,
        message: 'Invalid mobile number format. Use format: +<country code><number>',
      });
    }

    // Check if artist exists
    console.log('Checking for artist with mobileNumber:', mobileNumber);
    const artistUser = await Artist.findOne({ mobileNumber });
    if (!artistUser) {
      console.log('firebaseLogin failed: Artist not found', { mobileNumber });
      return apiResponse(res, {
        success: false,
        statusCode: 404,
        message: 'Phone number is not registered. Signup first',
      });
    }

    console.log('firebaseLogin response:', { mobileNumber });
    return apiResponse(res, {
      success: true,
      message: 'Proceed to OTP verification',
      data: { mobileNumber },
    });
 Nektonian
  } catch (error) {
    console.error('Firebase login error:', error);
    return apiResponse(res, {
      success: false,
      statusCode: 500,
      message: 'Login failed',
      error: error.message,
    });
  }
};