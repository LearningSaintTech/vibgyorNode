# Notification Implementation Plan - Complete Phases

**Project:** Complete Notification System Implementation  
**Start Date:** 2025-01-15  
**Status:** Ready to Begin

---

## 📋 Overview

This document provides a step-by-step implementation plan to add all missing notifications to the Vibgyor platform. The plan is divided into 5 phases, starting with prerequisites and critical features, then moving to high-priority and normal-priority items.

---

## 🎯 Implementation Phases

### **Phase 0: Prerequisites & Setup** ⚙️
**Duration:** 30-45 minutes  
**Priority:** CRITICAL (Must complete before other phases)

#### Tasks:

1. **Create Dating Notification Handler**
   - [ ] Create file: `src/notification/handlers/datingNotificationHandler.js`
   - [ ] Implement handler class (copy pattern from social handler)
   - [ ] Export singleton instance
   - [ ] Test handler creation

2. **Register Dating Handler**
   - [ ] Open: `src/notification/services/notificationService.js`
   - [ ] Import dating handler (line ~6)
   - [ ] Register handler in `initializeHandlers()` method (line ~30)
   - [ ] Test handler registration

3. **Verify Notification Infrastructure**
   - [ ] Verify `notificationService` is accessible
   - [ ] Verify notification types are defined in `datingTypes.js`
   - [ ] Test notification creation endpoint

#### Files to Create/Modify:
- ✅ CREATE: `src/notification/handlers/datingNotificationHandler.js`
- ✅ MODIFY: `src/notification/services/notificationService.js`

#### Success Criteria:
- [ ] Dating handler created and registered
- [ ] No errors in server startup
- [ ] Can create dating notifications via service

---

### **Phase 1: Critical Messaging Notifications** 💬
**Duration:** 1-2 hours  
**Priority:** CRITICAL  
**Dependencies:** Phase 0

#### Task 1.1: Message Received Notification (Social Chat)
**File:** `src/user/social/services/messageService.js`  
**Method:** `sendMessage()`  
**Location:** After message creation (~line 300-350)

**Implementation Steps:**
1. [ ] Locate `sendMessage()` method
2. [ ] Find where message is saved and chat is updated
3. [ ] Add notification creation loop for all participants except sender
4. [ ] Wrap in try-catch to prevent failures
5. [ ] Test with multiple participants

**Code to Add:**
```javascript
// After message is created and chat is updated (around line 300)
// Send notifications to all participants except sender
chat.participants.forEach(async (participantId) => {
  if (participantId.toString() !== senderId.toString()) {
    try {
      await notificationService.create({
        context: 'social',
        type: 'message_received',
        recipientId: participantId.toString(),
        senderId: senderId.toString(),
        data: {
          chatId: chatId,
          messageId: message._id.toString(),
          messageType: type,
          contentType: 'message'
        }
      });
    } catch (notificationError) {
      console.error('[MESSAGE_SERVICE] Notification error for participant:', participantId, notificationError);
      // Don't fail message send if notification fails
    }
  }
});
```

**Testing:**
- [ ] Send message in 1-on-1 chat → recipient gets notification
- [ ] Send message in group chat → all recipients get notification
- [ ] Verify notification appears in database
- [ ] Verify in-app notification via Socket.IO
- [ ] Verify push notification (if enabled)
- [ ] Verify sender doesn't get notification

---

#### Task 1.2: Message Request Sent Notification
**File:** `src/user/social/userController/messageRequestController.js`  
**Method:** `sendMessageRequest()`  
**Location:** After request creation (~line 50)

**Implementation Steps:**
1. [ ] Locate `sendMessageRequest()` method
2. [ ] Find where `MessageRequest.createRequest()` is called
3. [ ] Add notification creation after request is created
4. [ ] Wrap in try-catch
5. [ ] Test notification delivery

**Code to Add:**
```javascript
// After request is created (around line 50)
const request = await MessageRequest.createRequest(currentUserId, userId, message);

// Send notification to target user
try {
  await notificationService.create({
    context: 'social',
    type: 'message_request',
    recipientId: userId, // Target user
    senderId: currentUserId,
    data: {
      requestId: request._id.toString(),
      message: message || '',
      contentType: 'message_request'
    }
  });
} catch (notificationError) {
  console.error('[MESSAGE_REQUEST] Notification error:', notificationError);
  // Don't fail request creation if notification fails
}
```

**Testing:**
- [ ] Send message request → recipient gets notification
- [ ] Verify notification in database
- [ ] Verify in-app notification
- [ ] Verify push notification
- [ ] Verify email notification (if enabled)

---

#### Task 1.3: Message Request Accepted Notification
**File:** `src/user/social/userController/messageRequestController.js`  
**Method:** `acceptMessageRequest()`  
**Location:** After chat creation (~line 170)

**Implementation Steps:**
1. [ ] Locate `acceptMessageRequest()` method
2. [ ] Find where chat is created (`Chat.findOrCreateChat()`)
3. [ ] Add notification creation after chat creation
4. [ ] Notify the original requester (fromUserId)
5. [ ] Wrap in try-catch
6. [ ] Test notification delivery

**Code to Add:**
```javascript
// After chat is created (around line 170)
const chat = await Chat.findOrCreateChat(request.fromUserId, request.toUserId, request.toUserId);

// Notify original requester that request was accepted
try {
  await notificationService.create({
    context: 'social',
    type: 'message_request',
    recipientId: request.fromUserId.toString(),
    senderId: request.toUserId.toString(),
    data: {
      requestId: request._id.toString(),
      chatId: chat._id.toString(),
      status: 'accepted',
      contentType: 'message_request'
    }
  });
} catch (notificationError) {
  console.error('[MESSAGE_REQUEST] Notification error:', notificationError);
  // Don't fail acceptance if notification fails
}
```

**Testing:**
- [ ] Accept message request → requester gets notification
- [ ] Verify notification in database
- [ ] Verify in-app notification
- [ ] Verify push notification
- [ ] Verify deep linking to chat works

---

#### Phase 1 Success Criteria:
- [ ] All 3 messaging notifications implemented
- [ ] All tests passing
- [ ] No errors in server logs
- [ ] Notifications appear in UI
- [ ] Push notifications working

---

### **Phase 2: Dating Notifications** 💕
**Duration:** 1-2 hours  
**Priority:** HIGH  
**Dependencies:** Phase 0, Phase 1

#### Task 2.1: Match Created Notification
**File:** `src/user/dating/controllers/datingInteractionController.js`  
**Method:** `likeProfile()`  
**Location:** After match creation (~line 150)

**Implementation Steps:**
1. [ ] Locate `likeProfile()` method
2. [ ] Find where match is created (`isMatch` check)
3. [ ] Add notification creation for both users
4. [ ] Use Promise.all for parallel notifications
5. [ ] Wrap in try-catch
6. [ ] Test match notification

**Code to Add:**
```javascript
// After match is created (around line 150)
if (isMatch && match) {
  // Notify both users about the match
  try {
    await Promise.all([
      notificationService.create({
        context: 'dating',
        type: 'match',
        recipientId: currentUserId.toString(),
        senderId: targetUserId.toString(),
        data: {
          matchId: match._id.toString(),
          contentType: 'match'
        }
      }),
      notificationService.create({
        context: 'dating',
        type: 'match',
        recipientId: targetUserId.toString(),
        senderId: currentUserId.toString(),
        data: {
          matchId: match._id.toString(),
          contentType: 'match'
        }
      })
    ]);
  } catch (notificationError) {
    console.error('[DATING][MATCH] Notification error:', notificationError);
    // Don't fail match creation if notification fails
  }
}
```

**Testing:**
- [ ] Create match → both users get notifications
- [ ] Verify notifications in database
- [ ] Verify in-app notifications
- [ ] Verify push notifications
- [ ] Verify deep linking to match chat works

---

#### Task 2.2: Profile Like Notification
**File:** `src/user/dating/controllers/datingInteractionController.js`  
**Method:** `likeProfile()`  
**Location:** After like creation, only if not match (~line 115)

**Implementation Steps:**
1. [ ] Locate `likeProfile()` method
2. [ ] Find where interaction is created
3. [ ] Add notification creation BEFORE match check
4. [ ] Only create notification if NOT a match
5. [ ] Wrap in try-catch
6. [ ] Test like notification

**Code to Add:**
```javascript
// After interaction is created but before checking for match (around line 115)
// Only notify if it's not a match (matches get match notification instead)
if (!isMatch) {
  try {
    await notificationService.create({
      context: 'dating',
      type: 'like',
      recipientId: targetUserId.toString(),
      senderId: currentUserId.toString(),
      data: {
        interactionId: interaction._id.toString(),
        contentType: 'dating_profile'
      }
    });
  } catch (notificationError) {
    console.error('[DATING][LIKE] Notification error:', notificationError);
    // Don't fail like action if notification fails
  }
}
```

**Testing:**
- [ ] Like profile (no match) → recipient gets notification
- [ ] Like profile (creates match) → no like notification, only match notification
- [ ] Verify notification in database
- [ ] Verify in-app notification
- [ ] Verify push notification

---

#### Task 2.3: Super Like Notification (If Separate Endpoint)
**File:** `src/user/dating/controllers/datingInteractionController.js`  
**Method:** Find or create super like endpoint

**Implementation Steps:**
1. [ ] Check if super like is separate endpoint or flag in like endpoint
2. [ ] If separate endpoint exists, add notification similar to like
3. [ ] If flag-based, modify like notification to check for super like
4. [ ] Use type: 'super_like' instead of 'like'
5. [ ] Test super like notification

**Code to Add (if separate endpoint):**
```javascript
// Similar to like notification but with type: 'super_like'
await notificationService.create({
  context: 'dating',
  type: 'super_like',
  recipientId: targetUserId.toString(),
  senderId: currentUserId.toString(),
  data: {
    interactionId: interaction._id.toString(),
    contentType: 'dating_profile'
  }
});
```

**Testing:**
- [ ] Super like profile → recipient gets notification
- [ ] Verify notification type is 'super_like'
- [ ] Verify higher priority (push enabled)
- [ ] Verify notification in database

---

#### Phase 2 Success Criteria:
- [ ] All dating notifications implemented
- [ ] Match notifications work for both users
- [ ] Like notifications don't duplicate match notifications
- [ ] All tests passing
- [ ] Dating handler working correctly

---

### **Phase 3: Social Follow Notifications** 👥
**Duration:** 30-45 minutes  
**Priority:** HIGH  
**Dependencies:** Phase 1

#### Task 3.1: Follow Request Sent Notification (Private Account)
**File:** `src/user/social/userController/userSocialController.js`  
**Method:** `sendFollowRequest()`  
**Location:** After request creation for private account (~line 180)

**Implementation Steps:**
1. [ ] Locate `sendFollowRequest()` method
2. [ ] Find where follow request is created for private account
3. [ ] Add notification creation after request creation
4. [ ] Wrap in try-catch
5. [ ] Test notification delivery

**Code to Add:**
```javascript
// After follow request is created for private account (around line 180)
const followRequest = await FollowRequest.create({
  requester: currentUserId,
  recipient: userId,
  message: message.trim(),
  status: 'pending'
});

// Send notification to target user
try {
  await notificationService.create({
    context: 'social',
    type: 'follow_request',
    recipientId: userId,
    senderId: currentUserId,
    data: {
      requestId: followRequest._id.toString(),
      message: message || '',
      contentType: 'user'
    }
  });
} catch (notificationError) {
  console.error('[FOLLOW_REQUEST] Notification error:', notificationError);
  // Don't fail request creation if notification fails
}
```

**Testing:**
- [ ] Send follow request to private account → recipient gets notification
- [ ] Verify notification in database
- [ ] Verify in-app notification
- [ ] Verify push notification
- [ ] Verify email notification (if enabled)
- [ ] Verify public account follow doesn't trigger this notification

---

#### Phase 3 Success Criteria:
- [ ] Follow request notification implemented
- [ ] Only triggers for private accounts
- [ ] Public account follow uses existing notification
- [ ] All tests passing

---

### **Phase 4: Additional Social Notifications** 📱
**Duration:** 1-2 hours  
**Priority:** NORMAL  
**Dependencies:** Phase 1, Phase 3

#### Task 4.1: Post Share Notification
**File:** `src/user/social/userController/postController.js`  
**Action:** Find or create share endpoint

**Implementation Steps:**
1. [ ] Search for post share endpoint
2. [ ] If exists, add notification creation
3. [ ] If doesn't exist, create endpoint with notification
4. [ ] Use Post model's `addShare()` method
5. [ ] Test share notification

**Code to Add:**
```javascript
// In share endpoint (need to locate or create)
await post.addShare(userId, shareType, shareMessage);

// Send notification to post author
if (post.author.toString() !== userId) {
  try {
    await notificationService.create({
      context: 'social',
      type: 'post_share',
      recipientId: post.author.toString(),
      senderId: userId,
      data: {
        postId: post._id.toString(),
        shareType: shareType,
        contentType: 'post'
      }
    });
  } catch (notificationError) {
    console.error('[POST] Share notification error:', notificationError);
  }
}
```

---

#### Task 4.2: Post Mention Notification
**File:** `src/user/social/userController/postController.js`  
**Method:** `createPost()` or `updatePost()`

**Implementation Steps:**
1. [ ] Locate post creation/update methods
2. [ ] Find where mentions are parsed/extracted
3. [ ] Add notification creation for each mentioned user
4. [ ] Wrap in try-catch
5. [ ] Test mention notification

**Code to Add:**
```javascript
// After post is created and mentions are extracted
// Assuming mentions are in post.mentions array or parsed from content
if (post.mentions && post.mentions.length > 0) {
  post.mentions.forEach(async (mentionedUserId) => {
    if (mentionedUserId.toString() !== userId) {
      try {
        await notificationService.create({
          context: 'social',
          type: 'post_mention',
          recipientId: mentionedUserId.toString(),
          senderId: userId,
          data: {
            postId: post._id.toString(),
            contentType: 'post'
          }
        });
      } catch (notificationError) {
        console.error('[POST] Mention notification error:', notificationError);
      }
    }
  });
}
```

---

#### Task 4.3: Story Reaction Notification
**File:** Need to locate story controller/service

**Implementation Steps:**
1. [ ] Find story reaction endpoint
2. [ ] Add notification creation
3. [ ] Test reaction notification

---

#### Task 4.4: Story Reply Notification
**File:** Need to locate story controller/service

**Implementation Steps:**
1. [ ] Find story reply endpoint
2. [ ] Add notification creation
3. [ ] Test reply notification

---

#### Task 4.5: Story Mention Notification
**File:** Need to locate story controller/service

**Implementation Steps:**
1. [ ] Find story creation endpoint
2. [ ] Find where mentions are parsed
3. [ ] Add notification creation for mentions
4. [ ] Test mention notification

---

#### Phase 4 Success Criteria:
- [ ] All additional social notifications implemented
- [ ] Story endpoints located and updated
- [ ] All tests passing

---

### **Phase 5: Call Notifications** 📞
**Duration:** 1-2 hours  
**Priority:** HIGH  
**Dependencies:** Phase 1

#### Task 5.1: Incoming Call Notification
**File:** Need to locate call controller/service

**Implementation Steps:**
1. [ ] Find call initiation endpoint
2. [ ] Add notification creation when call starts
3. [ ] Use urgent priority
4. [ ] Test call notification

**Code to Add:**
```javascript
// When call is initiated
await notificationService.create({
  context: 'social',
  type: 'call_incoming',
  recipientId: recipientUserId,
  senderId: callerUserId,
  priority: 'urgent',
  data: {
    callId: call._id.toString(),
    callType: 'audio' | 'video',
    contentType: 'call'
  }
});
```

---

#### Task 5.2: Missed Call Notification
**File:** Need to locate call controller/service

**Implementation Steps:**
1. [ ] Find call end/miss logic
2. [ ] Add notification if call was not answered
3. [ ] Test missed call notification

**Code to Add:**
```javascript
// When call ends without being answered
if (call.status === 'missed' || call.status === 'declined') {
  await notificationService.create({
    context: 'social',
    type: 'call_missed',
    recipientId: recipientUserId,
    senderId: callerUserId,
    data: {
      callId: call._id.toString(),
      callType: call.type,
      contentType: 'call'
    }
  });
}
```

---

#### Phase 5 Success Criteria:
- [ ] Call notifications implemented
- [ ] Incoming calls trigger urgent notifications
- [ ] Missed calls tracked and notified
- [ ] All tests passing

---

## 📊 Implementation Timeline

| Phase | Duration | Priority | Dependencies |
|-------|----------|----------|--------------|
| Phase 0 | 30-45 min | CRITICAL | None |
| Phase 1 | 1-2 hours | CRITICAL | Phase 0 |
| Phase 2 | 1-2 hours | HIGH | Phase 0, Phase 1 |
| Phase 3 | 30-45 min | HIGH | Phase 1 |
| Phase 4 | 1-2 hours | NORMAL | Phase 1, Phase 3 |
| Phase 5 | 1-2 hours | HIGH | Phase 1 |
| **Total** | **5-8 hours** | | |

---

## ✅ Testing Checklist (Per Phase)

For each notification implemented:

### Database Testing
- [ ] Notification created in database
- [ ] Correct recipient and sender
- [ ] Correct type and context
- [ ] Data payload is correct
- [ ] Timestamps are correct

### Real-time Testing
- [ ] In-app notification received via Socket.IO
- [ ] Notification appears in notification list
- [ ] Unread count increments
- [ ] Notification can be marked as read

### Push Notification Testing
- [ ] Push notification sent (if enabled)
- [ ] Correct title and message
- [ ] Deep linking works
- [ ] Notification appears on device

### Integration Testing
- [ ] Main action doesn't fail if notification fails
- [ ] No duplicate notifications
- [ ] User preferences respected
- [ ] Quiet hours respected (if implemented)

### Edge Cases
- [ ] Sender doesn't get notification for own action
- [ ] Blocked users don't get notifications
- [ ] Inactive users handled correctly
- [ ] Multiple devices receive notifications

---

## 🐛 Common Issues & Solutions

### Issue: Notification not appearing
**Solution:** 
- Check notification service is initialized
- Verify handler is registered
- Check user preferences
- Verify Socket.IO connection

### Issue: Duplicate notifications
**Solution:**
- Check for multiple notification creation calls
- Verify deduplication logic
- Check Socket.IO event handlers

### Issue: Notification fails silently
**Solution:**
- Check error logs
- Verify try-catch blocks
- Check notification service initialization
- Verify database connection

### Issue: Push notification not sent
**Solution:**
- Verify FCM tokens exist
- Check push notification service initialization
- Verify user preferences allow push
- Check FCM service account credentials

---

## 📝 Code Review Checklist

Before marking a phase complete:

- [ ] All code follows existing patterns
- [ ] Error handling implemented (try-catch)
- [ ] Logging added for debugging
- [ ] Comments added for complex logic
- [ ] No console.log statements (use proper logging)
- [ ] Code is tested
- [ ] No breaking changes to existing functionality
- [ ] Performance considerations addressed

---

## 🚀 Deployment Checklist

Before deploying:

- [ ] All phases tested locally
- [ ] Database migrations (if any) tested
- [ ] Environment variables configured
- [ ] FCM credentials verified
- [ ] Socket.IO configuration verified
- [ ] Notification preferences default values set
- [ ] Monitoring/logging configured
- [ ] Rollback plan prepared

---

## 📚 Related Documentation

- `NOTIFICATION_IMPLEMENTATION_GAPS.md` - Detailed gap analysis
- `NOTIFICATION_QUICK_REFERENCE.md` - Quick code snippets
- `scriptFiles/NOTIFICATION_DOCUMENTATION.txt` - Complete system docs
- `src/notification/types/socialTypes.js` - Social notification types
- `src/notification/types/datingTypes.js` - Dating notification types

---

## 🎯 Success Metrics

After all phases complete:

- ✅ 100% of critical notifications implemented
- ✅ 100% of high-priority notifications implemented
- ✅ 0 notification-related errors in production
- ✅ < 100ms average notification creation time
- ✅ 99%+ notification delivery success rate

---

**Last Updated:** 2025-01-15  
**Status:** Ready for Implementation  
**Next Action:** Begin Phase 0

