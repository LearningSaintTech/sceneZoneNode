const FavouriteEvents = require("../../models/FavouriteEvent/favouriteEvent");
const { apiResponse } = require("../../../utils/apiResponse");

// POST: Add a favorite event
exports.addFavouriteEvent = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { eventId } = req.body;

    if(!eventId) {
      return apiResponse(res, {
        success: false,
        message: "Event ID is required",
        statusCode: 400,
      });
    }

    // Prevent duplicates
    const existing = await FavouriteEvents.findOne({ userId, eventId });
    if (existing) {
      return apiResponse(res, {
        success: false,
        message: "Event already added to favourites",
        statusCode: 400,
      });
    }

    const favourite = new FavouriteEvents({ userId, eventId });
    await favourite.save();

    return apiResponse(res, {
      message: "Event added to favourites",
      data: favourite,
      statusCode: 201,
    });
  } catch (err) {
    console.error("Add favourite error:", err);
    return apiResponse(res, {
      success: false,
      message: "Server error",
      data: { error: err.message },
      statusCode: 500,
    });
  }
};

// GET: Get all favorite events 
exports.getFavouriteEvents = async (req, res) => {
  try {
    const userId = req.user.userId;

    const favourites = await FavouriteEvents.find({ userId }).populate({
      path: "eventId",
      select: "eventName venue posterUrl", 
    });

    const events = favourites.map((fav) => fav.eventId);

    return apiResponse(res, {
      message: "Favourite events fetched",
      data: events,
      statusCode: 200,
    });
  } catch (err) {
    console.error("Get favourites error:", err);
    return apiResponse(res, {
      success: false,
      message: "Server error",
      data: { error: err.message },
      statusCode: 500,
    });
  }
};



// DELETE: Remove a favorite event
exports.removeFavouriteEvent = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { eventId } = req.params;

    if (!eventId) {
      return apiResponse(res, {
        success: false,
        message: "Event ID is required",
        statusCode: 400,
      });
    }

    // Find and delete the favorite event
    const favourite = await FavouriteEvents.findOneAndDelete({ userId, eventId });
    if (!favourite) {
      return apiResponse(res, {
        success: false,
        message: "Favorite event not found",
        statusCode: 200,
      });
    }

    return apiResponse(res, {
      message: "Event removed from favorites",
      statusCode: 200,
    });
  } catch (err) {
    console.error("Remove favourite error:", err);
    return apiResponse(res, {
      success: false,
      message: "Server error",
      data: { error: err.message },
      statusCode: 500,
    });
  }
};