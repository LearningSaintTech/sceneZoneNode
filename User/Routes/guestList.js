const express = require("express");
const router = express.Router();
const {
guestlistRequest,

} = require("../controllers/ApplyForGuestList/applyforGuest");
const {authMiddleware} = require("../../middlewares/authMiddleware");



router.post("/guest-request",authMiddleware(['user']), guestlistRequest);


module.exports = router;

