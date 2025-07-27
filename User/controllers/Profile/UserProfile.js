const UserProfile = require("../../models/Profile/UserProfile");
const UserAuthentication = require("../../models/Auth/Auth");
const { uploadImage, deleteImage } = require("../../../utils/s3Functions");
const { apiResponse } = require("../../../utils/apiResponse");

exports.createUserProfile = async (req, res) => {
  console.log('[createUserProfile] Starting createUserProfile');
  console.log('[createUserProfile] Request user:', req.user);
  console.log('[createUserProfile] Request body:', req.body);
  console.log('[createUserProfile] Request file:', req.file ? req.file.originalname : null);

  try {
    const userId = req.user?.userId;
    console.log('[createUserProfile] Extracted userId:', userId);

    if (!userId) {
      console.log('[createUserProfile] Validation failed: No userId provided');
      return apiResponse(res, {
        success: false,
        message: 'Unauthorized access',
        statusCode: 401,
      });
    }

    const { email, address, dob, fullName, mobileNumber } = req.body;
    console.log('[createUserProfile] Extracted fields:', { email, address, dob, fullName, mobileNumber });

    // Validate required fields
    if (!email || !address || !dob || !fullName || !mobileNumber) {
      console.log('[createUserProfile] Validation failed: Missing required fields', { email, address, dob, fullName, mobileNumber });
      return apiResponse(res, {
        success: false,
        message: 'Missing required fields',
        statusCode: 400,
      });
    }

    // Normalize mobileNumber (remove +91 if present)
    const normalizedMobileNumber = mobileNumber;
    console.log('[createUserProfile] Normalized mobileNumber:', normalizedMobileNumber);

    // Validate normalized mobileNumber
  

    // Find the user in the UserAuthentication model
    console.log('[createUserProfile] Querying UserAuthentication for userId:', userId);
    const user = await UserAuthentication.findById(userId);
    console.log('[createUserProfile] User query result:', user ? { id: user._id, mobileNumber: user.mobileNumber, isVerified: user.isVerified } : null);

    if (!user) {
      console.log('[createUserProfile] User not found for userId:', userId);
      return apiResponse(res, {
        success: false,
        message: 'User not found',
        statusCode: 404,
      });
    }

    // Check if the user is verified
    if (!user.isVerified) {
      console.log('[createUserProfile] User is not verified:', userId);
      return apiResponse(res, {
        success: false,
        message: 'User is not verified. Cannot create profile.',
        statusCode: 400,
      });
    }

    // Check if the user already has a profile
    console.log('[createUserProfile] Checking for existing profile for userId:', userId);
    const existingProfile = await UserProfile.findOne({ userId });
    console.log('[createUserProfile] Existing profile check:', existingProfile ? { id: existingProfile._id } : null);

    if (existingProfile) {
      console.log('[createUserProfile] Profile already exists for userId:', userId);
      return apiResponse(res, {
        success: false,
        message: 'Profile already exists for this user',
        statusCode: 400,
      });
    }

    // Handle profile image upload
    let profileImageUrl = null;
    if (req.file) {
      console.log('[createUserProfile] Uploading profile image:', req.file.originalname);
      const fileName = `User/profileImage/user_${userId}_${Date.now()}-${req.file.originalname}`;
      console.log('[createUserProfile] Generated S3 fileName:', fileName);
      profileImageUrl = await uploadImage(req.file, fileName);
      console.log('[createUserProfile] Profile image uploaded, URL:', profileImageUrl);
    } else {
      console.log('[createUserProfile] No profile image provided');
      return apiResponse(res, {
        success: false,
        message: 'No profile image provided',
        statusCode: 400,
      });
    }

    // Update UserAuthentication
    console.log('[createUserProfile] Updating UserAuthentication with:', { fullName, mobileNumber: normalizedMobileNumber });
    user.fullName = fullName;
    user.mobileNumber = normalizedMobileNumber;

    // Create new profile
    console.log('[createUserProfile] Creating new UserProfile with:', { userId, email, address, dob, profileImageUrl });
    const newProfile = new UserProfile({
      userId,
      email,
      address,
      dob,
      profileImageUrl,
    });

    // Save profile and user
    console.log('[createUserProfile] Saving new profile');
    await newProfile.save();
    console.log('[createUserProfile] New profile saved:', newProfile._id);

    console.log('[createUserProfile] Setting isProfileComplete to true for user:', userId);
    user.isProfileComplete = true;
    await user.save();
    console.log('[createUserProfile] UserAuthentication updated:', user._id);

    // Construct response with +91 prepended to mobileNumber
    const responseData = {
      ...newProfile.toObject(),
      mobileNumber: `+91${normalizedMobileNumber}`,
      fullName: user.fullName,
      isVerified: user.isVerified,
      isProfileComplete: user.isProfileComplete,
    };
    console.log('[createUserProfile] Constructed responseData:', responseData);

    console.log('[createUserProfile] Sending successful response');
    return apiResponse(res, {
      message: 'Profile created successfully',
      data: responseData,
      statusCode: 201,
    });
  } catch (error) {
    console.error('[createUserProfile] Error occurred:', {
      message: error.message,
      stack: error.stack,
    });
    return apiResponse(res, {
      success: false,
      message: 'Error creating profile',
      error: error.message,
      statusCode: 500,
    });
  }
};

exports.updateUserProfile = async (req, res) => {
  console.log('[updateUserProfile] Starting updateUserProfile');
  console.log('[updateUserProfile] Request user:', req.user);
  console.log('[updateUserProfile] Request body:', req.body);
  console.log('[updateUserProfile] Request file:', req.file ? req.file.originalname : null);

  try {
    const userId = req.user?.userId;
    console.log('[updateUserProfile] Extracted userId:', userId);

    if (!userId) {
      console.log('[updateUserProfile] Validation failed: No userId provided');
      return apiResponse(res, {
        success: false,
        message: 'Unauthorized access',
        statusCode: 401,
      });
    }

    const { email, address, fullName, dob, mobileNumber } = req.body || {};
    console.log('[updateUserProfile] Extracted fields:', { email, address, fullName, dob, mobileNumber });

    // Validate required fields
    if (!email || !address || !fullName || !dob || !mobileNumber) {
      console.log('[updateUserProfile] Validation failed: Missing required fields', { email, address, fullName, dob, mobileNumber });
      return apiResponse(res, {
        success: false,
        message: 'Missing required fields',
        statusCode: 400,
      });
    }

    // Normalize mobileNumber (remove +91 if present)
    const normalizedMobileNumber = mobileNumber;
    console.log('[updateUserProfile] Normalized mobileNumber:', normalizedMobileNumber);

    // Validate normalized mobileNumber
    

    // Find user in UserAuthentication
    console.log('[updateUserProfile] Querying UserAuthentication for userId:', userId);
    const user = await UserAuthentication.findById(userId);
    console.log('[updateUserProfile] User query result:', user ? { id: user._id, mobileNumber: user.mobileNumber } : null);

    if (!user) {
      console.log('[updateUserProfile] User not found for userId:', userId);
      return apiResponse(res, {
        success: false,
        message: 'User not found',
        statusCode: 404,
      });
    }

    // Find user profile
    console.log('[updateUserProfile] Querying UserProfile for userId:', userId);
    const profile = await UserProfile.findOne({ userId });
    console.log('[updateUserProfile] Profile query result:', profile ? { id: profile._id, userId: profile.userId } : null);

    if (!profile) {
      console.log('[updateUserProfile] Profile not found for userId:', userId);
      return apiResponse(res, {
        success: false,
        message: 'Profile not found',
        statusCode: 404,
      });
    }

    // Update UserAuthentication fields
    console.log('[updateUserProfile] Updating UserAuthentication with:', { fullName, mobileNumber: normalizedMobileNumber });
    user.fullName = fullName;
    user.mobileNumber = normalizedMobileNumber;

    // Update UserProfile fields
    console.log('[updateUserProfile] Updating UserProfile with:', { email, address, dob });
    profile.email = email;
    profile.address = address;
    profile.dob = dob;

    // Handle profile image update
    if (req.file) {
      console.log('[updateUserProfile] Uploading new profile image:', req.file.originalname);
      const newFileName = `User/profileImage/user_${userId}_${Date.now()}-${req.file.originalname}`;
      console.log('[updateUserProfile] Generated S3 fileName:', newFileName);
      const newProfileImageUrl = await uploadImage(req.file, newFileName);
      console.log('[updateUserProfile] New profile image uploaded, URL:', newProfileImageUrl);

      if (profile.profileImageUrl) {
        try {
          const oldFileName = profile.profileImageUrl.split('.com/')[1];
          console.log('[updateUserProfile] Deleting old S3 image:', oldFileName);
          await deleteImage(oldFileName);
          console.log('[updateUserProfile] Old profile image deleted');
        } catch (error) {
          console.warn('[updateUserProfile] Failed to delete old profile image:', {
            url: profile.profileImageUrl,
            error: error.message,
          });
        }
      }

      profile.profileImageUrl = newProfileImageUrl;
      console.log('[updateUserProfile] Updated profileImageUrl:', newProfileImageUrl);
    }

    // Save changes
    console.log('[updateUserProfile] Saving updated UserProfile');
    await profile.save();
    console.log('[updateUserProfile] UserProfile saved:', profile._id);

    console.log('[updateUserProfile] Saving updated UserAuthentication');
    await user.save();
    console.log('[updateUserProfile] UserAuthentication saved:', user._id);

    // Construct response with +91 prepended to mobileNumber
    const responseData = {
      ...profile.toObject(),
      mobileNumber: `+91${normalizedMobileNumber}`,
      fullName: user.fullName,
      isVerified: user.isVerified,
      isProfileComplete: user.isProfileComplete,
    };
    console.log('[updateUserProfile] Constructed responseData:', responseData);

    console.log('[updateUserProfile] Sending successful response');
    return apiResponse(res, {
      message: 'Profile updated successfully',
      data: responseData,
      statusCode: 200,
    });
  } catch (error) {
    console.error('[updateUserProfile] Error occurred:', {
      message: error.message,
      stack: error.stack,
    });
    return apiResponse(res, {
      success: false,
      message: 'Error updating profile',
      error: error.message,
      statusCode: 500,
    });
  }
};




exports.deleteUserProfile = async (req, res) => {
  console.log('[deleteUserProfile] Starting deleteUserProfile');
  console.log('[deleteUserProfile] Request user:', req.user);

  try {
    const userId = req.user?.userId;
    console.log('[deleteUserProfile] Extracted userId:', userId);

    if (!userId) {
      console.log('[deleteUserProfile] Validation failed: No userId provided');
      return apiResponse(res, {
        success: false,
        message: 'Unauthorized access',
        statusCode: 401,
      });
    }

    // Find the user profile
    console.log('[deleteUserProfile] Querying UserProfile for userId:', userId);
    const profile = await UserProfile.findOne({ userId });
    console.log('[deleteUserProfile] Profile query result:', profile ? { id: profile._id, userId: profile.userId } : null);

    if (!profile) {
      console.log('[deleteUserProfile] Profile not found for userId:', userId);
      return apiResponse(res, {
        success: false,
        message: 'Profile not found',
        statusCode: 404,
      });
    }

    // Delete profile image from S3 if it exists
    if (profile.profileImageUrl) {
      try {
        console.log('[deleteUserProfile] Attempting to delete S3 image:', profile.profileImageUrl);
        const fileName = profile.profileImageUrl.split('.com/')[1];
        console.log('[deleteUserProfile] Extracted S3 fileName:', fileName);
        await deleteImage(fileName);
        console.log('[deleteUserProfile] Deleted profile image:', fileName);
      } catch (error) {
        console.warn('[deleteUserProfile] Failed to delete profile image:', {
          url: profile.profileImageUrl,
          error: error.message,
        });
      }
    }

    // Delete profile and user
    console.log('[deleteUserProfile] Deleting UserProfile for userId:', userId);
    await UserProfile.deleteOne({ userId });
    console.log('[deleteUserProfile] UserProfile deleted');

    console.log('[deleteUserProfile] Deleting UserAuthentication for userId:', userId);
    await UserAuthentication.deleteOne({ _id: userId });
    console.log('[deleteUserProfile] UserAuthentication deleted');

    console.log('[deleteUserProfile] Sending successful response');
    return apiResponse(res, {
      message: 'Profile deleted successfully',
      statusCode: 200,
    });
  } catch (error) {
    console.error('[deleteUserProfile] Error occurred:', {
      message: error.message,
      stack: error.stack,
    });
    return apiResponse(res, {
      success: false,
      message: 'Error deleting profile',
      error: error.message,
      statusCode: 500,
    });
  }
};



exports.getUserProfile = async (req, res) => {
  console.log('[getUserProfile] Starting getUserProfile');
  console.log('[getUserProfile] Request user:', req.user);

  try {
    const userId = req.user?.userId;
    console.log('[getUserProfile] Extracted userId:', userId);

    if (!userId) {
      console.log('[getUserProfile] Validation failed: No userId provided');
      return apiResponse(res, {
        success: false,
        message: 'Unauthorized access',
        statusCode: 401,
      });
    }

    // Fetch user and profile in parallel
    console.log('[getUserProfile] Querying UserAuthentication and UserProfile for userId:', userId);
    const [user, profile] = await Promise.all([
      UserAuthentication.findById(userId).select('fullName mobileNumber isVerified isProfileComplete'),
      UserProfile.findOne({ userId }),
    ]);
    console.log('[getUserProfile] User query result:', user ? { id: user._id, mobileNumber: user.mobileNumber } : null);
    console.log('[getUserProfile] Profile query result:', profile ? { id: profile._id, userId: profile.userId } : null);

    if (!user) {
      console.log('[getUserProfile] User not found for userId:', userId);
      return apiResponse(res, {
        success: false,
        message: 'User not found',
        statusCode: 404,
      });
    }

    if (!profile) {
      console.log('[getUserProfile] Profile not found for userId:', userId);
      return apiResponse(res, {
        success: false,
        message: 'Profile not found',
        statusCode: 404,
      });
    }

    const responseData = {
      fullName: user.fullName,
      mobileNumber: `+91${user.mobileNumber}`,
      isVerified: user.isVerified,
      isProfileComplete: user.isProfileComplete,
      email: profile.email,
      address: profile.address,
      dob: profile.dob,
      profileImageUrl: profile.profileImageUrl,
    };
    console.log('[getUserProfile] Constructed responseData:', responseData);

    console.log('[getUserProfile] Sending successful response');
    return apiResponse(res, {
      message: 'Profile fetched successfully',
      data: responseData,
      statusCode: 200,
    });
  } catch (error) {
    console.error('[getUserProfile] Error occurred:', {
      message: error.message,
      stack: error.stack,
    });
    return apiResponse(res, {
      success: false,
      message: 'Error fetching profile',
      error: error.message,
      statusCode: 500,
    });
  }
};

module.exports = {
  createUserProfile: exports.createUserProfile,
  deleteUserProfile: exports.deleteUserProfile,
  updateUserProfile: exports.updateUserProfile,
  getUserProfile: exports.getUserProfile,
};