const express = require('express');
const router = express.Router();
const { authorize } = require('../../../middleware/authMiddleware');
const notificationService = require('../../../services/notificationService');
const ApiResponse = require('../../../utils/apiResponse');

// Apply authentication middleware to all routes
router.use(authorize());

// ===== NOTIFICATION RETRIEVAL =====

/**
 * @route GET /user/notifications
 * @desc Get user notifications
 * @access Private
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { 
      page = 1, 
      limit = 20, 
      status = 'all', 
      type = 'all', 
      priority = 'all' 
    } = req.query;

    const notifications = await notificationService.getUserNotifications(userId, {
      page: parseInt(page),
      limit: parseInt(limit),
      status,
      type,
      priority
    });

    const unreadCount = await notificationService.getUnreadCount(userId);

    return ApiResponse.success(res, {
      notifications,
      unreadCount,
      pagination: {
        currentPage: parseInt(page),
        limit: parseInt(limit),
        status,
        type,
        priority
      }
    }, 'Notifications retrieved successfully');
  } catch (error) {
    console.error('[NOTIFICATION] Get notifications error:', error);
    return ApiResponse.serverError(res, 'Failed to get notifications');
  }
});

/**
 * @route GET /user/notifications/unread-count
 * @desc Get unread notification count
 * @access Private
 */
router.get('/unread-count', async (req, res) => {
  try {
    const userId = req.user?.userId;
    const unreadCount = await notificationService.getUnreadCount(userId);

    return ApiResponse.success(res, {
      unreadCount
    }, 'Unread count retrieved successfully');
  } catch (error) {
    console.error('[NOTIFICATION] Get unread count error:', error);
    return ApiResponse.serverError(res, 'Failed to get unread count');
  }
});

/**
 * @route GET /user/notifications/:notificationId
 * @desc Get single notification
 * @access Private
 */
router.get('/:notificationId', async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user?.userId;

    const Notification = require('../userModel/notificationModel');
    const notification = await Notification.findOne({
      _id: notificationId,
      recipient: userId
    })
    .populate('sender', 'username fullName profilePictureUrl isVerified')
    .populate('relatedContent.contentId');

    if (!notification) {
      return ApiResponse.notFound(res, 'Notification not found');
    }

    return ApiResponse.success(res, notification, 'Notification retrieved successfully');
  } catch (error) {
    console.error('[NOTIFICATION] Get notification error:', error);
    return ApiResponse.serverError(res, 'Failed to get notification');
  }
});

// ===== NOTIFICATION ACTIONS =====

/**
 * @route PUT /user/notifications/:notificationId/read
 * @desc Mark notification as read
 * @access Private
 */
router.put('/:notificationId/read', async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user?.userId;

    const notification = await notificationService.markAsRead(notificationId, userId);

    if (!notification) {
      return ApiResponse.notFound(res, 'Notification not found');
    }

    return ApiResponse.success(res, notification, 'Notification marked as read');
  } catch (error) {
    console.error('[NOTIFICATION] Mark as read error:', error);
    return ApiResponse.serverError(res, 'Failed to mark notification as read');
  }
});

/**
 * @route PUT /user/notifications/:notificationId/unread
 * @desc Mark notification as unread
 * @access Private
 */
router.put('/:notificationId/unread', async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user?.userId;

    const Notification = require('../userModel/notificationModel');
    const notification = await Notification.findOne({
      _id: notificationId,
      recipient: userId
    });

    if (!notification) {
      return ApiResponse.notFound(res, 'Notification not found');
    }

    await notification.markAsUnread();

    return ApiResponse.success(res, notification, 'Notification marked as unread');
  } catch (error) {
    console.error('[NOTIFICATION] Mark as unread error:', error);
    return ApiResponse.serverError(res, 'Failed to mark notification as unread');
  }
});

/**
 * @route PUT /user/notifications/:notificationId/archive
 * @desc Archive notification
 * @access Private
 */
router.put('/:notificationId/archive', async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user?.userId;

    const Notification = require('../userModel/notificationModel');
    const notification = await Notification.findOne({
      _id: notificationId,
      recipient: userId
    });

    if (!notification) {
      return ApiResponse.notFound(res, 'Notification not found');
    }

    await notification.archive();

    return ApiResponse.success(res, notification, 'Notification archived');
  } catch (error) {
    console.error('[NOTIFICATION] Archive notification error:', error);
    return ApiResponse.serverError(res, 'Failed to archive notification');
  }
});

/**
 * @route DELETE /user/notifications/:notificationId
 * @desc Delete notification
 * @access Private
 */
router.delete('/:notificationId', async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user?.userId;

    const Notification = require('../userModel/notificationModel');
    const notification = await Notification.findOne({
      _id: notificationId,
      recipient: userId
    });

    if (!notification) {
      return ApiResponse.notFound(res, 'Notification not found');
    }

    await notification.delete();

    return ApiResponse.success(res, null, 'Notification deleted');
  } catch (error) {
    console.error('[NOTIFICATION] Delete notification error:', error);
    return ApiResponse.serverError(res, 'Failed to delete notification');
  }
});

/**
 * @route PUT /user/notifications/read-all
 * @desc Mark all notifications as read
 * @access Private
 */
router.put('/read-all', async (req, res) => {
  try {
    const userId = req.user?.userId;
    const result = await notificationService.markAllAsRead(userId);

    return ApiResponse.success(res, {
      modifiedCount: result.modifiedCount
    }, 'All notifications marked as read');
  } catch (error) {
    console.error('[NOTIFICATION] Mark all as read error:', error);
    return ApiResponse.serverError(res, 'Failed to mark all notifications as read');
  }
});

/**
 * @route POST /user/notifications/:notificationId/click
 * @desc Record notification click
 * @access Private
 */
router.post('/:notificationId/click', async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user?.userId;

    const Notification = require('../userModel/notificationModel');
    const notification = await Notification.findOne({
      _id: notificationId,
      recipient: userId
    });

    if (!notification) {
      return ApiResponse.notFound(res, 'Notification not found');
    }

    await notification.recordClick();

    return ApiResponse.success(res, null, 'Click recorded');
  } catch (error) {
    console.error('[NOTIFICATION] Record click error:', error);
    return ApiResponse.serverError(res, 'Failed to record click');
  }
});

module.exports = router;
