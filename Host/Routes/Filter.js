const express = require("express");
const router = express.Router();
const { filterArtists } = require("../controllers/Filter/filter");
const { authMiddleware } = require("../../middlewares/authMiddleware");


router.get("/filter", authMiddleware(["host"]), filterArtists);

module.exports = router;
