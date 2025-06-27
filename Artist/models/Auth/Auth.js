const mongoose = require("mongoose");

const artistAuthenticationSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
  },
  mobileNumber: {
    type: Number,
    required: true,
  },
  role: {
    type: String,
    default: "artist",
  },
  password: {
    type: String,
  },
  isRememberMe: {
    type: Boolean,
    default: false,
  },
  isMobileVerified:{
    type:Boolean,
    default:false
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  isProfileComplete: {
    type: Boolean,
    default: false,
  },
});

module.exports = mongoose.model(
  "ArtistAuthentication",
  artistAuthenticationSchema
);
