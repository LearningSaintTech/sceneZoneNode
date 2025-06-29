const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    hostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HostAuthentication",
      required: true,
    },
    eventName: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
    },
    venue: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
    },
    eventDateTime: {
      type: [Date],
      required: true,
      validate: {
        validator: (dateTimes) =>
          dateTimes.every((dt) => !isNaN(new Date(dt).getTime())),
        message: "Invalid date-time provided in eventDateTime.",
      },
    },
    genre: [
      {
        type: String,
        required: true,
        trim: true,
        minlength: 1,
      },
    ],
    about: {
      type: String, 
      trim: true,
      minlength: [3, "About section must be at least 3 characters long."],
      maxlength: [1000, "About section cannot exceed 1000 characters."],
    },
    location: {
      type: String,
    },
    budget: {
      type: Number,
      required: true,
      min: [0, "Budget cannot be negative."],
    },
    isSoundSystem: {
      type: Boolean,
      default: false,
    },
    posterUrl: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    isCancelled: {
      type: Boolean,
      default: false,
    },
    Rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    eventRatings: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
          refPath: "eventRatings.userType",
        },
        userType: {
          type: String,
          enum: ["User", "Artist"],
          required: true,
        },
        rating: {
          type: Number,
          min: 1,
          max: 5,
          required: true,
        },
      },
    ],
    guestLinkUrl: {
      type: String,
      trim: true,
    },
    showStatus: {
      type: [
        {
          date: String,
          status: {
            type: String,
            enum: ["recent", "upcoming"],
          },
        },
      ],
      default: [],
    },
    Discount: {
      level1: {
        type: Number,
        required: true,
        default: 0,
        min: [0, "Discount cannot be negative."],
      },
      level2: {
        type: Number,
        required: true,
        default: 0,
        min: [0, "Discount cannot be negative."],
      },
      level3: {
        type: Number,
        required: true,
        default: 0,
        min: [0, "Discount cannot be negative."],
      },
    },
    assignedArtists: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ArtistAuthentication",
      },
    ],
    totalViewed: {
      type: Number,
      default: 0,
      min: [0, "Total viewed cannot be negative."],
    },
    totalRegistered: {
      type: Number,
      default: 0,
      min: [0, "Total registered cannot be negative."],
    },
    totalLikes: {
      type: Number,
      default: 0,
      min: [0, "Total likes cannot be negative."],
    },
    ticketSetting: {
      ticketType: {
        type: String,
        enum: ["paid", "free"],
        default: "free",
      },
      salesStart: {
        type: Date,
        validate: {
          validator: (date) => !date || !isNaN(new Date(date).getTime()),
          message: "Invalid sales start date.",
        },
      },
      salesEnd: {
        type: Date,
        validate: {
          validator: (date) => !date || !isNaN(new Date(date).getTime()),
          message: "Invalid sales end date.",
        },
      },
      gstType: {
        type: String,
        trim: true,
        enum: ["inclusive", "exclusive", "none"],
        default: "none",
        required: function () {
          return this.ticketType === "paid";
        },
      },
      price: {
        type: Number,
        required: function () {
          return this.ticketType === "paid";
        },
        min: [0, "Price cannot be negative."],
      },
      totalQuantity: {
        type: Number,
        min: [1, "Total quantity must be at least 1."],
      },
      ticketStatus: {
        type: String,
        enum: ["live", "comingsoon", "soldout"],
        default: "comingsoon",
      },
      isEnabled: {
        type: Boolean,
        default: true,
      },
    },
    eventGuestEnabled: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
eventSchema.index({ eventName: 1, eventDateTime: 1 });

module.exports = mongoose.model("Event", eventSchema);
