const mongoose = require("mongoose");

const hostProfileSchema = new mongoose.Schema({
  hostId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "HostAuthentication",
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
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      "Please fill a valid email address",
    ],
    default:null
  },

  location: {
    type: String,
    default:null
  },

  profileImageUrl: {
    type: String,
    default:null
  },

  isProfile: {
    type: Boolean,
    default: false,
  },
});

module.exports = mongoose.model("HostProfile", hostProfileSchema);
