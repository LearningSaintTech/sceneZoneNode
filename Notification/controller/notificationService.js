// sceneZoneNode/services/notificationService.js
const admin = require('firebase-admin');
const Notification = require('../model/notification');
const FCMToken = require('../model/fcmToken');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  const serviceAccount = {
    type: process.env.FIREBASE_TYPE,
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: process.env.FIREBASE_AUTH_URI,
    token_uri: process.env.FIREBASE_TOKEN_URI,
    auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
    client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
    universe_domain: process.env.FIREBASE_UNIVERSE_DOMAIN,
  };

  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('🔔 [NotificationService] Firebase Admin initialized successfully');
  } catch (error) {
    console.error('🔔 [NotificationService] Firebase Admin initialization error:', error);
  }
}

class NotificationService {
  // Create notification and send push
  static async createAndSendNotification(notificationData) {
    console.log('🔔 [createAndSendNotification] Starting:', {
      recipientId: notificationData.recipientId,
      recipientType: notificationData.recipientType,
      type: notificationData.type,
      title: notificationData.title,
      timestamp: new Date().toISOString()
    });

    try {
      // 1. Save to database
      console.log('🔔 [createAndSendNotification] Saving to database...');
      const notification = new Notification(notificationData);
      await notification.save();
      console.log('🔔 [createAndSendNotification] Saved to database:', {
        notificationId: notification._id,
        createdAt: notification.createdAt
      });

      // 2. Send push notification
      console.log('🔔 [createAndSendNotification] Sending push notification...');
      await this.sendPushNotification(notificationData);

      console.log('🔔 [createAndSendNotification] Completed successfully');
      return notification;
    } catch (error) {
      console.error('🔔 [createAndSendNotification] Error:', error);
      throw error;
    }
  }

  // Send push notification via FCM
  static async sendPushNotification(notificationData) {
    console.log('🔔 [sendPushNotification] Starting:', {
      recipientId: notificationData.recipientId,
      recipientType: notificationData.recipientType,
      title: notificationData.title,
      type: notificationData.type,
      timestamp: new Date().toISOString()
    });

    try {
      const { recipientId, recipientType, title, body, data } = notificationData;
      
      // Get FCM token
      console.log('🔔 [sendPushNotification] Looking for FCM token...');
      const fcmToken = await FCMToken.findOne({ 
        userId: recipientId, 
        userType: recipientType,
        isActive: true 
      });

      if (!fcmToken) {
        console.log('🔔 [sendPushNotification] No FCM token found for user:', {
          recipientId,
          recipientType
        });
        return;
      }

      console.log('🔔 [sendPushNotification] FCM token found:', {
        userId: fcmToken.userId,
        userType: fcmToken.userType,
        isActive: fcmToken.isActive,
        lastSeen: fcmToken.lastSeen
      });

      // Send FCM message
      const message = {
        token: fcmToken.fcmToken,
        notification: {
          title,
          body
        },
        data: {
          type: notificationData.type,
          chatId: data?.chatId?.toString() || '',
          eventId: data?.eventId?.toString() || '',
          notificationId: notificationData._id?.toString() || ''
        },
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'chat_messages'
          }
        },
        apns: {
          payload: {
            aps: {
              sound: 'default'
            }
          }
        }
      };

      console.log('🔔 [sendPushNotification] Sending FCM message:', {
        token: fcmToken.fcmToken ? `${fcmToken.fcmToken.substring(0, 20)}...` : null,
        title,
        body,
        data: message.data
      });

      const response = await admin.messaging().send(message);
      console.log('🔔 [sendPushNotification] FCM response:', response);
      
      // Update notification as sent
      console.log('🔔 [sendPushNotification] Updating notification as sent...');
      await Notification.findByIdAndUpdate(notificationData._id, { isPushSent: true });
      console.log('🔔 [sendPushNotification] Notification marked as sent');
      
    } catch (error) {
      console.error('🔔 [sendPushNotification] Error:', error);
    }
  }

  // Get user notifications
  static async getUserNotifications(userId, userType, page = 1, limit = 20) {
    console.log('🔔 [getUserNotifications] Starting:', {
      userId,
      userType,
      page,
      limit,
      timestamp: new Date().toISOString()
    });

    const skip = (page - 1) * limit;
    
    console.log('🔔 [getUserNotifications] Querying notifications...');
    const notifications = await Notification.find({
      recipientId: userId,
      recipientType: userType
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

    console.log('🔔 [getUserNotifications] Notifications found:', {
      count: notifications.length,
      notifications: notifications.map(n => ({
        id: n._id,
        type: n.type,
        title: n.title,
        isRead: n.isRead,
        createdAt: n.createdAt
      }))
    });

    console.log('🔔 [getUserNotifications] Counting total...');
    const total = await Notification.countDocuments({
      recipientId: userId,
      recipientType: userType
    });

    console.log('🔔 [getUserNotifications] Total count:', total);

    const result = { notifications, total, page, limit };
    console.log('🔔 [getUserNotifications] Returning result:', {
      notificationsCount: result.notifications.length,
      total: result.total,
      page: result.page,
      limit: result.limit
    });

    return result;
  }

  // Mark notification as read
  static async markAsRead(notificationId, userId) {
    console.log('🔔 [markAsRead] Starting:', {
      notificationId,
      userId,
      timestamp: new Date().toISOString()
    });

    const result = await Notification.findOneAndUpdate(
      { _id: notificationId, recipientId: userId },
      { isRead: true },
      { new: true }
    );

    console.log('🔔 [markAsRead] Result:', {
      notificationFound: !!result,
      notificationId: result?._id,
      isRead: result?.isRead,
      title: result?.title
    });

    return result;
  }

  // Mark all notifications as read
  static async markAllAsRead(userId, userType) {
    console.log('🔔 [markAllAsRead] Starting:', {
      userId,
      userType,
      timestamp: new Date().toISOString()
    });

    const result = await Notification.updateMany(
      { recipientId: userId, recipientType: userType, isRead: false },
      { isRead: true }
    );

    console.log('🔔 [markAllAsRead] Result:', {
      modifiedCount: result.modifiedCount,
      acknowledged: result.acknowledged,
      matchedCount: result.matchedCount
    });

    return result;
  }

  // Get unread count
  static async getUnreadCount(userId, userType) {
    console.log('🔔 [getUnreadCount] Starting:', {
      userId,
      userType,
      timestamp: new Date().toISOString()
    });

    const count = await Notification.countDocuments({
      recipientId: userId,
      recipientType: userType,
      isRead: false
    });

    console.log('🔔 [getUnreadCount] Result:', {
      unreadCount: count
    });

    return count;
  }
}

module.exports = NotificationService;