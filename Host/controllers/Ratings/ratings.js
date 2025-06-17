const Event = require("../../../Host/models/Events/event");
const { apiResponse } = require("../../../utils/apiResponse");

exports.rateEvent = async (req, res) => {
  const { eventId, rating } = req.body;
  const userType = req.user.role === "artist" ? "Artist" : "User";
  const raterId =
    req.user.role === "artist" ? req.user.artistId : req.user.userId;

  try {
    if (!rating || rating < 1 || rating > 5) {
      return apiResponse(res, {
        success: false,
        message: "Rating must be between 1 and 5",
        statusCode: 400,
      });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return apiResponse(res, {
        success: false,
        message: "Event not found",
        statusCode: 404,
      });
    }

    const alreadyRated = event.eventRatings.find(
      (entry) =>
        entry.userId &&
        entry.userId.toString() === raterId &&
        entry.userType === userType
    );

    if (alreadyRated) {
      return apiResponse(res, {
        success: false,
        message: "You have already rated this event",
        statusCode: 400,
      });
    }

    // ✅ Now push with proper userId
    event.eventRatings.push({
      userId: raterId,
      userType,
      rating,
    });

    const total = event.eventRatings.reduce((sum, r) => sum + r.rating, 0);
    event.Rating = parseFloat((total / event.eventRatings.length).toFixed(2));

    await event.save();

    return apiResponse(res, {
      success: true,
      message: "Event rated successfully",
      data: {
        averageRating: event.Rating,
        totalRatings: event.eventRatings.length,
      },
    });
  } catch (error) {
    console.error("Rating error:", error);
    return apiResponse(res, {
      success: false,
      message: "Rating failed",
      data: { error: error.message },
      statusCode: 500,
    });
  }
};
