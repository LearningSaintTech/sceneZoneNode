const SavedEvent = require("../../models/savedEvent/savedEvent");
const { apiResponse } = require("../../../utils/apiResponse");

// Save an event
exports.addSavedEvent = async (req, res) => {
  const artistId = req.user.artistId;
  const { eventId } = req.body;

  if (!eventId) {
    return apiResponse(res, {
      success: false,
      message: "eventId is required",
      statusCode: 400,
    });
  }

  try {
    const alreadySaved = await SavedEvent.findOne({ artistId, eventId });
    if (alreadySaved) {
      return apiResponse(res, {
        success: false,
        message: "Event already saved by this artist",
        statusCode: 409,
      });
    }

    const savedEvent = new SavedEvent({ artistId, eventId });
    await savedEvent.save();

    return apiResponse(res, {
      success: true,
      message: "Event saved successfully",
      data: savedEvent,
      statusCode: 201,
    });
  } catch (error) {
    console.error("Add saved event error:", error);
    return apiResponse(res, {
      success: false,
      message: "Failed to save event",
      error: error.message,
      statusCode: 500,
    });
  }
};

// Unsave an event
exports.removeSavedEvent = async (req, res) => {
  const artistId = req.user.artistId;
  const { eventId } = req.body;

  if (!eventId) {
    return apiResponse(res, {
      success: false,
      message: "eventId is required",
      statusCode: 400,
    });
  }

  try {
    const deleted = await SavedEvent.findOneAndDelete({ artistId, eventId });

    if (!deleted) {
      return apiResponse(res, {
        success: false,
        message: "Saved event not found",
        statusCode: 404,
      });
    }

    return apiResponse(res, {
      success: true,
      message: "Event unsaved successfully",
      statusCode: 200,
    });
  } catch (error) {
    console.error("Remove saved event error:", error);
    return apiResponse(res, {
      success: false,
      message: "Failed to unsave event",
      error: error.message,
      statusCode: 500,
    });
  }
};

// Get all saved events for artist
exports.getAllSavedEvents = async (req, res) => {
  const artistId = req.user.artistId;

  try {
    const savedEvents = await SavedEvent.find({ artistId }) 
      .populate({
        path: "eventId",
        populate: [
          { path: "hostId", select: "name email" }, // Populate host details
          { path: "assignedArtists", select: "name email" }, // Populate assigned artists
          { path: "guestList.userId", select: "name email" }, // Populate guest list users
        ],
        select: "eventName venue eventDateTime genre about location budget isSoundSystem posterUrl status isCompleted isCancelled Rating eventRatings guestLinkUrl showStatus Discount assignedArtists totalViewed totalRegistered totalLikes ticketSetting eventGuestEnabled guestList",
      });

    return apiResponse(res, {
      success: true,
      message: "Saved events fetched successfully",
      data: savedEvents,
      statusCode: 200,
    });
  } catch (error) {
    console.error("Get saved events error:", error);
    return apiResponse(res, {
      success: false,
      message: "Failed to fetch saved events",
      error: error.message,
      statusCode: 500,
    });
  }
};
