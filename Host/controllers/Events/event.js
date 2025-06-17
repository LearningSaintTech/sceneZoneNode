const Event = require("../../models/Events/event");
const EventInvitation = require("../../models/InviteArtist/inviteArtist");
const { uploadImage, deleteImage } = require("../../../utils/s3Functions");
const { apiResponse } = require("../../../utils/apiResponse");

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
    } = req.body;

    console.log("Received event data:", req.body);

    // Basic validations
    if (!eventName || !venue || !eventDate || !eventTime || !genre || !budget) {
      return apiResponse(res, {
        success: false,
        message: "All required fields must be provided.",
        statusCode: 400,
      });
    }

    if (!Array.isArray(eventDate) || eventDate.length === 0) {
      return apiResponse(res, {
        success: false,
        message: "Event dates must be a non-empty array.",
        statusCode: 400,
      });
    }

    if (!Array.isArray(genre) || genre.length === 0) {
      return apiResponse(res, {
        success: false,
        message: "Genre must be a non-empty array.",
        statusCode: 400,
      });
    }

    // Check if an event with the same name and date already exists
    const existingEvent = await Event.findOne({
      eventName,
      eventDate: { $in: eventDate }, // Check if any of the provided dates match
    });

    if (existingEvent) {
      return apiResponse(res, {
        success: false,
        message: "An event with the same name or date already exists.",
        statusCode: 400,
      });
    }

    // Handle poster image upload
    let posterImageUrl = null;
    if (req.file) {
      console.log("Uploading poster image:", req.file.originalname);
      const fileName = `Host/EventPoster/host_${hostId}_${Date.now()}-${
        req.file.originalname
      }`;
      posterImageUrl = await uploadImage(req.file, fileName);
      console.log("Poster image uploaded, URL:", posterImageUrl);
    } else {
      console.log("No poster image provided.");
      return apiResponse(res, {
        success: false,
        message: "No poster image provided",
        statusCode: 400,
      });
    }

    const newEvent = new Event({
      hostId,
      eventName,
      venue,
      eventDate,
      eventTime,
      genre,
      budget,
      isSoundSystem: isSoundSystem,
      posterUrl: posterImageUrl,
    });

    await newEvent.save();

    //  OPTIONAL: If artistId is provided, create an invitation
    if (artistId) {
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
    return apiResponse(res, {
      success: false,
      message: "Something went wrong",
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
      // Admin sees all events
      events = await Event.find();
    } else if (user.hostId) {
      // Host sees their own events
      events = await Event.find({ hostId: user.hostId });
    } else {
      // Artists & Users see only approved events
      events = await Event.find({ status: "approved" });
    }

    return apiResponse(res, {
      success: true,
      message: "Events fetched successfully",
      data: events,
    });
  } catch (error) {
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

    const event = await Event.findById(eventId);
    if (!event) {
      return apiResponse(res, {
        success: false,
        message: "Event not found",
        statusCode: 404,
      });
    }

    const isHost =
      user.hostId && user.hostId.toString() === event.hostId.toString();
    const isAdmin = user.role === "admin";
    const isApproved = event.status === "approved";

    if (!isAdmin && !isHost && !isApproved) {
      return apiResponse(res, {
        success: false,
        message: "Access denied. Event not approved yet.",
        statusCode: 403,
      });
    }

    return apiResponse(res, {
      success: true,
      message: "Event fetched successfully",
      data: event,
    });
  } catch (error) {
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
    } = req.body;

    const event = await Event.findById(eventId);

    if (!event) {
      return apiResponse(res, {
        success: false,
        message: "Event not found",
        statusCode: 404,
      });
    }

    // If a new poster is uploaded
    if (req.file) {
      if (event.posterUrl) {
        await deleteImage(event.posterUrl); // Delete old poster
      }
      const fileName = `Host/EventPoster/event_${hostId}_${Date.now()}-${
        req.file.originalname
      }`;
      event.posterUrl = await uploadImage(req.file, fileName);
    }

    // Update basic fields if provided
    event.eventName = eventName || event.eventName;

    // Prevent venue update if status is "approve"
    if (venue) {
      if (event.status === "approved") {
        return apiResponse(res, {
          success: false,
          message: "Cannot update venue after event is approved.",
          statusCode: 403,
        });
      } else {
        event.venue = venue;
      }
    }
    event.eventTime = eventTime || event.eventTime;
    event.isSoundSystem = isSoundSystem ?? event.isSoundSystem;
    event.budget = budget || event.budget;

    // Update eventDate array
    if (addDates) {
      const datesToAdd = Array.isArray(addDates) ? addDates : [addDates];
      event.eventDate = [...new Set([...event.eventDate, ...datesToAdd])]; // Avoid duplicates
    }

    if (removeDates) {
      const datesToRemove = Array.isArray(removeDates)
        ? removeDates
        : [removeDates];
      event.eventDate = event.eventDate.filter((date) => {
        const eventDateOnly = new Date(date).toISOString().split("T")[0];
        return !datesToRemove.includes(eventDateOnly);
      });
    }
    // Update genre array
    if (addGenre) {
      const genresToAdd = Array.isArray(addGenre) ? addGenre : [addGenre];
      event.genre = [...new Set([...event.genre, ...genresToAdd])]; // Avoid duplicates
    }

    if (removeGenre) {
      const genresToRemove = Array.isArray(removeGenre)
        ? removeGenre
        : [removeGenre];
      event.genre = event.genre.filter((g) => !genresToRemove.includes(g));
    }

    await event.save();

    return apiResponse(res, {
      success: true,
      message: "Event updated successfully",
      data: event,
    });
  } catch (error) {
    return apiResponse(res, {
      success: false,
      message: "Failed to update event",
      data: { error: error.message },
      statusCode: 500,
    });
  }
};

exports.deleteEvent = async (req, res) => {
  try {
    const eventId = req.params.id;
    const event = await Event.findById(eventId);

    if (!event) {
      return apiResponse(res, {
        success: false,
        message: "Event not found",
        statusCode: 404,
      });
    }

    // Delete poster from storage
    if (event.posterUrl) {
      await deleteImage(event.posterUrl);
    }

    await Event.findByIdAndDelete(eventId);
    return apiResponse(res, {
      success: true,
      message: "Event deleted successfully",
    });
  } catch (error) {
    return apiResponse(res, {
      success: false,
      message: "Failed to delete event",
      data: { error: error.message },
      statusCode: 500,
    });
  }
};
