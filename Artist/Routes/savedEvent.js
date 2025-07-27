const express = require("express");
const router = express.Router();

const {
  addSavedEvent,
  removeSavedEvent,
  getAllSavedEvents,
} = require("../../Artist/controllers/savedEvent/savedEvent");

const { authMiddleware } = require("../../middlewares/authMiddleware");

router.post("/save", authMiddleware(["artist"]), addSavedEvent);
router.delete("/unsave", authMiddleware(["artist"]), removeSavedEvent);
router.get("/saved", authMiddleware(["artist"]), getAllSavedEvents);

module.exports = router;
