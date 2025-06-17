const Event = require("../../../Host/models/Events/event");
const {apiResponse} = require("../../../utils/apiResponse");

const getFilteredEvents = async (req, res) => {
  try {
    const { search, genre, budget, location } = req.query;

    const query = {};

    // Search only in eventName
    if (search) {
      query.eventName = { $regex: search, $options: "i" };
    }

    // Genre filter
    if (genre && genre.toLowerCase() !== "all") {
      query.genre = genre;
    }

    // Budget filter
    if (budget) {
      query.budget = budget;
    }

    // Location filter 
    if (location) {
      query.venue = { $regex: location, $options: "i" };
    }

    const events = await Event.find(query);

       if (!events || events.length === 0) {
      return apiResponse(res, {
        success: false,
        message: "No results found",
        data: [],
        statusCode: 404,
      });
    }


    
    return apiResponse(res, {
      success: true,
      message: "Filtered events fetched successfully",
      data: events,
      statusCode: 200,
    });
  } catch (error) {
    console.error(error);
    return apiResponse(res, {
      success: false,
      message: "Server error",
      data: { error: error.message },
      statusCode: 500,
    });
  }
};

module.exports = { getFilteredEvents };
