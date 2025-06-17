const EventInvitation = require("../../../Host/models/InviteArtist/inviteArtist");
const ArtistProfile = require("../../models/Profile/profile");
const Event = require("../../../Host/models/Events/event");
const { apiResponse } = require("../../../utils/apiResponse");

exports.respondToInvitation = async (req, res) => {
  try {
    const artistId = req.user.artistId;
    const { eventId, response } = req.body;

    console.log("Artist ID:", artistId);
    console.log("Response body:", req.body);

    // Validate input
    if (!eventId || !response) {
      return apiResponse(res, {
        success: false,
        message: "eventId and response are required.",
        statusCode: 400,
      });
    }

    if (!["accepted", "rejected"].includes(response)) {
      return apiResponse(res, {
        success: false,
        message: "Response must be 'accepted' or 'rejected'.",
        statusCode: 400,
      });
    }

    // Find invitation
    const invite = await EventInvitation.findOne({ artistId, eventId });

    if (!invite) {
      return apiResponse(res, {
        success: false,
        message: "Invitation not found.",
        statusCode: 404,
      });
    }

    if (invite.status !== "pending") {
      return apiResponse(res, {
        success: false,
        message: "No pending invitation found.",
        statusCode: 400,
      });
    }

    // Update invitation status
    invite.status = response;
    await invite.save();

    // If accepted, update artist profile and event
    if (response === "accepted") {
      // 1. Add event to artist profile
      const artist = await ArtistProfile.findOne({ artistId });
      if (!artist) {
        return apiResponse(res, {
          success: false,
          message: "Artist not found.",
          statusCode: 404,
        });
      }

      // if (!artist.AssignedEvents.includes(eventId)) {
      //   artist.AssignedEvents.push(eventId);
      //   await artist.save();
      // }

      // Add artist to event's assignedArtists
      const event = await Event.findById(eventId);
      console.log("eventtt",event)
       if (response === "accepted") {
      await Event.findByIdAndUpdate(
        eventId, // _id is the event's _id
        { $addToSet: { assignedArtists: artistId } }, // Prevent duplicates
        { new: true }
      );
    }
      if (!event.assignedArtists.includes(artistId)) {
        event.assignedArtists.push(artistId);
        await event.save();
      }
    }

    return apiResponse(res, {
      message: `Invitation ${response} successfully.`,
      statusCode: 200,
    });
  } catch (err) {
    console.error("Error in respondToInvitation:", err);
    return apiResponse(res, {
      success: false,
      message: "Server error. Try again later.",
      statusCode: 500,
    });
  }
};

