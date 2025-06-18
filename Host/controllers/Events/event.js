const Event = require("../../models/Events/event");
const EventInvitation = require("../../models/InviteArtist/inviteArtist");
const { uploadImage, deleteImage } = require("../../../utils/s3Functions");
const HostProfile = require("../../models/Profile/profile");
const mongoose = require("mongoose");
const { apiResponse } = require("../../../utils/apiResponse");

// CREATE Event
exports.createEvent = async (req, res) => {
  try {
    const hostId = req.user.hostId;
    const {
      eventName,
      venue,
      eventDate,
      eventTime,
      genre,
      budget,
      isSoundSystem,
      artistId,
      guestLinkUrl,
      Discount,
    } = req.body;

    // Basic validations
    if (!eventName || !venue || !eventDate || !eventTime || !genre || !budget) {
      return apiResponse(res, {
        success: false,
        message: "All required fields must be provided.",
        statusCode: 400,
      });
    }

    let parsedEventDate;
    try {
      parsedEventDate = typeof eventDate === 'string' ? JSON.parse(eventDate) : eventDate;
      if (!Array.isArray(parsedEventDate) || parsedEventDate.length === 0) {
        return apiResponse(res, {
          success: false,
          message: "Event dates must be a non-empty array of valid dates.",
          statusCode: 400,
        });
      }
    } catch (error) {
      return apiResponse(res, {
        success: false,
        message: "Invalid eventDate format. It must be a valid JSON array.",
        statusCode: 400,
      });
    }

    let parsedGenre;
    try {
      parsedGenre = typeof genre === 'string' ? JSON.parse(genre) : genre;
      if (!Array.isArray(parsedGenre) || parsedGenre.length === 0) {
        return apiResponse(res, {
          success: false,
          message: "Genre must be a non-empty array of strings.",
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

    // Validate eventDate elements
    const invalidDate = parsedEventDate.find((date) => isNaN(new Date(date).getTime()));
    if (invalidDate) {
      return apiResponse(res, {
        success: false,
        message: "Invalid date provided in eventDate.",
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

    // Check for duplicate event
    const existingEvent = await Event.findOne({
      eventName: eventName.trim(),
      eventDate: { $in: parsedEventDate },
    });

    if (existingEvent) {
      return apiResponse(res, {
        success: false,
        message: "An event with the same name and date already exists.",
        statusCode: 400,
      });
    }

    // Handle poster image upload
    if (!req.file) {
      return apiResponse(res, {
        success: false,
        message: "Poster image is required.",
        statusCode: 400,
      });
    }

    const fileName = `Host/EventPoster/host_${hostId}_${Date.now()}-${req.file.originalname}`;
    const posterImageUrl = await uploadImage(req.file, fileName);

    // Parse Discount if it's a string
    let parsedDiscount;
    const defaultDiscount = { level1: 0, level2: 0, level3: 0 };
    try {
      parsedDiscount = typeof Discount === 'string' ? JSON.parse(Discount) : (Discount || {});
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

    const newEvent = new Event({
      hostId,
      eventName: eventName.trim(),
      venue: venue.trim(),
      eventDate: parsedEventDate,
      eventTime: eventTime.trim(),
      genre: parsedGenre.map((g) => g.trim()),
      budget: parseFloat(budget),
      isSoundSystem: !!isSoundSystem,
      posterUrl: posterImageUrl,
      guestLinkUrl: guestLinkUrl?.trim() || null,
      Discount: parsedDiscount,
    });

    await newEvent.save();

    // Create invitation if artistId is provided
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

// GET All Events
exports.getAllEvents = async (req, res) => {
  try {
    const user = req.user;
    let events;

    if (user.role === "admin") {
      events = await Event.find().populate("hostId assignedArtists");
    } else if (user.hostId) {
      events = await Event.find({ hostId: user.hostId }).populate("assignedArtists");
    } else {
      events = await Event.find({ status: "approved" }).populate("assignedArtists");
    }

    return apiResponse(res, {
      success: true,
      message: "Events fetched successfully",
      data: events,
    });
  } catch (error) {
    console.error("Get all events error:", error);
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
    const eventId = req.params.id;
    const user = req.user;

    if (!mongoose.isValidObjectId(eventId)) {
      return apiResponse(res, {
        success: false,
        message: "Invalid event ID.",
        statusCode: 400,
      });
    }

    const event = await Event.findById(eventId).populate("hostId assignedArtists");

    if (!event) {
      return apiResponse(res, {
        success: false,
        message: "Event not found",
        statusCode: 404,
      });
    }

    // Fetch the host's profile using hostId from the event
    const hostProfile = await HostProfile.findOne({ hostId: event.hostId }).select("profileImageUrl");
    console.log("hostttId",hostProfile)

    // Attach profileImageUrl to the response
    const eventObj = event.toObject();
    eventObj.hostProfileImageUrl = hostProfile ? hostProfile.profileImageUrl : null;

    const isHost = user.hostId && user.hostId.toString() === event.hostId.toString();
    const isAdmin = user.role === "admin";
    const isApproved = event.status === "approved";

    if (!isAdmin && !isHost && !isApproved) {
      return apiResponse(res, {
        success: false,
        message: "Access denied. Event not approved yet.",
        statusCode: 403,
      });
    }

    // --- Update showStatus for each event date ---
    if (Array.isArray(event.eventDate)) {
      const today = new Date();
      const showStatusArray = [];

      for (const date of event.eventDate) {
        const parsedDate = new Date(date);

        if (!isNaN(parsedDate)) {
          const status = parsedDate < today ? "recent" : "upcoming";
          const formattedDate = parsedDate.toISOString().split("T")[0];

          showStatusArray.push({ date: formattedDate, status });
        }
      }

      // Save updated showStatus
      event.showStatus = showStatusArray;
      await event.save();
    }

    return apiResponse(res, {
      success: true,
      message: "Event fetched successfully",
      data: eventObj,
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



// UPDATE Event
exports.updateEvent = async (req, res) => {
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

    const {
      eventName,
      venue,
      budget,
      eventTime,
      isSoundSystem,
      addDates,
      removeDates,
      addGenre,
      removeGenre,
      guestLinkUrl,
    } = req.body;

    const event = await Event.findById(eventId);
    if (!event) {
      return apiResponse(res, {
        success: false,
        message: "Event not found",
        statusCode: 404,
      });
    }

    // Authorization check
    if (!req.user.role === "admin" && event.hostId.toString() !== hostId.toString()) {
      return apiResponse(res, {
        success: false,
        message: "Unauthorized to update this event.",
        statusCode: 403,
      });
    }

    // Handle poster update
    if (req.file) {
      if (event.posterUrl) {
        await deleteImage(event.posterUrl);
      }
      const fileName = `Host/EventPoster/event_${hostId}_${Date.now()}-${req.file.originalname}`;
      event.posterUrl = await uploadImage(req.file, fileName);
    }

    // Update fields
    if (eventName) event.eventName = eventName.trim();
    if (venue) {
      if (event.status === "approved") {
        return apiResponse(res, {
          success: false,
          message: "Cannot update venue after event is approved.",
          statusCode: 403,
        });
      }
      event.venue = venue.trim();
    }
    if (eventTime) event.eventTime = eventTime.trim();
    if (budget && !isNaN(budget) && budget >= 0) event.budget = parseFloat(budget);
    if (isSoundSystem !== undefined) event.isSoundSystem = !!isSoundSystem;

    // Update eventDate
    if (addDates) {
      const datesToAdd = Array.isArray(addDates) ? addDates : [addDates];
      const validDates = datesToAdd.filter((date) => !isNaN(new Date(date).getTime()));
      if (validDates.length !== datesToAdd.length) {
        return apiResponse(res, {
          success: false,
          message: "Invalid date provided in addDates.",
          statusCode: 400,
        });
      }
      event.eventDate = [...new Set([...event.eventDate, ...validDates])];
    }

    if (removeDates) {
      const datesToRemove = Array.isArray(removeDates) ? removeDates : [removeDates];
      event.eventDate = event.eventDate.filter((date) => {
        const eventDateOnly = new Date(date).toISOString().split("T")[0];
        return !datesToRemove.includes(eventDateOnly);
      });
      if (event.eventDate.length === 0) {
        return apiResponse(res, {
          success: false,
          message: "Event must have at least one date.",
          statusCode: 400,
        });
      }
    }

    // Update genre
    if (addGenre) {
      const genresToAdd = Array.isArray(addGenre) ? addGenre : [addGenre];
      event.genre = [...new Set([...event.genre, ...genresToAdd.map((g) => g.trim())])];
    }

    if (removeGenre) {
      const genresToRemove = Array.isArray(removeGenre) ? removeGenre : [removeGenre];
      event.genre = event.genre.filter((g) => !genresToRemove.includes(g.trim()));
      if (event.genre.length === 0) {
        return apiResponse(res, {
          success: false,
          message: "Event must have at least one genre.",
          statusCode: 400,
        });
      }
    }

    if (guestLinkUrl !== undefined) {
      event.guestLinkUrl = guestLinkUrl?.trim() || null;
    }

    await event.save();

    return apiResponse(res, {
      success: true,
      message: "Event updated successfully",
      data: event,
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
    if (!req.user.role === "admin" && event.hostId.toString() !== hostId.toString()) {
      return apiResponse(res, {
        success: false,
        message: "Unauthorized to delete this event.",
        statusCode: 403,
      });
    }

    // Delete poster
    if (event.posterUrl) {
      await deleteImage(event.posterUrl);
    }

    // Delete associated invitations
    await EventInvitation.deleteMany({ eventId });

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