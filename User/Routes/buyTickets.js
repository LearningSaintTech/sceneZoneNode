const express = require("express");
const router = express.Router();
const {
  buyTicket,
} = require("../controllers/Book-Tickets/book-tickets");
const { authMiddleware } = require("../../middlewares/authMiddleware");


router.post("/buy-ticket", authMiddleware(['user']), buyTicket);

module.exports = router;