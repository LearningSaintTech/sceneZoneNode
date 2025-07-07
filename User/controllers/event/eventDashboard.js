const mongoose = require('mongoose');
const Event = require("../../../Host/models/Events/event"); // Adjust path to your Event model

// Controller to increment totalViewed
const incrementView = async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    event.totalViewed += 1;
    await event.save();

    res.status(200).json({
      message: 'View count incremented successfully',
      totalViewed: event.totalViewed
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error while incrementing view count' });
  }
};

// Controller to increment totalRegistered
const incrementRegistration = async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    event.totalRegistered += 1;
    await event.save();

    res.status(200).json({
      message: 'Registration count incremented successfully',
      totalRegistered: event.totalRegistered
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error while incrementing registration count' });
  }
};

// Controller to increment totalLikes
const incrementLike = async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    event.totalLikes += 1;
    await event.save();

    res.status(200).json({
      message: 'Like count incremented successfully',
      totalLikes: event.totalLikes
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error while incrementing like count' });
  }
};

module.exports = {
  incrementView,
  incrementRegistration,
  incrementLike
};