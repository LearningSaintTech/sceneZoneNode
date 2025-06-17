const HostProfile = require("../../models/Profile/profile");
const HostAuthentication = require("../../models/Auth/Auth");
const { uploadImage, deleteImage } = require("../../../utils/s3Functions");
const { apiResponse } = require("../../../utils/apiResponse");

exports.updateHostProfile = async (req, res) => {
  try {
    const hostId = req.user.hostId;
    console.log("Host ID:", hostId);

    const { fullName, email, location } = req.body || {};
    // Find the host profile
    const profile = await HostProfile.findOne({ hostId });
    if (!profile) {
     return apiResponse(res, {
       success: false,
       statusCode: 404,
       message: "Profile not found",
     });
    }

    // Check if the email already exists in another profile
    if (email && email !== profile.email) {
      const emailExists = await HostProfile.findOne({ email });
      if (emailExists) {
        return apiResponse(res, {
          success: false,
          statusCode: 400,
          message:
            "Profile with this email already exists. Use a different one.",
        });
      }
    }

    // Update profile fields if provided
    if (email) profile.email = email;
    if (location) profile.location = location;
    if (fullName) profile.fullName = fullName;

    // Handle profile image update (optional)
    if (req.file) {
      // Upload new profile image
      const newFileName = `Host/profileImage/host_${hostId}_${Date.now()}-${
        req.file.originalname
      }`;
      const newProfileImageUrl = await uploadImage(req.file, newFileName);

      // Delete old profile image if it exists
      if (profile.profileImageUrl) {
        try {
          const oldFileName = profile.profileImageUrl.split(".com/")[1];
          await deleteImage(oldFileName);
        } catch (error) {
          console.warn(
            `Failed to delete old profile image ${profile.profileImageUrl}:`,
            error.message
          );
        }
      }

      profile.profileImageUrl = newProfileImageUrl;
    }

    await profile.save();

    
    // Update location in HostAuthentication if it's null and a new location is provided
    if (location) {
      const hostAuth = await HostAuthentication.findById(profile.hostId);
      if (hostAuth && (hostAuth.location === null || hostAuth.location === undefined)) {
        hostAuth.location = location;
        await hostAuth.save();
      }
    }

    return apiResponse(res, {
      statusCode: 200,
      message: "Profile updated successfully",
      data: profile,
    });
  } catch (error) {
    return apiResponse(res, {
      success: false,
      statusCode: 500,
      message: "Failed to update profile",
      data: { error: error.message },
    });
  }
};

exports.deleteHostProfile = async (req, res) => {
  try {
    const hostId = req.user.hostId;

    // Find the host profile
    const profile = await HostProfile.findOne({ hostId });
    if (!profile) {
      return apiResponse(res, {
        success: false,
        statusCode: 404,
        message: "Profile not found",
      });
    }
    // Delete profile image from S3 if it exists
    if (profile.profileImageUrl) {
      try {
        const fileName = profile.profileImageUrl.split(".com/")[1];
        await deleteImage(fileName);
      } catch (error) {
        console.warn(
          `Failed to delete profile image ${profile.profileImageUrl}:`,
          error.message
        );
      }
    }

    // Delete the profile from the database
    await HostProfile.deleteOne({ hostId });
    await HostAuthentication.deleteOne({ _id: hostId });

    return apiResponse(res, {
      statusCode: 200,
      message: "Profile deleted successfully",
    });
  } catch (error) {
    return apiResponse(res, {
      success: false,
      statusCode: 500,
      message: "Failed to delete profile",
      data: { error: error.message },
    });
  }
};

exports.getHostProfile = async (req, res) => {
  try {
    const hostId = req.user.hostId;

    // Find the host profile
    const profile = await HostProfile.findOne({ hostId });
    if (!profile) {
      return apiResponse(res, {
        success: false,
        statusCode: 404,
        message: "Profile not found",
      });
    }
    console.log("Host profile found:", profile.fullName);

    return apiResponse(res, {
      statusCode: 200,
      message: "Profile fetched successfully",
      data: profile,
    });
  } catch (error) {
    return apiResponse(res, {
      success: false,
      statusCode: 500,
      message: "Failed to fetch profile",
      data: { error: error.message },
    });
  }
};
