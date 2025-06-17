const GuestList = require("../../../User/models/GuestList/guestList");
const {apiResponse} = require("../../../utils/apiResponse");

exports.respondToGuestRequest = async (req, res) => {
  const artistId = req.user.artistId;
  const { guestRequestId, response, level } = req.body; 
  try {
    const guestRequest = await GuestList.findById(guestRequestId);
    if (!guestRequest) {
      return apiResponse(res, {
        success: false,
        message: "Guest request not found",
        statusCode: 404,
      });
    }

    
  if (!GuestList.artistId.equals(artistId)) {
    return apiResponse(res, {
      success: false,
      message: "You are not authorized to respond to this request",
      statusCode: 403,
    });
  }

    // Block further responses if already accepted
    if (guestRequest.status === "accepted") {
      return apiResponse(res, {
        success: false,
        message: "Request already accepted by another artist",
        statusCode: 403,
      });
    }

    if (response === "accepted") {
      guestRequest.status = "accepted";
      guestRequest.assignedLevel = level;
      await guestRequest.save();

      return apiResponse(res, {
        success: true,
        message: "You have accepted the guest request",
        data: guestRequest
      });

    } else if (response === "rejected") {
      return apiResponse(res, {
        success: true,
        message: "You have rejected the guest request",
      });
    } else {
      return apiResponse(res, {
        success: false,
        message: "Invalid response",
        statusCode: 400,
      });
    }

  } catch (err) {
    console.error("Error responding to guest request:", err);
    return apiResponse(res, {
      success: false,
      message: "Internal Server Error",
      statusCode: 500,
    });
  }
};
