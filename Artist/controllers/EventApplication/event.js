const Event = require("../../../Host/models/Events/event");
const EventApplication = require("../../models/EventApplication/eventApplication");
const { apiResponse } = require("../../../utils/apiResponse");
const mongoose = require("mongoose");

exports.getAllEventsForArtist = async (req, res) => {
  try {
    const artistId = req.user.artistId;

    // Find all event applications for the artist where status is "rejected"
    const rejectedApplications = await EventApplication.find({
      artistId,
      status: "rejected",
    }).select("eventId");

    // Extract rejected event IDs
    const rejectedEventIds = rejectedApplications.map((app) =>
      app.eventId.toString()
    );

    // Fetch all events, excluding those where the artist's application was rejected
    const events = await Event.find({
      _id: { $nin: rejectedEventIds }, // Exclude rejected event IDs
    })
      .populate("assignedArtists")
      .sort({ eventDateTime: 1 }); // Sort by event date for better UX

    // Update showStatus for each event
    const today = new Date();
    for (const event of events) {
      if (Array.isArray(event.eventDateTime)) {
        const showStatusArray = event.eventDateTime
          .map((dt) => {
            const parsedDate = new Date(dt);
            if (!isNaN(parsedDate)) {
              const status = parsedDate < today ? "recent" : "upcoming";
              return { date: parsedDate.toISOString().split("T")[0], status };
            }
            return null;
          })
          .filter(Boolean);

        if (JSON.stringify(event.showStatus) !== JSON.stringify(showStatusArray)) {
          event.showStatus = showStatusArray;
          await event.save();
        }
      }
    }

    return apiResponse(res, {
      success: true,
      message: "Events fetched successfully for artist (excluding rejected applications)",
      data: events,
      statusCode: 200,
    });
  } catch (error) {
    console.error("Get all events for artist error:", error);
    return apiResponse(res, {
      success: false,
      message: "Failed to fetch events",
      data: { error: error.message },
      statusCode: 500,
    });
  }
};

// Get all events where the artist is booked (assigned)
exports.getBookedEventsForArtist = async (req, res) => {
  try {
    const artistId = req.user.artistId;
    // Find all events where artistId is in assignedArtists
    const events = await Event.find({
      assignedArtists: artistId
    }).sort({ eventDateTime: 1 });
    return apiResponse(res, {
      success: true,
      message: "Booked events fetched successfully for artist",
      data: events,
      statusCode: 200,
    });
  } catch (error) {
    console.error("Get booked events for artist error:", error);
    return apiResponse(res, {
      success: false,
      message: "Failed to fetch booked events",
      data: { error: error.message },
      statusCode: 500,
    });
  }
};