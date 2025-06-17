const mongoose = require("mongoose");

const AdminotpSchema = new mongoose.Schema({
  mobileNumber: { type: String }, // Consistent with User model
  email: { type: String },
  code: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
});

AdminotpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });


module.exports = mongoose.models.Adminotp || mongoose.model("Adminotp", AdminotpSchema);

