const GuestListRequest = require('../modal/guestListReqModal');
const Event = require('../../Host/models/Events/event'); // Assuming the Event model is in eventModal.js

// @desc    Apply for guest list
// @access  Private (User)
const applyGuestList =  (async (req, res) => {
  const { eventId } = req.body;
  const userId = req.user._id; // Assuming user is authenticated and user ID is available in req.user

  // Validate event exists
  const event = await Event.findById(eventId);
  if (!event) {
    res.status(404);
    throw new Error('Event not found');
  }

  // Check if event has guest list enabled
  if (!event.eventGuestEnabled) {
    res.status(400);
    throw new Error('Guest list is not enabled for this event');
  }

  // Check if user already applied
  const existingRequest = await GuestListRequest.findOne({ userId, eventId });
  if (existingRequest) {
    res.status(400);
    throw new Error('You have already applied for this guest list');
  }

  // Create guest list request
  const guestListRequest = await GuestListRequest.create({
    userId,
    eventId,
    status: 'pending',
  });

  res.status(201).json({
    success: true,
    data: guestListRequest,
  });
});

// @desc    Get all guest list requests for an event (Host only)
// @access  Private (Host)
const getGuestListRequests = (async (req, res) => {
  const { eventId } = req.params;
  const userId = req.user._id;

  // Verify event exists and user is the host
  const event = await Event.findById(eventId);
  if (!event) {
    res.status(404);
    throw new Error('Event not found');
  }
  if (event.hostId.toString() !== userId.toString()) {
    res.status(403);
    throw new Error('Not authorized to view guest list requests');
  }

  const requests = await GuestListRequest.find({ eventId })
    .populate('userId', 'fullName mobileNumber');

  res.status(200).json({
    success: true,
    data: requests,
  });
});

// @desc    Update guest list request status (Host only)
// @access  Private (Host)
const updateGuestListRequest =  (async (req, res) => {
  const { requestId } = req.params;
  const { status, discountLevel } = req.body;
  const userId = req.user._id;

  // Find guest list request
  const guestListRequest = await GuestListRequest.findById(requestId);
  if (!guestListRequest) {
    res.status(404);
    throw new Error('Guest list request not found');
  }

  // Verify user is the host of the event
  const event = await Event.findById(guestListRequest.eventId);
  if (!event) {
    res.status(404);
    throw new Error('Event not found');
  }
  if (event.hostId.toString() !== userId.toString()) {
    res.status(403);
    throw new Error('Not authorized to update guest list request');
  }

  // Validate discountLevel if provided
  if (status === 'approved' && discountLevel) {
    if (!['level1', 'level2', 'level3'].includes(discountLevel)) {
      res.status(400);
      throw new Error('Invalid discount level. Must be level1, level2, or level3');
    }
  }

  // Update status
  guestListRequest.status = status;
  await guestListRequest.save();

  // If approved, add to event's guestList with discountLevel
  if (status === 'approved') {
    event.guestList.push({
      userId: guestListRequest.userId,
      discountLevel: discountLevel || undefined, // Only include discountLevel if provided
    });
    await event.save();
  }

  res.status(200).json({
    success: true,
    data: guestListRequest,
  });
});

// @desc    Get user's guest list requests
// @access  Private (User)
const getUserGuestListRequests = (async (req, res) => {
  const userId = req.user._id;

  const requests = await GuestListRequest.find({ userId })
    .populate('eventId', 'eventName venue eventDateTime');

  res.status(200).json({
    success: true,
    data: requests,
  });
});

module.exports = {
  applyGuestList,
  getGuestListRequests,
  updateGuestListRequest,
  getUserGuestListRequests,
};