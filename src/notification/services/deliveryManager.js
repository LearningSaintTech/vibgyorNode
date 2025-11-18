const NotificationPreferences = require('../models/notificationPreferencesModel');
const enhancedRealtimeService = require('../../../services/enhancedRealtimeService');
const emailService = require('../../../services/emailService');
const pushNotificationService = require('../../../services/pushNotificationService');
const User = require('../../../user/auth/model/userAuthModel');

/**
 * Delivery Manager
 * Manages delivery of notifications through various channels
 */
class DeliveryManager {
  constructor() {
    this.channels = new Map();
    this.initializeChannels();
  }

  /**
   * Initialize delivery channels
   */
  initializeChannels() {
    this.channels.set('inApp', this.deliverInApp.bind(this));
    this.channels.set('push', this.deliverPush.bind(this));
    this.channels.set('email', this.deliverEmail.bind(this));
    this.channels.set('sms', this.deliverSMS.bind(this));
  }

  /**
   * Deliver notification through all enabled channels
   * @param {Object} notification - Notification document
   * @returns {Promise<Object>} Delivery results
   */
  async deliver(notification) {
    const results = {
      inApp: { delivered: false, error: null },
      push: { delivered: false, error: null },
      email: { delivered: false, error: null },
      sms: { delivered: false, error: null }
    };

    try {
      // Get user preferences
      const preferences = await NotificationPreferences.getUserPreferences(notification.recipient);

      // Check if user has notifications enabled
      if (!preferences.globalSettings.enableNotifications) {
        console.log(`[DELIVERY] Notifications disabled for user: ${notification.recipient}`);
        return results;
      }

      // Check if notification type is enabled for user
      const isEnabled = preferences.isNotificationEnabled(
        notification.context,
        notification.type,
        'inApp'
      );

      if (!isEnabled) {
        console.log(`[DELIVERY] Notification type ${notification.type} disabled for user: ${notification.recipient}`);
        return results;
      }

      // Deliver through each channel
      const deliveryPromises = [];

      // In-App delivery
      if (!notification.userPreferences?.skipInApp) {
        const inAppEnabled = preferences.isNotificationEnabled(
          notification.context,
          notification.type,
          'inApp'
        );
        if (inAppEnabled) {
          deliveryPromises.push(
            this.deliverToChannel('inApp', notification, preferences)
              .then(result => {
                results.inApp = result;
              })
              .catch(error => {
                results.inApp = { delivered: false, error: error.message };
              })
          );
        }
      }

      // Push notification
      if (!notification.userPreferences?.skipPush) {
        const pushEnabled = preferences.isNotificationEnabled(
          notification.context,
          notification.type,
          'push'
        );
        if (pushEnabled) {
          deliveryPromises.push(
            this.deliverToChannel('push', notification, preferences)
              .then(result => {
                results.push = result;
              })
              .catch(error => {
                results.push = { delivered: false, error: error.message };
              })
          );
        }
      }

      // Email delivery
      if (!notification.userPreferences?.skipEmail) {
        const emailEnabled = preferences.isNotificationEnabled(
          notification.context,
          notification.type,
          'email'
        );
        if (emailEnabled) {
          deliveryPromises.push(
            this.deliverToChannel('email', notification, preferences)
              .then(result => {
                results.email = result;
              })
              .catch(error => {
                results.email = { delivered: false, error: error.message };
              })
          );
        }
      }

      // SMS delivery (only for urgent notifications or if enabled)
      if (!notification.userPreferences?.skipSMS && 
          (notification.priority === 'urgent' || preferences.channels.sms.enabled)) {
        const smsEnabled = preferences.isNotificationEnabled(
          notification.context,
          notification.type,
          'sms'
        );
        if (smsEnabled) {
          deliveryPromises.push(
            this.deliverToChannel('sms', notification, preferences)
              .then(result => {
                results.sms = result;
              })
              .catch(error => {
                results.sms = { delivered: false, error: error.message };
              })
          );
        }
      }

      // Wait for all deliveries
      await Promise.allSettled(deliveryPromises);

      // Update notification delivery status
      await this.updateDeliveryStatus(notification, results);

    } catch (error) {
      console.error('[DELIVERY] Error delivering notification:', error);
      throw error;
    }

    return results;
  }

  /**
   * Deliver to a specific channel
   * @param {string} channel - Channel name
   * @param {Object} notification - Notification document
   * @param {Object} preferences - User preferences
   * @returns {Promise<Object>} Delivery result
   */
  async deliverToChannel(channel, notification, preferences) {
    const channelHandler = this.channels.get(channel);
    if (!channelHandler) {
      throw new Error(`Channel handler not found: ${channel}`);
    }

    try {
      await channelHandler(notification, preferences);
      return { delivered: true, error: null };
    } catch (error) {
      console.error(`[DELIVERY] Error delivering to ${channel}:`, error);
      return { delivered: false, error: error.message };
    }
  }

  /**
   * Deliver in-app notification
   * @param {Object} notification - Notification document
   * @param {Object} preferences - User preferences
   */
  async deliverInApp(notification, preferences) {
    try {
      // Emit real-time event via Socket.IO
      if (enhancedRealtimeService && enhancedRealtimeService.io) {
        const recipientId = notification.recipient.toString ? notification.recipient.toString() : notification.recipient;
        
        enhancedRealtimeService.io.to(`user:${recipientId}`).emit('notification', {
          id: notification._id,
          context: notification.context,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data instanceof Map ? Object.fromEntries(notification.data) : (notification.data || {}),
          relatedContent: notification.relatedContent,
          priority: notification.priority,
          createdAt: notification.createdAt
        });

        // Update delivery status
        notification.deliveryChannels.inApp.delivered = true;
        notification.deliveryChannels.inApp.deliveredAt = new Date();
        await notification.updateDeliveryStatus('inApp', 'delivered');
      } else {
        console.warn('[DELIVERY] Socket.IO not initialized, skipping in-app delivery');
      }
    } catch (error) {
      console.error('[DELIVERY] Error delivering in-app notification:', error);
      throw error;
    }
  }

  /**
   * Deliver push notification
   * @param {Object} notification - Notification document
   * @param {Object} preferences - User preferences
   */
  async deliverPush(notification, preferences) {
    try {
      if (!pushNotificationService.isInitialized()) {
        console.warn('[DELIVERY] Push notification service not initialized. Skipping push delivery.');
        notification.deliveryChannels.push.delivered = false;
        await notification.updateDeliveryStatus('push', 'failed');
        return;
      }

      // Get user's active device tokens
      const user = await User.findById(notification.recipient);
      if (!user) {
        throw new Error('User not found');
      }

      const deviceTokens = user.getActiveDeviceTokens();
      
      if (deviceTokens.length === 0) {
        console.log(`[DELIVERY] No active device tokens for user: ${notification.recipient}`);
        notification.deliveryChannels.push.delivered = false;
        await notification.updateDeliveryStatus('push', 'failed');
        return;
      }

      // Prepare notification payload
      const pushNotification = {
        title: notification.title,
        message: notification.message,
        image: notification.image?.url
      };

      const pushData = {
        notificationId: notification._id.toString(),
        type: notification.type,
        context: notification.context,
        priority: notification.priority,
        relatedContent: notification.relatedContent ? JSON.stringify(notification.relatedContent) : '{}',
        actionUrl: notification.actionUrl || '',
        senderId: notification.sender ? notification.sender.toString() : ''
      };

      // Group tokens by platform
      const tokensByPlatform = {
        ios: [],
        android: [],
        web: []
      };

      deviceTokens.forEach(dt => {
        if (tokensByPlatform[dt.platform]) {
          tokensByPlatform[dt.platform].push(dt.token);
        }
      });

      const results = [];
      const tokensToRemove = [];

      // Send to each platform
      for (const [platform, tokens] of Object.entries(tokensByPlatform)) {
        if (tokens.length === 0) continue;

        if (tokens.length === 1) {
          // Single device
          const result = await pushNotificationService.sendToDevice(
            tokens[0],
            platform,
            pushNotification,
            pushData
          );
          
          if (result.shouldRemove) {
            tokensToRemove.push(tokens[0]);
          }
          results.push(result);
        } else {
          // Multiple devices
          const result = await pushNotificationService.sendToMultipleDevices(
            tokens,
            pushNotification,
            pushData
          );
          
          if (result.results) {
            result.results.forEach(batchResult => {
              if (batchResult.responses) {
                batchResult.responses.forEach(resp => {
                  if (resp.shouldRemove) {
                    tokensToRemove.push(resp.token);
                  }
                  results.push(resp);
                });
              }
            });
          }
        }
      }

      // Remove invalid tokens
      if (tokensToRemove.length > 0) {
        for (const token of tokensToRemove) {
          await user.removeDeviceToken(token);
        }
        console.log(`[DELIVERY] Removed ${tokensToRemove.length} invalid device tokens`);
      }

      // Check if any notification was sent successfully
      const successCount = results.filter(r => r.success).length;
      
      if (successCount > 0) {
        notification.deliveryChannels.push.delivered = true;
        notification.deliveryChannels.push.deliveredAt = new Date();
        notification.deliveryChannels.push.deviceTokens = deviceTokens.map(dt => ({
          token: dt.token,
          platform: dt.platform
        }));
        await notification.updateDeliveryStatus('push', 'delivered');
        console.log(`[DELIVERY] ✅ Push notification sent to ${successCount} device(s)`);
      } else {
        notification.deliveryChannels.push.delivered = false;
        await notification.updateDeliveryStatus('push', 'failed');
        console.log(`[DELIVERY] ❌ Failed to send push notification`);
      }
    } catch (error) {
      console.error('[DELIVERY] Error delivering push notification:', error);
      notification.deliveryChannels.push.delivered = false;
      await notification.updateDeliveryStatus('push', 'failed');
      throw error;
    }
  }

  /**
   * Deliver email notification
   * @param {Object} notification - Notification document
   * @param {Object} preferences - User preferences
   */
  async deliverEmail(notification, preferences) {
    try {
      // Check email frequency preference
      const emailFrequency = preferences.channels.email.frequency;
      
      // TODO: Implement email digest logic
      // For now, send immediate email
      if (emailFrequency === 'immediate') {
        // Get recipient email from notification or user
        const email = notification.deliveryChannels.email.emailAddress;
        if (email) {
          // Send email via email service
          await emailService.sendEmail({
            to: email,
            subject: notification.title,
            text: notification.message,
            html: `<p>${notification.message}</p>`
          });

          notification.deliveryChannels.email.delivered = true;
          notification.deliveryChannels.email.deliveredAt = new Date();
          await notification.updateDeliveryStatus('email', 'delivered');
        }
      }
    } catch (error) {
      console.error('[DELIVERY] Error delivering email notification:', error);
      throw error;
    }
  }

  /**
   * Deliver SMS notification
   * @param {Object} notification - Notification document
   * @param {Object} preferences - User preferences
   */
  async deliverSMS(notification, preferences) {
    try {
      // TODO: Implement SMS delivery (Twilio/AWS SNS)
      // For now, just log
      console.log(`[DELIVERY] SMS notification would be sent to user: ${notification.recipient}`);
      
      // Only send SMS for urgent notifications or if emergency only is disabled
      if (notification.priority === 'urgent' || !preferences.channels.sms.emergencyOnly) {
        const phoneNumber = notification.deliveryChannels.sms.phoneNumber;
        if (phoneNumber) {
          // TODO: Send SMS
          notification.deliveryChannels.sms.delivered = true;
          notification.deliveryChannels.sms.deliveredAt = new Date();
          await notification.updateDeliveryStatus('sms', 'delivered');
        }
      }
    } catch (error) {
      console.error('[DELIVERY] Error delivering SMS notification:', error);
      throw error;
    }
  }

  /**
   * Update notification delivery status
   * @param {Object} notification - Notification document
   * @param {Object} results - Delivery results
   */
  async updateDeliveryStatus(notification, results) {
    try {
      // Update delivery status based on results
      const deliveredChannels = Object.keys(results).filter(
        channel => results[channel].delivered === true
      );

      if (deliveredChannels.length > 0) {
        notification.deliveryStatus = 'sent';
        if (deliveredChannels.length === Object.keys(results).length) {
          notification.deliveryStatus = 'delivered';
        }
      } else {
        notification.deliveryStatus = 'failed';
      }

      await notification.save();
    } catch (error) {
      console.error('[DELIVERY] Error updating delivery status:', error);
      throw error;
    }
  }
}

// Singleton instance
const deliveryManager = new DeliveryManager();

module.exports = deliveryManager;

