// sceneZoneNode/Notification/controller/notificationDebugController.js
const NotificationUtils = require('../../utils/notificationUtils');
const { apiResponse } = require('../../utils/apiResponse');

// Debug endpoint to check notification health
exports.debugNotificationHealth = async (req, res) => {
  console.log('🔍 [debugNotificationHealth] Request received:', {
    user: req.user,
    query: req.query,
    timestamp: new Date().toISOString()
  });

  try {
    const { eventId } = req.query;
    const userId = req.user.hostId || req.user.artistId || req.user.userId;
    const userType = req.user.role;

    if (!userId || !userType) {
      return apiResponse(res, {
        success: false,
        message: 'User information not found',
        statusCode: 400
      });
    }

    console.log('🔍 [debugNotificationHealth] Performing health check:', { userId, userType, eventId });
    const healthCheck = await NotificationUtils.performHealthCheck(userId, userType, eventId);

    return apiResponse(res, {
      success: true,
      message: 'Notification health check completed',
      data: healthCheck
    });
  } catch (error) {
    console.error('🔍 [debugNotificationHealth] Error:', error);
    return apiResponse(res, {
      success: false,
      message: 'Error performing health check',
      error: error.message,
      statusCode: 500
    });
  }
};

// Debug endpoint to test notification sending
exports.testNotification = async (req, res) => {
  console.log('🔍 [testNotification] Request received:', {
    user: req.user,
    body: req.body,
    timestamp: new Date().toISOString()
  });

  try {
    const { title, body } = req.body;
    const userId = req.user.hostId || req.user.artistId || req.user.userId;
    const userType = req.user.role;

    if (!userId || !userType) {
      return apiResponse(res, {
        success: false,
        message: 'User information not found',
        statusCode: 400
      });
    }

    console.log('🔍 [testNotification] Sending test notification:', { userId, userType, title, body });
    const result = await NotificationUtils.testNotification(userId, userType, title, body);

    if (result.success) {
      return apiResponse(res, {
        success: true,
        message: 'Test notification sent successfully',
        data: result
      });
    } else {
      return apiResponse(res, {
        success: false,
        message: 'Failed to send test notification',
        error: result.error,
        statusCode: 500
      });
    }
  } catch (error) {
    console.error('🔍 [testNotification] Error:', error);
    return apiResponse(res, {
      success: false,
      message: 'Error sending test notification',
      error: error.message,
      statusCode: 500
    });
  }
};

// Debug endpoint to force save FCM token
exports.forceSaveFCMToken = async (req, res) => {
  console.log('�� forceSaveFCMToken] Request received:', {
    user: req.user,
    body: req.body,
    timestamp: new Date().toISOString()
  });

  try {
    const { fcmToken, deviceId } = req.body;
    const userId = req.user.hostId || req.user.artistId || req.user.userId;
    const userType = req.user.role;

    if (!userId || !userType) {
      return apiResponse(res, {
        success: false,
        message: 'User information not found',
        statusCode: 400
      });
    }

    if (!fcmToken || !deviceId) {
      return apiResponse(res, {
        success: false,
        message: 'FCM token and device ID are required',
        statusCode: 400
      });
    }

    console.log('🔍 forceSaveFCMToken] Force saving FCM token:', { userId, userType, deviceId });
    const result = await NotificationUtils.forceSaveFCMToken(userId, userType, fcmToken, deviceId);

    if (result.success) {
      return apiResponse(res, {
        success: true,
        message: 'FCM token force saved successfully',
        data: result.data
      });
    } else {
      return apiResponse(res, {
        success: false,
        message: 'Failed to force save FCM token',
        error: result.error,
        statusCode: 500
      });
    }
  } catch (error) {
    console.error('🔍 forceSaveFCMToken] Error:', error);
    return apiResponse(res, {
      success: false,
      message: 'Error force saving FCM token',
      error: error.message,
      statusCode: 500
    });
  }
};

// Debug endpoint to get notification statistics
exports.getNotificationStats = async (req, res) => {
  console.log('🔍 [getNotificationStats] Request received:', {
    user: req.user,
    timestamp: new Date().toISOString()
  });

  try {
    const userId = req.user.hostId || req.user.artistId || req.user.userId;
    const userType = req.user.role;

    if (!userId || !userType) {
      return apiResponse(res, {
        success: false,
        message: 'User information not found',
        statusCode: 400
      });
    }

    console.log('🔍 [getNotificationStats] Getting notification stats:', { userId, userType });
    const stats = await NotificationUtils.getNotificationStats(userId, userType);

    return apiResponse(res, {
      success: true,
      message: 'Notification statistics retrieved',
      data: stats
    });
  } catch (error) {
    console.error('🔍 [getNotificationStats] Error:', error);
    return apiResponse(res, {
      success: false,
      message: 'Error getting notification statistics',
      error: error.message,
      statusCode: 500
    });
  }
};

// Debug endpoint to check FCM token status
exports.checkFCMTokenStatus = async (req, res) => {
  console.log('🔍 [checkFCMTokenStatus] Request received:', {
    user: req.user,
    timestamp: new Date().toISOString()
  });

  try {
    const userId = req.user.hostId || req.user.artistId || req.user.userId;
    const userType = req.user.role;

    if (!userId || !userType) {
      return apiResponse(res, {
        success: false,
        message: 'User information not found',
        statusCode: 400
      });
    }

    console.log('🔍 [checkFCMTokenStatus] Checking FCM token status:', { userId, userType });
    const status = await NotificationUtils.checkFCMTokenStatus(userId, userType);

    return apiResponse(res, {
      success: true,
      message: 'FCM token status checked',
      data: status
    });
  } catch (error) {
    console.error('🔍 [checkFCMTokenStatus] Error:', error);
    return apiResponse(res, {
      success: false,
      message: 'Error checking FCM token status',
      error: error.message,
      statusCode: 500
    });
  }
};

// Debug endpoint to check event assignment
exports.checkEventAssignment = async (req, res) => {
  console.log('🔍 [checkEventAssignment] Request received:', {
    user: req.user,
    params: req.params,
    timestamp: new Date().toISOString()
  });

  try {
    const { eventId } = req.params;

    if (!eventId) {
      return apiResponse(res, {
        success: false,
        message: 'Event ID is required',
        statusCode: 400
      });
    }

    console.log('🔍 [checkEventAssignment] Checking event assignment:', { eventId });
    const assignment = await NotificationUtils.checkEventAssignment(eventId);

    return apiResponse(res, {
      success: true,
      message: 'Event assignment checked',
      data: assignment
    });
  } catch (error) {
    console.error('🔍 [checkEventAssignment] Error:', error);
    return apiResponse(res, {
      success: false,
      message: 'Error checking event assignment',
      error: error.message,
      statusCode: 50
    });
  }
}; 