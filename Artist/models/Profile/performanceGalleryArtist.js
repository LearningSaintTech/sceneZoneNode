const mongoose = require("mongoose");

const performanceGallerySchema = new mongoose.Schema({
  artistId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ArtistAuthentication",
    required: true,
  },
  artistProfileId:{
    type: mongoose.Schema.Types.ObjectId,
    ref: "ArtistProfile",
    default:null
  },
  venueName: {
    type: String,
    required: true,
    trim: true,
  },
  genre: {
    type: String,
    required: true,
    trim: true,
  },
  videoUrl: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model("ArtistPerformanceGallery", performanceGallerySchema);
