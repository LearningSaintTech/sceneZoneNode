const GuestList = require("../../models/GuestList/guestList");
const Event = require("../../../Host/models/Events/event");
const { apiResponse } = require("../../../utils/apiResponse");

exports.guestlistRequest = async (req, res) => {
  const userId = req.user.userId;
  const { eventId } = req.body;
  console.log("eventID",eventId)

  try {
    // 1. Check if the event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return apiResponse(res, {
        success: false,
        message: "Event not found",
        statusCode: 404,
      });
    }

    // 2. Check if user already requested
    const existingRequest = await GuestList.findOne({ userId, eventId });
    if (existingRequest) {
      return apiResponse(res, {
        success: false,
        message: "Request already sent",
        statusCode: 400,
      });
    }

    // 4. Create guest request
    const guestRequest = new GuestList({
      userId,
      eventId,
      assignedLevel:null,
      artistId:event.assignedArtists,
      status: 'pending'
    });
    console.log("guestreq",guestRequest);

    await guestRequest.save();

    return apiResponse(res, {
      success: true,
      message: "Guest request sent successfully",
      data: guestRequest,
      statusCode: 201,
    });

  } catch (err) {
    console.error("Guestlist request error:", err);
    return apiResponse(res, {
      success: false,
      message: "Internal Server Error",
      statusCode: 500,
    });
  }
};

// Get all guest list requests for the logged-in artist
exports.getGuestListForArtist = async (req, res) => {
  try {
    const artistId = req.user.artistId; 

    const guestLists = await GuestList.find({ artistId })
       .select("status assignedLevel userId") // Only select these fields
      .populate("userId");;

    if (!guestLists || guestLists.length === 0) {
      return apiResponse(res, {
        success: false,
        message: "No guest list requests found for this artist",
        statusCode: 404,
      });
    }

    return apiResponse(res, {
      success: true,
      message: "Guest list requests fetched successfully",
      data: guestLists,
      statusCode: 200,
    });
  } catch (error) {
    return apiResponse(res, {
      success: false,
      message: error.message,
      statusCode: 500,
    });
  }
}
