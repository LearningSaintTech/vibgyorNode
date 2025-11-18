const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

/**
 * Push Notification Service
 * Handles FCM (Android) and APNS (iOS) push notifications
 */
class PushNotificationService {
  constructor() {
    this.fcmInitialized = false;
    this.apnsInitialized = false;
    this.initializeFCM();
    this.initializeAPNS();
  }

  /**
   * Initialize Firebase Cloud Messaging (FCM)
   */
  initializeFCM() {
    try {
      // Check if already initialized
      if (admin.apps.length > 0) {
        this.fcmInitialized = true;
        console.log('[PUSH] ✅ FCM already initialized');
        return;
      }

      const serviceAccountPath = process.env.FCM_SERVICE_ACCOUNT_PATH;
      
      if (!serviceAccountPath) {
        console.warn('[PUSH] ⚠️ FCM service account path not provided. Push notifications will be disabled.');
        return;
      }

      // Check if file exists
      const fullPath = path.resolve(serviceAccountPath);
      if (!fs.existsSync(fullPath)) {
        console.warn('[PUSH] ⚠️ FCM service account file not found:', fullPath);
        return;
      }

      const serviceAccount = require(fullPath);
      
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id
      });

      this.fcmInitialized = true;
      console.log('[PUSH] ✅ FCM initialized successfully');
    } catch (error) {
      console.error('[PUSH] ❌ Error initializing FCM:', error.message);
      this.fcmInitialized = false;
    }
  }

  /**
   * Initialize Apple Push Notification Service (APNS)
   * Note: FCM handles iOS notifications, but native APNS can be added here
   */
  initializeAPNS() {
    try {
      // APNS is handled through FCM for cross-platform support
      // If you need native APNS, use node-apn package
      const apnsKeyPath = process.env.APNS_KEY_PATH;
      const apnsKeyId = process.env.APNS_KEY_ID;
      const apnsTeamId = process.env.APNS_TEAM_ID;
      const apnsBundleId = process.env.APNS_BUNDLE_ID;

      if (apnsKeyPath && apnsKeyId && apnsTeamId && apnsBundleId) {
        // Native APNS implementation would go here using node-apn
        // For now, we'll use FCM which supports iOS
        this.apnsInitialized = true;
        console.log('[PUSH] ✅ APNS configured (via FCM)');
      } else {
        // APNS not configured, but FCM can still handle iOS
        this.apnsInitialized = this.fcmInitialized;
      }
    } catch (error) {
      console.error('[PUSH] ❌ Error initializing APNS:', error.message);
      this.apnsInitialized = false;
    }
  }

  /**
   * Send push notification to a single device
   * @param {string} token - Device token
   * @param {string} platform - Platform (ios/android/web)
   * @param {Object} notification - Notification data
   * @param {Object} data - Additional data payload
   * @returns {Promise<Object>} Result
   */
  async sendToDevice(token, platform, notification, data = {}) {
    try {
      if (!this.fcmInitialized) {
        throw new Error('FCM not initialized. Please configure FCM_SERVICE_ACCOUNT_PATH in .env');
      }

      const message = {
        token: token,
        notification: {
          title: notification.title,
          body: notification.message || notification.body,
          ...(notification.image && { imageUrl: notification.image })
        },
        data: {
          ...data,
          notificationId: data.notificationId || '',
          type: data.type || '',
          context: data.context || 'social',
          priority: data.priority || 'normal',
          // Convert objects to strings for FCM
          relatedContent: typeof data.relatedContent === 'string' 
            ? data.relatedContent 
            : JSON.stringify(data.relatedContent || {})
        },
        android: {
          priority: this.getAndroidPriority(data.priority),
          notification: {
            sound: 'default',
            channelId: this.getAndroidChannel(data.type),
            clickAction: 'FLUTTER_NOTIFICATION_CLICK',
            icon: 'notification_icon',
            color: '#FF5722',
            ...(notification.image && { imageUrl: notification.image })
          }
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title: notification.title,
                body: notification.message || notification.body
              },
              sound: 'default',
              badge: 1,
              'content-available': 1,
              ...(notification.image && { 'mutable-content': 1 })
            }
          },
          headers: {
            'apns-priority': this.getAPNSPriority(data.priority)
          }
        },
        webpush: {
          notification: {
            title: notification.title,
            body: notification.message || notification.body,
            icon: notification.image || '/icon-192x192.png',
            badge: '/badge-72x72.png',
            requireInteraction: data.priority === 'urgent',
            ...(notification.image && { image: notification.image })
          }
        }
      };

      const response = await admin.messaging().send(message);
      console.log('[PUSH] ✅ Notification sent successfully:', response);
      
      return {
        success: true,
        messageId: response,
        token: token
      };
    } catch (error) {
      console.error('[PUSH] ❌ Error sending notification:', error.message);
      
      // Handle invalid token
      if (error.code === 'messaging/invalid-registration-token' || 
          error.code === 'messaging/registration-token-not-registered') {
        return {
          success: false,
          error: 'invalid_token',
          token: token,
          shouldRemove: true
        };
      }
      
      return {
        success: false,
        error: error.message,
        token: token,
        code: error.code
      };
    }
  }

  /**
   * Send push notification to multiple devices
   * @param {Array} tokens - Array of device tokens
   * @param {Object} notification - Notification data
   * @param {Object} data - Additional data payload
   * @returns {Promise<Object>} Results
   */
  async sendToMultipleDevices(tokens, notification, data = {}) {
    if (!tokens || tokens.length === 0) {
      return { success: false, error: 'No tokens provided' };
    }

    try {
      if (!this.fcmInitialized) {
        throw new Error('FCM not initialized');
      }

      const message = {
        notification: {
          title: notification.title,
          body: notification.message || notification.body,
          ...(notification.image && { imageUrl: notification.image })
        },
        data: {
          ...data,
          notificationId: data.notificationId || '',
          type: data.type || '',
          context: data.context || 'social',
          priority: data.priority || 'normal',
          relatedContent: typeof data.relatedContent === 'string' 
            ? data.relatedContent 
            : JSON.stringify(data.relatedContent || {})
        },
        android: {
          priority: this.getAndroidPriority(data.priority),
          notification: {
            sound: 'default',
            channelId: this.getAndroidChannel(data.type),
            clickAction: 'FLUTTER_NOTIFICATION_CLICK',
            ...(notification.image && { imageUrl: notification.image })
          }
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title: notification.title,
                body: notification.message || notification.body
              },
              sound: 'default',
              badge: 1
            }
          },
          headers: {
            'apns-priority': this.getAPNSPriority(data.priority)
          }
        }
      };

      // FCM supports up to 500 tokens per batch
      const batchSize = 500;
      const results = [];
      
      for (let i = 0; i < tokens.length; i += batchSize) {
        const batch = tokens.slice(i, i + batchSize);
        const batchMessage = {
          ...message,
          tokens: batch
        };
        
        try {
          const response = await admin.messaging().sendEachForMulticast(batchMessage);
          results.push({
            successCount: response.successCount,
            failureCount: response.failureCount,
            responses: response.responses.map((resp, idx) => ({
              token: batch[idx],
              success: resp.success,
              error: resp.error ? resp.error.message : null,
              code: resp.error ? resp.error.code : null,
              shouldRemove: resp.error && (
                resp.error.code === 'messaging/invalid-registration-token' ||
                resp.error.code === 'messaging/registration-token-not-registered'
              )
            }))
          });
        } catch (error) {
          console.error('[PUSH] Error sending batch:', error);
          results.push({
            successCount: 0,
            failureCount: batch.length,
            error: error.message
          });
        }
      }
      
      return {
        success: true,
        results: results
      };
    } catch (error) {
      console.error('[PUSH] ❌ Error sending to multiple devices:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get Android priority
   */
  getAndroidPriority(priority) {
    const priorityMap = {
      'urgent': 'high',
      'high': 'high',
      'normal': 'normal',
      'low': 'normal'
    };
    return priorityMap[priority] || 'normal';
  }

  /**
   * Get Android notification channel
   */
  getAndroidChannel(type) {
    const channelMap = {
      'call_incoming': 'calls',
      'call_missed': 'calls',
      'message_received': 'messages',
      'message_request': 'messages',
      'follow_request': 'social',
      'post_like': 'social',
      'post_comment': 'social',
      'match': 'dating',
      'default': 'general'
    };
    return channelMap[type] || 'general';
  }

  /**
   * Get APNS priority
   */
  getAPNSPriority(priority) {
    return priority === 'urgent' || priority === 'high' ? '10' : '5';
  }

  /**
   * Check if service is initialized
   */
  isInitialized() {
    return this.fcmInitialized || this.apnsInitialized;
  }
}

// Singleton instance
const pushNotificationService = new PushNotificationService();

module.exports = pushNotificationService;

