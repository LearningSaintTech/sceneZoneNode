// sceneZoneNode/utils/notificationUtils.js
const FCMToken = require('../Notification/model/fcmToken');
const Event = require('../Host/models/Events/event');
const Notification = require('../Notification/model/notification');

class NotificationUtils {
  // Check FCM token status for a user
  static async checkFCMTokenStatus(userId, userType) {
    console.log('🔍 NotificationUtils] Checking FCM token status:', { userId, userType });
    
    try {
      const fcmToken = await FCMToken.findOne({ userId, userType });
      
      if (!fcmToken) {
        console.log('🔍 NotificationUtils] No FCM token found for user:', { userId, userType });
        return {
          hasToken: false,
          isActive: false,
          lastSeen: null,
          message: 'No FCM token found'
        };
      }
      
      console.log('🔍 NotificationUtils] FCM token found:', {
        userId: fcmToken.userId,
        userType: fcmToken.userType,
        isActive: fcmToken.isActive,
        lastSeen: fcmToken.lastSeen,
        hasToken: !!fcmToken.fcmToken
      });
      
      return {
        hasToken: !!fcmToken.fcmToken,
        isActive: fcmToken.isActive,
        lastSeen: fcmToken.lastSeen,
        message: fcmToken.isActive ? 'FCM token is active' : 'FCM token is inactive'
      };
    } catch (error) {
      console.error('🔍 NotificationUtils] Error checking FCM token:', error);
      return {
        hasToken: false,
        isActive: false,
        lastSeen: null,
        message: 'Error checking FCM token'
      };
    }
  }

  // Check event assignment status
  static async checkEventAssignment(eventId) {
    console.log('🔍 NotificationUtils] Checking event assignment:', { eventId });
    
    try {
      const event = await Event.findById(eventId).populate('assignedArtists', 'fullName mobileNumber');
      
      if (!event) {
        console.log('🔍 NotificationUtils] Event not found:', { eventId });
        return {
          eventFound: false,
          assignedArtists: [],
          message: 'Event not found'
        };
      }
      
      console.log('🔍 NotificationUtils] Event found:', {
        eventId: event._id,
        eventName: event.eventName,
        assignedArtistsCount: event.assignedArtists?.length || 0,
        assignedArtists: event.assignedArtists?.map(a => ({id: a._id, name: a.fullName })) || []
      });
      
      return {
        eventFound: true,
        assignedArtists: event.assignedArtists || [],
        message: `Event has ${event.assignedArtists?.length || 0} assigned artists`
      };
    } catch (error) {
      console.error('🔍 NotificationUtils] Error checking event assignment:', error);
      return {
        eventFound: false,
        assignedArtists: [],
        message: 'Error checking event assignment'
      };
    }
  }

  // Get notification statistics for a user
  static async getNotificationStats(userId, userType) {
    console.log('🔍 NotificationUtils] Getting notification stats:', { userId, userType });
    
    try {
      const totalNotifications = await Notification.countDocuments({ recipientId: userId, recipientType: userType });
      const unreadNotifications = await Notification.countDocuments({ 
        recipientId: userId, 
        recipientType: userType, 
        isRead: false 
      });
      const pushSentNotifications = await Notification.countDocuments({ 
        recipientId: userId, 
        recipientType: userType, 
        isPushSent: true 
      });
      
      console.log('🔍 NotificationUtils] Notification stats:', {
        userId,
        userType,
        total: totalNotifications,
        unread: unreadNotifications,
        pushSent: pushSentNotifications
      });
      
      return {
        total: totalNotifications,
        unread: unreadNotifications,
        pushSent: pushSentNotifications,
        message: `User has ${totalNotifications} total, ${unreadNotifications} unread, ${pushSentNotifications} push sent notifications`
      };
    } catch (error) {
      console.error('🔍 NotificationUtils] Error getting notification stats:', error);
      return {
        total: 0,
        unread: 0,
        pushSent: 0,
        message: 'Error getting notification stats'
      };
    }
  }

  // Comprehensive notification health check
  static async performHealthCheck(userId, userType, eventId = null) {
    console.log('🔍 NotificationUtils] Performing comprehensive health check:', { userId, userType, eventId });
    
    const results = {
      timestamp: new Date().toISOString(),
      userId,
      userType,
      fcmTokenStatus: null,
      notificationStats: null,
      eventAssignment: null,
      issues: [],
      recommendations: []
    };
    
    try {
      // Check FCM token status
      results.fcmTokenStatus = await this.checkFCMTokenStatus(userId, userType);
      if (!results.fcmTokenStatus.hasToken) {
        results.issues.push('No FCM token found');
        results.recommendations.push('User needs to log in to the app to save FCM token');
      } else if (!results.fcmTokenStatus.isActive) {
        results.issues.push('FCM token is inactive');
        results.recommendations.push('User needs to log in to the app to reactivate FCM token');
      }
      
      // Check notification stats
      results.notificationStats = await this.getNotificationStats(userId, userType);
      
      // Check event assignment if eventId provided
      if (eventId) {
        results.eventAssignment = await this.checkEventAssignment(eventId);
        if (!results.eventAssignment.assignedArtists.length) {
          results.issues.push('No artists assigned to event');
          results.recommendations.push('Assign artists to the event or ensure host receives notifications');
        }
      }
      
      console.log('🔍 NotificationUtils] Health check completed:', results);
      return results;
      
    } catch (error) {
      console.error('🔍 NotificationUtils] Error performing health check:', error);
      results.issues.push('Error performing health check');
      results.recommendations.push('Check server logs for detailed error information');
      return results;
    }
  }

  // Force save FCM token (for testing)
  static async forceSaveFCMToken(userId, userType, fcmToken, deviceId) {
    console.log('🔍 NotificationUtils] Force saving FCM token:', { userId, userType, deviceId });
    
    try {
      const result = await FCMToken.findOneAndUpdate(
        { userId, userType },
        { fcmToken, deviceId, isActive: true, lastSeen: new Date() },
        { upsert: true, new: true }
      );
      
      console.log('🔍 NotificationUtils] FCM token force saved:', {
        userId: result.userId,
        userType: result.userType,
        isActive: result.isActive,
        lastSeen: result.lastSeen
      });
      
      return {
        success: true,
        message: 'FCM token force saved successfully',
        data: result
      };
    } catch (error) {
      console.error('🔍 NotificationUtils] Error force saving FCM token:', error);
      return {
        success: false,
        message: 'Error force saving FCM token',
        error: error.message
      };
    }
  }

  // Test notification sending
  static async testNotification(userId, userType, title = 'Test Notification', body = 'This is a test notification') {
    console.log('🔍 NotificationUtils] Testing notification:', { userId, userType, title, body });
    
    try {
      const NotificationService = require('../Notification/controller/notificationService');
      
      const testNotification = await NotificationService.createAndSendNotification({
        recipientId: userId,
        recipientType: userType,
        senderId: userId, // Self-send for testing
        senderType: userType,
        title,
        body,
        type: 'system_alert',
        data: {
          test: true,
          timestamp: new Date().toISOString()
        }
      });
      
      console.log('🔍 NotificationUtils] Test notification sent:', {
        notificationId: testNotification._id,
        title: testNotification.title,
        type: testNotification.type
      });
      
      return {
        success: true,
        message: 'Test notification sent successfully',
        notificationId: testNotification._id
      };
    } catch (error) {
      console.error('🔍 NotificationUtils] Error sending test notification:', error);
      return {
        success: false,
        message: 'Error sending test notification',
        error: error.message
      };
    }
  }
}

module.exports = NotificationUtils; 