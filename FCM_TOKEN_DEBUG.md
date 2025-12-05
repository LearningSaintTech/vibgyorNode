# FCM Token Not Saving - Debug Analysis

## Issue
FCM token is generated and sent to backend, but it's not being saved to the database.

## Symptoms
1. ✅ Token generated successfully in mobile app
2. ✅ Request sent to `/api/notification/save-fcm-token`
3. ✅ Auth middleware passes
4. ❌ Route handler logs never appear
5. ❌ Token not saved to database

## Terminal Logs Analysis

From the backend logs:
```
[APP] 🔍 Request to /api/notification: {
  method: 'POST',
  path: '/save-fcm-token',
  url: '/save-fcm-token',
  originalUrl: '/api/notification/save-fcm-token',
  hasBody: true,
  bodyKeys: [ 'fcmToken', 'platform' ],
  hasAuth: true,
  authHeader: 'Bearer eyJhbGciOiJIUzI1NiIsInR...'
}
[AUTH] Incoming auth header { hasAuth: true }
[AUTH] Verifying token
[JWT] verifyAccessToken
[AUTH] Role check { userRole: 'user', allowedRoles: [ 'user' ] }
[AUTH] ✅ Auth successful, calling next()
```

**Missing logs:**
- `[NOTIFICATION ROUTES] 🔔 POST /save-fcm-token - Request received` - This should appear but doesn't

## Root Cause

The route handler is defined as:
```javascript
router.post('/save-fcm-token', authorize, async (req, res) => {
```

The `authorize` middleware is a **factory function** that needs to be called to return the actual middleware:
```javascript
function authorize(allowedRoles = AllRoles) {
  return async (req, res, next) => {
    // middleware logic
  };
}
```

When passed without parentheses (`authorize`), Express might not execute it correctly. It should be:
```javascript
router.post('/save-fcm-token', authorize(), async (req, res) => {
```

## Fix Applied

✅ Changed `authorize` to `authorize()` in the route definition

## Additional Checks Needed

1. Verify all routes in `notificationRoutes.js` use `authorize()` correctly
2. Check if route matching is working correctly
3. Verify no other middleware is intercepting the request
4. Check if response is being sent elsewhere

## Next Steps

1. Restart the backend server
2. Try sending FCM token again
3. Check if route handler logs now appear
4. Verify token is saved in database

## Files Modified

- `vibgyor-backend/src/notification/routes/notificationRoutes.js`
  - Line 154: Changed `authorize` to `authorize()`
  - Line 13: Changed `authorize` to `authorize()` (for consistency)

## Testing

After restart:
1. Generate new FCM token in app
2. Check backend logs for route handler execution
3. Verify token appears in database (User.deviceTokens array)
