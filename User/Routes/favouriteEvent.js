const express = require("express");
const router = express.Router();
const {
  addFavouriteEvent,
  getFavouriteEvents,
} = require("../controllers/FavouriteEvent/favouriteEvent");
const { authMiddleware } = require("../../middlewares/authMiddleware");


router.post("/add-favourite-event", authMiddleware(['user']), addFavouriteEvent);
router.get("/get-favourite-events", authMiddleware(['user']), getFavouriteEvents);
module.exports = router;