// sceneZoneNode/controllers/notificationController.js
const NotificationService = require('./notificationService');
const FCMToken = require('../model/fcmToken');

// Save FCM token
exports.saveFCMToken = async (req, res) => {
  console.log('🔔 [saveFCMToken] Request received:', {
    body: req.body,
    user: req.user,
    timestamp: new Date().toISOString()
  });

  try {
    const { fcmToken, deviceId } = req.body;
    const userId = req.user.hostId || req.user.artistId || req.user.userId;
    const userType = req.user.role;

    console.log('🔔 [saveFCMToken] Extracted data:', {
      fcmToken: fcmToken ? `${fcmToken.substring(0, 20)}...` : null,
      deviceId,
      userId,
      userType
    });

    // Use fcmToken as the unique key to avoid duplicate key errors
    const result = await FCMToken.findOneAndUpdate(
      { fcmToken }, // Match on fcmToken, not just userId/userType
      { userId, userType, deviceId, isActive: true, lastSeen: new Date() },
      { upsert: true, new: true }
    );

    console.log('🔔 [saveFCMToken] FCM token saved successfully:', {
      userId,
      userType,
      deviceId,
      isActive: result.isActive,
      lastSeen: result.lastSeen
    });

    res.json({ success: true, message: 'FCM token saved' });
  } catch (error) {
    console.error('🔔 [saveFCMToken] Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get user notifications
exports.getNotifications = async (req, res) => {
  console.log('🔔 [getNotifications] Request received:', {
    query: req.query,
    user: req.user,
    timestamp: new Date().toISOString()
  });

  try {
    const { page = 1, limit = 20 } = req.query;
    const userId = req.user.hostId || req.user.artistId || req.user.userId;
    const userType = req.user.role;

    console.log('🔔 [getNotifications] Extracted data:', {
      page: parseInt(page),
      limit: parseInt(limit),
      userId,
      userType
    });

    const result = await NotificationService.getUserNotifications(
      userId, userType, parseInt(page), parseInt(limit)
    );

    console.log('🔔 [getNotifications] Result:', {
      notificationsCount: result.notifications?.length || 0,
      total: result.total,
      page: result.page,
      limit: result.limit
    });

    res.json({ success: true, ...result });
  } catch (error) {
    console.error('🔔 [getNotifications] Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Mark as read
exports.markAsRead = async (req, res) => {
  console.log('🔔 [markAsRead] Request received:', {
    params: req.params,
    user: req.user,
    timestamp: new Date().toISOString()
  });

  try {
    const { notificationId } = req.params;
    const userId = req.user.hostId || req.user.artistId || req.user.userId;

    console.log('🔔 [markAsRead] Extracted data:', {
      notificationId,
      userId
    });

    const notification = await NotificationService.markAsRead(notificationId, userId);
    
    console.log('🔔 [markAsRead] Result:', {
      notificationFound: !!notification,
      notificationId: notification?._id,
      isRead: notification?.isRead
    });

    res.json({ success: true, notification });
  } catch (error) {
    console.error('🔔 [markAsRead] Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Mark all as read
exports.markAllAsRead = async (req, res) => {
  console.log('🔔 [markAllAsRead] Request received:', {
    user: req.user,
    timestamp: new Date().toISOString()
  });

  try {
    const userId = req.user.hostId || req.user.artistId || req.user.userId;
    const userType = req.user.role;

    console.log('🔔 [markAllAsRead] Extracted data:', {
      userId,
      userType
    });

    const result = await NotificationService.markAllAsRead(userId, userType);
    
    console.log('🔔 [markAllAsRead] Result:', {
      modifiedCount: result.modifiedCount,
      acknowledged: result.acknowledged
    });

    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error('🔔 [markAllAsRead] Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get unread count
exports.getUnreadCount = async (req, res) => {
  console.log('🔔 [getUnreadCount] Request received:', {
    user: req.user,
    timestamp: new Date().toISOString()
  });

  try {
    const userId = req.user.hostId || req.user.artistId || req.user.userId;
    const userType = req.user.role;

    console.log('🔔 [getUnreadCount] Extracted data:', {
      userId,
      userType
    });

    const count = await NotificationService.getUnreadCount(userId, userType);
    
    console.log('🔔 [getUnreadCount] Result:', {
      unreadCount: count
    });

    res.json({ success: true, count });
  } catch (error) {
    console.error('🔔 [getUnreadCount] Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Remove or deactivate FCM token (logout)
exports.removeFCMToken = async (req, res) => {
  console.log('🔔 [removeFCMToken] Request received:', {
    body: req.body,
    user: req.user,
    timestamp: new Date().toISOString()
  });

  try {
    const { fcmToken, deviceId } = req.body;
    const userId = req.user.hostId || req.user.artistId || req.user.userId;
    const userType = req.user.role;

    if (!fcmToken && !deviceId) {
      return res.status(400).json({ success: false, message: 'FCM token or device ID required' });
    }

    // Deactivate by fcmToken or deviceId for this user
    const query = { userId, userType };
    if (fcmToken) query.fcmToken = fcmToken;
    if (deviceId) query.deviceId = deviceId;

    const result = await FCMToken.findOneAndUpdate(
      query,
      { isActive: false },
      { new: true }
    );

    if (!result) {
      return res.status(404).json({ success: false, message: 'FCM token not found' });
    }

    console.log('🔔 [removeFCMToken] FCM token deactivated:', {
      userId,
      userType,
      deviceId,
      fcmToken
    });

    res.json({ success: true, message: 'FCM token deactivated' });
  } catch (error) {
    console.error('🔔 [removeFCMToken] Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};