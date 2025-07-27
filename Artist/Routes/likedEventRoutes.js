const express = require("express");
const router = express.Router();

const {
  addLikedEvent,
  removeLikedEvent,
  getLikedEvents
} = require("../../Artist/controllers/likedController/likedController");

const {authMiddleware} = require("../../middlewares/authMiddleware");

// Only accessible to authenticated artists
router.post("/like", authMiddleware(["artist"]), addLikedEvent);
router.post("/unlike", authMiddleware(["artist"]), removeLikedEvent);
router.get("/liked", authMiddleware(["artist"]), getLikedEvents); 
module.exports = router;
