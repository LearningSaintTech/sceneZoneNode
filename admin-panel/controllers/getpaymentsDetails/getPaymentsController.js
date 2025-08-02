const mongoose = require('mongoose');
const TicketBooking = require('../../../eventHostBooking/model/ticketBooking');
const Event = require('../../../Host/models/Events/event');
const User = require('../../../User/models/Auth/Auth');
const { apiResponse } = require('../../../utils/apiResponse');
const {exportToCsv} = require("../../../utils/exportToCsv");

exports.getPaymentDetails = async (req, res) => {
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

    // Fetch paid ticket bookings with user and event details
    const bookings = await TicketBooking.aggregate([
      {
        $match: {
          status: 'paid',
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
        $project: {
          userName: '$userDetails.fullName',
          contactNumber: '$userDetails.mobileNumber',
          eventName: '$eventDetails.eventName',
          eventId: '$eventId',
          ticketStatus: '$status',
          numberOfTickets: 1,
          price: '$eventDetails.ticketSetting.price',
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
      contactNumber: booking.contactNumber || 'N/A',
      eventName: booking.eventName || 'Unknown',
      eventId: booking.eventId.toString(),
      ticketStatus: booking.ticketStatus,
      numberOfTickets: booking.numberOfTickets || 0,
      price: booking.price || 0,
      purchaseDateTime: booking.purchaseDateTime,
    }));

    return apiResponse(res, {
      success: true,
      message: formattedBookings.length > 0
        ? 'Payment details retrieved successfully'
        : 'No paid ticket bookings found',
      data: { bookings: formattedBookings },
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error retrieving payment details:', error);
    return apiResponse(res, {
      success: false,
      message: 'Failed to retrieve payment details',
      error: error.message,
      statusCode: 500,
    });
  }
};



exports.searchPaymentDetails = async (req, res) => {
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

    // Search paid ticket bookings with keyword matching
    const bookings = await TicketBooking.aggregate([
      {
        $match: {
          status: 'paid',
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
            { 'userDetails.mobileNumber': { $regex: searchKeyword, $options: 'i' } },
            { 'eventDetails.eventName': { $regex: searchKeyword, $options: 'i' } },
          ],
        },
      },
      {
        $project: {
          userName: '$userDetails.fullName',
          contactNumber: '$userDetails.mobileNumber',
          eventName: '$eventDetails.eventName',
          eventId: '$eventId',
          ticketStatus: '$status',
          numberOfTickets: 1,
          price: '$eventDetails.ticketSetting.price',
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
      contactNumber: booking.contactNumber || 'N/A',
      eventName: booking.eventName || 'Unknown',
      eventId: booking.eventId.toString(),
      ticketStatus: booking.ticketStatus,
      numberOfTickets: booking.numberOfTickets || 0,
      price: booking.price || 0,
      purchaseDateTime: booking.purchaseDateTime,
    }));

    return apiResponse(res, {
      success: true,
      message: formattedBookings.length > 0
        ? 'Payment details found'
        : 'No paid ticket bookings found for the given keyword',
      data: { bookings: formattedBookings },
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error searching payment details:', error);
    return apiResponse(res, {
      success: false,
      message: 'Failed to search payment details',
      error: error.message,
      statusCode: 500,
    });
  }
};




exports.exportPaymentDetailsToCsv = async (req, res) => {
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

    // Fetch paid ticket bookings
    const bookings = await TicketBooking.aggregate([
      {
        $match: {
          status: 'paid',
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
        $project: {
          contactNumber: '$userDetails.mobileNumber',
          amount: { $multiply: ['$numberOfTickets', '$eventDetails.ticketSetting.price'] },
          status: '$status',
        },
      },
    ]);

    // Format data for CSV
    const formattedBookings = bookings.map((booking, index) => ({
      sNo: index + 1,
      contactNumber: booking.contactNumber || 'N/A',
      amount: booking.amount || 0,
      status: booking.status,
    }));

    // Define CSV columns
    const columns = [
      { key: 'sNo', header: 'S No.' },
      { key: 'contactNumber', header: 'Contact Number' },
      { key: 'amount', header: 'Amount' },
      { key: 'status', header: 'Status' },
    ];

    // Export to CSV
    exportToCsv(res, formattedBookings, columns, 'payment_details.csv');
  } catch (error) {
    console.error('Error exporting payment details to CSV:', error);
    return apiResponse(res, {
      success: false,
      message: 'Failed to export payment details to CSV',
      error: error.message,
      statusCode: 500,
    });
  }
};