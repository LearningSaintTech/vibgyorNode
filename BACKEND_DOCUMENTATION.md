# VibgyorNode Backend - Complete Documentation

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Authentication & Authorization Flow](#authentication--authorization-flow)
4. [Core Features & Flows](#core-features--flows)
5. [API Endpoints Reference](#api-endpoints-reference)
6. [Real-time Features](#real-time-features)
7. [Database Models](#database-models)
8. [Services & Utilities](#services--utilities)
9. [Key Workflows](#key-workflows)
10. [Admin & SubAdmin System](#admin--subadmin-system)

---

## 🎯 Project Overview

**VibgyorNode** is a comprehensive Node.js/Express backend for a social and dating platform that combines:
- **Social Media Features**: Posts, Stories, Chat, Messages, Follow/Unfollow
- **Dating Features**: Dating profiles, Matches, Interactions
- **Real-time Communication**: WebSocket-based chat, audio/video calls
- **Admin Panel**: Content moderation, user management, analytics

### Technology Stack
- **Runtime**: Node.js
- **Framework**: Express.js 5.1.0
- **Database**: MongoDB (Mongoose ODM)
- **Real-time**: Socket.IO 4.8.1
- **Storage**: AWS S3 + CloudFront CDN
- **Push Notifications**: Firebase Admin SDK
- **Authentication**: JWT (JSON Web Tokens)
- **File Processing**: Sharp (images), Multer (uploads)

---

## 🏗️ Architecture

### Directory Structure
```
src/
├── app.js                 # Express app setup & route mounting
├── server.js              # Server entry point & graceful shutdown
├── dbConfig/             # MongoDB connection
├── middleware/           # Auth, validation, cache, performance
├── utils/                # JWT, API responses, constants
├── services/             # Business logic services
├── user/
│   ├── auth/             # User authentication & profile
│   ├── social/           # Posts, Stories, Chat, Messages
│   └── dating/           # Dating profiles & interactions
├── admin/                # Admin panel features
├── subAdmin/             # Sub-admin management
└── notification/         # Notification system
```

### Request Flow
```
Client Request
    ↓
Express Middleware (CORS, Helmet, Compression)
    ↓
Rate Limiting (if enabled)
    ↓
Authentication Middleware (JWT verification)
    ↓
Route Handler
    ↓
Controller (Business Logic)
    ↓
Service Layer (Data Processing)
    ↓
Model (Database Operations)
    ↓
Response to Client
```

---

## 🔐 Authentication & Authorization Flow

### User Authentication (Phone OTP)

#### Step 1: Send Phone OTP
**Endpoint**: `POST /user/auth/send-otp`

**Flow**:
1. User provides phone number
2. System checks if user exists
   - **New User**: Creates user record with phone number
   - **Existing User**: Finds existing user
3. Generates OTP (currently hardcoded: `123456` for development)
4. Stores OTP with expiration (5 minutes)
5. Implements rate limiting (60 seconds between requests)
6. Returns masked phone number

**Request**:
```json
{
  "phoneNumber": "7776665555",
  "countryCode": "+91"
}
```

**Response**:
```json
{
  "success": true,
  "message": "OTP sent",
  "data": {
    "maskedPhone": "******5555",
    "ttlSeconds": 300
  }
}
```

#### Step 2: Verify Phone OTP
**Endpoint**: `POST /user/auth/verify-otp`

**Flow**:
1. User submits phone number + OTP
2. System validates:
   - OTP exists for phone number
   - OTP matches
   - OTP not expired
3. Clears OTP from database
4. Generates JWT tokens:
   - **Access Token**: 30 days validity
   - **Refresh Token**: 31 days validity
5. Stores refresh token in database
6. Sets refresh token as HTTP-only cookie
7. Returns tokens + user data

**Request**:
```json
{
  "phoneNumber": "7776665555",
  "otp": "123456"
}
```

**Response**:
```json
{
  "success": true,
  "message": "OTP verified",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user_id",
      "phoneNumber": "******5555",
      "username": "",
      "fullName": "",
      "isProfileCompleted": false
    }
  }
}
```

### Email Verification (Optional)
**Endpoints**:
- `POST /user/auth/email/send-otp` - Send email OTP
- `POST /user/auth/email/verify-otp` - Verify email OTP

**Flow**: Similar to phone OTP, but requires authenticated user (access token)

### Token Refresh
**Endpoint**: `POST /user/auth/refresh-token`

**Flow**:
1. Client sends refresh token
2. System validates refresh token
3. Checks if token exists in database and is valid
4. Generates new access token
5. Returns new access token

### Authorization Middleware

**Location**: `src/middleware/authMiddleware.js`

**How it works**:
1. Extracts `Authorization: Bearer <token>` header
2. Verifies JWT token
3. Attaches `req.user` with user payload
4. Checks role permissions (if specified)
5. For SubAdmins: Validates approval status and active status

**Usage in Routes**:
```javascript
const { authorize } = require('./middleware/authMiddleware');
const { Roles } = require('./utils/constData');

// Public route
router.get('/public', handler);

// Protected route (any authenticated user)
router.get('/protected', authorize(), handler);

// Admin only
router.get('/admin-only', authorize([Roles.ADMIN]), handler);

// Admin or SubAdmin
router.get('/admin', authorize([Roles.ADMIN, Roles.SUBADMIN]), handler);
```

---

## 🎨 Core Features & Flows

### 1. User Profile Management

#### Profile Completion Steps
Users complete profile in stages:
1. `basic_info` - Name, username, email, DOB, bio
2. `gender` - Gender selection
3. `pronouns` - Pronouns selection
4. `likes_interests` - Likes and interests
5. `preferences` - Here for, want to meet, languages
6. `location` - Location coordinates, city, country
7. `completed` - Profile fully completed

**Endpoint**: `PUT /user/auth/profile`

**Flow**:
1. User updates profile fields
2. System validates data
3. Updates user document
4. Advances `profileCompletionStep` if required fields filled
5. Sets `isProfileCompleted: true` when all steps done
6. Returns updated user data

### 2. Posts System

#### Create Post
**Endpoint**: `POST /user/posts`

**Flow**:
1. User uploads media (images/videos) via `POST /user/upload`
2. Media uploaded to AWS S3
3. URLs returned to client
4. User creates post with:
   - Caption
   - Media URLs
   - Location (optional)
   - Visibility settings
5. Post saved to database
6. BlurHash generated for images (for placeholders)
7. Notification sent to followers (if public post)
8. Post appears in feed

**Post Model Structure**:
```javascript
{
  author: ObjectId (User),
  caption: String,
  media: {
    images: [String],  // S3 URLs
    videos: [String],  // S3 URLs
    blurhashes: [String]
  },
  location: {
    name: String,
    coordinates: { lat, lng },
    address: String
  },
  likes: [{ user: ObjectId, createdAt: Date }],
  comments: [{ user: ObjectId, text: String, createdAt: Date }],
  shares: [{ user: ObjectId, createdAt: Date }],
  visibility: 'public' | 'followers' | 'close_friends',
  createdAt: Date
}
```

#### Get Feed
**Endpoint**: `GET /user/posts/feed`

**Flow**:
1. Fetches posts from:
   - Users you follow
   - Your own posts
   - Public posts (if enabled)
2. Applies feed algorithm (engagement-based sorting)
3. Filters blocked users
4. Adds `isLiked` flag for each post
5. Paginates results
6. Returns feed

### 3. Stories System

#### Create Story
**Endpoint**: `POST /user/stories`

**Flow**:
1. User uploads media (image/video)
2. Media uploaded to S3
3. Story created with:
   - Media URL
   - Caption (optional)
   - Expiration (24 hours default)
4. Story saved to database
5. Notification sent to followers
6. Story appears in stories feed

**Story Model**:
```javascript
{
  author: ObjectId (User),
  mediaUrl: String,
  mediaType: 'image' | 'video',
  caption: String,
  views: [{ user: ObjectId, viewedAt: Date }],
  expiresAt: Date,
  createdAt: Date
}
```

#### View Story
**Endpoint**: `POST /user/stories/:storyId/view`

**Flow**:
1. User views story
2. Adds user to `views` array (if not already viewed)
3. Updates view count
4. Returns story data

### 4. Chat & Messaging System

#### Create/Get Chat
**Endpoint**: `POST /api/v1/user/chats`

**Flow**:
1. User requests chat with another user
2. System checks:
   - Users exist and are active
   - Not blocked by either user
   - Privacy settings allow messaging
3. Searches for existing chat
4. If exists: Returns existing chat
5. If not: Creates new chat
6. Returns chat data

**Chat Model**:
```javascript
{
  participants: [ObjectId],  // Array of 2 user IDs
  lastMessage: ObjectId (Message),
  lastMessageAt: Date,
  unreadCounts: {
    userId1: Number,
    userId2: Number
  },
  createdAt: Date
}
```

#### Send Message
**Endpoint**: `POST /api/v1/user/messages`

**Flow**:
1. User sends message to chat
2. Validates chat access
3. Creates message document
4. Updates chat's `lastMessage` and `lastMessageAt`
5. Increments unread count for recipient
6. Emits Socket.IO event to chat room
7. Sends push notification to recipient
8. Returns message data

**Message Model**:
```javascript
{
  chatId: ObjectId (Chat),
  senderId: ObjectId (User),
  type: 'text' | 'image' | 'video' | 'audio' | 'file',
  content: String,
  mediaUrl: String (optional),
  replyTo: ObjectId (Message, optional),
  forwardedFrom: ObjectId (Message, optional),
  status: 'sent' | 'delivered' | 'read',
  readAt: Date,
  createdAt: Date
}
```

#### Get Messages
**Endpoint**: `GET /api/v1/user/messages/:chatId`

**Flow**:
1. Validates chat access
2. Fetches messages with pagination
3. Marks messages as read
4. Resets unread count
5. Returns messages

### 5. Follow System

#### Follow User
**Endpoint**: `POST /user/social/follow/:userId`

**Flow**:
1. Validates target user exists
2. Checks if already following
3. Checks privacy settings:
   - **Public Profile**: Follow immediately
   - **Private Profile**: Create follow request
4. Updates `following` and `followers` arrays
5. Creates notification
6. Returns follow status

#### Follow Request (Private Profiles)
**Endpoint**: `POST /user/social/follow-request/:userId`

**Flow**:
1. User sends follow request
2. Request saved to database
3. Notification sent to target user
4. Target user can approve/reject

**Follow Request Model**:
```javascript
{
  requester: ObjectId (User),
  recipient: ObjectId (User),
  status: 'pending' | 'approved' | 'rejected',
  createdAt: Date,
  respondedAt: Date
}
```

### 6. Dating Features

#### Activate Dating Profile
**Endpoint**: `POST /user/dating/profile/activate`

**Flow**:
1. User uploads dating photos/videos
2. Sets dating preferences:
   - Age range
   - Gender preferences
   - Location radius
   - Languages
3. Activates dating profile
4. Profile becomes discoverable

**Dating Profile Structure** (embedded in User model):
```javascript
{
  dating: {
    photos: [{ url, thumbnailUrl, blurhash, order }],
    videos: [{ url, thumbnailUrl, duration, order }],
    isDatingProfileActive: Boolean,
    preferences: {
      hereTo: String,
      wantToMeet: String,
      ageRange: { min, max },
      languages: [String],
      location: { lat, lng, radius }
    }
  }
}
```

#### Discover Profiles
**Endpoint**: `GET /user/dating/discover`

**Flow**:
1. Fetches users matching preferences:
   - Age range
   - Gender preferences
   - Location (within radius)
   - Active dating profile
2. Excludes:
   - Already matched
   - Already liked/passed
   - Blocked users
3. Returns paginated results

#### Like/Pass Profile
**Endpoint**: `POST /user/dating/interaction`

**Flow**:
1. User likes or passes a profile
2. Interaction saved:
   - `type`: 'like' | 'pass'
   - `targetUser`: ObjectId
   - `interactionUser`: ObjectId
3. If both users liked each other → **Match Created**
4. Match notification sent to both users

**Match Model**:
```javascript
{
  users: [ObjectId, ObjectId],  // Both users
  matchedAt: Date,
  lastInteractionAt: Date,
  isActive: Boolean
}
```

---

## 📡 Real-time Features

### Socket.IO Integration

**Service**: `src/services/enhancedRealtimeService.js`

### Connection Flow

1. **Client Connects**:
   - Client sends JWT token in `auth.token` or `Authorization` header
   - Server verifies token
   - Server attaches user info to socket
   - User joins personal room: `user:${userId}`
   - User status set to 'online'

2. **Multiple Device Support**:
   - User can connect from multiple devices
   - Each device gets separate socket connection
   - User stays online until ALL connections close

### Real-time Events

#### Chat Events

**Join Chat**:
```javascript
socket.emit('join_chat', chatId);
// Server: User joins room 'chat:${chatId}'
// Server: Marks messages as read
// Server: Resets unread count
```

**Send Message**:
```javascript
socket.emit('new_message', {
  chatId: 'chat_id',
  content: 'Hello!',
  type: 'text'
});
// Server: Creates message in database
// Server: Broadcasts to all participants in chat room
// Server: Updates unread counts
// Server: Sends push notification
```

**Typing Indicators**:
```javascript
socket.emit('typing_start', { chatId: 'chat_id' });
socket.emit('typing_stop', { chatId: 'chat_id' });
// Server: Broadcasts to other participants
```

#### Call Events

**Initiate Call**:
```javascript
socket.emit('call:initiate', {
  chatId: 'chat_id',
  type: 'audio' | 'video',
  targetUserId: 'user_id'
});
// Server: Creates call record
// Server: Emits 'call:incoming' to target user
```

**Accept Call**:
```javascript
socket.emit('call:accept', { callId: 'call_id' });
// Server: Updates call status to 'connected'
// Server: Notifies both participants
```

**WebRTC Signaling**:
- WebRTC offer/answer/candidates handled via HTTP API
- Socket.IO used for call state management only

#### Presence Events

**Update Status**:
```javascript
socket.emit('update_status', { status: 'online' | 'offline' | 'away' });
// Server: Updates user status in database
// Server: Broadcasts to all users
```

**User Online/Offline**:
- Automatically handled on connection/disconnection
- Broadcasted to all connected users

### Socket Rooms

- **User Room**: `user:${userId}` - All user's connections
- **Chat Room**: `chat:${chatId}` - All participants in a chat

---

## 🗄️ Database Models

### User Model (`userAuthModel.js`)

**Key Fields**:
```javascript
{
  phoneNumber: String (unique, indexed),
  countryCode: String,
  email: String,
  emailVerified: Boolean,
  username: String (indexed),
  fullName: String,
  dob: Date,
  bio: String,
  gender: String,
  pronouns: String,
  likes: [String],
  interests: [String],
  profilePictureUrl: String,
  location: { lat, lng, city, country },
  role: 'user' | 'admin' | 'subadmin',
  isProfileCompleted: Boolean,
  profileCompletionStep: String,
  isActive: Boolean,
  verificationStatus: 'none' | 'pending' | 'approved' | 'rejected',
  following: [ObjectId],
  followers: [ObjectId],
  blockedUsers: [ObjectId],
  privacySettings: {
    isPrivate: Boolean,
    allowFollowRequests: Boolean,
    showOnlineStatus: Boolean,
    allowMessages: String
  },
  dating: { /* Dating profile data */ }
}
```

### Post Model (`postModel.js`)

**Key Fields**:
```javascript
{
  author: ObjectId (ref: User),
  caption: String,
  media: {
    images: [String],
    videos: [String],
    blurhashes: [String]
  },
  location: Object,
  likes: [{ user: ObjectId, createdAt: Date }],
  comments: [{ user: ObjectId, text: String, createdAt: Date }],
  shares: [{ user: ObjectId, createdAt: Date }],
  visibility: String,
  createdAt: Date
}
```

### Chat Model (`chatModel.js`)

**Key Fields**:
```javascript
{
  participants: [ObjectId] (ref: User),
  lastMessage: ObjectId (ref: Message),
  lastMessageAt: Date,
  unreadCounts: Map,
  createdAt: Date
}
```

### Message Model (`messageModel.js`)

**Key Fields**:
```javascript
{
  chatId: ObjectId (ref: Chat),
  senderId: ObjectId (ref: User),
  type: 'text' | 'image' | 'video' | 'audio' | 'file',
  content: String,
  mediaUrl: String,
  replyTo: ObjectId (ref: Message),
  status: 'sent' | 'delivered' | 'read',
  readAt: Date,
  createdAt: Date
}
```

### Story Model (`storyModel.js`)

**Key Fields**:
```javascript
{
  author: ObjectId (ref: User),
  mediaUrl: String,
  mediaType: 'image' | 'video',
  caption: String,
  views: [{ user: ObjectId, viewedAt: Date }],
  expiresAt: Date,
  createdAt: Date
}
```

### Call Model (`callModel.js`)

**Key Fields**:
```javascript
{
  callId: String (unique),
  chatId: ObjectId (ref: Chat),
  initiator: ObjectId (ref: User),
  participants: [ObjectId],
  type: 'audio' | 'video',
  status: 'ringing' | 'connected' | 'ended' | 'rejected',
  startedAt: Date,
  answeredAt: Date,
  endedAt: Date,
  duration: Number (seconds),
  endReason: String
}
```

---

## 🔧 Services & Utilities

### S3 Service (`s3Service.js`)

**Purpose**: Handle file uploads to AWS S3

**Key Functions**:
- `uploadToS3()` - Upload file buffer to S3
- `deleteFromS3()` - Delete file from S3
- `getObjectUrl()` - Get signed URL for private files

**File Structure in S3**:
```
{userId}/{category}-{type}/{timestamp}-{filename}
Example: 12345/post-images/1699999999-photo.jpg
```

### CloudFront Service (`cloudfrontService.js`)

**Purpose**: Generate CloudFront CDN URLs for faster delivery

**Usage**: Automatically used if `USE_CLOUDFRONT=true` in environment

### BlurHash Service (`blurhashService.js`)

**Purpose**: Generate BlurHash placeholders for images

**Flow**:
1. Image uploaded to S3
2. Sharp processes image
3. BlurHash generated
4. BlurHash stored with image URL
5. Client shows blurhash while loading full image

### Notification Service (`notificationService.js`)

**Purpose**: Centralized notification management

**Architecture**:
- **Factory Pattern**: Creates notifications based on type
- **Registry Pattern**: Registers handlers for different contexts
- **Delivery Manager**: Handles delivery via multiple channels

**Notification Types**:
- Social: Like, Comment, Follow, Message, etc.
- Dating: Match, Like, Super Like, etc.

**Delivery Channels**:
- In-app notifications
- Push notifications (FCM)
- Email (optional)

**Flow**:
1. Event occurs (e.g., user likes post)
2. Notification service creates notification
3. Checks user preferences
4. Delivers via enabled channels
5. Retries failed push notifications

### Feed Algorithm Service (`feedAlgorithmService.js`)

**Purpose**: Sort posts in feed based on engagement

**Factors**:
- Post age (newer = higher priority)
- Engagement (likes, comments, shares)
- User interactions (posts from followed users prioritized)

### Cache Service (`cacheService.js`)

**Purpose**: Cache frequently accessed data

**Cached Data**:
- User profiles
- Post metadata
- Chat lists

**Cache Invalidation**: Automatically invalidated on updates

---

## 🔄 Key Workflows

### Workflow 1: User Registration & Profile Setup

```
1. User enters phone number
   → POST /user/auth/send-otp
   → User record created (if new)

2. User receives OTP
   → User enters OTP
   → POST /user/auth/verify-otp
   → JWT tokens generated
   → User logged in

3. User completes profile
   → PUT /user/auth/profile (multiple times)
   → Each step updates profileCompletionStep
   → When all steps done: isProfileCompleted = true

4. User uploads profile picture
   → POST /user/upload
   → File uploaded to S3
   → URL returned
   → PUT /user/auth/profile with profilePictureUrl

5. Profile complete!
```

### Workflow 2: Creating & Viewing Post

```
1. User creates post
   → Upload media: POST /user/upload
   → Media URLs received
   → Create post: POST /user/posts
   → Post saved to database
   → BlurHash generated for images

2. Post appears in feed
   → GET /user/posts/feed
   → Algorithm sorts posts
   → Posts returned with isLiked flag

3. User interacts with post
   → Like: POST /user/posts/:postId/like
   → Comment: POST /user/posts/:postId/comment
   → Share: POST /user/posts/:postId/share

4. Notifications sent
   → Author receives notification
   → Push notification sent (if enabled)
```

### Workflow 3: Chat & Messaging

```
1. User starts chat
   → POST /api/v1/user/chats
   → System finds/creates chat
   → Chat returned

2. User connects via Socket.IO
   → socket.emit('join_chat', chatId)
   → User joins chat room
   → Messages marked as read

3. User sends message
   → socket.emit('new_message', { chatId, content })
   → Message saved to database
   → Broadcasted to chat room
   → Push notification sent

4. Recipient receives message
   → Socket.IO event received
   → Unread count incremented
   → Notification shown

5. Recipient opens chat
   → GET /api/v1/user/messages/:chatId
   → Messages fetched
   → Marked as read
   → Unread count reset
```

### Workflow 4: Audio/Video Call

```
1. User initiates call
   → socket.emit('call:initiate', { chatId, type, targetUserId })
   → Call record created
   → Status: 'ringing'

2. Target user receives call
   → Socket.IO event: 'call:incoming'
   → Push notification sent
   → Call UI shown

3. Target user accepts
   → socket.emit('call:accept', { callId })
   → Status: 'connected'
   → Both users notified

4. WebRTC signaling
   → POST /api/v1/user/calls/:callId/offer (Offer)
   → POST /api/v1/user/calls/:callId/answer (Answer)
   → POST /api/v1/user/calls/:callId/ice-candidate (ICE candidates)
   → WebRTC connection established

5. Call ends
   → socket.emit('call:end', { callId })
   → Status: 'ended'
   → Duration calculated
   → Call record updated
```

### Workflow 5: Follow & Follow Request

```
1. User follows another user
   → POST /user/social/follow/:userId
   → System checks privacy settings

2. If public profile:
   → Follow immediately
   → following/followers arrays updated
   → Notification sent

3. If private profile:
   → Follow request created
   → POST /user/social/follow-request/:userId
   → Notification sent to target user

4. Target user responds
   → POST /user/social/follow-request/:requestId/approve
   → OR POST /user/social/follow-request/:requestId/reject
   → If approved: following/followers updated
   → Notification sent to requester
```

### Workflow 6: Dating Match

```
1. User activates dating profile
   → POST /user/dating/profile/activate
   → Dating preferences set
   → Profile becomes discoverable

2. User browses profiles
   → GET /user/dating/discover
   → Profiles matching preferences returned

3. User likes profile
   → POST /user/dating/interaction
   → Type: 'like'
   → Interaction saved

4. If target user also liked:
   → Match created automatically
   → Both users notified
   → Match appears in matches list

5. Users can chat
   → Match chat created
   → Users can message each other
```

---

## 👥 Admin & SubAdmin System

### Admin Authentication

**Flow**:
1. Admin sends OTP: `POST /admin/send-otp`
2. Admin verifies OTP: `POST /admin/verify-otp`
3. Admin tokens generated
4. Admin can access admin routes

### Admin Features

**User Management**:
- View all users: `GET /admin/users`
- View user details: `GET /admin/users/:userId`
- Activate/Deactivate user: `PUT /admin/users/:userId/status`
- Delete user: `DELETE /admin/users/:userId`

**Content Moderation**:
- View reported content: `GET /admin/content-moderation/reports`
- Review content: `POST /admin/content-moderation/review`
- Take action: Approve, Reject, Delete

**SubAdmin Management**:
- Create SubAdmin: `POST /admin/subadmins`
- View SubAdmins: `GET /admin/subadmins`
- Approve/Reject SubAdmin: `PUT /admin/subadmins/:subAdminId/approval`

**Analytics**:
- User statistics: `GET /admin/analytics/users`
- Content statistics: `GET /admin/analytics/content`
- Engagement metrics: `GET /admin/analytics/engagement`

### SubAdmin System

**Features**:
- Limited admin access
- Requires approval from Admin
- Can manage users (limited scope)
- Can moderate content

**Approval Flow**:
1. Admin creates SubAdmin: `POST /admin/subadmins`
2. SubAdmin status: `pending`
3. SubAdmin can login but has limited access
4. Admin approves: `PUT /admin/subadmins/:id/approval`
5. SubAdmin status: `approved`
6. SubAdmin gets full permissions

---

## 📝 API Endpoints Reference

### Authentication
- `POST /user/auth/send-otp` - Send phone OTP
- `POST /user/auth/verify-otp` - Verify phone OTP
- `POST /user/auth/refresh-token` - Refresh access token
- `POST /user/auth/email/send-otp` - Send email OTP
- `POST /user/auth/email/verify-otp` - Verify email OTP

### Profile
- `GET /user/auth/profile` - Get user profile
- `PUT /user/auth/profile` - Update profile
- `POST /user/upload` - Upload file (profile picture, post media, etc.)

### Posts
- `POST /user/posts` - Create post
- `GET /user/posts/feed` - Get feed
- `GET /user/posts/:postId` - Get post details
- `POST /user/posts/:postId/like` - Like post
- `POST /user/posts/:postId/comment` - Comment on post
- `DELETE /user/posts/:postId` - Delete post

### Stories
- `POST /user/stories` - Create story
- `GET /user/stories/feed` - Get stories feed
- `POST /user/stories/:storyId/view` - View story
- `DELETE /user/stories/:storyId` - Delete story

### Social
- `POST /user/social/follow/:userId` - Follow user
- `POST /user/social/unfollow/:userId` - Unfollow user
- `GET /user/social/followers` - Get followers
- `GET /user/social/following` - Get following
- `POST /user/social/follow-request/:userId` - Send follow request
- `GET /user/search` - Search users

### Chat & Messages
- `POST /api/v1/user/chats` - Create/Get chat
- `GET /api/v1/user/chats` - Get user's chats
- `GET /api/v1/user/chats/:chatId` - Get chat details
- `POST /api/v1/user/messages` - Send message
- `GET /api/v1/user/messages/:chatId` - Get messages

### Calls
- `POST /api/v1/user/calls/:callId/offer` - Send WebRTC offer
- `POST /api/v1/user/calls/:callId/answer` - Send WebRTC answer
- `POST /api/v1/user/calls/:callId/ice-candidate` - Send ICE candidate
- `GET /api/v1/user/calls` - Get call history

### Dating
- `POST /user/dating/profile/activate` - Activate dating profile
- `GET /user/dating/discover` - Discover profiles
- `POST /user/dating/interaction` - Like/Pass profile
- `GET /user/dating/matches` - Get matches

### Notifications
- `GET /api/v1/notifications` - Get notifications
- `PUT /api/v1/notifications/:notificationId/read` - Mark as read
- `GET /api/v1/notification-preferences` - Get preferences
- `PUT /api/v1/notification-preferences` - Update preferences
- `POST /api/notification/fcm-token` - Register FCM token

### Admin
- `POST /admin/send-otp` - Admin send OTP
- `POST /admin/verify-otp` - Admin verify OTP
- `GET /admin/users` - Get all users
- `PUT /admin/users/:userId/status` - Update user status
- `GET /admin/content-moderation/reports` - Get reports
- `POST /admin/subadmins` - Create SubAdmin

---

## 🔒 Security Features

### Authentication Security
- JWT tokens with expiration
- Refresh token rotation
- HTTP-only cookies for refresh tokens
- Rate limiting on auth endpoints

### Authorization
- Role-based access control (RBAC)
- Route-level permissions
- SubAdmin approval workflow

### Data Protection
- Input validation
- SQL injection prevention (MongoDB)
- XSS protection (Helmet.js)
- CORS configuration

### File Upload Security
- File type validation
- File size limits
- Secure S3 storage
- Signed URLs for private files

---

## 🚀 Deployment

### Environment Variables

**Required**:
```env
MONGODB_URI=mongodb://localhost:27017/vib
ACCESS_TOKEN_SECRET=your-secret-key
REFRESH_TOKEN_SECRET=your-refresh-secret
AWS_S3_BUCKET=your-bucket-name
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
FIREBASE_SERVICE_ACCOUNT=path-to-service-account.json
```

**Optional**:
```env
PORT=3000
NODE_ENV=production
USE_CLOUDFRONT=true
CLOUDFRONT_DOMAIN=your-cloudfront-domain
CORS_ORIGIN=https://your-frontend.com
```

### Server Startup

1. **Development**:
   ```bash
   npm run dev
   ```

2. **Production**:
   ```bash
   npm start
   ```

### Graceful Shutdown

Server handles:
- SIGTERM signal
- SIGINT signal (Ctrl+C)
- Uncaught exceptions
- Unhandled promise rejections

On shutdown:
- Stops accepting new connections
- Closes database connection
- Stops push notification retry queue
- Exits gracefully

---

## 📊 Performance Optimizations

### Caching
- User data caching
- Post metadata caching
- Chat list caching

### Database
- Indexed fields (phoneNumber, username, etc.)
- Pagination on all list endpoints
- Aggregation pipelines for complex queries

### Real-time
- Socket.IO room-based broadcasting
- Efficient event handling
- Connection pooling

### File Storage
- CloudFront CDN for media delivery
- BlurHash for instant image placeholders
- Responsive image URLs (multiple sizes)

---

## 🐛 Error Handling

### Error Response Format
```json
{
  "success": false,
  "error": {
    "message": "Error message",
    "code": "ERROR_CODE",
    "status": 400
  }
}
```

### Common Error Codes
- `UNAUTHORIZED` - Authentication required
- `FORBIDDEN` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `VALIDATION_ERROR` - Invalid input
- `RATE_LIMIT` - Too many requests
- `SERVER_ERROR` - Internal server error

---

## 📚 Additional Resources

- **API Documentation**: See `docs/dating-api.md` and Postman collections
- **Seed Scripts**: `src/seed.js` for test data
- **Optimization Docs**: See `*_OPTIMIZATION*.md` files
- **Notification Docs**: `scriptFiles/NOTIFICATION_DOCUMENTATION.txt`

---

## 🎓 Summary

This backend provides a complete social and dating platform with:
- ✅ Secure authentication (Phone OTP + JWT)
- ✅ Real-time chat and messaging
- ✅ Audio/Video calls with WebRTC
- ✅ Posts and Stories
- ✅ Follow/Unfollow system
- ✅ Dating features with matching
- ✅ Push notifications
- ✅ Admin panel
- ✅ Content moderation
- ✅ Scalable architecture

All features are production-ready with proper error handling, validation, and security measures.

---

**Last Updated**: 2024
**Version**: 2.0.0

