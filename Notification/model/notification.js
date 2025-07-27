// sceneZoneNode/models/Notification.js
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  recipientType: {
    type: String,
    enum: ['host', 'artist', 'user'],
    required: true,
    index: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  senderType: {
    type: String,
    enum: ['host', 'artist', 'user', 'system'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  body: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: [
      'chat_message',
      'price_proposal', 
      'price_approved',
      'event_invitation',
      'booking_confirmed',
      'payment_received',
      'event_reminder',
      'guest_list_request',
      'guest_list_approved',
      'guest_list_rejected',
      'system_alert'
    ],
    required: true
  },
  data: {
    chatId: mongoose.Schema.Types.ObjectId,
    eventId: mongoose.Schema.Types.ObjectId,
    bookingId: mongoose.Schema.Types.ObjectId,
    amount: Number,
    customData: mongoose.Schema.Types.Mixed
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true
  },
  isPushSent: {
    type: Boolean,
    default: false
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
notificationSchema.index({ recipientId: 1, recipientType: 1, createdAt: -1 });
notificationSchema.index({ recipientId: 1, isRead: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Notification', notificationSchema);