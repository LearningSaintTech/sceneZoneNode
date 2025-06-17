const EventInvitation = require("../../models/InviteArtist/inviteArtist");
const Shortlist = require("../../models/ShortlistArtist/shortlistArtist");
const Event = require("../../models/Events/event");
const { apiResponse } = require("../../../utils/apiResponse");

exports.sendEventInvitation = async (req, res) => {
  try {
    const { artistId, eventId } = req.body;
    const hostId = req.user.hostId;

    if (!artistId || !eventId) {
      return apiResponse(res, {
        success: false,
        statusCode: 400,
        message: "artistId or eventId is missing.",
      });
    }

    // Check if the artist is shortlisted by the host
    const isShortlisted = await Shortlist.findOne({ hostId, artistId });
    if (!isShortlisted) {
      return apiResponse(res, {
        success: false,
        statusCode: 400,
        message: "Invitation can only be sent to shortlisted artists.",
      });
    }

    // Check if an invitation already exists
    const existing = await EventInvitation.findOne({ artistId, eventId });
    if (existing) {
      return apiResponse(res, {
        success: false,
        statusCode: 400,
        message: "Invitation already sent.",
      });
    }

    // Create a new invitation
    await EventInvitation.create({ artistId, eventId, hostId });
    return apiResponse(res, {
      statusCode: 201,
      message: "Invitation sent to artist.",
    });
  } catch (error) {
    console.error("Error in sendEventInvitation:", error.message);
    return apiResponse(res, {
      success: false,
      statusCode: 500,
      message: "Server error",
      data: { error: error.message },
    });
  }
};
