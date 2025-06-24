const {
  createEvent,
  getAllEvents,
  getEventById,
  updateEvent,
  deleteEvent,
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

router.get("/get-all-events",  getAllEvents);

router.get(
  "/get-event/:id",
  authMiddleware(["host","artist","user"]),
  getEventById
);

router.patch(
  "/update-event/:id",
  authMiddleware(["host"]),
  upload.single("posterUrl"),
  updateEvent
);

router.delete(
  "/delete-event/:id",
  authMiddleware(["host"]),
  deleteEvent
);

module.exports = router;