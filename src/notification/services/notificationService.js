const Notification = require('../models/notificationModel');
const NotificationPreferences = require('../models/notificationPreferencesModel');
const notificationRegistry = require('./notificationRegistry');
const notificationFactory = require('./notificationFactory');
const deliveryManager = require('./deliveryManager');
const socialNotificationHandler = require('../handlers/socialNotificationHandler');

/**
 * Notification Service
 * Main service for creating and managing notifications
 */
class NotificationService {
  constructor() {
    this.registry = notificationRegistry;
    this.factory = notificationFactory;
    this.deliveryManager = deliveryManager;
    this.handlers = new Map();
    this.initializeHandlers();
  }

  /**
   * Initialize notification handlers
   */
  initializeHandlers() {
    // Register social notification handler
    this.registry.registerHandler('social', socialNotificationHandler);
    this.handlers.set('social', socialNotificationHandler);
    
    // TODO: Register dating notification handler when implemented
    // this.registry.registerHandler('dating', datingNotificationHandler);
    // this.handlers.set('dating', datingNotificationHandler);
  }

  /**
   * Create a notification
   * @param {Object} options - Notification options
   * @param {string} options.context - Context (social/dating)
   * @param {string} options.type - Notification type
   * @param {string} options.recipientId - Recipient user ID
   * @param {string} options.senderId - Sender user ID (optional)
   * @param {Object} options.data - Additional data
   * @param {string} options.title - Custom title (optional)
   * @param {string} options.message - Custom message (optional)
   * @param {string} options.priority - Priority (optional)
   * @param {Object} options.channels - Channel overrides (optional)
   * @param {Date} options.scheduledFor - Scheduled delivery time (optional)
   * @param {Date} options.expiresAt - Expiry time (optional)
   * @returns {Promise<Object>} Created notification
   */
  async create(options) {
    try {
      const {
        context = 'social',
        type,
        recipientId,
        senderId = null,
        data = {},
        title = null,
        message = null,
        priority = null,
        channels = null,
        scheduledFor = null,
        expiresAt = null
      } = options;

      // Validate notification
      if (!context || !type || !recipientId) {
        throw new Error('Missing required fields: context, type, recipientId');
      }

      // Get handler for context
      const handler = this.handlers.get(context);
      if (!handler) {
        throw new Error(`No handler found for context: ${context}`);
      }

      // Handle notification creation
      const notification = await handler.handle({
        context,
        type,
        recipientId,
        senderId,
        data,
        title,
        message,
        priority,
        channels,
        scheduledFor,
        expiresAt
      });

      return notification;
    } catch (error) {
      console.error('[NOTIFICATION SERVICE] Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Get user notifications
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @param {number} options.page - Page number
   * @param {number} options.limit - Items per page
   * @param {string} options.status - Status filter (all/unread/read/archived)
   * @param {string} options.type - Type filter
   * @param {string} options.context - Context filter (all/social/dating)
   * @param {string} options.priority - Priority filter
   * @returns {Promise<Object>} Notifications and pagination info
   */
  async getUserNotifications(userId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        status = 'all',
        type = 'all',
        context = 'all',
        priority = 'all'
      } = options;

      const notifications = await Notification.getUserNotifications(userId, {
        page,
        limit,
        status,
        type,
        context,
        priority
      });

      const total = await Notification.countDocuments({
        recipient: userId,
        ...(status !== 'all' && { status }),
        ...(type !== 'all' && { type }),
        ...(context !== 'all' && { context }),
        ...(priority !== 'all' && { priority })
      });

      return {
        notifications,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('[NOTIFICATION SERVICE] Error getting user notifications:', error);
      throw error;
    }
  }

  /**
   * Get unread notification count
   * @param {string} userId - User ID
   * @param {string} context - Context filter (all/social/dating)
   * @returns {Promise<number>} Unread count
   */
  async getUnreadCount(userId, context = 'all') {
    try {
      return await Notification.getUnreadCount(userId, context);
    } catch (error) {
      console.error('[NOTIFICATION SERVICE] Error getting unread count:', error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   * @param {string} notificationId - Notification ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Updated notification
   */
  async markAsRead(notificationId, userId) {
    try {
      const notification = await Notification.findOne({
        _id: notificationId,
        recipient: userId
      });

      if (!notification) {
        throw new Error('Notification not found');
      }

      await notification.markAsRead();
      return notification;
    } catch (error) {
      console.error('[NOTIFICATION SERVICE] Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read
   * @param {string} userId - User ID
   * @param {string} context - Context filter (all/social/dating)
   * @returns {Promise<Object>} Update result
   */
  async markAllAsRead(userId, context = 'all') {
    try {
      return await Notification.markAllAsRead(userId, context);
    } catch (error) {
      console.error('[NOTIFICATION SERVICE] Error marking all as read:', error);
      throw error;
    }
  }

  /**
   * Archive notification
   * @param {string} notificationId - Notification ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Archived notification
   */
  async archive(notificationId, userId) {
    try {
      const notification = await Notification.findOne({
        _id: notificationId,
        recipient: userId
      });

      if (!notification) {
        throw new Error('Notification not found');
      }

      await notification.archive();
      return notification;
    } catch (error) {
      console.error('[NOTIFICATION SERVICE] Error archiving notification:', error);
      throw error;
    }
  }

  /**
   * Delete notification
   * @param {string} notificationId - Notification ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Deleted notification
   */
  async delete(notificationId, userId) {
    try {
      const notification = await Notification.findOne({
        _id: notificationId,
        recipient: userId
      });

      if (!notification) {
        throw new Error('Notification not found');
      }

      await notification.delete();
      return notification;
    } catch (error) {
      console.error('[NOTIFICATION SERVICE] Error deleting notification:', error);
      throw error;
    }
  }

  /**
   * Get user notification preferences
   * @param {string} userId - User ID
   * @returns {Promise<Object>} User preferences
   */
  async getUserPreferences(userId) {
    try {
      return await NotificationPreferences.getUserPreferences(userId);
    } catch (error) {
      console.error('[NOTIFICATION SERVICE] Error getting user preferences:', error);
      throw error;
    }
  }

  /**
   * Update user notification preferences
   * @param {string} userId - User ID
   * @param {Object} preferences - Preferences to update
   * @returns {Promise<Object>} Updated preferences
   */
  async updateUserPreferences(userId, preferences) {
    try {
      const userPreferences = await NotificationPreferences.getUserPreferences(userId);

      // Update global settings
      if (preferences.globalSettings) {
        await userPreferences.updateGlobalSettings(preferences.globalSettings);
      }

      // Update channel preferences
      if (preferences.channels) {
        Object.keys(preferences.channels).forEach(channel => {
          userPreferences.updateChannelPreference(channel, preferences.channels[channel]);
        });
      }

      // Update context preferences
      if (preferences.contexts) {
        Object.keys(preferences.contexts).forEach(context => {
          userPreferences.updateContextPreference(context, preferences.contexts[context]);
        });
      }

      // Update type preferences
      if (preferences.types) {
        Object.keys(preferences.types).forEach(context => {
          Object.keys(preferences.types[context]).forEach(type => {
            userPreferences.updateTypePreference(
              context,
              type,
              preferences.types[context][type]
            );
          });
        });
      }

      await userPreferences.save();
      return userPreferences;
    } catch (error) {
      console.error('[NOTIFICATION SERVICE] Error updating user preferences:', error);
      throw error;
    }
  }

  /**
   * Reset user preferences to defaults
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Reset preferences
   */
  async resetPreferences(userId) {
    try {
      return await NotificationPreferences.resetToDefaults(userId);
    } catch (error) {
      console.error('[NOTIFICATION SERVICE] Error resetting preferences:', error);
      throw error;
    }
  }

  /**
   * Cleanup expired notifications
   * @returns {Promise<Object>} Cleanup result
   */
  async cleanupExpired() {
    try {
      return await Notification.cleanupExpired();
    } catch (error) {
      console.error('[NOTIFICATION SERVICE] Error cleaning up expired notifications:', error);
      throw error;
    }
  }

  /**
   * Process pending deliveries
   * @returns {Promise<Array>} Processed notifications
   */
  async processPendingDeliveries() {
    try {
      const pendingNotifications = await Notification.getPendingDeliveries();
      const results = [];

      for (const notification of pendingNotifications) {
        try {
          await this.deliveryManager.deliver(notification);
          results.push({ notificationId: notification._id, status: 'delivered' });
        } catch (error) {
          console.error(`[NOTIFICATION SERVICE] Error processing delivery for ${notification._id}:`, error);
          results.push({ notificationId: notification._id, status: 'failed', error: error.message });
        }
      }

      return results;
    } catch (error) {
      console.error('[NOTIFICATION SERVICE] Error processing pending deliveries:', error);
      throw error;
    }
  }
}

// Singleton instance
const notificationService = new NotificationService();

module.exports = notificationService;

