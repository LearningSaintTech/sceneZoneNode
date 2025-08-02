const mongoose = require("mongoose");
const Event = require("../../../Host/models/Events/event");
const { apiResponse } = require("../../../utils/apiResponse");
const { exportToCsv } = require("../../../utils/exportToCsv");
const TicketBooking = require("../../../eventHostBooking/model/ticketBooking");

exports.getEvents = async (req, res) => {
  try {
    // Fetch all events and lookup ticket bookings
    const events = await Event.aggregate([
      {
        $lookup: {
          from: "ticketbookings",
          localField: "_id",
          foreignField: "eventId",
          as: "tickets",
        },
      },
      {
        $project: {
          eventName: 1,
          venue: 1,
          eventDateTime: 1,
          soldTickets: {
            $sum: {
              $map: {
                input: {
                  $filter: {
                    input: "$tickets",
                    as: "ticket",
                    cond: { $in: ["$$ticket.status", ["pending", "paid"]] },
                  },
                },
                as: "ticket",
                in: "$$ticket.numberOfTickets",
              },
            },
          },
        },
      },
    ]);

    // Format the data
    const formattedEvents = events.map((event, index) => ({
      sNo: index + 1,
      dateTime: event.eventDateTime[0]
        ? new Date(event.eventDateTime[0]).toLocaleString("en-US", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })
        : "N/A",
      eventName: event.eventName || "Unknown",
      location: event.venue || "N/A",
      soldTickets: event.soldTickets || 0,
    }));

    // Send response
    apiResponse(res, {
      success: true,
      message: "All events retrieved successfully",
      data: formattedEvents,
      statusCode: 200,
    });
  } catch (error) {
    apiResponse(res, {
      success: false,
      message: "Error retrieving events",
      data: null,
      statusCode: 500,
    });
  }
};

exports.getEventCount = async (req, res) => {
  try {
    // Count all events
    const totalEvents = await Event.countDocuments();

    // Send response
    apiResponse(res, {
      success: true,
      message: "Event count retrieved successfully",
      data: { totalEvents },
      statusCode: 200,
    });
  } catch (error) {
    apiResponse(res, {
      success: false,
      message: "Error retrieving event count",
      data: null,
      statusCode: 500,
    });
  }
};

exports.getEventStatusCount = async (req, res) => {
  try {
    // Count events by status
    const totalEvents = await Event.countDocuments();
    const completedEvents = await Event.countDocuments({ isCompleted: true });
    const cancelledEvents = await Event.countDocuments({ isCancelled: true });

    // Send response
    apiResponse(res, {
      success: true,
      message: "Event status counts retrieved successfully",
      data: {
        totalEvents,
        completedEvents,
        cancelledEvents,
      },
      statusCode: 200,
    });
  } catch (error) {
    apiResponse(res, {
      success: false,
      message: "Error retrieving event status counts",
      data: null,
      statusCode: 500,
    });
  }
};

exports.exportEventsToCsv = async (req, res) => {
  try {
    // Fetch all events and lookup ticket bookings
    const events = await Event.aggregate([
      {
        $lookup: {
          from: "ticketbookings",
          localField: "_id",
          foreignField: "eventId",
          as: "tickets",
        },
      },
      {
        $project: {
          eventName: 1,
          venue: 1,
          eventDateTime: 1,
          soldTickets: {
            $sum: {
              $map: {
                input: {
                  $filter: {
                    input: "$tickets",
                    as: "ticket",
                    cond: { $in: ["$$ticket.status", ["pending", "paid"]] },
                  },
                },
                as: "ticket",
                in: "$$ticket.numberOfTickets",
              },
            },
          },
        },
      },
    ]);

    // Format the data for CSV
    const formattedEvents = events.map((event, index) => ({
      sNo: index + 1,
      dateTime: event.eventDateTime[0]
        ? new Date(event.eventDateTime[0]).toLocaleString("en-US", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })
        : "N/A",
      eventName: event.eventName || "Unknown",
      location: event.venue || "N/A",
      soldTickets: event.soldTickets || 0,
    }));

    // Define CSV columns
    const columns = [
      { key: "sNo", header: "S No." },
      { key: "dateTime", header: "Date Time" },
      { key: "eventName", header: "Event Name" },
      { key: "location", header: "Location" },
      { key: "soldTickets", header: "Sold Tickets" },
    ];

    // Export to CSV
    exportToCsv(res, formattedEvents, columns, "events.csv");
  } catch (error) {
    apiResponse(res, {
      success: false,
      message: "Error exporting events to CSV",
      data: null,
      statusCode: 500,
    });
  }
};


exports.getEventTicketBuyers = async (req, res) => {
  try {
    const { eventId } = req.params;

    // Validate eventId
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return apiResponse(res, {
        success: false,
        message: "Invalid event ID",
        data: null,
        statusCode: 400,
      });
    }

    // Verify event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return apiResponse(res, {
        success: false,
        message: "Event not found",
        data: null,
        statusCode: 404,
      });
    }

    // Fetch ticket bookings for the event with user and profile details
    const bookings = await TicketBooking.aggregate([
      {
        $match: {
          eventId: new mongoose.Types.ObjectId(eventId),
          status: { $in: ["pending", "paid"] },
        },
      },
      {
        $lookup: {
          from: "userauthentications",
          localField: "userId",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      {
        $unwind: "$userDetails",
      },
      {
        $lookup: {
          from: "userprofiles", // Assuming the collection name for Profile model is "profiles"
          localField: "userId",
          foreignField: "userId",
          as: "profileDetails",
        },
      },
      {
        $unwind: {
          path: "$profileDetails",
          preserveNullAndEmptyArrays: true, // Allow for users without profiles
        },
      },
      {
        $project: {
          userName: "$userDetails.fullName",
          address: "$profileDetails.address",
          numberOfTickets: 1,
          status: 1,
          purchaseDateTime: {
            $dateToString: {
              format: "%Y-%m-%d %H:%M:%S",
              date: "$createdAt",
            },
          },
        },
      },
      {
        $sort: { createdAt: -1 },
      },
    ]);

    // Format response with serial number and status interpretation
    const formattedBookings = bookings.map((booking, index) => ({
      sNo: index + 1,
      userName: booking.userName || "Unknown",
      address: booking.address || "N/A",
      numberOfTickets: booking.numberOfTickets,
      isRefunded: booking.isRefunded || false, 
      purchaseDateTime: booking.purchaseDateTime,
    }));

    // Send response
    apiResponse(res, {
      success: true,
      message: `Ticket buyers for event retrieved successfully`,
      data: {
        eventName: event.eventName,
        buyers: formattedBookings,
      },
      statusCode: 200,
    });
  } catch (error) {
    console.error("Error fetching event ticket buyers:", error);
    apiResponse(res, {
      success: false,
      message: "Error retrieving event ticket buyers",
      data: null,
      statusCode: 500,
    });
  }
};



exports.searchEvents = async (req, res) => {
  try {
    const adminId = req.user?.userId; // Using req.user?.userId for authentication
    console.log('Admin ID:', adminId); // Debug log

    // Validate adminId
    if (!adminId || !mongoose.Types.ObjectId.isValid(adminId)) {
      return apiResponse(res, {
        success: false,
        message: 'Invalid or missing admin ID from authentication',
        data: null,
        statusCode: 401,
      });
    }

    // Get keyword from query parameter
    const { keyword } = req.query;
    if (!keyword || !keyword.trim()) {
      return apiResponse(res, {
        success: false,
        message: 'Keyword is required for search',
        data: null,
        statusCode: 400,
      });
    }

    const searchKeyword = keyword.trim();

    // Search events with keyword matching eventName or venue
    const events = await Event.aggregate([
      {
        $match: {
          $or: [
            { eventName: { $regex: searchKeyword, $options: 'i' } },
            { venue: { $regex: searchKeyword, $options: 'i' } },
          ],
        },
      },
      {
        $lookup: {
          from: 'ticketbookings',
          localField: '_id',
          foreignField: 'eventId',
          as: 'tickets',
        },
      },
      {
        $project: {
          eventName: 1,
          venue: 1,
          eventDateTime: 1,
          soldTickets: {
            $sum: {
              $map: {
                input: {
                  $filter: {
                    input: '$tickets',
                    as: 'ticket',
                    cond: { $in: ['$$ticket.status', ['pending', 'paid']] },
                  },
                },
                as: 'ticket',
                in: '$$ticket.numberOfTickets',
              },
            },
          },
        },
      },
    ]);

    // Format the data
    const formattedEvents = events.map((event, index) => ({
      sNo: index + 1,
      dateTime: event.eventDateTime[0]
        ? new Date(event.eventDateTime[0]).toLocaleString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
        : 'N/A',
      eventName: event.eventName || 'Unknown',
      location: event.venue || 'N/A',
      soldTickets: event.soldTickets || 0,
    }));

    return apiResponse(res, {
      success: true,
      message: formattedEvents.length > 0 ? 'Events found' : 'No events found for the given keyword',
      data: { events: formattedEvents },
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error searching events:', error);
    return apiResponse(res, {
      success: false,
      message: 'Failed to search events',
      error: error.message,
      statusCode: 500,
    });
  }
};



exports.searchEventTicketBuyers = async (req, res) => {
  try {
    const adminId = req.user?.userId;
    console.log('Admin ID:', adminId);

    // Validate adminId
    if (!adminId || !mongoose.Types.ObjectId.isValid(adminId)) {
      return apiResponse(res, {
        success: false,
        message: 'Invalid or missing admin ID from authentication',
        data: null,
        statusCode: 401,
      });
    }

    // Get keyword from query parameter
    const { keyword } = req.query;
    if (!keyword || !keyword.trim()) {
      return apiResponse(res, {
        success: false,
        message: 'Keyword is required for search',
        data: null,
        statusCode: 400,
      });
    }

    const searchKeyword = keyword.trim();

    // Search ticket bookings across all events
    const bookings = await TicketBooking.aggregate([
      {
        $match: {
          status: { $in: ['pending', 'paid'] },
        },
      },
      {
        $lookup: {
          from: 'userauthentications',
          localField: 'userId',
          foreignField: '_id',
          as: 'userDetails',
        },
      },
      {
        $unwind: '$userDetails',
      },
      {
        $lookup: {
          from: 'userprofiles',
          localField: 'userId',
          foreignField: 'userId',
          as: 'profileDetails',
        },
      },
      {
        $unwind: {
          path: '$profileDetails',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'events',
          localField: 'eventId',
          foreignField: '_id',
          as: 'eventDetails',
        },
      },
      {
        $unwind: '$eventDetails',
      },
      {
        $match: {
          $or: [
            { 'userDetails.fullName': { $regex: searchKeyword, $options: 'i' } },
            { 'profileDetails.address': { $regex: searchKeyword, $options: 'i' } },
            { 'profileDetails.email': { $regex: searchKeyword, $options: 'i' } },
            { 'userDetails.email': { $regex: searchKeyword, $options: 'i' } },
          ],
        },
      },
      {
        $project: {
          userName: '$userDetails.fullName',
          address: '$profileDetails.address',
          email: { $ifNull: ['$profileDetails.email', '$userDetails.email'] },
          numberOfTickets: 1,
          isRefunded: 1,
          eventName: '$eventDetails.eventName',
          purchaseDateTime: {
            $dateToString: {
              format: '%Y-%m-%d %H:%M:%S',
              date: '$createdAt',
            },
          },
        },
      },
      {
        $sort: { createdAt: -1 },
      },
    ]);

    // Format response
    const formattedBookings = bookings.map((booking, index) => ({
      sNo: index + 1,
      userName: booking.userName || 'Unknown',
      address: booking.address || 'N/A',
      email: booking.email || 'N/A',
      numberOfTickets: booking.numberOfTickets,
      isRefunded: booking.isRefunded || false,
      eventName: booking.eventName || 'Unknown',
      purchaseDateTime: booking.purchaseDateTime,
    }));

    return apiResponse(res, {
      success: true,
      message: formattedBookings.length > 0
        ? 'Ticket buyers found'
        : 'No ticket buyers found for the given keyword',
      data: { buyers: formattedBookings },
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error searching event ticket buyers:', error);
    return apiResponse(res, {
      success: false,
      message: 'Failed to search event ticket buyers',
      error: error.message,
      statusCode: 500,
    });
  }
};