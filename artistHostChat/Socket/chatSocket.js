import io from 'socket.io-client';

// Initialize Socket.IO connection
const socket = io('https://api.thescenezone.com', {
  transports: ['websocket'],
  autoConnect: false,
});

const ChatService = {
  connect: (userId) => {
    return new Promise((resolve, reject) => {
      socket.connect();

      socket.on('connect', () => {
        console.log('Connected to Socket.IO server');
        socket.emit('join', userId);
        resolve();
      });

      socket.on('connect_error', (error) => {
        console.error('Socket.IO connection error:', error);
        reject(error);
      });
    });
  },

  onNewMessage: (callback) => {
    socket.on('newMessage', (chat) => {
      console.log('New message received:', chat);
      callback(chat);
    });
  },

  onNewChat: (callback) => {
    socket.on('newChat', (chat) => {
      console.log('New chat received:', chat);
      callback(chat);
    });
  },

  onPriceApproved: (callback) => {
    socket.on('priceApproved', (chat) => {
      console.log('Price approved:', chat);
      callback(chat);
    });
  },

  disconnect: () => {
    socket.disconnect();
    console.log('Disconnected from Socket.IO server');
  },
};

export default ChatService;