/**
 * Artist Authentication Schema
 * File: server/Artist/models/Auth/Auth.js
 */
const mongoose = require('mongoose');

const artistAuthenticationSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    trim: true,
  },
  mobileNumber: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  role: {
    type: String,
    default: 'artist',
  },
  password: {
    type: String,
  },
  isRememberMe: {
    type: Boolean,
    default: false,
  },
  isMobileVerified: {
    type: Boolean,
    default: false,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  isProfileComplete: {
    type: Boolean,
    default: false,
  },
  firebaseUid: {
    type: String,
    default: null,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('ArtistAuthentication', artistAuthenticationSchema);