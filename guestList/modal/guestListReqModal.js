const mongoose = require('mongoose');

const guestListRequestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UserAuthentication',
      required: [true, 'User ID is required'],
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: [true, 'Event ID is required'],
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    appliedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries on user and event
guestListRequestSchema.index({ userId: 1, eventId: 1 });

module.exports = mongoose.model('GuestListRequest', guestListRequestSchema);