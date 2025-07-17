const mongoose = require("mongoose");
const Event = require("../../../Host/models/Events/event");

// Helper function to get date ranges
const getDateRange = (filterType) => {
  console.log(`getDateRange called with filterType: ${filterType}`);
  const now = new Date();
  const startOfDay = new Date(now.setHours(0, 0, 0, 0));
  const endOfDay = new Date(now.setHours(23, 59, 59, 999));

  switch (filterType?.toLowerCase()) {
    case "today":
      console.log("Processing 'today' filter");
      return { start: startOfDay, end: endOfDay };
    case "this week":
      const endOfWeek = new Date(startOfDay);
      endOfWeek.setDate(startOfDay.getDate() + (7 - startOfDay.getDay()));
      console.log(`Processing 'this week' filter, start: ${startOfDay}, end: ${endOfWeek}`);
      return { start: startOfDay, end: endOfWeek };
    case "this weekend":
      const saturday = new Date(startOfDay);
      saturday.setDate(startOfDay.getDate() + (6 - startOfDay.getDay()));
      const sunday = new Date(saturday);
      sunday.setDate(saturday.getDate() + 1);
      console.log(`Processing 'this weekend' filter, start: ${saturday}, end: ${sunday}`);
      return { start: saturday, end: new Date(sunday.setHours(23, 59, 59, 999)) };
    case "next weekend":
      const nextSaturday = new Date(startOfDay);
      nextSaturday.setDate(startOfDay.getDate() + (13 - startOfDay.getDay()));
      const nextSunday = new Date(nextSaturday);
      nextSunday.setDate(nextSaturday.getDate() + 1);
      console.log(`Processing 'next weekend' filter, start: ${nextSaturday}, end: ${nextSunday}`);
      return { start: nextSaturday, end: new Date(nextSunday.setHours(23, 59, 59, 999)) };
    case "nearby":
      console.log("Processing 'nearby' filter, returning empty date range");
      return {};
    default:
      console.log("No valid filterType provided, returning empty date range");
      return {};
  }
};

// Filter events controller
const filterEvents = async (req, res) => {
  console.log("filterEvents controller called with request body:", req.body);
  try {
    // Default conditions (applied with AND)
    let defaultQuery = {
      isCompleted: false,
      isCancelled: false,
      "ticketSetting.isEnabled": true,
    };
    console.log("Default query:", defaultQuery);

    // Array to hold OR conditions
    let orConditions = [];

    // Check if body is provided and process filters
    if (req.body && Object.keys(req.body).length > 0) {
      const { dateFilter, priceRange, location, radius = 50, genre } = req.body;
      console.log(`Processing filters: dateFilter=${dateFilter}, priceRange=${priceRange}, location=${location}, radius=${radius}, genre=${genre}`);

      // Valid filter keywords
      const validDateFilters = ["nearby", "today", "this week", "this weekend", "next weekend"];
      const validPriceRanges = ["ticket less than 1000", "1000-5000", "5000+"];

      // Date filter
      if (dateFilter) {
        if (typeof dateFilter !== "string") {
          console.log("Invalid dateFilter type:", typeof dateFilter);
          return res.status(400).json({
            success: false,
            message: "Invalid dateFilter. It must be a string.",
          });
        }
        const normalizedDateFilter = dateFilter.toLowerCase();
        console.log("Normalized dateFilter:", normalizedDateFilter);
        if (!validDateFilters.includes(normalizedDateFilter)) {
          console.log(`Invalid dateFilter value: ${dateFilter}`);
          return res.status(400).json({
            success: false,
            message: `Invalid dateFilter value: ${dateFilter}. Supported values: ${validDateFilters.join(", ")}.`,
          });
        }
        if (normalizedDateFilter !== "nearby") {
          const { start, end } = getDateRange(normalizedDateFilter);
          console.log(`Date range for ${normalizedDateFilter}: start=${start}, end=${end}`);
          if (start && end) {
            orConditions.push({
              eventDateTime: {
                $elemMatch: {
                  $gte: start,
                  $lte: end,
                },
              },
            });
            console.log("Added dateFilter to OR conditions:", orConditions);
          }
        }
      }

      // Price range filter
      if (priceRange) {
        if (typeof priceRange !== "string") {
          console.log("Invalid priceRange type:", typeof priceRange);
          return res.status(400).json({
            success: false,
            message: "Invalid priceRange. It must be a string.",
          });
        }
        let normalizedPriceRange = priceRange
          .toLowerCase()
          .replace(/₹|rs/gi, "")
          .replace(/\s+/g, " ")
          .trim();
        console.log("Normalized priceRange:", normalizedPriceRange);
        if (normalizedPriceRange.startsWith("ticket less than")) {
          normalizedPriceRange = "ticket less than 1000";
          console.log("Adjusted priceRange to 'ticket less than 1000'");
        }
        if (!validPriceRanges.includes(normalizedPriceRange)) {
          console.log(`Invalid priceRange value: ${priceRange}`);
          return res.status(400).json({
            success: false,
            message: `Invalid priceRange value: ${priceRange}. Supported values: Ticket less than ₹1000, ₹1000-₹5000, ₹5000+.`,
          });
        }
        let priceCondition = {};
        switch (normalizedPriceRange) {
          case "ticket less than 1000":
            priceCondition = { "ticketSetting.price": { $lte: 1000 } };
            console.log("Applied price filter: <= 1000");
            break;
          case "1000-5000":
            priceCondition = { "ticketSetting.price": { $gte: 1000, $lte: 5000 } };
            console.log("Applied price filter: 1000-5000");
            break;
          case "5000+":
            priceCondition = { "ticketSetting.price": { $gt: 5000 } };
            console.log("Applied price filter: > 5000");
            break;
        }
        orConditions.push(priceCondition);
        console.log("Added priceRange to OR conditions:", orConditions);
      }

      // Location filter
      if (location && typeof location === "string") {
        orConditions.push({
          location: { $regex: location, $options: "i" },
        });
        console.log(`Applied location filter: ${location}`);
        console.log("Added location to OR conditions:", orConditions);
      }

      // Genre filter
      if (genre) {
        if (typeof genre === "string") {
          orConditions.push({
            genre: { $regex: genre, $options: "i" },
          });
          console.log(`Applied genre filter (string): ${genre}`);
        } else if (Array.isArray(genre)) {
          const validGenres = genre.filter((g) => typeof g === "string" && g.trim().length > 0);
          if (validGenres.length > 0) {
            orConditions.push({
              genre: { $in: validGenres.map((g) => new RegExp(g, "i")) },
            });
            console.log(`Applied genre filter (array):`, validGenres);
          }
        } else {
          console.log("Invalid genre type:", typeof genre);
          return res.status(400).json({
            success: false,
            message: "Invalid genre. It must be a string or an array of strings.",
          });
        }
      }

      // Validate radius if provided
      if (radius && (isNaN(radius) || radius <= 0)) {
        console.log("Invalid radius:", radius);
        return res.status(400).json({
          success: false,
          message: "Invalid radius. It must be a positive number.",
        });
      }
    } else {
      console.log("No filters provided, using default query");
    }

    // Combine default query with OR conditions
    let finalQuery = defaultQuery;
    if (orConditions.length > 0) {
      finalQuery = {
        $and: [defaultQuery, { $or: orConditions }],
      };
    }
    console.log("Executing query:", finalQuery);

    // Execute query
    const events = await Event.find(finalQuery)
      .select("eventName venue eventDateTime genre posterUrl ticketSetting location")
      .populate("hostId", "name")
      .lean();
    console.log(`Query returned ${events.length} events`);

    // Add computed field for showStatus
    const processedEvents = events.map((event) => {
      if (!event.eventDateTime || !event.eventDateTime.length) {
        console.log(`Event ${event._id} has no valid eventDateTime, setting showStatus to 'unknown'`);
        event.showStatus = "unknown";
        return event;
      }
      const latestDate = event.eventDateTime.reduce((latest, curr) =>
        new Date(curr) > new Date(latest) ? curr : latest
      );
      const showStatus = new Date(latestDate) < new Date() ? "recent" : "upcoming";
      console.log(`Event ${event._id} showStatus: ${showStatus}, latestDate: ${latestDate}`);
      event.showStatus = showStatus;
      return event;
    });

    console.log("Returning response with processed events:", processedEvents.length);
    res.status(200).json({
      success: true,
      count: processedEvents.length,
      data: processedEvents,
    });
  } catch (error) {
    console.error("Error in filterEvents:", error.message, error.stack);
    res.status(500).json({
      success: false,
      message: "Server error while fetching events",
      error: error.message,
    });
  }
};

// Search events controller
const searchEvents = async (req, res) => {
  console.log("searchEvents controller called with request body:", req.body);
  try {
    const { keyword } = req.body || {};

    let query = {
      isCompleted: false,
      isCancelled: false,
      "ticketSetting.isEnabled": true,
    };

    // Handle search with keyword
    if (keyword && typeof keyword === "string" && keyword.trim().length >= 2) {
      const searchKeyword = keyword.trim().replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
      console.log("Processed search keyword:", searchKeyword);
      query.$or = [
        { eventName: { $regex: searchKeyword, $options: "i" } },
        { venue: { $regex: searchKeyword, $options: "i" } },
        { genre: { $regex: searchKeyword, $options: "i" } },
        { about: { $regex: searchKeyword, $options: "i" } },
      ];
    } else if (keyword && (typeof keyword !== "string" || keyword.trim().length < 2)) {
      console.log("Invalid keyword:", keyword);
      return res.status(400).json({
        success: false,
        message: "Invalid keyword. It must be a string with at least 2 characters.",
      });
    }
    // If no keyword is provided, query will fetch all active events without $or

    console.log("Search query:", query);

    const events = await Event.find(query)
      .select("eventName venue eventDateTime genre posterUrl ticketSetting location")
      .populate("hostId", "name")
      .lean();
    console.log(`Search query returned ${events.length} events`);

    const processedEvents = events.map((event) => {
      if (!event.eventDateTime || !event.eventDateTime.length) {
        console.log(`Event ${event._id} has no valid eventDateTime, setting showStatus to 'unknown'`);
        event.showStatus = "unknown";
        return event;
      }
      const latestDate = event.eventDateTime.reduce((latest, curr) =>
        new Date(curr) > new Date(latest) ? curr : latest
      );
      const showStatus = new Date(latestDate) < new Date() ? "recent" : "upcoming";
      console.log(`Event ${event._id} showStatus: ${showStatus}, latestDate: ${latestDate}`);
      event.showStatus = showStatus;
      return event;
    });

    console.log("Returning response with processed events:", processedEvents.length);
    res.status(200).json({
      success: true,
      count: processedEvents.length,
      data: processedEvents,
    });
  } catch (error) {
    console.error("Error in searchEvents:", error.message, error.stack);
    res.status(500).json({
      success: false,
      message: "Server error while searching events",
      error: error.message,
    });
  }
};

// Update the route to use POST instead of GET
 
// Get latest events controller
const getLatestEvents = async (req, res) => {
  console.log("getLatestEvents controller called with request body:", req.body);
  try {
    const { limit = 1000 } = req.body || {};

    if (isNaN(limit) || limit <= 0) {
      console.log("Invalid limit:", limit);
      return res.status(400).json({
        success: false,
        message: "Invalid limit. It must be a positive number.",
      });
    }

    const query = {
      isCompleted: false,
      isCancelled: false,
      "ticketSetting.isEnabled": true,
    };
    console.log("Latest events query:", query);

    const events = await Event.find(query)
      .select("eventName venue eventDateTime genre posterUrl ticketSetting location")
      .populate("hostId", "name")
      .sort({ eventDateTime: 1 }) // Changed to ascending order for closest first
      .limit(Number(limit))
      .lean();
    console.log(`Latest events query returned ${events.length} events`);

    const processedEvents = events.map((event) => {
      if (!event.eventDateTime || !event.eventDateTime.length) {
        console.log(`Event ${event._id} has no valid eventDateTime, setting showStatus to 'unknown'`);
        event.showStatus = "unknown";
        return event;
      }
      // Use the earliest date in the eventDateTime array for showStatus
      const earliestDate = event.eventDateTime.reduce((earliest, curr) =>
        new Date(curr) < new Date(earliest) ? curr : earliest
      );
      const showStatus = new Date(earliestDate) < new Date() ? "recent" : "upcoming";
      console.log(`Event ${event._id} showStatus: ${showStatus}, earliestDate: ${earliestDate}`);
      event.showStatus = showStatus;
      return event;
    });

    console.log("Returning response with processed events:", processedEvents.length);
    res.status(200).json({
      success: true,
      count: processedEvents.length,
      data: processedEvents,
    });
  } catch (error) {
    console.error("Error in getLatestEvents:", error.message, error.stack);
    res.status(500).json({
      success: false,
      message: "Server error while fetching latest events",
      error: error.message,
    });
  }
};

module.exports = { filterEvents, searchEvents, getLatestEvents };