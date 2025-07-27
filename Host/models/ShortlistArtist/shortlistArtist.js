const mongoose = require("mongoose");

const shortlistSchema = new mongoose.Schema({
  hostId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Host",
    required: true,
  },
  artistId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ArtistAuthentication",
    required: true,
  },
  isSalaryBasis:{
    type:Boolean,
    default:false
  },
  assignedEvents:[
      {
        type:mongoose.Schema.Types.ObjectId,
        ref:"Event"
      }
    ],
});

module.exports = mongoose.model("ShortlistArtist", shortlistSchema);
