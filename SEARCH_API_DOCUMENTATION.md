# 🔍 VibgyorNode Search API Documentation

## Overview
The Search API provides comprehensive search functionality across people, posts, hashtags, and locations with integrated social features like blocking and privacy controls.

## Base URL
```
/api/v1/user/search
```

## Authentication
All endpoints require user authentication via JWT token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

---

## 📋 **API Endpoints**

### **1. Combined Search (All Filters)**
**Endpoint:** `GET /api/v1/user/search`

**Description:** Search across all categories (people, posts, hashtags, location) or filter by specific category.

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `q` | string | No | `''` | Search keyword |
| `filter` | string | No | `'all'` | Filter type: `all`, `people`, `posts`, `hashtags`, `location` |
| `page` | number | No | `1` | Page number for pagination |
| `limit` | number | No | `20` | Results per page (max 100) |

**Example Requests:**
```bash
# Search all categories
GET /api/v1/user/search?q=john travel

# Search only people
GET /api/v1/user/search?q=john&filter=people

# Search only posts
GET /api/v1/user/search?q=travel&filter=posts

# Search hashtags
GET /api/v1/user/search?q=#adventure&filter=hashtags

# Search location
GET /api/v1/user/search?q=mumbai&filter=location

# Pagination
GET /api/v1/user/search?q=travel&page=2&limit=10
```

**Response Format:**
```json
{
  "success": true,
  "data": {
    "people": {
      "results": [...],
      "count": 5
    },
    "posts": {
      "results": [...],
      "count": 10
    },
    "hashtags": {
      "results": [...],
      "count": 3
    },
    "location": {
      "results": [...],
      "count": 2
    },
    "totalResults": 20
  }
}
```

---

### **2. People Search**
**Endpoint:** `GET /api/v1/user/search/people`

**Description:** Search for users by name or username.

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `q` | string | Yes | - | Search keyword (name or username) |
| `page` | number | No | `1` | Page number |
| `limit` | number | No | `20` | Results per page |

**Search Logic:**
- Searches in `fullName` and `username` fields
- Case-insensitive partial matching
- Excludes blocked users and users who blocked the searcher
- Only shows active users
- Prioritizes verified users in results

**Example Request:**
```bash
GET /api/v1/user/search/people?q=john&page=1&limit=20
```

**Response Format:**
```json
{
  "success": true,
  "data": {
    "type": "people",
    "results": [
      {
        "_id": "user_id",
        "username": "john_doe",
        "fullName": "John Doe",
        "profilePictureUrl": "https://...",
        "verificationStatus": "approved"
      }
    ],
    "count": 1,
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "pages": 1
    }
  }
}
```

---

### **3. Posts Search**
**Endpoint:** `GET /api/v1/user/search/posts`

**Description:** Search for posts by content, caption, hashtags, location, or mentions.

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `q` | string | Yes | - | Search keyword |
| `page` | number | No | `1` | Page number |
| `limit` | number | No | `20` | Results per page |

**Search Logic:**
- Searches in: `content`, `caption`, `hashtags`, `location.name`, `mentions`
- Case-insensitive partial matching
- Only shows public, published posts
- Excludes posts from blocked users
- Supports mention search (e.g., `@username`)

**Example Request:**
```bash
GET /api/v1/user/search/posts?q=travel adventure&page=1&limit=20
```

**Response Format:**
```json
{
  "success": true,
  "data": {
    "type": "posts",
    "results": [
      {
        "_id": "post_id",
        "content": "Amazing travel experience...",
        "caption": "Travel memories",
        "hashtags": ["travel", "adventure"],
        "location": {
          "name": "Mumbai",
          "city": "Mumbai",
          "country": "India"
        },
        "author": {
          "_id": "user_id",
          "username": "traveler",
          "fullName": "Travel Enthusiast",
          "profilePictureUrl": "https://...",
          "verificationStatus": "approved"
        },
        "likesCount": 25,
        "commentsCount": 5,
        "publishedAt": "2024-01-15T10:30:00Z"
      }
    ],
    "count": 1,
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "pages": 1
    }
  }
}
```

---

### **4. Hashtags Search**
**Endpoint:** `GET /api/v1/user/search/hashtags`

**Description:** Search for posts containing specific hashtags.

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `q` | string | Yes | - | Hashtag (with or without #) or keyword |
| `page` | number | No | `1` | Page number |
| `limit` | number | No | `20` | Results per page |

**Search Logic:**
- Searches in `hashtags` field
- Supports both `#hashtag` and `hashtag` formats
- Only shows public, published posts
- Excludes posts from blocked users
- Falls back to keyword search if no hashtags found

**Example Requests:**
```bash
# With hashtag symbol
GET /api/v1/user/search/hashtags?q=#adventure

# Without hashtag symbol
GET /api/v1/user/search/hashtags?q=adventure
```

**Response Format:**
```json
{
  "success": true,
  "data": {
    "type": "hashtags",
    "results": [
      {
        "_id": "post_id",
        "content": "Amazing adventure...",
        "hashtags": ["adventure", "travel"],
        "author": {
          "_id": "user_id",
          "username": "adventurer",
          "fullName": "Adventure Seeker"
        },
        "publishedAt": "2024-01-15T10:30:00Z"
      }
    ],
    "count": 1,
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "pages": 1
    }
  }
}
```

---

### **5. Location Search**
**Endpoint:** `GET /api/v1/user/search/location`

**Description:** Search for posts by location.

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `q` | string | Yes | - | Location name, address, city, or country |
| `page` | number | No | `1` | Page number |
| `limit` | number | No | `20` | Results per page |

**Search Logic:**
- Searches in: `location.name`, `location.address`, `location.city`, `location.country`
- Case-insensitive partial matching
- Only shows public, published posts
- Excludes posts from blocked users

**Example Request:**
```bash
GET /api/v1/user/search/location?q=mumbai&page=1&limit=20
```

**Response Format:**
```json
{
  "success": true,
  "data": {
    "type": "location",
    "results": [
      {
        "_id": "post_id",
        "content": "Beautiful sunset in Mumbai...",
        "location": {
          "name": "Marine Drive",
          "address": "Marine Drive, Mumbai",
          "city": "Mumbai",
          "country": "India",
          "coordinates": {
            "lat": 19.0225,
            "lng": 72.8424
          }
        },
        "author": {
          "_id": "user_id",
          "username": "mumbai_lover",
          "fullName": "Mumbai Explorer"
        },
        "publishedAt": "2024-01-15T10:30:00Z"
      }
    ],
    "count": 1,
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "pages": 1
    }
  }
}
```

---

## 🔒 **Privacy & Security Features**

### **Blocking Integration**
- **People Search**: Excludes users who blocked the searcher and users that the searcher has blocked
- **Posts/Hashtags/Location Search**: Excludes posts from blocked users

### **Privacy Controls**
- **Posts**: Only shows public posts (`privacy: 'public'`)
- **Users**: Only shows active users (`isActive: true`)
- **Content**: Only shows published posts (`status: 'published'`)

### **No Complex Privacy Logic**
- ❌ No followers-only access
- ❌ No close friends access
- ❌ No private post access
- ✅ Simple public content only

---

## 📊 **Search Behavior**

### **Input Processing**
```javascript
// Input: "john travel #adventure @friend"
const processed = {
  originalInput: "john travel #adventure @friend",
  keywords: "john travel",           // Text without hashtags
  hashtags: ["#adventure"],          // Extracted hashtags
  hasHashtags: true,                 // Has hashtags flag
  hasKeywords: true                  // Has keywords flag
};
```

### **Search Logic Flow**
1. **Input Processing**: Extract keywords, hashtags, mentions
2. **User Validation**: Check if user exists and is active
3. **Blocking Check**: Get blocked users and users who blocked searcher
4. **Query Building**: Build MongoDB query with filters
5. **Database Search**: Execute search with pagination
6. **Response Formatting**: Format results with pagination info

### **Performance Optimizations**
- **Database Indexes**: Optimized for search fields
- **Pagination**: Limits results to prevent large responses
- **Lean Queries**: Uses `.lean()` for better performance
- **Parallel Queries**: Uses `Promise.all()` for combined searches

---

## 🚀 **Usage Examples**

### **Frontend Integration**
```javascript
// Search all categories
const searchAll = async (keyword, page = 1) => {
  const response = await fetch(`/api/v1/user/search?q=${keyword}&page=${page}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return await response.json();
};

// Search specific category
const searchPeople = async (keyword, page = 1) => {
  const response = await fetch(`/api/v1/user/search/people?q=${keyword}&page=${page}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return await response.json();
};
```

### **Search with Filters**
```javascript
// Search posts only
const searchPosts = async (keyword) => {
  const response = await fetch(`/api/v1/user/search?q=${keyword}&filter=posts`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return await response.json();
};

// Search hashtags
const searchHashtags = async (hashtag) => {
  const response = await fetch(`/api/v1/user/search?q=${hashtag}&filter=hashtags`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return await response.json();
};
```

---

## ⚠️ **Error Handling**

### **Common Error Responses**
```json
{
  "success": false,
  "message": "Error message",
  "error": "ERROR_CODE"
}
```

### **Error Codes**
- `400`: Bad Request (invalid parameters)
- `401`: Unauthorized (missing/invalid token)
- `404`: Not Found (user not found)
- `500`: Internal Server Error

### **Validation Rules**
- **Search Keyword**: Required for individual filter endpoints
- **Pagination**: Page must be ≥ 1, limit must be ≤ 100
- **Filter Type**: Must be one of: `all`, `people`, `posts`, `hashtags`, `location`

---

## 📈 **Performance Considerations**

### **Database Indexes**
```javascript
// User indexes
{ fullName: 'text', username: 'text' }
{ isActive: 1, verificationStatus: -1 }

// Post indexes
{ content: 'text', caption: 'text', hashtags: 1 }
{ 'location.name': 'text', 'location.address': 'text' }
{ privacy: 1, status: 1, publishedAt: -1 }
{ author: 1, publishedAt: -1 }
```

### **Caching Strategy**
- **Search Results**: Cache for 5 minutes
- **User Block Lists**: Cache for 10 minutes
- **Popular Searches**: Cache for 30 minutes

### **Rate Limiting**
- **Search Requests**: 100 requests per minute per user
- **Burst Limit**: 20 requests per 10 seconds

---

## 🔄 **Integration with Social Features**

### **Blocking System**
- Automatically excludes blocked users from all searches
- Respects bidirectional blocking (A blocks B, B blocks A)
- Updates search results when blocking status changes

### **Follow System**
- People search shows all active users (no follow restrictions)
- Posts search shows public posts regardless of follow status
- No special treatment for followed users in search results

### **Privacy System**
- Only public content is searchable
- No access to private, followers-only, or close friends content
- Maintains user privacy while enabling discovery

---

This search API provides a comprehensive, privacy-aware search functionality that integrates seamlessly with your existing social features while maintaining performance and security standards.
