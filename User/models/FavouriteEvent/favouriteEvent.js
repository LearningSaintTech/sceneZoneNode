const mongoose = require("mongoose");

const FavouriteEventSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Event",
    required: true,
  },
});

module.exports = mongoose.model("FavouriteEvents", FavouriteEventSchema);
