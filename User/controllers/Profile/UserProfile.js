const UserProfile = require("../../models/Profile/UserProfile");
const UserAuthentication = require("../../models/Auth/Auth");
const { uploadImage, deleteImage } = require("../../../utils/s3Functions");
const { apiResponse } = require("../../../utils/apiResponse");

exports.createUserProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { email, address, dob,fullName,mobileNumber } = req.body; // <-- add dob here
if (!email || !address || !dob || !fullName || !mobileNumber) {
  return apiResponse(res, {
    success: false,
    message: "Missing required fields",
    statusCode: 400,
  });
}

    // Find the user in the UserAuthentication model
    const user = await UserAuthentication.findById(userId);
    if (!user) {
      return apiResponse(res, {
        success: false,
        message: "User not found",
        statusCode: 404,
      });
    }

    // Check if the user is verified
    if (!user.isVerified) {
      return apiResponse(res, {
        success: false,
        message: "User is not verified. Cannot create profile.",
        statusCode: 400,
      });
    }

    // Check if the user already has a profile
    const existingProfile = await UserProfile.findOne({ userId });
    if (existingProfile) {
      return apiResponse(res, {
        success: false,
        message: "Profile already exists for this user",
        statusCode: 400,
      });
    }

    // Handle profile image upload
    let profileImageUrl = null;
    if (req.file) {
      console.log("Uploading profile image:", req.file.originalname);
      const fileName = `User/profileImage/user_${userId}_${Date.now()}-${
        req.file.originalname
      }`;
      profileImageUrl = await uploadImage(req.file, fileName);
      console.log("Profile image uploaded, URL:", profileImageUrl);
    } else {
      return apiResponse(res, {
        success: false,
        message: "No profile image provided",
        statusCode: 400,
      });
    }

        user.fullName = fullName;
        user.mobileNumber=mobileNumber;


    const newProfile = new UserProfile({
      userId,
      email: email,
      address: address,
      dob: dob, // <-- add dob here
      profileImageUrl,
      // isProfile: true,
    });

    // Save the new profile
    await newProfile.save();
    user.isProfileComplete = true;
    await user.save();
    return apiResponse(res, {
      message: "Profile created successfully",
      data: newProfile,
      statusCode: 201,
    });
  } catch (error) {
    console.error("Error creating profile:", error);
    return apiResponse(res, {
      success: false,
      message: "Error creating profile",
      error: error.message,
      statusCode: 500,
    });
  }
};

exports.deleteUserProfile = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Find the user profile
    const profile = await UserProfile.findOne({ userId });
    if (!profile) {
      return apiResponse(res, {
        success: false,
        message: "Profile not found",
        statusCode: 404,
      });
    }

    // Delete profile image from S3 if it exists
    if (profile.profileImageUrl) {
      try {
        const fileName = profile.profileImageUrl.split(".com/")[1];
        await deleteImage(fileName);
        console.log(" Deleted profile image:", fileName);
      } catch (error) {
        console.warn(
          ` Failed to delete profile image ${profile.profileImageUrl}:`,
          error.message
        );
      }
    }

    // Delete the profile from the database
    await UserProfile.deleteOne({ userId });
    await UserAuthentication.deleteOne({ _id: userId });

    return apiResponse(res, {
      message: "Profile deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting profile:", error);
    return apiResponse(res, {
      success: false,
      message: "Error deleting profile",
      error: error.message,
      statusCode: 500,
    });
  }
};

exports.updateUserProfile = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { email, address, fullName, dob, mobileNumber } = req.body || {};

    // Validate required fields
    if (!email || !address || !fullName || !dob || !mobileNumber) {
      return apiResponse(res, {
        success: false,
        message: "Missing required fields",
        statusCode: 400,
      });
    }

    // Find user in UserAuthentication
    const user = await UserAuthentication.findById(userId);
    if (!user) {
      return apiResponse(res, {
        success: false,
        message: "User not found",
        statusCode: 404,
      });
    }

    // Find user profile
    const profile = await UserProfile.findOne({ userId });
    if (!profile) {
      return apiResponse(res, {
        success: false,
        message: "Profile not found",
        statusCode: 404,
      });
    }

    // Update UserAuthentication fields
    user.fullName = fullName;
    user.mobileNumber = mobileNumber;

    // Update UserProfile fields
    profile.email = email;
    profile.address = address;
    profile.dob = dob;

    // Handle profile image update
    if (req.file) {
      console.log("Uploading new profile image:", req.file.originalname);

      const newFileName = `User/profileImage/user_${userId}_${Date.now()}-${req.file.originalname}`;
      const newProfileImageUrl = await uploadImage(req.file, newFileName);

      // Delete old profile image
      if (profile.profileImageUrl) {
        try {
          const oldFileName = profile.profileImageUrl.split(".com/")[1];
          await deleteImage(oldFileName);
        } catch (error) {
          console.warn("Failed to delete old profile image:", error.message);
        }
      }

      profile.profileImageUrl = newProfileImageUrl;
    }

    // Save changes
    await profile.save();
    await user.save();

    return apiResponse(res, {
      message: "Profile updated successfully",
      data: profile,
    });
  } catch (error) {
    console.error("Error in updateUserProfile:", error.message);
    return apiResponse(res, {
      success: false,
      message: "Error updating profile",
      error: error.message,
      statusCode: 500,
    });
  }
};

exports.getUserProfile = async (req, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return apiResponse(res, {
        success: false,
        message: "Unauthorized access",
        statusCode: 401,
      });
    }

    // Fetch user and profile in parallel
    const [user, profile] = await Promise.all([
      UserAuthentication.findById(userId).select("fullName mobileNumber isVerified isProfileComplete"),
      UserProfile.findOne({ userId }),
    ]);

    if (!user) {
      return apiResponse(res, {
        success: false,
        message: "User not found",
        statusCode: 404,
      });
    }

    if (!profile) {
      return apiResponse(res, {
        success: false,
        message: "Profile not found",
        statusCode: 404,
      });
    }

    const responseData = {
      fullName: user.fullName,
      mobileNumber: user.mobileNumber,
      isVerified: user.isVerified,
      isProfileComplete: user.isProfileComplete,
      email: profile.email,
      address: profile.address,
      dob: profile.dob,
      profileImageUrl: profile.profileImageUrl,
    };

    return apiResponse(res, {
      message: "Profile fetched successfully",
      data: responseData,
      statusCode: 200,
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return apiResponse(res, {
      success: false,
      message: "Error fetching profile",
      error: error.message,
      statusCode: 500,
    });
  }
};

