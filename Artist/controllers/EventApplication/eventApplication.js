const mongoose = require("mongoose");
const EventApplication = require("../../../Artist/models/EventApplication/eventApplication");
const Event = require("../../../Host/models/Events/event"); // Import the Event model
const { apiResponse } = require("../../../utils/apiResponse");
exports.applyForEvent = async (req, res) => {
  try {
    const { eventId } = req.body;
    const artistId = req.user.artistId;

    // Validate eventId
    if (!eventId || !mongoose.Types.ObjectId.isValid(eventId)) {
      return apiResponse(res, {
        success: false,
        message: "Invalid eventId.",
        statusCode: 400,
      });
    }

    const eventObjectId = new mongoose.Types.ObjectId(eventId);

    // Check if the event exists
    const event = await Event.findById(eventObjectId);
    if (!event) {
      return apiResponse(res, {
        success: false,
        message: "Event not found.",
        statusCode: 404,
      });
    }

    // Check for existing application
    const existing = await EventApplication.findOne({ eventId: eventId, artistId });
    if (existing) {
      return apiResponse(res, {
        success: false,
        message: "Application exists",
        statusCode: 400,
      });
    }

    // Create new application
    const application = new EventApplication({ artistId, eventId });
    await application.save();

    // Add artistId to the event's assignedArtists array
    await Event.findByIdAndUpdate(
      eventObjectId,
      { $addToSet: { assignedArtists: artistId } }, // $addToSet prevents duplicates
      { new: true }
    );

    // Populate eventId in the application
    const populatedApplication = await EventApplication.findById(application._id).populate("eventId");

    return apiResponse(res, {
      message: "Application submitted and artist assigned.",
      statusCode: 201,
      data: populatedApplication,
    });
  } catch (err) {
    console.error("Apply error:", err);
    return apiResponse(res, {
      success: false,
      message: "Server error.",
      data: { error: err.message },
      statusCode: 500,
    });
  }
};