const mongoose = require("mongoose");

const guestlistSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserAuthentication',
        require: true

    },
    eventId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Event",
        required: true
    },
    artistId: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Artist',
    }],
    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected'],
        default: 'pending'
    },
    assignedLevel: {
        type: String,
        enum: ['Level1', 'Level2', 'Level3'],
        default: null
    }
});

module.exports = mongoose.model('GuestList', guestlistSchema);