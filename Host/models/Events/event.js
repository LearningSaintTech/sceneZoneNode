const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema({
  hostId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "HostAuthentication",
    required: true,
  },
  eventName: {
    type: String,
    required: true,
    trim: true,
    minlength: 3,
  },
  venue: {
    type: String,
    required: true,
    trim: true,
    minlength: 3,
  },
  eventDate: {
    type: [Date],
    required: true,
    validate: {
      validator: (dates) => dates.every((date) => !isNaN(new Date(date).getTime())),
      message: "Invalid date provided in eventDate.",
    },
  },
  eventTime: {
    type: String,
    required: true,
    trim: true,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?\s?(AM|PM)$/i, // e.g., "12:30 PM"
  },
  genre: [
    {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
    },
  ],
  budget: {
    type: Number,
    required: true,
    min: [0, "Budget cannot be negative."],
  },
  isSoundSystem: {
    type: Boolean,
    default: false,
  },
  posterUrl: {
    type: String,
    required: true,
    trim: true,
  },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
  isCompleted: {
    type: Boolean,
    default: false,
  },
  isCancelled: {
    type: Boolean,
    default: false,
  },
  Rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },
  eventRatings: [
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: "eventRatings.userType",
      },
      userType: {
        type: String,
        enum: ["User", "Artist"],
        required: true,
      },
      rating: {
        type: Number,
        min: 1,
        max: 5,
        required: true,
      },
    },
  ],
  guestLinkUrl: {
    type: String,
    trim: true,
  },
  Discount: {
    level1: {
      type: Number,
      required: true,
      default: 0,
      min: [0, "Discount cannot be negative."],
    },
    level2: {
      type: Number,
      required: true,
      default: 0,
      min: [0, "Discount cannot be negative."],
    },
    level3: {
      type: Number,
      required: true,
      default: 0,
      min: [0, "Discount cannot be negative."],
    },
  },
  assignedArtists: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ArtistAuthentication",
    },
  ],
});

// Index for faster queries
eventSchema.index({ eventName: 1, eventDate: 1 });

module.exports = mongoose.model("Event", eventSchema);