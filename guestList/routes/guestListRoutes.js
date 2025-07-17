const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../../middlewares/authMiddleware');
const {
  enableGuestList,
  getGuestListLink,
  applyForGuestList,
  approveGuestListRequest,
  getUserDiscountLevel,
  getPendingGuestListRequests,
  rejectGuestListRequest
} = require('../controller/guestListController');

// Host enables guest list
router.post('/events/:eventId/enable', authMiddleware(['host']), enableGuestList);

// Artist gets guest list link
router.get('/events/:eventId/link', authMiddleware(['artist']), getGuestListLink);

// User applies for guest list
router.post('/apply/:eventId', authMiddleware(['user']), applyForGuestList);

// Artist approves guest list request
router.post('/events/:eventId/approve', authMiddleware(['artist']), approveGuestListRequest);

// Artist rejects guest list request
router.post('/events/:eventId/reject', authMiddleware(['artist']), rejectGuestListRequest);

// User views discount level
router.get('/events/:eventId/discount', authMiddleware(['user']), getUserDiscountLevel);

router.get('/events/:eventId/pending-requests', authMiddleware(['artist']), getPendingGuestListRequests);

module.exports = router;