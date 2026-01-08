# Deep Linking Implementation Plan

**Date:** 2025-01-15  
**Scope:** Push Notification Deep Linking for Vibgyor App  
**Status:** Planning Phase

---

## 📋 Executive Summary

This document outlines a comprehensive phase-wise plan to implement deep linking for push notifications in the Vibgyor app. Deep linking will allow users to navigate directly to specific screens (posts, chats, profiles, etc.) when they tap on push notifications.

---

## 🔍 Current State Analysis

### ✅ What's Already Implemented

#### Backend (vibgyorNode)
1. **Notification Model** (`src/notification/models/notificationModel.js`)
   - ✅ `actionUrl` field exists (optional, max 500 chars)
   - ✅ `relatedContent` object with `contentType` and `contentId`
   - ✅ Notification data includes `type`, `context`, `senderId`

2. **Push Notification Service** (`src/services/pushNotificationService.js`)
   - ✅ Sends notification payload with `data` object
   - ✅ Includes `notificationId`, `type`, `context`, `relatedContent`
   - ✅ Android: `clickAction: 'FLUTTER_NOTIFICATION_CLICK'` (needs update)
   - ✅ iOS: Basic APNS payload

3. **Delivery Manager** (`src/notification/services/deliveryManager.js`)
   - ✅ Prepares `pushData` with `actionUrl` field
   - ✅ Includes `relatedContent` as JSON string

#### Frontend (vibgyorMain)
1. **Navigation Service** (`src/services/navigationService.js`)
   - ✅ Basic navigation handlers for notification types
   - ✅ Handles social, dating, and message notifications
   - ✅ Navigates to screens based on notification data
   - ⚠️ **Missing:** Deep link URL parsing and routing

2. **Notification Service** (`src/services/notificationService.js`)
   - ✅ Handles notification taps via `handleNotificationTap()`
   - ✅ Calls `navigationService.handleNotificationNavigation()`
   - ✅ Marks notifications as read
   - ⚠️ **Missing:** Deep link URL handling

3. **App.js**
   - ✅ Checks for cold start notification (`getInitialNotification()`)
   - ⚠️ **Missing:** Deep link URL handling on cold start
   - ⚠️ **Missing:** React Navigation deep linking configuration

### ❌ What's Missing

1. **Deep Link URL Structure**
   - No standardized URL format
   - No URL scheme configuration
   - No universal links (iOS) / app links (Android) setup

2. **Deep Link Parsing**
   - No URL parser service
   - No route mapping from URLs to screens
   - No parameter extraction from URLs

3. **React Navigation Integration**
   - No deep linking configuration in navigation
   - No URL-to-screen mapping

4. **Platform Configuration**
   - Android: No App Links configuration
   - iOS: No Universal Links configuration
   - No URL scheme registration

5. **Backend URL Generation**
   - `actionUrl` field exists but not consistently populated
   - No URL generator utility

---

## 🎯 Deep Linking Scope

### Supported Deep Link Types

#### 1. Social Notifications
- **Post Detail:** `vibgyor://post/{postId}`
- **User Profile:** `vibgyor://user/{userId}`
- **Story Viewer:** `vibgyor://story/{storyId}`
- **Chat:** `vibgyor://chat/{chatId}`
- **Message Requests:** `vibgyor://messages/requests`
- **Notifications List:** `vibgyor://notifications`

#### 2. Dating Notifications
- **Match Chat:** `vibgyor://dating/match/{matchId}`
- **Dating Discovery:** `vibgyor://dating/discovery`
- **Dating Chat:** `vibgyor://dating/chat/{chatId}`

#### 3. Call Notifications
- **Call Screen:** `vibgyor://call/{callId}` (if applicable)

### URL Format Structure

```
vibgyor://{context}/{type}/{id}?{params}
```

**Examples:**
- `vibgyor://post/507f1f77bcf86cd799439011`
- `vibgyor://user/507f1f77bcf86cd799439011`
- `vibgyor://chat/507f1f77bcf86cd799439011`
- `vibgyor://dating/match/507f1f77bcf86cd799439011`
- `vibgyor://story/507f1f77bcf86cd799439011?userId=507f1f77bcf86cd799439012`

---

## 📐 Implementation Phases

### Phase 0: Prerequisites & Setup ⚙️
**Duration:** 1-2 days  
**Priority:** Critical

#### Tasks:
1. **Install Required Packages**
   - ✅ `react-native` (already installed)
   - ✅ `@react-navigation/native` (already installed)
   - ⚠️ Verify `react-native-linking` support (built into React Native)
   - ⚠️ Install `react-native-branch` (optional, for analytics)

2. **Create Deep Link Service**
   - Create `src/services/deepLinkService.js`
   - URL parsing utilities
   - Route mapping logic

3. **Create URL Generator Utility (Backend)**
   - Create `src/utils/urlGenerator.js`
   - Generate deep link URLs for notifications

#### Deliverables:
- ✅ Deep link service skeleton
- ✅ URL generator utility
- ✅ URL format documentation

---

### Phase 1: Backend URL Generation 🔗
**Duration:** 2-3 days  
**Priority:** High

#### Tasks:
1. **Create URL Generator Service**
   - File: `src/utils/urlGenerator.js`
   - Functions:
     - `generatePostUrl(postId)` → `vibgyor://post/{postId}`
     - `generateUserUrl(userId)` → `vibgyor://user/{userId}`
     - `generateChatUrl(chatId)` → `vibgyor://chat/{chatId}`
     - `generateStoryUrl(storyId, userId?)` → `vibgyor://story/{storyId}`
     - `generateMatchUrl(matchId)` → `vibgyor://dating/match/{matchId}`
     - `generateDatingChatUrl(chatId)` → `vibgyor://dating/chat/{chatId}`
     - `generateNotificationsUrl()` → `vibgyor://notifications`
     - `generateMessageRequestsUrl()` → `vibgyor://messages/requests`

2. **Update Notification Factory**
   - File: `src/notification/services/notificationFactory.js`
   - Auto-generate `actionUrl` based on notification type
   - Use URL generator utility

3. **Update Notification Handlers**
   - File: `src/notification/handlers/socialNotificationHandler.js`
   - File: `src/notification/handlers/datingNotificationHandler.js`
   - Ensure `actionUrl` is set for all notification types

4. **Update Push Notification Service**
   - File: `src/services/pushNotificationService.js`
   - Include `actionUrl` in notification data payload
   - Update Android `clickAction` to use deep link URL

#### Code Example:
```javascript
// src/utils/urlGenerator.js
class URLGenerator {
  static generatePostUrl(postId) {
    return `vibgyor://post/${postId}`;
  }
  
  static generateUserUrl(userId) {
    return `vibgyor://user/${userId}`;
  }
  
  // ... other generators
}

// In notificationFactory.js
const actionUrl = URLGenerator.generatePostUrl(data.postId);
```

#### Deliverables:
- ✅ URL generator utility
- ✅ All notification types generate `actionUrl`
- ✅ `actionUrl` included in push notification payload

---

### Phase 2: Frontend Deep Link Service 🔧
**Duration:** 2-3 days  
**Priority:** High

#### Tasks:
1. **Create Deep Link Service**
   - File: `src/services/deepLinkService.js`
   - Parse deep link URLs
   - Map URLs to navigation routes
   - Extract parameters from URLs

2. **URL Parser**
   - Parse `vibgyor://{context}/{type}/{id}?{params}`
   - Extract context, type, id, and query params
   - Handle malformed URLs gracefully

3. **Route Mapper**
   - Map URL paths to React Navigation routes
   - Map parameters to navigation params
   - Handle special cases (e.g., dating vs social chat)

#### Code Structure:
```javascript
// src/services/deepLinkService.js
class DeepLinkService {
  parseUrl(url) {
    // Parse vibgyor://post/123 → { context: 'post', id: '123' }
  }
  
  navigateFromUrl(url) {
    const parsed = this.parseUrl(url);
    const route = this.mapToRoute(parsed);
    navigationService.navigate(route.name, route.params);
  }
  
  mapToRoute(parsed) {
    // Map URL to React Navigation route
  }
}
```

#### Deliverables:
- ✅ Deep link service with URL parsing
- ✅ Route mapping logic
- ✅ Parameter extraction

---

### Phase 3: React Navigation Deep Linking Configuration 🧭
**Duration:** 2-3 days  
**Priority:** High

#### Tasks:
1. **Configure React Navigation Deep Linking**
   - File: `src/navigation/RootNavigator.js` (or wherever navigation is configured)
   - Add `linking` configuration
   - Map URL paths to screen names
   - Configure parameter extraction

2. **URL-to-Screen Mapping**
   - Map `vibgyor://post/{id}` → `PostDetail` screen
   - Map `vibgyor://user/{id}` → `UserProfile` screen
   - Map `vibgyor://chat/{id}` → `Chat` screen
   - Map `vibgyor://dating/match/{id}` → `MatchChat` screen
   - etc.

3. **Update Navigation Service**
   - File: `src/services/navigationService.js`
   - Integrate with deep link service
   - Use deep link URLs when available

#### Code Example:
```javascript
// RootNavigator.js
const linking = {
  prefixes: ['vibgyor://'],
  config: {
    screens: {
      PostDetail: 'post/:postId',
      UserProfile: 'user/:userId',
      Chat: 'chat/:chatId',
      DatingMatch: 'dating/match/:matchId',
      // ... other screens
    }
  }
};

<NavigationContainer linking={linking} ref={navigationRef}>
  {/* navigation tree */}
</NavigationContainer>
```

#### Deliverables:
- ✅ React Navigation deep linking configured
- ✅ URL-to-screen mapping complete
- ✅ Navigation service integrated

---

### Phase 4: Notification Tap Handling 🔔
**Duration:** 2-3 days  
**Priority:** High

#### Tasks:
1. **Update Notification Service**
   - File: `src/services/notificationService.js`
   - Check for `actionUrl` in notification data
   - Use deep link service if `actionUrl` exists
   - Fallback to existing navigation logic if no URL

2. **Handle Cold Start Notifications**
   - File: `App.js`
   - Process `getInitialNotification()` URL
   - Navigate after app initialization

3. **Handle Background Notifications**
   - File: `src/services/notificationService.js`
   - Process notification tap URLs
   - Navigate when app comes to foreground

4. **Update Notifee Tap Handlers**
   - File: `src/services/notificationService.js`
   - Extract URL from notification data
   - Navigate using deep link service

#### Code Example:
```javascript
// In notificationService.js
async handleNotificationTap(notification) {
  const { data } = notification;
  
  // Check for actionUrl first (deep link)
  if (data?.actionUrl) {
    await deepLinkService.navigateFromUrl(data.actionUrl);
    return;
  }
  
  // Fallback to existing navigation logic
  navigationService.handleNotificationNavigation(notification);
}
```

#### Deliverables:
- ✅ Notification taps use deep links
- ✅ Cold start handling
- ✅ Background notification handling

---

### Phase 5: Android App Links Configuration 🤖
**Duration:** 3-4 days  
**Priority:** Medium

#### Tasks:
1. **Configure AndroidManifest.xml**
   - File: `android/app/src/main/AndroidManifest.xml`
   - Add intent filters for deep links
   - Configure App Links (HTTPS)

2. **Create Digital Asset Links File**
   - File: `.well-known/assetlinks.json` (on server)
   - Verify app ownership
   - Enable App Links (not just intent filters)

3. **Update Android Build Configuration**
   - Verify package name matches
   - Configure signing keys for App Links

4. **Test App Links**
   - Test with `adb shell am start -W -a android.intent.action.VIEW -d "vibgyor://post/123"`
   - Test HTTPS links (if configured)

#### AndroidManifest.xml Example:
```xml
<activity
  android:name=".MainActivity"
  android:exported="true">
  <intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="vibgyor" />
  </intent-filter>
  
  <!-- App Links (HTTPS) -->
  <intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data
      android:scheme="https"
      android:host="vibgyor.app"
      android:pathPrefix="/" />
  </intent-filter>
</activity>
```

#### Deliverables:
- ✅ Android App Links configured
- ✅ Intent filters added
- ✅ Digital Asset Links file (if using HTTPS)

---

### Phase 6: iOS Universal Links Configuration 🍎
**Duration:** 3-4 days  
**Priority:** Medium

#### Tasks:
1. **Configure Associated Domains**
   - File: `ios/vibgyorMain/Info.plist`
   - Add `com.apple.developer.associated-domains`
   - Configure domain entitlements

2. **Create Apple App Site Association File**
   - File: `.well-known/apple-app-site-association` (on server)
   - Verify app ownership
   - Configure Universal Links paths

3. **Update Xcode Project**
   - Enable Associated Domains capability
   - Configure domain in Xcode

4. **Test Universal Links**
   - Test with Safari
   - Test with Notes app
   - Verify app opens correctly

#### Info.plist Example:
```xml
<key>com.apple.developer.associated-domains</key>
<array>
  <string>applinks:vibgyor.app</string>
</array>
```

#### apple-app-site-association Example:
```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAM_ID.com.vibgyor.app",
        "paths": ["*"]
      }
    ]
  }
}
```

#### Deliverables:
- ✅ iOS Universal Links configured
- ✅ Associated Domains enabled
- ✅ Apple App Site Association file (if using HTTPS)

---

### Phase 7: Testing & Validation ✅
**Duration:** 2-3 days  
**Priority:** High

#### Tasks:
1. **Unit Tests**
   - Test URL parsing
   - Test route mapping
   - Test parameter extraction

2. **Integration Tests**
   - Test notification tap → navigation
   - Test cold start deep link
   - Test background notification deep link

3. **Platform-Specific Tests**
   - Android: Test App Links
   - iOS: Test Universal Links
   - Test URL scheme fallback

4. **End-to-End Tests**
   - Send test notification
   - Tap notification
   - Verify correct screen opens
   - Verify parameters passed correctly

#### Test Cases:
1. ✅ Post like notification → Opens post detail
2. ✅ Message notification → Opens chat
3. ✅ Match notification → Opens match chat
4. ✅ User profile notification → Opens profile
5. ✅ Story notification → Opens story viewer
6. ✅ Cold start from notification → Navigates correctly
7. ✅ Background notification tap → Navigates correctly

#### Deliverables:
- ✅ Test suite
- ✅ Test documentation
- ✅ Bug fixes

---

### Phase 8: Documentation & Deployment 📚
**Duration:** 1-2 days  
**Priority:** Medium

#### Tasks:
1. **Documentation**
   - Deep linking guide for developers
   - URL format documentation
   - Testing guide
   - Troubleshooting guide

2. **Code Comments**
   - Add JSDoc comments
   - Document URL formats
   - Document navigation flows

3. **Deployment Checklist**
   - Verify all phases complete
   - Test on production build
   - Monitor for errors

#### Deliverables:
- ✅ Documentation complete
- ✅ Code commented
- ✅ Deployment ready

---

## 📊 Implementation Summary

### Phase Breakdown

| Phase | Duration | Priority | Dependencies |
|-------|----------|----------|--------------|
| Phase 0: Prerequisites | 1-2 days | Critical | None |
| Phase 1: Backend URL Generation | 2-3 days | High | Phase 0 |
| Phase 2: Frontend Deep Link Service | 2-3 days | High | Phase 0 |
| Phase 3: React Navigation Config | 2-3 days | High | Phase 2 |
| Phase 4: Notification Tap Handling | 2-3 days | High | Phase 2, Phase 3 |
| Phase 5: Android App Links | 3-4 days | Medium | Phase 3 |
| Phase 6: iOS Universal Links | 3-4 days | Medium | Phase 3 |
| Phase 7: Testing & Validation | 2-3 days | High | Phase 4, Phase 5, Phase 6 |
| Phase 8: Documentation | 1-2 days | Medium | All phases |

**Total Estimated Duration:** 18-28 days (3.5-5.5 weeks)

---

## 🎯 Success Criteria

### Must Have (MVP)
- ✅ All notification types generate deep link URLs
- ✅ Notification taps navigate to correct screens
- ✅ Cold start notifications work
- ✅ Background notification taps work
- ✅ URL scheme deep links work (`vibgyor://`)

### Nice to Have
- ✅ Android App Links (HTTPS)
- ✅ iOS Universal Links (HTTPS)
- ✅ Analytics tracking for deep links
- ✅ Fallback handling for invalid URLs

---

## 🔧 Technical Details

### URL Format

**Scheme:** `vibgyor://`

**Structure:**
```
vibgyor://{context}/{type}/{id}?{queryParams}
```

**Examples:**
- `vibgyor://post/507f1f77bcf86cd799439011`
- `vibgyor://user/507f1f77bcf86cd799439011`
- `vibgyor://chat/507f1f77bcf86cd799439011`
- `vibgyor://dating/match/507f1f77bcf86cd799439011`
- `vibgyor://story/507f1f77bcf86cd799439011?userId=507f1f77bcf86cd799439012`

### Notification Data Payload

```json
{
  "notification": {
    "title": "John liked your post",
    "body": "John liked your post"
  },
  "data": {
    "notificationId": "507f1f77bcf86cd799439011",
    "type": "post_like",
    "context": "social",
    "actionUrl": "vibgyor://post/507f1f77bcf86cd799439011",
    "relatedContent": "{\"contentType\":\"post\",\"contentId\":\"507f1f77bcf86cd799439011\"}",
    "senderId": "507f1f77bcf86cd799439012"
  }
}
```

---

## 🚨 Risks & Mitigations

### Risk 1: URL Format Changes
**Risk:** URL format may need to change in future  
**Mitigation:** Use versioned URLs (`vibgyor://v1/post/...`) or maintain backward compatibility

### Risk 2: Navigation Stack Issues
**Risk:** Deep links may cause navigation stack problems  
**Mitigation:** Use `CommonActions.reset()` or `navigation.navigate()` appropriately

### Risk 3: Platform-Specific Issues
**Risk:** Android/iOS may handle deep links differently  
**Mitigation:** Test thoroughly on both platforms, use platform-specific code if needed

### Risk 4: Cold Start Timing
**Risk:** App may not be ready when deep link is processed  
**Mitigation:** Queue deep links until app is ready, use `NavigationContainer` ref

---

## 📝 Notes

1. **URL Scheme vs Universal Links:**
   - Start with URL scheme (`vibgyor://`) for MVP
   - Add Universal Links/App Links later for better UX

2. **Backward Compatibility:**
   - Keep existing navigation logic as fallback
   - Support both `actionUrl` and existing navigation

3. **Testing:**
   - Test on real devices
   - Test cold start, background, and foreground scenarios
   - Test all notification types

---

## ✅ Next Steps

1. Review and approve this plan
2. Start Phase 0: Prerequisites & Setup
3. Create GitHub issues/tasks for each phase
4. Begin implementation

---

**Last Updated:** 2025-01-15  
**Status:** Ready for Implementation

