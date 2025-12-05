const Notification = require('../models/notificationModel');
const pushNotificationService = require('../../services/pushNotificationService');
const deliveryManager = require('./deliveryManager');

/**
 * Push Notification Retry Queue
 * Handles retry logic for failed push notifications
 */
class PushNotificationRetryQueue {
  constructor() {
    this.retryQueue = [];
    this.maxRetries = 3;
    this.retryDelays = [1000, 5000, 30000]; // 1s, 5s, 30s
    this.processing = false;
    this.processInterval = null;
  }

  /**
   * Start processing retry queue
   */
  start() {
    if (this.processInterval) {
      return; // Already started
    }

    // Process queue every 30 seconds
    this.processInterval = setInterval(() => {
      this.processQueue();
    }, 30000);

    console.log('[PUSH RETRY] Retry queue processor started');
  }

  /**
   * Stop processing retry queue
   */
  stop() {
    if (this.processInterval) {
      clearInterval(this.processInterval);
      this.processInterval = null;
      console.log('[PUSH RETRY] Retry queue processor stopped');
    }
  }

  /**
   * Add failed notification to retry queue
   * @param {Object} notification - Notification document
   * @param {number} attempt - Current attempt number
   */
  async addToQueue(notification, attempt = 0) {
    if (attempt >= this.maxRetries) {
      console.log(`[PUSH RETRY] Max retries reached for notification ${notification._id}, marking as failed`);
      notification.deliveryChannels.push.delivered = false;
      notification.deliveryChannels.push.retryAttempts = attempt;
      await notification.updateDeliveryStatus('push', 'failed');
      return;
    }

    const retryDelay = this.retryDelays[attempt] || this.retryDelays[this.retryDelays.length - 1];
    const retryAt = new Date(Date.now() + retryDelay);

    this.retryQueue.push({
      notificationId: notification._id.toString(),
      notification: notification,
      attempt: attempt + 1,
      retryAt: retryAt,
      addedAt: new Date()
    });

    console.log(`[PUSH RETRY] Added notification ${notification._id} to retry queue (attempt ${attempt + 1}, retry at ${retryAt.toISOString()})`);
  }

  /**
   * Process retry queue
   */
  async processQueue() {
    if (this.processing || this.retryQueue.length === 0) {
      return;
    }

    this.processing = true;
    const now = new Date();
    const toRetry = [];

    // Find notifications ready for retry
    for (let i = this.retryQueue.length - 1; i >= 0; i--) {
      const item = this.retryQueue[i];
      if (item.retryAt <= now) {
        toRetry.push(item);
        this.retryQueue.splice(i, 1);
      }
    }

    console.log(`[PUSH RETRY] Processing ${toRetry.length} notification(s) from retry queue`);

    // Retry each notification
    for (const item of toRetry) {
      try {
        // Reload notification from database to get latest state
        const notification = await Notification.findById(item.notificationId);
        if (!notification) {
          console.log(`[PUSH RETRY] Notification ${item.notificationId} not found, skipping`);
          continue;
        }

        // Check if already delivered
        if (notification.deliveryChannels.push.delivered) {
          console.log(`[PUSH RETRY] Notification ${item.notificationId} already delivered, skipping`);
          continue;
        }

        console.log(`[PUSH RETRY] Retrying notification ${item.notificationId} (attempt ${item.attempt})`);

        // Retry push delivery using deliveryManager's deliverToChannel method
        const preferences = await require('../models/notificationPreferencesModel').getUserPreferences(notification.recipient);
        await deliveryManager.deliverToChannel('push', notification, preferences);

        // If still failed, add back to queue
        if (!notification.deliveryChannels.push.delivered) {
          await this.addToQueue(notification, item.attempt);
        } else {
          console.log(`[PUSH RETRY] ✅ Successfully delivered notification ${item.notificationId} on retry attempt ${item.attempt}`);
        }
      } catch (error) {
        console.error(`[PUSH RETRY] Error retrying notification ${item.notificationId}:`, error);
        // Add back to queue if not at max retries
        if (item.attempt < this.maxRetries) {
          await this.addToQueue(item.notification, item.attempt);
        }
      }
    }

    this.processing = false;
  }

  /**
   * Get queue status
   */
  getStatus() {
    return {
      queueSize: this.retryQueue.length,
      processing: this.processing,
      nextRetry: this.retryQueue.length > 0 
        ? this.retryQueue.reduce((earliest, item) => 
            !earliest || item.retryAt < earliest ? item.retryAt : earliest, null)
        : null
    };
  }
}

// Singleton instance
const pushNotificationRetryQueue = new PushNotificationRetryQueue();

module.exports = pushNotificationRetryQueue;

