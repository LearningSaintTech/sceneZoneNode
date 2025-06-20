const mongoose = require("mongoose");

const artistProfileSchema = new mongoose.Schema({
  artistId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ArtistAuthentication",
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
  dob: {
    type: Date,
    required: true,
  },
  address: {
    type: String,
    required: true,
  },
  location: {
    type: String,
    enum:[],
    required: true,
  },
 genre: {
  type: [String],
  required: true,
},
  ArtistType: {
    type: String,
    enum: [
      "Musician",
      "Rockstar",
      "Jazz Virtuoso",
      "Hip Hop Artist",
      "Classical Maestro",
      "Reggae Performer",
      "Synthwave Artist",
      "Blues Singer",
      "Country Artist",
      "Pop Sensation",
      "Metal Guitarist"
    ],
    required: true
  },
  isMusician: {
    type: Boolean,
    default: false
  },

  Musician: {
    type: String,
    enum: [
      "Solo",
      "Duo",
      "Trio",
      "Quartet"
    ],
    required:true
  },

   performanceUrl: [
    {
      venueName: { type: String, required: true },
      videoUrl: { type: String, required: true }
    }
  ],

  instrument: {
    type: String,
    required: true,
  },
  budget: {
    type: Number,
    required: true,
    default: null
  },
  email: {
    type: String,
    required: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      "Please fill a valid email address",
    ],
  },
  profileImageUrl: {
    type: String,
    required: true,
  },
  isShortlisted: {
    type: Boolean,
    default: false,
  },
  AssignedEvents: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
    },
  ],
  Rating: {
    type: Number,
    default: 0, // average rating
  },
  allRatings: {
    type: [
      {
        hostId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "HostAuthentication"
        },
        rating: {
          type: Number,
          min: 1,
          max: 5,
        },
      },
    ],
    default: [],
  },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
});

module.exports = mongoose.model("ArtistProfile", artistProfileSchema);
