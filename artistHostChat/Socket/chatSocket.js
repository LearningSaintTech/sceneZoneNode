const Chat = require('../Model/chat');

const initChatSocket = (io, userSockets) => {
  io.on('connection', (socket) => {
    console.log(`[${new Date().toISOString()}] Chat socket connected: ID=${socket.id}, IP=${socket.handshake.address}`);

    // Handle user identification
    socket.on('identify', (data) => {
      if (!data.userId || !data.userType || !['host', 'artist'].includes(data.userType)) {
        socket.emit('error', { message: 'Invalid userId or userType' });
        console.error(`[${new Date().toISOString()}] Invalid identify data:`, data);
        return;
      }
      socket.userId = data.userId;
      socket.userType = data.userType;
      userSockets.set(data.userId, socket);
      socket.emit('info', {
        message: 'User identified for chat',
        userId: data.userId,
        userType: data.userType,
      });
      console.log(`[${new Date().toISOString()}] Chat: User identified: ${data.userId} (${data.userType})`);
    });

    // Handle chat messages
    socket.on('chat', async (data) => {
      try {
        if (!socket.userId || !data.to || !data.message || !data.receiverType || !['host', 'artist'].includes(data.receiverType)) {
          socket.emit('error', { message: 'Missing or invalid required fields for chat' });
          console.error(`[${new Date().toISOString()}] Invalid chat data:`, data);
          return;
        }

        const participants = [socket.userId.toString(), data.to.toString()].sort();
        const conversationId = participants.join('_');

        const chat = new Chat({
          senderId: socket.userId,
          receiverId: data.to,
          senderType: socket.userType,
          receiverType: data.receiverType,
          message: data.message,
          conversationId,
        });
        await chat.save();

        const messageData = {
          from: socket.userId,
          fromType: socket.userType,
          message: data.message,
          timestamp: chat.timestamp,
          conversationId,
          _id: chat._id,
        };

        // Send to recipient if online
        const recipientSocket = userSockets.get(data.to);
        if (recipientSocket) {
          recipientSocket.emit('chat', messageData);
          console.log(`[${new Date().toISOString()}] Chat: Message sent to ${data.to}:`, messageData);
        }

        // Acknowledge to sender
        socket.emit('chat', messageData);
        socket.emit('message_ack', { messageId: chat._id, status: 'sent' });
        console.log(`[${new Date().toISOString()}] Chat: Message acknowledged to sender ${socket.userId}:`, messageData);
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Chat: Error saving message:`, error.message);
        socket.emit('error', { message: 'Failed to save chat message', error: error.message });
      }
    });

    // Handle typing indicators
    socket.on('typing', (data) => {
      if (!socket.userId || !data.to) {
        socket.emit('error', { message: 'Missing userId or recipient for typing' });
        return;
      }
      const recipientSocket = userSockets.get(data.to);
      if (recipientSocket) {
        recipientSocket.emit('typing', { from: socket.userId, isTyping: data.isTyping });
        console.log(`[${new Date().toISOString()}] Chat: Typing event from ${socket.userId} to ${data.to}: ${data.isTyping}`);
      }
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      if (socket.userId) {
        userSockets.delete(socket.userId);
        console.log(`[${new Date().toISOString()}] Chat: User disconnected: ${socket.userId}, Reason: ${reason}`);
      }
    });
  });
};

module.exports = initChatSocket;