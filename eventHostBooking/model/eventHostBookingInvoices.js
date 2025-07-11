const mongoose = require('mongoose');

const eventHostBookingInvoicesSchema = new mongoose.Schema({
  platformFees: {
    type: Number,
    required: true,
    default: 1.50,
    min: [0, 'Platform fees cannot be negative'],
    max: [100, 'Platform fees cannot exceed 100'],
  },
  taxRate: {
    type: Number,
    required: true,
    default: 4,
    min: [0, 'Tax rate cannot be negative'],
    max: [50, 'Tax rate cannot exceed 50%'],
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update `updatedAt` before saving
eventHostBookingInvoicesSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  console.log(`Updating invoice settings updatedAt: ${this.updatedAt}`);
  next();
});

// Ensure singleton pattern
eventHostBookingInvoicesSchema.statics.getSingleton = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({ platformFees: 1.50, taxRate: 4 });
  }
  return settings;
};

module.exports = mongoose.model('EventHostBookingInvoices', eventHostBookingInvoicesSchema);