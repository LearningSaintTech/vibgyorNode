# Frontend Notification Implementation Scan Report

**Scan Date:** 2025-01-15  
**Scope:** vibgyorMain (React Native Frontend)  
**Exclusions:** Call service notifications (as requested)

---

## 📋 Executive Summary

This document identifies gaps in frontend notification handling compared to backend implementations. The frontend has a robust notification infrastructure but is missing handlers for several notification types that were recently implemented in the backend.

---

## ✅ Current Frontend Implementation

### Notification Infrastructure

**Files:**
- `src/services/notificationService.js` - Main notification service (handles FCM, Socket.IO, Notifee)
- `src/services/notificationSocketService.js` - Socket.IO notification handler
- `src/services/navigationService.js` - Navigation handling for notifications
- `src/redux/slices/notificationSlice.js` - Redux state management
- `src/hooks/useNotifications.js` - React Query hooks for notifications

**Features:**
- ✅ FCM token management
- ✅ Socket.IO real-time notifications
- ✅ Push notification handling (foreground/background)
- ✅ Notification storage (AsyncStorage)
- ✅ Redux state management
- ✅ Notification channels (Android)
- ✅ Duplicate prevention
- ✅ Notification tap handling

---

## ❌ Missing Notification Type Handlers

### 1. Social Messaging Notifications

#### 1.1 Message Received (Social Chat)
**Backend Status:** ✅ Implemented  
**Frontend Status:** ❌ NOT HANDLED

**Missing in:**
- `navigationService.js` - No navigation handler
- `notificationService.js` - No channel mapping

**Required Actions:**
1. Add navigation handler in `navigationService.js`
2. Add channel mapping in `notificationService.js`

**Code to Add:**

**In `navigationService.js` - `handleSocialNotification()`:**
```javascript
case 'message_received':
  // Navigate to chat screen
  if (data?.chatId) {
    this.navigate('Chat', {
      chatId: data.chatId,
    });
  }
  break;
```

**In `notificationService.js` - `getNotificationChannel()`:**
```javascript
'message_received': 'messages',
```

---

#### 1.2 Message Request Sent
**Backend Status:** ✅ Implemented  
**Frontend Status:** ❌ NOT HANDLED

**Missing in:**
- `navigationService.js` - No navigation handler
- `notificationService.js` - No channel mapping

**Required Actions:**
1. Add navigation handler
2. Add channel mapping

**Code to Add:**

**In `navigationService.js` - `handleSocialNotification()`:**
```javascript
case 'message_request':
  // Navigate to message requests screen or user profile
  if (data?.requestId) {
    // Option 1: Navigate to message requests screen
    this.navigate('MessageRequests');
    // Option 2: Navigate to user profile
    // if (data?.fromUserId) {
    //   this.navigate('UserProfile', { userId: data.fromUserId });
    // }
  }
  break;
```

**In `notificationService.js` - `getNotificationChannel()`:**
```javascript
'message_request': 'messages',
```

---

#### 1.3 Message Request Accepted
**Backend Status:** ✅ Implemented  
**Frontend Status:** ❌ NOT HANDLED

**Missing in:**
- `navigationService.js` - No navigation handler
- `notificationService.js` - No channel mapping

**Required Actions:**
1. Add navigation handler
2. Add channel mapping

**Code to Add:**

**In `navigationService.js` - `handleSocialNotification()`:**
```javascript
case 'message_request_accepted':
  // Navigate to chat screen
  if (data?.chatId) {
    this.navigate('Chat', {
      chatId: data.chatId,
    });
  }
  break;
```

**In `notificationService.js` - `getNotificationChannel()`:**
```javascript
'message_request_accepted': 'messages',
```

---

### 2. Post Notifications

#### 2.1 Post Mention
**Backend Status:** ✅ Implemented  
**Frontend Status:** ❌ NOT HANDLED

**Missing in:**
- `navigationService.js` - No navigation handler
- `notificationService.js` - No channel mapping

**Required Actions:**
1. Add navigation handler
2. Add channel mapping

**Code to Add:**

**In `navigationService.js` - `handleSocialNotification()`:**
```javascript
case 'post_mention':
  // Navigate to post detail
  if (data?.postId) {
    this.navigate('PostDetail', {
      postId: data.postId,
    });
  }
  break;
```

**In `notificationService.js` - `getNotificationChannel()`:**
```javascript
'post_mention': 'social',
```

---

### 3. Story Notifications

#### 3.1 Story Reply
**Backend Status:** ✅ Implemented  
**Frontend Status:** ❌ NOT HANDLED

**Missing in:**
- `navigationService.js` - No navigation handler
- `notificationService.js` - No channel mapping

**Required Actions:**
1. Add navigation handler
2. Add channel mapping

**Code to Add:**

**In `navigationService.js` - `handleSocialNotification()`:**
```javascript
case 'story_reply':
  // Navigate to story viewer or story detail
  if (data?.storyId) {
    this.navigate('StoryViewer', {
      storyId: data.storyId,
    });
  }
  break;
```

**In `notificationService.js` - `getNotificationChannel()`:**
```javascript
'story_reply': 'social',
```

---

#### 3.2 Story Reaction
**Backend Status:** ✅ Implemented  
**Frontend Status:** ❌ NOT HANDLED

**Missing in:**
- `navigationService.js` - No navigation handler (story_like exists but story_reaction doesn't)
- `notificationService.js` - No channel mapping

**Required Actions:**
1. Add navigation handler (or update story_like to handle story_reaction)
2. Add channel mapping

**Code to Add:**

**In `navigationService.js` - `handleSocialNotification()`:**
```javascript
case 'story_reaction':
  // Navigate to story viewer
  if (data?.storyId) {
    this.navigate('StoryViewer', {
      storyId: data.storyId,
    });
  }
  break;
```

**In `notificationService.js` - `getNotificationChannel()`:**
```javascript
'story_reaction': 'social',
```

**Note:** The existing `story_like` case might need to be updated to also handle `story_reaction`, or they can be separate cases.

---

#### 3.3 Story Mention
**Backend Status:** ✅ Implemented  
**Frontend Status:** ❌ NOT HANDLED

**Missing in:**
- `navigationService.js` - No navigation handler
- `notificationService.js` - No channel mapping

**Required Actions:**
1. Add navigation handler
2. Add channel mapping

**Code to Add:**

**In `navigationService.js` - `handleSocialNotification()`:**
```javascript
case 'story_mention':
  // Navigate to story viewer
  if (data?.storyId) {
    this.navigate('StoryViewer', {
      storyId: data.storyId,
    });
  }
  break;
```

**In `notificationService.js` - `getNotificationChannel()`:**
```javascript
'story_mention': 'social',
```

---

### 4. Dating Notifications

#### 4.1 Dating Message Received
**Backend Status:** ✅ Implemented  
**Frontend Status:** ❌ NOT HANDLED

**Missing in:**
- `navigationService.js` - No navigation handler
- `notificationService.js` - No channel mapping

**Required Actions:**
1. Add navigation handler in `handleDatingNotification()`
2. Add channel mapping

**Code to Add:**

**In `navigationService.js` - `handleDatingNotification()`:**
```javascript
case 'message_received':
  // Navigate to dating chat
  if (data?.chatId) {
    this.navigate('DatingChat', {
      chatId: data.chatId,
    });
  } else if (data?.matchId) {
    // Fallback to matchId if chatId not available
    this.navigate('MatchChat', {
      matchId: data.matchId,
    });
  }
  break;
```

**In `notificationService.js` - `getNotificationChannel()`:**
```javascript
// Note: This needs to check context to differentiate social vs dating
// Current implementation doesn't check context, so we need to update the method
```

**Update `getNotificationChannel()` to accept context:**
```javascript
getNotificationChannel(type, context = 'social') {
  // Dating-specific mappings
  if (context === 'dating') {
    const datingChannelMap = {
      'message_received': 'dating',
      'match': 'dating',
      'like': 'dating',
      'super_like': 'dating',
      'default': 'dating',
    };
    return datingChannelMap[type] || 'dating';
  }
  
  // Social mappings
  const channelMap = {
    'follow_request': 'social',
    'follow_request_accepted': 'social',
    'post_like': 'social',
    'post_comment': 'social',
    'post_mention': 'social',
    'story_view': 'social',
    'story_reply': 'social',
    'story_reaction': 'social',
    'story_mention': 'social',
    'message_received': 'messages',
    'message_request': 'messages',
    'message_request_accepted': 'messages',
    'default': 'general',
  };
  return channelMap[type] || 'general';
}
```

**Update calls to `getNotificationChannel()`:**
- In `handleRealtimeNotification()`: `this.getNotificationChannel(type, context)`
- In `handleForegroundNotification()`: `this.getNotificationChannel(data?.type || 'default', data?.context || 'social')`
- In `handleBackgroundNotification()`: `this.getNotificationChannel(notificationData.type, notificationData.context)`

---

## 📊 Summary of Missing Handlers

### Navigation Handlers Missing (8):
1. ❌ `message_received` (social)
2. ❌ `message_request`
3. ❌ `message_request_accepted`
4. ❌ `post_mention`
5. ❌ `story_reply`
6. ❌ `story_reaction`
7. ❌ `story_mention`
8. ❌ `message_received` (dating)

### Channel Mappings Missing (8):
1. ❌ `message_received` (social) → 'messages'
2. ❌ `message_request` → 'messages'
3. ❌ `message_request_accepted` → 'messages'
4. ❌ `post_mention` → 'social'
5. ❌ `story_reply` → 'social'
6. ❌ `story_reaction` → 'social'
7. ❌ `story_mention` → 'social'
8. ❌ `message_received` (dating) → 'dating' (requires context-aware mapping)

---

## 🔧 Implementation Priority

### High Priority (Critical for User Experience):
1. **Message Received (Social)** - Users need to navigate to chats
2. **Message Request Sent/Accepted** - Users need to see message requests
3. **Dating Message Received** - Users need to navigate to dating chats

### Normal Priority:
4. **Post Mention** - Users should see mentioned posts
5. **Story Reply/Reaction/Mention** - Users should see story interactions

---

## 📝 Implementation Checklist

### Navigation Service (`navigationService.js`):
- [ ] Add `message_received` handler (social)
- [ ] Add `message_request` handler
- [ ] Add `message_request_accepted` handler
- [ ] Add `post_mention` handler
- [ ] Add `story_reply` handler
- [ ] Add `story_reaction` handler
- [ ] Add `story_mention` handler
- [ ] Add `message_received` handler (dating)

### Notification Service (`notificationService.js`):
- [ ] Update `getNotificationChannel()` to accept context parameter
- [ ] Add context-aware channel mapping
- [ ] Add `message_received` → 'messages' mapping
- [ ] Add `message_request` → 'messages' mapping
- [ ] Add `message_request_accepted` → 'messages' mapping
- [ ] Add `post_mention` → 'social' mapping
- [ ] Add `story_reply` → 'social' mapping
- [ ] Add `story_reaction` → 'social' mapping
- [ ] Add `story_mention` → 'social' mapping
- [ ] Update all `getNotificationChannel()` calls to pass context

---

## 🎯 Testing Checklist

After implementing each handler:

- [ ] Notification displays correctly
- [ ] Notification tap navigates to correct screen
- [ ] Correct screen params are passed
- [ ] Notification channel is correct (Android)
- [ ] No duplicate notifications
- [ ] Works for both Socket.IO and push notifications
- [ ] Works for both foreground and background states

---

## 📋 Files to Modify

1. **`src/services/navigationService.js`**
   - Add 8 new notification type handlers
   - Update `handleSocialNotification()` method
   - Update `handleDatingNotification()` method

2. **`src/services/notificationService.js`**
   - Update `getNotificationChannel()` method signature
   - Add context-aware channel mapping
   - Update all calls to `getNotificationChannel()`

---

## ✅ Already Implemented

### Navigation Handlers:
- ✅ `post_like` → PostDetail
- ✅ `post_comment` → PostDetail
- ✅ `follow_request` → UserProfile
- ✅ `follow_request_accepted` → UserProfile
- ✅ `story_view` → StoryViewer
- ✅ `story_like` → StoryViewer
- ✅ `match` → MatchChat
- ✅ `like` (dating) → DatingDiscovery
- ✅ `new_message` → Chat

### Channel Mappings:
- ✅ `follow_request` → 'social'
- ✅ `follow_request_accepted` → 'social'
- ✅ `post_like` → 'social'
- ✅ `post_comment` → 'social'
- ✅ `story_view` → 'social'
- ✅ `match` → 'dating'
- ✅ `like` → 'dating'

---

## 🚀 Next Steps

1. **Phase 1:** Implement high-priority messaging notifications (3 handlers)
2. **Phase 2:** Update channel mapping to be context-aware
3. **Phase 3:** Implement remaining social notifications (5 handlers)
4. **Phase 4:** Testing and verification

---

**Last Updated:** 2025-01-15  
**Status:** ✅ IMPLEMENTATION COMPLETE

---

## ✅ Implementation Complete

All missing notification handlers have been implemented:

### Files Modified:
1. ✅ `src/services/navigationService.js` - Added 8 notification handlers
2. ✅ `src/services/notificationService.js` - Updated channel mapping to be context-aware

### Changes Made:

**Navigation Service:**
- ✅ Added `message_received` handler (social) → Chat screen
- ✅ Added `message_request` handler → MessageRequests screen
- ✅ Added `message_request_accepted` handler → Chat screen
- ✅ Added `post_mention` handler → PostDetail screen
- ✅ Added `story_reply` handler → StoryViewer screen
- ✅ Added `story_reaction` handler → StoryViewer screen
- ✅ Added `story_mention` handler → StoryViewer screen
- ✅ Added `message_received` handler (dating) → DatingChat/MatchChat screen

**Notification Service:**
- ✅ Updated `getNotificationChannel()` to accept context parameter
- ✅ Added context-aware channel mapping
- ✅ Added all missing channel mappings:
  - `message_received` (social) → 'messages'
  - `message_request` → 'messages'
  - `message_request_accepted` → 'messages'
  - `post_mention` → 'social'
  - `story_reply` → 'social'
  - `story_reaction` → 'social'
  - `story_mention` → 'social'
  - `message_received` (dating) → 'dating'
- ✅ Updated all `getNotificationChannel()` calls to pass context

### Testing Status:
- ✅ No linter errors
- ⏳ Ready for manual testing

