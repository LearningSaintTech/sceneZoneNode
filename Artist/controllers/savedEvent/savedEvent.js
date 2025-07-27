const SavedEvent = require("../../models/savedEvent/savedEvent");
const { apiResponse } = require("../../../utils/apiResponse");

// Save an event
exports.addSavedEvent = async (req, res) => {
  const artistId = req.user.artistId;
  const { eventId } = req.body;
  const timestamp = new Date().toISOString();

  console.log(`[${timestamp}] Add saved event request: artistId=${artistId}, eventId=${eventId}`);

  if (!eventId) {
    console.error(`[${timestamp}] Validation failed: eventId is required`);
    return apiResponse(res, {
      success: false,
      message: "eventId is required",
      statusCode: 400,
    });
  }

  try {
    console.log(`[${timestamp}] Checking if event is already saved: artistId=${artistId}, eventId=${eventId}`);
    const alreadySaved = await SavedEvent.findOne({ artistId, eventId });
    if (alreadySaved) {
      console.warn(`[${timestamp}] Event already saved: artistId=${artistId}, eventId=${eventId}`);
      return apiResponse(res, {
        success: false,
        message: "Event already saved by this artist",
        statusCode: 409,
      });
    }

    console.log(`[${timestamp}] Saving new event: artistId=${artistId}, eventId=${eventId}`);
    const savedEvent = new SavedEvent({ artistId, eventId });
    await savedEvent.save();
    console.log(`[${timestamp}] Event saved successfully: savedEventId=${savedEvent._id}`);

    return apiResponse(res, {
      success: true,
      message: "Event saved successfully",
      data: savedEvent,
      statusCode: 201,
    });
  } catch (error) {
    console.error(`[${timestamp}] Add saved event error: artistId=${artistId}, eventId=${eventId}`, {
      error: error.message,
      stack: error.stack,
    });
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
  const timestamp = new Date().toISOString();

  console.log(`[${timestamp}] Remove saved event request: artistId=${artistId}, eventId=${eventId}`);

  if (!eventId) {
    console.error(`[${timestamp}] Validation failed: eventId is required`);
    return apiResponse(res, {
      success: false,
      message: "eventId is required",
      statusCode: 400,
    });
  }

  try {
    console.log(`[${timestamp}] Deleting saved event: artistId=${artistId}, eventId=${eventId}`);
    const deleted = await SavedEvent.findOneAndDelete({ artistId, eventId });

    if (!deleted) {
      console.warn(`[${timestamp}] Saved event not found: artistId=${artistId}, eventId=${eventId}`);
      return apiResponse(res, {
        success: false,
        message: "Saved event not found",
        statusCode: 404,
      });
    }

    console.log(`[${timestamp}] Event unsaved successfully: artistId=${artistId}, eventId=${eventId}`);
    return apiResponse(res, {
      success: true,
      message: "Event unsaved successfully",
      statusCode: 200,
    });
  } catch (error) {
    console.error(`[${timestamp}] Remove saved event error: artistId=${artistId}, eventId=${eventId}`, {
      error: error.message,
      stack: error.stack,
    });
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
  const timestamp = new Date().toISOString();

  console.log(`[${timestamp}] Get all saved events request: artistId=${artistId}`);

  try {
    console.log(`[${timestamp}] Fetching saved events for artistId=${artistId}`);
    const savedEvents = await SavedEvent.find({ artistId })
      .populate({
        path: "eventId",
        populate: [
          { path: "hostId", select: "name email" },
          { path: "assignedArtists", select: "name email" },
          { path: "guestList.userId", select: "name email" },
        ],
        select: "eventName venue eventDateTime genre about location budget isSoundSystem posterUrl status isCompleted isCancelled Rating eventRatings guestLinkUrl showStatus Discount assignedArtists totalViewed totalRegistered totalLikes ticketSetting eventGuestEnabled guestList",
      });

    console.log(`[${timestamp}] Fetched ${savedEvents.length} saved events for artistId=${artistId}`);

    return apiResponse(res, {
      success: true,
      message: "Saved events fetched successfully",
      data: savedEvents,
      statusCode: 200,
    });
  } catch (error) {
    console.error(`[${timestamp}] Get saved events error: artistId=${artistId}`, {
      error: error.message,
      stack: error.stack,
    });
    return apiResponse(res, {
      success: false,
      message: "Failed to fetch saved events",
      error: error.message,
      statusCode: 500,
    });
  }
};