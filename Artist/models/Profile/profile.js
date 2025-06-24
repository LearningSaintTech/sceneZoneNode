const mongoose = require('mongoose');

const artistProfileSchema = new mongoose.Schema({
  artistId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ArtistAuthentication",
    required: true,
    unique: true
  },
  dob: {
    type: Date,
    required: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    unique: true,
  },
  address: {
    type: String,
    required: true,
    trim: true
  },
  artistType: {
    type: String,
    required: true
  },
  instrument: {
    type: String,
  },
  budget: {
    type: Number,
  },
  isCrowdGuarantee: {
    type: Boolean,
    default: false
  },
  performanceUrl: [
    {
      venueName: {
        type: String,
        required: true,
        trim: true
      },
      genre: {
        type: String,
        required: true,
        trim: true
      },
      videoUrl: {
        type: String,
        required: true,
      }
    }
  ]
}, {
  timestamps: true
});

module.exports = mongoose.model("ArtistProfile", artistProfileSchema);
