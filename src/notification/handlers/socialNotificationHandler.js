const Notification = require('../models/notificationModel');
const notificationFactory = require('../services/notificationFactory');
const deliveryManager = require('../services/deliveryManager');
const enhancedRealtimeService = require('../../../services/enhancedRealtimeService');

/**
 * Social Notification Handler
 * Handles social notification creation and delivery
 */
class SocialNotificationHandler {
  constructor() {
    this.context = 'social';
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

      // Deliver notification
      await deliveryManager.deliver(notification);

      // Emit real-time event
      this.emitRealtimeEvent(notification);

      return notification;
    } catch (error) {
      console.error('[SOCIAL HANDLER] Error handling notification:', error);
      throw error;
    }
  }

  /**
   * Emit real-time event for social notifications
   * @param {Object} notification - Notification document
   */
  emitRealtimeEvent(notification) {
    try {
      if (enhancedRealtimeService && enhancedRealtimeService.io) {
        const recipientId = notification.recipient.toString ? notification.recipient.toString() : notification.recipient;
        
        // Emit context-specific event
        enhancedRealtimeService.io.to(`user:${recipientId}`).emit('social:notification', {
          id: notification._id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data instanceof Map ? Object.fromEntries(notification.data) : (notification.data || {}),
          relatedContent: notification.relatedContent,
          priority: notification.priority,
          createdAt: notification.createdAt
        });

        // Emit specific event based on type
        const eventType = this.getEventType(notification.type);
        if (eventType) {
          enhancedRealtimeService.io.to(`user:${recipientId}`).emit(`social:${eventType}`, {
            notification: notification._id,
            data: notification.data instanceof Map ? Object.fromEntries(notification.data) : (notification.data || {}),
            relatedContent: notification.relatedContent
          });
        }
      } else {
        console.warn('[SOCIAL HANDLER] Socket.IO not initialized, skipping real-time event');
      }
    } catch (error) {
      console.error('[SOCIAL HANDLER] Error emitting real-time event:', error);
    }
  }

  /**
   * Get event type from notification type
   * @param {string} type - Notification type
   * @returns {string|null} Event type
   */
  getEventType(type) {
    const eventMap = {
      'post_like': 'post_liked',
      'post_comment': 'post_commented',
      'post_share': 'post_shared',
      'post_mention': 'post_mentioned',
      'story_view': 'story_viewed',
      'story_reaction': 'story_reacted',
      'story_reply': 'story_replied',
      'story_mention': 'story_mentioned',
      'follow_request': 'follow_requested',
      'follow_accepted': 'follow_accepted',
      'follow': 'followed',
      'message_received': 'message_received',
      'message_request': 'message_requested',
      'call_incoming': 'call_incoming',
      'call_missed': 'call_missed',
      'call_ended': 'call_ended'
    };

    return eventMap[type] || null;
  }

  /**
   * Create notification for post like
   * @param {string} recipientId - Recipient user ID
   * @param {string} senderId - Sender user ID
   * @param {Object} data - Additional data
   * @returns {Promise<Object>} Created notification
   */
  async createPostLike(recipientId, senderId, data = {}) {
    return this.handle({
      type: 'post_like',
      recipientId,
      senderId,
      data
    });
  }

  /**
   * Create notification for post comment
   * @param {string} recipientId - Recipient user ID
   * @param {string} senderId - Sender user ID
   * @param {Object} data - Additional data
   * @returns {Promise<Object>} Created notification
   */
  async createPostComment(recipientId, senderId, data = {}) {
    return this.handle({
      type: 'post_comment',
      recipientId,
      senderId,
      data
    });
  }

  /**
   * Create notification for follow request
   * @param {string} recipientId - Recipient user ID
   * @param {string} senderId - Sender user ID
   * @param {Object} data - Additional data
   * @returns {Promise<Object>} Created notification
   */
  async createFollowRequest(recipientId, senderId, data = {}) {
    return this.handle({
      type: 'follow_request',
      recipientId,
      senderId,
      data
    });
  }

  /**
   * Create notification for follow accepted
   * @param {string} recipientId - Recipient user ID
   * @param {string} senderId - Sender user ID
   * @param {Object} data - Additional data
   * @returns {Promise<Object>} Created notification
   */
  async createFollowAccepted(recipientId, senderId, data = {}) {
    return this.handle({
      type: 'follow_accepted',
      recipientId,
      senderId,
      data
    });
  }

  /**
   * Create notification for new follower
   * @param {string} recipientId - Recipient user ID
   * @param {string} senderId - Sender user ID
   * @param {Object} data - Additional data
   * @returns {Promise<Object>} Created notification
   */
  async createFollow(recipientId, senderId, data = {}) {
    return this.handle({
      type: 'follow',
      recipientId,
      senderId,
      data
    });
  }

  /**
   * Create notification for message received
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
      data
    });
  }

  /**
   * Create notification for message request
   * @param {string} recipientId - Recipient user ID
   * @param {string} senderId - Sender user ID
   * @param {Object} data - Additional data
   * @returns {Promise<Object>} Created notification
   */
  async createMessageRequest(recipientId, senderId, data = {}) {
    return this.handle({
      type: 'message_request',
      recipientId,
      senderId,
      data
    });
  }

  /**
   * Create notification for incoming call
   * @param {string} recipientId - Recipient user ID
   * @param {string} senderId - Sender user ID
   * @param {Object} data - Additional data
   * @returns {Promise<Object>} Created notification
   */
  async createCallIncoming(recipientId, senderId, data = {}) {
    return this.handle({
      type: 'call_incoming',
      recipientId,
      senderId,
      data,
      priority: 'urgent'
    });
  }

  /**
   * Create notification for missed call
   * @param {string} recipientId - Recipient user ID
   * @param {string} senderId - Sender user ID
   * @param {Object} data - Additional data
   * @returns {Promise<Object>} Created notification
   */
  async createCallMissed(recipientId, senderId, data = {}) {
    return this.handle({
      type: 'call_missed',
      recipientId,
      senderId,
      data
    });
  }

  /**
   * Create notification for system announcement
   * @param {string} recipientId - Recipient user ID
   * @param {Object} data - Additional data
   * @returns {Promise<Object>} Created notification
   */
  async createSystemAnnouncement(recipientId, data = {}) {
    return this.handle({
      type: 'system_announcement',
      recipientId,
      senderId: null,
      data
    });
  }

  /**
   * Create notification for content moderation
   * @param {string} recipientId - Recipient user ID
   * @param {Object} data - Additional data
   * @returns {Promise<Object>} Created notification
   */
  async createContentModeration(recipientId, data = {}) {
    return this.handle({
      type: 'content_moderation',
      recipientId,
      senderId: null,
      data,
      priority: 'high'
    });
  }
}

// Singleton instance
const socialNotificationHandler = new SocialNotificationHandler();

module.exports = socialNotificationHandler;

