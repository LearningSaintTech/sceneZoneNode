const mongoose = require('mongoose');

const adminotpSchema = new mongoose.Schema({
  mobileNumber: { type: String, default: null },
  otp: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now, expires: 300 } // OTP expires in 5 minutes
});

module.exports = mongoose.model('adminotpSchema', adminotpSchema);