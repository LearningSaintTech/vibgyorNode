# VibgyorNode Postman API Collection

## Total API count: **282**

This folder contains a Postman collection that includes **all** APIs exposed by the VibgyorNode backend.

## Files

| File | Description |
|------|-------------|
| `VibgyorNode-API-Collection.postman_collection.json` | Postman Collection v2.1 with all 282 requests |
| `VibgyorNode-API-Collection.postman_environment.json` | Optional environment (create in Postman: baseUrl, userToken, adminToken) |

## How to use

1. **Import in Postman**: File → Import → select `VibgyorNode-API-Collection.postman_collection.json`.
2. **Set variables** (Collection or Environment):
   - `baseUrl`: e.g. `http://192.168.1.39:3000` or your deployed URL
   - `userToken`: JWT for user endpoints (after login via `/user/auth/verify-otp`)
   - `adminToken`: JWT for admin/subadmin endpoints (after login via `/admin-auth/verify-otp`)
3. **Path/query placeholders** to replace as needed: `{{userId}}`, `{{postId}}`, `{{chatId}}`, `{{messageId}}`, `{{callId}}`, `{{reportId}}`, `{{matchId}}`, `{{moderationId}}`, `{{subAdminId}}`, `{{requestId}}`, `{{storyId}}`, `{{hashtag}}`, `{{listType}}`, `{{photoIndex}}`, `{{videoIndex}}`, `{{id}}`.

## API summary by group

| Group | Count | Base path(s) |
|-------|-------|--------------|
| Root & Health | 3 | `/`, `/health`, `/api/v1/info` |
| Admin Auth (Unified) | 5 | `/admin-auth` |
| Admin (Legacy) | 5 | `/admin` |
| Admin - User Management | 10 | `/admin` |
| Admin - SubAdmin Management | 5 | `/admin` |
| Admin - Content Moderation | 8 | `/admin/content-moderation` |
| Admin - Analytics | 6 | `/admin/analytics` |
| Admin - User Count & Statistics | 5 | `/admin` |
| Admin - Associates | 2 | `/admin` |
| API Admin - User Search | 2 | `/api/admin` |
| SubAdmin - Auth | 5 | `/subadmin` |
| SubAdmin - User Management | 11 | `/subadmin` |
| SubAdmin - Verified Users & Stats | 2 | `/subadmin` |
| User - Auth | 16 | `/user/auth` |
| User - Catalog | 7 | `/user/catalog` |
| User - Username | 2 | `/user/username` |
| User - Social | 18 | `/user/social` |
| User - Message Requests | 11 | `/user/message-requests` |
| User - Status | 9 | `/user/status` |
| User - File Upload | 8 | `/user/upload` |
| User - Delete Account | 1 | `/user` |
| User - Posts | 29 | `/user/posts` |
| User - Stories | 13 | `/user/stories` |
| User - Dating Media | 5 | `/user/dating` |
| User - Dating Profile | 3 | `/user/dating` |
| User - Dating Interaction | 11 | `/user/dating` |
| User - Dating Chats | 10 | `/user/dating/chats` |
| User - Dating Messages | 14 | `/user/dating/messages` |
| User - Dating Calls | 12 | `/user/dating/calls` |
| Notifications (v1) | 10 | `/api/v1/notifications` |
| Notification Preferences | 3 | `/api/v1/notification-preferences` |
| API v1 User - Chats (Enhanced) | 10 | `/api/v1/user/chats` |
| API v1 User - Messages (Enhanced) | 13 | `/api/v1/user/messages` |
| API v1 User - Calls (Enhanced) | 12 | `/api/v1/user/calls` |
| API v1 User - Search | 5 | `/api/v1/user/search` |
| **Total** | **282** | |

## Auth notes

- **User APIs**: Use `Authorization: Bearer {{userToken}}` (from `/user/auth/verify-otp` or refresh via `/user/auth/update-access-token`).
- **Admin/SubAdmin APIs**: Use `Authorization: Bearer {{adminToken}}` (from `/admin-auth/verify-otp`). Test phones: `9999999999` (admin), `8888888888` (subadmin); OTP: `123456`.
- Some catalog and message-request cleanup routes require admin/subadmin role.

## Encryption

If the server uses `encryptionMiddleware`, request bodies may need to be sent encrypted (see `middleware/encryptionMiddleware.js`). For local testing you may disable it or send plain JSON.
