const mongoose = require("mongoose");

const savedEventSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    artistId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ArtistAuthentication",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("SavedEvent", savedEventSchema);
