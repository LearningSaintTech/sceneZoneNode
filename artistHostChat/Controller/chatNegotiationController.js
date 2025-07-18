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
    console.log(`[${new Date().toISOString()}] [getEvents] Fetching events for user ${userId} with role ${userRole}`);

    let events = [];
    if (userRole === 'host') {
      console.log(`[${new Date().toISOString()}] [getEvents] Querying events for host ${userId}`);
      events = await Event.find({ hostId: userId })
        .select('eventName eventDateTime venue status posterUrl')
        .sort({ eventDateTime: -1 });
      console.log(`[${new Date().toISOString()}] [getEvents] Found ${events.length} events for host ${userId}`);

      // For each event, sum unread messages for the host across all chats for that event
      for (const event of events) {
        console.log(`[${new Date().toISOString()}] [getEvents] Processing event ${event._id} for unread messages`);
        const chats = await ChatNegotiation.find({ eventId: event._id });
        console.log(`[${new Date().toISOString()}] [getEvents] Found ${chats.length} chats for event ${event._id}`);
        let eventUnreadCount = 0;
        for (const chat of chats) {
          const unreadMessages = chat.messages.filter(
            msg => !msg.readBy.map(id => id.toString()).includes(userId.toString())
          ).length;
          eventUnreadCount += unreadMessages;
          console.log(`[${new Date().toISOString()}] [getEvents] Chat ${chat._id} has ${unreadMessages} unread messages`);
        }
        event._doc.unreadCount = eventUnreadCount;
        console.log(`[${new Date().toISOString()}] [getEvents] Event ${event._id} total unread count: ${eventUnreadCount}`);
      }
    } else if (userRole === 'artist') {
      console.log(`[${new Date().toISOString()}] [getEvents] Querying chats for artist ${userId}`);
      const chats = await ChatNegotiation.find({ artistId: userId })
        .select('eventId messages')
        .populate({
          path: 'eventId',
          select: 'eventName eventDateTime venue status posterUrl',
        });
      console.log(`[${new Date().toISOString()}] [getEvents] Found ${chats.length} chats for artist ${userId}`);
      events = chats
        .filter(chat => {
          const hasEvent = !!chat.eventId;
          console.log(`[${new Date().toISOString()}] [getEvents] Chat ${chat._id} has event: ${hasEvent}`);
          return hasEvent;
        })
        .map(chat => {
          const unreadCount = chat.messages.filter(
            msg => !msg.readBy.map(id => id.toString()).includes(userId.toString())
          ).length;
          console.log(`[${new Date().toISOString()}] [getEvents] Chat ${chat._id} has ${unreadCount} unread messages`);
          return {
            ...chat.eventId._doc,
            unreadCount,
          };
        });
      console.log(`[${new Date().toISOString()}] [getEvents] Mapped ${events.length} events for artist ${userId}`);
    } else {
      console.warn(`[${new Date().toISOString()}] [getEvents] Invalid user role ${userRole} for user ${userId}`);
      return res.status(403).json({ message: 'Invalid user role' });
    }

    console.log(`[${new Date().toISOString()}] [getEvents] Returning ${events.length} events for user ${userId}`);
    res.status(200).json(events);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] [getEvents] Error fetching events for user ${req.user._id}: ${error.message}`);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get chats for a specific event (for hosts) or direct chat for an event (for artists)
const getChatsForEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.hostId || req.user.artistId;
    const userRole = req.user.role;
    console.log(`[${new Date().toISOString()}] [getChatsForEvent] Fetching chats for event ${eventId} by user ${userId} (${userRole})`);

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      console.warn(`[${new Date().toISOString()}] [getChatsForEvent] Invalid event ID ${eventId}`);
      return res.status(400).json({ message: 'Invalid event ID' });
    }

    console.log(`[${new Date().toISOString()}] [getChatsForEvent] Querying event ${eventId}`);
    const event = await Event.findById(eventId);
    if (!event) {
      console.warn(`[${new Date().toISOString()}] [getChatsForEvent] Event ${eventId} not found`);
      return res.status(404).json({ message: 'Event not found' });
    }

    if (userRole === 'host' && event.hostId.toString() !== userId.toString()) {
      console.warn(`[${new Date().toISOString()}] [getChatsForEvent] Unauthorized access to event ${eventId} by host ${userId}`);
      return res.status(403).json({ message: 'Unauthorized access to event' });
    }

    if (userRole === 'artist') {
      console.log(`[${new Date().toISOString()}] [getChatsForEvent] Querying chat for event ${eventId} and artist ${userId}`);
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
        console.warn(`[${new Date().toISOString()}] [getChatsForEvent] No chat found for event ${eventId} and artist ${userId}`);
        return res.status(404).json({ message: 'No chat found for this event' });
      }

      const unreadCount = chat.messages.filter(
        msg => !msg.readBy.map(id => id.toString()).includes(userId.toString())
      ).length;
      const chatObj = chat.toObject();
      chatObj.unreadCount = unreadCount;
      console.log(`[${new Date().toISOString()}] [getChatsForEvent] Returning chat ${chat._id} with ${unreadCount} unread messages for artist ${userId}`);

      res.status(200).json(chatObj);
    } else {
      console.log(`[${new Date().toISOString()}] [getChatsForEvent] Querying chats for event ${eventId} for host ${userId}`);
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

      console.log(`[${new Date().toISOString()}] [getChatsForEvent] Found ${chats.length} chats for event ${eventId}`);
      // Add unreadCount for each chat (host)
      const chatsWithUnread = chats.map(chat => {
        const unreadCount = chat.messages.filter(
          msg => !msg.readBy.map(id => id.toString()).includes(userId.toString())
        ).length;
        const chatObj = chat.toObject();
        chatObj.unreadCount = unreadCount;
        console.log(`[${new Date().toISOString()}] [getChatsForEvent] Chat ${chat._id} has ${unreadCount} unread messages`);
        return chatObj;
      });

      console.log(`[${new Date().toISOString()}] [getChatsForEvent] Returning ${chatsWithUnread.length} chats for host ${userId}`);
      res.status(200).json(chatsWithUnread);
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] [getChatsForEvent] Error fetching chats for event ${req.params.eventId}: ${error.message}`);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get chat history for a specific conversation
const getChatHistory = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.hostId || req.user.artistId;
    const userRole = req.user.role;
    console.log(`[${new Date().toISOString()}] [getChatHistory] Fetching chat history for chat ${chatId} by user ${userId} (${userRole})`);

    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      console.warn(`[${new Date().toISOString()}] [getChatHistory] Invalid chat ID ${chatId}`);
      return res.status(400).json({ message: 'Invalid chat ID' });
    }

    console.log(`[${new Date().toISOString()}] [getChatHistory] Querying chat ${chatId}`);
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
      console.warn(`[${new Date().toISOString()}] [getChatHistory] Chat ${chatId} not found`);
      return res.status(404).json({ message: 'Chat not found' });
    }

    if (
      (userRole === 'host' && chat.hostId._id.toString() !== userId.toString()) ||
      (userRole === 'artist' && chat.artistId._id.toString() !== userId.toString())
    ) {
      console.warn(`[${new Date().toISOString()}] [getChatHistory] Unauthorized access to chat ${chatId} by user ${userId}`);
      return res.status(403).json({ message: 'Unauthorized access to chat' });
    }

    console.log(`[${new Date().toISOString()}] [getChatHistory] Retrieved chat history with ${chat.messages.length} messages for chat ${chatId}`);
    res.status(200).json(chat);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] [getChatHistory] Error fetching chat history for chat ${req.params.chatId}: ${error.message}`);
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
    console.log(`[${new Date().toISOString()}] [sendMessage] Sending price proposal ₹${proposedPrice} in chat ${chatId} by user ${userId} (${userRole})`);

    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      console.warn(`[${new Date().toISOString()}] [sendMessage] Invalid chat ID ${chatId}`);
      return res.status(400).json({ message: 'Invalid chat ID' });
    }

    if (!Number.isFinite(proposedPrice) || proposedPrice < 0) {
      console.warn(`[${new Date().toISOString()}] [sendMessage] Invalid proposed price ${proposedPrice} for chat ${chatId}`);
      return res.status(400).json({ message: 'Proposed price must be a valid non-negative number' });
    }

    console.log(`[${new Date().toISOString()}] [sendMessage] Querying chat ${chatId}`);
    const chat = await ChatNegotiation.findById(chatId);
    if (!chat) {
      console.warn(`[${new Date().toISOString()}] [sendMessage] Chat ${chatId} not found`);
      return res.status(404).json({ message: 'Chat not found' });
    }

    if (
      (userRole === 'host' && chat.hostId.toString() !== userId.toString()) ||
      (userRole === 'artist' && chat.artistId.toString() !== userId.toString())
    ) {
      console.warn(`[${new Date().toISOString()}] [sendMessage] Unauthorized message attempt in chat ${chatId} by user ${userId}`);
      return res.status(403).json({ message: 'Unauthorized access to chat' });
    }

    if (chat.isNegotiationComplete) {
      console.warn(`[${new Date().toISOString()}] [sendMessage] Attempt to send message in completed negotiation chat ${chatId}`);
      return res.status(400).json({ message: 'Negotiation is already complete' });
    }

    const newMessage = {
      senderId: userId,
      senderType: userRole === 'host' ? 'HostAuthentication' : 'ArtistAuthentication',
      proposedPrice,
      createdAt: new Date(),
    };

    console.log(`[${new Date().toISOString()}] [sendMessage] Adding new message to chat ${chatId}`);
    chat.messages.push(newMessage);
    chat.latestProposedPrice = proposedPrice;
    chat.proposedBy = userRole;
    chat.isHostApproved = userRole === 'host';
    chat.isArtistApproved = userRole === 'artist';
    chat.lastMessageAt = new Date();

    console.log(`[${new Date().toISOString()}] [sendMessage] Saving chat ${chatId} with new message`);
    await chat.save();

    console.log(`[${new Date().toISOString()}] [sendMessage] Querying updated chat ${chatId} for response`);
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

    console.log(`[${new Date().toISOString()}] [sendMessage] Emitting newMessage event to host ${chat.hostId} and artist ${chat.artistId}`);
    io.to(chat.hostId.toString()).emit("newMessage", updatedChat);
    io.to(chat.artistId.toString()).emit("newMessage", updatedChat);

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
          amount: proposedPrice,
        },
      };

      console.log(`[${new Date().toISOString()}] [sendMessage] Creating notification for ${recipientType} ${recipientId}`);
      await NotificationService.createAndSendNotification(notificationData);
      console.log(`[${new Date().toISOString()}] [sendMessage] Notification sent for ${recipientType} ${recipientId}`);
    } catch (notificationError) {
      console.error(`[${new Date().toISOString()}] [sendMessage] Error creating notification for chat ${chatId}: ${notificationError.message}`);
    }

    console.log(`[${new Date().toISOString()}] [sendMessage] Returning updated chat ${chatId}`);
    res.status(201).json(updatedChat);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] [sendMessage] Error sending price proposal in chat ${req.params.chatId}: ${error.message}`);
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
    console.log(`[${new Date().toISOString()}] [startChat] Starting new chat for event ${eventId} with artist ${artistId} by host ${hostId}`);

    if (userRole !== 'host') {
      console.warn(`[${new Date().toISOString()}] [startChat] Non-host user ${hostId} attempted to start chat`);
      return res.status(403).json({ message: 'Only hosts can start a chat' });
    }

    if (!mongoose.Types.ObjectId.isValid(eventId) || !mongoose.Types.ObjectId.isValid(artistId)) {
      console.warn(`[${new Date().toISOString()}] [startChat] Invalid event ID ${eventId} or artist ID ${artistId}`);
      return res.status(400).json({ message: 'Invalid event or artist ID' });
    }

    console.log(`[${new Date().toISOString()}] [startChat] Querying event ${eventId}`);
    const event = await Event.findById(eventId);
    if (!event) {
      console.warn(`[${new Date().toISOString()}] [startChat] Event ${eventId} not found`);
      return res.status(404).json({ message: 'Event not found' });
    }

    if (event.hostId.toString() !== hostId.toString()) {
      console.warn(`[${new Date().toISOString()}] [startChat] Unauthorized attempt to start chat for event ${eventId} by host ${hostId}`);
      return res.status(403).json({ message: 'Unauthorized to start chat for this event' });
    }

    console.log(`[${new Date().toISOString()}] [startChat] Querying artist ${artistId}`);
    const artist = await ArtistAuthentication.findById(artistId);
    if (!artist) {
      console.warn(`[${new Date().toISOString()}] [startChat] Artist ${artistId} not found`);
      return res.status(404).json({ message: 'Artist not found' });
    }

    console.log(`[${new Date().toISOString()}] [startChat] Checking for existing chat for event ${eventId}, host ${hostId}, artist ${artistId}`);
    const existingChat = await ChatNegotiation.findOne({ eventId, hostId, artistId });
    if (existingChat) {
      console.warn(`[${new Date().toISOString()}] [startChat] Chat already exists with ID ${existingChat._id}`);
      return res.status(400).json({ message: 'Chat already exists for this event and artist' });
    }

    const newChat = new ChatNegotiation({
      eventId,
      hostId,
      artistId,
      messages: [],
    });

    console.log(`[${new Date().toISOString()}] [startChat] Saving new chat for event ${eventId}`);
    await newChat.save();

    console.log(`[${new Date().toISOString()}] [startChat] Querying populated chat ${newChat._id}`);
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

    console.log(`[${new Date().toISOString()}] [startChat] Emitting newChat event to artist ${artistId}`);
    io.to(artistId.toString()).emit("newChat", populatedChat);

    // Create notification for the artist
    try {
      console.log(`[${new Date().toISOString()}] [startChat] Querying event ${eventId} for notification`);
      const event = await Event.findById(eventId).select('eventName');
      console.log(`[${new Date().toISOString()}] [startChat] Querying host ${hostId} for notification`);
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
          eventId: eventId,
        },
      };

      console.log(`[${new Date().toISOString()}] [startChat] Creating notification for artist ${artistId}`);
      await NotificationService.createAndSendNotification(notificationData);
      console.log(`[${new Date().toISOString()}] [startChat] Notification sent for artist ${artistId}`);
    } catch (notificationError) {
      console.error(`[${new Date().toISOString()}] [startChat] Error creating notification for chat ${newChat._id}: ${notificationError.message}`);
    }

    console.log(`[${new Date().toISOString()}] [startChat] Returning new chat ${newChat._id}`);
    res.status(201).json(populatedChat);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] [startChat] Error starting chat for event ${req.body.eventId}: ${error.message}`);
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
    console.log(`[${new Date().toISOString()}] [approvePrice] Approving price for chat ${chatId} by user ${userId} (${userRole})`);

    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      console.warn(`[${new Date().toISOString()}] [approvePrice] Invalid chat ID ${chatId}`);
      return res.status(400).json({ message: 'Invalid chat ID' });
    }

    console.log(`[${new Date().toISOString()}] [approvePrice] Querying chat ${chatId}`);
    const chat = await ChatNegotiation.findById(chatId);
    if (!chat) {
      console.warn(`[${new Date().toISOString()}] [approvePrice] Chat ${chatId} not found`);
      return res.status(404).json({ message: 'Chat not found' });
    }

    if (
      (userRole === 'host' && chat.hostId.toString() !== userId.toString()) ||
      (userRole === 'artist' && chat.artistId.toString() !== userId.toString())
    ) {
      console.warn(`[${new Date().toISOString()}] [approvePrice] Unauthorized price approval attempt in chat ${chatId} by user ${userId}`);
      return res.status(403).json({ message: 'Unauthorized access to chat' });
    }

    if (chat.isNegotiationComplete) {
      console.warn(`[${new Date().toISOString()}] [approvePrice] Attempt to approve price in completed negotiation chat ${chatId}`);
      return res.status(400).json({ message: 'Negotiation is already complete' });
    }

    if (!chat.latestProposedPrice || chat.proposedBy === null) {
      console.warn(`[${new Date().toISOString()}] [approvePrice] No price proposed in chat ${chatId}`);
      return res.status(400).json({ message: 'No price proposed to approve' });
    }

    if (chat.proposedBy === userRole) {
      console.warn(`[${new Date().toISOString()}] [approvePrice] User ${userId} cannot approve their own proposed price in chat ${chatId}`);
      return res.status(400).json({ message: 'Cannot approve your own proposed price' });
    }

    if (userRole === 'host') {
      console.log(`[${new Date().toISOString()}] [approvePrice] Host ${userId} approving price ₹${chat.latestProposedPrice}`);
      chat.isHostApproved = true;
    } else {
      console.log(`[${new Date().toISOString()}] [approvePrice] Artist ${userId} approving price ₹${chat.latestProposedPrice}`);
      chat.isArtistApproved = true;
    }

    if (chat.isHostApproved && chat.isArtistApproved) {
      chat.finalPrice = chat.latestProposedPrice;
      chat.isNegotiationComplete = true;
      console.log(`[${new Date().toISOString()}] [approvePrice] Negotiation completed for chat ${chatId} with final price ₹${chat.finalPrice}`);
    } else {
      console.log(`[${new Date().toISOString()}] [approvePrice] Price ₹${chat.latestProposedPrice} approved by ${userRole}, awaiting other party's approval`);
    }

    console.log(`[${new Date().toISOString()}] [approvePrice] Saving chat ${chatId} with updated approval status`);
    await chat.save();

    console.log(`[${new Date().toISOString()}] [approvePrice] Querying updated chat ${chatId} for response`);
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

    console.log(`[${new Date().toISOString()}] [approvePrice] Emitting priceApproved event to host ${chat.hostId} and artist ${chat.artistId}`);
    io.to(chat.hostId.toString()).emit("priceApproved", updatedChat);
    io.to(chat.artistId.toString()).emit("priceApproved", updatedChat);

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
          isComplete: chat.isNegotiationComplete,
        },
      };

      console.log(`[${new Date().toISOString()}] [approvePrice] Creating notification for ${recipientType} ${recipientId}`);
      await NotificationService.createAndSendNotification(notificationData);
      console.log(`[${new Date().toISOString()}] [approvePrice] Notification sent for ${recipientType} ${recipientId}`);
    } catch (notificationError) {
      console.error(`[${new Date().toISOString()}] [approvePrice] Error creating notification for chat ${chatId}: ${notificationError.message}`);
    }

    console.log(`[${new Date().toISOString()}] [approvePrice] Returning updated chat ${chatId}`);
    res.status(200).json(updatedChat);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] [approvePrice] Error approving price for chat ${req.params.chatId}: ${error.message}`);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Mark all messages as read for a user in a chat
const markChatAsRead = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.hostId || req.user.artistId;
    const userRole = req.user.role;
    console.log(`[${new Date().toISOString()}] [markChatAsRead] Marking chat ${chatId} as read for user ${userId} (${userRole})`);

    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      console.warn(`[${new Date().toISOString()}] [markChatAsRead] Invalid chat ID ${chatId}`);
      return res.status(400).json({ message: 'Invalid chat ID' });
    }

    console.log(`[${new Date().toISOString()}] [markChatAsRead] Querying chat ${chatId}`);
    const chat = await ChatNegotiation.findById(chatId);
    if (!chat) {
      console.warn(`[${new Date().toISOString()}] [markChatAsRead] Chat ${chatId} not found`);
      return res.status(404).json({ message: 'Chat not found' });
    }

    console.log(`[${new Date().toISOString()}] [markChatAsRead] Processing ${chat.messages.length} messages for read status`);
    let updated = false;
    for (const msg of chat.messages) {
      if (!msg.readBy.map(id => id.toString()).includes(userId.toString())) {
        msg.readBy.push(userId);
        updated = true;
        console.log(`[${new Date().toISOString()}] [markChatAsRead] Marked message ${msg._id} as read for user ${userId}`);
      }
    }

    if (updated) {
      console.log(`[${new Date().toISOString()}] [markChatAsRead] Saving chat ${chatId} with updated read status`);
      await chat.save();
    } else {
      console.log(`[${new Date().toISOString()}] [markChatAsRead] No messages needed marking as read in chat ${chatId}`);
    }

    console.log(`[${new Date().toISOString()}] [markChatAsRead] Returning success for chat ${chatId}`);
    res.json({ success: true });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] [markChatAsRead] Error marking chat ${req.params.chatId} as read: ${error.message}`);
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