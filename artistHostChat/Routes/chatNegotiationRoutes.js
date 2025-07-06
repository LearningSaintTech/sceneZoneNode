const express = require('express');
const router = express.Router();
const chatNegotiationController = require('../Controller/chatNegotiationController');
const { authMiddleware } = require('../../middlewares/authMiddleware');

// Simple routes for chat negotiation
router.get('/get-events', authMiddleware(['host', 'artist']), chatNegotiationController.getEvents);

router.get('/get-chats/:eventId', authMiddleware(['host', 'artist']), chatNegotiationController.getChatsForEvent);

router.get('/get-chat/:chatId', authMiddleware(['host', 'artist']), chatNegotiationController.getChatHistory);

router.post('/create-chat', authMiddleware(['host']), chatNegotiationController.startChat);

router.post('/send-message/:chatId', authMiddleware(['host', 'artist']), chatNegotiationController.sendMessage);

router.patch('/approve-price/:chatId', authMiddleware(['host', 'artist']), chatNegotiationController.approvePrice);

module.exports = router;