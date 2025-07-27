const mongoose = require("mongoose");

const hostotpSchema = new mongoose.Schema({
  mobileNumber: { type: String}, // Consistent with User model
  email: { type: String },
  code: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
});

hostotpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("hostOtp", hostotpSchema);
