# Admin Panel Notifications Integration Guide

This guide explains how to integrate real-time notifications for the web-based admin panel using Socket.IO.

## Overview

The admin panel can receive real-time notifications via Socket.IO. Admins connect to the same Socket.IO server as users but are authenticated differently and join admin-specific rooms.

## What Has Been Implemented

### Backend Changes

1. **Socket.IO Middleware Updated** (`enhancedRealtimeService.js`):
   - Added admin authentication support
   - Admins authenticate with JWT tokens containing `role: 'admin'`
   - Admins are tracked separately from users

2. **Admin Connection Handling**:
   - `handleAdminConnection()` - Manages admin socket connections
   - Admins automatically join `admin:{adminId}` and `admin:all` rooms
   - Supports multiple connections per admin (multiple tabs/devices)

3. **Admin Event Handlers**:
   - `setupAdminEvents()` - Handles admin-specific events
   - `admin:subscribe` - Subscribe to specific notification types
   - `admin:unsubscribe` - Unsubscribe from notification types

4. **Notification Emission Methods**:
   - `emitToAllAdmins(event, data)` - Emit to all connected admins
   - `emitToAdmin(adminId, event, data)` - Emit to specific admin
   - `emitToAdminSubscribers(type, event, data)` - Emit to subscribed admins only

5. **Admin Notification Service** (`adminNotificationService.js`):
   - Helper service with convenient methods:
     - `notifyAllAdmins()` - Send notification to all admins
     - `notifyAdmin()` - Send to specific admin
     - `notifySubscribedAdmins()` - Send to subscribed admins
     - `notifyUserRegistered()` - Pre-built user registration notification
     - `notifyContentReported()` - Pre-built content report notification
     - `notifyUserVerified()` - Pre-built user verification notification
     - `notifySystemAlert()` - Pre-built system alert notification

6. **Disconnection Handling**:
   - Updated to handle admin disconnections
   - Cleanup of stale admin connections

### Files Modified/Created

- ✅ `vibgyorNode/src/services/enhancedRealtimeService.js` - Updated with admin support
- ✅ `vibgyorNode/src/services/adminNotificationService.js` - New helper service
- ✅ `vibgyorNode/src/examples/adminNotificationExamples.js` - Usage examples
- ✅ `vibgyorNode/ADMIN_NOTIFICATIONS_INTEGRATION.md` - This documentation

## Backend Setup

### 1. Socket.IO Authentication

The Socket.IO middleware has been updated to support admin authentication. Admins connect with their admin JWT token (which includes `role: 'admin'`).

### 2. Admin Rooms

Admins automatically join two rooms:
- `admin:{adminId}` - Personal room for specific admin
- `admin:all` - Global room for all admins

Admins can also subscribe to specific notification types:
- `admin:notifications:{type}` - Room for specific notification types (e.g., `admin:notifications:user_registered`)

## Frontend Integration (Web Admin Panel)

### 1. Install Socket.IO Client

```bash
npm install socket.io-client
```

### 2. Connect to Socket.IO Server

```javascript
import io from 'socket.io-client';

// Get admin access token from your auth system
const adminToken = localStorage.getItem('adminAccessToken'); // or from your auth context

// Connect to Socket.IO server
const socket = io('http://your-server-url:3000', {
  transports: ['websocket', 'polling'],
  auth: {
    token: adminToken
  },
  extraHeaders: {
    Authorization: `Bearer ${adminToken}`
  }
});

// Connection events
socket.on('connect', () => {
  console.log('✅ Admin connected to Socket.IO:', socket.id);
});

socket.on('connection_success', (data) => {
  console.log('✅ Admin connection confirmed:', data);
  // data contains: { adminId, socketId, role: 'admin', totalConnections, timestamp }
});

socket.on('disconnect', (reason) => {
  console.log('❌ Admin disconnected:', reason);
});

socket.on('error', (error) => {
  console.error('Socket error:', error);
});

socket.on('token:expired', (data) => {
  console.warn('Token expired, refresh required');
  // Handle token refresh
});
```

### 3. Listen for Admin Notifications

```javascript
// Listen for all admin notifications
socket.on('admin:notification', (notificationData) => {
  console.log('📨 Admin notification received:', notificationData);
  // Handle notification (show toast, update UI, etc.)
  // notificationData structure:
  // {
  //   id: 'notification_id',
  //   type: 'user_registered' | 'content_reported' | 'system_alert' | etc.,
  //   title: 'Notification Title',
  //   message: 'Notification message',
  //   data: { ... },
  //   priority: 'low' | 'normal' | 'high' | 'urgent',
  //   timestamp: '2026-01-26T...',
  //   actionUrl: '/admin/users/123' // Optional deep link
  // }
});

// Subscribe to specific notification types
socket.emit('admin:subscribe', {
  notificationTypes: [
    'user_registered',
    'content_reported',
    'user_verified',
    'system_alert'
  ]
});

socket.on('admin:subscribed', (data) => {
  console.log('✅ Subscribed to notification types:', data.notificationTypes);
});

// Unsubscribe from notification types
socket.emit('admin:unsubscribe', {
  notificationTypes: ['user_registered']
});
```

### 4. Handle Notification Read Status

```javascript
// Mark notification as read
socket.emit('notification:read', {
  notificationId: 'notification_id'
});

socket.on('notification:read_confirmed', (data) => {
  console.log('✅ Notification marked as read:', data.notificationId);
});
```

## Backend: Emitting Notifications to Admin Panel

### Method 1: Using AdminNotificationService (Recommended)

The easiest way is to use the `AdminNotificationService` helper:

```javascript
const AdminNotificationService = require('./src/services/adminNotificationService');

// Notify all admins about new user registration
AdminNotificationService.notifyUserRegistered({
  _id: newUser._id,
  username: newUser.username,
  email: newUser.email,
  createdAt: newUser.createdAt
});

// Notify subscribed admins about content report
AdminNotificationService.notifyContentReported({
  _id: report._id,
  contentType: report.contentType,
  contentId: report.contentId,
  reason: report.reason,
  reportedBy: report.reportedBy
});

// Notify all admins with custom notification
AdminNotificationService.notifyAllAdmins({
  type: 'custom_event',
  title: 'Custom Notification',
  message: 'This is a custom notification',
  data: { customField: 'value' },
  priority: 'high',
  actionUrl: '/admin/custom-page'
});
```

### Method 2: Direct Usage with enhancedRealtimeService

```javascript
const enhancedRealtimeService = require('./src/services/enhancedRealtimeService');

// Emit notification to all connected admins
enhancedRealtimeService.emitToAllAdmins('admin:notification', {
  id: 'unique_notification_id',
  type: 'user_registered',
  title: 'New User Registration',
  message: 'A new user has registered',
  data: {
    userId: 'user_id',
    username: 'newuser',
    registeredAt: new Date()
  },
  priority: 'normal',
  timestamp: new Date(),
  actionUrl: '/admin/users/user_id'
});

// Emit to specific admin
enhancedRealtimeService.emitToAdmin(adminId, 'admin:notification', {
  id: 'unique_notification_id',
  type: 'system_alert',
  title: 'System Alert',
  message: 'Important system update',
  priority: 'high',
  timestamp: new Date()
});

// Emit to admins who subscribed to specific notification type
enhancedRealtimeService.emitToAdminSubscribers('user_registered', 'admin:notification', {
  id: 'unique_notification_id',
  type: 'user_registered',
  title: 'New User Registration',
  message: 'A new user has registered',
  data: { userId: 'user_id' },
  priority: 'normal',
  timestamp: new Date()
});
```

## Example: Emit Notification When User Registers

```javascript
// In your user registration controller
const AdminNotificationService = require('../services/adminNotificationService');

async function registerUser(req, res) {
  try {
    // ... user registration logic ...
    const newUser = await User.create(userData);
    
    // Emit notification to all admins (simple method)
    AdminNotificationService.notifyUserRegistered({
      _id: newUser._id,
      username: newUser.username,
      email: newUser.email,
      createdAt: newUser.createdAt
    });
    
    // ... rest of registration logic ...
  } catch (error) {
    // ... error handling ...
  }
}
```

## Example: Emit Notification When Content is Reported

```javascript
// In your content moderation controller
const AdminNotificationService = require('../services/adminNotificationService');

async function reportContent(req, res) {
  try {
    // ... create report logic ...
    const report = await Report.create(reportData);
    
    // Emit to admins subscribed to content_reported notifications (simple method)
    AdminNotificationService.notifyContentReported({
      _id: report._id,
      contentType: report.contentType,
      contentId: report.contentId,
      reason: report.reason,
      reportedBy: report.reportedBy
    });
    
    // ... rest of logic ...
  } catch (error) {
    // ... error handling ...
  }
}
```

## More Examples

### Example: User Verification Notification

```javascript
const AdminNotificationService = require('../services/adminNotificationService');

// When a user is verified
AdminNotificationService.notifyUserVerified({
  _id: user._id,
  username: user.username,
  verificationStatus: 'approved'
});
```

### Example: System Alert

```javascript
const AdminNotificationService = require('../services/adminNotificationService');

// Send system alert to all admins
AdminNotificationService.notifySystemAlert({
  title: 'Server Maintenance',
  message: 'Scheduled maintenance will begin in 1 hour',
  priority: 'high',
  actionUrl: '/admin/system/maintenance'
});
```

### Example: Custom Notification

```javascript
const AdminNotificationService = require('../services/adminNotificationService');

// Send custom notification
AdminNotificationService.notifyAllAdmins({
  type: 'payment_received',
  title: 'Payment Received',
  message: `Payment of $${amount} received from ${user.username}`,
  data: {
    paymentId: payment._id,
    amount: amount,
    userId: user._id
  },
  priority: 'normal',
  actionUrl: `/admin/payments/${payment._id}`
});
```

## Notification Types

Common notification types you might want to implement:

- `user_registered` - New user registration
- `user_verified` - User verification completed
- `content_reported` - Content reported for moderation
- `content_flagged` - Content flagged by system
- `user_banned` - User banned
- `user_unbanned` - User unbanned
- `system_alert` - System alerts/updates
- `analytics_update` - Analytics data updated
- `payment_received` - Payment received
- `subscription_expired` - Subscription expired

## React Example Component

```jsx
import { useEffect, useState } from 'react';
import io from 'socket.io-client';

function AdminNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const adminToken = localStorage.getItem('adminAccessToken');
    
    const newSocket = io('http://your-server-url:3000', {
      auth: { token: adminToken },
      extraHeaders: { Authorization: `Bearer ${adminToken}` }
    });

    newSocket.on('connect', () => {
      console.log('✅ Connected to admin notifications');
      
      // Subscribe to notification types
      newSocket.emit('admin:subscribe', {
        notificationTypes: [
          'user_registered',
          'content_reported',
          'system_alert'
        ]
      });
    });

    newSocket.on('admin:notification', (notification) => {
      setNotifications(prev => [notification, ...prev]);
      
      // Show browser notification if permission granted
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/admin-icon.png',
          badge: '/badge.png'
        });
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  const markAsRead = (notificationId) => {
    socket?.emit('notification:read', { notificationId });
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
  };

  return (
    <div className="admin-notifications">
      <h2>Admin Notifications</h2>
      {notifications.map(notification => (
        <div
          key={notification.id}
          className={`notification ${notification.read ? 'read' : 'unread'}`}
          onClick={() => markAsRead(notification.id)}
        >
          <h3>{notification.title}</h3>
          <p>{notification.message}</p>
          <small>{new Date(notification.timestamp).toLocaleString()}</small>
        </div>
      ))}
    </div>
  );
}

export default AdminNotifications;
```

## Vue.js Example Component

```vue
<template>
  <div class="admin-notifications">
    <h2>Admin Notifications</h2>
    <div
      v-for="notification in notifications"
      :key="notification.id"
      :class="['notification', { read: notification.read }]"
      @click="markAsRead(notification.id)"
    >
      <h3>{{ notification.title }}</h3>
      <p>{{ notification.message }}</p>
      <small>{{ formatDate(notification.timestamp) }}</small>
    </div>
  </div>
</template>

<script>
import io from 'socket.io-client';

export default {
  data() {
    return {
      notifications: [],
      socket: null
    };
  },
  mounted() {
    const adminToken = localStorage.getItem('adminAccessToken');
    
    this.socket = io('http://your-server-url:3000', {
      auth: { token: adminToken },
      extraHeaders: { Authorization: `Bearer ${adminToken}` }
    });

    this.socket.on('connect', () => {
      this.socket.emit('admin:subscribe', {
        notificationTypes: ['user_registered', 'content_reported', 'system_alert']
      });
    });

    this.socket.on('admin:notification', (notification) => {
      this.notifications.unshift(notification);
    });
  },
  beforeUnmount() {
    if (this.socket) {
      this.socket.close();
    }
  },
  methods: {
    markAsRead(notificationId) {
      this.socket.emit('notification:read', { notificationId });
      const notification = this.notifications.find(n => n.id === notificationId);
      if (notification) {
        notification.read = true;
      }
    },
    formatDate(timestamp) {
      return new Date(timestamp).toLocaleString();
    }
  }
};
</script>
```

## Testing

### Test Admin Connection

```javascript
// Test script to verify admin connection
const io = require('socket.io-client');

const adminToken = 'your_admin_jwt_token';

const socket = io('http://localhost:3000', {
  auth: { token: adminToken },
  extraHeaders: { Authorization: `Bearer ${adminToken}` }
});

socket.on('connect', () => {
  console.log('✅ Admin connected:', socket.id);
  
  socket.emit('admin:subscribe', {
    notificationTypes: ['user_registered', 'system_alert']
  });
});

socket.on('admin:notification', (data) => {
  console.log('📨 Notification received:', data);
});

socket.on('error', (error) => {
  console.error('❌ Socket error:', error);
});
```

## Security Considerations

1. **Authentication**: Always verify admin tokens on the backend
2. **Authorization**: Check admin permissions before emitting sensitive notifications
3. **Rate Limiting**: Implement rate limiting for notification emissions
4. **Data Sanitization**: Sanitize notification data before emitting
5. **HTTPS/WSS**: Use secure connections in production

## Troubleshooting

### Admin Not Receiving Notifications

1. Check if admin is connected: Look for `connection_success` event
2. Verify admin joined `admin:all` room: Check server logs
3. Check notification emission: Verify `emitToAllAdmins` is called
4. Check notification type subscription: Verify `admin:subscribe` was called

### Connection Issues

1. Verify admin token is valid and includes `role: 'admin'`
2. Check CORS settings on Socket.IO server
3. Verify server URL is correct
4. Check network connectivity

## Additional Resources

- Socket.IO Client Documentation: https://socket.io/docs/v4/client-api/
- Socket.IO Server Documentation: https://socket.io/docs/v4/server-api/
