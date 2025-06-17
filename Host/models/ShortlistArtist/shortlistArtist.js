const mongoose = require("mongoose");

const shortlistSchema = new mongoose.Schema({
  hostId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Host",
    required: true,
  },
  artistId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ArtistProfile",
    required: true,
  },
});

module.exports = mongoose.model("ShortlistArtist", shortlistSchema);
