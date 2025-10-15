const express = require('express');
const router = express.Router();
const { authorize } = require('../../middleware/authMiddleware');
const NotificationPreferences = require('../userModel/notificationPreferencesModel');
const ApiResponse = require('../../utils/apiResponse');

// Apply authentication middleware to all routes
router.use(authorize());

// ===== NOTIFICATION PREFERENCES MANAGEMENT =====

/**
 * @route GET /user/notification-preferences
 * @desc Get user's notification preferences
 * @access Private
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user?.userId;
    const preferences = await NotificationPreferences.getUserPreferences(userId);

    return ApiResponse.success(res, preferences, 'Notification preferences retrieved successfully');
  } catch (error) {
    console.error('[NOTIFICATION_PREFERENCES] Get preferences error:', error);
    return ApiResponse.serverError(res, 'Failed to get notification preferences');
  }
});

/**
 * @route PUT /user/notification-preferences
 * @desc Update user's notification preferences
 * @access Private
 */
router.put('/', async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { globalSettings, channels, notificationTypes, advanced } = req.body;

    const preferences = await NotificationPreferences.getUserPreferences(userId);

    // Update global settings
    if (globalSettings) {
      await preferences.updateGlobalSettings(globalSettings);
    }

    // Update channel preferences
    if (channels) {
      for (const [channel, settings] of Object.entries(channels)) {
        await preferences.updateChannelPreference(channel, settings);
      }
    }

    // Update notification type preferences
    if (notificationTypes) {
      for (const [type, settings] of Object.entries(notificationTypes)) {
        await preferences.updateTypePreference(type, settings);
      }
    }

    // Update advanced settings
    if (advanced) {
      preferences.advanced = { ...preferences.advanced, ...advanced };
      await preferences.save();
    }

    return ApiResponse.success(res, preferences, 'Notification preferences updated successfully');
  } catch (error) {
    console.error('[NOTIFICATION_PREFERENCES] Update preferences error:', error);
    return ApiResponse.serverError(res, 'Failed to update notification preferences');
  }
});

/**
 * @route PUT /user/notification-preferences/global
 * @desc Update global notification settings
 * @access Private
 */
router.put('/global', async (req, res) => {
  try {
    const userId = req.user?.userId;
    const globalSettings = req.body;

    const preferences = await NotificationPreferences.getUserPreferences(userId);
    await preferences.updateGlobalSettings(globalSettings);

    return ApiResponse.success(res, preferences, 'Global notification settings updated successfully');
  } catch (error) {
    console.error('[NOTIFICATION_PREFERENCES] Update global settings error:', error);
    return ApiResponse.serverError(res, 'Failed to update global notification settings');
  }
});

/**
 * @route PUT /user/notification-preferences/channels/:channel
 * @desc Update channel-specific preferences
 * @access Private
 */
router.put('/channels/:channel', async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { channel } = req.params;
    const settings = req.body;

    if (!['inApp', 'push', 'email', 'sms'].includes(channel)) {
      return ApiResponse.badRequest(res, 'Invalid channel');
    }

    const preferences = await NotificationPreferences.getUserPreferences(userId);
    await preferences.updateChannelPreference(channel, settings);

    return ApiResponse.success(res, preferences, 'Channel preferences updated successfully');
  } catch (error) {
    console.error('[NOTIFICATION_PREFERENCES] Update channel preferences error:', error);
    return ApiResponse.serverError(res, 'Failed to update channel preferences');
  }
});

/**
 * @route PUT /user/notification-preferences/types/:type
 * @desc Update notification type preferences
 * @access Private
 */
router.put('/types/:type', async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { type } = req.params;
    const settings = req.body;

    const preferences = await NotificationPreferences.getUserPreferences(userId);
    await preferences.updateTypePreference(type, settings);

    return ApiResponse.success(res, preferences, 'Notification type preferences updated successfully');
  } catch (error) {
    console.error('[NOTIFICATION_PREFERENCES] Update type preferences error:', error);
    return ApiResponse.serverError(res, 'Failed to update notification type preferences');
  }
});

/**
 * @route PUT /user/notification-preferences/advanced
 * @desc Update advanced notification settings
 * @access Private
 */
router.put('/advanced', async (req, res) => {
  try {
    const userId = req.user?.userId;
    const advancedSettings = req.body;

    const preferences = await NotificationPreferences.getUserPreferences(userId);
    preferences.advanced = { ...preferences.advanced, ...advancedSettings };
    await preferences.save();

    return ApiResponse.success(res, preferences, 'Advanced notification settings updated successfully');
  } catch (error) {
    console.error('[NOTIFICATION_PREFERENCES] Update advanced settings error:', error);
    return ApiResponse.serverError(res, 'Failed to update advanced notification settings');
  }
});

/**
 * @route POST /user/notification-preferences/reset
 * @desc Reset notification preferences to defaults
 * @access Private
 */
router.post('/reset', async (req, res) => {
  try {
    const userId = req.user?.userId;
    const preferences = await NotificationPreferences.resetToDefaults(userId);

    return ApiResponse.success(res, preferences, 'Notification preferences reset to defaults');
  } catch (error) {
    console.error('[NOTIFICATION_PREFERENCES] Reset preferences error:', error);
    return ApiResponse.serverError(res, 'Failed to reset notification preferences');
  }
});

/**
 * @route GET /user/notification-preferences/test/:type
 * @desc Test notification delivery for a specific type
 * @access Private
 */
router.get('/test/:type', async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { type } = req.params;
    const { channel = 'inApp' } = req.query;

    const preferences = await NotificationPreferences.getUserPreferences(userId);
    const isEnabled = preferences.isNotificationEnabled(type, channel);

    return ApiResponse.success(res, {
      type,
      channel,
      enabled: isEnabled,
      preferences: preferences.notificationTypes[type] || null
    }, 'Notification test result retrieved successfully');
  } catch (error) {
    console.error('[NOTIFICATION_PREFERENCES] Test notification error:', error);
    return ApiResponse.serverError(res, 'Failed to test notification preferences');
  }
});

/**
 * @route GET /user/notification-preferences/summary
 * @desc Get notification preferences summary
 * @access Private
 */
router.get('/summary', async (req, res) => {
  try {
    const userId = req.user?.userId;
    const preferences = await NotificationPreferences.getUserPreferences(userId);

    const summary = {
      globalEnabled: preferences.globalSettings.enableNotifications,
      quietHours: preferences.globalSettings.quietHours,
      channelsEnabled: {
        inApp: preferences.channels.inApp?.enabled || false,
        push: preferences.channels.push?.enabled || false,
        email: preferences.channels.email?.enabled || false,
        sms: preferences.channels.sms?.enabled || false
      },
      typesEnabled: Object.keys(preferences.notificationTypes).reduce((acc, type) => {
        acc[type] = preferences.notificationTypes[type].enabled;
        return acc;
      }, {}),
      totalTypes: Object.keys(preferences.notificationTypes).length,
      enabledTypes: Object.values(preferences.notificationTypes).filter(t => t.enabled).length
    };

    return ApiResponse.success(res, summary, 'Notification preferences summary retrieved successfully');
  } catch (error) {
    console.error('[NOTIFICATION_PREFERENCES] Get summary error:', error);
    return ApiResponse.serverError(res, 'Failed to get notification preferences summary');
  }
});

module.exports = router;
