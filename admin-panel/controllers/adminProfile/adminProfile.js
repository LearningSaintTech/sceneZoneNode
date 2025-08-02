// controllers/adminProfileController.js
const mongoose = require('mongoose');
const AdminAuth = require('../../models/Auth/auth');
const AdminProfile = require('../../models/profile/adminProfile');
const { uploadImage } = require('../../../utils/s3Functions'); // Adjust path as needed
const { apiResponse } = require('../../../utils/apiResponse');

exports.updateAdminProfile = async (req, res) => {
  try {
    const adminId = req.user?.userId; 
    console.log("Admin ID:", adminId);

    // Validate adminId
    if (!adminId || !mongoose.Types.ObjectId.isValid(adminId)) {
      return apiResponse(res, {
        success: false,
        message: 'Invalid or missing admin ID from authentication',
        data: null,
        statusCode: 401,
      });
    }

    // Find the admin
    const admin = await AdminAuth.findById(adminId);
    if (!admin) {
      return apiResponse(res, {
        success: false,
        message: 'Admin not found',
        data: null,
        statusCode: 404,
      });
    }

    // Prepare profile update data
    const { fullName, email, address, gender, dob } = req.body;
    const file = req.file; // Assuming multer middleware for file upload
    const profileData = { adminId };

    if (fullName) profileData.fullName = fullName;
    if (email) profileData.email = email;
    if (address) profileData.address = address;
    if (gender) {
      if (!['Male', 'Female'].includes(gender)) {
        return apiResponse(res, {
          success: false,
          message: 'Invalid gender. Must be "Male" or "Female"',
          data: null,
          statusCode: 400,
        });
      }
      profileData.gender = gender;
    }
    if (dob) {
      const parsedDob = new Date(dob);
      if (isNaN(parsedDob.getTime())) {
        return apiResponse(res, {
          success: false,
          message: 'Invalid date of birth format',
          data: null,
          statusCode: 400,
        });
      }
      profileData.dob = parsedDob;
    }

    // Handle profile image upload
    if (file) {
      const fileName = `admin_profile/${adminId}/${Date.now()}_${file.originalname}`;
      try {
        profileData.profileImageUrl = await uploadImage(file, fileName);
      } catch (uploadError) {
        return apiResponse(res, {
          success: false,
          message: `Failed to upload profile image: ${uploadError.message}`,
          data: null,
          statusCode: 500,
        });
      }
    }

    // Update or create profile
    const profile = await AdminProfile.findOneAndUpdate(
      { adminId },
      { $set: profileData },
      { new: true, upsert: true }
    );

    // Set isProfileComplete to true
    admin.isProfileComplete = true;
    await admin.save();

    // Prepare response
    const responseData = {
      mobileNumber: admin.mobileNumber,
      profile: {
        fullName: profile.fullName || null,
        email: profile.email || null,
        address: profile.address || null,
        gender: profile.gender || null,
        dob: profile.dob ? profile.dob.toISOString() : null,
        profileImageUrl: profile.profileImageUrl || null,
        isEmailVerified: profile.isEmailVerified || false
      }
    };

    return apiResponse(res, {
      success: true,
      message: 'Admin profile updated successfully',
      data: responseData,
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error updating admin profile:', error);
    return apiResponse(res, {
      success: false,
      message: 'Failed to update admin profile',
      error: error.message,
      statusCode: 500,
    });
  }
};


exports.getAdminProfileDetails = async (req, res) => {
  try {
    const adminId = req.user?.userId; 
    console.log("Admin ID:", adminId); 

    // Validate adminId
    if (!adminId || !mongoose.Types.ObjectId.isValid(adminId)) {
      return apiResponse(res, {
        success: false,
        message: 'Invalid or missing admin ID from authentication',
        data: null,
        statusCode: 401,
      });
    }

    // Find the admin
    const admin = await AdminAuth.findById(adminId);
    if (!admin) {
      return apiResponse(res, {
        success: false,
        message: 'Admin not found',
        data: null,
        statusCode: 404,
      });
    }

    // Find the admin profile
    const profile = await AdminProfile.findOne({ adminId });

    // Prepare response
    const responseData = {
      mobileNumber: admin.mobileNumber,
      isProfileComplete: admin.isProfileComplete,
      profile: {
        fullName: profile?.fullName || null,
        email: profile?.email || null,
        address: profile?.address || null,
        gender: profile?.gender || null,
        dob: profile?.dob ? profile.dob.toISOString() : null,
        profileImageUrl: profile?.profileImageUrl || null,
        isEmailVerified: profile?.isEmailVerified || false
      }
    };

    return apiResponse(res, {
      success: true,
      message: profile ? 'Admin profile details retrieved successfully' : 'No profile found for this admin',
      data: responseData,
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error retrieving admin profile details:', error);
    return apiResponse(res, {
      success: false,
      message: 'Failed to retrieve admin profile details',
      error: error.message,
      statusCode: 500,
    });
  }
};