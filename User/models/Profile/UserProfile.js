const mongoose = require("mongoose");

const userProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "UserAuthentication",
    required: true,
  },
  fullName: {
    type: String,
    required: true,
  },
  mobileNumber: {
    type: Number,
    required: true,
    validate: {
      validator: function (v) {
        return /^[0-9]{10}$/.test(v.toString());
      },
      message: (props) =>
        `${props.value} is not a valid 10-digit mobile number!`,
    },
  },
  email: {
    type: String,
    required: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      "Please fill a valid email address",
    ],
  },
  address: {
    type: String,
    required: true,
  },
  profileImageUrl:{
    type: String,
  },
  dob: {
    type: Date,
  },
  // isProfile: {
  //   type: Boolean,
  //   default: false,
  // },
});

module.exports = mongoose.model("UserProfile", userProfileSchema);
