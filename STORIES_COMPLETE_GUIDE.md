# 📖 Stories Feature - Complete Guide & API Documentation

## 📋 Table of Contents

1. [Overview](#overview)
2. [User Flow & Journey](#user-flow--journey)
3. [Complete API Reference](#complete-api-reference)
4. [Step-by-Step Workflows](#step-by-step-workflows)
5. [Frontend Integration Guide](#frontend-integration-guide)
6. [Best Practices](#best-practices)
7. [Common Scenarios](#common-scenarios)

---

## 🎯 Overview

### What Are Stories?

Stories are **ephemeral content** (photos, videos, or text) that:
- ✅ Auto-expire after **24 hours**
- ✅ Support **images, videos, and text**
- ✅ Have **privacy controls** (public, followers, close friends)
- ✅ Track **views** (who watched)
- ✅ Allow **replies** (DM or public)
- ✅ Support **@mentions**
- ✅ Can be **reported** for moderation

### Key Features

| Feature | Description |
|---------|-------------|
| **24h Expiry** | Stories automatically expire and become unavailable |
| **View Tracking** | See who watched your stories (silent, no notifications) |
| **Privacy Levels** | Public, followers-only, or close friends only |
| **Replies** | Users can reply via DM or publicly |
| **Mentions** | Tag users with @username |
| **Hashtags** | Search stories by hashtags |
| **hasViewed Flag** | Instagram-like indicators for watched/unwatched stories |
| **Analytics** | Views, replies, engagement rate |

---

## 🚀 User Flow & Journey

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER JOURNEY                              │
└─────────────────────────────────────────────────────────────────┘

1. CREATE STORY
   │
   ├─→ Upload image/video OR write text
   ├─→ Add @mentions (optional)
   ├─→ Set privacy (public/followers/close_friends)
   └─→ Story is created & expires in 24h
   
2. VIEW STORIES FEED
   │
   ├─→ See stories from followed users
   ├─→ Stories grouped by author
   ├─→ hasViewed flag shows watched/unwatched
   └─→ hasUnviewedStories flag per author
   
3. WATCH A STORY
   │
   ├─→ Click on author's story ring
   ├─→ View automatically tracked (silent)
   ├─→ Can reply to story
   ├─→ Can report story
   └─→ hasViewed becomes true
   
4. VIEW ANALYTICS (Story Author Only)
   │
   ├─→ See total views count
   ├─→ See replies count
   ├─→ See engagement rate
   └─→ See time remaining before expiry
   
5. STORY EXPIRES
   │
   └─→ After 24h, story becomes unavailable
       (Can still view own expired stories)
```

---

## 📡 Complete API Reference

### Base URL

```
http://localhost:3000/user/stories
```

### Authentication

All endpoints require Bearer token authentication:

```http
Authorization: Bearer YOUR_ACCESS_TOKEN
```

---

### 1️⃣ Create Story

**Create a new story with image, video, or text.**

```http
POST /user/stories
Content-Type: multipart/form-data
Authorization: Bearer {{USER_ACCESS_TOKEN}}
```

#### Request Body (form-data)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `files` | File | No* | Image or video file (max 10MB) |
| `content` | String | No* | Text content (max 2200 chars) |
| `privacy` | String | No | `public`, `followers`, `close_friends` (default: public) |
| `closeFriends` | String | No | Comma-separated user IDs (required if privacy=close_friends) |

*At least one of `files` or `content` is required

#### Example Request

```javascript
// Form data
const formData = new FormData();
formData.append('files', imageFile);
formData.append('content', 'Amazing sunset! @johndoe #nature');
formData.append('privacy', 'public');

fetch('http://localhost:3000/user/stories', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_ACCESS_TOKEN'
  },
  body: formData
});
```

#### Example Response (201 Created)

```json
{
  "success": true,
  "message": "Story created successfully",
  "data": {
    "_id": "690c5ffcbdd0b95bb4d2d055",
    "author": {
      "_id": "67861d2ab01852cf60c7d123",
      "username": "john_doe",
      "fullName": "John Doe",
      "profilePictureUrl": "https://...",
      "isVerified": true
    },
    "content": "Amazing sunset! @johndoe #nature",
    "media": {
      "type": "image",
      "url": "https://s3.amazonaws.com/stories/image.jpg",
      "thumbnail": null,
      "dimensions": { "width": 1920, "height": 1080 }
    },
    "privacy": "public",
    "mentions": [
      {
        "user": "67861d2ab01852cf60c7d456",
        "position": { "start": 16, "end": 24 }
      }
    ],
    "status": "active",
    "expiresAt": "2024-01-16T10:00:00.000Z",
    "analytics": {
      "viewsCount": 0,
      "repliesCount": 0,
      "sharesCount": 0
    },
    "createdAt": "2024-01-15T10:00:00.000Z"
  }
}
```

---

### 2️⃣ Get Stories Feed

**Get stories from followed users, grouped by author.**

```http
GET /user/stories/feed?page=1&limit=20
Authorization: Bearer {{USER_ACCESS_TOKEN}}
```

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | Number | No | 1 | Page number |
| `limit` | Number | No | 20 | Items per page |

#### Example Response (200 OK)

```json
{
  "success": true,
  "message": "Stories feed retrieved successfully",
  "data": {
    "storiesFeed": [
      {
        "author": {
          "_id": "67861d2ab01852cf60c7d123",
          "username": "jane_doe",
          "fullName": "Jane Doe",
          "profilePictureUrl": "https://...",
          "isVerified": false
        },
        "stories": [
          {
            "_id": "690c5ffcbdd0b95bb4d2d055",
            "content": "Good morning!",
            "media": {
              "type": "image",
              "url": "https://..."
            },
            "hasViewed": false,  // ← NOT WATCHED YET
            "createdAt": "2024-01-15T08:00:00Z",
            "expiresAt": "2024-01-16T08:00:00Z"
          },
          {
            "_id": "690c6123bdd0b95bb4d2d056",
            "content": "Afternoon vibes",
            "media": {
              "type": "video",
              "url": "https://...",
              "thumbnail": "https://..."
            },
            "hasViewed": true,   // ← ALREADY WATCHED
            "createdAt": "2024-01-15T14:00:00Z",
            "expiresAt": "2024-01-16T14:00:00Z"
          }
        ],
        "hasUnviewedStories": true  // ← HAS AT LEAST 1 UNWATCHED
      },
      {
        "author": {
          "_id": "67861d2ab01852cf60c7d789",
          "username": "bob_smith",
          "fullName": "Bob Smith"
        },
        "stories": [
          {
            "_id": "690c7234bdd0b95bb4d2d057",
            "content": "Travel update",
            "hasViewed": true,
            "createdAt": "2024-01-15T12:00:00Z"
          }
        ],
        "hasUnviewedStories": false  // ← ALL WATCHED
      }
    ],
    "totalAuthors": 2
  }
}
```

---

### 3️⃣ Get User's Stories

**Get all stories from a specific user.**

```http
GET /user/stories/user/:userId?includeExpired=false
Authorization: Bearer {{USER_ACCESS_TOKEN}}
```

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userId` | String | Yes | User ID whose stories to retrieve |

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `includeExpired` | Boolean | No | false | Include expired stories (auto true if viewing own stories) |

#### Example Request

```http
GET /user/stories/user/67861d2ab01852cf60c7d123?includeExpired=false
Authorization: Bearer {{USER_ACCESS_TOKEN}}
```

#### Example Response (200 OK)

```json
{
  "success": true,
  "message": "User stories retrieved successfully",
  "data": {
    "stories": [
      {
        "_id": "690c5ffcbdd0b95bb4d2d055",
        "author": {
          "_id": "67861d2ab01852cf60c7d123",
          "username": "jane_doe",
          "fullName": "Jane Doe"
        },
        "content": "Latest story",
        "hasViewed": false,
        "createdAt": "2024-01-15T15:00:00Z",
        "expiresAt": "2024-01-16T15:00:00Z"
      },
      {
        "_id": "690c6123bdd0b95bb4d2d056",
        "content": "Earlier story",
        "hasViewed": true,
        "createdAt": "2024-01-15T10:00:00Z",
        "expiresAt": "2024-01-16T10:00:00Z"
      }
    ],
    "totalStories": 2
  }
}
```

---

### 4️⃣ Get Single Story

**Get a specific story by ID. Automatically tracks view if not the author.**

```http
GET /user/stories/:storyId
Authorization: Bearer {{USER_ACCESS_TOKEN}}
```

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `storyId` | String | Yes | Story ID to retrieve |

#### Example Request

```http
GET /user/stories/690c5ffcbdd0b95bb4d2d055
Authorization: Bearer {{USER_ACCESS_TOKEN}}
```

#### Example Response (200 OK)

```json
{
  "success": true,
  "message": "Story retrieved successfully",
  "data": {
    "_id": "690c5ffcbdd0b95bb4d2d055",
    "author": {
      "_id": "67861d2ab01852cf60c7d123",
      "username": "jane_doe",
      "fullName": "Jane Doe",
      "profilePictureUrl": "https://...",
      "isVerified": false
    },
    "content": "Amazing sunset! @johndoe #nature",
    "media": {
      "type": "image",
      "url": "https://s3.amazonaws.com/stories/image.jpg",
      "thumbnail": null,
      "dimensions": { "width": 1920, "height": 1080 }
    },
    "mentions": [
      {
        "user": {
          "_id": "67861d2ab01852cf60c7d456",
          "username": "johndoe",
          "fullName": "John Doe",
          "profilePictureUrl": "https://..."
        },
        "position": { "start": 16, "end": 24 }
      }
    ],
    "views": [
      {
        "user": "67861d2ab01852cf60c7d111",
        "viewedAt": "2024-01-15T10:30:00Z"
      },
      {
        "user": "67861d2ab01852cf60c7d222",
        "viewedAt": "2024-01-15T11:00:00Z"
      }
    ],
    "replies": [],
    "hasViewed": true,  // ← AUTOMATICALLY TRUE AFTER VIEWING
    "privacy": "public",
    "status": "active",
    "analytics": {
      "viewsCount": 2,
      "repliesCount": 0,
      "sharesCount": 0
    },
    "createdAt": "2024-01-15T10:00:00Z",
    "expiresAt": "2024-01-16T10:00:00Z"
  }
}
```

#### Error Responses

**Story Not Found (404)**
```json
{
  "success": false,
  "message": "Story not found"
}
```

**Story Expired (400)**
```json
{
  "success": false,
  "message": "Story has expired"
}
```

**Private Story (403)**
```json
{
  "success": false,
  "message": "You cannot view this story"
}
```

---

### 5️⃣ Reply to Story

**Reply to a story. Can be sent as DM or public.**

```http
POST /user/stories/:storyId/replies
Content-Type: application/json
Authorization: Bearer {{USER_ACCESS_TOKEN}}
```

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `storyId` | String | Yes | Story ID to reply to |

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `content` | String | Yes | Reply text (max 200 chars) |
| `isDirectMessage` | Boolean | No | true = DM, false = public (default: true) |

#### Example Request

```json
{
  "content": "Great story!",
  "isDirectMessage": true
}
```

#### Example Response (200 OK)

```json
{
  "success": true,
  "message": "Reply added successfully",
  "data": {
    "replies": [
      {
        "user": "67861d2ab01852cf60c7d123",
        "content": "Great story!",
        "repliedAt": "2024-01-15T10:30:00Z",
        "isDirectMessage": true
      }
    ],
    "repliesCount": 1
  }
}
```

#### Validations

- ❌ Reply content cannot be empty
- ❌ Max 200 characters
- ❌ Cannot reply to expired stories

---

### 6️⃣ Delete Story

**Delete your own story (author only).**

```http
DELETE /user/stories/:storyId
Authorization: Bearer {{USER_ACCESS_TOKEN}}
```

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `storyId` | String | Yes | Story ID to delete |

#### Example Request

```http
DELETE /user/stories/690c5ffcbdd0b95bb4d2d055
Authorization: Bearer {{USER_ACCESS_TOKEN}}
```

#### Example Response (200 OK)

```json
{
  "success": true,
  "message": "Story deleted successfully",
  "data": null
}
```

#### Error Responses

**Not Story Author (403)**
```json
{
  "success": false,
  "message": "You can only delete your own stories"
}
```

---

### 7️⃣ Report Story

**Report a story for policy violations.**

```http
POST /user/stories/:storyId/report
Content-Type: application/json
Authorization: Bearer {{USER_ACCESS_TOKEN}}
```

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `storyId` | String | Yes | Story ID to report |

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `reason` | String | Yes | Report reason (see valid reasons below) |
| `description` | String | No | Additional details (max 500 chars) |

#### Valid Reasons

- `spam`
- `inappropriate`
- `harassment`
- `fake_news`
- `violence`
- `other`

#### Example Request

```json
{
  "reason": "spam",
  "description": "This story contains spam content and promotional links"
}
```

#### Example Response (200 OK)

```json
{
  "success": true,
  "message": "Story reported successfully",
  "data": null
}
```

#### Behavior

- ✅ Cannot report same story twice
- ✅ After **3+ reports**, story is auto-flagged for admin review
- ✅ Creates content moderation record

---

### 8️⃣ Get Story Analytics

**Get detailed analytics for your own story (author only).**

```http
GET /user/stories/:storyId/analytics
Authorization: Bearer {{USER_ACCESS_TOKEN}}
```

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `storyId` | String | Yes | Story ID to get analytics for |

#### Example Request

```http
GET /user/stories/690c5ffcbdd0b95bb4d2d055/analytics
Authorization: Bearer {{USER_ACCESS_TOKEN}}
```

#### Example Response (200 OK)

```json
{
  "success": true,
  "message": "Story analytics retrieved successfully",
  "data": {
    "views": 42,
    "replies": 5,
    "shares": 3,
    "engagementRate": 11.90,  // (replies / views) * 100
    "timeRemaining": 43200,    // seconds until expiry
    "createdAt": "2024-01-15T10:00:00Z",
    "expiresAt": "2024-01-16T10:00:00Z"
  }
}
```

#### Error Responses

**Not Story Author (403)**
```json
{
  "success": false,
  "message": "You can only view analytics for your own stories"
}
```

---

### 9️⃣ Search Stories by Hashtag

**Search public stories by hashtag.**

```http
GET /user/stories/hashtag/:hashtag?page=1&limit=20
Authorization: Bearer {{USER_ACCESS_TOKEN}}
```

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `hashtag` | String | Yes | Hashtag to search (without # symbol) |

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | Number | No | 1 | Page number |
| `limit` | Number | No | 20 | Items per page |

#### Example Request

```http
GET /user/stories/hashtag/sunset?page=1&limit=20
Authorization: Bearer {{USER_ACCESS_TOKEN}}
```

#### Example Response (200 OK)

```json
{
  "success": true,
  "message": "Hashtag stories retrieved successfully",
  "data": {
    "stories": [
      {
        "_id": "690c5ffcbdd0b95bb4d2d055",
        "author": {
          "_id": "67861d2ab01852cf60c7d123",
          "username": "jane_doe",
          "fullName": "Jane Doe"
        },
        "content": "Beautiful #sunset today!",
        "hasViewed": false,
        "createdAt": "2024-01-15T18:00:00Z"
      },
      {
        "_id": "690c6123bdd0b95bb4d2d056",
        "content": "Amazing colors at #sunset",
        "hasViewed": true,
        "createdAt": "2024-01-15T17:30:00Z"
      }
    ],
    "hashtag": "sunset",
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalStories": 45,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

---

## 🔄 Step-by-Step Workflows

### Workflow 1: Create and Share a Story

```
┌─────────────────────────────────────────────────────────────┐
│                   CREATE & SHARE STORY                       │
└─────────────────────────────────────────────────────────────┘

Step 1: User captures/uploads media or writes text
        │
        ↓
Step 2: POST /user/stories
        Body: {
          files: [image/video],
          content: "Text with @mentions #hashtags",
          privacy: "public" | "followers" | "close_friends"
        }
        │
        ↓
Step 3: Backend processes request
        ├─ Upload media to S3
        ├─ Extract @mentions from content
        ├─ Set expiry time (24h from now)
        └─ Create story in database
        │
        ↓
Step 4: Response with story data
        {
          "_id": "story123",
          "expiresAt": "2024-01-16T10:00:00Z",
          "analytics": { "viewsCount": 0 }
        }
        │
        ↓
Step 5: Story appears in followers' feeds
```

---

### Workflow 2: View Stories Feed

```
┌─────────────────────────────────────────────────────────────┐
│                    VIEW STORIES FEED                         │
└─────────────────────────────────────────────────────────────┘

Step 1: User opens stories section
        │
        ↓
Step 2: GET /user/stories/feed?page=1&limit=20
        │
        ↓
Step 3: Backend processes
        ├─ Get user's following list
        ├─ Find active stories (not expired)
        ├─ Apply privacy filters
        ├─ Check hasViewed for each story
        └─ Group stories by author
        │
        ↓
Step 4: Response with grouped stories
        {
          "storiesFeed": [
            {
              "author": {...},
              "stories": [...],
              "hasUnviewedStories": true/false
            }
          ]
        }
        │
        ↓
Step 5: Frontend displays
        ├─ Colorful ring if hasUnviewedStories = true
        └─ Gray ring if hasUnviewedStories = false
```

---

### Workflow 3: Watch a Story

```
┌─────────────────────────────────────────────────────────────┐
│                      WATCH STORY                             │
└─────────────────────────────────────────────────────────────┘

Step 1: User clicks on story ring
        │
        ↓
Step 2: GET /user/stories/:storyId
        │
        ↓
Step 3: Backend processes
        ├─ Find story by ID
        ├─ Check if expired → reject if yes
        ├─ Check privacy permissions
        ├─ Check if user is not author
        └─ Add view (if not already viewed)
        │
        ↓
Step 4: Response with story + hasViewed flag
        {
          "_id": "story123",
          "content": "...",
          "media": {...},
          "hasViewed": true,  ← now true
          "analytics": {
            "viewsCount": 42  ← incremented
          }
        }
        │
        ↓
Step 5: Frontend displays story
        ├─ Show media/content
        ├─ Show progress bar
        └─ Show reply button
        │
        ↓
Step 6: Story marked as viewed
        ├─ hasViewed = true in future requests
        └─ Appears with gray ring in feed
```

---

### Workflow 4: Reply to Story

```
┌─────────────────────────────────────────────────────────────┐
│                     REPLY TO STORY                           │
└─────────────────────────────────────────────────────────────┘

Step 1: User watching story clicks reply button
        │
        ↓
Step 2: User types reply message
        │
        ↓
Step 3: POST /user/stories/:storyId/replies
        Body: {
          content: "Great story!",
          isDirectMessage: true
        }
        │
        ↓
Step 4: Backend validates
        ├─ Check story exists & not expired
        ├─ Validate content length (max 200 chars)
        └─ Add reply to story
        │
        ↓
Step 5: Response with updated replies
        {
          "replies": [...],
          "repliesCount": 5
        }
        │
        ↓
Step 6: Story author sees reply
        ├─ If DM: appears in messages
        └─ If public: visible to all viewers
```

---

### Workflow 5: View Story Analytics

```
┌─────────────────────────────────────────────────────────────┐
│                  VIEW STORY ANALYTICS                        │
└─────────────────────────────────────────────────────────────┘

Step 1: Story author wants to see performance
        │
        ↓
Step 2: GET /user/stories/:storyId/analytics
        │
        ↓
Step 3: Backend validates
        ├─ Check if user is story author
        └─ Calculate metrics
        │
        ↓
Step 4: Response with analytics
        {
          "views": 42,
          "replies": 5,
          "shares": 3,
          "engagementRate": 11.90,
          "timeRemaining": 43200
        }
        │
        ↓
Step 5: Frontend displays
        ├─ View count
        ├─ Reply count
        ├─ Engagement graph
        └─ Time remaining
```

---

## 💻 Frontend Integration Guide

### Complete React Implementation

```jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = 'http://localhost:3000/user/stories';

// ============================================
// 1. STORIES FEED COMPONENT
// ============================================

function StoriesFeed() {
  const [storiesFeed, setStoriesFeed] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStoriesFeed();
  }, []);

  const fetchStoriesFeed = async () => {
    try {
      const response = await axios.get(`${API_BASE}/feed`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      setStoriesFeed(response.data.data.storiesFeed);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching stories:', error);
      setLoading(false);
    }
  };

  if (loading) return <div>Loading stories...</div>;

  return (
    <div className="stories-feed">
      <h2>Stories</h2>
      <div className="stories-container">
        {storiesFeed.map(({ author, stories, hasUnviewedStories }) => (
          <StoryRing
            key={author._id}
            author={author}
            stories={stories}
            hasUnviewed={hasUnviewedStories}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================
// 2. STORY RING COMPONENT (Instagram-like)
// ============================================

function StoryRing({ author, stories, hasUnviewed }) {
  const [showViewer, setShowViewer] = useState(false);

  const ringClass = hasUnviewed 
    ? 'story-ring-new'   // Colorful gradient
    : 'story-ring-seen';  // Gray

  return (
    <>
      <div 
        className={`story-ring ${ringClass}`}
        onClick={() => setShowViewer(true)}
      >
        <img 
          src={author.profilePictureUrl} 
          alt={author.username}
          className="story-avatar"
        />
        <span className="story-username">{author.username}</span>
      </div>

      {showViewer && (
        <StoryViewer
          stories={stories}
          author={author}
          onClose={() => setShowViewer(false)}
        />
      )}
    </>
  );
}

// ============================================
// 3. STORY VIEWER COMPONENT
// ============================================

function StoryViewer({ stories, author, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [story, setStory] = useState(null);
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    // Find first unwatched story or start from beginning
    const firstUnwatched = stories.findIndex(s => !s.hasViewed);
    const startIndex = firstUnwatched !== -1 ? firstUnwatched : 0;
    setCurrentIndex(startIndex);
  }, [stories]);

  useEffect(() => {
    if (stories[currentIndex]) {
      viewStory(stories[currentIndex]._id);
    }
  }, [currentIndex]);

  const viewStory = async (storyId) => {
    try {
      const response = await axios.get(`${API_BASE}/${storyId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      setStory(response.data.data);
    } catch (error) {
      console.error('Error viewing story:', error);
    }
  };

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onClose();
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleReply = async () => {
    if (!replyText.trim()) return;

    try {
      await axios.post(
        `${API_BASE}/${story._id}/replies`,
        {
          content: replyText,
          isDirectMessage: true
        },
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      setReplyText('');
      alert('Reply sent!');
    } catch (error) {
      console.error('Error sending reply:', error);
    }
  };

  if (!story) return <div>Loading...</div>;

  return (
    <div className="story-viewer-overlay">
      <div className="story-viewer">
        {/* Progress bars */}
        <div className="progress-bars">
          {stories.map((s, index) => (
            <div
              key={s._id}
              className={`progress-bar ${
                index < currentIndex ? 'viewed' :
                index === currentIndex ? 'active' : 'pending'
              }`}
            />
          ))}
        </div>

        {/* Story header */}
        <div className="story-header">
          <img src={author.profilePictureUrl} alt={author.username} />
          <span>{author.username}</span>
          <button onClick={onClose}>×</button>
        </div>

        {/* Story content */}
        <div className="story-content">
          {story.media.type === 'image' && (
            <img src={story.media.url} alt="Story" />
          )}
          {story.media.type === 'video' && (
            <video src={story.media.url} autoPlay />
          )}
          {story.media.type === 'text' && (
            <div className="text-story">{story.content}</div>
          )}
        </div>

        {/* Navigation */}
        <div className="story-navigation">
          <button onClick={handlePrevious}>←</button>
          <button onClick={handleNext}>→</button>
        </div>

        {/* Reply input */}
        <div className="story-reply">
          <input
            type="text"
            placeholder="Reply to story..."
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            maxLength={200}
          />
          <button onClick={handleReply}>Send</button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// 4. CREATE STORY COMPONENT
// ============================================

function CreateStory() {
  const [file, setFile] = useState(null);
  const [content, setContent] = useState('');
  const [privacy, setPrivacy] = useState('public');
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!file && !content.trim()) {
      alert('Please add media or text content');
      return;
    }

    setUploading(true);

    const formData = new FormData();
    if (file) formData.append('files', file);
    if (content) formData.append('content', content);
    formData.append('privacy', privacy);

    try {
      const response = await axios.post(`${API_BASE}`, formData, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      alert('Story created successfully!');
      // Reset form
      setFile(null);
      setContent('');
      setPrivacy('public');
    } catch (error) {
      console.error('Error creating story:', error);
      alert('Failed to create story');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="create-story">
      <h2>Create Story</h2>
      <form onSubmit={handleSubmit}>
        {/* File upload */}
        <div className="form-group">
          <label>Upload Image/Video</label>
          <input
            type="file"
            accept="image/*,video/*"
            onChange={handleFileChange}
          />
        </div>

        {/* Text content */}
        <div className="form-group">
          <label>Text Content (with @mentions and #hashtags)</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your story... @mention #hashtag"
            maxLength={2200}
            rows={4}
          />
          <small>{content.length} / 2200</small>
        </div>

        {/* Privacy */}
        <div className="form-group">
          <label>Privacy</label>
          <select value={privacy} onChange={(e) => setPrivacy(e.target.value)}>
            <option value="public">Public</option>
            <option value="followers">Followers Only</option>
            <option value="close_friends">Close Friends</option>
          </select>
        </div>

        {/* Submit */}
        <button type="submit" disabled={uploading}>
          {uploading ? 'Uploading...' : 'Create Story'}
        </button>
      </form>
    </div>
  );
}

// ============================================
// 5. MY STORIES COMPONENT (View Own Stories)
// ============================================

function MyStories() {
  const [myStories, setMyStories] = useState([]);
  const [selectedStory, setSelectedStory] = useState(null);
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    fetchMyStories();
  }, []);

  const fetchMyStories = async () => {
    try {
      const userId = localStorage.getItem('userId');
      const response = await axios.get(`${API_BASE}/user/${userId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      setMyStories(response.data.data.stories);
    } catch (error) {
      console.error('Error fetching my stories:', error);
    }
  };

  const viewAnalytics = async (storyId) => {
    try {
      const response = await axios.get(`${API_BASE}/${storyId}/analytics`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      setAnalytics(response.data.data);
      setSelectedStory(storyId);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const deleteStory = async (storyId) => {
    if (!confirm('Delete this story?')) return;

    try {
      await axios.delete(`${API_BASE}/${storyId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      alert('Story deleted');
      fetchMyStories(); // Refresh list
    } catch (error) {
      console.error('Error deleting story:', error);
    }
  };

  return (
    <div className="my-stories">
      <h2>My Stories</h2>
      <div className="stories-list">
        {myStories.map(story => (
          <div key={story._id} className="story-item">
            <img src={story.media?.url || '/placeholder.png'} alt="Story" />
            <div className="story-info">
              <p>{story.content}</p>
              <small>{new Date(story.createdAt).toLocaleString()}</small>
              <small>Expires: {new Date(story.expiresAt).toLocaleString()}</small>
            </div>
            <div className="story-actions">
              <button onClick={() => viewAnalytics(story._id)}>
                📊 Analytics
              </button>
              <button onClick={() => deleteStory(story._id)}>
                🗑️ Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Analytics Modal */}
      {analytics && (
        <div className="analytics-modal">
          <h3>Story Analytics</h3>
          <div className="analytics-grid">
            <div className="metric">
              <span className="label">Views</span>
              <span className="value">{analytics.views}</span>
            </div>
            <div className="metric">
              <span className="label">Replies</span>
              <span className="value">{analytics.replies}</span>
            </div>
            <div className="metric">
              <span className="label">Engagement Rate</span>
              <span className="value">{analytics.engagementRate}%</span>
            </div>
            <div className="metric">
              <span className="label">Time Remaining</span>
              <span className="value">
                {Math.floor(analytics.timeRemaining / 3600)}h
              </span>
            </div>
          </div>
          <button onClick={() => setAnalytics(null)}>Close</button>
        </div>
      )}
    </div>
  );
}

// ============================================
// 6. EXPORT MAIN APP
// ============================================

export default function StoriesApp() {
  return (
    <div className="stories-app">
      <CreateStory />
      <StoriesFeed />
      <MyStories />
    </div>
  );
}
```

---

### CSS Styling (Instagram-like)

```css
/* ============================================
   STORY RINGS
   ============================================ */

.stories-container {
  display: flex;
  gap: 16px;
  overflow-x: auto;
  padding: 16px;
}

.story-ring {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  min-width: 80px;
}

.story-ring-new {
  /* Colorful gradient for unwatched */
  background: linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888);
  border-radius: 50%;
  padding: 3px;
}

.story-ring-seen {
  /* Gray for watched */
  background: #d1d5db;
  border-radius: 50%;
  padding: 3px;
}

.story-avatar {
  width: 70px;
  height: 70px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid white;
}

.story-username {
  font-size: 12px;
  margin-top: 4px;
  text-align: center;
}

/* ============================================
   STORY VIEWER
   ============================================ */

.story-viewer-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.95);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.story-viewer {
  max-width: 500px;
  width: 100%;
  height: 90vh;
  background: black;
  border-radius: 12px;
  overflow: hidden;
  position: relative;
}

/* Progress bars */
.progress-bars {
  display: flex;
  gap: 4px;
  padding: 8px;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
}

.progress-bar {
  flex: 1;
  height: 3px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 2px;
}

.progress-bar.viewed {
  background: rgba(255, 255, 255, 0.9);
}

.progress-bar.active {
  background: white;
  animation: progress 5s linear;
}

@keyframes progress {
  from { width: 0%; }
  to { width: 100%; }
}

/* Story header */
.story-header {
  position: absolute;
  top: 24px;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  padding: 0 16px;
  z-index: 10;
  color: white;
}

.story-header img {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  margin-right: 12px;
}

/* Story content */
.story-content {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.story-content img,
.story-content video {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.text-story {
  padding: 32px;
  font-size: 24px;
  color: white;
  text-align: center;
}

/* Reply input */
.story-reply {
  position: absolute;
  bottom: 24px;
  left: 16px;
  right: 16px;
  display: flex;
  gap: 8px;
}

.story-reply input {
  flex: 1;
  padding: 12px 16px;
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.story-reply button {
  padding: 12px 24px;
  border-radius: 24px;
  background: #0095f6;
  color: white;
  border: none;
  cursor: pointer;
}

/* ============================================
   CREATE STORY FORM
   ============================================ */

.create-story {
  max-width: 500px;
  margin: 24px auto;
  padding: 24px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
}

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
}

/* ============================================
   MY STORIES
   ============================================ */

.my-stories {
  max-width: 800px;
  margin: 24px auto;
  padding: 24px;
}

.stories-list {
  display: grid;
  gap: 16px;
}

.story-item {
  display: flex;
  gap: 16px;
  padding: 16px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.story-item img {
  width: 100px;
  height: 100px;
  object-fit: cover;
  border-radius: 8px;
}

.story-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.story-actions button {
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  background: white;
  cursor: pointer;
}

/* ============================================
   ANALYTICS MODAL
   ============================================ */

.analytics-modal {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: white;
  padding: 32px;
  border-radius: 16px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.2);
  z-index: 2000;
}

.analytics-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
  margin: 24px 0;
}

.metric {
  text-align: center;
}

.metric .label {
  display: block;
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 8px;
}

.metric .value {
  display: block;
  font-size: 32px;
  font-weight: 700;
  color: #111827;
}
```

---

## ✅ Best Practices

### 1. **Story Creation**

✅ **Do:**
- Validate file size (max 10MB)
- Compress media before upload
- Add @mentions for better engagement
- Use relevant #hashtags for discoverability
- Set appropriate privacy levels

❌ **Don't:**
- Upload uncompressed large files
- Leave privacy as default without user choice
- Post spam or inappropriate content
- Forget to handle upload errors

### 2. **Viewing Stories**

✅ **Do:**
- Auto-advance to first unwatched story
- Show progress bars for story sequence
- Enable tap-to-skip (left/right)
- Cache story data for smooth playback
- Respect privacy settings

❌ **Don't:**
- Fetch all stories at once (paginate!)
- Mark stories as viewed without actually opening them
- Ignore expired stories in UI
- Show private stories to unauthorized users

### 3. **Performance**

✅ **Do:**
- Lazy load story media
- Preload next story in sequence
- Cache viewed stories temporarily
- Use pagination for feeds
- Optimize images/videos

❌ **Don't:**
- Load all story media upfront
- Make unnecessary API calls
- Keep expired stories in cache
- Skip error handling

### 4. **UX Patterns**

✅ **Do:**
- Use colored rings for unwatched stories
- Use gray rings for watched stories
- Show story count per user
- Auto-hide reply keyboard
- Show "seen by X users" for own stories

❌ **Don't:**
- Use confusing indicators
- Hide navigation controls
- Ignore accessibility
- Overcomplicate UI

---

## 🎯 Common Scenarios

### Scenario 1: User Opens App

```
1. Fetch stories feed
   GET /user/stories/feed

2. Display story rings
   - Colorful ring if hasUnviewedStories = true
   - Gray ring if hasUnviewedStories = false

3. User clicks on a ring
   - Open first unwatched story
   - Or first story if all watched
```

### Scenario 2: User Creates Story

```
1. User selects media/writes text
2. User sets privacy
3. POST /user/stories (with form-data)
4. Story created & appears in followers' feeds
5. Story expires automatically after 24h
```

### Scenario 3: User Views Story

```
1. User clicks story ring
2. GET /user/stories/:storyId
3. View is tracked (silent)
4. hasViewed becomes true
5. Story ring turns gray in feed
```

### Scenario 4: Story Author Checks Analytics

```
1. Open "My Stories"
2. Click analytics button
3. GET /user/stories/:storyId/analytics
4. See views, replies, engagement rate
5. See time remaining before expiry
```

### Scenario 5: User Reports Story

```
1. User watches inappropriate story
2. Clicks report button
3. POST /user/stories/:storyId/report
4. Story flagged after 3+ reports
5. Admin reviews reported story
```

---

## 📊 Summary Table

| Feature | Endpoint | Method | Auth Required |
|---------|----------|--------|---------------|
| Create Story | `/user/stories` | POST | ✅ |
| Get Stories Feed | `/user/stories/feed` | GET | ✅ |
| Get User Stories | `/user/stories/user/:userId` | GET | ✅ |
| Get Single Story | `/user/stories/:storyId` | GET | ✅ |
| Reply to Story | `/user/stories/:storyId/replies` | POST | ✅ |
| Delete Story | `/user/stories/:storyId` | DELETE | ✅ (Author only) |
| Report Story | `/user/stories/:storyId/report` | POST | ✅ |
| Get Analytics | `/user/stories/:storyId/analytics` | GET | ✅ (Author only) |
| Search by Hashtag | `/user/stories/hashtag/:hashtag` | GET | ✅ |

---

## 🚀 Quick Start Checklist

- [ ] Set up Postman collection with all endpoints
- [ ] Create test user accounts
- [ ] Upload sample stories (image/video/text)
- [ ] Test stories feed (check hasViewed flags)
- [ ] Watch stories (verify view tracking)
- [ ] Reply to stories
- [ ] Check analytics
- [ ] Test privacy levels
- [ ] Test story expiry (24h)
- [ ] Test hashtag search
- [ ] Implement frontend with colored/gray rings
- [ ] Add progress bars in story viewer
- [ ] Implement auto-advance logic

---

## 🎉 You're Ready!

**This guide covers everything you need to implement Instagram-like stories in your app!**

For questions or issues:
- Check the API responses for error messages
- Verify authentication tokens
- Test privacy settings
- Monitor story expiry times
- Use browser DevTools to debug frontend

**Happy coding! 📱✨**

