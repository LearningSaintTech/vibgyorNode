const express = require('express');
const router = express.Router();
const { authorize } = require('../../middleware/authMiddleware');
const notificationService = require('../services/notificationService');
const ApiResponse = require('../../utils/apiResponse');
const User = require('../../user/auth/model/userAuthModel');

/**
 * Validate FCM token format
 * FCM tokens are typically 152-163 characters long and contain alphanumeric characters and colons
 * @param {string} token - FCM token to validate
 * @returns {boolean} True if valid format
 */
function validateFCMToken(token) {
  if (!token || typeof token !== 'string') {
    return false;
  }
  
  // FCM tokens are typically 152-163 characters
  if (token.length < 100 || token.length > 200) {
    return false;
  }
  
  // Should contain alphanumeric characters, colons, and hyphens
  // Format: typically starts with a prefix and contains base64-like characters
  const fcmTokenPattern = /^[A-Za-z0-9_\-:]+$/;
  return fcmTokenPattern.test(token);
}

// Attach validation function to router for use in route handlers
router.validateFCMToken = validateFCMToken;

/**
 * @route   GET /api/v1/notifications
 * @desc    Get user notifications
 * @access  Private
 */
router.get('/', authorize(), async (req, res) => {
  try {
    console.log('[NOTIFICATION ROUTES] GET /api/v1/notifications - Request received');
    const userId = req.user?.userId || req.user?.id;
    console.log('[NOTIFICATION ROUTES] User ID:', userId);
    console.log('[NOTIFICATION ROUTES] req.user:', req.user);
    
    const {
      page = 1,
      limit = 20,
      status = 'all',
      type = 'all',
      context = 'all',
      priority = 'all'
    } = req.query;

    console.log('[NOTIFICATION ROUTES] Query params:', { page, limit, status, type, context, priority });

    console.log('[NOTIFICATION ROUTES] Calling notificationService.getUserNotifications...');
    const result = await notificationService.getUserNotifications(userId, {
      page: parseInt(page),
      limit: parseInt(limit),
      status,
      type,
      context,
      priority
    });

    console.log('[NOTIFICATION ROUTES] getUserNotifications completed:', {
      notificationsCount: result.notifications?.length || 0,
      pagination: result.pagination
    });

    // Optimize response - only send essential fields
    const optimizedNotifications = result.notifications.map(notif => ({
      _id: notif._id,
      id: notif._id,
      title: notif.title,
      message: notif.message,
      type: notif.type,
      context: notif.context,
      status: notif.status,
      priority: notif.priority,
      createdAt: notif.createdAt,
      readAt: notif.readAt,
      sender: notif.sender ? {
        _id: notif.sender._id,
        username: notif.sender.username,
        fullName: notif.sender.fullName,
        profilePictureUrl: notif.sender.profilePictureUrl,
        isVerified: notif.sender.isVerified
      } : null,
      relatedContent: notif.relatedContent || {},
      data: notif.data || {}
    }));

    console.log('[NOTIFICATION ROUTES] Sending response with', optimizedNotifications.length, 'notifications');
    console.log('[NOTIFICATION ROUTES] Response data size:', JSON.stringify(optimizedNotifications).length, 'bytes');
    console.log('[NOTIFICATION ROUTES] First notification sample:', optimizedNotifications[0] ? {
      id: optimizedNotifications[0]._id,
      type: optimizedNotifications[0].type,
      title: optimizedNotifications[0].title?.substring(0, 50),
      hasSender: !!optimizedNotifications[0].sender
    } : 'none');
    
    const responseData = {
      notifications: optimizedNotifications,
      pagination: result.pagination
    };

    const responseStartTime = Date.now();
    // Use ApiResponse.success() which actually sends the response
    ApiResponse.success(res, responseData, 'Notifications retrieved successfully');
    const responseTime = Date.now() - responseStartTime;
    console.log('[NOTIFICATION ROUTES] Response sent in', responseTime, 'ms');
    console.log('[NOTIFICATION ROUTES] Response status:', res.statusCode);
  } catch (error) {
    console.error('[NOTIFICATION ROUTES] Error getting notifications:', error);
    console.error('[NOTIFICATION ROUTES] Error stack:', error.stack);
    return ApiResponse.serverError(res, error.message || 'Failed to get notifications');
  }
});

/**
 * @route   GET /api/v1/notifications/unread-count
 * @desc    Get unread notification count
 * @access  Private
 */
router.get('/unread-count', authorize(), async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { context = 'all' } = req.query;

    const count = await notificationService.getUnreadCount(userId, context);

    return ApiResponse.success(res, { count }, 'Unread count retrieved successfully');
  } catch (error) {
    console.error('[NOTIFICATION ROUTES] Error getting unread count:', error);
    return ApiResponse.serverError(res, error.message || 'Failed to get unread count');
  }
});

/**
 * @route   PUT /api/v1/notifications/:id/read
 * @desc    Mark notification as read
 * @access  Private
 */
router.put('/:id/read', authorize(), async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { id } = req.params;

    const notification = await notificationService.markAsRead(id, userId);

    return ApiResponse.success(res, { notification }, 'Notification marked as read');
  } catch (error) {
    console.error('[NOTIFICATION ROUTES] Error marking notification as read:', error);
    return ApiResponse.serverError(res, error.message || 'Failed to mark notification as read');
  }
});

/**
 * @route   PUT /api/v1/notifications/read-all
 * @desc    Mark all notifications as read
 * @access  Private
 */
router.put('/read-all', authorize(), async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { context = 'all' } = req.body;

    const result = await notificationService.markAllAsRead(userId, context);

    return ApiResponse.success(res, { modifiedCount: result.modifiedCount || 0 }, 'All notifications marked as read');
  } catch (error) {
    console.error('[NOTIFICATION ROUTES] Error marking all as read:', error);
    return ApiResponse.serverError(res, error.message || 'Failed to mark all as read');
  }
});

/**
 * @route   PUT /api/v1/notifications/:id/archive
 * @desc    Archive notification
 * @access  Private
 */
router.put('/:id/archive', authorize(), async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { id } = req.params;

    const notification = await notificationService.archive(id, userId);

    return ApiResponse.success(res, { notification }, 'Notification archived');
  } catch (error) {
    console.error('[NOTIFICATION ROUTES] Error archiving notification:', error);
    return ApiResponse.serverError(res, error.message || 'Failed to archive notification');
  }
});

/**
 * @route   GET /api/notification/test
 * @desc    Test route to verify routing works
 * @access  Public
 */
router.get('/test', (req, res) => {
  console.log('[NOTIFICATION ROUTES] ✅ Test route hit!');
  return ApiResponse.success(res, { message: 'Notification routes are working!' }, 'Test successful');
});

/**
 * @route   POST /api/notification/save-fcm-token
 * @desc    Save FCM token for push notifications
 * @access  Private
 */
router.post('/save-fcm-token', authorize(), async (req, res) => {
  console.log('[NOTIFICATION ROUTES] 🔔🔔🔔 POST /save-fcm-token - Route handler EXECUTED!');
  console.log('[NOTIFICATION ROUTES] 🔔 POST /save-fcm-token - Request received');
  console.log('[NOTIFICATION ROUTES] 📋 Request headers:', {
    authorization: req.headers.authorization ? `${req.headers.authorization.substring(0, 30)}...` : 'MISSING',
    contentType: req.headers['content-type'],
    userAgent: req.headers['user-agent']
  });
  console.log('[NOTIFICATION ROUTES] 📦 Request body:', {
    hasFcmToken: !!req.body.fcmToken,
    fcmTokenLength: req.body.fcmToken?.length,
    platform: req.body.platform,
    deviceId: req.body.deviceId,
    fullBody: req.body
  });
  console.log('[NOTIFICATION ROUTES] 🌐 Request IP:', req.ip || req.connection.remoteAddress);
  console.log('[NOTIFICATION ROUTES] ✅ Auth passed, entering route handler');
  console.log('[NOTIFICATION ROUTES] 👤 req.user:', req.user ? {
    id: req.user.id,
    userId: req.user.userId,
    role: req.user.role,
    keys: Object.keys(req.user)
  } : 'MISSING');
  console.log('[NOTIFICATION ROUTES] 📝 req.body:', req.body);
  console.log('[NOTIFICATION ROUTES] 🔍 Starting FCM token save process...');

  try {
    const userId = req.user?.userId || req.user?.id;
    console.log('[NOTIFICATION ROUTES] 🔑 Extracted userId:', userId);
    const { fcmToken, deviceId, platform } = req.body;

    console.log('[NOTIFICATION ROUTES] 📱 FCM Token Save Request:', {
      userId,
      fcmToken: fcmToken ? `${fcmToken.substring(0, 20)}...` : 'MISSING',
      deviceId,
      platform,
      deviceName: req.body.deviceName,
      appVersion: req.body.appVersion,
      fullToken: fcmToken // Log full token for debugging
    });

    if (!fcmToken || !platform) {
      console.warn('[NOTIFICATION ROUTES] ⚠️ Missing required fields:', { fcmToken: !!fcmToken, platform: !!platform });
      return ApiResponse.badRequest(res, 'FCM token and platform are required');
    }

    // Validate FCM token format
    if (!validateFCMToken(fcmToken)) {
      console.warn('[NOTIFICATION ROUTES] ⚠️ Invalid FCM token format:', fcmToken.substring(0, 30));
      return ApiResponse.badRequest(res, 'Invalid FCM token format');
    }

    // Validate platform
    const validPlatforms = ['ios', 'android', 'web'];
    if (!validPlatforms.includes(platform.toLowerCase())) {
      console.warn('[NOTIFICATION ROUTES] ⚠️ Invalid platform:', platform);
      return ApiResponse.badRequest(res, 'Invalid platform. Must be ios, android, or web');
    }

    const user = await User.findById(userId);
    if (!user) {
      console.error('[NOTIFICATION ROUTES] ❌ User not found:', userId);
      return ApiResponse.notFound(res, 'User not found');
    }

    // Add device token using User model method
    console.log('[NOTIFICATION ROUTES] 💾 Calling user.addDeviceToken...');
    await user.addDeviceToken(fcmToken, platform.toLowerCase(), {
      deviceId: deviceId || `device_${Date.now()}`,
      deviceName: req.body.deviceName || 'Unknown Device',
      appVersion: req.body.appVersion || '1.0.0'
    });
    console.log('[NOTIFICATION ROUTES] 💾 addDeviceToken completed');

    console.log('[NOTIFICATION ROUTES] ✅ FCM Token saved successfully for user:', userId);
    console.log('[NOTIFICATION ROUTES] 📤 Sending success response...');

    return ApiResponse.success(res, { success: true }, 'FCM token saved successfully');
  } catch (error) {
    console.error('[NOTIFICATION ROUTES] ❌ Error saving FCM token:', error);
    console.error('[NOTIFICATION ROUTES] ❌ Error name:', error.name);
    console.error('[NOTIFICATION ROUTES] ❌ Error message:', error.message);
    console.error('[NOTIFICATION ROUTES] ❌ Error stack:', error.stack);
    console.error('[NOTIFICATION ROUTES] ❌ Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    return ApiResponse.serverError(res, error.message || 'Failed to save FCM token');
  }
});

/**
 * @route   DELETE /api/notification/remove-fcm-token
 * @desc    Remove FCM token
 * @access  Private
 * @note    This route MUST come before DELETE /:id to avoid route conflict
 */
router.delete('/remove-fcm-token', authorize(), async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const { fcmToken, deviceId } = req.body;

    console.log('[NOTIFICATION ROUTES] 🗑️ FCM Token Remove Request:', {
      userId,
      fcmToken: fcmToken ? `${fcmToken.substring(0, 20)}...` : 'MISSING',
      deviceId,
      fullToken: fcmToken // Log full token for debugging
    });

    if (!fcmToken) {
      console.warn('[NOTIFICATION ROUTES] ⚠️ FCM token is required');
      return ApiResponse.badRequest(res, 'FCM token is required');
    }

    const user = await User.findById(userId);
    if (!user) {
      console.error('[NOTIFICATION ROUTES] ❌ User not found:', userId);
      return ApiResponse.notFound(res, 'User not found');
    }

    // Remove device token using User model method
    await user.removeDeviceToken(fcmToken);

    console.log('[NOTIFICATION ROUTES] ✅ FCM Token removed successfully for user:', userId);

    return ApiResponse.success(res, { success: true }, 'FCM token removed successfully');
  } catch (error) {
    console.error('[NOTIFICATION ROUTES] Error removing FCM token:', error);
    return ApiResponse.serverError(res, error.message || 'Failed to remove FCM token');
  }
});

/**
 * @route   DELETE /api/v1/notifications/:id
 * @desc    Delete notification
 * @access  Private
 * @note    This route MUST come AFTER specific routes like /remove-fcm-token
 */
router.delete('/:id', authorize(), async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const { id } = req.params;

    // Validate that id is a valid ObjectId (not a route name)
    if (!id || id.match(/^[0-9a-fA-F]{24}$/) === null) {
      return ApiResponse.badRequest(res, 'Invalid notification ID');
    }

    const notification = await notificationService.delete(id, userId);

    return ApiResponse.success(res, { notification }, 'Notification deleted');
  } catch (error) {
    console.error('[NOTIFICATION ROUTES] Error deleting notification:', error);
    return ApiResponse.serverError(res, error.message || 'Failed to delete notification');
  }
});

module.exports = router;

