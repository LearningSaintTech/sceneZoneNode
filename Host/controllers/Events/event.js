const Event = require("../../models/Events/event");
const EventInvitation = require("../../models/InviteArtist/inviteArtist");
const EventApplication = require("../../../Artist/models/EventApplication/eventApplication");
const { uploadImage, deleteImage, deleteFromS3 } = require("../../../utils/s3Functions");
const { apiResponse } = require("../../../utils/apiResponse");
const mongoose = require("mongoose");


// CREATE Event
exports.createEvent = async (req, res) => {
  try {
    const hostId = req.user.hostId;
    const {
      eventName,
      venue,
      eventDateTime, // Updated to match schema
      genre,
      about,
      location,
      budget,
      isSoundSystem,
      artistId,
      guestLinkUrl,
      Discount,
      assignedArtists,
    } = req.body;

    // Basic validations for required fields
    if (!eventName || !venue || !eventDateTime || !genre || !budget) {
      return apiResponse(res, {
        success: false,
        message: "All required fields (eventName, venue, eventDateTime, genre, budget) must be provided.",
        statusCode: 400,
      });
    }

    // Parse and validate eventDateTime
    let parsedEventDateTime;
    try {
      parsedEventDateTime = typeof eventDateTime === "string" ? JSON.parse(eventDateTime) : eventDateTime;
      if (!Array.isArray(parsedEventDateTime) || parsedEventDateTime.length === 0) {
        return apiResponse(res, {
          success: false,
          message: "eventDateTime must be a non-empty array of valid dates.",
          statusCode: 400,
        });
      }
    } catch (error) {
      return apiResponse(res, {
        success: false,
        message: "Invalid eventDateTime format. It must be a valid JSON array.",
        statusCode: 400,
      });
    }

    // Validate eventDateTime elements
    const invalidDate = parsedEventDateTime.find((dt) => isNaN(new Date(dt).getTime()));
    if (invalidDate) {
      return apiResponse(res, {
        success: false,
        message: "Invalid date-time provided in eventDateTime.",
        statusCode: 400,
      });
    }

    // Generate showStatus based on eventDateTime
    const today = new Date();
    const showStatusArray = parsedEventDateTime.map((dt) => {
      const parsedDate = new Date(dt);
      const status = parsedDate < today ? "recent" : "upcoming";
      return { date: parsedDate.toISOString().split("T")[0], status };
    });

    // Parse and validate genre
    let parsedGenre;
    try {
      parsedGenre = typeof genre === "string" ? JSON.parse(genre) : genre;
      if (!Array.isArray(parsedGenre) || parsedGenre.length === 0) {
        return apiResponse(res, {
          success: false,
          message: "Genre must be a non-empty array of strings.",
          statusCode: 400,
        });
      }
      if (parsedGenre.some((g) => g.trim().length < 1)) {
        return apiResponse(res, {
          success: false,
          message: "Each genre must be at least 1 character long.",
          statusCode: 400,
        });
      }
    } catch (error) {
      return apiResponse(res, {
        success: false,
        message: "Invalid genre format. It must be a valid JSON array.",
        statusCode: 400,
      });
    }

    // Validate about (optional, but with constraints if provided)
    if (about && (about.trim().length < 3 || about.trim().length > 1000)) {
      return apiResponse(res, {
        success: false,
        message: "About section must be between 3 and 1000 characters.",
        statusCode: 400,
      });
    }

    // Validate budget
    if (isNaN(budget) || budget < 0) {
      return apiResponse(res, {
        success: false,
        message: "Budget must be a non-negative number.",
        statusCode: 400,
      });
    }

    // Validate location (optional, but trim if provided)
    const trimmedLocation = location ? location.trim() : undefined;

    // Check for duplicate event
    const existingEvent = await Event.findOne({
      eventName: eventName.trim(),
      eventDateTime: { $in: parsedEventDateTime },
    });
    if (existingEvent) {
      return apiResponse(res, {
        success: false,
        message: "An event with the same name and date-time already exists.",
        statusCode: 400,
      });
    }

    // Handle poster upload (optional)
    let posterImageUrl = null;
    if (req.file) {
      const fileName = `Host/EventPoster/host_${hostId}_${Date.now()}-${req.file.originalname}`;
      posterImageUrl = await uploadImage(req.file, fileName);
    }

    // Parse and validate Discount
    let parsedDiscount;
    const defaultDiscount = { level1: 0, level2: 0, level3: 0 };
    try {
      parsedDiscount = typeof Discount === "string" ? JSON.parse(Discount) : (Discount || {});
      parsedDiscount = {
        level1: parsedDiscount.level1 ?? defaultDiscount.level1,
        level2: parsedDiscount.level2 ?? defaultDiscount.level2,
        level3: parsedDiscount.level3 ?? defaultDiscount.level3,
      };
    } catch (error) {
      return apiResponse(res, {
        success: false,
        message: "Invalid Discount format. It must be a valid JSON object.",
        statusCode: 400,
      });
    }

    // Validate Discount values
    if (Object.values(parsedDiscount).some((val) => val < 0)) {
      return apiResponse(res, {
        success: false,
        message: "Discount values cannot be negative.",
        statusCode: 400,
      });
    }

    // Validate assignedArtists (optional)
    let parsedAssignedArtists = [];
    if (assignedArtists) {
      try {
        parsedAssignedArtists = typeof assignedArtists === "string" ? JSON.parse(assignedArtists) : assignedArtists;
        if (!Array.isArray(parsedAssignedArtists)) {
          return apiResponse(res, {
            success: false,
            message: "assignedArtists must be an array of valid ObjectIds.",
            statusCode: 400,
          });
        }
        // Validate each artistId
        for (const artistId of parsedAssignedArtists) {
          if (!mongoose.isValidObjectId(artistId)) {
            return apiResponse(res, {
              success: false,
              message: `Invalid artistId in assignedArtists: ${artistId}`,
              statusCode: 400,
            });
          }
        }
      } catch (error) {
        return apiResponse(res, {
          success: false,
          message: "Invalid assignedArtists format. It must be a valid JSON array.",
          statusCode: 400,
        });
      }
    }

    // Create new event
    const newEvent = new Event({
      hostId,
      eventName: eventName.trim(),
      venue: venue.trim(),
      eventDateTime: parsedEventDateTime, // Updated field name
      genre: parsedGenre.map((g) => g.trim()),
      about: about ? about.trim() : undefined,
      location: trimmedLocation,
      budget: parseFloat(budget),
      isSoundSystem: !!isSoundSystem,
      posterUrl: posterImageUrl,
      guestLinkUrl: guestLinkUrl?.trim() || null,
      Discount: parsedDiscount,
      showStatus: showStatusArray,
      assignedArtists: parsedAssignedArtists,
      status: "pending",
      isCompleted: false,
      isCancelled: false,
      Rating: 0,
      eventRatings: [],
    });

    await newEvent.save();

    // Create invitation if artistId is provided (backward compatibility)
    if (artistId) {
      if (!mongoose.isValidObjectId(artistId)) {
        return apiResponse(res, {
          success: false,
          message: "Invalid artist ID.",
          statusCode: 400,
        });
      }

      const existingInvite = await EventInvitation.findOne({
        artistId,
        eventId: newEvent._id,
      });

      if (!existingInvite) {
        const newInvite = new EventInvitation({
          hostId,
          artistId,
          eventId: newEvent._id,
          status: "pending",
        });
        await newInvite.save();
      }
    }

    return apiResponse(res, {
      success: true,
      message: "Event created successfully",
      data: newEvent,
      statusCode: 201,
    });
  } catch (error) {
    console.error("Create event error:", error);
    return apiResponse(res, {
      success: false,
      message: "Failed to create event",
      data: { error: error.message },
      statusCode: 500,
    });
  }
};

// GET Events by Host ID
exports.getAllEvents = async (req, res) => {
  try {
    const hostId = req.user.hostId;

    const events = await Event.find({ hostId }).populate("assignedArtists");

    return apiResponse(res, {
      success: true,
      message: "Events fetched successfully",
      data: events,
    });
  } catch (error) {
    console.error("Get all events by hostId error:", error);
    return apiResponse(res, {
      success: false,
      message: "Failed to fetch events",
      data: { error: error.message },
      statusCode: 500,
    });
  }
};


// GET Single Event by ID
exports.getEventById = async (req, res) => {
  try {
    const [eventId] = req.params;
    const user = req.user;

    // Validate event ID
    if (!mongoose.isValidObjectId(eventId)) {
      return apiResponse(res, {
        success: false,
        message: "Invalid event ID.",
        statusCode: 400,
      });
    }

    // Fetch event with populated fields
    const event = await Event.findById(eventId).populate("assignedArtists").populate("hostId");
    if (!event) {
      return apiResponse(res, {
        success: false,
        message: "Event not found",
        statusCode: 404,
      });
    }


    // Update showStatus for each event date
    if (Array.isArray(event.eventDateTime)) {
      const today = new Date();
      const showStatusArray = event.eventDateTime
        .map((dt) => {
          const parsedDate = new Date(dt);
          if (!isNaN(parsedDate)) {
            const status = parsedDate < today ? "recent" : "upcoming";
            return { date: parsedDate.toISOString().split("T")[0], status };
          }
          return null;
        })
        .filter(Boolean);

      // Save updated showStatus
      event.showStatus = showStatusArray;
      await event.save();
    }

    return apiResponse(res, {
      success: true,
      message: "Event fetched successfully",
      data: event,
    });
  } catch (error) {
    console.error("Get event by ID error:", error);
    return apiResponse(res, {
      success: false,
      message: "Failed to fetch event",
      data: { error: error.message },
      statusCode: 500,
    });
  }
};


exports.updateEvent = async (req, res) => {
  try {
    const hostId = req.user.hostId;
    const eventId = req.params.eventId;
    const {
      eventName,
      venue,
      eventDateTime,
      genre,
      about,
      location,
      budget,
      isSoundSystem,
      guestLinkUrl,
      Discount,
      assignedArtists,
      status,
      isCompleted,
      isCancelled,
    } = req.body;

    // Validate eventId
    if (!mongoose.isValidObjectId(eventId)) {
      return apiResponse(res, {
        success: false,
        message: "Invalid event ID.",
        statusCode: 400,
      });
    }

    // Check if event exists and belongs to host
    const event = await Event.findOne({ _id: eventId, hostId });
    if (!event) {
      return apiResponse(res, {
        success: false,
        message: "Event not found or you don't have permission to update it.",
        statusCode: 404,
      });
    }

    // Validate required fields if provided
    if (eventName && (!eventName.trim() || eventName.trim().length < 3)) {
      return apiResponse(res, {
        success: false,
        message: "Event name must be at least 3 characters long.",
        statusCode: 400,
      });
    }

    if (venue && !venue.trim()) {
      return apiResponse(res, {
        success: false,
        message: "Venue cannot be empty.",
        statusCode: 400,
      });
    }

    // Parse and validate eventDateTime if provided
    let parsedEventDateTime;
    if (eventDateTime) {
      try {
        parsedEventDateTime = typeof eventDateTime === "string" ? JSON.parse(eventDateTime) : eventDateTime;
        if (!Array.isArray(parsedEventDateTime) || parsedEventDateTime.length === 0) {
          return apiResponse(res, {
            success: false,
            message: "eventDateTime must be a non-empty array of valid dates.",
            statusCode: 400,
          });
        }
        const invalidDate = parsedEventDateTime.find((dt) => isNaN(new Date(dt).getTime()));
        if (invalidDate) {
          return apiResponse(res, {
            success: false,
            message: "Invalid date-time provided in eventDateTime.",
            statusCode: 400,
          });
        }
      } catch (error) {
        return apiResponse(res, {
          success: false,
          message: "Invalid eventDateTime format. It must be a valid JSON array.",
          statusCode: 400,
        });
      }
    }

    // Generate showStatus if eventDateTime is updated
    let showStatusArray;
    if (parsedEventDateTime) {
      const today = new Date();
      showStatusArray = parsedEventDateTime.map((dt) => {
        const parsedDate = new Date(dt);
        const status = parsedDate < today ? "recent" : "upcoming";
        return { date: parsedDate.toISOString().split("T")[0], status };
      });
    }

    // Parse and validate genre if provided
    let parsedGenre;
    if (genre) {
      try {
        parsedGenre = typeof genre === "string" ? JSON.parse(genre) : genre;
        if (!Array.isArray(parsedGenre) || parsedGenre.length === 0) {
          return apiResponse(res, {
            success: false,
            message: "Genre must be a non-empty array of strings.",
            statusCode: 400,
          });
        }
        if (parsedGenre.some((g) => g.trim().length < 1)) {
          return apiResponse(res, {
            success: false,
            message: "Each genre must be at least 1 character long.",
            statusCode: 400,
          });
        }
      } catch (error) {
        return apiResponse(res, {
          success: false,
          message: "Invalid genre format. It must be a valid JSON array.",
          statusCode: 400,
        });
      }
    }

    // Validate about if provided
    if (about && (about.trim().length < 3 || about.trim().length > 1000)) {
      return apiResponse(res, {
        success: false,
        message: "About section must be between 3 and 1000 characters.",
        statusCode: 400,
      });
    }

    // Validate budget if provided
    if (budget !== undefined && (isNaN(budget) || budget < 0)) {
      return apiResponse(res, {
        success: false,
        message: "Budget must be a non-negative number.",
        statusCode: 400,
      });
    }

    // Validate status if provided
    if (status && !["pending", "approved", "rejected"].includes(status)) {
      return apiResponse(res, {
        success: false,
        message: "Status must be one of: pending, approved, rejected.",
        statusCode: 400,
      });
    }

    // Handle poster upload if provided
    let posterImageUrl = event.posterUrl;
    if (req.file) {
      const fileName = `Host/EventPoster/host_${hostId}_${Date.now()}-${req.file.originalname}`;
      posterImageUrl = await uploadImage(req.file, fileName);
    }

    // Parse and validate Discount if provided
    let parsedDiscount = event.Discount;
    if (Discount) {
      try {
        parsedDiscount = typeof Discount === "string" ? JSON.parse(Discount) : (Discount || {});
        parsedDiscount = {
          level1: parsedDiscount.level1 ?? event.Discount.level1,
          level2: parsedDiscount.level2 ?? event.Discount.level2,
          level3: parsedDiscount.level3 ?? event.Discount.level3,
        };
        if (Object.values(parsedDiscount).some((val) => val < 0)) {
          return apiResponse(res, {
            success: false,
            message: "Discount values cannot be negative.",
            statusCode: 400,
          });
        }
      } catch (error) {
        return apiResponse(res, {
          success: false,
          message: "Invalid Discount format. It must be a valid JSON object.",
          statusCode: 400,
        });
      }
    }

    // Validate assignedArtists if provided
    let parsedAssignedArtists = event.assignedArtists;
    if (assignedArtists) {
      try {
        parsedAssignedArtists = typeof assignedArtists === "string" ? JSON.parse(assignedArtists) : assignedArtists;
        if (!Array.isArray(parsedAssignedArtists)) {
          return apiResponse(res, {
            success: false,
            message: "assignedArtists must be an array of valid ObjectIds.",
            statusCode: 400,
          });
        }
        for (const artistId of parsedAssignedArtists) {
          if (!mongoose.isValidObjectId(artistId)) {
            return apiResponse(res, {
              success: false,
              message: `Invalid artistId in assignedArtists: ${artistId}`,
              statusCode: 400,
            });
          }
        }
      } catch (error) {
        return apiResponse(res, {
          success: false,
          message: "Invalid assignedArtists format. It must be a valid JSON array.",
          statusCode: 400,
        });
      }
    }

    // Check for duplicate event name and date if updated
    if (eventName && parsedEventDateTime) {
      const existingEvent = await Event.findOne({
        _id: { $ne: eventId },
        eventName: eventName.trim(),
        eventDateTime: { $in: parsedEventDateTime },
      });
      if (existingEvent) {
        return apiResponse(res, {
          success: false,
          message: "An event with the same name and date-time already exists.",
          statusCode: 400,
        });
      }
    }

    // Update event fields
    const updatedFields = {
      ...(eventName && { eventName: eventName.trim() }),
      ...(venue && { venue: venue.trim() }),
      ...(parsedEventDateTime && { eventDateTime: parsedEventDateTime }),
      ...(showStatusArray && { showStatus: showStatusArray }),
      ...(parsedGenre && { genre: parsedGenre.map((g) => g.trim()) }),
      ...(about && { about: about.trim() }),
      ...(location && { location: location.trim() }),
      ...(budget !== undefined && { budget: parseFloat(budget) }),
      ...(isSoundSystem !== undefined && { isSoundSystem: !!isSoundSystem }),
      ...(posterImageUrl && { posterUrl: posterImageUrl }),
      ...(guestLinkUrl && { guestLinkUrl: guestLinkUrl.trim() || null }),
      ...(parsedDiscount && { Discount: parsedDiscount }),
      ...(parsedAssignedArtists && { assignedArtists: parsedAssignedArtists }),
      ...(status && { status }),
      ...(isCompleted !== undefined && { isCompleted }),
      ...(isCancelled !== undefined && { isCancelled }),
    };

    // Update event
    const updatedEvent = await Event.findByIdAndUpdate(
      eventId,
      { $set: updatedFields },
      { new: true, runValidators: true }
    );

    return apiResponse(res, {
      success: true,
      message: "Event updated successfully",
      data: updatedEvent,
      statusCode: 200,
    });
  } catch (error) {
    console.error("Update event error:", error);
    return apiResponse(res, {
      success: false,
      message: "Failed to update event",
      data: { error: error.message },
      statusCode: 500,
    });
  }
};


// DELETE Event
exports.deleteEvent = async (req, res) => {
  try {
    const eventId = req.params.id;
    const hostId = req.user.hostId;

    if (!mongoose.isValidObjectId(eventId)) {
      return apiResponse(res, {
        success: false,
        message: "Invalid event ID.",
        statusCode: 400,
      });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return apiResponse(res, {
        success: false,
        message: "Event not found",
        statusCode: 404,
      });
    }

    // Authorization check
    if (event.hostId.toString() !== hostId.toString() && req.user.role !== "admin") {
      return apiResponse(res, {
        success: false,
        message: "Unauthorized to delete this event.",
        statusCode: 403,
      });
    }

    // Delete poster if it exists
    if (event.posterUrl) {
      try {
        await deleteFromS3(event.posterUrl);
      } catch (s3Error) {
        console.error(`Failed to delete S3 poster: ${event.posterUrl}`, s3Error);
      }
    }

    // Delete associated invitations
    await EventInvitation.deleteMany({ eventId });

    // Delete event
    await Event.findByIdAndDelete(eventId);

    return apiResponse(res, {
      success: true,
      message: "Event deleted successfully",
    });
  } catch (error) {
    console.error("Delete event error:", error);
    return apiResponse(res, {
      success: false,
      message: "Failed to delete event",
      data: { error: error.message },
      statusCode: 500,
    });
  }
};


exports.updateEventDiscount = async (req, res) => {
  try {
    const hostId = req.user.hostId;
    const eventId = req.params.eventId;
    const { Discount } = req.body;

    // Validate eventId
    if (!mongoose.isValidObjectId(eventId)) {
      return apiResponse(res, {
        success: false,
        message: "Invalid event ID.",
        statusCode: 400,
      });
    }

    // Check if event exists and belongs to host
    const event = await Event.findOne({ _id: eventId, hostId });
    if (!event) {
      return apiResponse(res, {
        success: false,
        message: "Event not found or you don't have permission to update it.",
        statusCode: 404,
      });
    }

    // Validate Discount if provided
    let parsedDiscount = event.Discount;
    if (!Discount) {
      return apiResponse(res, {
        success: false,
        message: "Discount object must be provided.",
        statusCode: 400,
      });
    }

    try {
      parsedDiscount = typeof Discount === "string" ? JSON.parse(Discount) : Discount;
      parsedDiscount = {
        level1: parsedDiscount.level1 ?? event.Discount.level1,
        level2: parsedDiscount.level2 ?? event.Discount.level2,
        level3: parsedDiscount.level3 ?? event.Discount.level3,
      };
      if (Object.values(parsedDiscount).some((val) => val === undefined || val === null)) {
        return apiResponse(res, {
          success: false,
          message: "Discount object must include level1, level2, and level3 values.",
          statusCode: 400,
        });
      }
      if (Object.values(parsedDiscount).some((val) => isNaN(val) || val < 0)) {
        return apiResponse(res, {
          success: false,
          message: "Discount values must be non-negative numbers.",
          statusCode: 400,
        });
      }
    } catch (error) {
      return apiResponse(res, {
        success: false,
        message: "Invalid Discount format. It must be a valid JSON object with level1, level2, and level3.",
        statusCode: 400,
      });
    }

    // Update event discount
    const updatedEvent = await Event.findByIdAndUpdate(
      eventId,
      { $set: { Discount: parsedDiscount } },
      { new: true, runValidators: true }
    );

    return apiResponse(res, {
      success: true,
      message: "Event discount updated successfully",
      data: updatedEvent,
      statusCode: 200,
    });
  } catch (error) {
    console.error("Update event discount error:", error);
    return apiResponse(res, {
      success: false,
      message: "Failed to update event discount",
      data: { error: error.message },
      statusCode: 500,
    });
  }
};


exports.toggleEventGuestList = async (req, res) => {
  try {
    const hostId = req.user.hostId;
    const eventId = req.params.eventId;
    const { eventGuestEnabled } = req.body;

    // Validate eventId
    if (!mongoose.isValidObjectId(eventId)) {
      return apiResponse(res, {
        success: false,
        message: "Invalid event ID.",
        statusCode: 400,
      });
    }

    // Check if event exists and belongs to host
    const event = await Event.findOne({ _id: eventId, hostId });
    if (!event) {
      return apiResponse(res, {
        success: false,
        message: "Event not found or you don't have permission to update it.",
        statusCode: 404,
      });
    }

    // Validate eventGuestEnabled
    if (typeof eventGuestEnabled !== "boolean") {
      return apiResponse(res, {
        success: false,
        message: "eventGuestEnabled must be a boolean value (true or false).",
        statusCode: 400,
      });
    }

    // Update eventGuestEnabled field
    const updatedEvent = await Event.findByIdAndUpdate(
      eventId,
      { $set: { eventGuestEnabled } },
      { new: true, runValidators: true }
    );

    return apiResponse(res, {
      success: true,
      message: `Guest list ${eventGuestEnabled ? "enabled" : "disabled"} successfully`,
      data: updatedEvent,
      statusCode: 200,
    });
  } catch (error) {
    console.error("Toggle event guest list error:", error);
    return apiResponse(res, {
      success: false,
      message: "Failed to toggle event guest list",
      data: { error: error.message },
      statusCode: 500,
    });
  }
};


exports.getLatestEvents = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;

    // Fetch events sorted by createdAt in descending order (latest first)
    const events = await Event.find({ 
      isCancelled: false,
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      // .populate('hostId', 'name email')
      // .populate('assignedArtists', 'name')
      // .select('eventName venue eventDateTime genre posterUrl ticketSetting showStatus');

    const totalEvents = await Event.countDocuments({ 
      status: 'approved',
      isCancelled: false,
      'showStatus.status': 'upcoming' 
    });

    res.status(200).json({
      success: true,
      data: events,
      pagination: {
        total: totalEvents,
        page,
        limit,
        totalPages: Math.ceil(totalEvents / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching latest events:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching events',
      error: error.message
    });
  }
};



exports.updateEventApplicationStatus = async (req, res) => {
  try {
    console.log("Starting updateEventApplicationStatus: Received request", {
      params: req.params,
      body: req.body,
      user: req.user,
    });

    const hostId = req.user.hostId;
    const { applicationId } = req.params;
    const { status } = req.body;

    // Validate applicationId
    console.log("Validating applicationId:", { applicationId });
    if (!mongoose.isValidObjectId(applicationId)) {
      console.warn("Invalid applicationId provided:", { applicationId });
      return apiResponse(res, {
        success: false,
        message: "Invalid application ID.",
        statusCode: 400,
      });
    }

    // Validate status
    console.log("Validating status:", { status });
    if (!["pending", "accepted", "rejected"].includes(status)) {
      console.warn("Invalid status provided:", { status });
      return apiResponse(res, {
        success: false,
        message: "Status must be one of: pending, accepted, rejected.",
        statusCode: 400,
      });
    }

    // Find the application
    console.log("Fetching EventApplication:", { applicationId });
    const application = await EventApplication.findById(applicationId);
    if (!application) {
      console.warn("Application not found:", { applicationId });
      return apiResponse(res, {
        success: false,
        message: "Application not found.",
        statusCode: 404,
      });
    }
    console.log("Application found:", {
      applicationId,
      eventId: application.eventId,
      artistId: application.artistId,
      currentStatus: application.status,
    });

    // Find the event to check if the host owns it
    console.log("Fetching Event:", { eventId: application.eventId });
    const event = await Event.findById(application.eventId);
    if (!event || event.hostId.toString() !== hostId.toString()) {
      console.warn("Event not found or unauthorized:", {
        eventId: application.eventId,
        hostId,
        eventHostId: event?.hostId,
      });
      return apiResponse(res, {
        success: false,
        message: "Event not found or you don't have permission to update this application.",
        statusCode: 403,
      });
    }
    console.log("Event ownership verified:", { eventId: event._id, eventName: event.eventName });

    // Update application status
    console.log("Updating application status:", { applicationId, newStatus: status });
    application.status = status;
    await application.save();
    console.log("Application status updated:", {
      applicationId,
      newStatus: application.status,
    });

    // Update Event's assignedArtists based on status
    if (status === "rejected") {
      console.log("Removing artist from assignedArtists:", {
        eventId: application.eventId,
        artistId: application.artistId,
      });
      await Event.findByIdAndUpdate(
        application.eventId,
        { $pull: { assignedArtists: application.artistId } },
        { new: true }
      );
      console.log("Artist removed from assignedArtists");
    } else if (status === "accepted") {
      console.log("Adding artist to assignedArtists:", {
        eventId: application.eventId,
        artistId: application.artistId,
      });
      await Event.findByIdAndUpdate(
        application.eventId,
        { $addToSet: { assignedArtists: application.artistId } },
        { new: true }
      );
      console.log("Artist added to assignedArtists");
    }

    // Populate eventId and artistId for response
    console.log("Populating application details:", { applicationId });
    const populatedApplication = await EventApplication.findById(applicationId)
      .populate("eventId")
    console.log("Populated application:", {
      applicationId,
      eventId: populatedApplication.eventId?._id,
      artistId: populatedApplication.artistId?._id,
      status: populatedApplication.status,
    });

    return apiResponse(res, {
      success: true,
      message: `Application status updated to ${status}.`,
      data: populatedApplication,
      statusCode: 200,
    });
  } catch (error) {
    console.error("UpdateEventApplicationStatus error:", {
      error: error.message,
      stack: error.stack,
      applicationId: req.params.applicationId,
      hostId: req.user.hostId,
      status: req.body.status,
    });
    return apiResponse(res, {
      success: false,
      message: "Failed to update application status",
      data: { error: error.message },
      statusCode: 500,
    });
  }
};


exports.getArtistStatusOfEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    console.log("1111111");

    // Validate eventId
    if (!eventId || !mongoose.Types.ObjectId.isValid(eventId)) {
      return apiResponse(res, {
        success: false,
        message: "Invalid eventId.",
        statusCode: 400,
      });
    }

    const eventObjectId = new mongoose.Types.ObjectId(eventId);

    // Fetch all applications for the event
    const applications = await EventApplication.find({ eventId: eventObjectId })
      .populate("artistId")
      .sort({ appliedAt: -1 });

      console.log(applications);
    if (!applications.length) {
      return apiResponse(res, {
        success: true,
        message: "No applications found for this event.",
        data: [],
        statusCode: 200,
      });
    }

    return apiResponse(res, {
      success: true,
      message: "Applications fetched successfully.",
      data: applications,
      statusCode: 200,
    });
  } catch (err) {
    return apiResponse(res, {
      success: false,
      message: "Server error.",
      data: { error: err.message },
      statusCode: 500,
    });
  }
};   

exports.getEventGuestListByDiscount = async (req, res) => {
  try {
    const hostId = req.user.hostId;
    const { eventId } = req.params;
    const { discountLevel } = req.query;

    // Validate eventId
    if (!mongoose.isValidObjectId(eventId)) {
      return apiResponse(res, {
        success: false,
        message: "Invalid event ID.",
        statusCode: 400,
      });
    }

    // Check if event exists and belongs to host
    const event = await Event.findOne({ _id: eventId, hostId }).populate("guestList.userId");
    if (!event) {
      return apiResponse(res, {
        success: false,
        message: "Event not found or you don't have permission to view its guest list.",
        statusCode: 404,
      });
    }

    // Validate discountLevel if provided
    let filteredGuestList = event.guestList;
    if (discountLevel) {
      if (!["level1", "level2", "level3"].includes(discountLevel)) {
        return apiResponse(res, {
          success: false,
          message: "Invalid discount level. Must be one of: level1, level2, level3.",
          statusCode: 400,
        });
      }
      filteredGuestList = event.guestList.filter((guest) => guest.discountLevel === discountLevel);
    }

    // Check if guest list is enabled
    if (!event.eventGuestEnabled) {
      return apiResponse(res, {
        success: false,
        message: "Guest list is not enabled for this event.",
        statusCode: 400,
      });
    }

    // Prepare response data
    const guestListData = filteredGuestList.map((guest) => ({
      userId: guest.userId._id,
      userName: guest.userId.name || "Unknown",
      userEmail: guest.userId.email || "Unknown",
      discountLevel: guest.discountLevel || "None",
    }));

    return apiResponse(res, {
      success: true,
      message: `Guest list for event fetched successfully${discountLevel ? ` for discount level: ${discountLevel}` : ""}.`,
      data: guestListData,
      statusCode: 200,
    });
  } catch (error) {
    console.error("Get event guest list error:", error);
    return apiResponse(res, {
      success: false,
      message: "Failed to fetch event guest list",
      data: { error: error.message },
      statusCode: 500,
    });
  }
};