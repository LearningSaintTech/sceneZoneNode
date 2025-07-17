const mongoose = require('mongoose');
const ChatNegotiation = require('../Model/ChatNegotiation');
const Event = require('../../Host/models/Events/event');
const ArtistAuthentication = require('../../Artist/models/Auth/Auth');
const HostAuthentication = require('../../Host/models/Auth/Auth');
const NotificationService = require('../../Notification/controller/notificationService');

// Get all events for the logged-in user (host or artist)
const getEvents = async (req, res) => {
  try {
    const userId = req.user.hostId || req.user.artistId;
    const userRole = req.user.role;
    console.log(`[${new Date().toISOString()}] Fetching events for user ${userId} with role ${userRole}`);

    let events = [];
    if (userRole === 'host') {
      events = await Event.find({ hostId: userId })
        .select('eventName eventDateTime venue status posterUrl')
        .sort({ eventDateTime: -1 });
      // For each event, sum unread messages for the host across all chats for that event
      for (const event of events) {
        const chats = await ChatNegotiation.find({ eventId: event._id });
        let eventUnreadCount = 0;
        for (const chat of chats) {
          eventUnreadCount += chat.messages.filter(
            msg => !msg.readBy.map(id => id.toString()).includes(userId.toString())
          ).length;
        }
        event._doc.unreadCount = eventUnreadCount;
      }
    } else if (userRole === 'artist') {
      const chats = await ChatNegotiation.find({ artistId: userId })
        .select('eventId messages')
        .populate({
          path: 'eventId',
          select: 'eventName eventDateTime venue status posterUrl',
        });
      events = chats
        .filter(chat => chat.eventId)
        .map(chat => {
          const unreadCount = chat.messages.filter(
            msg => !msg.readBy.map(id => id.toString()).includes(userId.toString())
          ).length;
          return {
            ...chat.eventId._doc,
            unreadCount,
          };
        });
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
          model: 'HostAuthentication',
        })
        .select('artistId hostId messages lastMessageAt latestProposedPrice proposedBy isHostApproved isArtistApproved finalPrice isNegotiationComplete');

      if (!chat) {
        console.warn(`[${new Date().toISOString()}] No chat found for event ${eventId} and artist ${userId}`);
        return res.status(404).json({ message: 'No chat found for this event' });
      }

      // Add unreadCount for artist
      const unreadCount = chat.messages.filter(
        msg => !msg.readBy.map(id => id.toString()).includes(userId.toString())
      ).length;
      const chatObj = chat.toObject();
      chatObj.unreadCount = unreadCount;

      console.log(`[${new Date().toISOString()}] Returning chat ${chat._id} for artist ${userId} in event ${eventId}`);
      return res.status(200).json(chatObj);
    }

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
      .select('artistId hostId messages lastMessageAt latestProposedPrice proposedBy isHostApproved isArtistApproved finalPrice isNegotiationComplete')
      .sort({ lastMessageAt: -1 });

    // Add unreadCount for each chat (host)
    const chatsWithUnread = chats.map(chat => {
      const unreadCount = chat.messages.filter(
        msg => !msg.readBy.map(id => id.toString()).includes(userId.toString())
      ).length;
      const chatObj = chat.toObject();
      chatObj.unreadCount = unreadCount;
      return chatObj;
    });

    console.log(`[${new Date().toISOString()}] Found ${chats.length} chats for event ${eventId} for host ${userId}`);
    res.status(200).json(chatsWithUnread);
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
    const io = req.app.get("io"); // Access Socket.IO instance
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

    // Emit Socket.IO event to both host and artist
    io.to(chat.hostId.toString()).emit("newMessage", updatedChat);
    io.to(chat.artistId.toString()).emit("newMessage", updatedChat);
    console.log(`[${new Date().toISOString()}] Emitted newMessage event for chat ${chatId}`);

    // Create notification for the recipient
    try {
      const recipientId = userRole === 'host' ? chat.artistId : chat.hostId;
      const recipientType = userRole === 'host' ? 'artist' : 'host';
      const senderName = userRole === 'host' ? 'Host' : 'Artist';
      
      const notificationData = {
        recipientId,
        recipientType,
        senderId: userId,
        senderType: userRole,
        title: `New Price Proposal`,
        body: `${senderName} proposed ₹${proposedPrice} for your event`,
        type: 'price_proposal',
        data: {
          chatId: chat._id,
          eventId: chat.eventId,
          amount: proposedPrice
        }
      };

      await NotificationService.createAndSendNotification(notificationData);
      console.log(`[${new Date().toISOString()}] Notification created for ${recipientType} ${recipientId}`);
    } catch (notificationError) {
      console.error(`[${new Date().toISOString()}] Error creating notification:`, notificationError);
      // Don't fail the request if notification fails
    }

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
    const io = req.app.get("io"); // Access Socket.IO instance
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

    // Emit Socket.IO event to notify artist of new chat
    io.to(artistId.toString()).emit("newChat", populatedChat);
    console.log(`[${new Date().toISOString()}] Emitted newChat event to artist ${artistId}`);

    // Create notification for the artist
    try {
      const event = await Event.findById(eventId).select('eventName');
      const host = await HostAuthentication.findById(hostId).select('fullName');
      
      const notificationData = {
        recipientId: artistId,
        recipientType: 'artist',
        senderId: hostId,
        senderType: 'host',
        title: `New Chat Invitation`,
        body: `${host.fullName} wants to discuss "${event.eventName}" with you`,
        type: 'event_invitation',
        data: {
          chatId: newChat._id,
          eventId: eventId
        }
      };

      await NotificationService.createAndSendNotification(notificationData);
      console.log(`[${new Date().toISOString()}] Notification created for artist ${artistId}`);
    } catch (notificationError) {
      console.error(`[${new Date().toISOString()}] Error creating notification:`, notificationError);
      // Don't fail the request if notification fails
    }

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
    const io = req.app.get("io"); // Access Socket.IO instance
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

    // Emit Socket.IO event to both host and artist
    io.to(chat.hostId.toString()).emit("priceApproved", updatedChat);
    io.to(chat.artistId.toString()).emit("priceApproved", updatedChat);
    console.log(`[${new Date().toISOString()}] Emitted priceApproved event for chat ${chatId}`);

    // Create notification for the recipient
    try {
      const recipientId = userRole === 'host' ? chat.artistId : chat.hostId;
      const recipientType = userRole === 'host' ? 'artist' : 'host';
      const senderName = userRole === 'host' ? 'Host' : 'Artist';
      
      let notificationTitle, notificationBody, notificationType;
      
      if (chat.isNegotiationComplete) {
        notificationTitle = `Price Agreement Reached!`;
        notificationBody = `${senderName} agreed to ₹${chat.finalPrice} for your event`;
        notificationType = 'price_approved';
      } else {
        notificationTitle = `Price Proposal Approved`;
        notificationBody = `${senderName} approved your ₹${chat.latestProposedPrice} proposal`;
        notificationType = 'price_approved';
      }
      
      const notificationData = {
        recipientId,
        recipientType,
        senderId: userId,
        senderType: userRole,
        title: notificationTitle,
        body: notificationBody,
        type: notificationType,
        data: {
          chatId: chat._id,
          eventId: chat.eventId,
          amount: chat.isNegotiationComplete ? chat.finalPrice : chat.latestProposedPrice,
          isComplete: chat.isNegotiationComplete
        }
      };

      await NotificationService.createAndSendNotification(notificationData);
      console.log(`[${new Date().toISOString()}] Notification created for ${recipientType} ${recipientId}`);
    } catch (notificationError) {
      console.error(`[${new Date().toISOString()}] Error creating notification:`, notificationError);
      // Don't fail the request if notification fails
    }

    res.status(200).json(updatedChat);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error approving price for chat ${req.params.chatId}: ${error.message}`);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Mark all messages as read for a user in a chat
const markChatAsRead = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.hostId || req.user.artistId;
    const userRole = req.user.role;
    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return res.status(400).json({ message: 'Invalid chat ID' });
    }
    const chat = await ChatNegotiation.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }
    // Mark all messages as read for this user
    let updated = false;
    for (const msg of chat.messages) {
      if (!msg.readBy.map(id => id.toString()).includes(userId.toString())) {
        msg.readBy.push(userId);
        updated = true;
      }
    }
    if (updated) {
      await chat.save();
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getEvents,
  getChatsForEvent,
  getChatHistory,
  sendMessage,
  startChat,
  approvePrice,
  markChatAsRead,
};