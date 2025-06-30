const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  artistId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ArtistProfile',
    required: true
  },
  hostId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HostAuthentication',
    required: true
  },
  date_time: {
    type: Date,
    required: true
  },
  invoices: {
    subtotal: {
      type: Number,
      required: true,
      min: 0
    },
    platform_fees: {
      type: Number,
      required: true,
      min: 0
    },
    taxes: {
      type: Number,
      required: true,
      min: 0
    },
    total: {
      type: Number,
      required: true,
      min: 0
    }
  },
  payment_status: {
    type: String,
    enum: ['pending', 'partial', 'completed', 'failed'],
    default: 'pending',
    required: true
  },
  first_payment: {
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending',
      required: true
    },
    date: {
      type: Date,
      default: null
    }
  },
  second_payment: {
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending',
      required: true
    },
    date: {
      type: Date,
      default: null
    }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Booking', bookingSchema);