const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../../middlewares/authMiddleware");
const {
  applyForEvent,
  getAppliedEvents,
  removeAppliedEvent
} = require("../controllers/EventApplication/eventApplication");

//Post The Apply Events By Artist
router.post("/applyEvent", authMiddleware(["artist"]), applyForEvent);

//remove The Applied Events By Artist
router.delete("/remove-event", authMiddleware(["artist"]), removeAppliedEvent);

//Get The Apply Events By Artist
router.get("/event/applied", authMiddleware(["artist"]), getAppliedEvents);

module.exports = router;
