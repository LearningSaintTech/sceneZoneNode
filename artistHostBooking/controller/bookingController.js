const Razorpay = require('razorpay');
const crypto = require('crypto');
const Booking = require('../models/booking');
const Event = require('../../Host/models/Events/event');
const ArtistProfile =require('../../Artist/models/Profile/profile')
const Artist = require("../../Artist/models/Auth/Auth")
// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// @desc    Create a Razorpay order
// @route   POST /api/bookings/create-order
// @access  Private
const createOrder = async (req, res) => {
  const { amount, currency, eventId, artistId } = req.body;
  console.log('Create order request received:', {
    amount,
    currency,
    eventId,
    artistId,
    timestamp: new Date().toISOString(),
  });

  // Validate input
  if (!amount || !currency || !eventId || !artistId) {
    console.error('Validation failed for create-order:', {
      hasAmount: !!amount,
      hasCurrency: !!currency,
      hasEventId: !!eventId,
      hasArtistId: !!artistId,
      timestamp: new Date().toISOString(),
    });
    res.status(400);
    throw new Error('Missing required fields');
  }

  // Validate amount
  if (!Number.isInteger(amount) || amount <= 0) {
    console.error('Invalid amount:', { amount, timestamp: new Date().toISOString() });
    res.status(400);
    throw new Error('Amount must be a positive integer in paise');
  }

  try {
    const options = {
      amount, // Amount in paise
      currency,
      receipt: `booking_${Date.now()}`,
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

    res.status(200).json({
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
    res.status(500);
    throw new Error('Failed to create order');
  }
};

// @desc    Verify Razorpay payment and create booking
// @route   POST /api/bookings/verify-payment
// @access  Private
const verifyPayment = async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, eventId, artistId, invoices } = req.body;
  const hostId = req.user.hostId;
  console.log('Verify payment request received:', {
    razorpay_order_id,
    razorpay_payment_id,
    eventId,
    artistId,
    invoices,
    hostId,
    timestamp: new Date().toISOString(),
  });

  // Validate input
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !eventId || !artistId || !invoices || !invoices.total) {
    console.error('Validation failed for verify-payment:', {
      hasOrderId: !!razorpay_order_id,
      hasPaymentId: !!razorpay_payment_id,
      hasSignature: !!razorpay_signature,
      hasEventId: !!eventId,
      hasArtistId: !!artistId,
      hasInvoices: !!invoices,
      hasTotal: !!invoices?.total,
      timestamp: new Date().toISOString(),
    });
    res.status(400);
    throw new Error('Missing required fields');
  }

  // Validate invoices.total is a number
  if (isNaN(invoices.total) || invoices.total <= 0) {
    console.error('Invalid invoices.total:', {
      total: invoices.total,
      timestamp: new Date().toISOString(),
    });
    res.status(400);
    throw new Error('Invalid total amount');
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
    res.status(400);
    throw new Error('Invalid payment signature');
  }

  // Validate event and artist existence
  console.log('Validating event:', { eventId, timestamp: new Date().toISOString() });
  const event = await Event.findById(eventId);
  console.log('Event lookup result:', {
    event: event ? event._id : null,
    timestamp: new Date().toISOString(),
  });
  if (!event) {
    console.error('Event not found:', {
      eventId,
      timestamp: new Date().toISOString(),
    });
    res.status(404);
    throw new Error('Event not found');
  }

  console.log('Validating artist:', { artistId, timestamp: new Date().toISOString() });
  const artist = await ArtistProfile.findOne({ artistId: artistId });
  console.log('Artist lookup result:', {
    artist: artist ? artist._id : null,
    timestamp: new Date().toISOString(),
  });
  if (!artist) {
    console.error('Artist not found:', {
      artistId,
      timestamp: new Date().toISOString(),
    });
    res.status(404);
    throw new Error('Artist not found');
  }

  // Start a session for atomic updates
  const session = await Booking.startSession();
  session.startTransaction();

  try {
    console.log('Attempting to create booking:', {
      artistId,
      hostId,
      eventId,
      invoices,
      timestamp: new Date().toISOString(),
    });
    const booking = await Booking.create(
      [{
        artistId,
        hostId,
        eventId,
        date_time: new Date(),
        invoices: {
          subtotal: Number(invoices.subtotal) || 0,
          platform_fees: Number(invoices.platform_fees) || 0,
          taxes: Number(invoices.taxes) || 0,
          total: Number(invoices.total),
        },
        payment_status: 'completed',
        razorpay_order_id,
        razorpay_payment_id,
      }],
      { session }
    );
    console.log('Booking created:', {
      bookingId: booking[0]._id,
      timestamp: new Date().toISOString(),
    });

    console.log('Updating event with artist:', { eventId, artistId, timestamp: new Date().toISOString() });
    const updatedEvent = await Event.findByIdAndUpdate(
      eventId,
      { $addToSet: { assignedArtists: artistId } },
      { session, new: true }
    );
    console.log('Event updated with artist:', {
      eventId,
      artistId,
      assignedArtists: updatedEvent.assignedArtists,
      timestamp: new Date().toISOString(),
    });

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      success: true,
      data: booking[0],
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error verifying payment or creating booking:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
    res.status(400);
    throw new Error('Failed to verify payment or create booking');
  }
};

module.exports = {
  createOrder,
  verifyPayment,
};