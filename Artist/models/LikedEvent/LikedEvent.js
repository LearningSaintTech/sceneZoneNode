const mongoose = require("mongoose");

const likedEventSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    artistId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ArtistAuthentication", // or "User" if your artist auth model is named that
      required: true,
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt
  }
);

module.exports = mongoose.model("LikedEvent", likedEventSchema);
