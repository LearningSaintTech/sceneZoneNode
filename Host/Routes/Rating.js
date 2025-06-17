const express = require("express");
const router = express.Router();
const {
    rateArtist } = require("../controllers/Ratings/ratings");

const { authMiddleware } = require("../../middlewares/authMiddleware");

router.post(
    "/rate-artist",
    authMiddleware(["host"]),
    rateArtist
);

module.exports = router;
