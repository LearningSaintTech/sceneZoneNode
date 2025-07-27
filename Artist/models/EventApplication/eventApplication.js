// models/EventApplication.js
const mongoose = require("mongoose");

const eventApplicationSchema = new mongoose.Schema({
  artistId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ArtistAuthentication",
    required: true,
  },
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Event",
    required: true,
  },
  status: {
    type: String,
    enum: ["pending", "accepted", "rejected"],
    default: "pending",
  },
  appliedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("EventApplication", eventApplicationSchema);
