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
