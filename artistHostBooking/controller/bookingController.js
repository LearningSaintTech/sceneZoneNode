 const Booking = require('../models/booking');

// @desc    Create a new booking
// @route   POST /api/bookings
// @access  Private
const createBooking =  (async (req, res) => {
  const { artistId, hostId, date_time, invoices } = req.body;

  // Validate input
  if (!artistId || !hostId || !date_time || !invoices || !invoices.total) {
    res.status(400);
    throw new Error('Missing required fields');
  }

  // Calculate payment amounts
  const firstPaymentAmount = invoices.total * 0.2;
  const secondPaymentAmount = invoices.total * 0.8;

  const booking = await Booking.create({
    artistId,
    hostId,
    date_time,
    invoices: {
      subtotal: invoices.subtotal || 0,
      platform_fees: invoices.platform_fees || 0,
      taxes: invoices.taxes || 0,
      total: invoices.total
    },
    payment_status: 'pending',
    first_payment: {
      amount: firstPaymentAmount,
      status: 'pending',
      date: null
    },
    second_payment: {
      amount: secondPaymentAmount,
      status: 'pending',
      date: null
    }
  });

  res.status(201).json({
    success: true,
    data: booking
  });
});

// @desc    Get all bookings
// @route   GET /api/bookings
// @access  Private
const getAllBookings =  (async (req, res) => {
  const bookings = await Booking.find()
    .populate('artistId', 'name')
    .populate('hostId', 'name')
    .lean();
  res.status(200).json({
    success: true,
    data: bookings
  });
});

// @desc    Get a single booking by ID
// @route   GET /api/bookings/:id
// @access  Private
const getBookingById =  (async (req, res) => {
  const booking = await Booking.findById(req.params.id)
    .populate('artistId', 'name')
    .populate('hostId', 'name')
    .lean();

  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }

  res.status(200).json({
    success: true,
    data: booking
  });
});

// @desc    Update a booking by ID
// @route   PUT /api/bookings/:id
// @access  Private
const updateBooking =  (async (req, res) => {
  const { artistId, hostId, date_time, invoices, payment_status } = req.body;

  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }

  // Update fields if provided
  if (artistId) booking.artistId = artistId;
  if (hostId) booking.hostId = hostId;
  if (date_time) booking.date_time = date_time;
  if (invoices) {
    booking.invoices = {
      subtotal: invoices.subtotal || booking.invoices.subtotal,
      platform_fees: invoices.platform_fees || booking.invoices.platform_fees,
      taxes: invoices.taxes || booking.invoices.taxes,
      total: invoices.total || booking.invoices.total
    };
    // Recalculate payment amounts if total changes
    if (invoices.total) {
      booking.first_payment.amount = invoices.total * 0.2;
      booking.second_payment.amount = invoices.total * 0.8;
    }
  }
  if (payment_status) booking.payment_status = payment_status;

  const updatedBooking = await booking.save();

  res.status(200).json({
    success: true,
    data: updatedBooking
  });
});

// @desc    Delete a booking by ID
// @route   DELETE /api/bookings/:id
// @access  Private
const deleteBooking =  (async (req, res) => {
  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }

  await booking.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Booking deleted successfully'
  });
});

// @desc    Update payment status for first or second payment
// @route   PATCH /api/bookings/:id/payment
// @access  Private
const updatePaymentStatus =  (async (req, res) => {
  const { payment_type, status } = req.body;

  if (!['first_payment', 'second_payment'].includes(payment_type)) {
    res.status(400);
    throw new Error('Invalid payment type');
  }

  if (!['pending', 'completed', 'failed'].includes(status)) {
    res.status(400);
    throw new Error('Invalid payment status');
  }

  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }

  // Update payment status and date
  booking[payment_type].status = status;
  if (status === 'completed' || status === 'failed') {
    booking[payment_type].date = new Date();
  }

  // Update overall payment status
  if (
    booking.first_payment.status === 'completed' &&
    booking.second_payment.status === 'completed'
  ) {
    booking.payment_status = 'completed';
  } else if (
    booking.first_payment.status === 'completed' ||
    booking.second_payment.status === 'completed'
  ) {
    booking.payment_status = 'partial';
  } else if (
    booking.first_payment.status === 'failed' ||
    booking.second_payment.status === 'failed'
  ) {
    booking.payment_status = 'failed';
  } else {
    booking.payment_status = 'pending';
  }

  const updatedBooking = await booking.save();

  res.status(200).json({
    success: true,
    data: updatedBooking
  });
});

module.exports = {
  createBooking,
  getAllBookings,
  getBookingById,
  updateBooking,
  deleteBooking,
  updatePaymentStatus
};