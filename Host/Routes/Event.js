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
  getArtistStatusOfEvent
} = require("../controllers/Events/event");

const { authMiddleware } = require("../../middlewares/authMiddleware");
const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer();

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

router.get("/get-all-events", authMiddleware(["host"]), getAllEvents);

router.get(
  "/get-event/:id",
  authMiddleware(["host", "artist", "user"]),
  getEventById
);


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

// Route to get latest events
router.get('/latest',  authMiddleware(["user"]), getLatestEvents);


//Route to get artist status for Event by EventId
router.get("/artist-status/:eventId",authMiddleware(["host"]),getArtistStatusOfEvent)

module.exports = router;