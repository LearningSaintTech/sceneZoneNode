const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  platform_fees: {
    amount: {
      type: Number,
      required: true,
      min: 0 // Ensure non-negative fees
    }
  },
  taxes: {
    amount: {
      type: Number,
      required: true,
      min: 0 // Ensure non-negative taxes
    }
  }
}, {
  timestamps: true // Adds createdAt and updatedAt fields
});

module.exports = mongoose.model('Invoice', invoiceSchema);