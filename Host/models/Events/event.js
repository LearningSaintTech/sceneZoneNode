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
  },
  venue: {
    type: String,
    required: true,
  },
  eventDate: {
    type: [Date],
    required: true,
  },
  eventTime: {
    type: String,
    required: true,
  },
  genre: [
    {
      type: String,
      required: true,
    },
  ],
  budget: {
    type: Number,
    required: true,
  },
  isSoundSystem: {
    type: Boolean,
    default: false,
  },
  posterUrl: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
  isCompleted: {
    type: Boolean,
    default: false
  },
  isCancelled: {
    type: Boolean,
    default: false
  },
  Rating: {
    type: Number,
    default: 0, // average rating
  },
  eventRatings: [
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: "eventRatings.userType", // dynamic reference
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
    }
  ],

  assignedArtists: [{ type: mongoose.Schema.Types.ObjectId, ref: "ArtistAuthentication" }],


});

module.exports = mongoose.model("Event", eventSchema);
