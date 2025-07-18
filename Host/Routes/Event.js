const {
  createEvent,
  getAllEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  updateEventDiscount,
  toggleEventGuestList,
  getLatestEvents,
  updateEventApplicationStatus,
  getArtistStatusOfEvent,
  getEventGuestListByDiscount,
  getAllEventsForUsers,
  cancelEvent,
  markEventCompleted,
  getBookedArtists,
  getAllEventsHost,
  getEventDiscount,
   
} = require("../controllers/Events/event");

const { authMiddleware } = require("../../middlewares/authMiddleware");
const express = require("express");
const router = express.Router();

const multer = require("multer");
const upload = multer();

// Enable/Disable Guest List and Manage Guests

router.get(
  "/get-event/:eventId",
  authMiddleware(["host", "artist", "user"]),
  getEventById
);
// Existing routes
router.post(
  "/create-event",
  authMiddleware(["host"]),
  upload.single("posterUrl"),
  createEvent
);

router.patch(
  "/update-event/:eventId",
  authMiddleware(["host"]),
  upload.single("posterUrl"),
  updateEvent
);

router.delete(
  "/delete-event/:id",
  authMiddleware(["host"]),
  deleteEvent
);

router.get("/get-all-events",  getAllEventsForUsers);



router.patch(
  "/update-event-discount/:eventId",
  authMiddleware(["host"]),
  updateEventDiscount
);

router.patch(
  "/toggle-guest-list/:eventId",
  authMiddleware(["host"]),
  toggleEventGuestList
);

router.patch(
  "/event-applications/status/:applicationId",
  authMiddleware(["host"]),
  updateEventApplicationStatus
);

router.get('/latest', authMiddleware(["user"]), getLatestEvents);

router.get("/artist-status/:eventId", authMiddleware(["host"]), getArtistStatusOfEvent);
router.get(
  "/get-guest-list/:eventId",
  authMiddleware(["host"]),
  getEventGuestListByDiscount
);

router.get(
  "/get-all-user-events",
  // authMiddleware(["user"]),
  getAllEventsForUsers
);
// New routes
router.patch(
  "/cancel-event/:eventId",
  authMiddleware(["host"]),
  cancelEvent
);

router.patch(
  "/mark-event-completed/:eventId",
  authMiddleware(["host"]),
  markEventCompleted
);

router.get(
  "/booked-artists/:eventId",
  authMiddleware(["host"]),
  getBookedArtists
);
router.get(
  "/eventByHostID",
  authMiddleware(["host"]),
  getAllEventsHost
);

router.get('/events/:eventId/discount', authMiddleware(['host']), getEventDiscount);
router.patch('/events/update-event-discount/:eventId', authMiddleware(['host']), updateEventDiscount);

module.exports = router;