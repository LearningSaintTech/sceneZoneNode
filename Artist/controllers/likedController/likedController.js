// Add event to liked list
const LikedEvent = require("../../models/LikedEvent/LikedEvent");
const { apiResponse } = require("../../../utils/apiResponse");


exports.addLikedEvent = async (req, res) => {
  const artistId = req.user.artistId;
  const { eventId } = req.body;

  if (!artistId || !eventId) {
    return apiResponse(res, {
      success: false,
      message: "artistId (from token) and eventId are required",
      statusCode: 400,
    });
  }

  try {
    const alreadyLiked = await LikedEvent.findOne({ artistId, eventId });
    if (alreadyLiked) {
      return apiResponse(res, {
        success: false,
        message: "Event already liked by this artist",
        statusCode: 409,
      });
    }

    const likedEvent = new LikedEvent({ artistId, eventId });
    await likedEvent.save();

    return apiResponse(res, {
      success: true,
      message: "Event liked successfully",
      data: likedEvent,
      statusCode: 201,
    });
  } catch (error) {
    console.error("Add liked event error:", error);
    return apiResponse(res, {
      success: false,
      message: "Failed to like event",
      error: error.message,
      statusCode: 500,
    });
  }
};

// Remove event from liked list
exports.removeLikedEvent = async (req, res) => {
  const artistId = req.user.artistId;
  const { eventId } = req.body;

  if (!artistId || !eventId) {
    return apiResponse(res, {
      success: false,
      message: "artistId (from token) and eventId are required",
      statusCode: 400,
    });
  }

  try {
    const deleted = await LikedEvent.findOneAndDelete({ artistId, eventId });

    if (!deleted) {
      return apiResponse(res, {
        success: false,
        message: "Like record not found",
        statusCode: 404,
      });
    }

    return apiResponse(res, {
      success: true,
      message: "Event unliked successfully",
      statusCode: 200,
    });
  } catch (error) {
    console.error("Remove liked event error:", error);
    return apiResponse(res, {
      success: false,
      message: "Failed to remove liked event",
      error: error.message,
      statusCode: 500,
    });
  }
};

exports.getLikedEvents = async (req, res) => {
  const artistId = req.user.artistId;

  try {
    const likedEvents = await LikedEvent.find({ artistId });

    return apiResponse(res, {
      success: true,
      message: "Liked events fetched successfully",
      data: likedEvents,
      statusCode: 200,
    });
  } catch (error) {
    console.error("Get liked events error:", error);
    return apiResponse(res, {
      success: false,
      message: "Failed to fetch liked events",
      error: error.message,
      statusCode: 500,
    });
  }
};