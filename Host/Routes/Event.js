const {
  createEvent,
  getAllEventsByHostId,
  getEventById,
  updateEvent,
  deleteEvent,
  updateEventDiscount,
  toggleEventGuestList,
  getLatestEvents
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

router.get("/get-all-events", authMiddleware(["host", "artist"]), getAllEventsByHostId);

router.get(
  "/get-event/:id",
  authMiddleware(["host", "artist", "user"]),
  getEventById
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

// Route to get latest events
router.get('/latest',  authMiddleware(["user"]), getLatestEvents);


module.exports = router;