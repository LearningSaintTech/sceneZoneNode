const { auth } = require('../../../config/firebase');
const { apiResponse } = require('../../../utils/apiResponse');
const UserAuth = require('../../models/Auth/Auth');
const Artist = require('../../../Artist/models/Auth/Auth');
const HostAuth = require('../../../Host/models/Auth/Auth');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET;

const validatePassword = (password) => {
  return password.length >= 8 && /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password);
};

// Send OTP for User
exports.sendFirebaseOtp = async (req, res) => {
  const { mobileNumber, fullName, password, isRememberMe } = req.body;

  console.log('sendFirebaseOtp called for User with body:', { mobileNumber, fullName, password: '****', isRememberMe });

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
    const artistExists = await Artist.findOne({ mobileNumber });
    if (artistExists) {
      console.log('sendFirebaseOtp failed: Mobile number registered as Artist', { mobileNumber });
      return apiResponse(res, {
        success: false,
        statusCode: 400,
        message: 'This mobile number is already registered as an Artist. Use a different number.',
      });
    }

    const hostExists = await HostAuth.findOne({ mobileNumber });
    if (hostExists) {
      console.log('sendFirebaseOtp failed: Mobile number registered as Host', { mobileNumber });
      return apiResponse(res, {
        success: false,
        statusCode: 400,
        message: 'This mobile number is already registered as a Host. Use a different number.',
      });
    }

    const existingUser = await UserAuth.findOne({ mobileNumber });
    if (existingUser && existingUser.isMobileVerified) {
      console.log('sendFirebaseOtp failed: Mobile number already verified', { mobileNumber });
      return apiResponse(res, {
        success: false,
        statusCode: 400,
        message: 'Phone number already registered and verified',
      });
    }

    let userAuth;
    if (existingUser && !existingUser.isMobileVerified) {
      // Update existing unverified user
      console.log('Updating existing unverified user:', { mobileNumber, fullName });
      existingUser.fullName = fullName;
      existingUser.mobileNumber = mobileNumber;
      existingUser.password = await bcrypt.hash(password, 10);
      existingUser.isRememberMe = isRememberMe || false;
      userAuth = await existingUser.save();
      console.log('User updated successfully:', { userId: userAuth._id });
    } else {
      // Create new user
      console.log('Creating new user:', { mobileNumber, fullName });
      const hashedPassword = await bcrypt.hash(password, 10);
      userAuth = new UserAuth({
        fullName,
        mobileNumber,
        password: hashedPassword,
        isRememberMe: isRememberMe || false,
        role: 'user',
      });
      await userAuth.save();
      console.log('User created successfully:', { userId: userAuth._id });
    }

    console.log('sendFirebaseOtp response:', { userId: userAuth._id, mobileNumber });
    return apiResponse(res, {
      success: true,
      message: 'User registered successfully, proceed to OTP verification',
      data: { userId: userAuth._id, mobileNumber },
    });
  } catch (error) {
    console.error('Firebase OTP send error for User:', error);
    return apiResponse(res, {
      success: false,
      message: 'Failed to initiate OTP',
      error: error.message,
      statusCode: 500,
    });
  }
};

// Verify Firebase OTP for User
exports.verifyFirebaseOtp = async (req, res) => {
  const { mobileNumber, idToken } = req.body;

  console.log('verifyFirebaseOtp called for User with body:', { mobileNumber, idToken: '****' });

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

    // if (phoneNumber !== mobileNumber) {
    //   console.log('verifyFirebaseOtp failed: Phone number mismatch', { received: phoneNumber, expected: mobileNumber });
    //   return apiResponse(res, {
    //     success: false,
    //     statusCode: 400,
    //     message: 'Phone number mismatch',
    //   });
    // }

    console.log('Finding user with mobileNumber:', decodedToken.phone_number);
    const formattedMobileNumber =   mobileNumber; // Ensure +91 prefix
    console.log("formattedMobileNumber",formattedMobileNumber)
    const userAuth = await UserAuth.findOne({ mobileNumber: formattedMobileNumber });
    if (!userAuth) {
      console.log('verifyFirebaseOtp failed: User not found', { mobileNumber: formattedMobileNumber });
      return apiResponse(res, {
        success: false,
        statusCode: 404,
        message: 'User not found',
      });
    }

    // Update verification status and Firebase UID
    console.log('Updating user verification status:', { userId: userAuth._id });
    userAuth.isMobileVerified = true;
    userAuth.isVerified = true;
    userAuth.firebaseUid = decodedToken.uid;
    await userAuth.save();
    console.log('User updated successfully:', { userId: userAuth._id, firebaseUid: decodedToken.uid });

    // Generate JWT token
    console.log('Generating JWT token for user:', { userId: userAuth._id, role: userAuth.role });
    const token = jwt.sign(
      { userId: userAuth._id, role: userAuth.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.setHeader('Authorization', `Bearer ${token}`);
    console.log('verifyFirebaseOtp response:', { userId: userAuth._id });

    return apiResponse(res, {
      success: true,
      message: 'Mobile number verified successfully',
      data: { user: await UserAuth.findById(userAuth._id).select('-password') },
    });
  } catch (error) {
    console.error('Firebase OTP verification error for User:', error);
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

// Firebase Login for User
exports.firebaseLogin = async (req, res) => {
  const { mobileNumber } = req.body;

  console.log('firebaseLogin called for User with body:', { mobileNumber });

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

    // Check if user exists
    console.log('Checking for user with mobileNumber:', mobileNumber);
    const userAuth = await UserAuth.findOne({ mobileNumber });
    console.log("userAuth",userAuth)
    if (!userAuth) {
      console.log('firebaseLogin failed: User not found', { mobileNumber });
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
  } catch (error) {
    console.error('Firebase login error for User:', error);
    return apiResponse(res, {
      success: false,
      statusCode: 500,
      message: 'Login failed',
      error: error.message,
    });
  }
};