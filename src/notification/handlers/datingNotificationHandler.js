const Notification = require('../models/notificationModel');
const notificationFactory = require('../services/notificationFactory');
const deliveryManager = require('../services/deliveryManager');
const enhancedRealtimeService = require('../../services/enhancedRealtimeService');

/**
 * Dating Notification Handler
 * Handles dating notification creation and delivery
 */
class DatingNotificationHandler {
  constructor() {
    this.context = 'dating';
  }

  /**
   * Handle notification creation
   * @param {Object} options - Notification options
   * @returns {Promise<Object>} Created notification
   */
  async handle(options) {
    try {
      // Create notification data using factory
      const notificationData = await notificationFactory.create({
        ...options,
        context: this.context
      });

      // Create notification in database
      const notification = new Notification(notificationData);
      await notification.save();

      // Deliver notification (includes in-app real-time emission via deliveryManager)
      await deliveryManager.deliver(notification);

      // Emit specific event types for specialized handling
      this.emitSpecificEvents(notification);

      return notification;
    } catch (error) {
      console.error('[DATING HANDLER] Error handling notification:', error);
      throw error;
    }
  }

  /**
   * Emit specific event types for specialized handling (e.g., dating:match)
   * Main notification event is emitted by deliveryManager to avoid duplicates
   * @param {Object} notification - Notification document
   */
  emitSpecificEvents(notification) {
    try {
      if (enhancedRealtimeService && enhancedRealtimeService.io) {
        const recipientId = notification.recipient.toString ? notification.recipient.toString() : notification.recipient;
        
        // Emit specific event based on type for specialized handlers
        // This is in addition to the main 'notification' event emitted by deliveryManager
        const eventType = this.getEventType(notification.type);
        if (eventType) {
          enhancedRealtimeService.io.to(`user:${recipientId}`).emit(`dating:${eventType}`, {
            notificationId: notification._id,
            notification: notification._id,
            data: notification.data instanceof Map ? Object.fromEntries(notification.data) : (notification.data || {}),
            relatedContent: notification.relatedContent,
            context: notification.context,
            type: notification.type
          });
        }
      }
    } catch (error) {
      console.error('[DATING HANDLER] Error emitting specific events:', error);
    }
  }

  /**
   * Get event type from notification type
   * @param {string} type - Notification type
   * @returns {string|null} Event type
   */
  getEventType(type) {
    const eventMap = {
      'match': 'matched',
      'like': 'liked',
      'super_like': 'super_liked',
      'message_received': 'message_received',
      'match_request': 'match_requested',
      'match_accepted': 'match_accepted',
      'match_rejected': 'match_rejected',
      'date_suggestion': 'date_suggested',
      'date_accepted': 'date_accepted',
      'date_rejected': 'date_rejected',
      'reminder': 'reminder'
    };

    return eventMap[type] || null;
  }

  /**
   * Create notification for match
   * @param {string} recipientId - Recipient user ID
   * @param {string} senderId - Sender user ID
   * @param {Object} data - Additional data
   * @returns {Promise<Object>} Created notification
   */
  async createMatch(recipientId, senderId, data = {}) {
    return this.handle({
      type: 'match',
      recipientId,
      senderId,
      data,
      priority: 'high'
    });
  }

  /**
   * Create notification for profile like
   * @param {string} recipientId - Recipient user ID
   * @param {string} senderId - Sender user ID
   * @param {Object} data - Additional data
   * @returns {Promise<Object>} Created notification
   */
  async createLike(recipientId, senderId, data = {}) {
    return this.handle({
      type: 'like',
      recipientId,
      senderId,
      data
    });
  }

  /**
   * Create notification for super like
   * @param {string} recipientId - Recipient user ID
   * @param {string} senderId - Sender user ID
   * @param {Object} data - Additional data
   * @returns {Promise<Object>} Created notification
   */
  async createSuperLike(recipientId, senderId, data = {}) {
    return this.handle({
      type: 'super_like',
      recipientId,
      senderId,
      data,
      priority: 'high'
    });
  }

  /**
   * Create notification for dating message received
   * @param {string} recipientId - Recipient user ID
   * @param {string} senderId - Sender user ID
   * @param {Object} data - Additional data
   * @returns {Promise<Object>} Created notification
   */
  async createMessageReceived(recipientId, senderId, data = {}) {
    return this.handle({
      type: 'message_received',
      recipientId,
      senderId,
      data,
      priority: 'high'
    });
  }

  /**
   * Create notification for match request
   * @param {string} recipientId - Recipient user ID
   * @param {string} senderId - Sender user ID
   * @param {Object} data - Additional data
   * @returns {Promise<Object>} Created notification
   */
  async createMatchRequest(recipientId, senderId, data = {}) {
    return this.handle({
      type: 'match_request',
      recipientId,
      senderId,
      data,
      priority: 'high'
    });
  }

  /**
   * Create notification for match accepted
   * @param {string} recipientId - Recipient user ID
   * @param {string} senderId - Sender user ID
   * @param {Object} data - Additional data
   * @returns {Promise<Object>} Created notification
   */
  async createMatchAccepted(recipientId, senderId, data = {}) {
    return this.handle({
      type: 'match_accepted',
      recipientId,
      senderId,
      data,
      priority: 'high'
    });
  }

  /**
   * Create notification for match rejected
   * @param {string} recipientId - Recipient user ID
   * @param {string} senderId - Sender user ID
   * @param {Object} data - Additional data
   * @returns {Promise<Object>} Created notification
   */
  async createMatchRejected(recipientId, senderId, data = {}) {
    return this.handle({
      type: 'match_rejected',
      recipientId,
      senderId,
      data
    });
  }

  /**
   * Create notification for date suggestion
   * @param {string} recipientId - Recipient user ID
   * @param {string} senderId - Sender user ID
   * @param {Object} data - Additional data
   * @returns {Promise<Object>} Created notification
   */
  async createDateSuggestion(recipientId, senderId, data = {}) {
    return this.handle({
      type: 'date_suggestion',
      recipientId,
      senderId,
      data,
      priority: 'high'
    });
  }

  /**
   * Create notification for date accepted
   * @param {string} recipientId - Recipient user ID
   * @param {string} senderId - Sender user ID
   * @param {Object} data - Additional data
   * @returns {Promise<Object>} Created notification
   */
  async createDateAccepted(recipientId, senderId, data = {}) {
    return this.handle({
      type: 'date_accepted',
      recipientId,
      senderId,
      data,
      priority: 'high'
    });
  }

  /**
   * Create notification for date rejected
   * @param {string} recipientId - Recipient user ID
   * @param {string} senderId - Sender user ID
   * @param {Object} data - Additional data
   * @returns {Promise<Object>} Created notification
   */
  async createDateRejected(recipientId, senderId, data = {}) {
    return this.handle({
      type: 'date_rejected',
      recipientId,
      senderId,
      data
    });
  }
}

// Singleton instance
const datingNotificationHandler = new DatingNotificationHandler();

module.exports = datingNotificationHandler;

