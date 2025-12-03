# Posts and Stories API Documentation

## Table of Contents
- [Base URL](#base-url)
- [Authentication](#authentication)
- [Posts API](#posts-api)
- [Stories API](#stories-api)
- [Error Handling](#error-handling)
- [Response Format](#response-format)

---

## Base URL

All endpoints are prefixed with `/user/posts` for posts and `/user/stories` for stories.

**Example:**
```
POST /user/posts
GET /user/stories/feed
```

---

## Authentication

All endpoints require authentication using a Bearer token in the Authorization header.

**Header:**
```
Authorization: Bearer <your_jwt_token>
```

**Example:**
```javascript
headers: {
  'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  'Content-Type': 'application/json'
}
```

---

## Posts API

### 1. Create Post

Create a new post with media files.

**Endpoint:** `POST /user/posts`

**Content-Type:** `multipart/form-data`

**Request Body (Form Data):**
- `content` (string, optional): Post content text (max 2200 characters)
- `caption` (string, optional): Post caption (max 500 characters)
- `hashtags` (array, optional): Array of hashtag strings (without #)
- `mentions` (array, optional): Array of user IDs to mention
- `location` (object, optional): Location object with:
  - `name` (string): Location name
  - `coordinates.lat` (number): Latitude
  - `coordinates.lng` (number): Longitude
  - `address` (string): Full address
  - `placeId` (string): Google Place ID
  - `placeType` (string): Type of place
  - `accuracy` (string): Location accuracy
  - `isVisible` (boolean): Whether location is visible
- `visibility` (string, required): Post visibility - `"public"`, `"followers"`, or `"private"`
- `commentVisibility` (string, optional): Comment visibility - `"everyone"`, `"followers"`, or `"none"` (default: `"everyone"`)
- `files` (file[], required): Media files (images or videos)

**Note:** At least one media file is required.

**Example Request (JavaScript/Fetch):**
```javascript
const formData = new FormData();
formData.append('content', 'Check out this amazing sunset! 🌅');
formData.append('caption', 'Beautiful evening');
formData.append('visibility', 'public');
formData.append('commentVisibility', 'everyone');
formData.append('location', JSON.stringify({
  name: 'Beach Park',
  coordinates: { lat: 40.7128, lng: -74.0060 },
  address: '123 Beach St, City, State',
  isVisible: true
}));
formData.append('files', fileInput.files[0]);
formData.append('files', fileInput.files[1]); // Multiple files supported

fetch('/user/posts', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: formData
})
.then(res => res.json())
.then(data => console.log(data));
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Post created successfully",
  "data": {
    "_id": "post_id",
    "author": {
      "_id": "user_id",
      "username": "johndoe",
      "fullName": "John Doe",
      "profilePictureUrl": "https://...",
      "isVerified": false
    },
    "content": "Check out this amazing sunset! 🌅",
    "caption": "Beautiful evening",
    "media": {
      "images": [
        {
          "url": "https://s3.amazonaws.com/...",
          "thumbnail": "https://s3.amazonaws.com/...",
          "dimensions": { "width": 1920, "height": 1080 }
        }
      ],
      "videos": [],
      "totalCount": 1,
      "hasImages": true,
      "hasVideos": false
    },
    "hashtags": ["sunset", "beach"],
    "mentions": [],
    "location": {
      "name": "Beach Park",
      "coordinates": { "lat": 40.7128, "lng": -74.0060 },
      "address": "123 Beach St, City, State",
      "isVisible": true
    },
    "visibility": "public",
    "commentVisibility": "everyone",
    "likesCount": 0,
    "commentsCount": 0,
    "sharesCount": 0,
    "viewsCount": 0,
    "status": "published",
    "publishedAt": "2025-01-20T10:00:00.000Z",
    "createdAt": "2025-01-20T10:00:00.000Z"
  }
}
```

**Error Responses:**
- `400`: Bad Request (missing media, invalid visibility, content too long)
- `401`: Unauthorized (invalid/missing token)
- `500`: Server Error

---

### 2. Get Feed Posts

Get personalized feed posts for the authenticated user.

**Endpoint:** `GET /user/posts/feed`

**Query Parameters:**
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 20)

**Example Request:**
```javascript
fetch('/user/posts/feed?page=1&limit=20', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN'
  }
})
.then(res => res.json())
.then(data => console.log(data));
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Feed posts retrieved successfully",
  "data": {
    "posts": [
      {
        "_id": "post_id",
        "author": { ... },
        "content": "Post content",
        "media": { ... },
        "likesCount": 42,
        "commentsCount": 5,
        "lastComment": {
          "_id": "comment_id",
          "user": { ... },
          "content": "Great post!",
          "createdAt": "2025-01-20T10:00:00.000Z"
        },
        "publishedAt": "2025-01-20T10:00:00.000Z"
      }
    ],
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

### 3. Get User Posts

Get posts from a specific user.

**Endpoint:** `GET /user/posts/user/:userId`

**URL Parameters:**
- `userId` (string, required): User ID

**Query Parameters:**
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 20)
- `status` (string, optional): Post status filter (default: 'published')

**Example Request:**
```javascript
fetch('/user/posts/user/USER_ID?page=1&limit=20', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN'
  }
})
.then(res => res.json())
.then(data => console.log(data));
```

**Success Response:** Same structure as feed posts

---

### 4. Get Current User Posts

Get posts from the authenticated user.

**Endpoint:** `GET /user/posts/me`

**Query Parameters:**
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 20)

**Example Request:**
```javascript
fetch('/user/posts/me?page=1&limit=20', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN'
  }
})
.then(res => res.json())
.then(data => console.log(data));
```

---

### 5. Get Single Post

Get a single post by ID.

**Endpoint:** `GET /user/posts/:postId`

**URL Parameters:**
- `postId` (string, required): Post ID

**Example Request:**
```javascript
fetch('/user/posts/POST_ID', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN'
  }
})
.then(res => res.json())
.then(data => console.log(data));
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Post retrieved successfully",
  "data": {
    "_id": "post_id",
    "author": { ... },
    "content": "Post content",
    "media": { ... },
    "likesCount": 42,
    "commentsCount": 5,
    "lastComment": { ... },
    "publishedAt": "2025-01-20T10:00:00.000Z"
  }
}
```

**Error Responses:**
- `403`: Forbidden (trying to view followers-only post without following)
- `404`: Not Found

---

### 6. Update Post

Update an existing post (only by author).

**Endpoint:** `PUT /user/posts/:postId`

**URL Parameters:**
- `postId` (string, required): Post ID

**Request Body (JSON):**
```json
{
  "content": "Updated content",
  "caption": "Updated caption",
  "visibility": "public",
  "commentVisibility": "everyone",
  "location": {
    "name": "New Location",
    "coordinates": { "lat": 40.7128, "lng": -74.0060 }
  }
}
```

**Example Request:**
```javascript
fetch('/user/posts/POST_ID', {
  method: 'PUT',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    content: 'Updated content',
    visibility: 'public'
  })
})
.then(res => res.json())
.then(data => console.log(data));
```

**Success Response:** Same structure as create post

**Error Responses:**
- `403`: Forbidden (not the post author)
- `404`: Not Found

---

### 7. Delete Post

Delete a post (only by author).

**Endpoint:** `DELETE /user/posts/:postId`

**URL Parameters:**
- `postId` (string, required): Post ID

**Example Request:**
```javascript
fetch('/user/posts/POST_ID', {
  method: 'DELETE',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN'
  }
})
.then(res => res.json())
.then(data => console.log(data));
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Post deleted successfully",
  "data": null
}
```

---

### 8. Like/Unlike Post

Toggle like status on a post.

**Endpoint:** `POST /user/posts/:postId/like`

**URL Parameters:**
- `postId` (string, required): Post ID

**Example Request:**
```javascript
fetch('/user/posts/POST_ID/like', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN'
  }
})
.then(res => res.json())
.then(data => console.log(data));
```

**Success Response (200):**
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

### 9. Get Post Likes

Get list of users who liked a post.

**Endpoint:** `GET /user/posts/:postId/likes`

**URL Parameters:**
- `postId` (string, required): Post ID

**Query Parameters:**
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 20)

**Example Request:**
```javascript
fetch('/user/posts/POST_ID/likes?page=1&limit=20', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN'
  }
})
.then(res => res.json())
.then(data => console.log(data));
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Post likes retrieved successfully",
  "data": {
    "likes": [
      {
        "userId": "user_id",
        "username": "johndoe",
        "fullName": "John Doe",
        "profilePictureUrl": "https://...",
        "isVerified": false,
        "likedAt": "2025-01-20T10:00:00.000Z",
        "likedAgo": "2h",
        "followStatus": "following",
        "isFollowing": true,
        "isFollower": false
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalLikes": 42,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

---

### 10. Add Comment

Add a comment to a post.

**Endpoint:** `POST /user/posts/:postId/comment`

**URL Parameters:**
- `postId` (string, required): Post ID

**Request Body (JSON):**
```json
{
  "content": "This is a great post! 👍",
  "parentCommentId": "comment_id" // Optional: for nested comments
}
```

**Example Request:**
```javascript
fetch('/user/posts/POST_ID/comment', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    content: 'This is a great post! 👍'
  })
})
.then(res => res.json())
.then(data => console.log(data));
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Comment added successfully",
  "data": {
    "comment": {
      "_id": "comment_id",
      "user": {
        "_id": "user_id",
        "username": "johndoe",
        "fullName": "John Doe",
        "profilePictureUrl": "https://..."
      },
      "content": "This is a great post! 👍",
      "likes": [],
      "createdAt": "2025-01-20T10:00:00.000Z"
    },
    "commentsCount": 6
  }
}
```

**Error Responses:**
- `400`: Bad Request (empty content, content too long)
- `403`: Forbidden (comments disabled or not a follower)

---

### 11. Get Post Comments

Get comments for a post.

**Endpoint:** `GET /user/posts/:postId/comments`

**URL Parameters:**
- `postId` (string, required): Post ID

**Query Parameters:**
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 20)

**Example Request:**
```javascript
fetch('/user/posts/POST_ID/comments?page=1&limit=20', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN'
  }
})
.then(res => res.json())
.then(data => console.log(data));
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Comments retrieved successfully",
  "data": {
    "comments": [
      {
        "_id": "comment_id",
        "user": { ... },
        "content": "Great post!",
        "parentComment": null,
        "likes": [],
        "likesCount": 0,
        "isLiked": false,
        "createdAt": "2025-01-20T10:00:00.000Z",
        "commentedAgo": "2h",
        "updatedAt": "2025-01-20T10:00:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 2,
      "totalComments": 25,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

---

### 12. Like/Unlike Comment

Toggle like on a comment (only post owner can like comments).

**Endpoint:** `POST /user/posts/:postId/comments/:commentId/like`

**URL Parameters:**
- `postId` (string, required): Post ID
- `commentId` (string, required): Comment ID

**Example Request:**
```javascript
fetch('/user/posts/POST_ID/comments/COMMENT_ID/like', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN'
  }
})
.then(res => res.json())
.then(data => console.log(data));
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Comment liked",
  "data": {
    "liked": true,
    "likesCount": 5
  }
}
```

**Error Responses:**
- `403`: Forbidden (only post owner can like comments)

---

### 13. Delete Comment

Delete a comment (only post owner can delete comments).

**Endpoint:** `DELETE /user/posts/:postId/comments/:commentId`

**URL Parameters:**
- `postId` (string, required): Post ID
- `commentId` (string, required): Comment ID

**Example Request:**
```javascript
fetch('/user/posts/POST_ID/comments/COMMENT_ID', {
  method: 'DELETE',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN'
  }
})
.then(res => res.json())
.then(data => console.log(data));
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Comment deleted successfully",
  "data": {
    "commentsCount": 24
  }
}
```

---

### 14. Share Post

Share a post.

**Endpoint:** `POST /user/posts/:postId/share`

**URL Parameters:**
- `postId` (string, required): Post ID

**Request Body (JSON):**
```json
{
  "shareType": "repost", // Optional: "repost" or "share"
  "shareMessage": "Check this out!" // Optional
}
```

**Example Request:**
```javascript
fetch('/user/posts/POST_ID/share', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    shareType: 'repost',
    shareMessage: 'Check this out!'
  })
})
.then(res => res.json())
.then(data => console.log(data));
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Post shared successfully",
  "data": {
    "sharesCount": 10
  }
}
```

---

### 15. Search Posts

Search posts by query.

**Endpoint:** `GET /user/posts/search`

**Query Parameters:**
- `q` (string, required): Search query
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 20)

**Example Request:**
```javascript
fetch('/user/posts/search?q=vibgyor&page=1&limit=20', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN'
  }
})
.then(res => res.json())
.then(data => console.log(data));
```

**Success Response:** Same structure as feed posts with search query included

---

### 16. Get Trending Posts

Get trending posts.

**Endpoint:** `GET /user/posts/trending`

**Query Parameters:**
- `hours` (number, optional): Time window in hours (default: 24)
- `limit` (number, optional): Number of posts (default: 20)

**Example Request:**
```javascript
fetch('/user/posts/trending?hours=24&limit=20', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN'
  }
})
.then(res => res.json())
.then(data => console.log(data));
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Trending posts retrieved successfully",
  "data": {
    "posts": [ ... ],
    "timeWindow": "24 hours"
  }
}
```

---

### 17. Get Posts by Hashtag

Get posts filtered by hashtag.

**Endpoint:** `GET /user/posts/hashtag/:hashtag`

**URL Parameters:**
- `hashtag` (string, required): Hashtag (without #)

**Query Parameters:**
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 20)

**Example Request:**
```javascript
fetch('/user/posts/hashtag/sunset?page=1&limit=20', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN'
  }
})
.then(res => res.json())
.then(data => console.log(data));
```

**Success Response:** Same structure as feed posts with hashtag included

---

### 18. Get Post Analytics

Get analytics for a post (only by author).

**Endpoint:** `GET /user/posts/:postId/analytics`

**URL Parameters:**
- `postId` (string, required): Post ID

**Example Request:**
```javascript
fetch('/user/posts/POST_ID/analytics', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN'
  }
})
.then(res => res.json())
.then(data => console.log(data));
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Post analytics retrieved successfully",
  "data": {
    "likes": 42,
    "comments": 5,
    "shares": 10,
    "views": 150,
    "engagementRate": 0.38,
    "reach": 200,
    "impressions": 250,
    "publishedAt": "2025-01-20T10:00:00.000Z",
    "lastEngagementAt": "2025-01-20T12:00:00.000Z"
  }
}
```

**Error Responses:**
- `403`: Forbidden (not the post author)

---

### 19. Report Post

Report a post.

**Endpoint:** `POST /user/posts/:postId/report`

**URL Parameters:**
- `postId` (string, required): Post ID

**Request Body (JSON):**
```json
{
  "reason": "spam", // Required: "spam", "inappropriate", "harassment", "fake_news", "violence", "other"
  "description": "This post contains spam content" // Optional
}
```

**Example Request:**
```javascript
fetch('/user/posts/POST_ID/report', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    reason: 'spam',
    description: 'This post contains spam content'
  })
})
.then(res => res.json())
.then(data => console.log(data));
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Post reported successfully",
  "data": null
}
```

**Error Responses:**
- `400`: Bad Request (invalid reason, already reported)

---

### 20. Save Post

Save a post to bookmarks.

**Endpoint:** `POST /user/posts/:postId/save`

**URL Parameters:**
- `postId` (string, required): Post ID

**Example Request:**
```javascript
fetch('/user/posts/POST_ID/save', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN'
  }
})
.then(res => res.json())
.then(data => console.log(data));
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Post saved",
  "data": {
    "saved": true
  }
}
```

---

### 21. Unsave Post

Remove a post from bookmarks.

**Endpoint:** `DELETE /user/posts/:postId/save`

**URL Parameters:**
- `postId` (string, required): Post ID

**Example Request:**
```javascript
fetch('/user/posts/POST_ID/save', {
  method: 'DELETE',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN'
  }
})
.then(res => res.json())
.then(data => console.log(data));
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Post unsaved",
  "data": {
    "saved": false
  }
}
```

---

### 22. Get Saved Posts

Get all saved posts.

**Endpoint:** `GET /user/posts/saved`

**Query Parameters:**
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 20)

**Example Request:**
```javascript
fetch('/user/posts/saved?page=1&limit=20', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN'
  }
})
.then(res => res.json())
.then(data => console.log(data));
```

**Success Response:** Same structure as feed posts

---

### 23. Archive Post

Archive a post (only by author).

**Endpoint:** `PUT /user/posts/:postId/archive`

**URL Parameters:**
- `postId` (string, required): Post ID

**Example Request:**
```javascript
fetch('/user/posts/POST_ID/archive', {
  method: 'PUT',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN'
  }
})
.then(res => res.json())
.then(data => console.log(data));
```

**Success Response:** Same structure as create post

---

### 24. Unarchive Post

Unarchive a post (only by author).

**Endpoint:** `PUT /user/posts/:postId/unarchive`

**URL Parameters:**
- `postId` (string, required): Post ID

**Example Request:**
```javascript
fetch('/user/posts/POST_ID/unarchive', {
  method: 'PUT',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN'
  }
})
.then(res => res.json())
.then(data => console.log(data));
```

**Success Response:** Same structure as create post

---

### 25. Get Archived Posts

Get all archived posts (only by author).

**Endpoint:** `GET /user/posts/archived`

**Query Parameters:**
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 20)

**Example Request:**
```javascript
fetch('/user/posts/archived?page=1&limit=20', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN'
  }
})
.then(res => res.json())
.then(data => console.log(data));
```

**Success Response:** Same structure as feed posts

---

### 26. Update Post Location

Update location tag on a post (only by author).

**Endpoint:** `PUT /user/posts/:postId/location`

**URL Parameters:**
- `postId` (string, required): Post ID

**Request Body (JSON):**
```json
{
  "location": {
    "name": "New Location",
    "coordinates": { "lat": 40.7128, "lng": -74.0060 },
    "address": "123 Street, City",
    "isVisible": true
  }
}
```

**Example Request:**
```javascript
fetch('/user/posts/POST_ID/location', {
  method: 'PUT',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    location: {
      name: 'New Location',
      coordinates: { lat: 40.7128, lng: -74.0060 }
    }
  })
})
.then(res => res.json())
.then(data => console.log(data));
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Location updated successfully",
  "data": {
    "location": { ... }
  }
}
```

---

### 27. Add Mention to Post

Add a mention to a post.

**Endpoint:** `POST /user/posts/:postId/mentions`

**URL Parameters:**
- `postId` (string, required): Post ID

**Request Body (JSON):**
```json
{
  "userId": "mentioned_user_id",
  "start": 0, // Optional: character position start
  "end": 10, // Optional: character position end
  "context": "content" // Optional: "content" or "caption"
}
```

**Example Request:**
```javascript
fetch('/user/posts/POST_ID/mentions', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    userId: 'USER_ID'
  })
})
.then(res => res.json())
.then(data => console.log(data));
```

---

### 28. Get Suggested Users

Get nearby user suggestions based on location.

**Endpoint:** `GET /user/posts/suggestions`

**Query Parameters:**
- `radius` (number, optional): Search radius in kilometers (default: 50)
- `limit` (number, optional): Number of users (default: 20)
- `page` (number, optional): Page number (default: 1)

**Example Request:**
```javascript
fetch('/user/posts/suggestions?radius=50&limit=20&page=1', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN'
  }
})
.then(res => res.json())
.then(data => console.log(data));
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Nearby users retrieved successfully",
  "data": {
    "users": [
      {
        "_id": "user_id",
        "username": "johndoe",
        "fullName": "John Doe",
        "profilePictureUrl": "https://...",
        "isVerified": false,
        "location": {
          "city": "New York",
          "country": "USA"
        },
        "distance": 5.2
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalUsers": 50,
      "hasNext": true,
      "hasPrev": false
    },
    "searchRadius": 50
  }
}
```

**Error Responses:**
- `400`: Bad Request (user location not set)

---

## Stories API

### 1. Create Story

Create a new story with media or text.

**Endpoint:** `POST /user/stories`

**Content-Type:** `multipart/form-data`

**Request Body (Form Data):**
- `content` (string, optional): Story text content
- `privacy` (string, optional): Story privacy - `"public"` or `"private"` (default: `"public"`)
- `closeFriends` (array, optional): Array of user IDs for close friends only
- `mentions` (array, optional): Array of user IDs to mention
- `files` (file, optional): Media file (image or video) - required if no content

**Note:** Either media file or content is required.

**Example Request (JavaScript/Fetch):**
```javascript
const formData = new FormData();
formData.append('content', 'Check out my day!');
formData.append('privacy', 'public');
formData.append('files', fileInput.files[0]);

fetch('/user/stories', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: formData
})
.then(res => res.json())
.then(data => console.log(data));
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Story created successfully",
  "data": {
    "_id": "story_id",
    "author": {
      "_id": "user_id",
      "username": "johndoe",
      "fullName": "John Doe",
      "profilePictureUrl": "https://...",
      "isVerified": false
    },
    "content": "Check out my day!",
    "media": {
      "type": "image",
      "url": "https://s3.amazonaws.com/...",
      "thumbnail": "https://s3.amazonaws.com/...",
      "dimensions": { "width": 1080, "height": 1920 }
    },
    "privacy": "public",
    "mentions": [],
    "analytics": {
      "viewsCount": 0,
      "likesCount": 0,
      "repliesCount": 0,
      "sharesCount": 0
    },
    "status": "active",
    "createdAt": "2025-01-20T10:00:00.000Z",
    "expiresAt": "2025-01-21T10:00:00.000Z"
  }
}
```

**Note:** Stories automatically expire after 24 hours.

---

### 2. Get Stories Feed

Get stories feed from users you follow (Instagram-like behavior).

**Endpoint:** `GET /user/stories/feed`

**Query Parameters:**
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 20)

**Example Request:**
```javascript
fetch('/user/stories/feed?page=1&limit=20', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN'
  }
})
.then(res => res.json())
.then(data => console.log(data));
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Stories feed retrieved successfully",
  "data": {
    "storiesFeed": [
      {
        "author": {
          "_id": "user_id",
          "username": "johndoe",
          "fullName": "John Doe",
          "profilePictureUrl": "https://...",
          "isVerified": false
        },
        "stories": [
          {
            "_id": "story_id",
            "content": "Story content",
            "media": { ... },
            "hasViewed": false,
            "createdAt": "2025-01-20T10:00:00.000Z",
            "expiresAt": "2025-01-21T10:00:00.000Z"
          }
        ],
        "hasUnviewedStories": true
      }
    ],
    "totalAuthors": 5
  }
}
```

**Note:** Only shows stories from users you follow. Private account stories are filtered based on follow status.

---

### 3. Get User Stories

Get stories from a specific user.

**Endpoint:** `GET /user/stories/user/:userId`

**URL Parameters:**
- `userId` (string, required): User ID

**Query Parameters:**
- `includeExpired` (boolean, optional): Include expired stories (default: false)

**Example Request:**
```javascript
fetch('/user/stories/user/USER_ID?includeExpired=false', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN'
  }
})
.then(res => res.json())
.then(data => console.log(data));
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "User stories retrieved successfully",
  "data": {
    "stories": [
      {
        "_id": "story_id",
        "content": "Story content",
        "media": { ... },
        "hasViewed": false,
        "createdAt": "2025-01-20T10:00:00.000Z",
        "expiresAt": "2025-01-21T10:00:00.000Z"
      }
    ],
    "totalStories": 3,
    "isPrivateAccount": false
  }
}
```

**Error Responses:**
- `403`: Forbidden (private account, not following)
- `404`: Not Found (user not found)

---

### 4. Get Single Story

Get a single story by ID.

**Endpoint:** `GET /user/stories/:storyId`

**URL Parameters:**
- `storyId` (string, required): Story ID

**Example Request:**
```javascript
fetch('/user/stories/STORY_ID', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN'
  }
})
.then(res => res.json())
.then(data => console.log(data));
```

**Success Response:** Same structure as create story

**Error Responses:**
- `400`: Bad Request (story expired)
- `403`: Forbidden (private account, not following)
- `404`: Not Found

---

### 5. Track Story View

Track when a user views a story (increments view count).

**Endpoint:** `POST /user/stories/:storyId/view`

**URL Parameters:**
- `storyId` (string, required): Story ID

**Example Request:**
```javascript
fetch('/user/stories/STORY_ID/view', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN'
  }
})
.then(res => res.json())
.then(data => console.log(data));
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Story view tracked successfully",
  "data": {
    "viewsCount": 15,
    "hasViewed": true
  }
}
```

**Error Responses:**
- `400`: Bad Request (story expired, own story, already viewed)
- `403`: Forbidden (private account, not following)

**Note:** You cannot track views for your own stories.

---

### 6. Like/Unlike Story

Toggle like on a story.

**Endpoint:** `POST /user/stories/:storyId/like`

**URL Parameters:**
- `storyId` (string, required): Story ID

**Example Request:**
```javascript
fetch('/user/stories/STORY_ID/like', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN'
  }
})
.then(res => res.json())
.then(data => console.log(data));
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Story liked successfully",
  "data": {
    "isLiked": true,
    "likesCount": 5
  }
}
```

**Error Responses:**
- `400`: Bad Request (story expired, own story)
- `403`: Forbidden (private account, not following)

**Note:** You cannot like your own stories.

---

### 7. Get Story Views

Get list of users who viewed a story (only by author).

**Endpoint:** `GET /user/stories/:storyId/views`

**URL Parameters:**
- `storyId` (string, required): Story ID

**Query Parameters:**
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 20)

**Example Request:**
```javascript
fetch('/user/stories/STORY_ID/views?page=1&limit=20', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN'
  }
})
.then(res => res.json())
.then(data => console.log(data));
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Story views retrieved successfully",
  "data": {
    "views": [
      {
        "user": {
          "id": "user_id",
          "username": "johndoe",
          "fullName": "John Doe",
          "profilePictureUrl": "https://...",
          "isVerified": false
        },
        "viewedAt": "2025-01-20T10:00:00.000Z",
        "viewDuration": 5000,
        "isLiked": false
      }
    ],
    "totalViews": 15,
    "totalLikes": 5,
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalPages": 1,
      "hasNext": false,
      "hasPrev": false
    }
  }
}
```

**Error Responses:**
- `403`: Forbidden (not the story author)

---

### 8. Delete Story

Delete a story (only by author).

**Endpoint:** `DELETE /user/stories/:storyId`

**URL Parameters:**
- `storyId` (string, required): Story ID

**Example Request:**
```javascript
fetch('/user/stories/STORY_ID', {
  method: 'DELETE',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN'
  }
})
.then(res => res.json())
.then(data => console.log(data));
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Story deleted successfully",
  "data": null
}
```

**Error Responses:**
- `403`: Forbidden (not the story author)
- `404`: Not Found

---

### 9. Reply to Story

Reply to a story.

**Endpoint:** `POST /user/stories/:storyId/replies`

**URL Parameters:**
- `storyId` (string, required): Story ID

**Request Body (JSON):**
```json
{
  "content": "Great story!",
  "isDirectMessage": true // Optional: default true
}
```

**Example Request:**
```javascript
fetch('/user/stories/STORY_ID/replies', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    content: 'Great story!',
    isDirectMessage: true
  })
})
.then(res => res.json())
.then(data => console.log(data));
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Reply added successfully",
  "data": {
    "replies": [ ... ],
    "repliesCount": 3
  }
}
```

**Error Responses:**
- `400`: Bad Request (empty content, story expired)
- `404`: Not Found

---

### 10. Get Stories by Hashtag

Get stories filtered by hashtag.

**Endpoint:** `GET /user/stories/hashtag/:hashtag`

**URL Parameters:**
- `hashtag` (string, required): Hashtag (without #)

**Query Parameters:**
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 20)

**Example Request:**
```javascript
fetch('/user/stories/hashtag/sunset?page=1&limit=20', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN'
  }
})
.then(res => res.json())
.then(data => console.log(data));
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Hashtag stories retrieved successfully",
  "data": {
    "stories": [ ... ],
    "hashtag": "sunset",
    "pagination": {
      "currentPage": 1,
      "totalPages": 2,
      "totalStories": 25,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

---

### 11. Get Story Analytics

Get analytics for a story (only by author).

**Endpoint:** `GET /user/stories/:storyId/analytics`

**URL Parameters:**
- `storyId` (string, required): Story ID

**Example Request:**
```javascript
fetch('/user/stories/STORY_ID/analytics', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN'
  }
})
.then(res => res.json())
.then(data => console.log(data));
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Story analytics retrieved successfully",
  "data": {
    "views": 15,
    "likes": 5,
    "replies": 3,
    "shares": 2,
    "engagementRate": 0.67,
    "timeRemaining": "18 hours",
    "createdAt": "2025-01-20T10:00:00.000Z",
    "expiresAt": "2025-01-21T10:00:00.000Z"
  }
}
```

**Error Responses:**
- `403`: Forbidden (not the story author)
- `404`: Not Found

---

### 12. Report Story

Report a story.

**Endpoint:** `POST /user/stories/:storyId/report`

**URL Parameters:**
- `storyId` (string, required): Story ID

**Request Body (JSON):**
```json
{
  "reason": "spam", // Required: "spam", "inappropriate", "harassment", "fake_news", "violence", "other"
  "description": "This story contains inappropriate content" // Optional
}
```

**Example Request:**
```javascript
fetch('/user/stories/STORY_ID/report', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    reason: 'inappropriate',
    description: 'This story contains inappropriate content'
  })
})
.then(res => res.json())
.then(data => console.log(data));
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Story reported successfully",
  "data": null
}
```

**Error Responses:**
- `400`: Bad Request (invalid reason, already reported)
- `404`: Not Found

---

## Error Handling

### Standard Error Response Format

All error responses follow this structure:

```json
{
  "success": false,
  "message": "Error message describing what went wrong",
  "error": "Error details (optional)"
}
```

### HTTP Status Codes

- `200`: Success
- `400`: Bad Request (validation errors, missing required fields)
- `401`: Unauthorized (invalid or missing authentication token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found (resource doesn't exist)
- `500`: Internal Server Error

### Common Error Messages

**Posts:**
- `"Post media is required"` - No media files provided
- `"Post content cannot exceed 2200 characters"` - Content too long
- `"Invalid visibility. Use public, followers, or private"` - Invalid visibility value
- `"You can only edit your own posts"` - Trying to edit someone else's post
- `"Only followers can view this post"` - Trying to view followers-only post without following
- `"Comments are disabled for this post"` - Comments disabled
- `"Only the post owner can like comments"` - Only post owner can like comments
- `"You have already reported this post"` - Duplicate report

**Stories:**
- `"Story content or media is required"` - No content or media provided
- `"Story has expired"` - Story is older than 24 hours
- `"This account is private. Follow to see their stories."` - Private account access denied
- `"Cannot track view for your own story"` - Cannot view own story
- `"Cannot like your own story"` - Cannot like own story
- `"Only the story author can view who viewed the story"` - Not authorized to view story views
- `"You have already reported this story"` - Duplicate report

---

## Response Format

### Success Response

All successful responses follow this structure:

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... } // Response data (can be object, array, or null)
}
```

### Pagination Response

Paginated responses include a `pagination` object:

```json
{
  "pagination": {
    "currentPage": 1,
    "totalPages": 10,
    "totalItems": 200,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

## Notes for Frontend Developers

### 1. Media Upload
- Use `multipart/form-data` for file uploads
- Multiple files can be uploaded for posts (use `files[]` or multiple `files` fields)
- Stories typically support single media file
- Supported formats: Images (JPEG, PNG, GIF) and Videos (MP4, MOV, etc.)

### 2. Authentication
- Always include the Bearer token in the Authorization header
- Token expiration: Handle 401 responses and redirect to login

### 3. Privacy & Visibility
- **Posts**: `public` (everyone), `followers` (only followers), `private` (only author)
- **Stories**: Account-level privacy (public/private account), not per-story
- Private accounts: Only followers can view stories

### 4. Story Expiration
- Stories automatically expire after 24 hours
- Expired stories return 400 error
- Use `includeExpired=true` query param to view expired stories (only for own stories)

### 5. Rate Limiting
- API requests may be rate-limited
- Implement exponential backoff for retries

### 6. Real-time Updates
- Consider using WebSocket connections for real-time updates (likes, comments, views)
- Poll endpoints periodically if WebSocket is not available

### 7. Error Handling Best Practices
```javascript
async function apiCall(url, options) {
  try {
    const response = await fetch(url, options);
    const data = await response.json();
    
    if (!response.ok) {
      // Handle different error types
      if (response.status === 401) {
        // Redirect to login
        window.location.href = '/login';
      } else if (response.status === 403) {
        // Show permission error
        alert(data.message);
      } else if (response.status === 404) {
        // Show not found error
        alert('Resource not found');
      } else {
        // Show generic error
        alert(data.message || 'An error occurred');
      }
      throw new Error(data.message);
    }
    
    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}
```

### 8. Form Data Example (Complete)
```javascript
// Complete example for creating a post with all fields
const formData = new FormData();

// Text content
formData.append('content', 'Check out this amazing sunset! 🌅');
formData.append('caption', 'Beautiful evening at the beach');

// Privacy settings
formData.append('visibility', 'public');
formData.append('commentVisibility', 'everyone');

// Location (must be JSON string)
formData.append('location', JSON.stringify({
  name: 'Beach Park',
  coordinates: { lat: 40.7128, lng: -74.0060 },
  address: '123 Beach St, City, State',
  placeId: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
  placeType: 'park',
  accuracy: 'high',
  isVisible: true
}));

// Hashtags (array)
formData.append('hashtags', JSON.stringify(['sunset', 'beach', 'nature']));

// Mentions (array of user IDs)
formData.append('mentions', JSON.stringify(['user_id_1', 'user_id_2']));

// Media files
for (let i = 0; i < fileInput.files.length; i++) {
  formData.append('files', fileInput.files[i]);
}

// Make request
fetch('/user/posts', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

---

## Support

For questions or issues, please contact the backend development team.

**Last Updated:** January 2025

