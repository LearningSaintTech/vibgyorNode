const enhancedRealtimeService = require('./enhancedRealtimeService');

/**
 * Admin Notification Service
 * Helper service for emitting notifications to admin panel
 */
class AdminNotificationService {
  /**
   * Emit notification to all admins
   * @param {Object} notification - Notification data
   * @param {string} notification.type - Notification type
   * @param {string} notification.title - Notification title
   * @param {string} notification.message - Notification message
   * @param {Object} notification.data - Additional data
   * @param {string} notification.priority - Priority (low/normal/high/urgent)
   * @param {string} notification.actionUrl - Optional action URL
   */
  static notifyAllAdmins(notification) {
    const notificationData = {
      id: notification.id || `admin_notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data || {},
      priority: notification.priority || 'normal',
      timestamp: new Date(),
      actionUrl: notification.actionUrl || null
    };

    enhancedRealtimeService.emitToAllAdmins('admin:notification', notificationData);
    console.log(`[ADMIN_NOTIFICATION] ✅ Notification sent to all admins: ${notificationData.type}`);
  }

  /**
   * Emit notification to specific admin
   * @param {string} adminId - Admin ID
   * @param {Object} notification - Notification data
   */
  static notifyAdmin(adminId, notification) {
    const notificationData = {
      id: notification.id || `admin_notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data || {},
      priority: notification.priority || 'normal',
      timestamp: new Date(),
      actionUrl: notification.actionUrl || null
    };

    enhancedRealtimeService.emitToAdmin(adminId, 'admin:notification', notificationData);
    console.log(`[ADMIN_NOTIFICATION] ✅ Notification sent to admin ${adminId}: ${notificationData.type}`);
  }

  /**
   * Emit notification to admins subscribed to specific type
   * @param {string} notificationType - Notification type
   * @param {Object} notification - Notification data
   */
  static notifySubscribedAdmins(notificationType, notification) {
    const notificationData = {
      id: notification.id || `admin_notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: notificationType,
      title: notification.title,
      message: notification.message,
      data: notification.data || {},
      priority: notification.priority || 'normal',
      timestamp: new Date(),
      actionUrl: notification.actionUrl || null
    };

    enhancedRealtimeService.emitToAdminSubscribers(notificationType, 'admin:notification', notificationData);
    console.log(`[ADMIN_NOTIFICATION] ✅ Notification sent to admins subscribed to ${notificationType}`);
  }

  /**
   * Notify admins about new user registration
   * @param {Object} userData - User data
   */
  static notifyUserRegistered(userData) {
    this.notifyAllAdmins({
      type: 'user_registered',
      title: 'New User Registration',
      message: `${userData.username || 'A user'} has registered`,
      data: {
        userId: userData._id?.toString() || userData.id,
        username: userData.username,
        email: userData.email,
        registeredAt: userData.createdAt || new Date()
      },
      priority: 'normal',
      actionUrl: `/admin/users/${userData._id || userData.id}`
    });
  }

  /**
   * Notify admins about content report
   * @param {Object} reportData - Report data
   */
  static notifyContentReported(reportData) {
    this.notifySubscribedAdmins('content_reported', {
      type: 'content_reported',
      title: 'Content Reported',
      message: `Content reported: ${reportData.contentType}`,
      data: {
        reportId: reportData._id?.toString() || reportData.id,
        contentType: reportData.contentType,
        contentId: reportData.contentId,
        reason: reportData.reason,
        reportedBy: reportData.reportedBy
      },
      priority: 'high',
      actionUrl: `/admin/moderation/reports/${reportData._id || reportData.id}`
    });
  }

  /**
   * Notify admins about user verification
   * @param {Object} userData - User data
   */
  static notifyUserVerified(userData) {
    this.notifySubscribedAdmins('user_verified', {
      type: 'user_verified',
      title: 'User Verified',
      message: `${userData.username} has been verified`,
      data: {
        userId: userData._id?.toString() || userData.id,
        username: userData.username,
        verificationStatus: userData.verificationStatus
      },
      priority: 'normal',
      actionUrl: `/admin/users/${userData._id || userData.id}`
    });
  }

  /**
   * Notify admins about system alert
   * @param {Object} alertData - Alert data
   */
  static notifySystemAlert(alertData) {
    this.notifyAllAdmins({
      type: 'system_alert',
      title: alertData.title || 'System Alert',
      message: alertData.message,
      data: alertData.data || {},
      priority: alertData.priority || 'high',
      actionUrl: alertData.actionUrl || null
    });
  }
}

module.exports = AdminNotificationService;
