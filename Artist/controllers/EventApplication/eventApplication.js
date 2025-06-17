const EventApplication = require("../../models/EventApplication/eventApplication");
const { apiResponse } = require("../../../utils/apiResponse");

exports.applyForEvent = async (req, res) => {
  try {
    const { eventId } = req.body;
    const artistId = req.user.artistId;

    const existing = await EventApplication.findOne({ eventId, artistId });
    if (existing) {
      return apiResponse(res, {
        success: false,
        message: "Already applied for this event.",
        statusCode: 400,
      });
    }

    const application = new EventApplication({ artistId, eventId });
    await application.save();

    return apiResponse(res, {
      message: "Application submitted.",
      statusCode: 201,
      data: application,
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
