const EventApplication = require("../../../Artist/models/EventApplication/eventApplication");
const ArtistProfile = require("../../../Artist/models/Profile/profile");
const { apiResponse } = require("../../../utils/apiResponse");
const Event = require("../../models/Events/event");

exports.respondToApplication = async (req, res) => {
  try {
    const { eventId, status } = req.body;

    const updatedApplication = await EventApplication.findOneAndUpdate(
      { eventId },
      { status },
      { new: true, runValidators: true }
    );

    if (!updatedApplication) {
      return apiResponse(res, {
        success: false,
        message: "No application found for this event",
        statusCode: 404,
      });
    }

    // If status is accepted, add artistId to assignedArtists array in Event model
    if (status === "accepted") {
      await Event.findByIdAndUpdate(
        updatedApplication.eventId,
        { $addToSet: { assignedArtists: updatedApplication.artistId } }, // Prevent duplicates
        { new: true }
      );
    }

    return apiResponse(res, {
      message: "Application status updated successfully",
      data: updatedApplication,
    });
  } catch (error) {
    return apiResponse(res, {
      success: false,
      message: error.message,
      statusCode: 400,
    });
  }
};
 
exports.updateEventApplicationStatus = async (req, res) => {
  try {
    const hostId = req.user.hostId;
    const { applicationId, status } = req.body;

    // Validate applicationId
    if (!mongoose.isValidObjectId(applicationId)) {
      return apiResponse(res, {
        success: false,
        message: "Invalid application ID.",
        statusCode: 400,
      });
    }

    // Validate status
    if (!["pending", "accepted", "rejected"].includes(status)) {
      return apiResponse(res, {
        success: false,
        message: "Status must be one of: pending, accepted, rejected.",
        statusCode: 400,
      });
    }

    // Find the application
    const application = await EventApplication.findById(applicationId);
    if (!application) {
      return apiResponse(res, {
        success: false,
        message: "Application not found.",
        statusCode: 404,
      });
    }

    // Find the event to check if the host owns it
    const event = await Event.findById(application.eventId);
    if (!event || event.hostId.toString() !== hostId.toString()) {
      return apiResponse(res, {
        success: false,
        message: "Event not found or you don't have permission to update this application.",
        statusCode: 403,
      });
    }

    // Update application status
    application.status = status;
    await application.save();

    // If status is "rejected," remove the artist from the event's assignedArtists
    if (status === "rejected") {
      await Event.findByIdAndUpdate(
        application.eventId,
        { $pull: { assignedArtists: application.artistId } },
        { new: true }
      );
    } else if (status === "accepted") {
      // Ensure the artist is in assignedArtists (in case they were previously removed)
      await Event.findByIdAndUpdate(
        application.eventId,
        { $addToSet: { assignedArtists: application.artistId } },
        { new: true }
      );
    }

    // Populate eventId for response
    const populatedApplication = await EventApplication.findById(applicationId)
      .populate("eventId")
      .populate("artistId");

    return apiResponse(res, {
      success: true,
      message: `Application status updated to ${status}.`,
      data: populatedApplication,
      statusCode: 200,
    });
  } catch (error) {
    console.error("Update application status error:", error);
    return apiResponse(res, {
      success: false,
      message: "Failed to update application status",
      data: { error: error.message },
      statusCode: 500,
    });
  }
};