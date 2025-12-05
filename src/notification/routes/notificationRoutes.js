const express = require('express');
const router = express.Router();
const { authorize } = require('../../middleware/authMiddleware');
const notificationService = require('../services/notificationService');
const ApiResponse = require('../../utils/apiResponse');
const User = require('../../user/auth/model/userAuthModel');

/**
 * @route   GET /api/v1/notifications
 * @desc    Get user notifications
 * @access  Private
 */
router.get('/', authorize(), async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      page = 1,
      limit = 20,
      status = 'all',
      type = 'all',
      context = 'all',
      priority = 'all'
    } = req.query;

    const result = await notificationService.getUserNotifications(userId, {
      page: parseInt(page),
      limit: parseInt(limit),
      status,
      type,
      context,
      priority
    });

    return ApiResponse.createResponse(res, {
      notifications: result.notifications,
      pagination: result.pagination
    }, 'Notifications retrieved successfully');
  } catch (error) {
    console.error('[NOTIFICATION ROUTES] Error getting notifications:', error);
    return ApiResponse.createErrorResponse(res, error.message || 'Failed to get notifications', 500);
  }
});

/**
 * @route   GET /api/v1/notifications/unread-count
 * @desc    Get unread notification count
 * @access  Private
 */
router.get('/unread-count', authorize(), async (req, res) => {
  try {
    const userId = req.user.id;
    const { context = 'all' } = req.query;

    const count = await notificationService.getUnreadCount(userId, context);

    return ApiResponse.createResponse(res, {
      count
    }, 'Unread count retrieved successfully');
  } catch (error) {
    console.error('[NOTIFICATION ROUTES] Error getting unread count:', error);
    return ApiResponse.createErrorResponse(res, error.message || 'Failed to get unread count', 500);
  }
});

/**
 * @route   PUT /api/v1/notifications/:id/read
 * @desc    Mark notification as read
 * @access  Private
 */
router.put('/:id/read', authorize(), async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const notification = await notificationService.markAsRead(id, userId);

    return ApiResponse.createResponse(res, {
      notification
    }, 'Notification marked as read');
  } catch (error) {
    console.error('[NOTIFICATION ROUTES] Error marking notification as read:', error);
    return ApiResponse.createErrorResponse(res, error.message || 'Failed to mark notification as read', 500);
  }
});

/**
 * @route   PUT /api/v1/notifications/read-all
 * @desc    Mark all notifications as read
 * @access  Private
 */
router.put('/read-all', authorize(), async (req, res) => {
  try {
    const userId = req.user.id;
    const { context = 'all' } = req.body;

    const result = await notificationService.markAllAsRead(userId, context);

    return ApiResponse.createResponse(res, {
      modifiedCount: result.modifiedCount || 0
    }, 'All notifications marked as read');
  } catch (error) {
    console.error('[NOTIFICATION ROUTES] Error marking all as read:', error);
    return ApiResponse.createErrorResponse(res, error.message || 'Failed to mark all as read', 500);
  }
});

/**
 * @route   PUT /api/v1/notifications/:id/archive
 * @desc    Archive notification
 * @access  Private
 */
router.put('/:id/archive', authorize(), async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const notification = await notificationService.archive(id, userId);

    return ApiResponse.createResponse(res, {
      notification
    }, 'Notification archived');
  } catch (error) {
    console.error('[NOTIFICATION ROUTES] Error archiving notification:', error);
    return ApiResponse.createErrorResponse(res, error.message || 'Failed to archive notification', 500);
  }
});

/**
 * @route   DELETE /api/v1/notifications/:id
 * @desc    Delete notification
 * @access  Private
 */
router.delete('/:id', authorize(), async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const notification = await notificationService.delete(id, userId);

    return ApiResponse.createResponse(res, {
      notification
    }, 'Notification deleted');
  } catch (error) {
    console.error('[NOTIFICATION ROUTES] Error deleting notification:', error);
    return ApiResponse.createErrorResponse(res, error.message || 'Failed to delete notification', 500);
  }
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
    const userId = req.user?.id || req.user?.userId;
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
      return ApiResponse.createErrorResponse(res, 'FCM token and platform are required', 400);
    }

    const user = await User.findById(userId);
    if (!user) {
      console.error('[NOTIFICATION ROUTES] ❌ User not found:', userId);
      return ApiResponse.createErrorResponse(res, 'User not found', 404);
    }

    // Add device token using User model method
    console.log('[NOTIFICATION ROUTES] 💾 Calling user.addDeviceToken...');
    await user.addDeviceToken(fcmToken, platform, {
      deviceId: deviceId || `device_${Date.now()}`,
      deviceName: req.body.deviceName || 'Unknown Device',
      appVersion: req.body.appVersion || '1.0.0'
    });
    console.log('[NOTIFICATION ROUTES] 💾 addDeviceToken completed');

    console.log('[NOTIFICATION ROUTES] ✅ FCM Token saved successfully for user:', userId);
    console.log('[NOTIFICATION ROUTES] 📤 Sending success response...');

    return ApiResponse.createResponse(res, {
      success: true
    }, 'FCM token saved successfully');
  } catch (error) {
    console.error('[NOTIFICATION ROUTES] ❌ Error saving FCM token:', error);
    console.error('[NOTIFICATION ROUTES] ❌ Error name:', error.name);
    console.error('[NOTIFICATION ROUTES] ❌ Error message:', error.message);
    console.error('[NOTIFICATION ROUTES] ❌ Error stack:', error.stack);
    console.error('[NOTIFICATION ROUTES] ❌ Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    return ApiResponse.createErrorResponse(res, error.message || 'Failed to save FCM token', 500);
  }
});

/**
 * @route   DELETE /api/notification/remove-fcm-token
 * @desc    Remove FCM token
 * @access  Private
 */
router.delete('/remove-fcm-token', authorize(), async (req, res) => {
  try {
    const userId = req.user.id;
    const { fcmToken, deviceId } = req.body;

    console.log('[NOTIFICATION ROUTES] 🗑️ FCM Token Remove Request:', {
      userId,
      fcmToken: fcmToken ? `${fcmToken.substring(0, 20)}...` : 'MISSING',
      deviceId,
      fullToken: fcmToken // Log full token for debugging
    });

    if (!fcmToken) {
      console.warn('[NOTIFICATION ROUTES] ⚠️ FCM token is required');
      return ApiResponse.createErrorResponse(res, 'FCM token is required', 400);
    }

    const user = await User.findById(userId);
    if (!user) {
      console.error('[NOTIFICATION ROUTES] ❌ User not found:', userId);
      return ApiResponse.createErrorResponse(res, 'User not found', 404);
    }

    // Remove device token using User model method
    await user.removeDeviceToken(fcmToken);

    console.log('[NOTIFICATION ROUTES] ✅ FCM Token removed successfully for user:', userId);

    return ApiResponse.createResponse(res, {
      success: true
    }, 'FCM token removed successfully');
  } catch (error) {
    console.error('[NOTIFICATION ROUTES] Error removing FCM token:', error);
    return ApiResponse.createErrorResponse(res, error.message || 'Failed to remove FCM token', 500);
  }
});

module.exports = router;

