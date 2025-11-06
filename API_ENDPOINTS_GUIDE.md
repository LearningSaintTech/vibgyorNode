# 🚀 VibgyorNode API - Complete Endpoints Guide

## ✅ Updated Postman Collection

**Location:** `scriptFiles/corrected-postman-collection.json`

**Status:** ✅ All endpoints match actual implementation

---

## 📋 Complete API Endpoints List

### System Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/` | API root |
| GET | `/api/v1/info` | API information |

---

### 🔐 Admin Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/admin/send-otp` | Send OTP to admin phone |
| POST | `/admin/verify-otp` | Verify OTP and login |
| POST | `/admin/resend-otp` | Resend OTP |
| POST | `/admin/auth/refresh-token` | Refresh access token |
| GET | `/admin/me` | Get admin profile |

---

### 👥 Admin - User Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/users` | Get all users (paginated) |
| GET | `/admin/users/:userId` | Get user details |
| PATCH | `/admin/users/:userId/status` | Activate/deactivate user |
| GET | `/admin/users/verifications/pending` | Get pending verifications |
| PATCH | `/admin/users/:userId/verification/approve` | Approve verification |
| PATCH | `/admin/users/:userId/verification/reject` | Reject verification |

---

### 📊 Admin - Report Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/reports/pending` | Get pending reports |
| GET | `/admin/reports/:reportId` | Get report details |
| PATCH | `/admin/reports/:reportId/status` | Update report status |
| GET | `/admin/reports/stats` | Get report statistics |

---

### 👨‍💼 Admin - SubAdmin Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/subadmins` | Get all subadmins |
| GET | `/admin/subadmins/:subAdminId` | Get subadmin details |
| PATCH | `/admin/subadmins/:subAdminId/status` | Toggle subadmin status |

---

### 🛡️ Admin - Content Moderation
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/content-moderation/flagged` | Get flagged content |
| GET | `/admin/content-moderation/pending` | Get pending reviews |
| GET | `/admin/content-moderation/queue-stats` | Get queue statistics |
| PUT | `/admin/content-moderation/:moderationId/review` | Review content |

---

### 📈 Admin - Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/analytics/platform-overview` | Platform overview |
| GET | `/admin/analytics/content` | Content analytics |
| GET | `/admin/analytics/moderation` | Moderation analytics |
| GET | `/admin/analytics/users/:userId` | User analytics |

---

### 🔐 SubAdmin Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/subadmin/auth/send-otp` | Send OTP |
| POST | `/subadmin/auth/verify-otp` | Verify OTP |
| POST | `/subadmin/auth/resend-otp` | Resend OTP |
| POST | `/subadmin/auth/refresh-token` | Refresh token |
| GET | `/subadmin/me` | Get profile |
| PUT | `/subadmin/profile` | Update profile |

---

### 🔐 User Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/user/auth/send-otp` | Send phone OTP |
| POST | `/user/auth/verify-otp` | Verify phone OTP |
| POST | `/user/auth/resend-otp` | Resend phone OTP |
| POST | `/user/auth/update-access-token` | Refresh access token |
| POST | `/user/auth/email/send-otp` | Send email OTP |
| POST | `/user/auth/email/verify-otp` | Verify email OTP |
| POST | `/user/auth/email/resend-otp` | Resend email OTP |
| GET | `/user/auth/me` | Get current user |
| GET | `/user/auth/profile` | Get user profile |
| PUT | `/user/auth/profile` | Update user profile |
| GET | `/user/auth/profile/step` | Get profile completion step |
| GET | `/user/auth/email/status` | Get email verification status |

---

### 📚 User Catalog Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/user/catalog` | Get all catalog options |
| GET | `/user/catalog/:listType` | Get specific catalog (gender, pronouns, likes, interests, hereFor, languages) |
| POST | `/user/catalog` | Create catalog (Admin/SubAdmin) |
| PUT | `/user/catalog` | Update catalog (Admin/SubAdmin) |
| PATCH | `/user/catalog/add` | Add items to catalog (Admin/SubAdmin) |
| PATCH | `/user/catalog/remove` | Remove items from catalog (Admin/SubAdmin) |
| DELETE | `/user/catalog` | Delete catalog (Admin/SubAdmin) |

---

### 🔤 Username Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/user/username/available` | Check username availability |
| GET | `/user/username/suggest` | Get username suggestions |

---

### 📤 File Upload
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/user/upload/profile-picture` | Upload profile picture |
| POST | `/user/upload/id-proof` | Upload ID proof document |

---

### 👥 Social Features
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/user/social/follow-request/:userId` | Send follow request |
| POST | `/user/social/follow-request/:requestId/accept` | Accept follow request |
| POST | `/user/social/follow-request/:requestId/reject` | Reject follow request |
| DELETE | `/user/social/follow-request/:requestId/cancel` | Cancel follow request |
| GET | `/user/social/follow-requests/pending` | Get pending follow requests |
| GET | `/user/social/follow-requests/sent` | Get sent follow requests |
| DELETE | `/user/social/follow/:userId` | Unfollow user |
| GET | `/user/social/followers` | Get followers list |
| GET | `/user/social/following` | Get following list |
| POST | `/user/social/block/:userId` | Block user |
| DELETE | `/user/social/block/:userId` | Unblock user |
| GET | `/user/social/blocked` | Get blocked users |
| POST | `/user/social/report/:userId` | Report user |
| GET | `/user/social/reports` | Get user reports |
| GET | `/user/social/social-stats` | Get social statistics |

---

### 🟢 User Status
| Method | Endpoint | Description |
|--------|----------|-------------|
| PUT | `/user/status` | Update user status |
| GET | `/user/status/:userId` | Get user status |
| GET | `/user/status/online` | Get online users |
| GET | `/user/status/recent` | Get recently active users |
| POST | `/user/status/batch` | Get batch user statuses |
| PUT | `/user/status/privacy` | Update privacy settings |
| GET | `/user/status/stats` | Get status statistics |
| POST | `/user/status/offline` | Set user offline |

---

### 📨 Message Requests
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/user/message-requests/:userId` | Send message request |
| GET | `/user/message-requests/pending` | Get pending requests |
| GET | `/user/message-requests/sent` | Get sent requests |
| POST | `/user/message-requests/:requestId/accept` | Accept request |
| POST | `/user/message-requests/:requestId/reject` | Reject request |
| DELETE | `/user/message-requests/:requestId` | Delete request |
| GET | `/user/message-requests/:requestId` | Get request details |
| GET | `/user/message-requests/stats` | Get request statistics |
| GET | `/user/message-requests/between/:userId` | Get request between users |

---

### 📝 Posts Management (UPDATED)
| Method | Endpoint | Description | NEW |
|--------|----------|-------------|-----|
| POST | `/user/posts` | Create post (visibility & commentVisibility) | ✅ |
| GET | `/user/posts/feed` | Get feed posts | |
| GET | `/user/posts/me` | Get current user posts | ✅ |
| GET | `/user/posts/user/:userId` | Get user posts | |
| GET | `/user/posts/:postId` | Get single post | |
| PUT | `/user/posts/:postId` | Update post (visibility & commentVisibility) | ✅ |
| DELETE | `/user/posts/:postId` | Delete post | |
| PUT | `/user/posts/:postId/archive` | Archive post | ✅ |
| PUT | `/user/posts/:postId/unarchive` | Unarchive post | ✅ |
| POST | `/user/posts/:postId/save` | Save post | ✅ |
| DELETE | `/user/posts/:postId/save` | Unsave post | ✅ |
| GET | `/user/posts/saved` | Get saved posts | ✅ |
| GET | `/user/posts/search` | Search posts | |
| GET | `/user/posts/trending` | Get trending posts | |
| GET | `/user/posts/hashtag/:hashtag` | Get posts by hashtag | |
| POST | `/user/posts/:postId/like` | Like/unlike post | |
| POST | `/user/posts/:postId/comment` | Add comment | |
| GET | `/user/posts/:postId/comments` | Get post comments | |
| POST | `/user/posts/:postId/share` | Share post | |
| GET | `/user/posts/:postId/analytics` | Get post analytics | |
| POST | `/user/posts/:postId/report` | Report post | |

**NEW Post Fields:**
- `visibility`: `public` | `followers` | `private` (replaces `privacy`)
- `commentVisibility`: `everyone` | `followers` | `none`

---

### 📸 Stories Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/user/stories` | Create story |
| GET | `/user/stories/feed` | Get stories feed |
| GET | `/user/stories/user/:userId` | Get user stories |
| GET | `/user/stories/:storyId` | Get single story |
| DELETE | `/user/stories/:storyId` | Delete story |
| POST | `/user/stories/:storyId/replies` | Reply to story |
| POST | `/user/stories/:storyId/report` | Report story |
| GET | `/user/stories/:storyId/analytics` | Get story analytics |
| GET | `/user/stories/hashtag/:hashtag` | Search stories by hashtag |

---

### 🔔 Notifications
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/user/notifications` | Get notifications |
| GET | `/user/notifications/unread-count` | Get unread count |
| PUT | `/user/notifications/:notificationId/read` | Mark as read |
| PUT | `/user/notifications/read-all` | Mark all as read |

---

### ⚙️ Notification Preferences
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/user/notification-preferences` | Get preferences |
| PUT | `/user/notification-preferences` | Update preferences |
| POST | `/user/notification-preferences/reset` | Reset to defaults |
| GET | `/user/notification-preferences/summary` | Get preferences summary |

---

### 🔍 Search
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/user/search` | Search all (people, posts, hashtags, location) |
| GET | `/api/v1/user/search/people` | Search people |
| GET | `/api/v1/user/search/posts` | Search posts |
| GET | `/api/v1/user/search/hashtags` | Search hashtags |
| GET | `/api/v1/user/search/location` | Search by location |

---

### 💬 Enhanced Chat Management (v2)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/user/chats` | Create or get chat |
| GET | `/api/v1/user/chats` | Get user chats |
| GET | `/api/v1/user/chats/search` | Search chats |
| GET | `/api/v1/user/chats/:chatId` | Get chat details |
| PUT | `/api/v1/user/chats/:chatId/settings` | Update chat settings |
| DELETE | `/api/v1/user/chats/:chatId` | Delete chat |
| POST | `/api/v1/user/chats/:chatId/join` | Join chat room |
| POST | `/api/v1/user/chats/:chatId/leave` | Leave chat room |

---

### 📱 Enhanced Message Management (v2)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/user/messages` | Send message |
| GET | `/api/v1/user/messages/chat/:chatId` | Get chat messages |
| PUT | `/api/v1/user/messages/chat/:chatId/read` | Mark messages as read |
| GET | `/api/v1/user/messages/chat/:chatId/media` | Get chat media |
| GET | `/api/v1/user/messages/chat/:chatId/search` | Search messages |
| GET | `/api/v1/user/messages/:messageId` | Get message details |
| PUT | `/api/v1/user/messages/:messageId` | Edit message |
| DELETE | `/api/v1/user/messages/:messageId` | Delete message |
| POST | `/api/v1/user/messages/:messageId/reactions` | React to message |
| DELETE | `/api/v1/user/messages/:messageId/reactions` | Remove reaction |
| POST | `/api/v1/user/messages/:messageId/forward` | Forward message |

---

### 📞 Enhanced Call Management (v2)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/user/calls` | Initiate call |
| GET | `/api/v1/user/calls/stats` | Get call statistics |
| GET | `/api/v1/user/calls/:callId/status` | Get call status |
| POST | `/api/v1/user/calls/:callId/accept` | Accept call |
| POST | `/api/v1/user/calls/:callId/reject` | Reject call |
| POST | `/api/v1/user/calls/:callId/end` | End call |
| PUT | `/api/v1/user/calls/:callId/settings` | Update call settings |
| POST | `/api/v1/user/calls/:callId/signaling` | Handle WebRTC signaling |
| GET | `/api/v1/user/calls/chat/:chatId/history` | Get call history |
| GET | `/api/v1/user/calls/chat/:chatId/active` | Get active call |
| POST | `/api/v1/user/calls/chat/:chatId/cleanup` | Force cleanup calls |

---

## 🔥 Quick Test Flow

### 1. Health Check
```bash
GET /health
```

### 2. User Login
```bash
POST /user/auth/send-otp
POST /user/auth/verify-otp
```

### 3. Complete Profile
```bash
GET /user/catalog  # Get dropdown options
PUT /user/auth/profile  # Set preferences
```

### 4. Create Content
```bash
POST /user/posts  # Create post with visibility
POST /user/stories  # Create story
```

### 5. Social Interaction
```bash
POST /user/social/follow-request/:userId
POST /user/posts/:postId/like
POST /user/posts/:postId/comment
POST /user/posts/:postId/save
```

### 6. Messaging
```bash
POST /api/v1/user/chats  # Create chat
POST /api/v1/user/messages  # Send message
POST /api/v1/user/messages/:messageId/reactions  # React
```

### 7. Calls
```bash
POST /api/v1/user/calls  # Initiate call
POST /api/v1/user/calls/:callId/accept  # Accept
POST /api/v1/user/calls/:callId/end  # End
```

---

## 📊 Endpoint Count

| Category | Count |
|----------|-------|
| System | 3 |
| Admin Auth | 5 |
| Admin User Mgmt | 6 |
| Admin Reports | 4 |
| Admin SubAdmins | 3 |
| Admin Moderation | 4 |
| Admin Analytics | 4 |
| SubAdmin | 6+ |
| User Auth | 13 |
| User Catalog | 7 |
| Username | 2 |
| File Upload | 2 |
| Social | 13 |
| User Status | 8 |
| Message Requests | 9 |
| **Posts** | **20** ✅ (6 NEW) |
| Stories | 9 |
| Notifications | 4 |
| Notification Prefs | 4 |
| Search | 5 |
| Enhanced Chat | 8 |
| Enhanced Messages | 11 |
| Enhanced Calls | 11 |

**Total: 150+ endpoints** ✅

---

## 🎯 Key Changes in This Update

### Posts API Changes ✅
1. **Field renamed:** `privacy` → `visibility`
2. **New field:** `commentVisibility` (`everyone` | `followers` | `none`)
3. **New endpoints:**
   - `GET /user/posts/me` - Get current user posts
   - `PUT /user/posts/:postId/archive` - Archive post
   - `PUT /user/posts/:postId/unarchive` - Unarchive post
   - `POST /user/posts/:postId/save` - Save post
   - `DELETE /user/posts/:postId/save` - Unsave post
   - `GET /user/posts/saved` - Get saved posts

### Removed from Collection ✅
- Matching System endpoints (not implemented in codebase)

---

## ✅ Testing Checklist

- [x] JSON syntax valid
- [x] All routes match implementation
- [x] Descriptions added to new endpoints
- [x] Query parameters documented
- [x] Request bodies documented
- [x] Response formats documented
- [x] Authentication tokens configured
- [x] Environment variables set up

---

## 🚀 Ready to Test!

1. Import `scriptFiles/corrected-postman-collection.json` into Postman
2. Set environment variable: `BASE_URL = http://localhost:3000`
3. Run seed script: `node scriptFiles/seed.js --clear=true`
4. Start server: `npm start`
5. Start testing! 🎉

---

**All endpoints are now documented and ready to test!**

