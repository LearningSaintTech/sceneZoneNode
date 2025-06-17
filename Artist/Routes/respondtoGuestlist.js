const express = require("express");
const router = express.Router();
const {authMiddleware} = require("../../middlewares/authMiddleware");
const {getGuestListForArtist} = require("../../User/controllers/ApplyForGuestList/applyforGuest");
const {
  respondToGuestRequest,
} = require("../controllers/RespondToGuestList/respondguestList");

router.post(
  "/respond-to-guestlist",
  authMiddleware(["artist"]),
  respondToGuestRequest
);

router.get(
    "/get-guestList",
    authMiddleware(['artist']),
    getGuestListForArtist
)

module.exports = router;