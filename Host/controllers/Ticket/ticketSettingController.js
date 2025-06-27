const Event = require('../../models/Events/event');
const { apiResponse } = require('../../../utils/apiResponse');

// @desc    Get ticket settings for an event
// @route   GET /api/events/:eventId/ticket-settings
// @access  Private
const getTicketSettings = async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId).select('ticketSetting');
    
    if (!event) {
      return apiResponse(res, {
        success: false,
        message: 'Event not found',
        statusCode: 404,
      });
    }
    
    return apiResponse(res, {
      success: true,
      message: 'Ticket settings retrieved successfully',
      data: event.ticketSetting,
      statusCode: 200,
    });
  } catch (error) {
    return apiResponse(res, {
      success: false,
      message: error.message || 'Server error',
      statusCode: 500,
    });
  }
};

// @desc    Update ticket settings for an event
// @route   PUT /api/events/:eventId/ticket-settings
// @access  Private
const updateTicketSettings = async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);
    
    if (!event) {
      return apiResponse(res, {
        success: false,
        message: 'Event not found',
        statusCode: 404,
      });
    }

    // Validate ticket settings
    const { ticketType, salesStart, salesEnd, gstType, price, totalQuantity, ticketStatus, isEnabled } = req.body;

    // Update only provided fields
    const ticketSetting = {
      ticketType: ticketType || event.ticketSetting.ticketType,
      salesStart: salesStart || event.ticketSetting.salesStart,
      salesEnd: salesEnd || event.ticketSetting.salesEnd,
      gstType: gstType || event.ticketSetting.gstType,
      price: price !== undefined ? price : event.ticketSetting.price,
      totalQuantity: totalQuantity || event.ticketSetting.totalQuantity,
      ticketStatus: ticketStatus || event.ticketSetting.ticketStatus,
      isEnabled: isEnabled !== undefined ? isEnabled : event.ticketSetting.isEnabled,
    };

    // Additional validation for paid tickets
    if (ticketSetting.ticketType === 'paid') {
      if (!ticketSetting.price || ticketSetting.price < 0) {
        return apiResponse(res, {
          success: false,
          message: 'Price is required and cannot be negative for paid tickets',
          statusCode: 400,
        });
      }
      if (!ticketSetting.gstType) {
        return apiResponse(res, {
          success: false,
          message: 'GST type is required for paid tickets',
          statusCode: 400,
        });
      }
    }

    // Validate dates
    if (ticketSetting.salesStart && ticketSetting.salesEnd) {
      if (new Date(ticketSetting.salesStart) >= new Date(ticketSetting.salesEnd)) {
        return apiResponse(res, {
          success: false,
          message: 'Sales start date must be before sales end date',
          statusCode: 400,
        });
      }
    }

    event.ticketSetting = ticketSetting;
    const updatedEvent = await event.save();

    return apiResponse(res, {
      success: true,
      message: 'Ticket settings updated successfully',
      data: updatedEvent.ticketSetting,
      statusCode: 200,
    });
  } catch (error) {
    return apiResponse(res, {
      success: false,
      message: error.message || 'Server error',
      statusCode: 500,
    });
  }
};

// @desc    Delete ticket settings (reset to default)
// @route   DELETE /api/events/:eventId/ticket-settings
// @access  Private
const deleteTicketSettings = async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);
    
    if (!event) {
      return apiResponse(res, {
        success: false,
        message: 'Event not found',
        statusCode: 404,
      });
    }

    // Reset to default ticket settings
    event.ticketSetting = {
      ticketType: 'free',
      salesStart: undefined,
      salesEnd: undefined,
      gstType: 'none',
      price: undefined,
      totalQuantity: undefined,
      ticketStatus: 'comingsoon',
      isEnabled: true,
    };

    const updatedEvent = await event.save();

    return apiResponse(res, {
      success: true,
      message: 'Ticket settings reset to default',
      data: updatedEvent.ticketSetting,
      statusCode: 200,
    });
  } catch (error) {
    return apiResponse(res, {
      success: false,
      message: error.message || 'Server error',
      statusCode: 500,
    });
  }
};

module.exports = {
  getTicketSettings,
  updateTicketSettings,
  deleteTicketSettings,
};