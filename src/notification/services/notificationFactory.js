const notificationRegistry = require('./notificationRegistry');
const User = require('../../user/auth/model/userAuthModel');

/**
 * Notification Factory
 * Creates notifications based on context and type
 */
class NotificationFactory {
  constructor(registry) {
    this.registry = registry;
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
   * @returns {Promise<Object>} Notification data
   */
  async create(options) {
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
    const validation = this.registry.validate(context, type, { recipientId });
    if (!validation.valid) {
      throw new Error(`Invalid notification: ${validation.errors.join(', ')}`);
    }

    const typeConfig = validation.typeConfig;

    // Ensure recipientId is a valid ObjectId string
    // Handle cases where recipientId might be a stringified object or invalid format
    let validRecipientId = recipientId;
    if (typeof recipientId === 'string') {
      // Check if it's a valid 24-character hex string (ObjectId format)
      if (!/^[0-9a-fA-F]{24}$/.test(recipientId)) {
        // Try to extract ObjectId from stringified object
        const objectIdMatch = recipientId.match(/ObjectId\(['"]([0-9a-fA-F]{24})['"]\)/);
        if (objectIdMatch) {
          validRecipientId = objectIdMatch[1];
        } else {
          throw new Error(`Invalid recipientId format: ${recipientId}`);
        }
      }
    } else if (recipientId && recipientId.toString) {
      validRecipientId = recipientId.toString();
    }

    // Get recipient and sender info
    const [recipient, sender] = await Promise.all([
      User.findById(validRecipientId).select('username fullName profilePictureUrl email phoneNumber'),
      senderId ? User.findById(senderId).select('username fullName profilePictureUrl email phoneNumber') : null
    ]);

    if (!recipient) {
      throw new Error(`Recipient not found: ${recipientId}`);
    }

    // Generate title and message
    const notificationTitle = title || this.generateTitle(typeConfig, sender, data);
    const notificationMessage = message || this.generateMessage(typeConfig, sender, data);

    // Get default configuration
    const defaultConfig = this.registry.getDefaultConfig(context, type);

    // Build notification data
    const notificationData = {
      context,
      type,
      recipient: recipientId,
      sender: senderId,
      title: notificationTitle,
      message: notificationMessage,
      priority: priority || defaultConfig.priority,
      relatedContent: this.buildRelatedContent(type, data),
      data: this.buildData(data),
      scheduledFor,
      expiresAt: expiresAt || (defaultConfig.expiry ? new Date(Date.now() + defaultConfig.expiry) : null),
      deliveryChannels: {
        inApp: { delivered: false, deliveredAt: null },
        push: { delivered: false, deliveredAt: null, deviceTokens: [] },
        email: { delivered: false, deliveredAt: null, emailAddress: recipient.email },
        sms: { delivered: false, deliveredAt: null, phoneNumber: recipient.phoneNumber }
      }
    };

    // Add image if available
    if (data.image) {
      notificationData.image = data.image;
    }

    // Add action URL if available
    if (data.actionUrl) {
      notificationData.actionUrl = data.actionUrl;
    }

    // Add channel overrides if provided
    if (channels) {
      Object.keys(channels).forEach(channel => {
        if (notificationData.userPreferences) {
          notificationData.userPreferences[`skip${channel.charAt(0).toUpperCase() + channel.slice(1)}`] = !channels[channel];
        }
      });
    }

    return notificationData;
  }

  /**
   * Generate notification title
   * @param {Object} typeConfig - Type configuration
   * @param {Object} sender - Sender user object
   * @param {Object} data - Additional data
   * @returns {string} Notification title
   */
  generateTitle(typeConfig, sender, data) {
    let title = typeConfig.defaultTitle;
    
    if (data.title) {
      title = data.title;
    }
    
    return title;
  }

  /**
   * Generate notification message
   * @param {Object} typeConfig - Type configuration
   * @param {Object} sender - Sender user object
   * @param {Object} data - Additional data
   * @returns {string} Notification message
   */
  generateMessage(typeConfig, sender, data) {
    let message = typeConfig.defaultMessage;
    
    if (data.message) {
      message = data.message;
    } else if (sender) {
      // Replace placeholders
      message = message.replace('{sender}', sender.username || sender.fullName || 'Someone');
    }
    
    // Replace additional placeholders from data
    if (data.placeholders) {
      Object.keys(data.placeholders).forEach(key => {
        message = message.replace(`{${key}}`, data.placeholders[key]);
      });
    }
    
    return message;
  }

  /**
   * Build related content object
   * @param {string} type - Notification type
   * @param {Object} data - Additional data
   * @returns {Object} Related content object
   */
  buildRelatedContent(type, data) {
    const relatedContent = {
      contentType: null,
      contentId: null,
      metadata: {}
    };

    // Map notification types to content types
    const contentMap = {
      'post_like': 'post',
      'post_comment': 'post',
      'post_share': 'post',
      'post_mention': 'post',
      'story_view': 'story',
      'story_reaction': 'story',
      'story_reply': 'story',
      'story_mention': 'story',
      'message_received': 'message',
      'message_request': 'message',
      'call_incoming': 'call',
      'call_missed': 'call',
      'call_ended': 'call',
      'follow_request': 'user',
      'follow_accepted': 'user',
      'follow': 'user',
      'match': 'match',
      'like': 'user',
      'super_like': 'user',
      'date_suggestion': 'date',
      'date_accepted': 'date',
      'date_rejected': 'date'
    };

    relatedContent.contentType = contentMap[type] || data.contentType || null;
    relatedContent.contentId = data.contentId || data.postId || data.storyId || data.messageId || data.callId || data.userId || data.matchId || null;

    // Add metadata
    if (data.metadata) {
      relatedContent.metadata = data.metadata;
    }

    return relatedContent;
  }

  /**
   * Build data object
   * @param {Object} data - Additional data
   * @returns {Object} Data object
   */
  buildData(data) {
    const dataMap = new Map();
    
    // Exclude reserved fields
    const reservedFields = ['title', 'message', 'image', 'actionUrl', 'contentType', 'contentId', 'postId', 'storyId', 'messageId', 'callId', 'userId', 'matchId', 'metadata', 'placeholders'];
    
    Object.keys(data).forEach(key => {
      if (!reservedFields.includes(key)) {
        dataMap.set(key, data[key]);
      }
    });
    
    return dataMap;
  }
}

// Singleton instance
const notificationFactory = new NotificationFactory(notificationRegistry);

module.exports = notificationFactory;

