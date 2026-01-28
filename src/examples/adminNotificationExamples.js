/**
 * Admin Notification Integration Examples
 * 
 * This file shows practical examples of how to integrate admin notifications
 * into your controllers and services.
 */

const AdminNotificationService = require('../services/adminNotificationService');
const enhancedRealtimeService = require('../services/enhancedRealtimeService');

// ============================================================================
// EXAMPLE 1: User Registration Notification
// ============================================================================

async function exampleUserRegistration(userData) {
  try {
    // ... your user registration logic ...
    const newUser = await User.create(userData);
    
    // Notify all admins about new user registration
    AdminNotificationService.notifyUserRegistered({
      _id: newUser._id,
      username: newUser.username,
      email: newUser.email,
      createdAt: newUser.createdAt
    });
    
    return newUser;
  } catch (error) {
    console.error('Error in user registration:', error);
    throw error;
  }
}

// ============================================================================
// EXAMPLE 2: Content Report Notification
// ============================================================================

async function exampleContentReport(reportData) {
  try {
    const report = await Report.create(reportData);
    
    // Notify admins subscribed to content_reported notifications
    AdminNotificationService.notifyContentReported({
      _id: report._id,
      contentType: report.contentType,
      contentId: report.contentId,
      reason: report.reason,
      reportedBy: report.reportedBy
    });
    
    return report;
  } catch (error) {
    console.error('Error creating report:', error);
    throw error;
  }
}

// ============================================================================
// EXAMPLE 3: User Verification Notification
// ============================================================================

async function exampleUserVerification(userId, verificationStatus) {
  try {
    const user = await User.findByIdAndUpdate(
      userId,
      { verificationStatus: verificationStatus },
      { new: true }
    );
    
    if (verificationStatus === 'approved') {
      // Notify admins about user verification
      AdminNotificationService.notifyUserVerified({
        _id: user._id,
        username: user.username,
        verificationStatus: user.verificationStatus
      });
    }
    
    return user;
  } catch (error) {
    console.error('Error verifying user:', error);
    throw error;
  }
}

// ============================================================================
// EXAMPLE 4: System Alert Notification
// ============================================================================

async function exampleSystemAlert(alertData) {
  try {
    // Notify all admins about system alert
    AdminNotificationService.notifySystemAlert({
      title: alertData.title,
      message: alertData.message,
      priority: alertData.priority || 'high',
      data: alertData.data || {},
      actionUrl: alertData.actionUrl || null
    });
  } catch (error) {
    console.error('Error sending system alert:', error);
    throw error;
  }
}

// ============================================================================
// EXAMPLE 5: Custom Notification (Payment Received)
// ============================================================================

async function examplePaymentReceived(paymentData) {
  try {
    const payment = await Payment.create(paymentData);
    const user = await User.findById(payment.userId);
    
    // Notify all admins about payment
    AdminNotificationService.notifyAllAdmins({
      type: 'payment_received',
      title: 'Payment Received',
      message: `Payment of $${payment.amount} received from ${user.username}`,
      data: {
        paymentId: payment._id.toString(),
        amount: payment.amount,
        userId: payment.userId.toString(),
        paymentMethod: payment.method,
        transactionId: payment.transactionId
      },
      priority: 'normal',
      actionUrl: `/admin/payments/${payment._id}`
    });
    
    return payment;
  } catch (error) {
    console.error('Error processing payment:', error);
    throw error;
  }
}

// ============================================================================
// EXAMPLE 6: User Banned Notification
// ============================================================================

async function exampleUserBanned(userId, banReason) {
  try {
    const user = await User.findByIdAndUpdate(
      userId,
      { isActive: false, banReason: banReason },
      { new: true }
    );
    
    // Notify all admins
    AdminNotificationService.notifyAllAdmins({
      type: 'user_banned',
      title: 'User Banned',
      message: `${user.username} has been banned`,
      data: {
        userId: user._id.toString(),
        username: user.username,
        banReason: banReason,
        bannedAt: new Date()
      },
      priority: 'high',
      actionUrl: `/admin/users/${user._id}`
    });
    
    return user;
  } catch (error) {
    console.error('Error banning user:', error);
    throw error;
  }
}

// ============================================================================
// EXAMPLE 7: Analytics Update Notification
// ============================================================================

async function exampleAnalyticsUpdate(analyticsData) {
  try {
    // Notify admins subscribed to analytics updates
    AdminNotificationService.notifySubscribedAdmins('analytics_update', {
      type: 'analytics_update',
      title: 'Analytics Updated',
      message: 'Daily analytics report is ready',
      data: {
        date: analyticsData.date,
        totalUsers: analyticsData.totalUsers,
        newUsers: analyticsData.newUsers,
        activeUsers: analyticsData.activeUsers
      },
      priority: 'low',
      actionUrl: '/admin/analytics'
    });
  } catch (error) {
    console.error('Error updating analytics:', error);
    throw error;
  }
}

// ============================================================================
// EXAMPLE 8: Direct Usage (Advanced)
// ============================================================================

async function exampleDirectUsage() {
  try {
    // Direct usage with enhancedRealtimeService for more control
    enhancedRealtimeService.emitToAllAdmins('admin:notification', {
      id: `custom_${Date.now()}`,
      type: 'custom_event',
      title: 'Custom Event',
      message: 'This is a custom notification',
      data: {
        customField: 'customValue',
        timestamp: new Date()
      },
      priority: 'normal',
      timestamp: new Date(),
      actionUrl: '/admin/custom-page'
    });
  } catch (error) {
    console.error('Error sending custom notification:', error);
    throw error;
  }
}

module.exports = {
  exampleUserRegistration,
  exampleContentReport,
  exampleUserVerification,
  exampleSystemAlert,
  examplePaymentReceived,
  exampleUserBanned,
  exampleAnalyticsUpdate,
  exampleDirectUsage
};
