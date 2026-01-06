# Notification Implementation - Quick Reference

**Quick lookup guide for implementing missing notifications**

---

## 🚨 Critical Missing Notifications

### 1. Message Received (Social Chat)
- **File:** `src/user/social/services/messageService.js`
- **Method:** `sendMessage()` 
- **Line:** ~300-350 (after message creation)
- **Code:**
```javascript
chat.participants.forEach(async (participantId) => {
  if (participantId.toString() !== senderId.toString()) {
    await notificationService.create({
      context: 'social',
      type: 'message_received',
      recipientId: participantId.toString(),
      senderId: senderId.toString(),
      data: { chatId, messageId: message._id.toString(), messageType: type }
    });
  }
});
```

### 2. Message Request Sent
- **File:** `src/user/social/userController/messageRequestController.js`
- **Method:** `sendMessageRequest()`
- **Line:** ~50 (after request creation)
- **Code:**
```javascript
await notificationService.create({
  context: 'social',
  type: 'message_request',
  recipientId: userId,
  senderId: currentUserId,
  data: { requestId: request._id.toString(), message }
});
```

### 3. Message Request Accepted
- **File:** `src/user/social/userController/messageRequestController.js`
- **Method:** `acceptMessageRequest()`
- **Line:** ~170 (after chat creation)
- **Code:**
```javascript
await notificationService.create({
  context: 'social',
  type: 'message_request',
  recipientId: request.fromUserId.toString(),
  senderId: request.toUserId.toString(),
  data: { requestId, chatId: chat._id.toString(), status: 'accepted' }
});
```

### 4. Follow Request Sent (Private)
- **File:** `src/user/social/userController/userSocialController.js`
- **Method:** `sendFollowRequest()`
- **Line:** ~180 (after request creation for private account)
- **Code:**
```javascript
await notificationService.create({
  context: 'social',
  type: 'follow_request',
  recipientId: userId,
  senderId: currentUserId,
  data: { requestId: followRequest._id.toString(), message }
});
```

### 5. Match Created (Dating)
- **File:** `src/user/dating/controllers/datingInteractionController.js`
- **Method:** `likeProfile()`
- **Line:** ~150 (after match creation)
- **Code:**
```javascript
if (isMatch && match) {
  await Promise.all([
    notificationService.create({
      context: 'dating',
      type: 'match',
      recipientId: currentUserId.toString(),
      senderId: targetUserId.toString(),
      data: { matchId: match._id.toString() }
    }),
    notificationService.create({
      context: 'dating',
      type: 'match',
      recipientId: targetUserId.toString(),
      senderId: currentUserId.toString(),
      data: { matchId: match._id.toString() }
    })
  ]);
}
```

### 6. Profile Like (Dating)
- **File:** `src/user/dating/controllers/datingInteractionController.js`
- **Method:** `likeProfile()`
- **Line:** ~115 (after like creation, only if not match)
- **Code:**
```javascript
if (!isMatch) {
  await notificationService.create({
    context: 'dating',
    type: 'like',
    recipientId: targetUserId.toString(),
    senderId: currentUserId.toString(),
    data: { interactionId: interaction._id.toString() }
  });
}
```

---

## ✅ Already Implemented (Reference)

### Post Like
- **File:** `src/user/social/userController/postController.js:1157`

### Post Comment
- **File:** `src/user/social/userController/postController.js:1418`

### Follow (Public)
- **File:** `src/user/social/userController/userSocialController.js:113`

### Follow Request Accepted
- **File:** `src/user/social/userController/userSocialController.js:1330`

---

## 🔧 Prerequisites

### 1. Create Dating Notification Handler
**File:** `src/notification/handlers/datingNotificationHandler.js` (CREATE NEW)

```javascript
const Notification = require('../models/notificationModel');
const notificationFactory = require('../services/notificationFactory');
const deliveryManager = require('../services/deliveryManager');

class DatingNotificationHandler {
  constructor() {
    this.context = 'dating';
  }

  async handle(options) {
    try {
      const notificationData = await notificationFactory.create({
        ...options,
        context: this.context
      });

      const notification = new Notification(notificationData);
      await notification.save();
      await deliveryManager.deliver(notification);
      return notification;
    } catch (error) {
      console.error('[DATING HANDLER] Error:', error);
      throw error;
    }
  }
}

module.exports = new DatingNotificationHandler();
```

### 2. Register Dating Handler
**File:** `src/notification/services/notificationService.js:30`

```javascript
// Add after social handler registration
const datingNotificationHandler = require('../handlers/datingNotificationHandler');
this.registry.registerHandler('dating', datingNotificationHandler);
this.handlers.set('dating', datingNotificationHandler);
```

---

## 📋 Implementation Checklist

- [ ] Message Received (Social)
- [ ] Message Request Sent
- [ ] Message Request Accepted
- [ ] Follow Request Sent (Private)
- [ ] Match Created (Dating)
- [ ] Profile Like (Dating)
- [ ] Create Dating Handler
- [ ] Register Dating Handler

---

## 🎯 Implementation Order

1. **First:** Create dating handler and register it
2. **Second:** Implement critical messaging notifications (1-3)
3. **Third:** Implement dating notifications (5-6)
4. **Fourth:** Implement follow request notification (4)

---

## ⚠️ Important Notes

1. **Always wrap in try-catch** - Don't fail main action if notification fails
2. **Check recipient != sender** - Don't notify users about their own actions
3. **Use correct context** - 'social' or 'dating'
4. **Include relevant IDs** - For navigation/deep linking
5. **Test each notification** - Verify in-app, push, and database

---

**See:** `NOTIFICATION_IMPLEMENTATION_GAPS.md` for detailed analysis

