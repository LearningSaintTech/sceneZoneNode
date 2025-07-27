const FavouriteEvents = require("../../models/FavouriteEvent/favouriteEvent");
const { apiResponse } = require("../../../utils/apiResponse");

// POST: Add a favorite event
exports.addFavouriteEvent = async (req, res) => {
  console.log('addFavouriteEvent: Request received', {
    userId: req.user.userId,
    body: req.body
  });
  try {
    const userId = req.user.userId;
    const { eventId } = req.body;

    console.log('addFavouriteEvent: Validating eventId', { eventId });
    if (!eventId) {
      const response = {
        success: false,
        message: "Event ID is required",
        statusCode: 400,
      };
      console.log('addFavouriteEvent: Validation failed - missing eventId', response);
      return apiResponse(res, response);
    }

    console.log('addFavouriteEvent: Checking for existing favorite', { userId, eventId });
    const existing = await FavouriteEvents.findOne({ userId, eventId });
    if (existing) {
      const response = {
        success: false,
        message: "Event already added to favourites",
        statusCode: 400,
      };
      console.log('addFavouriteEvent: Duplicate favorite found', response);
      return apiResponse(res, response);
    }

    console.log('addFavouriteEvent: Creating new favorite event');
    const favourite = new FavouriteEvents({ userId, eventId });
    await favourite.save();
    console.log('addFavouriteEvent: Favorite event saved', favourite);

    // Populate event details in the response
    const populatedFavourite = await FavouriteEvents.findById(favourite._id).populate('eventId');
    console.log('addFavouriteEvent: Populated favorite event', populatedFavourite);

    const response = {
      success: true, // Ensure success is true
      message: "Event added to favourites",
      data: populatedFavourite,
      statusCode: 201,
    };
    console.log('addFavouriteEvent: Sending success response', response);
    return apiResponse(res, response);
  } catch (err) {
    console.error('addFavouriteEvent: Error occurred', {
      message: err.message,
      stack: err.stack,
      userId: req.user.userId,
      eventId: req.body.eventId
    });
    const response = {
      success: false,
      message: "Server error",
      data: { error: err.message },
      statusCode: 500,
    };
    console.log('addFavouriteEvent: Sending error response', response);
    return apiResponse(res, response);
  }
};

// GET: Get all favorite events
exports.getFavouriteEvents = async (req, res) => {
  console.log('getFavouriteEvents: Request received', { userId: req.user.userId });
  try {
    const userId = req.user.userId;

    console.log('getFavouriteEvents: Fetching favorite events for user', { userId });
    const favourites = await FavouriteEvents.find({ userId }).populate({
      path: 'eventId',
      select: 'eventName location posterUrl ticketSetting eventDateTime',
    });
    console.log('getFavouriteEvents: Favorite events fetched', {
      count: favourites.length,
      favourites
    });

    const response = {
      success: true, // Ensure success is true
      message: "Favourite events fetched",
      data: favourites,
      statusCode: 200,
    };
    console.log('getFavouriteEvents: Sending success response', response);
    return apiResponse(res, response);
  } catch (err) {
    console.error('getFavouriteEvents: Error occurred', {
      message: err.message,
      stack: err.stack,
      userId: req.user.userId
    });
    const response = {
      success: false,
      message: "Server error",
      data: { error: err.message },
      statusCode: 500,
    };
    console.log('getFavouriteEvents: Sending error response', response);
    return apiResponse(res, response);
  }
};

// DELETE: Remove a favorite event
exports.removeFavouriteEvent = async (req, res) => {
  console.log('removeFavouriteEvent: Request received', {
    userId: req.user.userId,
    eventId: req.params.eventId
  });
  try {
    const userId = req.user.userId;
    const { eventId } = req.params;

    console.log('removeFavouriteEvent: Validating eventId', { eventId });
    if (!eventId) {
      const response = {
        success: false,
        message: "Event ID is required",
        statusCode: 400,
      };
      console.log('removeFavouriteEvent: Validation failed - missing eventId', response);
      return apiResponse(res, response);
    }

    console.log('removeFavouriteEvent: Attempting to remove favorite event', { userId, eventId });
    const favourite = await FavouriteEvents.findOneAndDelete({ userId, eventId });
    if (!favourite) {
      const response = {
        success: false,
        message: "Favorite event not found",
        statusCode: 200,
      };
      console.log('removeFavouriteEvent: Favorite event not found', response);
      return apiResponse(res, response);
    }

    const response = {
      success: true, // Ensure success is true
      message: "Event removed from favorites",
      statusCode: 200,
    };
    console.log('removeFavouriteEvent: Favorite event removed successfully', response);
    return apiResponse(res, response);
  } catch (err) {
    console.error('removeFavouriteEvent: Error occurred', {
      message: err.message,
      stack: err.stack,
      userId: req.user.userId,
      eventId: req.params.eventId
    });
    const response = {
      success: false,
      message: "Server error",
      data: { error: err.message },
      statusCode: 500,
    };
    console.log('removeFavouriteEvent: Sending error response', response);
    return apiResponse(res, response);
  }
};