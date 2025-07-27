const { auth } = require('../../../config/firebase');
const { apiResponse } = require('../../../utils/apiResponse');
const HostAuth = require('../../models/Auth/Auth');
const Artist = require('../../../Artist/models/Auth/Auth');
const UserAuth = require('../../../User/models/Auth/Auth');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET;

const validatePassword = (password) => {
  return password.length >= 8 && /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password);
};

// Send OTP for Host
exports.sendFirebaseOtp = async (req, res) => {
  const { mobileNumber, fullName, password, isRememberMe, location } = req.body;

  console.log('sendFirebaseOtp called with body:', { mobileNumber, fullName, password: '****', isRememberMe, location });

  try {
    // Input validation
    if (!mobileNumber || !fullName || !password || !location) {
      console.log('sendFirebaseOtp validation failed: Missing required fields');
      return apiResponse(res, {
        success: false,
        statusCode: 400,
        message: 'Full name, mobile number, password, and location are required',
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

    const userExists = await UserAuth.findOne({ mobileNumber });
    if (userExists) {
      console.log('sendFirebaseOtp failed: Mobile number registered as User', { mobileNumber });
      return apiResponse(res, {
        success: false,
        statusCode: 400,
        message: 'This mobile number is already registered as a User. Use a different number.',
      });
    }

    const existingHost = await HostAuth.findOne({ mobileNumber });
    if (existingHost && existingHost.isMobileVerified) {
      console.log('sendFirebaseOtp failed: Mobile number already verified', { mobileNumber });
      return apiResponse(res, {
        success: false,
        statusCode: 400,
        message: 'Phone number already registered and verified',
      });
    }

    let hostUser;
    if (existingHost && !existingHost.isMobileVerified) {
      // Update existing unverified host
      console.log('Updating existing unverified host:', { mobileNumber, fullName });
      existingHost.fullName = fullName;
      existingHost.mobileNumber = mobileNumber;
      existingHost.password = await bcrypt.hash(password, 10);
      existingHost.isRememberMe = isRememberMe || false;
      existingHost.location = location;
      hostUser = await existingHost.save();
      console.log('Host updated successfully:', { hostId: hostUser._id });
    } else {
      // Create new host
      console.log('Creating new host:', { mobileNumber, fullName });
      const hashedPassword = await bcrypt.hash(password, 10);
      hostUser = new HostAuth({
        fullName,
        mobileNumber,
        password: hashedPassword,
        isRememberMe: isRememberMe || false,
        location,
        role: 'host',
      });
      await hostUser.save();
      console.log('Host created successfully:', { hostId: hostUser._id });
    }

    console.log('sendFirebaseOtp response:', { userId: hostUser._id, mobileNumber });
    return apiResponse(res, {
      success: true,
      message: 'Host registered successfully, proceed to OTP verification',
      data: { userId: hostUser._id, mobileNumber },
    });
  } catch (error) {
    console.error('Firebase OTP send error for Host:', error);
    return apiResponse(res, {
      success: false,
      message: 'Failed to initiate OTP',
      error: error.message,
      statusCode: 500,
    });
  }
};

// Verify Firebase OTP for Host
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

    // Find host
    console.log('Finding host with mobileNumber:', mobileNumber);
    const hostUser = await HostAuth.findOne({ mobileNumber });
    if (!hostUser) {
      console.log('verifyFirebaseOtp failed: Host not found', { mobileNumber });
      return apiResponse(res, {
        success: false,
        statusCode: 404,
        message: 'Host not found',
      });
    }

    // Update verification status and Firebase UID
    console.log('Updating host verification status:', { hostId: hostUser._id });
    hostUser.isMobileVerified = true;
    hostUser.isVerified = true;
    hostUser.firebaseUid = decodedToken.uid;
    await hostUser.save();
    console.log('Host updated successfully:', { hostId: hostUser._id, firebaseUid: decodedToken.uid });

    // Generate JWT token
    console.log('Generating JWT token for host:', { hostId: hostUser._id, role: hostUser.role });
    const token = jwt.sign(
      { hostId: hostUser._id, role: hostUser.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.setHeader('Authorization', `Bearer ${token}`);
    console.log('verifyFirebaseOtp response:', { userId: hostUser._id });

    return apiResponse(res, {
      success: true,
      message: 'Mobile number verified successfully',
      data: { user: await HostAuth.findById(hostUser._id).select('-password') },
    });
  } catch (error) {
    console.error('Firebase OTP verification error for Host:', error);
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

// Firebase Login for Host
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

    // Check if host exists
    console.log('Checking for host with mobileNumber:', mobileNumber);
    const hostUser = await HostAuth.findOne({ mobileNumber });
    if (!hostUser) {
      console.log('firebaseLogin failed: Host not found', { mobileNumber });
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
    console.error('Firebase login error for Host:', error);
    return apiResponse(res, {
      success: false,
      statusCode: 500,
      message: 'Login failed',
      error: error.message,
    });
  }
};