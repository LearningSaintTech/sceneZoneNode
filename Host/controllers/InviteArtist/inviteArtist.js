const EventInvitation = require("../../models/InviteArtist/inviteArtist");
const Shortlist = require("../../models/ShortlistArtist/shortlistArtist");
const Event = require("../../models/Events/event");
const { apiResponse } = require("../../../utils/apiResponse");
const NotificationService = require("../../../Notification/controller/notificationService");

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

    // Create notification for the artist
    try {
      const event = await Event.findById(eventId).select('eventName');
      const host = await require("../../models/Auth/Auth").findById(hostId).select('fullName');
      
      const notificationData = {
        recipientId: artistId,
        recipientType: 'artist',
        senderId: hostId,
        senderType: 'host',
        title: `Event Invitation`,
        body: `${host.fullName} invited you to perform at "${event.eventName}"`,
        type: 'event_invitation',
        data: {
          eventId: eventId
        }
      };

      await NotificationService.createAndSendNotification(notificationData);
      console.log(`[${new Date().toISOString()}] Notification created for artist ${artistId} for event invitation`);
    } catch (notificationError) {
      console.error(`[${new Date().toISOString()}] Error creating notification:`, notificationError);
      // Don't fail the request if notification fails
    }

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
