const Ticket = require("../../models/Tickets-Booking/bookTicket");
const Event = require("../../../Host/models/Events/event");
const GuestList = require("../../models/GuestList/guestList");
const { apiResponse } = require("../../../utils/apiResponse");

exports.buyTicket = async (req, res) => {
  const userId = req.user.userId;
  const { eventId, eventDate, numberOfTickets } = req.body;

  console.log("Ticket purchase request received");
  console.log("User ID:", userId);
  console.log("Event ID:", eventId);
  console.log("Selected Date:", eventDate);
  console.log("Number of Tickets:", numberOfTickets);

  try {
    if (!eventId || !eventDate || !numberOfTickets) {
      console.warn("Missing fields in request body");
      return apiResponse(res, {
        success: false,
        message: "Missing required fields",
        statusCode: 400,
      });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      console.warn("Event not found for ID:", eventId);
      return apiResponse(res, {
        success: false,
        message: "Event not found",
        statusCode: 404,
      });
    }

    console.log("Event found:", event.eventName);

    const isValidDate = event.eventDate.some(
      (date) => new Date(date).toISOString().split("T")[0] === eventDate
    );
    if (!isValidDate) {
      console.warn("Invalid event date selected:", eventDate);
      return apiResponse(res, {
        success: false,
        message: "Invalid event date selected",
        statusCode: 400,
      });
    }

    const guest = await GuestList.findOne({
      userId,
      eventId,
      status: "accepted",
    });

    let discountPercent = 0;
    if (guest && guest.assignedLevel) {
      const level = guest.assignedLevel.toLowerCase();
      discountPercent = event.Discount?.[level] || 0;
      console.log(`Discount Level: ${guest.assignedLevel}, Percent: ${discountPercent}%`);
    } else {
      console.log("No discount applicable (user not in guest list or not accepted)");
    }

    const ticketPricePerUnit = event.budget;
    const totalAmount = ticketPricePerUnit * numberOfTickets;
    const finalAmount = totalAmount - (totalAmount * discountPercent) / 100;

    console.log("Ticket Price Per Unit:", ticketPricePerUnit);
    console.log("Total Amount before discount:", totalAmount);
    console.log("Final Amount after discount:", finalAmount);

    const [time, modifier] = event.eventTime.split(" ");
    let [hours, minutes] = time.split(":").map(Number);
    if (modifier.toLowerCase() === "pm" && hours !== 12) hours += 12;
    if (modifier.toLowerCase() === "am" && hours === 12) hours = 0;

    const eventDateObj = new Date(eventDate);
    eventDateObj.setHours(hours, minutes, 0);
    const expiresAt = new Date(eventDateObj.getTime() + 30 * 60 * 1000);

    console.log("Ticket will expire at:", expiresAt.toISOString());

    const ticket = new Ticket({
      userId,
      eventId,
      eventDate,
      eventTime: event.eventTime,
      numberOfTickets,
      ticketAmount: finalAmount,
      paymentStatus:"pending",
      expiresAt,
    });

    await ticket.save();

    console.log("Ticket saved successfully with ID:", ticket._id);

    return apiResponse(res, {
      success: true,
      message: "Ticket purchased successfully",
      data: {
        ticket,
        originalAmount: totalAmount,
        discountPercent,
        finalAmount,
        expiresAt,
      },
      statusCode: 201,
    });

  } catch (err) {
    console.error("Ticket purchase error:", err);
    return apiResponse(res, {
      success: false,
      message: "Internal Server Error",
      statusCode: 500,
    });
  }
};
