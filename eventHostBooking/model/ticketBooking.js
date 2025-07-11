const mongoose = require('mongoose');

const ticketBookingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserAuthentication',
    required: true,
  },
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true,
  },
  ticketId: {
    type: String,
    required: true,
    unique: true,
  },
  numberOfTickets: {
    type: Number,
    required: true,
    min: 1,
  },
  guestType: {
    type: String,
    enum: ['level1', 'level2', 'level3'],
    required: true,
  },
  discountApplied: {
    type: Number,
    default: 0,
    min: 0,
  },
  subtotal: {
    type: Number,
    required: true,
    min: 0,
  },
  fees: {
    type: Number,
    required: true,
    min: 0,
  },
  tax: {
    type: Number,
    required: true,
    min: 0,
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  barcodeImage: {
    type: String,
    required: true,
  },
  barcodeText: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'cancelled'],
    default: 'pending',
  },
  selectedEventDate: {
    type: Date,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('TicketBooking', ticketBookingSchema);