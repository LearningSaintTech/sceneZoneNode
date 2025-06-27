const { apiResponse } = require("../../../utils/apiResponse");
const Event = require("../../../Host/models/Events/event");

const getFilteredEvents = async (req, res) => {
  try {
    const { genre, budget, location, keywords } = req.body;

    // Initialize the main query array for OR conditions
    const orQueries = [];

    // Genre filter: Support multiple genres
    if (genre && Array.isArray(genre) && genre.length > 0) {
      orQueries.push({ genre: { $in: genre } });
    }

    // Budget filter: Support multiple budget values or ranges
    if (budget && Array.isArray(budget) && budget.length > 0) {
      const budgetConditions = budget.map(b => {
        if (typeof b === "object" && b.min !== undefined && b.max !== undefined) {
          return { budget: { $gte: b.min, $lte: b.max } };
        }
        return { budget: b };
      });
      orQueries.push({ $or: budgetConditions });
    }

    // Location filter: Support multiple locations with case-insensitive regex
    if (location && Array.isArray(location) && location.length > 0) {
      orQueries.push({
        venue: { $in: location.map(loc => new RegExp(loc, "i")) }
      });
    }

    // Keyword search in eventName, about, and venue
    if (keywords && Array.isArray(keywords) && keywords.length > 0) {
      const keywordConditions = keywords.map(keyword => ({
        $or: [
          { eventName: { $regex: keyword, $options: "i" } },
          { about: { $regex: keyword, $options: "i" } },
          { venue: { $regex: keyword, $options: "i" } },
        ]
      }));
      orQueries.push(...keywordConditions);
    }

    // Final query: Combine all conditions with OR
    const query = orQueries.length > 0 ? { $or: orQueries } : {};

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