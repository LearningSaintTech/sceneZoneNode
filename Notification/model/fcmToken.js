// sceneZoneNode/models/FCMToken.js
const mongoose = require('mongoose');

const fcmTokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  userType: {
    type: String,
    enum: ['host', 'artist', 'user'],
    required: true
  },
  fcmToken: {
    type: String,
    required: true,
    unique: true
  },
  deviceId: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastSeen: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('FCMToken', fcmTokenSchema);