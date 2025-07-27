const mongoose = require("mongoose");

const ticketTypeSchema = new mongoose.Schema({
  type: { type: String, required: true }, // e.g. "VIP", "General"
  ticketStatus: { type: String, enum: ["live", "coomingsoon", "soldout"], default: "coomingsoon" },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true },
  sold: { type: Number, default: 0 }
});

const ticketSettingSchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Event",
    required: true,
    unique: true
  },
  ticketTypes: [ticketTypeSchema]
});

module.exports = mongoose.model("TicketSetting", ticketSettingSchema);