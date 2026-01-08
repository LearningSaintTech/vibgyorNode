# Deep Linking Quick Reference

**Date:** 2025-01-15  
**Quick Guide:** Deep Linking Implementation

---

## 🎯 Quick Overview

### Current State
- ✅ Push notifications working
- ✅ Basic navigation from notifications
- ❌ Deep link URLs not consistently generated
- ❌ No deep link parsing/routing
- ❌ No React Navigation deep linking config

### Goal
- ✅ Generate deep link URLs for all notifications
- ✅ Parse and route deep link URLs
- ✅ Navigate from notification taps using URLs

---

## 📋 URL Format

```
vibgyor://{context}/{type}/{id}?{params}
```

### Examples
- `vibgyor://post/507f1f77bcf86cd799439011`
- `vibgyor://user/507f1f77bcf86cd799439011`
- `vibgyor://chat/507f1f77bcf86cd799439011`
- `vibgyor://dating/match/507f1f77bcf86cd799439011`

---

## 🗺️ Implementation Phases

### Phase 0: Setup (1-2 days)
- Create `src/services/deepLinkService.js`
- Create `src/utils/urlGenerator.js` (backend)

### Phase 1: Backend (2-3 days)
- Generate URLs for all notification types
- Include `actionUrl` in push payload

### Phase 2: Frontend Service (2-3 days)
- Parse deep link URLs
- Map URLs to routes

### Phase 3: React Navigation (2-3 days)
- Configure deep linking
- Map URL paths to screens

### Phase 4: Notification Taps (2-3 days)
- Use `actionUrl` in tap handlers
- Handle cold start URLs

### Phase 5-6: Platform Config (6-8 days)
- Android App Links
- iOS Universal Links

### Phase 7: Testing (2-3 days)
- Test all scenarios
- Fix bugs

### Phase 8: Documentation (1-2 days)
- Write docs
- Code comments

**Total: 18-28 days**

---

## 📁 Files to Create/Modify

### Backend (vibgyorNode)
**Create:**
- `src/utils/urlGenerator.js` - URL generation utility

**Modify:**
- `src/notification/services/notificationFactory.js` - Generate URLs
- `src/services/pushNotificationService.js` - Include URLs in payload

### Frontend (vibgyorMain)
**Create:**
- `src/services/deepLinkService.js` - Deep link parsing/routing

**Modify:**
- `src/services/notificationService.js` - Use deep links
- `src/services/navigationService.js` - Integrate deep links
- `src/navigation/RootNavigator.js` - Configure deep linking
- `App.js` - Handle cold start URLs

---

## 🔗 Notification → Deep Link Mapping

| Notification Type | Deep Link |
|------------------|-----------|
| `post_like` | `vibgyor://post/{postId}` |
| `post_comment` | `vibgyor://post/{postId}` |
| `post_mention` | `vibgyor://post/{postId}` |
| `follow_request` | `vibgyor://user/{userId}` |
| `story_*` | `vibgyor://story/{storyId}` |
| `message_received` | `vibgyor://chat/{chatId}` |
| `message_request` | `vibgyor://messages/requests` |
| `match` | `vibgyor://dating/match/{matchId}` |
| `like` (dating) | `vibgyor://dating/discovery` |

---

## 💻 Code Snippets

### Backend: Generate URL
```javascript
// src/utils/urlGenerator.js
class URLGenerator {
  static generatePostUrl(postId) {
    return `vibgyor://post/${postId}`;
  }
}

// In notificationFactory.js
const actionUrl = URLGenerator.generatePostUrl(data.postId);
```

### Frontend: Parse URL
```javascript
// src/services/deepLinkService.js
class DeepLinkService {
  parseUrl(url) {
    const match = url.match(/vibgyor:\/\/([^\/]+)\/(.+)/);
    return { context: match[1], path: match[2] };
  }
  
  navigateFromUrl(url) {
    const parsed = this.parseUrl(url);
    // Navigate to screen
  }
}
```

### React Navigation Config
```javascript
// RootNavigator.js
const linking = {
  prefixes: ['vibgyor://'],
  config: {
    screens: {
      PostDetail: 'post/:postId',
      UserProfile: 'user/:userId',
      Chat: 'chat/:chatId',
    }
  }
};
```

---

## ✅ Checklist

### Backend
- [ ] Create URL generator utility
- [ ] Generate URLs for all notification types
- [ ] Include `actionUrl` in push payload
- [ ] Update Android `clickAction`

### Frontend
- [ ] Create deep link service
- [ ] Configure React Navigation deep linking
- [ ] Update notification tap handlers
- [ ] Handle cold start URLs
- [ ] Test all notification types

### Platform (Optional)
- [ ] Configure Android App Links
- [ ] Configure iOS Universal Links
- [ ] Test platform-specific links

---

## 📚 Documentation

- **Full Plan:** `DEEP_LINKING_IMPLEMENTATION_PLAN.md`
- **Flow Summary:** `PUSH_NOTIFICATION_FLOW_SUMMARY.md`
- **Quick Reference:** This file

---

**Last Updated:** 2025-01-15

