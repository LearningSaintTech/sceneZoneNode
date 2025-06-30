const express = require('express');
const router = express.Router();
const {
  applyGuestList,
  getGuestListRequests,
  updateGuestListRequest,
  getUserGuestListRequests,
} = require('../controller/guestListController');
 
// User routes
router.post('/apply', applyGuestList);
router.get('/my-requests', getUserGuestListRequests);

// Host routes
router.get('/:eventId/requests', getGuestListRequests);
router.put('/request/:requestId', updateGuestListRequest);

module.exports = router;