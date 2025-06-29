const mongoose = require("mongoose");
const EventApplication = require("../../../Artist/models/EventApplication/eventApplication");
const Event = require("../../../Host/models/Events/event");
const { apiResponse } = require("../../../utils/apiResponse");

exports.applyForEvent = async (req, res) => {
  try {
    console.log("Starting applyForEvent: Received request", {
      body: req.body,
      user: req.user,
    });

    const { eventId } = req.body;
    const artistId = req.user.artistId;

    // Validate eventId
    console.log("Validating eventId:", { eventId });
    if (!eventId || !mongoose.Types.ObjectId.isValid(eventId)) {
      console.warn("Invalid eventId provided:", { eventId });
      return apiResponse(res, {
        success: false,
        message: "Invalid eventId.",
        statusCode: 400,
      });
    }

    const eventObjectId = new mongoose.Types.ObjectId(eventId);
    console.log("Converted eventId to ObjectId:", { eventObjectId });

    // Check if the event exists
    console.log("Checking if event exists:", { eventObjectId });
    const event = await Event.findById(eventObjectId);
    if (!event) {
      console.warn("Event not found:", { eventId });
      return apiResponse(res, {
        success: false,
        message: "Event not found.",
        statusCode: 404,
      });
    }
    console.log("Event found:", { eventId, eventName: event.eventName });

    // Check for existing application
    console.log("Checking for existing application:", { eventId, artistId });
    const existing = await EventApplication.findOne({ eventId, artistId });
    if (existing) {
      console.warn("Application already exists:", {
        eventId,
        artistId,
        existingApplication: existing,
      });
      return apiResponse(res, {
        success: false,
        message: "Application exists",
        statusCode: 400,
      });
    }
    console.log("No existing application found, proceeding to create new application");

    // Create new application
    console.log("Creating new EventApplication:", { artistId, eventId });
    const application = new EventApplication({ artistId, eventId });
    await application.save();
    console.log("EventApplication saved:", {
      applicationId: application._id,
      status: application.status,
      appliedAt: application.appliedAt,
    });

    // Note: The commented-out code for updating assignedArtists is left as-is
    // If you want to debug this part, uncomment and add logs like this:
    /*
    console.log("Updating event's assignedArtists:", { eventId, artistId });
    const updatedEvent = await Event.findByIdAndUpdate(
      eventObjectId,
      { $addToSet: { assignedArtists: artistId } },
      { new: true }
    );
    console.log("Event updated with assignedArtists:", {
      eventId,
      assignedArtists: updatedEvent.assignedArtists,
    });
    */

    // Populate eventId in the application
    console.log("Populating eventId for application:", { applicationId: application._id });
    const populatedApplication = await EventApplication.findById(application._id).populate("eventId");
    console.log("Populated application:", {
      applicationId: application._id,
      eventDetails: populatedApplication.eventId,
    });

    return apiResponse(res, {
      success: true,
      message: "Application submitted successfully.",
      statusCode: 201,
      data: populatedApplication,
    });
  } catch (err) {
    console.error("ApplyForEvent error:", {
      error: err.message,
      stack: err.stack,
      eventId: req.body.eventId,
      artistId: req.user.artistId,
    });
    return apiResponse(res, {
      success: false,
      message: "Server error.",
      data: { error: err.message },
      statusCode: 500,
    });
  }
};

exports.getAppliedEvents = async (req, res) => {
  const artistId = req.user.artistId;
  console.log("Starting getAppliedEvents: Fetching for artist:", { artistId });

  try { 
    console.log("Querying EventApplication for artist:", { artistId });
    const applications = await EventApplication.find({ artistId })
      .populate("eventId")
      .sort({ appliedAt: -1 });
    console.log("Fetched applications:", {
      count: applications.length,
      applications: applications.map((app) => ({
        id: app._id,
        eventId: app.eventId?._id,
        status: app.status,
        appliedAt: app.appliedAt,
      })),
    });

    return apiResponse(res, {
      success: true,
      message: "Applied events fetched successfully",
      data: applications,
      statusCode: 200,
    });
  } catch (error) {
    console.error("GetAppliedEvents error:", {
      error: error.message,
      stack: error.stack,
      artistId,
    });
    return apiResponse(res, {
      success: false,
      message: "Failed to fetch applied events",
      error: error.message,
      statusCode: 500,
    });
  }
};



exports.removeAppliedEvent = async (req, res) => {
  try {
    console.log("Starting removeAppliedEvent: Received request", {
      params: req.params,
      user: req.user,
    });

    const { eventId } = req.params;
    const artistId = req.user.artistId;

    // Validate eventId
    console.log("Validating eventId:", { eventId });
    if (!eventId || !mongoose.Types.ObjectId.isValid(eventId)) {
      console.warn("Invalid eventId provided:", { eventId });
      return apiResponse(res, {
        success: false,
        message: "Invalid eventId.",
        statusCode: 400,
      });
    }

    const eventObjectId = new mongoose.Types.ObjectId(eventId);
    console.log("Converted eventId to ObjectId:", { eventObjectId });

    // Check if the event exists
    console.log("Checking if event exists:", { eventObjectId });
    const event = await Event.findById(eventObjectId);
    if (!event) {
      console.warn("Event not found:", { eventId });
      return apiResponse(res, {
        success: false,
        message: "Event not found.",
        statusCode: 404,
      });
    }
    console.log("Event found:", { eventId, eventName: event.eventName });

    // Check if the application exists
    console.log("Checking for existing application:", { eventId, artistId });
    const application = await EventApplication.findOne({ eventId, artistId });
    if (!application) {
      console.warn("Application not found:", { eventId, artistId });
      return apiResponse(res, {
        success: false,
        message: "Application not found.",
        statusCode: 404,
      });
    }
    console.log("Application found:", {
      applicationId: application._id,
      status: application.status,
    });

    // Remove the application
    console.log("Removing application:", { applicationId: application._id });
    await EventApplication.deleteOne({ _id: application._id });
    console.log("Application removed:", { applicationId: application._id });

    // Remove artistId from assignedArtists array in Event model
    console.log("Updating event's assignedArtists:", { eventId, artistId });
    const updatedEvent = await Event.findByIdAndUpdate(
      eventObjectId,
      { $pull: { assignedArtists: artistId } },
      { new: true }
    );
    console.log("Event updated:", {
      eventId,
      assignedArtists: updatedEvent.assignedArtists,
    });

    return apiResponse(res, {
      success: true,
      message: "Application removed successfully.",
      statusCode: 200,
    });
  } catch (err) {
    console.error("RemoveAppliedEvent error:", {
      error: err.message,
      stack: err.stack,
      eventId: req.params.eventId,
      artistId: req.user.artistId,
    });
    return apiResponse(res, {
      success: false,
      message: "Server error.",
      data: { error: err.message },
      statusCode: 500,
    });
  }
};