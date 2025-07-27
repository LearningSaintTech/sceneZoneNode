const { apiResponse } = require("../../../utils/apiResponse");
const Event = require("../../../Host/models/Events/event");

const getFilteredEvents = async (req, res) => {
  try {
    console.log('Starting getFilteredEvents with request body:', req.body);
    const { genre, budget, location, keywords } = req.body;

    // Initialize the main query array for OR conditions
    const orQueries = [];
    console.log('Initialized orQueries array');

    // Genre filter: Support multiple genres
    if (genre && Array.isArray(genre) && genre.length > 0) {
      console.log('Processing genre filter:', genre);
      orQueries.push({ genre: { $in: genre } });
      console.log('Added genre filter to orQueries:', orQueries);
    }

    // Budget filter: Support multiple budget values or ranges
    if (budget && Array.isArray(budget) && budget.length > 0) {
      console.log('Processing budget filter:', budget);
      const budgetConditions = budget.map(b => {
        if (typeof b === "object" && b.min !== undefined && b.max !== undefined) {
          console.log('Processing budget range:', b);
          return { budget: { $gte: b.min, $lte: b.max } };
        }
        console.log('Processing single budget value:', b);
        return { budget: b };
      });
      orQueries.push({ $or: budgetConditions });
      console.log('Added budget filter to orQueries:', orQueries);
    }

    // Location filter: Support multiple locations with case-insensitive regex
    if (location && Array.isArray(location) && location.length > 0) {
      console.log('Processing location filter:', location);
      const locationConditions = location.map(loc => ({
        $or: [
          { venue: { $regex: loc, $options: "i" } },
          { location: { $regex: loc, $options: "i" } }
        ]
      }));
      orQueries.push(...locationConditions);
      console.log('Added location filter to orQueries:', orQueries);
    }

    // Enhanced Keyword search: Search in multiple fields
    if (keywords && Array.isArray(keywords) && keywords.length > 0) {
      console.log('Processing keywords filter:', keywords);
      const keywordConditions = keywords.map(keyword => ({
        $or: [
          { eventName: { $regex: keyword, $options: "i" } },
          { about: { $regex: keyword, $options: "i" } },
          { venue: { $regex: keyword, $options: "i" } },
          { location: { $regex: keyword, $options: "i" } },
          { genre: { $regex: keyword, $options: "i" } }
        ]
      }));
      orQueries.push(...keywordConditions);
      console.log('Added keyword filters to orQueries:', orQueries);
    }

    // Final query: Combine all conditions with OR
    const query = orQueries.length > 0 ? { $or: orQueries } : {};
    console.log('Final query constructed:', JSON.stringify(query, null, 2));

    // Add additional filters to exclude completed/cancelled events unless specifically requested
    const finalQuery = {
      ...query,
      isCompleted: false,
      isCancelled: false,
      status: { $ne: 'rejected' } // Exclude rejected events
    };

    console.log('Final query with status filters:', JSON.stringify(finalQuery, null, 2));

    const events = await Event.find(finalQuery).sort({ createdAt: -1 });
    console.log('Events found:', events.length);

    if (!events || events.length === 0) {
      console.log('No events found, returning 404 response');
      return apiResponse(res, {
        success: false,
        message: "No results found",
        data: [],
        statusCode: 404,
      });
    }

    console.log('Returning successful response with events');
    return apiResponse(res, {
      success: true,
      message: "Filtered events fetched successfully",
      data: events,
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error in getFilteredEvents:', error);
    return apiResponse(res, {
      success: false,
      message: "Server error",
      data: { error: error.message },
      statusCode: 500,
    });
  }
};

module.exports = { getFilteredEvents };