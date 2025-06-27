const mongoose = require("mongoose");
const Event = require("../../../Host/models/Events/event"); // Adjust path to your Event model

// Helper function to get date ranges
const getDateRange = (filterType) => {
  const now = new Date();
  const startOfDay = new Date(now.setHours(0, 0, 0, 0));
  const endOfDay = new Date(now.setHours(23, 59, 59, 999));

  switch (filterType?.toLowerCase()) {
    case "today":
      return { start: startOfDay, end: endOfDay };
    case "this week":
      const endOfWeek = new Date(startOfDay);
      endOfWeek.setDate(startOfDay.getDate() + (7 - startOfDay.getDay()));
      return { start: startOfDay, end: endOfWeek };
    case "this weekend":
      const saturday = new Date(startOfDay);
      saturday.setDate(startOfDay.getDate() + (6 - startOfDay.getDay()));
      const sunday = new Date(saturday);
      sunday.setDate(saturday.getDate() + 1);
      return { start: saturday, end: new Date(sunday.setHours(23, 59, 59, 999)) };
    case "next weekend":
      const nextSaturday = new Date(startOfDay);
      nextSaturday.setDate(startOfDay.getDate() + (13 - startOfDay.getDay()));
      const nextSunday = new Date(nextSaturday);
      nextSunday.setDate(nextSaturday.getDate() + 1);
      return { start: nextSaturday, end: new Date(nextSunday.setHours(23, 59, 59, 999)) };
    case "nearby":
      return {}; // Nearby is handled via location/radius, not date
    default:
      return {};
  }
};

// Main filter controller
const filterEvents = async (req, res) => {
  try {
    // Validate request body
    const { dateFilter, priceRange, location, radius = 50 } = req.body || {};

    // Check if body is empty
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Request body is empty. Please provide filter parameters.",
      });
    }

    // Valid filter keywords
    const validDateFilters = ["nearby", "today", "this week", "this weekend", "next weekend"];
    const validPriceRanges = ["ticket less than 1000", "1000-5000", "5000+"];

    // Build query object
    let query = {
      isCompleted: false,
      isCancelled: false,
      "ticketSetting.isEnabled": true,
    };

    // Date filter
    if (dateFilter) {
      if (typeof dateFilter !== "string") {
        return res.status(400).json({
          success: false,
          message: "Invalid dateFilter. It must be a string.",
        });
      }
      const normalizedDateFilter = dateFilter.toLowerCase();
      if (!validDateFilters.includes(normalizedDateFilter)) {
        return res.status(400).json({
          success: false,
          message: `Invalid dateFilter value: ${dateFilter}. Supported values: ${validDateFilters.join(", ")}.`,
        });
      }
      if (normalizedDateFilter !== "nearby") {
        const { start, end } = getDateRange(normalizedDateFilter);
        if (start && end) {
          query.eventDateTime = {
            $elemMatch: {
              $gte: start,
              $lte: end,
            },
          };
        }
      }
    }

    // Price range filter
    if (priceRange) {
      if (typeof priceRange !== "string") {
        return res.status(400).json({
          success: false,
          message: "Invalid priceRange. It must be a string.",
        });
      }
      // Normalize priceRange to handle variations (e.g., "₹1000-₹5000" or "Ticket less than Rs1000")
      let normalizedPriceRange = priceRange
        .toLowerCase()
        .replace(/₹|rs/gi, "")
        .replace(/\s+/g, " ")
        .trim();
      if (normalizedPriceRange.startsWith("ticket less than")) {
        normalizedPriceRange = "ticket less than 1000";
      } else if (normalizedPriceRange === "1000-5000") {
        normalizedPriceRange = "1000-5000";
      } else if (normalizedPriceRange === "5000+") {
        normalizedPriceRange = "5000+";
      }
      if (!validPriceRanges.includes(normalizedPriceRange)) {
        return res.status(400).json({
          success: false,
          message: `Invalid priceRange value: ${priceRange}. Supported values: Ticket less than ₹1000, ₹1000-₹5000, ₹5000+.`,
        });
      }
      switch (normalizedPriceRange) {
        case "ticket less than 1000":
          query["ticketSetting.price"] = { $lte: 1000 };
          break;
        case "1000-5000":
          query["ticketSetting.price"] = { $gte: 1000, $lte: 5000 };
          break;
        case "5000+":
          query["ticketSetting.price"] = { $gt: 5000 };
          break;
      }
    }

    // Location filter (for "Nearby" or explicit location)
    if (location || (dateFilter && dateFilter.toLowerCase() === "nearby")) {
      if (!location || typeof location !== "string") {
        return res.status(400).json({
          success: false,
          message: "Location is required for 'Nearby' filter or when location is provided.",
        });
      }
      query.location = { $regex: location, $options: "i" };
      // Note: For proper geospatial queries (e.g., for "Nearby" with radius), modify the schema to include
      // a GeoJSON field and use MongoDB's geospatial operators ($near, $geoWithin)
    }

    // Validate radius if provided
    if (radius && (isNaN(radius) || radius <= 0)) {
      return res.status(400).json({
        success: false,
        message: "Invalid radius. It must be a positive number.",
      });
    }
    // Note: Radius is not used in the query yet, as it requires geospatial data setup

    // Execute query
    const events = await Event.find(query)
      .select("eventName venue eventDateTime genre posterUrl ticketSetting location")
      .populate("hostId", "name")
      .lean();

    // Add computed field for showStatus
    const processedEvents = events.map((event) => {
      if (!event.eventDateTime || !event.eventDateTime.length) {
        event.showStatus = "unknown";
        return event;
      }
      const latestDate = event.eventDateTime.reduce((latest, curr) =>
        new Date(curr) > new Date(latest) ? curr : latest
      );
      event.showStatus = new Date(latestDate) < new Date() ? "recent" : "upcoming";
      return event;
    });

    res.status(200).json({
      success: true,
      count: processedEvents.length,
      data: processedEvents,
    });
  } catch (error) {
    console.error("Error filtering events:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching events",
      error: error.message,
    });
  }
};

module.exports = { filterEvents };