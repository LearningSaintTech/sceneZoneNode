const Razorpay = require('razorpay');
const crypto = require('crypto');
const TicketBooking = require('../model/ticketBooking');
const Event = require('../../Host/models/Events/event');
const EventHostBookingInvoices = require('../model/eventHostBookingInvoices');
const UserAuthentication = require('../../User/models/Auth/Auth');
const { apiResponse } = require('../../utils/apiResponse');
const QRCode = require('qrcode');
const { createCanvas } = require('canvas');
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const generateTicketId = () => {
  const ticketId = `TKT${uuidv4().replace(/-/g, '').slice(0, 9).toUpperCase()}`;
  console.log(`Generated ticket ID: ${ticketId}`);
  return ticketId;
};

const generateBarcode = (ticketId, numberOfTickets, fullName) => {
  const sanitizedFullName = fullName
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 20);
  const barcodeText = `${ticketId}|${numberOfTickets}|${sanitizedFullName}`;
  console.log(`Generating QR code with text: ${barcodeText}`);

  const canvas = createCanvas(400, 200);
  QRCode.toCanvas(canvas, barcodeText, {
    errorCorrectionLevel: 'H',
    margin: 2,
    color: { dark: '#000000', light: '#FFFFFF' },
    width: 360,
  });
  const barcodeImage = canvas.toDataURL('image/png', { quality: 1.0 });
  return { barcodeImage, barcodeText };
};

exports.bookTicket = async (req, res) => {
  const { eventId, numberOfTickets, guestType, selectedEventDate, razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;
  const userId = req.user?.userId;
  console.log(`Booking ticket: eventId=${eventId}, numberOfTickets=${numberOfTickets}, guestType=${guestType}, selectedEventDate=${selectedEventDate}, userId=${userId}, razorpay_payment_id=${razorpay_payment_id}`);

  try {
    // Input validation
    if (!eventId || !numberOfTickets || !guestType || !selectedEventDate) {
      console.log('Validation failed: Missing required fields');
      return apiResponse(res, {
        success: false,
        message: 'eventId, numberOfTickets, guestType, and selectedEventDate are required',
        statusCode: 400,
      });
    }

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      console.log('Validation failed: Invalid eventId format');
      return apiResponse(res, {
        success: false,
        message: 'Invalid eventId format',
        statusCode: 400,
      });
    }

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      console.log('Validation failed: Invalid or missing userId');
      return apiResponse(res, {
        success: false,
        message: 'Invalid or missing user ID from authentication',
        statusCode: 401,
      });
    }

    if (!['level1', 'level2', 'level3'].includes(guestType)) {
      console.log('Validation failed: Invalid guestType');
      return apiResponse(res, {
        success: false,
        message: 'Invalid guestType. Must be one of: level1, level2, level3',
        statusCode: 400,
      });
    }

    const parsedSelectedDate = new Date(selectedEventDate);
    if (isNaN(parsedSelectedDate.getTime())) {
      console.log('Validation failed: Invalid selectedEventDate format');
      return apiResponse(res, {
        success: false,
        message: 'Invalid selectedEventDate format',
        statusCode: 400,
      });
    }

    if (!Number.isInteger(numberOfTickets) || numberOfTickets < 1) {
      console.log('Validation failed: Invalid numberOfTickets');
      return apiResponse(res, {
        success: false,
        message: 'Number of tickets must be a positive integer',
        statusCode: 400,
      });
    }

    const session = await Event.startSession();
    session.startTransaction();
    try {
      const event = await Event.findById(eventId).session(session);
      if (!event) {
        console.log(`Event not found: ${eventId}`);
        await session.abortTransaction();
        session.endSession();
        return apiResponse(res, {
          success: false,
          message: 'Event not found',
          statusCode: 404,
        });
      }

      if (!event.ticketSetting) {
        console.log('Validation failed: Missing ticket settings');
        await session.abortTransaction();
        session.endSession();
        return apiResponse(res, {
          success: false,
          message: 'Event ticket settings are missing',
          statusCode: 400,
        });
      }

      const now = new Date();
      const eventDates = event.eventDateTime.map(dt => new Date(dt).toISOString());
      if (!eventDates.includes(parsedSelectedDate.toISOString())) {
        console.log(`Validation failed: selectedEventDate ${selectedEventDate} not in event dates: ${eventDates}`);
        await session.abortTransaction();
        session.endSession();
        return apiResponse(res, {
          success: false,
          message: 'Selected event date is not valid for this event',
          statusCode: 400,
        });
      }

      if (parsedSelectedDate < now) {
        console.log('Validation failed: Selected event date is in the past');
        await session.abortTransaction();
        session.endSession();
        return apiResponse(res, {
          success: false,
          message: 'Cannot book tickets for past event dates',
          statusCode: 400,
        });
      }

      if (event.ticketSetting.salesStart && new Date(event.ticketSetting.salesStart) > now) {
        console.log('Validation failed: Ticket sales not started');
        await session.abortTransaction();
        session.endSession();
        return apiResponse(res, {
          success: false,
          message: 'Ticket sales have not started yet',
          statusCode: 400,
        });
      }
      if (event.ticketSetting.salesEnd && new Date(event.ticketSetting.salesEnd) < now) {
        console.log('Validation failed: Ticket sales ended');
        await session.abortTransaction();
        session.endSession();
        return apiResponse(res, {
          success: false,
          message: 'Ticket sales have ended',
          statusCode: 400,
        });
      }

      if (event.ticketSetting.totalQuantity < numberOfTickets) {
        console.log(`Not enough tickets: totalQuantity=${event.ticketSetting.totalQuantity}, requested=${numberOfTickets}`);
        await session.abortTransaction();
        session.endSession();
        return apiResponse(res, {
          success: false,
          message: 'Not enough tickets available',
          statusCode: 400,
        });
      }

      const user = await UserAuthentication.findById(userId).session(session);
      if (!user || !user.fullName) {
        console.log(`User not found or missing fullName: ${userId}`);
        await session.abortTransaction();
        session.endSession();
        return apiResponse(res, {
          success: false,
          message: 'User not found or fullName is missing',
          statusCode: 404,
        });
      }

      let subtotal, fees, tax, discount, totalAmount, orderId = null;

      if (event.ticketSetting.ticketType === 'free') {
        console.log('Event is free, setting costs to zero');
        subtotal = 0;
        fees = 0;
        tax = 0;
        discount = 0;
        totalAmount = 0;
      } else {
        // Validate payment details for paid events
        if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
          console.log('Validation failed: Missing Razorpay payment details');
          await session.abortTransaction();
          session.endSession();
          return apiResponse(res, {
            success: false,
            message: 'Razorpay payment details are required for paid events',
            statusCode: 400,
          });
        }

        // Verify Razorpay signature
        const generatedSignature = crypto
          .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
          .update(`${razorpay_order_id}|${razorpay_payment_id}`)
          .digest('hex');
        console.log('Signature verification:', {
          generatedSignature,
          razorpay_signature,
          timestamp: new Date().toISOString(),
        });

        if (generatedSignature !== razorpay_signature) {
          console.error('Invalid payment signature:', {
            generatedSignature,
            razorpay_signature,
            timestamp: new Date().toISOString(),
          });
          await session.abortTransaction();
          session.endSession();
          return apiResponse(res, {
            success: false,
            message: 'Invalid payment signature',
            statusCode: 400,
          });
        }

        if (!Number.isFinite(event.ticketSetting.price) || event.ticketSetting.price < 0) {
          console.log('Validation failed: Invalid or missing ticket price');
          await session.abortTransaction();
          session.endSession();
          return apiResponse(res, {
            success: false,
            message: 'Event ticket price is invalid or missing',
            statusCode: 400,
          });
        }

        const invoiceSettings = await EventHostBookingInvoices.getSingleton(session);
        if (!invoiceSettings) {
          console.log('Invoice settings not found');
          await session.abortTransaction();
          session.endSession();
          return apiResponse(res, {
            success: false,
            message: 'Invoice settings not configured',
            statusCode: 500,
          });
        }

        discount = event.Discount[guestType] || 0;
        subtotal = event.ticketSetting.price * numberOfTickets;
        fees = invoiceSettings.platformFees;
        const taxRate = invoiceSettings.taxRate;
        tax = (subtotal * taxRate) / 100;
        totalAmount = subtotal + fees + tax - discount;

        if (!Number.isFinite(subtotal) || !Number.isFinite(tax) || !Number.isFinite(totalAmount)) {
          console.log('Validation failed: Invalid calculation results');
          await session.abortTransaction();
          session.endSession();
          return apiResponse(res, {
            success: false,
            message: 'Invalid calculation for ticket costs',
            statusCode: 500,
          });
        }

        console.log(`Calculated costs: subtotal=${subtotal}, fees=${fees}, tax=${tax}, discount=${discount}, totalAmount=${totalAmount}`);
      }

      const ticketId = generateTicketId();
      const { barcodeImage, barcodeText } = generateBarcode(ticketId, numberOfTickets, user.fullName);

      const ticketBooking = new TicketBooking({
        userId,
        eventId,
        ticketId,
        numberOfTickets,
        guestType,
        discountApplied: discount,
        subtotal,
        fees,
        tax,
        totalAmount,
        barcodeImage,
        barcodeText,
        selectedEventDate: parsedSelectedDate,
        status: event.ticketSetting.ticketType === 'free' ? 'paid' : 'pending',
        razorpay_order_id: orderId,
        razorpay_payment_id: event.ticketSetting.ticketType === 'free' ? null : razorpay_payment_id,
      });
      await ticketBooking.save({ session });

      // Update ticket quantity only after successful payment for paid events
      if (event.ticketSetting.ticketType !== 'free') {
        event.ticketSetting.totalQuantity -= numberOfTickets;
        await event.save({ session });
      }

      await session.commitTransaction();
      session.endSession();

      return apiResponse(res, {
        success: true,
        message: 'Ticket booked successfully',
        data: { ticketBooking },
      });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      console.error(`Transaction error: ${error.message}`);
      throw error;
    }
  } catch (error) {
    console.error(`Error booking ticket: ${error.message}`);
    return apiResponse(res, {
      success: false,
      message: 'Failed to book ticket',
      error: error.message,
      statusCode: 500,
    });
  }
};

// Create Razorpay order for paid events
exports.createTicketOrder = async (req, res) => {
  const { eventId, numberOfTickets, guestType, selectedEventDate } = req.body;
  const userId = req.user?.userId;
  console.log(`Creating ticket order: eventId=${eventId}, numberOfTickets=${numberOfTickets}, guestType=${guestType}, selectedEventDate=${selectedEventDate}, userId=${userId}`);

  try {
    if (!eventId || !numberOfTickets || !guestType || !selectedEventDate) {
      console.log('Validation failed: Missing required fields');
      return apiResponse(res, {
        success: false,
        message: 'eventId, numberOfTickets, guestType, and selectedEventDate are required',
        statusCode: 400,
      });
    }

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      console.log('Validation failed: Invalid eventId format');
      return apiResponse(res, {
        success: false,
        message: 'Invalid eventId format',
        statusCode: 400,
      });
    }

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      console.log('Validation failed: Invalid or missing userId');
      return apiResponse(res, {
        success: false,
        message: 'Invalid or missing user ID from authentication',
        statusCode: 401,
      });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      console.log(`Event not found: ${eventId}`);
      return apiResponse(res, {
        success: false,
        message: 'Event not found',
        statusCode: 404,
      });
    }

    if (event.ticketSetting.ticketType === 'free') {
      console.log('Event is free, no order creation needed');
      return apiResponse(res, {
        success: true,
        message: 'Free event, no payment required',
        data: { orderId: null, amount: 0, currency: 'INR' },
      });
    }

    const invoiceSettings = await EventHostBookingInvoices.getSingleton();
    if (!invoiceSettings) {
      console.log('Invoice settings not found');
      return apiResponse(res, {
        success: false,
        message: 'Invoice settings not configured',
        statusCode: 500,
      });
    }

    const discount = event.Discount[guestType] || 0;
    const subtotal = event.ticketSetting.price * numberOfTickets;
    const fees = invoiceSettings.platformFees;
    const taxRate = invoiceSettings.taxRate;
    const tax = (subtotal * taxRate) / 100;
    const totalAmount = subtotal + fees + tax - discount;

    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      console.log('Validation failed: Invalid total amount');
      return apiResponse(res, {
        success: false,
        message: 'Invalid total amount',
        statusCode: 400,
      });
    }

    const amountInPaise = Math.round(totalAmount * 100); // Convert to paise
    const options = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: `ticket_${Date.now()}`,
    };

    console.log('Creating Razorpay order with options:', {
      options,
      timestamp: new Date().toISOString(),
    });

    const order = await razorpay.orders.create(options);
    console.log('Razorpay order created:', {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      timestamp: new Date().toISOString(),
    });

    return apiResponse(res, {
      success: true,
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
      },
    });
  } catch (error) {
    console.error('Error creating Razorpay order:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
    return apiResponse(res, {
      success: false,
      message: 'Failed to create order',
      error: error.message,
      statusCode: 500,
    });
  }
};

exports.getUserTickets = async (req, res) => {
  const userId = req.user?.userId;
  const { page = 1, limit = 10, status } = req.query;
  console.log(`Fetching tickets for user: ${userId}, page=${page}, limit=${limit}, status=${status}`);

  try {
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      console.log('Validation failed: Invalid or missing userId');
      return apiResponse(res, {
        success: false,
        message: 'Invalid or missing user ID from authentication',
        statusCode: 401,
      });
    }

    const query = { userId };
    if (status && ['pending', 'paid', 'cancelled'].includes(status)) {
      query.status = status;
    }

    const tickets = await TicketBooking.find(query)
      .populate('eventId', 'eventName venue eventDateTime')
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 })
      .exec();

    const total = await TicketBooking.countDocuments(query);

    return apiResponse(res, {
      success: true,
      message: 'Tickets retrieved successfully',
      data: {
        tickets,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error(`Error fetching tickets: ${error.message}`);
    return apiResponse(res, {
      success: false,
      message: 'Failed to retrieve tickets',
      error: error.message,
      statusCode: 500,
    });
  }
};

exports.getTicketBarcode = async (req, res) => {
  const { ticketId } = req.params;
  const userId = req.user?.userId;
  console.log(`Fetching barcode for ticketId: ${ticketId}, userId: ${userId}`);

  try {
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      console.log('Validation failed: Invalid or missing userId');
      return apiResponse(res, {
        success: false,
        message: 'Invalid or missing user ID from authentication',
        statusCode: 401,
      });
    }

    if (!ticketId) {
      console.log('Validation failed: Missing ticketId');
      return apiResponse(res, {
        success: false,
        message: 'ticketId is required',
        statusCode: 400,
      });
    }

    const ticket = await TicketBooking.findOne({ ticketId, userId })
      .populate('eventId', 'eventName venue eventDateTime')
      .exec();
    if (!ticket) {
      console.log(`Ticket not found: ${ticketId} for user: ${userId}`);
      return apiResponse(res, {
        success: false,
        message: 'Ticket not found or you do not have access',
        statusCode: 404,
      });
    }

    if (!ticket.barcodeImage) {
      console.log(`No barcode image for ticket: ${ticketId}`);
      return apiResponse(res, {
        success: false,
        message: 'No barcode image available for this ticket',
        statusCode: 400,
      });
    }

    const base64Data = ticket.barcodeImage.replace(/^data:image\/png;base64,/, '');
    const imgBuffer = Buffer.from(base64Data, 'base64');

    // Set response headers to indicate a PNG image
    res.set('Content-Type', 'image/png');
    // Include event details in a custom header or as part of a multipart response if needed
    res.set('X-Event-Details', JSON.stringify({
      eventName: ticket.eventId?.eventName,
      venue: ticket.eventId?.venue,
      eventDateTime: ticket.eventId?.eventDateTime,
    }));
    res.send(imgBuffer);
  } catch (error) {
    console.error(`Error fetching barcode: ${error.message}`);
    return apiResponse(res, {
      success: false,
      message: 'Failed to retrieve barcode',
      error: error.message,
      statusCode: 500,
    });
  }
};

exports.getTicketBarcodeText = async (req, res) => {
  const { ticketId } = req.params;
  const userId = req.user?.userId;
  console.log(`Fetching barcode text for ticketId: ${ticketId}, userId: ${userId}`);

  try {
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      console.log('Validation failed: Invalid or missing userId');
      return apiResponse(res, {
        success: false,
        message: 'Invalid or missing user ID from authentication',
        statusCode: 401,
      });
    }

    if (!ticketId) {
      console.log('Validation failed: Missing ticketId');
      return apiResponse(res, {
        success: false,
        message: 'ticketId is required',
        statusCode: 400,
      });
    }

    const ticket = await TicketBooking.findOne({ ticketId, userId }).exec();
    if (!ticket) {
      console.log(`Ticket not found: ${ticketId} for user: ${userId}`);
      return apiResponse(res, {
        success: false,
        message: 'Ticket not found or you do not have access',
        statusCode: 404,
      });
    }

    if (!ticket.barcodeText) {
      console.log(`No barcode text for ticket: ${ticketId}`);
      return apiResponse(res, {
        success: false,
        message: 'No barcode text available for this ticket',
        statusCode: 400,
      });
    }

    return apiResponse(res, {
      success: true,
      message: 'Barcode text retrieved successfully',
      data: { barcodeText: ticket.barcodeText },
    });
  } catch (error) {
    console.error(`Error fetching barcode text: ${error.message}`);
    return apiResponse(res, {
      success: false,
      message: 'Failed to retrieve barcode text',
      error: error.message,
      statusCode: 500,
    });
  }
};