const express = require('express');
const router = express.Router();
const { authorize } = require('../../middleware/authMiddleware');
const notificationService = require('../services/notificationService');
const ApiResponse = require('../../utils/apiResponse');

/**
 * @route   GET /api/v1/notifications
 * @desc    Get user notifications
 * @access  Private
 */
router.get('/', authorize, async (req, res) => {
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
router.get('/unread-count', authorize, async (req, res) => {
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
router.put('/:id/read', authorize, async (req, res) => {
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
router.put('/read-all', authorize, async (req, res) => {
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
router.put('/:id/archive', authorize, async (req, res) => {
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
router.delete('/:id', authorize, async (req, res) => {
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

module.exports = router;

