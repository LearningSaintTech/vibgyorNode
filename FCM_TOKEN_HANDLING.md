# FCM Token Handling in Vibgyor Backend

This document explains how Firebase Cloud Messaging (FCM) tokens are handled in the backend.

## Overview

FCM tokens are stored in the User model as an array of device tokens, allowing multiple devices per user. Each token is associated with platform (iOS/Android/Web) and device metadata.

---

## 1. Database Schema

**Location:** `src/user/auth/model/userAuthModel.js` (lines 121-156)

The `deviceTokens` array is stored directly on the User document:

```javascript
deviceTokens: [{
  token: {
    type: String,
    required: true,
    index: true
  },
  platform: {
    type: String,
    enum: ['ios', 'android', 'web'],
    required: true
  },
  deviceId: {
    type: String,
    default: ''
  },
  deviceName: {
    type: String,
    default: ''
  },
  appVersion: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastUsedAt: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}]
```

**Key Points:**
- Multiple tokens allowed per user (one per device)
- Token is indexed for fast lookups
- Platform validation (ios/android/web only)
- Active/inactive flag for token management

---

## 2. Token Registration/Saving

### Primary Endpoint

**Route:** `POST /api/notification/save-fcm-token`  
**Location:** `src/notification/routes/notificationRoutes.js` (lines 154-228)  
**Auth:** Required (Bearer token)

**Request Body:**
```json
{
  "fcmToken": "fcm_device_token_string",
  "platform": "ios|android|web",
  "deviceId": "optional_device_id",
  "deviceName": "optional_device_name",
  "appVersion": "optional_app_version"
}
```

**Process:**
1. Validates `fcmToken` and `platform` are present
2. Finds user from JWT token (`req.user.id`)
3. Calls `user.addDeviceToken()` method
4. Returns success response

### Alternative Endpoint (Commented Out)

**Route:** `POST /api/v1/user/device-token`  
**Location:** `src/user/auth/routes/deviceTokenRoutes.js` (lines 12-43)  
**Status:** Currently commented out in `app.js` (line 127)

---

## 3. User Model Methods

### `addDeviceToken(token, platform, deviceInfo)`

**Location:** `src/user/auth/model/userAuthModel.js` (lines 243-293)

**Behavior:**
1. **Removes duplicate tokens** - Filters out existing token if present (prevents duplicates)
2. **Adds new token** with metadata:
   - token, platform (required)
   - deviceId, deviceName, appVersion (optional)
   - isActive: true
   - lastUsedAt: current timestamp
   - createdAt: current timestamp
3. **Saves user document** to database

**Key Feature:** Automatically removes duplicate tokens before adding, ensuring one token per device.

### `removeDeviceToken(token)`

**Location:** `src/user/auth/model/userAuthModel.js` (lines 295-300)

**Behavior:**
- Filters out the token from `deviceTokens` array
- Saves user document

### `getActiveDeviceTokens(platform)`

**Location:** `src/user/auth/model/userAuthModel.js` (lines 302-313)

**Behavior:**
- Returns only active tokens (`isActive: true`)
- Optional platform filter
- Returns array of `{ token, platform }` objects

**Usage Example:**
```javascript
// Get all active tokens
const allTokens = user.getActiveDeviceTokens();

// Get only Android tokens
const androidTokens = user.getActiveDeviceTokens('android');
```

---

## 4. Token Removal

### Endpoint

**Route:** `DELETE /api/notification/remove-fcm-token`  
**Location:** `src/notification/routes/notificationRoutes.js` (lines 235-270)  
**Auth:** Required

**Request Body:**
```json
{
  "fcmToken": "token_to_remove"
}
```

**Process:**
1. Validates `fcmToken` is present
2. Finds user from JWT
3. Calls `user.removeDeviceToken(fcmToken)`
4. Returns success response

---

## 5. Token Usage for Push Notifications

### How Tokens Are Retrieved

**Location:** `src/notification/services/deliveryManager.js` (lines 232-245)

When sending a push notification:
1. User is fetched from database by `notification.recipient`
2. Active device tokens are retrieved using `user.getActiveDeviceTokens()`
3. If no tokens exist, push delivery is skipped

### How Tokens Are Used

**Location:** `src/notification/services/deliveryManager.js` (lines 264-318)

1. **Tokens are grouped by platform:**
   ```javascript
   const tokensByPlatform = {
     ios: [],
     android: [],
     web: []
   };
   ```

2. **Notifications sent per platform:**
   - Single device: `pushNotificationService.sendToDevice()`
   - Multiple devices: `pushNotificationService.sendToMultipleDevices()`

3. **Invalid token cleanup:**
   - If FCM returns token as invalid, it's marked for removal
   - Invalid tokens are automatically removed using `user.removeDeviceToken()`

### Token Cleanup on Invalid Response

**Location:** `src/notification/services/deliveryManager.js` (lines 320-326)

When FCM indicates a token is invalid (e.g., app uninstalled):
- Token is added to `tokensToRemove` array
- All invalid tokens are removed from user's deviceTokens array
- Prevents future failed delivery attempts

---

## 6. Flow Diagram

```
┌─────────────────┐
│  Mobile App     │
│  Gets FCM Token │
└────────┬────────┘
         │
         │ POST /api/notification/save-fcm-token
         │ { fcmToken, platform, deviceId, ... }
         ▼
┌─────────────────────────────┐
│  Notification Routes        │
│  - Validates request        │
│  - Extracts userId from JWT │
└────────┬────────────────────┘
         │
         │ user.addDeviceToken()
         ▼
┌─────────────────────────────┐
│  User Model                 │
│  - Removes duplicate token  │
│  - Adds new token to array  │
│  - Saves to database        │
└────────┬────────────────────┘
         │
         │ Stored in MongoDB
         ▼
┌─────────────────────────────┐
│  User Document              │
│  deviceTokens: [...]        │
└─────────────────────────────┘

When sending notification:
         │
         │ user.getActiveDeviceTokens()
         ▼
┌─────────────────────────────┐
│  Delivery Manager           │
│  - Groups by platform       │
│  - Sends via FCM            │
│  - Cleans invalid tokens    │
└─────────────────────────────┘
```

---

## 7. Key Features

### ✅ Duplicate Prevention
- `addDeviceToken()` automatically removes existing token before adding new one
- Ensures only one active token per device/user combination

### ✅ Multi-Device Support
- Users can have multiple active tokens (different devices)
- All active tokens receive notifications

### ✅ Token Validation
- Invalid tokens are automatically removed when FCM rejects them
- Prevents accumulating dead tokens

### ✅ Platform-Specific Handling
- Tokens are grouped by platform (iOS/Android/Web)
- Different notification formats per platform

### ✅ Active/Inactive Management
- Tokens can be marked inactive without deletion
- Only active tokens receive notifications

---

## 8. Current Implementation Status

### Active Routes
- ✅ `POST /api/notification/save-fcm-token` - **ACTIVE**
- ✅ `DELETE /api/notification/remove-fcm-token` - **ACTIVE**

### Commented Out (Legacy)
- ❌ `POST /api/v1/user/device-token` - Commented in `app.js` line 127
- ❌ `DELETE /api/v1/user/device-token/:token` - Not registered
- ❌ `GET /api/v1/user/device-token` - Not registered

**Note:** The app currently uses `/api/notification/save-fcm-token` (without `/v1` prefix).

---

## 9. Frontend Integration

**Location:** `vibgyorMain/src/services/firebaseConfig.js`

The mobile app:
1. Generates FCM token using Firebase SDK
2. Sends to backend via `POST /api/notification/save-fcm-token`
3. Handles token refresh and resends to backend

---

## 10. Best Practices

1. **Always validate tokens** before sending notifications
2. **Clean up invalid tokens** automatically when FCM rejects them
3. **Handle token refresh** - tokens can change (e.g., app reinstall)
4. **Remove tokens on logout** - prevents notifications to logged-out users
5. **Limit token count** - consider cleanup of old/inactive tokens

---

## 11. Troubleshooting

### Token Not Saving
- Check JWT authentication is working
- Verify `fcmToken` and `platform` are in request body
- Check user document exists in database

### Tokens Not Receiving Notifications
- Verify FCM service is initialized
- Check `isActive` flag is true
- Verify token is not expired/invalid
- Check FCM service account credentials

### Duplicate Tokens
- Should be handled automatically by `addDeviceToken()`
- If duplicates appear, check save logic

---

## Summary

FCM tokens are:
- ✅ Stored as array in User model
- ✅ Registered via `/api/notification/save-fcm-token`
- ✅ Removed via `/api/notification/remove-fcm-token`
- ✅ Automatically deduplicated on save
- ✅ Retrieved via `getActiveDeviceTokens()` for push delivery
- ✅ Cleaned up when invalid/expired

The implementation supports multi-device users, automatic duplicate prevention, and invalid token cleanup.
