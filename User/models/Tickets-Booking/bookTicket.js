const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserAuthentication',
        required: true
    },
    eventId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        required: true
    },
    eventDate: {
        type: String,
        required: true
    },
    eventTime: {
        type: String,
        required: [true, 'Event time is required'],
        validate: {
            validator: function (value) {
                // Regex for 12-hour AM/PM format (e.g., "12:30 PM", "9:00 AM")
                const timeRegex = /^((1[0-2]|0?[1-9]):([0-5][0-9]) ?([AaPp][Mm]))$/;
                return timeRegex.test(value);
            },
            message: 'Invalid time format. Use HH:MM AM/PM (e.g., 12:30 PM or 09:00 AM)'
        }
    },
    paymentStatus: {
        type: String,
        required: [true, 'Payment status is required'],
        enum: {
            values: ['pending', 'completed', 'failed'],
        },
        default: 'pending'
    },
    numberOfTickets: {
        type: Number,
        default: 0
    },
    ticketAmount: {
        type: Number,
        required: true
    },
     expiresAt: {
        type: Date,
        required: true
    },
    ticketUsed: {
        type: Boolean,
        default: false
    },
    usedAt: {
        type: Date
    }
});

module.exports = mongoose.model('Ticket', ticketSchema);