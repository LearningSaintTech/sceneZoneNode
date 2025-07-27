const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  senderType: {
    type: String,
    enum: ['host', 'artist'],
    required: true
  },
  receiverType: {
    type: String,
    enum: ['host', 'artist'],
    required: true
  },
  message: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  read: {
    type: Boolean,
    default: false
  },
  conversationId: {
    type: String,
    default: function() {
      // Create a consistent conversation ID by sorting participant IDs
      const participants = [this.senderId.toString(), this.receiverId.toString()].sort();
      return participants.join('_');
    }
  }
});

module.exports = mongoose.model('Chat', chatSchema);