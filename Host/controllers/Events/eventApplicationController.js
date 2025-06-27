const mongoose = require("mongoose");
const EventApplication = require("../../../Artist/models/EventApplication/eventApplication");
const Event = require("../../../Host/models/Events/event");
const { apiResponse } = require("../../../utils/apiResponse");

exports.updateEventApplicationStatus = async (req, res) => {
  try {
    console.log("Starting updateEventApplicationStatus: Received request", {
      params: req.params,
      body: req.body,
      user: req.user,
    });

    const hostId = req.user.hostId;
    const { applicationId } = req.params;
    const { status } = req.body;

    // Validate applicationId
    console.log("Validating applicationId:", { applicationId });
    if (!mongoose.isValidObjectId(applicationId)) {
      console.warn("Invalid applicationId provided:", { applicationId });
      return apiResponse(res, {
        success: false,
        message: "Invalid application ID.",
        statusCode: 400,
      });
    }

    // Validate status
    console.log("Validating status:", { status });
    if (!["pending", "accepted", "rejected"].includes(status)) {
      console.warn("Invalid status provided:", { status });
      return apiResponse(res, {
        success: false,
        message: "Status must be one of: pending, accepted, rejected.",
        statusCode: 400,
      });
    }

    // Find the application
    console.log("Fetching EventApplication:", { applicationId });
    const application = await EventApplication.findById(applicationId);
    if (!application) {
      console.warn("Application not found:", { applicationId });
      return apiResponse(res, {
        success: false,
        message: "Application not found.",
        statusCode: 404,
      });
    }
    console.log("Application found:", {
      applicationId,
      eventId: application.eventId,
      artistId: application.artistId,
      currentStatus: application.status,
    });

    // Find the event to check if the host owns it
    console.log("Fetching Event:", { eventId: application.eventId });
    const event = await Event.findById(application.eventId);
    if (!event || event.hostId.toString() !== hostId.toString()) {
      console.warn("Event not found or unauthorized:", {
        eventId: application.eventId,
        hostId,
        eventHostId: event?.hostId,
      });
      return apiResponse(res, {
        success: false,
        message: "Event not found or you don't have permission to update this application.",
        statusCode: 403,
      });
    }
    console.log("Event ownership verified:", { eventId: event._id, eventName: event.eventName });

    // Update application status
    console.log("Updating application status:", { applicationId, newStatus: status });
    application.status = status;
    await application.save();
    console.log("Application status updated:", {
      applicationId,
      newStatus: application.status,
    });

    // Update Event's assignedArtists based on status
    if (status === "rejected") {
      console.log("Removing artist from assignedArtists:", {
        eventId: application.eventId,
        artistId: application.artistId,
      });
      await Event.findByIdAndUpdate(
        application.eventId,
        { $pull: { assignedArtists: application.artistId } },
        { new: true }
      );
      console.log("Artist removed from assignedArtists");
    } else if (status === "accepted") {
      console.log("Adding artist to assignedArtists:", {
        eventId: application.eventId,
        artistId: application.artistId,
      });
      await Event.findByIdAndUpdate(
        application.eventId,
        { $addToSet: { assignedArtists: application.artistId } },
        { new: true }
      );
      console.log("Artist added to assignedArtists");
    }

    // Populate eventId and artistId for response
    console.log("Populating application details:", { applicationId });
    const populatedApplication = await EventApplication.findById(applicationId)
      .populate("eventId")
    console.log("Populated application:", {
      applicationId,
      eventId: populatedApplication.eventId?._id,
      artistId: populatedApplication.artistId?._id,
      status: populatedApplication.status,
    });

    return apiResponse(res, {
      success: true,
      message: `Application status updated to ${status}.`,
      data: populatedApplication,
      statusCode: 200,
    });
  } catch (error) {
    console.error("UpdateEventApplicationStatus error:", {
      error: error.message,
      stack: error.stack,
      applicationId: req.params.applicationId,
      hostId: req.user.hostId,
      status: req.body.status,
    });
    return apiResponse(res, {
      success: false,
      message: "Failed to update application status",
      data: { error: error.message },
      statusCode: 500,
    });
  }
};