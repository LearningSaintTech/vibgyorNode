const express = require('express');
const router = express.Router();
const { authorize } = require('../../../middleware/authMiddleware');
const notificationService = require('../services/notificationService');
const ApiResponse = require('../../../utils/apiResponse');

/**
 * @route   GET /api/v1/notification-preferences
 * @desc    Get user notification preferences
 * @access  Private
 */
router.get('/', authorize, async (req, res) => {
  try {
    const userId = req.user.id;

    const preferences = await notificationService.getUserPreferences(userId);

    return ApiResponse.createResponse(res, {
      preferences
    }, 'Preferences retrieved successfully');
  } catch (error) {
    console.error('[NOTIFICATION PREFERENCES ROUTES] Error getting preferences:', error);
    return ApiResponse.createErrorResponse(res, error.message || 'Failed to get preferences', 500);
  }
});

/**
 * @route   PUT /api/v1/notification-preferences
 * @desc    Update user notification preferences
 * @access  Private
 */
router.put('/', authorize, async (req, res) => {
  try {
    const userId = req.user.id;
    const preferences = req.body;

    const updatedPreferences = await notificationService.updateUserPreferences(userId, preferences);

    return ApiResponse.createResponse(res, {
      preferences: updatedPreferences
    }, 'Preferences updated successfully');
  } catch (error) {
    console.error('[NOTIFICATION PREFERENCES ROUTES] Error updating preferences:', error);
    return ApiResponse.createErrorResponse(res, error.message || 'Failed to update preferences', 500);
  }
});

/**
 * @route   PUT /api/v1/notification-preferences/reset
 * @desc    Reset user notification preferences to defaults
 * @access  Private
 */
router.put('/reset', authorize, async (req, res) => {
  try {
    const userId = req.user.id;

    const preferences = await notificationService.resetPreferences(userId);

    return ApiResponse.createResponse(res, {
      preferences
    }, 'Preferences reset to defaults');
  } catch (error) {
    console.error('[NOTIFICATION PREFERENCES ROUTES] Error resetting preferences:', error);
    return ApiResponse.createErrorResponse(res, error.message || 'Failed to reset preferences', 500);
  }
});

module.exports = router;

