const mongoose = require("mongoose");

const userProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "UserAuthentication",
    required: true,
  },

  email: {
    type: String,
    required: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      "Please fill a valid email address",
    ],
  },

  isEmailVerified: {
    type: Boolean,
    default: false,
  },

  address: {
    type: String,
    required: true,
  },

  profileImageUrl: {
    type: String,
  },

  dob: {
    type: Date,
  },

  // Uncomment if needed later
  // isProfile: {
  //   type: Boolean,
  //   default: false,
  // },
});

module.exports = mongoose.model("UserProfile", userProfileSchema);
