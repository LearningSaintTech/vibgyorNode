# Push Notification Flow Summary

**Date:** 2025-01-15  
**Scope:** Complete Push Notification Flow Analysis

---

## 📊 Current Push Notification Flow

### Backend Flow

```
1. User Action (e.g., like post, send message)
   ↓
2. Notification Created
   - notificationService.create()
   - notificationFactory.create()
   ↓
3. Notification Saved to Database
   - NotificationModel with actionUrl, relatedContent
   ↓
4. Delivery Manager
   - deliveryManager.deliver()
   - Checks user preferences
   ↓
5. Push Notification Sent
   - deliveryManager.deliverPush()
   - Gets active device tokens
   - Groups by platform (iOS/Android/Web)
   ↓
6. Push Notification Service
   - pushNotificationService.sendToDevice()
   - Formats FCM message
   - Includes data payload:
     * notificationId
     * type
     * context
     * relatedContent (JSON string)
     * actionUrl (optional)
   ↓
7. Firebase Cloud Messaging (FCM)
   - admin.messaging().send()
   - Delivers to device
```

### Frontend Flow

```
1. FCM Notification Received
   ↓
2. Notification Service Handles
   - Foreground: handleForegroundNotification()
   - Background: handleBackgroundNotification()
   - Cold Start: getInitialNotification()
   ↓
3. Display Notification
   - Android: Notifee.displayNotification()
   - iOS: Notifee.displayNotification()
   ↓
4. User Taps Notification
   ↓
5. Notification Tap Handler
   - notificationService.handleNotificationTap()
   - Extracts notification data
   - Marks as read
   ↓
6. Navigation Service
   - navigationService.handleNotificationNavigation()
   - Routes based on type/context
   ↓
7. Screen Navigation
   - Navigates to target screen
   - Passes parameters
```

---

## 🔍 Notification Data Structure

### Backend Payload (FCM)

```json
{
  "notification": {
    "title": "John liked your post",
    "body": "John liked your post",
    "imageUrl": "https://example.com/image.jpg" // optional
  },
  "data": {
    "notificationId": "507f1f77bcf86cd799439011",
    "type": "post_like",
    "context": "social",
    "priority": "normal",
    "relatedContent": "{\"contentType\":\"post\",\"contentId\":\"507f1f77bcf86cd799439011\"}",
    "actionUrl": "vibgyor://post/507f1f77bcf86cd799439011", // ⚠️ Currently optional
    "senderId": "507f1f77bcf86cd799439012"
  },
  "android": {
    "priority": "normal",
    "notification": {
      "sound": "default",
      "channelId": "social",
      "clickAction": "FLUTTER_NOTIFICATION_CLICK", // ⚠️ Needs update
      "icon": "notification_icon",
      "color": "#8A52F3"
    }
  },
  "apns": {
    "payload": {
      "aps": {
        "alert": {
          "title": "John liked your post",
          "body": "John liked your post"
        },
        "sound": "default",
        "badge": 1
      }
    }
  }
}
```

### Frontend Notification Object

```javascript
{
  id: "507f1f77bcf86cd799439011",
  title: "John liked your post",
  body: "John liked your post",
  type: "post_like",
  context: "social",
  data: {
    notificationId: "507f1f77bcf86cd799439011",
    type: "post_like",
    context: "social",
    actionUrl: "vibgyor://post/507f1f77bcf86cd799439011", // ⚠️ Currently optional
    relatedContent: {
      contentType: "post",
      contentId: "507f1f77bcf86cd799439011"
    },
    senderId: "507f1f77bcf86cd799439012"
  },
  relatedContent: {
    contentType: "post",
    contentId: "507f1f77bcf86cd799439011"
  },
  isRead: false,
  timestamp: "2025-01-15T10:30:00Z",
  source: "push" // or "push_background" or "socket"
}
```

---

## 📱 Notification Types & Deep Link Mapping

### Social Notifications

| Notification Type | Current Navigation | Deep Link URL | Screen |
|------------------|-------------------|---------------|--------|
| `post_like` | PostDetail | `vibgyor://post/{postId}` | PostDetail |
| `post_comment` | PostDetail | `vibgyor://post/{postId}` | PostDetail |
| `post_mention` | PostDetail | `vibgyor://post/{postId}` | PostDetail |
| `follow_request` | UserProfile | `vibgyor://user/{userId}` | UserProfile |
| `follow_request_accepted` | UserProfile | `vibgyor://user/{userId}` | UserProfile |
| `story_view` | StoryViewer | `vibgyor://story/{storyId}` | StoryViewer |
| `story_like` | StoryViewer | `vibgyor://story/{storyId}` | StoryViewer |
| `story_reply` | StoryViewer | `vibgyor://story/{storyId}` | StoryViewer |
| `story_reaction` | StoryViewer | `vibgyor://story/{storyId}` | StoryViewer |
| `story_mention` | StoryViewer | `vibgyor://story/{storyId}` | StoryViewer |
| `message_received` | Chat | `vibgyor://chat/{chatId}` | Chat |
| `message_request` | MessageRequests | `vibgyor://messages/requests` | MessageRequests |
| `message_request_accepted` | Chat | `vibgyor://chat/{chatId}` | Chat |
| `call_incoming` | Call Screen | `vibgyor://call/{callId}` | CallScreen |
| `call_missed` | Notifications | `vibgyor://notifications` | Notifications |

### Dating Notifications

| Notification Type | Current Navigation | Deep Link URL | Screen |
|------------------|-------------------|---------------|--------|
| `match` | MatchChat | `vibgyor://dating/match/{matchId}` | MatchChat |
| `like` | DatingDiscovery | `vibgyor://dating/discovery` | DatingDiscovery |
| `message_received` | DatingChat | `vibgyor://dating/chat/{chatId}` | DatingChat |

---

## 🔗 Deep Linking Scope

### Current State

#### ✅ What Works
- Basic navigation from notifications
- Notification tap handling
- Screen navigation based on type/context
- Parameter passing to screens

#### ❌ What's Missing
- **Deep Link URLs:** `actionUrl` field exists but not consistently populated
- **URL Parsing:** No service to parse deep link URLs
- **React Navigation Deep Linking:** Not configured
- **Platform Configuration:** No Android App Links / iOS Universal Links
- **Cold Start Handling:** Basic check exists but no URL processing

### Deep Link Implementation Scope

#### Phase 1: Backend (High Priority)
1. **URL Generation**
   - Create URL generator utility
   - Auto-generate `actionUrl` for all notifications
   - Standardize URL format

2. **Payload Enhancement**
   - Include `actionUrl` in all push notifications
   - Update Android `clickAction` to use deep link

#### Phase 2: Frontend (High Priority)
1. **Deep Link Service**
   - Parse deep link URLs
   - Map URLs to navigation routes
   - Extract parameters

2. **React Navigation Integration**
   - Configure deep linking
   - Map URL paths to screens
   - Handle parameter extraction

3. **Notification Tap Enhancement**
   - Use `actionUrl` if available
   - Fallback to existing logic
   - Handle cold start URLs

#### Phase 3: Platform Configuration (Medium Priority)
1. **Android App Links**
   - Configure AndroidManifest.xml
   - Set up Digital Asset Links (if HTTPS)
   - Test App Links

2. **iOS Universal Links**
   - Configure Associated Domains
   - Set up Apple App Site Association (if HTTPS)
   - Test Universal Links

---

## 📋 Deep Link URL Format

### Standard Format

```
vibgyor://{context}/{type}/{id}?{queryParams}
```

### Examples

**Social:**
- `vibgyor://post/507f1f77bcf86cd799439011`
- `vibgyor://user/507f1f77bcf86cd799439011`
- `vibgyor://chat/507f1f77bcf86cd799439011`
- `vibgyor://story/507f1f77bcf86cd799439011`
- `vibgyor://messages/requests`
- `vibgyor://notifications`

**Dating:**
- `vibgyor://dating/match/507f1f77bcf86cd799439011`
- `vibgyor://dating/discovery`
- `vibgyor://dating/chat/507f1f77bcf86cd799439011`

**With Query Params:**
- `vibgyor://story/507f1f77bcf86cd799439011?userId=507f1f77bcf86cd799439012`
- `vibgyor://post/507f1f77bcf86cd799439011?highlight=comment_123`

---

## 🎯 Implementation Priority

### Must Have (MVP)
1. ✅ Backend URL generation
2. ✅ Frontend deep link service
3. ✅ React Navigation deep linking config
4. ✅ Notification tap uses deep links
5. ✅ Cold start handling

### Nice to Have
1. ⚠️ Android App Links (HTTPS)
2. ⚠️ iOS Universal Links (HTTPS)
3. ⚠️ Analytics tracking
4. ⚠️ Fallback handling

---

## 📁 Key Files

### Backend
- `src/notification/models/notificationModel.js` - Notification schema
- `src/notification/services/notificationFactory.js` - Notification creation
- `src/notification/services/deliveryManager.js` - Push delivery
- `src/services/pushNotificationService.js` - FCM sending
- `src/utils/urlGenerator.js` - ⚠️ **TO BE CREATED**

### Frontend
- `src/services/notificationService.js` - Notification handling
- `src/services/navigationService.js` - Navigation logic
- `src/services/deepLinkService.js` - ⚠️ **TO BE CREATED**
- `src/navigation/RootNavigator.js` - Navigation config
- `App.js` - App initialization

---

## 🚀 Next Steps

1. **Review Deep Linking Implementation Plan**
   - See `DEEP_LINKING_IMPLEMENTATION_PLAN.md`

2. **Start Phase 0: Prerequisites**
   - Create deep link service skeleton
   - Create URL generator utility

3. **Implement Phase 1: Backend URL Generation**
   - Generate URLs for all notification types
   - Include in push notification payload

4. **Implement Phase 2-4: Frontend Deep Linking**
   - Create deep link service
   - Configure React Navigation
   - Update notification tap handling

5. **Test & Validate**
   - Test all notification types
   - Test cold start scenarios
   - Test background notifications

---

**Last Updated:** 2025-01-15  
**Status:** Analysis Complete - Ready for Implementation

