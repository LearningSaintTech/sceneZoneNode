const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'senderType',
  },
  senderType: {
    type: String,
    required: true,
    enum: ['HostAuthentication', 'ArtistAuthentication'],
  },
  proposedPrice: {
    type: Number,
    required: true,
    min: [0, 'Proposed price cannot be negative'],
    validate: {
      validator: Number.isFinite,
      message: 'Proposed price must be a valid number',
    },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  readBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Can be host or artist
    default: [],
  }],
});

const chatNegotiationSchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true,
    index: true,
  },
  hostId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HostAuthentication',
    required: true,
    index: true,
  },
  artistId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ArtistAuthentication',
    required: true,
    index: true,
  },
  messages: [messageSchema],
  lastMessageAt: {
    type: Date,
    default: Date.now,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  latestProposedPrice: {
    type: Number,
    min: [0, 'Proposed price cannot be negative'],
    validate: {
      validator: Number.isFinite,
      message: 'Latest proposed price must be a valid number',
    },
  },
  proposedBy: {
    type: String,
    enum: ['host', 'artist', null],
    default: null,
  },
  isHostApproved: {
    type: Boolean,
    default: false,
  },
  isArtistApproved: {
    type: Boolean,
    default: false,
  },
  finalPrice: {
    type: Number,
    min: [0, 'Final price cannot be negative'],
    validate: {
      validator: Number.isFinite,
      message: 'Final price must be a valid number',
    },
  },
  isNegotiationComplete: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

// Compound index for efficient querying by event and participants
chatNegotiationSchema.index({ eventId: 1, hostId: 1, artistId: 1 }, { unique: true });

module.exports = mongoose.model('ChatNegotiation', chatNegotiationSchema);