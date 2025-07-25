const ShortlistArtist = require("../../models/ShortlistArtist/shortlistArtist");
const ArtistProfile = require("../../../Artist/models/Profile/profile");
const { apiResponse } = require("../../../utils/apiResponse");
const mongoose = require("mongoose");

exports.shortlistArtist = async (req, res) => {
  try {
    const hostId = req.user.hostId;
    console.log(hostId);
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
    const exists = await ShortlistArtist.findOne({ hostId, artistId });
    if (exists) {
      return apiResponse(res, {
        success: false,
        statusCode: 400,
        message: "Artist already shortlisted.",
      });
    }

    // Create new shortlist entry
    const shortlistArtist = await ShortlistArtist.create({ hostId, artistId });

    return apiResponse(res, {
      statusCode: 201,
      message: "Artist successfully shortlisted.",
      data: shortlistArtist
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

exports.getAllShortlistedArtists = async (req, res) => {
  try {
    const hostId = req.user.hostId;

    console.log("Fetching shortlisted artists for host:", hostId);

    if (!hostId) {
      return apiResponse(res, {
        success: false,
        statusCode: 400,
        message: "Host ID is missing.",
      });
    }

    // Find all shortlisted entries for the host
    const shortlistedEntries = await ShortlistArtist.find({ hostId }).select(
      "hostId isSalaryBasis assignedEvents artistId"
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

    // Fetch artist profiles based on artistIds
    const artistProfiles = await ArtistProfile.find({
      artistId: { $in: artistIds },
    }).select("genre budget performanceUrl profileImageUrl artistId");

    // Map shortlisted entries to include artist profile, hostId, isSalaryBasis, and assignedEvents
    const responseData = shortlistedEntries.map((entry) => {
      const artistProfile = artistProfiles.find((profile) =>
        profile.artistId.equals(entry.artistId)
      );
      return {
        hostId: entry.hostId,
        isSalaryBasis: entry.isSalaryBasis,
        assignedEvents: entry.assignedEvents,
        artistProfile: artistProfile || null, // Handle case where profile is not found
      };
    });

    return apiResponse(res, {
      success: true,
      statusCode: 200,
      message: "Shortlisted artists fetched successfully.",
      data: responseData,
    });
  } catch (err) {
    console.error("Error in getAllShortlistedArtists:", err.message);
    return apiResponse(res, {
      success: false,
      statusCode: 500,
      message: "Server error",
      data: { error: err.message },
    });
  }
};

exports.removeShortlistArtist = async (req, res) => {
  try {
    const hostId = req.user.hostId;
    const { artistId } = req.params;

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

    // Check if the artist is shortlisted by the host
    const shortlistEntry = await ShortlistArtist.findOne({ hostId, artistId });

    if (!shortlistEntry) {
      return apiResponse(res, {
        success: false,
        statusCode: 404,
        message: `Not Found Any Entry Of Shortlist Artist of this Host id ${hostId}`,
      });
    }

    // Remove the shortlist entry
    await ShortlistArtist.deleteOne({ hostId, artistId });

    // Update artist profile
    const artist = await ArtistProfile.findOne({ artistId });
    if (artist) {
      artist.isShortlisted = false;
      await artist.save();
    }

    return apiResponse(res, {
      statusCode: 200,
      message: "Artist successfully removed from shortlist.",
    });
  } catch (err) {
    console.error("Remove Shortlist Error:", err);
    return apiResponse(res, {
      success: false,
      statusCode: 500,
      message: "Server error",
    });
  }
};

exports.updateShortlistArtist = async (req, res) => {
  try {
    const hostId = req.user.hostId;
    const { artistId, isSalaryBasis, assignedEvents } = req.body;

    // Validate required fields
    if (!hostId || !artistId) {
      return apiResponse(res, {
        success: false,
        statusCode: 400,
        message: "hostId or artistId missing.",
      });
    }

    // Validate ObjectId format for artistId
    if (!mongoose.Types.ObjectId.isValid(artistId)) {
      return apiResponse(res, {
        success: false,
        statusCode: 400,
        message: "Invalid artistId format.",
      });
    }

    // Validate assignedEvents if provided
    if (assignedEvents) {
      if (!Array.isArray(assignedEvents)) {
        return apiResponse(res, {
          success: false,
          statusCode: 400,
          message: "assignedEvents must be an array.",
        });
      }

      // Validate each event ID in assignedEvents
      for (const eventId of assignedEvents) {
        if (!mongoose.Types.ObjectId.isValid(eventId)) {
          return apiResponse(res, {
            success: false,
            statusCode: 400,
            message: `Invalid eventId: ${eventId}.`,
          });
        }
      }
    }

    // Check if the shortlist entry exists
    const shortlistEntry = await ShortlistArtist.findOne({ hostId, artistId });
    if (!shortlistEntry) {
      return apiResponse(res, {
        success: false,
        statusCode: 404,
        message: "Shortlist entry not found.",
      });
    }

    // Update fields
    if (isSalaryBasis !== undefined) {
      shortlistEntry.isSalaryBasis = isSalaryBasis;
    }
    if (assignedEvents) {
      shortlistEntry.assignedEvents = assignedEvents;
    }

    // Save the updated shortlist entry
    await shortlistEntry.save();

    return apiResponse(res, {
      success: true,
      statusCode: 200,
      message: "Shortlist entry updated successfully.",
      data: shortlistEntry,
    });
  } catch (err) {
    console.error("Update Shortlist Error:", err);
    return apiResponse(res, {
      success: false,
      statusCode: 500,
      message: "Server error",
      data: { error: err.message },
    });
  }
};