const mongoose = require('mongoose');

const adminProfileSchema = new mongoose.Schema({
    adminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AdminAuth',
        required: true,
        unique: true
    },
    fullName: {
        type: String,
        required: true
    },
    mobileNumber: {
        type: Number,
        required: true,
        match: /^[0-9]{10}$/
    },
    dob: {
        type: Date,
        default: null
    },
    gender: {
        type: String,
        enum: ['Male', 'Female', 'Other'],
        default: null

    },
    address: {
        type: String,
        default: null

    },
    city: {
        type: String,
        default: null

    },
    email: {
        type: String,
        default: null
    },
    profileImageUrl: {
        type: String,
        default: null
    },
    pincode: {
        type: Number,
        default: null
    },
    state: {
        type: String,
        default: null
    }
});

module.exports = mongoose.model('AdminProfile', adminProfileSchema);
