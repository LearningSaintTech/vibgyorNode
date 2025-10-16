# Posts API - Complete Documentation

## Table of Contents
1. [Overview](#overview)
2. [Features Summary](#features-summary)
3. [Authentication](#authentication)
4. [API Endpoints](#api-endpoints)
5. [Data Models](#data-models)
6. [Error Handling](#error-handling)
7. [Examples](#examples)

---

## Overview

The Posts API provides a complete social media posting system with features for content creation, engagement, discovery, and analytics. It supports images and videos with advanced features like location tagging, mentions, hashtags, and privacy controls.

### Base URL
```
/api/user/posts
```

### Key Features
- ✅ Create posts with text, images, and videos
- ✅ Like, comment, and share functionality
- ✅ Privacy controls (public, followers, close friends, private)
- ✅ Smart personalized feed algorithm
- ✅ Search and trending discovery
- ✅ Hashtag support with auto-extraction
- ✅ User mentions with position tracking
- ✅ Location tagging with GPS coordinates
- ✅ Real-time analytics and insights
- ✅ Content moderation and reporting
- ✅ Nested comments with likes
- ✅ View tracking

---

## Features Summary

### 1. Content Creation
**Create Rich Posts**
- Text content (up to 2200 characters)
- Caption (up to 500 characters)
- Multiple media files (images and videos)
- Auto-extracted hashtags from content
- Auto-extracted mentions from content

### 2. Media Support
**Supported Types:**
- 📸 **Images**: JPG, PNG, GIF, WEBP
- 🎥 **Videos**: MP4, MOV, AVI, WebM

**Features:**
- Multiple media per post
- Automatic thumbnail generation for videos
- AWS S3 storage with CDN delivery
- Dimension and duration tracking
- File size validation

### 3. Engagement Features
**Like System**
- Toggle likes (like/unlike)
- Like count tracking
- Notification to post author

**Comment System**
- Nested comments (reply to comments)
- Comment likes
- Edit tracking
- Comment count

**Share System**
- Multiple share types (repost, quote, external)
- Share messages
- Share count tracking

**View Tracking**
- Unique view counting
- View duration tracking
- Automatic view recording

### 4. Privacy Controls
**4 Privacy Levels:**
- **Public**: Visible to everyone
- **Followers**: Visible to followers only
- **Close Friends**: Visible to selected close friends
- **Private**: Visible to author only

### 5. Discovery Features
**Search & Discovery:**
- Full-text search (content, caption, hashtags)
- Trending posts (time-decay based algorithm)
- Hashtag exploration
- User post listings

**Smart Feed:**
- Personalized feed algorithm
- Engagement-based ranking
- Privacy-aware filtering
- Relationship prioritization

### 6. Location Features
**Location Tagging:**
- Location name and address
- GPS coordinates (latitude/longitude)
- Google Places integration
- Place type classification
- Accuracy levels
- Visibility control

### 7. Mention Features
**Advanced Mentions:**
- User tagging with @ syntax
- Position tracking (start/end indices)
- Context awareness (content, caption, comment)
- Notification system
- Multiple mentions per post

### 8. Analytics
**Post Analytics:**
- Likes, comments, shares count
- View count and duration
- Engagement rate calculation
- Reach and impressions
- Last engagement timestamp

### 9. Content Moderation
**Reporting System:**
- Report categories (spam, inappropriate, harassment, etc.)
- Report descriptions
- Automatic flagging
- Moderation records

---

## Authentication

All endpoints require JWT authentication. Include your token in the Authorization header:

```http
Authorization: Bearer <your-jwt-token>
```

The token should contain:
- `userId` - The authenticated user's ID
- `role` - User role (typically 'USER')
- Expiration timestamp

---

## API Endpoints

### Post CRUD Operations

#### 1. Create Post

**Endpoint:** `POST /api/user/posts`

**Description:** Create a new post with text and/or media.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Request Body (multipart/form-data):**
```
content: "Check out this amazing view! #travel #adventure"
caption: "Captured at sunset"
hashtags: ["travel", "adventure"]
mentions: ["userId1", "userId2"]
privacy: "public"
location: {
  "name": "Eiffel Tower",
  "coordinates": { "lat": 48.8584, "lng": 2.2945 },
  "address": "Paris, France",
  "placeId": "ChIJLU7jZClu5kcR4PcOOO6p3I0",
  "placeType": "point_of_interest",
  "accuracy": "exact",
  "isVisible": true
}
files: [image1.jpg, image2.jpg, video1.mp4]
```

**Privacy Options:**
- `public` - Everyone can see
- `followers` - Only followers can see
- `close_friends` - Only close friends can see
- `private` - Only you can see

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Post created successfully",
  "data": {
    "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
    "author": {
      "_id": "userId123",
      "username": "johndoe",
      "fullName": "John Doe",
      "profilePictureUrl": "https://...",
      "isVerified": true
    },
    "content": "Check out this amazing view! #travel #adventure",
    "caption": "Captured at sunset",
    "media": [
      {
        "type": "image",
        "url": "https://s3.amazonaws.com/.../image1.jpg",
        "thumbnail": null,
        "filename": "image1.jpg",
        "fileSize": 1024000,
        "mimeType": "image/jpeg",
        "dimensions": {
          "width": 1920,
          "height": 1080
        },
        "s3Key": "posts/userId123/1234567890-uuid.jpg"
      }
    ],
    "hashtags": ["travel", "adventure"],
    "mentions": ["userId1", "userId2"],
    "location": {
      "name": "Eiffel Tower",
      "coordinates": { "lat": 48.8584, "lng": 2.2945 },
      "address": "Paris, France",
      "placeId": "ChIJLU7jZClu5kcR4PcOOO6p3I0",
      "placeType": "point_of_interest",
      "accuracy": "exact",
      "isVisible": true
    },
    "privacy": "public",
    "status": "published",
    "likes": [],
    "comments": [],
    "shares": [],
    "views": [],
    "likesCount": 0,
    "commentsCount": 0,
    "sharesCount": 0,
    "viewsCount": 0,
    "analytics": {
      "reach": 0,
      "impressions": 0,
      "engagement": 0,
      "lastAnalyzed": "2024-01-15T10:30:00Z"
    },
    "publishedAt": "2024-01-15T10:30:00Z",
    "lastEngagementAt": "2024-01-15T10:30:00Z",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z",
    "engagementRate": "0.00",
    "timeAgo": "5m"
  }
}
```

**Validation Rules:**
- At least one of content or media is required
- Content max length: 2200 characters
- Caption max length: 500 characters
- Privacy must be one of: public, followers, close_friends, private
- Media types: only images and videos allowed

---

#### 2. Get Feed Posts

**Endpoint:** `GET /api/user/posts/feed?page=1&limit=20`

**Description:** Get personalized feed posts using smart algorithm.

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Posts per page (default: 20, max: 100)

**Algorithm Features:**
- Personalized based on user interests
- Prioritizes followed users and close friends
- Engagement-based ranking
- Time-decay factor for freshness
- Privacy-aware filtering

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Feed posts retrieved successfully",
  "data": {
    "posts": [
      {
        "_id": "postId1",
        "author": { /* author details */ },
        "content": "...",
        "media": [ /* media array */ ],
        "likesCount": 42,
        "commentsCount": 15,
        "sharesCount": 8,
        "viewsCount": 500,
        "engagementRate": "13.00",
        "publishedAt": "2024-01-15T10:00:00Z"
      }
      // ... more posts
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 25,
      "totalPosts": 500,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

---

#### 3. Get Single Post

**Endpoint:** `GET /api/user/posts/:postId`

**Description:** Get detailed information about a specific post.

**Features:**
- Automatically tracks view (if not author)
- Privacy validation
- Populated author and engagement data

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Post retrieved successfully",
  "data": {
    "_id": "postId",
    "author": {
      "_id": "userId",
      "username": "johndoe",
      "fullName": "John Doe",
      "profilePictureUrl": "https://...",
      "isVerified": true
    },
    "content": "Amazing sunset today! #nature #photography",
    "caption": "Nature's beauty",
    "media": [ /* media array */ ],
    "hashtags": ["nature", "photography"],
    "mentions": [ /* mentions array */ ],
    "location": { /* location object */ },
    "privacy": "public",
    "status": "published",
    "likes": [ /* likes array */ ],
    "comments": [ /* comments array */ ],
    "shares": [ /* shares array */ ],
    "views": [ /* views array */ ],
    "likesCount": 150,
    "commentsCount": 45,
    "sharesCount": 20,
    "viewsCount": 1500,
    "engagementRate": "14.33",
    "publishedAt": "2024-01-15T08:00:00Z",
    "lastEngagementAt": "2024-01-15T10:30:00Z",
    "timeAgo": "2h"
  }
}
```

**Error (403 Forbidden):**
```json
{
  "success": false,
  "message": "You cannot view this post",
  "statusCode": 403
}
```

---

#### 4. Get User Posts

**Endpoint:** `GET /api/user/posts/user/:userId?page=1&limit=20&status=published`

**Description:** Get all posts by a specific user.

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Posts per page (default: 20)
- `status` - Filter by status: published, draft, archived (default: published)

**Special Behavior:**
- When viewing your own posts, shows all statuses except 'deleted'
- When viewing others' posts, only shows published posts

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Posts retrieved successfully",
  "data": {
    "posts": [ /* array of posts */ ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalPosts": 100,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

---

#### 5. Update Post

**Endpoint:** `PUT /api/user/posts/:postId`

**Description:** Update an existing post (author only).

**Request Body:**
```json
{
  "content": "Updated content with #newtag",
  "caption": "Updated caption",
  "hashtags": ["newtag", "updated"],
  "mentions": ["newUserId"],
  "location": { /* new location */ },
  "privacy": "followers"
}
```

**Authorization:**
- Only the post author can update

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Post updated successfully",
  "data": {
    /* updated post object */
  }
}
```

**Error (403 Forbidden):**
```json
{
  "success": false,
  "message": "You can only edit your own posts",
  "statusCode": 403
}
```

---

#### 6. Delete Post

**Endpoint:** `DELETE /api/user/posts/:postId`

**Description:** Soft delete a post (author only).

**Features:**
- Soft deletion (status changed to 'deleted')
- Media files automatically removed from S3
- Post remains in database for analytics

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Post deleted successfully",
  "data": null
}
```

---

### Engagement Operations

#### 7. Like/Unlike Post

**Endpoint:** `POST /api/user/posts/:postId/like`

**Description:** Toggle like on a post (like if not liked, unlike if already liked).

**Features:**
- Automatic toggle behavior
- Updates engagement metrics
- Sends notification to post author (on like)
- Updates last engagement timestamp

**Response (200 OK) - Liked:**
```json
{
  "success": true,
  "message": "Post liked",
  "data": {
    "liked": true,
    "likesCount": 151
  }
}
```

**Response (200 OK) - Unliked:**
```json
{
  "success": true,
  "message": "Post unliked",
  "data": {
    "liked": false,
    "likesCount": 150
  }
}
```

---

#### 8. Add Comment

**Endpoint:** `POST /api/user/posts/:postId/comment`

**Description:** Add a comment to a post (supports nested comments).

**Request Body:**
```json
{
  "content": "Great post! Love the view 😍",
  "parentCommentId": null
}
```

**For Nested Comments (Replies):**
```json
{
  "content": "Thanks for the comment!",
  "parentCommentId": "commentId123"
}
```

**Features:**
- Nested comments (replies to comments)
- Comment likes support
- Edit tracking
- Notification to post author

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Comment added successfully",
  "data": {
    "comment": {
      "_id": "commentId",
      "user": {
        "_id": "userId",
        "username": "janedoe",
        "fullName": "Jane Doe",
        "profilePictureUrl": "https://..."
      },
      "content": "Great post! Love the view 😍",
      "parentComment": null,
      "likes": [],
      "isEdited": false,
      "editedAt": null,
      "createdAt": "2024-01-15T10:35:00Z"
    },
    "commentsCount": 46
  }
}
```

**Validation:**
- Content is required
- Content max length: 500 characters

---

#### 9. Get Post Comments

**Endpoint:** `GET /api/user/posts/:postId/comments?page=1&limit=20`

**Description:** Get all comments for a post with pagination.

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Comments per page (default: 20)

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Comments retrieved successfully",
  "data": {
    "comments": [
      {
        "_id": "commentId",
        "user": {
          "username": "janedoe",
          "fullName": "Jane Doe",
          "profilePictureUrl": "https://..."
        },
        "content": "Great post!",
        "parentComment": null,
        "likes": [
          {
            "user": "userId2",
            "likedAt": "2024-01-15T10:40:00Z"
          }
        ],
        "isEdited": false,
        "createdAt": "2024-01-15T10:35:00Z"
      }
      // ... more comments
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalComments": 50,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

---

#### 10. Share Post

**Endpoint:** `POST /api/user/posts/:postId/share`

**Description:** Share a post with optional message.

**Request Body:**
```json
{
  "shareType": "repost",
  "shareMessage": "Check this out!"
}
```

**Share Types:**
- `repost` - Simple repost
- `quote` - Quote repost with message
- `external` - Share to external platform

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Post shared successfully",
  "data": {
    "sharesCount": 21
  }
}
```

---

### Discovery Operations

#### 11. Search Posts

**Endpoint:** `GET /api/user/posts/search?q=travel&page=1&limit=20`

**Description:** Search posts by content, caption, or hashtags.

**Query Parameters:**
- `q` - Search query (required)
- `page` - Page number (default: 1)
- `limit` - Results per page (default: 20)

**Search Behavior:**
- Searches in content, caption, and hashtags
- Case-insensitive
- Only searches public posts
- Sorted by relevance and recency

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Search results retrieved successfully",
  "data": {
    "posts": [ /* matching posts */ ],
    "query": "travel",
    "pagination": {
      "currentPage": 1,
      "totalPages": 10,
      "totalPosts": 200,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

---

#### 12. Get Trending Posts

**Endpoint:** `GET /api/user/posts/trending?hours=24&limit=20`

**Description:** Get trending posts based on recent engagement.

**Query Parameters:**
- `hours` - Time window for trending (default: 24)
- `limit` - Number of posts (default: 20)

**Trending Algorithm:**
- Engagement velocity (likes, comments, shares per hour)
- Time decay factor
- View count consideration
- Viral coefficient calculation

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Trending posts retrieved successfully",
  "data": {
    "posts": [ /* trending posts */ ],
    "timeWindow": "24 hours"
  }
}
```

---

#### 13. Get Posts by Hashtag

**Endpoint:** `GET /api/user/posts/hashtag/:hashtag?page=1&limit=20`

**Description:** Get all public posts containing a specific hashtag.

**Example:** `GET /api/user/posts/hashtag/travel?page=1&limit=20`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Hashtag posts retrieved successfully",
  "data": {
    "posts": [ /* posts with #travel */ ],
    "hashtag": "travel",
    "pagination": {
      "currentPage": 1,
      "totalPages": 15,
      "totalPosts": 300,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

---

### Analytics & Moderation

#### 14. Get Post Analytics

**Endpoint:** `GET /api/user/posts/:postId/analytics`

**Description:** Get detailed analytics for a post (author only).

**Authorization:**
- Only the post author can view analytics

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Post analytics retrieved successfully",
  "data": {
    "likes": 150,
    "comments": 45,
    "shares": 20,
    "views": 1500,
    "engagementRate": 14.33,
    "reach": 2000,
    "impressions": 3000,
    "publishedAt": "2024-01-15T08:00:00Z",
    "lastEngagementAt": "2024-01-15T10:30:00Z"
  }
}
```

**Metrics Explained:**
- `likes` - Total number of likes
- `comments` - Total number of comments
- `shares` - Total number of shares
- `views` - Total unique views
- `engagementRate` - ((likes + comments + shares) / views) × 100
- `reach` - Estimated unique users reached
- `impressions` - Total content impressions

---

#### 15. Report Post

**Endpoint:** `POST /api/user/posts/:postId/report`

**Description:** Report a post for content moderation.

**Request Body:**
```json
{
  "reason": "spam",
  "description": "This post contains spam content"
}
```

**Report Reasons:**
- `spam` - Unwanted promotional content
- `inappropriate` - Offensive or unsuitable content
- `harassment` - Bullying or harassment
- `fake_news` - Misinformation
- `violence` - Violent or graphic content
- `other` - Other violations

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Post reported successfully",
  "data": null
}
```

**Error (400 Bad Request):**
```json
{
  "success": false,
  "message": "You have already reported this post",
  "statusCode": 400
}
```

---

### Advanced Features

#### 16. Update Location

**Endpoint:** `PUT /api/user/posts/:postId/location`

**Description:** Add or update location information for a post (author only).

**Request Body:**
```json
{
  "location": {
    "name": "Central Park",
    "coordinates": {
      "lat": 40.7829,
      "lng": -73.9654
    },
    "address": "New York, NY 10024, USA",
    "placeId": "ChIJ4zGFAZpYwokRGUGph3Mf37k",
    "placeType": "park",
    "accuracy": "exact",
    "isVisible": true
  }
}
```

**Location Fields:**
- `name` - Location name (string)
- `coordinates` - GPS coordinates (object with lat/lng)
- `address` - Full address (string)
- `placeId` - Google Places ID (string)
- `placeType` - Type of place (enum: park, restaurant, etc.)
- `accuracy` - Location accuracy (exact, approximate, city, region, country)
- `isVisible` - Whether location is visible to others (boolean)

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Location updated successfully",
  "data": {
    "location": {
      "name": "Central Park",
      "coordinates": { "lat": 40.7829, "lng": -73.9654 },
      "address": "New York, NY 10024, USA",
      "placeId": "ChIJ4zGFAZpYwokRGUGph3Mf37k",
      "placeType": "park",
      "accuracy": "exact",
      "isVisible": true
    }
  }
}
```

---

#### 17. Add Mention

**Endpoint:** `POST /api/user/posts/:postId/mentions`

**Description:** Add a user mention with position tracking.

**Request Body:**
```json
{
  "userId": "mentionedUserId",
  "start": 0,
  "end": 10,
  "context": "content"
}
```

**Context Options:**
- `content` - Mention in post content
- `caption` - Mention in caption
- `comment` - Mention in comment

**Features:**
- Position tracking for precise mention location
- Context awareness
- Notification to mentioned user
- Duplicate prevention

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Mention added successfully",
  "data": {
    "mentions": [
      {
        "user": "mentionedUserId",
        "position": { "start": 0, "end": 10 },
        "context": "content",
        "notified": false,
        "notificationSentAt": null
      }
    ]
  }
}
```

---

## Data Models

### Post Model

```javascript
{
  // Basic Information
  _id: ObjectId,
  author: ObjectId (ref: 'User'),
  content: String (max: 2200 chars),
  caption: String (max: 500 chars),
  
  // Media
  media: [{
    type: String ('image' | 'video'),
    url: String,
    thumbnail: String (for videos),
    filename: String,
    fileSize: Number,
    mimeType: String,
    duration: Number (for videos, in seconds),
    dimensions: {
      width: Number,
      height: Number
    },
    s3Key: String
  }],
  
  // Engagement
  likes: [{
    user: ObjectId (ref: 'User'),
    likedAt: Date
  }],
  comments: [{
    user: ObjectId (ref: 'User'),
    content: String (max: 500 chars),
    parentComment: ObjectId (ref: 'Comment'),
    likes: [{
      user: ObjectId,
      likedAt: Date
    }],
    isEdited: Boolean,
    editedAt: Date,
    createdAt: Date
  }],
  shares: [{
    user: ObjectId (ref: 'User'),
    sharedAt: Date,
    shareType: String ('repost' | 'quote' | 'external'),
    shareMessage: String (max: 200 chars)
  }],
  views: [{
    user: ObjectId (ref: 'User'),
    viewedAt: Date,
    viewDuration: Number (in seconds)
  }],
  
  // Metadata
  hashtags: [String] (lowercase),
  mentions: [{
    user: ObjectId (ref: 'User'),
    position: {
      start: Number,
      end: Number
    },
    context: String ('content' | 'caption' | 'comment'),
    notified: Boolean,
    notificationSentAt: Date
  }],
  
  // Privacy
  privacy: String ('public' | 'followers' | 'close_friends' | 'private'),
  closeFriends: [ObjectId] (ref: 'User'),
  
  // Status
  status: String ('draft' | 'published' | 'archived' | 'deleted'),
  
  // Location
  location: {
    name: String,
    coordinates: {
      lat: Number,
      lng: Number
    },
    address: String,
    placeId: String,
    placeType: String,
    accuracy: String ('exact' | 'approximate' | 'city' | 'region' | 'country'),
    isVisible: Boolean
  },
  
  // Counts (for performance)
  likesCount: Number,
  commentsCount: Number,
  sharesCount: Number,
  viewsCount: Number,
  
  // Moderation
  isReported: Boolean,
  reports: [{
    user: ObjectId (ref: 'User'),
    reason: String ('spam' | 'inappropriate' | 'harassment' | 'fake_news' | 'violence' | 'other'),
    description: String (max: 500 chars),
    reportedAt: Date
  }],
  
  // Analytics
  analytics: {
    reach: Number,
    impressions: Number,
    engagement: Number,
    lastAnalyzed: Date
  },
  
  // Timestamps
  publishedAt: Date,
  lastEngagementAt: Date,
  createdAt: Date,
  updatedAt: Date,
  
  // Virtuals
  engagementRate: Number (calculated),
  timeAgo: String (calculated)
}
```

### Database Indexes

```javascript
// Performance indexes
{ author: 1, publishedAt: -1 }
{ status: 1, publishedAt: -1 }
{ hashtags: 1 }
{ mentions: 1 }
{ 'likes.user': 1 }
{ 'comments.user': 1 }
{ privacy: 1, publishedAt: -1 }
{ isReported: 1 }
```

---

## Error Handling

### Standard Error Response Format

```json
{
  "success": false,
  "message": "User-friendly error message",
  "statusCode": 400
}
```

### HTTP Status Codes

| Code | Meaning | When Used |
|------|---------|-----------|
| 200 | OK | Successful request |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Validation error, missing required fields |
| 401 | Unauthorized | Authentication token missing or invalid |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 500 | Internal Server Error | Server-side error |

### Common Errors

#### 400 Bad Request
```json
{
  "success": false,
  "message": "Post content or media is required",
  "statusCode": 400
}
```

**Causes:**
- Missing required fields
- Validation failures
- Invalid data format
- Character limit exceeded
- Invalid media type

#### 401 Unauthorized
```json
{
  "success": false,
  "message": "Authentication required",
  "statusCode": 401
}
```

**Causes:**
- Missing Authorization header
- Invalid JWT token
- Expired token

#### 403 Forbidden
```json
{
  "success": false,
  "message": "You can only edit your own posts",
  "statusCode": 403
}
```

**Causes:**
- Trying to edit/delete someone else's post
- Viewing private post without permission
- Insufficient permissions

#### 404 Not Found
```json
{
  "success": false,
  "message": "Post not found",
  "statusCode": 404
}
```

**Causes:**
- Invalid post ID
- Post has been deleted
- Post doesn't exist

---

## Examples

### Example 1: Create a Simple Text Post

**Request:**
```bash
curl -X POST https://api.vibgyor.com/api/user/posts \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Hello, World! This is my first post #firstpost #hello",
    "privacy": "public"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Post created successfully",
  "data": {
    "_id": "postId123",
    "author": { /* author details */ },
    "content": "Hello, World! This is my first post #firstpost #hello",
    "hashtags": ["firstpost", "hello"],
    "privacy": "public",
    "status": "published",
    "likesCount": 0,
    "commentsCount": 0
  }
}
```

---

### Example 2: Create Post with Media

**Request (using FormData in JavaScript):**
```javascript
const formData = new FormData();
formData.append('content', 'Beautiful sunset 🌅 #sunset #nature');
formData.append('caption', 'Captured this evening');
formData.append('privacy', 'public');
formData.append('files', imageFile1);
formData.append('files', imageFile2);

const response = await fetch('https://api.vibgyor.com/api/user/posts', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

**Response:**
```json
{
  "success": true,
  "message": "Post created successfully",
  "data": {
    "_id": "postId456",
    "content": "Beautiful sunset 🌅 #sunset #nature",
    "caption": "Captured this evening",
    "media": [
      {
        "type": "image",
        "url": "https://s3.amazonaws.com/.../image1.jpg",
        "fileSize": 2048000,
        "dimensions": { "width": 1920, "height": 1080 }
      },
      {
        "type": "image",
        "url": "https://s3.amazonaws.com/.../image2.jpg",
        "fileSize": 1536000,
        "dimensions": { "width": 1080, "height": 1080 }
      }
    ],
    "hashtags": ["sunset", "nature"]
  }
}
```

---

### Example 3: Create Post with Location

**Request:**
```javascript
const postData = {
  content: "Amazing coffee at this place! ☕ #coffee #cafe",
  privacy: "public",
  location: {
    name: "Starbucks Reserve",
    coordinates: { lat: 40.7589, lng: -73.9851 },
    address: "Times Square, New York, NY",
    placeId: "ChIJmQJIxlVYwokRLgeuocVOGVU",
    placeType: "establishment",
    accuracy: "exact",
    isVisible: true
  }
};

const response = await fetch('https://api.vibgyor.com/api/user/posts', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(postData)
});
```

---

### Example 4: Like a Post

**Request:**
```javascript
const response = await fetch('https://api.vibgyor.com/api/user/posts/postId123/like', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

**Response:**
```json
{
  "success": true,
  "message": "Post liked",
  "data": {
    "liked": true,
    "likesCount": 43
  }
}
```

---

### Example 5: Add a Comment

**Request:**
```javascript
const commentData = {
  content: "This is amazing! Where did you take this photo?",
  parentCommentId: null
};

const response = await fetch('https://api.vibgyor.com/api/user/posts/postId123/comment', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(commentData)
});
```

---

### Example 6: Reply to a Comment

**Request:**
```javascript
const replyData = {
  content: "Thanks! I took it at Central Park 📸",
  parentCommentId: "commentId456"
};

const response = await fetch('https://api.vibgyor.com/api/user/posts/postId123/comment', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(replyData)
});
```

---

### Example 7: Search Posts

**Request:**
```javascript
const searchQuery = 'travel photography';
const response = await fetch(
  `https://api.vibgyor.com/api/user/posts/search?q=${encodeURIComponent(searchQuery)}&page=1&limit=20`,
  {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);
```

---

### Example 8: Get Trending Posts

**Request:**
```javascript
const response = await fetch(
  'https://api.vibgyor.com/api/user/posts/trending?hours=24&limit=20',
  {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);
```

---

### Example 9: Share a Post

**Request:**
```javascript
const shareData = {
  shareType: "quote",
  shareMessage: "This is so inspiring! 🙌"
};

const response = await fetch('https://api.vibgyor.com/api/user/posts/postId123/share', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(shareData)
});
```

---

### Example 10: Report a Post

**Request:**
```javascript
const reportData = {
  reason: "spam",
  description: "This post contains unsolicited promotional content"
};

const response = await fetch('https://api.vibgyor.com/api/user/posts/postId123/report', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(reportData)
});
```

---

## Complete API Reference Table

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| **POST** | `/posts` | Create post | ✅ |
| **GET** | `/posts/feed` | Get personalized feed | ✅ |
| **GET** | `/posts/search` | Search posts | ✅ |
| **GET** | `/posts/trending` | Get trending posts | ✅ |
| **GET** | `/posts/hashtag/:hashtag` | Get posts by hashtag | ✅ |
| **GET** | `/posts/:postId` | Get single post | ✅ |
| **PUT** | `/posts/:postId` | Update post | ✅ Author |
| **DELETE** | `/posts/:postId` | Delete post | ✅ Author |
| **GET** | `/posts/user/:userId` | Get user posts | ✅ |
| **POST** | `/posts/:postId/like` | Like/unlike post | ✅ |
| **POST** | `/posts/:postId/comment` | Add comment | ✅ |
| **GET** | `/posts/:postId/comments` | Get comments | ✅ |
| **POST** | `/posts/:postId/share` | Share post | ✅ |
| **GET** | `/posts/:postId/analytics` | Get analytics | ✅ Author |
| **POST** | `/posts/:postId/report` | Report post | ✅ |
| **PUT** | `/posts/:postId/location` | Update location | ✅ Author |
| **POST** | `/posts/:postId/mentions` | Add mention | ✅ |

**Total Endpoints:** 17

---

## Best Practices

### Content Guidelines

1. **Post Content**
   - Keep within 2200 character limit
   - Use hashtags strategically (3-5 recommended)
   - Tag relevant users with @username
   - Add locations for better discoverability

2. **Media**
   - Compress images before upload (recommended < 5MB)
   - Use appropriate video formats (MP4 recommended)
   - Optimize for mobile viewing
   - Consider data usage for users

3. **Privacy**
   - Choose appropriate privacy level
   - Review close friends list regularly
   - Use 'private' for drafts
   - Use 'close_friends' for personal content

### Performance Tips

1. **Pagination**
   - Use reasonable page limits (20-50 recommended)
   - Implement infinite scroll for better UX
   - Cache feed results locally

2. **Media Upload**
   - Upload in background
   - Show upload progress
   - Validate files client-side first
   - Handle upload failures gracefully

3. **Engagement**
   - Implement optimistic UI updates
   - Cache like/comment state
   - Debounce rapid actions

---

## Rate Limiting

**Current Limits** (if enabled):
- Standard users: 100 requests per minute
- Verified users: 200 requests per minute
- Rate limit headers included in responses

**Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1641024000
```

---

## Validation Rules

### Post Creation

| Field | Required | Max Length | Validation |
|-------|----------|------------|------------|
| content | Either content or media | 2200 chars | Text content |
| caption | No | 500 chars | Text content |
| media | Either content or media | N/A | Images/videos only |
| hashtags | No | N/A | Array of strings |
| mentions | No | N/A | Array of user IDs |
| privacy | No | N/A | Must be valid enum value |
| location | No | N/A | Valid location object |

### Comment Creation

| Field | Required | Max Length | Validation |
|-------|----------|------------|------------|
| content | Yes | 500 chars | Non-empty text |
| parentCommentId | No | N/A | Valid comment ID |

### Report Creation

| Field | Required | Max Length | Validation |
|-------|----------|------------|------------|
| reason | Yes | N/A | Valid reason enum |
| description | No | 500 chars | Text content |

---

## Privacy Matrix

| Privacy Level | Who Can See | In Feed | Searchable | Shareable |
|---------------|-------------|---------|------------|-----------|
| **Public** | Everyone | Yes | Yes | Yes |
| **Followers** | Followers only | Yes (followers) | No | Limited |
| **Close Friends** | Close friends | Yes (close friends) | No | No |
| **Private** | Author only | No | No | No |

---

## Integration Guide

### Frontend Integration

**1. Setup API Client**
```javascript
const API_BASE_URL = 'https://api.vibgyor.com/api/user';

const apiClient = {
  headers: {
    'Authorization': `Bearer ${getToken()}`,
    'Content-Type': 'application/json'
  }
};
```

**2. Create Post Function**
```javascript
async function createPost(content, mediaFiles, options = {}) {
  const formData = new FormData();
  formData.append('content', content);
  
  if (options.caption) formData.append('caption', options.caption);
  if (options.privacy) formData.append('privacy', options.privacy);
  if (options.location) formData.append('location', JSON.stringify(options.location));
  
  mediaFiles.forEach(file => {
    formData.append('files', file);
  });
  
  const response = await fetch(`${API_BASE_URL}/posts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getToken()}`
    },
    body: formData
  });
  
  return response.json();
}
```

**3. Get Feed Function**
```javascript
async function getFeed(page = 1, limit = 20) {
  const response = await fetch(
    `${API_BASE_URL}/posts/feed?page=${page}&limit=${limit}`,
    {
      headers: {
        'Authorization': `Bearer ${getToken()}`
      }
    }
  );
  
  return response.json();
}
```

**4. Like Post Function**
```javascript
async function toggleLike(postId) {
  const response = await fetch(
    `${API_BASE_URL}/posts/${postId}/like`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getToken()}`
      }
    }
  );
  
  return response.json();
}
```

---

## Testing with cURL

### Create Post
```bash
curl -X POST https://api.vibgyor.com/api/user/posts \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Test post #testing",
    "privacy": "public"
  }'
```

### Get Feed
```bash
curl -X GET "https://api.vibgyor.com/api/user/posts/feed?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Like Post
```bash
curl -X POST https://api.vibgyor.com/api/user/posts/POST_ID/like \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Add Comment
```bash
curl -X POST https://api.vibgyor.com/api/user/posts/POST_ID/comment \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Great post!"
  }'
```

### Search Posts
```bash
curl -X GET "https://api.vibgyor.com/api/user/posts/search?q=travel&page=1&limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Frequently Asked Questions

### Q: What media types are supported?
**A:** Only images (JPG, PNG, GIF, WEBP) and videos (MP4, MOV, AVI, WebM). Audio files and documents are not supported.

### Q: How many media files can I upload per post?
**A:** You can upload multiple media files. The exact limit depends on your file size constraints and server configuration.

### Q: Can I edit a post after publishing?
**A:** Yes, but only if you're the author. You can update content, caption, hashtags, mentions, location, and privacy.

### Q: How does the feed algorithm work?
**A:** The feed uses a smart algorithm that considers:
- Recency (recent posts ranked higher)
- Engagement (likes, comments, shares)
- Relationships (following, close friends)
- Content type (media vs text)
- User interests (based on hashtags)

### Q: Can I schedule posts?
**A:** No, post scheduling has been removed. Posts are published immediately upon creation.

### Q: How long are posts visible?
**A:** Posts remain visible indefinitely unless:
- You delete them (soft delete)
- You archive them
- They're removed by moderation

### Q: What happens when I delete a post?
**A:** Posts are soft-deleted (status changed to 'deleted'). The post remains in the database but is hidden from feeds and searches. Media files are automatically deleted from S3.

### Q: Can I see who viewed my post?
**A:** Analytics show total view count, but individual viewer details are only available to the post author through the analytics endpoint.

### Q: How do hashtags work?
**A:** Hashtags are automatically extracted from content (words starting with #). You can also explicitly provide hashtags. All hashtags are converted to lowercase for consistency.

### Q: What's the difference between mentions in content vs adding mentions via API?
**A:** Mentions in content (@username) are auto-extracted and linked to users. The add mention API allows more precise position tracking and context specification.

---

## Changelog

### Current Version: 1.0.0

**Features:**
- ✅ Posts CRUD operations
- ✅ Like, comment, share functionality
- ✅ Smart feed algorithm
- ✅ Search and discovery
- ✅ Trending posts
- ✅ Hashtag support
- ✅ User mentions
- ✅ Location tagging
- ✅ Privacy controls
- ✅ Analytics
- ✅ Content moderation
- ✅ Media support (images, videos)

**Removed Features:**
- ❌ Post scheduling
- ❌ Post collections (legacy)
- ❌ Post collaboration
- ❌ Interactive polls
- ❌ Post templates
- ❌ Audio/document media types

---

## Support & Resources

### Documentation
- API Base URL: `https://api.vibgyor.com/api/user/posts`
- Full Documentation: This file

### Getting Help
- **Technical Issues**: support@vibgyor.com
- **API Questions**: api-support@vibgyor.com
- **Bug Reports**: bugs@vibgyor.com

### Tools
- **Postman Collection**: Coming soon
- **API Playground**: Coming soon
- **Code Examples**: See Examples section above

---

**API Version:** 1.0.0  
**Last Updated:** January 2024  
**Status:** Production Ready ✅

---

© 2024 Vibgyor Technologies. All rights reserved.

