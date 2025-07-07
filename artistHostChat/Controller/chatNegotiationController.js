const mongoose = require('mongoose');
const ChatNegotiation = require('../Model/ChatNegotiation');
const Event = require('../../Host/models/Events/event');
const ArtistAuthentication = require('../../Artist/models/Auth/Auth');
const HostAuthentication = require('../../Host/models/Auth/Auth');

// Get all events for the logged-in user (host or artist)
const getEvents = async (req, res) => {
  try {
    const userId = req.user.hostId || req.user.artistId;
    const userRole = req.user.role;
    console.log(`[${new Date().toISOString()}] Fetching events for user ${userId} with role ${userRole}`);

    let events;
    if (userRole === 'host') {
      // Hosts: Fetch events they created
      events = await Event.find({ hostId: userId })
        .select('eventName eventDateTime venue status posterUrl')
        .sort({ eventDateTime: -1 });
      console.log(`[${new Date().toISOString()}] Found ${events.length} events for host ${userId}`);
    } else if (userRole === 'artist') {
      // Artists: Fetch events they are involved in via ChatNegotiation
      const chats = await ChatNegotiation.find({ artistId: userId })
        .select('eventId')
        .populate({
          path: 'eventId',
          select: 'eventName eventDateTime venue status posterUrl',
        });
      events = chats
        .filter(chat => chat.eventId) // Filter out null eventIds (in case of deleted events)
        .map(chat => chat.eventId);
      console.log(`[${new Date().toISOString()}] Found ${events.length} events for artist ${userId}`);
    } else {
      console.warn(`[${new Date().toISOString()}] Invalid user role ${userRole} for user ${userId}`);
      return res.status(403).json({ message: 'Invalid user role' });
    }

    res.status(200).json(events);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error fetching events for user ${req.user._id}: ${error.message}`);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get chats for a specific event (for hosts) or direct chat for an event (for artists)
const getChatsForEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.hostId || req.user.artistId;
    const userRole = req.user.role;
    console.log(`[${new Date().toISOString()}] Fetching chats for event ${eventId} by user ${userId} (${userRole})`);

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      console.warn(`[${new Date().toISOString()}] Invalid event ID ${eventId}`);
      return res.status(400).json({ message: 'Invalid event ID' });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      console.warn(`[${new Date().toISOString()}] Event ${eventId} not found`);
      return res.status(404).json({ message: 'Event not found' });
    }

    if (userRole === 'host' && event.hostId.toString() !== userId.toString()) {
      console.warn(`[${new Date().toISOString()}] Unauthorized access to event ${eventId} by host ${userId}`);
      return res.status(403).json({ message: 'Unauthorized access to event' });
    }

    if (userRole === 'artist') {
      // Artists: Fetch the single chat they are involved in for this event
      const chat = await ChatNegotiation.findOne({ eventId, artistId: userId })
        .populate({
          path: 'artistId',
          select: 'fullName profileImageUrl',
          model: 'ArtistAuthentication',
        })
        .populate({
          path: 'hostId',
          select: 'fullName profileImageUrl',
          model: 'HostAuthentication',
        })
        .populate({
          path: 'messages.senderId',
          select: 'fullName profileImageUrl',
          model: 'HostAuthentication', // For artists, senderId in messages is typically the host
        })
        .select('artistId hostId messages lastMessageAt latestProposedPrice proposedBy isHostApproved isArtistApproved finalPrice isNegotiationComplete');

      if (!chat) {
        console.warn(`[${new Date().toISOString()}] No chat found for event ${eventId} and artist ${userId}`);
        return res.status(404).json({ message: 'No chat found for this event' });
      }

      console.log(`[${new Date().toISOString()}] Returning chat ${chat._id} for artist ${userId} in event ${eventId}`);
      return res.status(200).json(chat); // Return single chat object for artists
    }

    // Hosts: Fetch all chats for the event
    const chats = await ChatNegotiation.find({ eventId })
      .populate({
        path: 'artistId',
        select: 'fullName profileImageUrl',
        model: 'ArtistAuthentication',
      })
      .populate({
        path: 'hostId',
        select: 'fullName profileImageUrl',
        model: 'HostAuthentication',
      })
      .select('artistId hostId lastMessageAt latestProposedPrice proposedBy isHostApproved isArtistApproved finalPrice isNegotiationComplete')
      .sort({ lastMessageAt: -1 });

    console.log(`[${new Date().toISOString()}] Found ${chats.length} chats for event ${eventId} for host ${userId}`);
    res.status(200).json(chats); // Return array of chats for hosts
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error fetching chats for event ${req.params.eventId}: ${error.message}`);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get chat history for a specific conversation
const getChatHistory = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.hostId || req.user.artistId;
    const userRole = req.user.role;
    console.log(`[${new Date().toISOString()}] Fetching chat history for chat ${chatId} by user ${userId} (${userRole})`);

    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      console.warn(`[${new Date().toISOString()}] Invalid chat ID ${chatId}`);
      return res.status(400).json({ message: 'Invalid chat ID' });
    }

    const chat = await ChatNegotiation.findById(chatId)
      .populate({
        path: 'artistId',
        select: 'fullName profileImageUrl',
        model: 'ArtistAuthentication',
      })
      .populate({
        path: 'hostId',
        select: 'fullName profileImageUrl',
        model: 'HostAuthentication',
      })
      .populate({
        path: 'messages.senderId',
        select: 'fullName profileImageUrl',
        model: userRole === 'host' ? 'ArtistAuthentication' : 'HostAuthentication',
      });

    if (!chat) {
      console.warn(`[${new Date().toISOString()}] Chat ${chatId} not found`);
      return res.status(404).json({ message: 'Chat not found' });
    }

    if (
      (userRole === 'host' && chat.hostId._id.toString() !== userId.toString()) ||
      (userRole === 'artist' && chat.artistId._id.toString() !== userId.toString())
    ) {
      console.warn(`[${new Date().toISOString()}] Unauthorized access to chat ${chatId} by user ${userId}`);
      return res.status(403).json({ message: 'Unauthorized access to chat' });
    }

    console.log(`[${new Date().toISOString()}] Retrieved chat history with ${chat.messages.length} messages for chat ${chatId}`);
    res.status(200).json(chat);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error fetching chat history for chat ${req.params.chatId}: ${error.message}`);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Send a new price proposal message
const sendMessage = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { proposedPrice } = req.body;
    const userId = req.user.hostId || req.user.artistId;
    const userRole = req.user.role;
    console.log(`[${new Date().toISOString()}] Sending price proposal $${proposedPrice} in chat ${chatId} by user ${userId} (${userRole})`);

    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      console.warn(`[${new Date().toISOString()}] Invalid chat ID ${chatId}`);
      return res.status(400).json({ message: 'Invalid chat ID' });
    }

    if (!Number.isFinite(proposedPrice) || proposedPrice < 0) {
      console.warn(`[${new Date().toISOString()}] Invalid proposed price ${proposedPrice} for chat ${chatId}`);
      return res.status(400).json({ message: 'Proposed price must be a valid non-negative number' });
    }

    const chat = await ChatNegotiation.findById(chatId);
    if (!chat) {
      console.warn(`[${new Date().toISOString()}] Chat ${chatId} not found`);
      return res.status(404).json({ message: 'Chat not found' });
    }

    if (
      (userRole === 'host' && chat.hostId.toString() !== userId.toString()) ||
      (userRole === 'artist' && chat.artistId.toString() !== userId.toString())
    ) {
      console.warn(`[${new Date().toISOString()}] Unauthorized message attempt in chat ${chatId} by user ${userId}`);
      return res.status(403).json({ message: 'Unauthorized access to chat' });
    }

    if (chat.isNegotiationComplete) {
      console.warn(`[${new Date().toISOString()}] Attempt to send message in completed negotiation chat ${chatId}`);
      return res.status(400).json({ message: 'Negotiation is already complete' });
    }

    const newMessage = {
      senderId: userId,
      senderType: userRole === 'host' ? 'HostAuthentication' : 'ArtistAuthentication',
      proposedPrice,
      createdAt: new Date(),
    };

    chat.messages.push(newMessage);
    chat.latestProposedPrice = proposedPrice;
    chat.proposedBy = userRole;
    chat.isHostApproved = userRole === 'host';
    chat.isArtistApproved = userRole === 'artist';
    chat.lastMessageAt = new Date();

    await chat.save();
    console.log(`[${new Date().toISOString()}] Price proposal $${proposedPrice} sent in chat ${chatId} by user ${userId}`);

    const updatedChat = await ChatNegotiation.findById(chatId)
      .populate({
        path: 'artistId',
        select: 'fullName profileImageUrl',
        model: 'ArtistAuthentication',
      })
      .populate({
        path: 'hostId',
        select: 'fullName profileImageUrl',
        model: 'HostAuthentication',
      })
      .populate({
        path: 'messages.senderId',
        select: 'fullName profileImageUrl',
        model: userRole === 'host' ? 'ArtistAuthentication' : 'HostAuthentication',
      });

    res.status(201).json(updatedChat);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error sending price proposal in chat ${req.params.chatId}: ${error.message}`);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Start a new chat negotiation (only for hosts)
const startChat = async (req, res) => {
  try {
    const { eventId, artistId } = req.body;
    const hostId = req.user.hostId;
    const userRole = req.user.role;
    console.log(`[${new Date().toISOString()}] Starting new chat for event ${eventId} with artist ${artistId} by host ${hostId}`);

    if (userRole !== 'host') {
      console.warn(`[${new Date().toISOString()}] Non-host user ${hostId} attempted to start chat`);
      return res.status(403).json({ message: 'Only hosts can start a chat' });
    }

    if (!mongoose.Types.ObjectId.isValid(eventId) || !mongoose.Types.ObjectId.isValid(artistId)) {
      console.warn(`[${new Date().toISOString()}] Invalid event ID ${eventId} or artist ID ${artistId}`);
      return res.status(400).json({ message: 'Invalid event or artist ID' });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      console.warn(`[${new Date().toISOString()}] Event ${eventId} not found`);
      return res.status(404).json({ message: 'Event not found' });
    }

    if (event.hostId.toString() !== hostId.toString()) {
      console.warn(`[${new Date().toISOString()}] Unauthorized attempt to start chat for event ${eventId} by host ${hostId}`);
      return res.status(403).json({ message: 'Unauthorized to start chat for this event' });
    }

    const artist = await ArtistAuthentication.findById(artistId);
    if (!artist) {
      console.warn(`[${new Date().toISOString()}] Artist ${artistId} not found`);
      return res.status(404).json({ message: 'Artist not found' });
    }

    const existingChat = await ChatNegotiation.findOne({ eventId, hostId, artistId });
    if (existingChat) {
      console.warn(`[${new Date().toISOString()}] Chat already exists for event ${eventId}, host ${hostId}, artist ${artistId}`);
      return res.status(400).json({ message: 'Chat already exists for this event and artist' });
    }

    const newChat = new ChatNegotiation({
      eventId,
      hostId,
      artistId,
      messages: [],
    });

    await newChat.save();
    console.log(`[${new Date().toISOString()}] New chat created with ID ${newChat._id} for event ${eventId}`);

    const populatedChat = await ChatNegotiation.findById(newChat._id)
      .populate({
        path: 'artistId',
        select: 'fullName profileImageUrl',
        model: 'ArtistAuthentication',
      })
      .populate({
        path: 'hostId',
        select: 'fullName profileImageUrl',
        model: 'HostAuthentication',
      });

    res.status(201).json(populatedChat);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error starting chat for event ${req.body.eventId}: ${error.message}`);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Approve the latest proposed price
const approvePrice = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.hostId || req.user.artistId;
    const userRole = req.user.role;
    console.log(`[${new Date().toISOString()}] Approving price for chat ${chatId} by user ${userId} (${userRole})`);

    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      console.warn(`[${new Date().toISOString()}] Invalid chat ID ${chatId}`);
      return res.status(400).json({ message: 'Invalid chat ID' });
    }

    const chat = await ChatNegotiation.findById(chatId);
    if (!chat) {
      console.warn(`[${new Date().toISOString()}] Chat ${chatId} not found`);
      return res.status(404).json({ message: 'Chat not found' });
    }

    if (
      (userRole === 'host' && chat.hostId.toString() !== userId.toString()) ||
      (userRole === 'artist' && chat.artistId.toString() !== userId.toString())
    ) {
      console.warn(`[${new Date().toISOString()}] Unauthorized price approval attempt in chat ${chatId} by user ${userId}`);
      return res.status(403).json({ message: 'Unauthorized access to chat' });
    }
    

    if (chat.isNegotiationComplete) {
      console.warn(`[${new Date().toISOString()}] Attempt to approve price in completed negotiation chat ${chatId}`);
      return res.status(400).json({ message: 'Negotiation is already complete' });
    }

    if (!chat.latestProposedPrice || chat.proposedBy === null) {
      console.warn(`[${new Date().toISOString()}] No price proposed in chat ${chatId}`);
      return res.status(400).json({ message: 'No price proposed to approve' });
    }

    if (chat.proposedBy === userRole) {
      console.warn(`[${new Date().toISOString()}] User ${userId} cannot approve their own proposed price in chat ${chatId}`);
      return res.status(400).json({ message: 'Cannot approve your own proposed price' });
    }

    if (userRole === 'host') {
      chat.isHostApproved = true;
    } else {
      chat.isArtistApproved = true;
    }

    if (chat.isHostApproved && chat.isArtistApproved) {
      chat.finalPrice = chat.latestProposedPrice;
      chat.isNegotiationComplete = true;
      console.log(`[${new Date().toISOString()}] Negotiation completed for chat ${chatId} with final price $${chat.finalPrice}`);
    } else {
      console.log(`[${new Date().toISOString()}] Price $${chat.latestProposedPrice} approved by ${userRole} in chat ${chatId}, awaiting other party's approval`);
    }

    await chat.save();

    const updatedChat = await ChatNegotiation.findById(chatId)
      .populate({
        path: 'artistId',
        select: 'fullName profileImageUrl',
        model: 'ArtistAuthentication',
      })
      .populate({
        path: 'hostId',
        select: 'fullName profileImageUrl',
        model: 'HostAuthentication',
      })
      .populate({
        path: 'messages.senderId',
        select: 'fullName profileImageUrl',
        model: userRole === 'host' ? 'ArtistAuthentication' : 'HostAuthentication',
      });

    res.status(200).json(updatedChat);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error approving price for chat ${req.params.chatId}: ${error.message}`);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getEvents,
  getChatsForEvent,
  getChatHistory,
  sendMessage,
  startChat,
  approvePrice,
};