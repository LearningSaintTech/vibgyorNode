const Notification = require('../user/social/userModel/notificationModel');
const User = require('../user/auth/model/userAuthModel');
const Post = require('../user/social/userModel/postModel');
const Story = require('../user/social/userModel/storyModel');
const Message = require('../user/social/userModel/messageModel');

/**
 * Enhanced Notification Service
 * Handles creation, delivery, and management of notifications
 */
class NotificationService {
  constructor() {
    this.deliveryChannels = {
      inApp: this.deliverInApp.bind(this),
      push: this.deliverPush.bind(this),
      email: this.deliverEmail.bind(this),
      sms: this.deliverSMS.bind(this)
    };
  }

  /**
   * Create a new notification
   * @param {Object} notificationData - Notification data
   * @returns {Promise<Object>} Created notification
   */
  async createNotification(notificationData) {
    try {
      const {
        recipientId,
        senderId,
        type,
        title,
        message,
        image,
        actionUrl,
        relatedContent,
        priority = 'normal',
        scheduledFor = null,
        userPreferences = {}
      } = notificationData;

      // Validate required fields
      if (!recipientId || !senderId || !type || !title || !message) {
        throw new Error('Missing required notification fields');
      }

      // Check if recipient and sender exist
      const [recipient, sender] = await Promise.all([
        User.findById(recipientId),
        User.findById(senderId)
      ]);

      if (!recipient || !sender) {
        throw new Error('Invalid recipient or sender');
      }

      // Don't send notification to self
      if (recipientId === senderId) {
        return null;
      }

      // Check user notification preferences
      const userPrefs = recipient.notificationPreferences || {};
      if (userPrefs[type] === false) {
        return null; // User has disabled this type of notification
      }

      // Create notification
      const notification = new Notification({
        recipient: recipientId,
        sender: senderId,
        type,
        title,
        message,
        image,
        actionUrl,
        relatedContent,
        priority,
        scheduledFor,
        userPreferences: {
          skipInApp: userPreferences.skipInApp || userPrefs.skipInApp || false,
          skipPush: userPreferences.skipPush || userPrefs.skipPush || false,
          skipEmail: userPreferences.skipEmail || userPrefs.skipEmail || false,
          skipSMS: userPreferences.skipSMS || userPrefs.skipSMS || false
        }
      });

      await notification.save();

      // Populate sender information
      await notification.populate('sender', 'username fullName profilePictureUrl isVerified');

      // Schedule delivery if not immediate
      if (scheduledFor && scheduledFor > new Date()) {
        // Notification will be delivered later by scheduler
        console.log(`[NOTIFICATION] Scheduled notification ${notification._id} for ${scheduledFor}`);
      } else {
        // Deliver immediately
        await this.deliverNotification(notification);
      }

      return notification;
    } catch (error) {
      console.error('[NOTIFICATION] Create notification error:', error);
      throw error;
    }
  }

  /**
   * Deliver notification through all enabled channels
   * @param {Object} notification - Notification object
   */
  async deliverNotification(notification) {
    try {
      const channels = Object.keys(this.deliveryChannels);
      const deliveryPromises = [];

      for (const channel of channels) {
        // Skip if user has disabled this channel
        if (notification.userPreferences[`skip${channel.charAt(0).toUpperCase() + channel.slice(1)}`]) {
          continue;
        }

        deliveryPromises.push(
          this.deliveryChannels[channel](notification)
            .catch(error => {
              console.error(`[NOTIFICATION] Delivery error for channel ${channel}:`, error);
              notification.updateDeliveryStatus(channel, 'failed');
            })
        );
      }

      await Promise.allSettled(deliveryPromises);
    } catch (error) {
      console.error('[NOTIFICATION] Delivery error:', error);
    }
  }

  /**
   * Deliver in-app notification
   * @param {Object} notification - Notification object
   */
  async deliverInApp(notification) {
    try {
      // In-app notifications are automatically "delivered" when created
      await notification.updateDeliveryStatus('inApp', 'delivered');
      
      // Emit real-time event to user's socket
      const io = require('./enhancedRealtimeService').getInstance();
      if (io) {
        const socketId = io.getConnectedUserSocketId(notification.recipient.toString());
        if (socketId) {
          io.to(socketId).emit('notification', {
            id: notification._id,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            image: notification.image,
            actionUrl: notification.actionUrl,
            sender: notification.sender,
            createdAt: notification.createdAt,
            timeAgo: notification.timeAgo
          });
        }
      }

      console.log(`[NOTIFICATION] In-app notification delivered: ${notification._id}`);
    } catch (error) {
      console.error('[NOTIFICATION] In-app delivery error:', error);
      throw error;
    }
  }

  /**
   * Deliver push notification
   * @param {Object} notification - Notification object
   */
  async deliverPush(notification) {
    try {
      // Get user's device tokens
      const user = await User.findById(notification.recipient).select('deviceTokens');
      if (!user.deviceTokens || user.deviceTokens.length === 0) {
        console.log(`[NOTIFICATION] No device tokens found for user: ${notification.recipient}`);
        return;
      }

      // Prepare push notification payload
      const payload = {
        title: notification.title,
        body: notification.message,
        data: {
          notificationId: notification._id.toString(),
          type: notification.type,
          actionUrl: notification.actionUrl,
          senderId: notification.sender._id.toString(),
          senderName: notification.sender.fullName || notification.sender.username
        },
        image: notification.image?.url,
        badge: await this.getUnreadCount(notification.recipient.toString()) + 1
      };

      // Send to each device token
      const deliveryPromises = user.deviceTokens.map(deviceToken => {
        return this.sendPushToDevice(deviceToken, payload);
      });

      await Promise.allSettled(deliveryPromises);
      await notification.updateDeliveryStatus('push', 'delivered');

      console.log(`[NOTIFICATION] Push notification delivered: ${notification._id}`);
    } catch (error) {
      console.error('[NOTIFICATION] Push delivery error:', error);
      throw error;
    }
  }

  /**
   * Deliver email notification
   * @param {Object} notification - Notification object
   */
  async deliverEmail(notification) {
    try {
      const user = await User.findById(notification.recipient).select('email emailNotifications');
      
      if (!user.email || user.emailNotifications === false) {
        console.log(`[NOTIFICATION] Email delivery skipped for user: ${notification.recipient}`);
        return;
      }

      // Prepare email content
      const emailContent = {
        to: user.email,
        subject: notification.title,
        html: this.generateEmailHTML(notification),
        text: notification.message
      };

      // Send email (integrate with your email service)
      await this.sendEmail(emailContent);
      await notification.updateDeliveryStatus('email', 'delivered');

      console.log(`[NOTIFICATION] Email notification delivered: ${notification._id}`);
    } catch (error) {
      console.error('[NOTIFICATION] Email delivery error:', error);
      throw error;
    }
  }

  /**
   * Deliver SMS notification
   * @param {Object} notification - Notification object
   */
  async deliverSMS(notification) {
    try {
      const user = await User.findById(notification.recipient).select('phoneNumber smsNotifications');
      
      if (!user.phoneNumber || user.smsNotifications === false) {
        console.log(`[NOTIFICATION] SMS delivery skipped for user: ${notification.recipient}`);
        return;
      }

      // Only send SMS for high priority notifications
      if (notification.priority !== 'high' && notification.priority !== 'urgent') {
        console.log(`[NOTIFICATION] SMS delivery skipped - low priority: ${notification._id}`);
        return;
      }

      const smsContent = `${notification.title}: ${notification.message}`;
      
      // Send SMS (integrate with your SMS service)
      await this.sendSMS(user.phoneNumber, smsContent);
      await notification.updateDeliveryStatus('sms', 'delivered');

      console.log(`[NOTIFICATION] SMS notification delivered: ${notification._id}`);
    } catch (error) {
      console.error('[NOTIFICATION] SMS delivery error:', error);
      throw error;
    }
  }

  /**
   * Create notification for post engagement
   */
  async notifyPostEngagement(postId, userId, engagementType, data = {}) {
    try {
      const post = await Post.findById(postId).populate('author', 'username fullName');
      if (!post) return;

      const sender = await User.findById(userId).select('username fullName profilePictureUrl');
      if (!sender) return;

      // Don't notify self
      if (post.author._id.toString() === userId) return;

      let title, message, actionUrl;

      switch (engagementType) {
        case 'like':
          title = `${sender.fullName || sender.username} liked your post`;
          message = post.content ? post.content.substring(0, 100) + '...' : 'Your post';
          actionUrl = `/post/${postId}`;
          break;
        case 'comment':
          title = `${sender.fullName || sender.username} commented on your post`;
          message = data.commentContent || 'Your post';
          actionUrl = `/post/${postId}`;
          break;
        case 'share':
          title = `${sender.fullName || sender.username} shared your post`;
          message = post.content ? post.content.substring(0, 100) + '...' : 'Your post';
          actionUrl = `/post/${postId}`;
          break;
        case 'mention':
          title = `${sender.fullName || sender.username} mentioned you in a post`;
          message = post.content ? post.content.substring(0, 100) + '...' : 'A post';
          actionUrl = `/post/${postId}`;
          break;
        default:
          return;
      }

      return await this.createNotification({
        recipientId: post.author._id,
        senderId: userId,
        type: `post_${engagementType}`,
        title,
        message,
        actionUrl,
        relatedContent: {
          contentType: 'post',
          contentId: postId,
          metadata: data
        },
        image: sender.profilePictureUrl ? { url: sender.profilePictureUrl } : null
      });
    } catch (error) {
      console.error('[NOTIFICATION] Post engagement notification error:', error);
    }
  }

  /**
   * Create notification for story engagement
   */
  async notifyStoryEngagement(storyId, userId, engagementType, data = {}) {
    try {
      const story = await Story.findById(storyId).populate('author', 'username fullName');
      if (!story) return;

      const sender = await User.findById(userId).select('username fullName profilePictureUrl');
      if (!sender) return;

      // Don't notify self
      if (story.author._id.toString() === userId) return;

      let title, message, actionUrl;

      switch (engagementType) {
        case 'view':
          // Only notify for first view to avoid spam
          const existingView = story.views.find(v => v.user.toString() === userId);
          if (existingView) return;
          
          title = `${sender.fullName || sender.username} viewed your story`;
          message = 'Your story';
          actionUrl = `/story/${storyId}`;
          break;
        case 'reaction':
          title = `${sender.fullName || sender.username} reacted to your story`;
          message = data.reactionType || 'Your story';
          actionUrl = `/story/${storyId}`;
          break;
        case 'reply':
          title = `${sender.fullName || sender.username} replied to your story`;
          message = data.replyContent || 'Your story';
          actionUrl = `/story/${storyId}`;
          break;
        case 'mention':
          title = `${sender.fullName || sender.username} mentioned you in a story`;
          message = story.content ? story.content.substring(0, 100) + '...' : 'A story';
          actionUrl = `/story/${storyId}`;
          break;
        default:
          return;
      }

      return await this.createNotification({
        recipientId: story.author._id,
        senderId: userId,
        type: `story_${engagementType}`,
        title,
        message,
        actionUrl,
        relatedContent: {
          contentType: 'story',
          contentId: storyId,
          metadata: data
        },
        image: sender.profilePictureUrl ? { url: sender.profilePictureUrl } : null
      });
    } catch (error) {
      console.error('[NOTIFICATION] Story engagement notification error:', error);
    }
  }

  /**
   * Get unread notification count for user
   */
  async getUnreadCount(userId) {
    return await Notification.getUnreadCount(userId);
  }

  /**
   * Get user notifications
   */
  async getUserNotifications(userId, options = {}) {
    return await Notification.getUserNotifications(userId, options);
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId, userId) {
    const notification = await Notification.findOne({
      _id: notificationId,
      recipient: userId
    });

    if (notification) {
      return await notification.markAsRead();
    }
    return null;
  }

  /**
   * Mark all notifications as read for user
   */
  async markAllAsRead(userId) {
    return await Notification.markAllAsRead(userId);
  }

  // Helper methods for external service integration
  async sendPushToDevice(deviceToken, payload) {
    // Integrate with FCM, APNS, or other push service
    console.log(`[NOTIFICATION] Sending push to ${deviceToken.platform}:`, payload);
    // Implementation depends on your push service provider
  }

  async sendEmail(emailContent) {
    // Integrate with your email service (SendGrid, AWS SES, etc.)
    console.log('[NOTIFICATION] Sending email:', emailContent.to);
    // Implementation depends on your email service provider
  }

  async sendSMS(phoneNumber, message) {
    // Integrate with your SMS service (Twilio, AWS SNS, etc.)
    console.log('[NOTIFICATION] Sending SMS to:', phoneNumber);
    // Implementation depends on your SMS service provider
  }

  generateEmailHTML(notification) {
    // Generate HTML email template
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>${notification.title}</h2>
        <p>${notification.message}</p>
        ${notification.actionUrl ? `<a href="${notification.actionUrl}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View</a>` : ''}
      </div>
    `;
  }
}

// Singleton instance
const notificationService = new NotificationService();

module.exports = notificationService;
