const Notification = require('../models/notificationModel');
const NotificationPreferences = require('../models/notificationPreferencesModel');
const notificationRegistry = require('./notificationRegistry');
const notificationFactory = require('./notificationFactory');
const deliveryManager = require('./deliveryManager');
const socialNotificationHandler = require('../handlers/socialNotificationHandler');
const datingNotificationHandler = require('../handlers/datingNotificationHandler');
const { getCachedUserData, cacheUserData, invalidateUserCache } = require('../../middleware/cacheMiddleware');

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
    
    // Register dating notification handler
    this.registry.registerHandler('dating', datingNotificationHandler);
    this.handlers.set('dating', datingNotificationHandler);
    console.log('[NOTIFICATION SERVICE] Dating handler registered successfully');
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
      console.log('[NOTIFICATION SERVICE] getUserNotifications called:', { userId, options });
      const {
        page = 1,
        limit = 20,
        status = 'all',
        type = 'all',
        context = 'all',
        priority = 'all'
      } = options;

      console.log('[NOTIFICATION SERVICE] Calling Notification.getUserNotifications...');
      const notifications = await Notification.getUserNotifications(userId, {
        page,
        limit,
        status,
        type,
        context,
        priority
      });
      console.log('[NOTIFICATION SERVICE] getUserNotifications query completed, count:', notifications?.length || 0);

      console.log('[NOTIFICATION SERVICE] Counting total documents...');
      const countQuery = {
        recipient: userId,
        ...(status !== 'all' && { status }),
        ...(type !== 'all' && { type }),
        ...(context !== 'all' && { context }),
        ...(priority !== 'all' && { priority })
      };
      
      // Add status filter for 'all' case
      if (status === 'all') {
        countQuery.status = { $in: ['unread', 'read', 'archived'] };
      }
      
      const total = await Notification.countDocuments(countQuery).maxTimeMS(10000);
      console.log('[NOTIFICATION SERVICE] Total count:', total);

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
      console.error('[NOTIFICATION SERVICE] Error stack:', error.stack);
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
      // OPTIMIZED: Cache unread count for 30 seconds (frequently accessed)
      const cacheKey = `notifications:unread:${context}`;
      let count = getCachedUserData(userId, cacheKey);
      
      if (count === null) {
        count = await Notification.getUnreadCount(userId, context);
        cacheUserData(userId, cacheKey, count, 30); // Cache for 30 seconds
      }
      
      return count;
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
      
      // OPTIMIZED: Invalidate unread count cache when notification is marked as read
      invalidateUserCache(notification.recipient.toString(), 'notifications:*');
      
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
      const result = await Notification.markAllAsRead(userId, context);
      
      // OPTIMIZED: Invalidate unread count cache
      invalidateUserCache(userId, 'notifications:*');
      
      return result;
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
   * Update notifications by type and related data
   * Useful for updating notification data when related actions change status (e.g., follow request accepted)
   * @param {Object} options - Update options
   * @param {string} options.type - Notification type (e.g., 'follow_request')
   * @param {string} options.recipientId - Recipient user ID (the user who received the notification)
   * @param {Object} options.data - Data to match (e.g., { requestId: '...' })
   * @param {Object} options.updateData - Data to update in notification (e.g., { status: 'accepted' })
   * @param {string} options.senderId - Sender user ID (optional, for more precise matching)
   * @param {string} options.context - Context filter (optional, defaults to 'social')
   * @returns {Promise<Object>} Update result with modifiedCount
   */
  async updateByTypeAndData(options) {
    try {
      const {
        type,
        recipientId,
        data = {},
        updateData = {},
        senderId = null,
        context = 'social'
      } = options;

      if (!type || !recipientId) {
        throw new Error('Missing required fields: type, recipientId');
      }

      if (!updateData || Object.keys(updateData).length === 0) {
        throw new Error('Missing updateData: must provide data to update');
      }

      console.log('[NOTIFICATION SERVICE] updateByTypeAndData called with:', {
        type,
        recipientId,
        senderId,
        data,
        updateData,
        context
      });

      // Build base query (without data.requestId - we'll filter that manually)
      const query = {
        type,
        recipient: recipientId,
        context,
        status: { $ne: 'deleted' } // Don't update already deleted notifications
      };

      // Add sender matching if provided (for more precise matching)
      if (senderId) {
        query.sender = senderId;
      }

      console.log('[NOTIFICATION SERVICE] Base query for update:', JSON.stringify(query, null, 2));

      // Find all matching notifications (without data.requestId filter - we'll filter manually)
      // Use lean() to get plain objects which converts Map to object
      let foundNotifications = await Notification.find(query).lean();
      console.log('[NOTIFICATION SERVICE] Found notifications before data filtering:', foundNotifications.length);

      // Filter by requestId if provided
      if (data.requestId && foundNotifications.length > 0) {
        const requestIdStr = data.requestId.toString();
        console.log('[NOTIFICATION SERVICE] Filtering by requestId:', requestIdStr);

        foundNotifications = foundNotifications.filter(notif => {
          const notifData = notif.data || {};
          const notifRequestId = notifData.requestId;

          // Convert to string for comparison
          const notifRequestIdStr = notifRequestId ? notifRequestId.toString() : null;

          const matches = notifRequestIdStr === requestIdStr;

          if (!matches && notifRequestId) {
            console.log('[NOTIFICATION SERVICE] RequestId mismatch:', {
              notificationId: notif._id,
              expected: requestIdStr,
              found: notifRequestIdStr,
              foundType: typeof notifRequestId
            });
          }

          return matches;
        });

        console.log('[NOTIFICATION SERVICE] Found notifications after data filtering:', foundNotifications.length);
      }

      if (foundNotifications.length > 0) {
        console.log('[NOTIFICATION SERVICE] Sample notification data:', {
          id: foundNotifications[0]._id,
          type: foundNotifications[0].type,
          recipient: foundNotifications[0].recipient,
          sender: foundNotifications[0].sender,
          data: foundNotifications[0].data,
          requestId: foundNotifications[0].data?.requestId
        });
      }

      // Update the filtered notifications
      let modifiedCount = 0;
      const matchedCount = foundNotifications.length;
      let result;

      if (foundNotifications.length > 0) {
        // Update each notification individually to handle Map fields correctly
        const notificationIds = foundNotifications.map(n => n._id);

        // For each notification, update the data field with the new values
        for (const notifId of notificationIds) {
          try {
            const notification = await Notification.findById(notifId);
            if (!notification) continue;

            // Update data field (which is a Map)
            let notifData = notification.data;
            
            // Handle both Map and plain object
            if (!notifData) {
              notifData = new Map();
            } else if (!(notifData instanceof Map)) {
              // Convert plain object to Map
              notifData = new Map(Object.entries(notifData));
            }
            
            // Set each field from updateData into the Map
            Object.keys(updateData).forEach(key => {
              notifData.set(key, updateData[key]);
            });

            notification.data = notifData;
            await notification.save();
            modifiedCount++;

            console.log('[NOTIFICATION SERVICE] Updated notification:', {
              notificationId: notifId,
              updateData
            });
          } catch (updateError) {
            console.error('[NOTIFICATION SERVICE] Error updating individual notification:', updateError);
          }
        }

        result = {
          matchedCount,
          modifiedCount
        };
      } else {
        // No notifications found, return empty result
        result = {
          matchedCount: 0,
          modifiedCount: 0
        };
      }

      console.log('[NOTIFICATION SERVICE] Update result:', {
        type,
        recipientId,
        data,
        updateData,
        senderId,
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
        foundCount: foundNotifications.length
      });

      // If no notifications were found but we expected some, log a warning
      if (result.matchedCount === 0 && foundNotifications.length === 0) {
        console.warn('[NOTIFICATION SERVICE] ⚠️ No notifications matched the query for update.');
      }

      // Invalidate cache for the recipient
      invalidateUserCache(recipientId, 'notifications:*');

      return result;
    } catch (error) {
      console.error('[NOTIFICATION SERVICE] Error updating notifications by type and data:', error);
      console.error('[NOTIFICATION SERVICE] Error stack:', error.stack);
      throw error;
    }
  }

  /**
   * Delete notifications by type and related data
   * Useful for deleting notifications when related actions are cancelled (e.g., follow request cancelled)
   * @param {Object} options - Delete options
   * @param {string} options.type - Notification type (e.g., 'follow_request')
   * @param {string} options.recipientId - Recipient user ID (the user who received the notification)
   * @param {Object} options.data - Data to match (e.g., { requestId: '...' })
   * @param {string} options.senderId - Sender user ID (optional, for more precise matching)
   * @param {string} options.context - Context filter (optional, defaults to 'social')
   * @returns {Promise<Object>} Delete result with deletedCount
   */
  async deleteByTypeAndData(options) {
    try {
      const {
        type,
        recipientId,
        data = {},
        senderId = null,
        context = 'social'
      } = options;

      if (!type || !recipientId) {
        throw new Error('Missing required fields: type, recipientId');
      }

      console.log('[NOTIFICATION SERVICE] deleteByTypeAndData called with:', {
        type,
        recipientId,
        senderId,
        data,
        context
      });

      // Build base query (without data.requestId - we'll filter that manually)
      const query = {
        type,
        recipient: recipientId,
        context,
        status: { $ne: 'deleted' } // Don't try to delete already deleted notifications
      };

      // Add sender matching if provided (for more precise matching)
      if (senderId) {
        query.sender = senderId;
      }

      console.log('[NOTIFICATION SERVICE] Base query for deletion:', JSON.stringify(query, null, 2));

      // Find all matching notifications (without data.requestId filter - we'll filter manually)
      // Use lean() to get plain objects which converts Map to object
      let foundNotifications = await Notification.find(query).lean();
      console.log('[NOTIFICATION SERVICE] Found notifications before data filtering:', foundNotifications.length);
      
      // Filter by requestId if provided
      if (data.requestId && foundNotifications.length > 0) {
        const requestIdStr = data.requestId.toString();
        console.log('[NOTIFICATION SERVICE] Filtering by requestId:', requestIdStr);
        
        foundNotifications = foundNotifications.filter(notif => {
          const notifData = notif.data || {};
          const notifRequestId = notifData.requestId;
          
          // Convert to string for comparison
          const notifRequestIdStr = notifRequestId ? notifRequestId.toString() : null;
          
          const matches = notifRequestIdStr === requestIdStr;
          
          if (!matches && notifRequestId) {
            console.log('[NOTIFICATION SERVICE] RequestId mismatch:', {
              notificationId: notif._id,
              expected: requestIdStr,
              found: notifRequestIdStr,
              foundType: typeof notifRequestId
            });
          }
          
          return matches;
        });
        
        console.log('[NOTIFICATION SERVICE] Found notifications after data filtering:', foundNotifications.length);
      }
      
      if (foundNotifications.length > 0) {
        console.log('[NOTIFICATION SERVICE] Sample notification data:', {
          id: foundNotifications[0]._id,
          type: foundNotifications[0].type,
          recipient: foundNotifications[0].recipient,
          sender: foundNotifications[0].sender,
          data: foundNotifications[0].data,
          requestId: foundNotifications[0].data?.requestId
        });
      }

      // Delete the filtered notifications
      let deletedCount = 0;
      const matchedCount = foundNotifications.length;

      if (foundNotifications.length > 0) {
        // Delete each notification individually
        const notificationIds = foundNotifications.map(n => n._id);
        
        // Use updateMany for efficiency
        const updateResult = await Notification.updateMany(
          { _id: { $in: notificationIds } },
          { $set: { status: 'deleted' } }
        );
        
        deletedCount = updateResult.modifiedCount;
        
        console.log('[NOTIFICATION SERVICE] Deleted notifications:', {
          notificationIds: notificationIds.map(id => id.toString()),
          deletedCount
        });
        
        result = {
          matchedCount,
          modifiedCount: deletedCount,
          deletedCount
        };
      } else {
        // No notifications found, return empty result
        result = {
          matchedCount: 0,
          modifiedCount: 0,
          deletedCount: 0
        };
      }

      console.log('[NOTIFICATION SERVICE] Deletion result:', {
        type,
        recipientId,
        data,
        senderId,
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
        foundCount: foundNotifications.length
      });

      // If no notifications were found but we expected some, log a warning
      if (result.matchedCount === 0 && foundNotifications.length === 0) {
        console.warn('[NOTIFICATION SERVICE] ⚠️ No notifications matched the query. This might indicate:');
        console.warn('[NOTIFICATION SERVICE] - Notification was already deleted');
        console.warn('[NOTIFICATION SERVICE] - requestId format mismatch');
        console.warn('[NOTIFICATION SERVICE] - Notification data structure is different than expected');
        
        // Try to find any follow_request notifications for this recipient to debug
        const debugQuery = {
          type: 'follow_request',
          recipient: recipientId,
          context: 'social',
          status: { $ne: 'deleted' }
        };
        if (senderId) {
          debugQuery.sender = senderId;
        }
        const debugNotifications = await Notification.find(debugQuery).lean().limit(5);
        console.log('[NOTIFICATION SERVICE] Debug: Found follow_request notifications for recipient:', debugNotifications.length);
        if (debugNotifications.length > 0) {
          debugNotifications.forEach((notif, idx) => {
            console.log(`[NOTIFICATION SERVICE] Debug notification ${idx + 1}:`, {
              id: notif._id,
              sender: notif.sender,
              data: notif.data,
              requestId: notif.data?.requestId || notif.data?.get?.('requestId'),
              expectedRequestId: data.requestId
            });
          });
        }
      }

      // Invalidate cache for the recipient
      invalidateUserCache(recipientId, 'notifications:*');

      return {
        deletedCount: result.modifiedCount,
        matchedCount: result.matchedCount
      };
    } catch (error) {
      console.error('[NOTIFICATION SERVICE] Error deleting notifications by type and data:', error);
      console.error('[NOTIFICATION SERVICE] Error stack:', error.stack);
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

