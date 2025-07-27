const express = require('express');
const mongoose = require('mongoose');
const { incrementView, incrementRegistration, incrementLike } = require('../../controllers/event/eventDashboard');

const router = express.Router();

// Middleware to validate ObjectId
const validateObjectId = (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.eventId)) {
    return res.status(400).json({ error: 'Invalid event ID' });
  }
  next();
};

// Routes
router.put('/events/:eventId/view', validateObjectId, incrementView);
router.put('/events/:eventId/register', validateObjectId, incrementRegistration);
router.put('/events/:eventId/like', validateObjectId, incrementLike);

module.exports = router;