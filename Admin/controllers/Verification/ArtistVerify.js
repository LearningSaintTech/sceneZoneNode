const ArtistProfile = require("../../../Artist/models/Profile/profile");
const { apiResponse } = require("../../../utils/apiResponse");

// Admin approves or rejects artist profile
exports.verifyArtist = async (req, res) => {
  try {
    const { artistId } = req.params;
    const { status } = req.body; 

    if (!["approved", "rejected"].includes(status)) {
      return apiResponse(res, {
        success: false,
        message: "Invalid status. Must be 'approved' or 'rejected.",
        statusCode: 400,
      });
    }

    const profile = await ArtistProfile.findOne({ artistId });

    if (!profile) {
      return apiResponse(res, {
        success: false,
        message: "Artist profile not found",
        statusCode: 404,
      });
    }

    if (status === "approved" && profile.status === "approved") {
      return apiResponse(res, {
        success: false,
        message: "Artist is already approved",
        statusCode: 400,
      });
    }

    profile.status = status;
    await profile.save();

    return apiResponse(res, {
      success: true,
      message: `Artist profile has been ${status}.`,
      data: profile,
    });
  } catch (error) {
    console.error("Admin updateArtistStatus error:", error.message);
    return apiResponse(res, {
      success: false,
      message: "Server error",
      data: { error: error.message },
      statusCode: 500,
    });
  }
};
