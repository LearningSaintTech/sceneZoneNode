const Shortlist = require("../../models/ShortlistArtist/shortlistArtist");
const ArtistProfile = require("../../../Artist/models/Profile/profile");
const { apiResponse } = require("../../../utils/apiResponse");
const mongoose = require("mongoose");

exports.shortlistArtist = async (req, res) => {
  try {
    const hostId = req.user.hostId;
    const { artistId } = req.body; 

    if (!hostId || !artistId) {
      return apiResponse(res, {
        success: false,
        statusCode: 400,
        message: "hostId or artistId missing.",
      });
    }

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(artistId)) {
      return apiResponse(res, {
        success: false,
        statusCode: 400,
        message: "Invalid artistId format.",
      });
    }

    // Find artist by the artistId field (not _id)
    const artist = await ArtistProfile.findOne({ artistId });

    if (!artist) {
      return apiResponse(res, {
        success: false,
        statusCode: 404,
        message: "Artist not found.",
      });
    }

    // Check if already shortlisted
    const exists = await Shortlist.findOne({ hostId, artistId });
    if (exists) {
      return apiResponse(res, {
        success: false,
        statusCode: 400,
        message: "Artist already shortlisted.",
      });
    }

    // Create new shortlist entry
    await Shortlist.create({ hostId, artistId });

    // Update artist profile
    artist.isShortlisted = true;
    await artist.save();

    return apiResponse(res, {
      statusCode: 201,
      message: "Artist successfully shortlisted.",
    });
  } catch (err) {
    console.error("Shortlist Error:", err);
    return apiResponse(res, {
      success: false,
      statusCode: 500,
      message: "Server error",
    });
  }
};

// GET Shortlisted Artists

exports.getShortlistedArtists = async (req, res) => {
  try {
    const hostId = req.user.hostId;

    if (!hostId) {
      return apiResponse(res, {
        success: false,
        statusCode: 400,
        message: "Host ID is missing.",
      });
    }

    // Find all shortlisted artist IDs for the host
    const shortlistedEntries = await Shortlist.find({ hostId }).select(
      "artistId"
    );

    if (shortlistedEntries.length === 0) {
      return apiResponse(res, {
        success: false,
        statusCode: 404,
        message: "No shortlisted artists found.",
      });
    }

    // Extract artist IDs
    const artistIds = shortlistedEntries.map((entry) => entry.artistId);

    // Fetch artist profiles for the shortlisted artist IDs
    const artists = await ArtistProfile.find({
      artistId: { $in: artistIds },
    }).select("genre budget performanceUrl profileImageUrl artistId");

    return apiResponse(res, {
      statusCode: 200,
      message: "Shortlisted artists fetched successfully.",
      data: artists,
    });
  } catch (err) {
    console.error("Error in getShortlistedArtists:", err.message);
    return apiResponse(res, {
      success: false,
      statusCode: 500,
      message: "Server error",
    });
  }
};
