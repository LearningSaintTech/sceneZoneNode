const Razorpay = require("razorpay");
const TicketSetting = require("../../../Host/models/Ticket/TicketSetting");
const TicketBooking = require("../../../Host/models/Ticket/TicketBooking");
const { apiResponse } = require("../../../utils/apiResponse");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// 1. Create Razorpay order and reserve tickets
exports.bookTicket = async (req, res) => {
  try {
    const { eventId, ticketType, quantity } = req.body;
    const userId = req.user.userId;
    console.log("Booking ticket for event user:", userId, );

    // Fetch ticket setting
    const setting = await TicketSetting.findOne({ eventId });
    if (!setting) return apiResponse(res, { success: false, message: "Ticket setting not found", statusCode: 404 });

    const ticket = setting.ticketTypes.find(t => t.type === ticketType);
    if (!ticket) return apiResponse(res, { success: false, message: "Ticket type not found", statusCode: 404 });

    // Overbooking validation
    if (ticket.quantity - ticket.sold < quantity) {
      console.log("Not enough tickets available for booking");
      console.log("Available:", ticket.quantity - ticket.sold, "Requested:", quantity);
      return apiResponse(res, { success: false, message: "Not enough tickets available", statusCode: 400 });
    }

    const amount = ticket.price * quantity * 100; // Razorpay expects paise

    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount,
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      payment_capture: 1
    });

    // Create booking with status pending
    const booking = await TicketBooking.create({
      userId,
      eventId,
      ticketType,
      quantity,
      amount: amount / 100,
      status: "pending"
    });

    return apiResponse(res, {
      success: true,
      message: "Order created. Complete payment to confirm booking.",
      data: {
        orderId: order.id,
        bookingId: booking._id,
        amount: amount / 100,
        currency: "INR"
      }
    });
  } catch (error) {
    return apiResponse(res, { success: false, message: error.message, statusCode: 500 });
  }
};

// 2. Confirm booking after payment
exports.confirmBooking = async (req, res) => {
  try {
    const { bookingId, razorpay_payment_id } = req.body;
    const booking = await TicketBooking.findById(bookingId);
    if (!booking) return apiResponse(res, { success: false, message: "Booking not found", statusCode: 404 });
    if (booking.status === "paid") return apiResponse(res, { success: false, message: "Already paid", statusCode: 400 });

    // Update booking status
    booking.status = "paid";
    booking.paymentId = razorpay_payment_id;
    await booking.save();

    // Atomically increment sold count
    const setting = await TicketSetting.findOneAndUpdate(
      { eventId: booking.eventId, "ticketTypes.type": booking.ticketType, "ticketTypes.quantity": { $gte: booking.quantity + (setting?.ticketTypes?.find(t => t.type === booking.ticketType)?.sold || 0) } },
      { $inc: { "ticketTypes.$.sold": booking.quantity } },
      { new: true }
    );

    if (!setting) {
      // Rollback booking if overbooked
      booking.status = "failed";
      await booking.save();
      return apiResponse(res, { success: false, message: "Tickets sold out during payment", statusCode: 400 });
    }

    return apiResponse(res, { success: true, message: "Booking confirmed", data: booking });
  } catch (error) {
    return apiResponse(res, { success: false, message: error.message, statusCode: 500 });
  }
};