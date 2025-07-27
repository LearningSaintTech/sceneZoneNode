const Event = require("../../../Host/models/Events/event");
const {apiResponse} = require("../../../utils/apiResponse");

exports.verifyEvent = async(req,res)=>{
    try {
      const { eventId } = req.params;
      const { status } = req.body; 

      if (!["approved", "rejected"].includes(status)) {
        return apiResponse(res, {
          success: false,
          message: "Invalid status. Must be 'approve' or 'reject",
          statusCode: 400,
        });
      }

      const event = await Event.findById(eventId);
      if (!event) {
        return apiResponse(res, {
          success: false,
          message: "Event not found",
          statusCode: 404,
        });
      }

      if (status === "approved" && event.status === "approved") {
        return apiResponse(res, {
          success: false,
          message: "Event is already approved",
          statusCode: 400,
        });
      }
  

      event.status = status;
      await event.save();

      return apiResponse(res, {
        success: true,
        message: `Event ${status} successfully`,
        data: event,
      });
    } catch (error) {
      return apiResponse(res, {
        success: false,
        message: "Error while updating event status",
        data: { error: error.message },
        statusCode: 500,
      });
    }
}