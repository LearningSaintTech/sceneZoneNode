const express = require("express");
const router = express.Router();
const { verifyEvent } = require("../controllers/Verification/HostEventVerify");
const {verifyArtist} = require("../controllers/Verification/ArtistVerify");

const {authMiddleware} = require("../../middlewares/authMiddleware");

router.post("/Event-Verify/:eventId", authMiddleware(['admin']),verifyEvent);
router.post("/Artist-Verify/:artistId", authMiddleware(['admin']),verifyArtist);

module.exports = router;

