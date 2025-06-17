const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserAuthentication', 
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['Credit Card', 'Debit Card', 'UPI', 'Net Banking'], 
    required: true
  },
  cardHolderName: {
    type: String,
    required: true
  },
  cardNumber: {
    type: Number,
    required: true,
    match: /^[0-9]{16}$/, 
  },
  expiryDate: {
    type: String,
    required: true,
    match: /^(0[1-9]|1[0-2])\/?([0-9]{2})$/, 
  },
  cvv: {
    type: Number,
    required: true,
    match: /^[0-9]{3,4}$/, 
  }
});

module.exports = mongoose.model('UserPaymentDetails', paymentSchema);
