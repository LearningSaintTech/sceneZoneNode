const TicketSetting = require("../../../Host/models/Ticket/TicketSetting");
const { apiResponse } = require("../../../utils/apiResponse");

// Host creates/updates ticket settings for an event
exports.setTicketSetting = async (req, res) => {
  console.log("Setting ticket settings for event");
  console.log(req.body);
  try {
    const { eventId, ticketTypes } = req.body;
    if (!eventId || !Array.isArray(ticketTypes) || ticketTypes.length === 0) {
      return apiResponse(res, {
        success: false,
        message: "eventId and ticketTypes are required",
        statusCode: 400
      });
    }

    const setting = await TicketSetting.findOneAndUpdate(
      { eventId },
      { ticketTypes },
      { upsert: true, new: true }
    );

    return apiResponse(res, {
      success: true,
      message: "Ticket setting saved",
      data: setting
    });
  } catch (error) {
    return apiResponse(res, {
      success: false,
      message: error.message,
      statusCode: 500
    });
  }
};

// User fetches ticket settings for an event
exports.getTicketSetting = async (req, res) => {
  try {
    const { eventId } = req.params;
    const setting = await TicketSetting.findOne({ eventId });
    if (!setting) {
      return apiResponse(res, {
        success: false,
        message: "No ticket setting found for this event",
        statusCode: 404
      });
    }
    return apiResponse(res, {
      success: true,
      data: setting
    });
  } catch (error) {
    return apiResponse(res, {
      success: false,
      message: error.message,
      statusCode: 500
    });
  }
};
// Host deletes ticket settings for an event
exports.deleteTicketSetting = async (req, res) => {
  try {
    const { eventId } = req.params;
    const setting = await TicketSetting.findOneAndDelete({ eventId });
    if (!setting) {
      return apiResponse(res, {
        success: false,
        message: "No ticket setting found for this event",
        statusCode: 404
      });
    }
    return apiResponse(res, {
      success: true,
      message: "Ticket setting deleted successfully"
    });
  } catch (error) {
    return apiResponse(res, {
      success: false,
      message: error.message,
      statusCode: 500
    });
  }
}