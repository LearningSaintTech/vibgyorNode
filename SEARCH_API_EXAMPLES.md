# Search API - Single Endpoint with All Filters

## Base URL
```
GET /api/v1/user/search
```

## Authentication
All requests require Bearer token in Authorization header:
```
Authorization: Bearer <access_token>
```

---

## Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `q` | string | No | `''` | Search keyword/query |
| `filter` | string | No | `'all'` | Filter type: `'all'`, `'people'`, `'posts'`, `'hashtags'`, `'location'` |
| `page` | number | No | `1` | Page number for pagination |
| `limit` | number | No | `20` | Results per page |

---

## Filter Options

### 1. `filter=all` (Default) - Search All Categories
Searches across people, posts, hashtags, and locations simultaneously.

**Example Request:**
```bash
GET /api/v1/user/search?q=travel&filter=all&page=1&limit=20
```

**Response:**
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
      "count": 15
    },
    "hashtags": {
      "results": [...],
      "count": 8
    },
    "location": {
      "results": [...],
      "count": 3
    },
    "totalResults": 31,
    "pagination": {
      "page": 1,
      "limit": 20
    }
  }
}
```

---

### 2. `filter=people` - Search People Only
Searches users by full name or username.

**Example Request:**
```bash
GET /api/v1/user/search?q=john&filter=people&page=1&limit=20
```

**Response:**
```json
{
  "success": true,
  "data": {
    "type": "people",
    "results": [
      {
        "_id": "...",
        "username": "john_doe",
        "fullName": "John Doe",
        "profilePictureUrl": "...",
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

### 3. `filter=posts` - Search Posts Only
Searches posts by content, caption, hashtags, location, or mentions.

**Example Request:**
```bash
GET /api/v1/user/search?q=travel&filter=posts&page=1&limit=20
```

**With Mentions:**
```bash
GET /api/v1/user/search?q=@username travel&filter=posts&page=1&limit=20
```

**Response:**
```json
{
  "success": true,
  "data": {
    "type": "posts",
    "results": [
      {
        "_id": "...",
        "author": {
          "_id": "...",
          "username": "user123",
          "fullName": "User Name",
          "profilePictureUrl": "...",
          "verificationStatus": "approved"
        },
        "content": "Amazing travel experience!",
        "caption": "Travel memories",
        "hashtags": ["travel", "adventure"],
        "media": [...],
        "location": {
          "name": "Paris, France",
          "coordinates": { "lat": 48.8566, "lng": 2.3522 }
        },
        "likesCount": 10,
        "commentsCount": 5,
        "sharesCount": 2,
        "viewsCount": 100,
        "publishedAt": "2024-01-15T10:30:00Z"
      }
    ],
    "count": 15,
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 15,
      "pages": 1
    }
  }
}
```

---

### 4. `filter=hashtags` - Search Hashtags Only
Searches posts by hashtags. Can use `#hashtag` format or plain keyword.

**Example Request:**
```bash
GET /api/v1/user/search?q=#travel&filter=hashtags&page=1&limit=20
```

**Or:**
```bash
GET /api/v1/user/search?q=travel&filter=hashtags&page=1&limit=20
```

**Response:**
```json
{
  "success": true,
  "data": {
    "type": "hashtags",
    "results": [
      {
        "_id": "...",
        "author": {...},
        "content": "...",
        "hashtags": ["travel", "adventure"],
        "media": [...],
        "publishedAt": "2024-01-15T10:30:00Z"
      }
    ],
    "count": 8,
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 8,
      "pages": 1
    }
  }
}
```

---

### 5. `filter=location` - Search by Location Only
Searches posts by location name, address, city, or country.

**Example Request:**
```bash
GET /api/v1/user/search?q=Paris&filter=location&page=1&limit=20
```

**Response:**
```json
{
  "success": true,
  "data": {
    "type": "location",
    "results": [
      {
        "_id": "...",
        "author": {...},
        "content": "...",
        "location": {
          "name": "Paris, France",
          "address": "123 Main St",
          "city": "Paris",
          "country": "France",
          "coordinates": { "lat": 48.8566, "lng": 2.3522 }
        },
        "publishedAt": "2024-01-15T10:30:00Z"
      }
    ],
    "count": 3,
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 3,
      "pages": 1
    }
  }
}
```

---

### 6. No Query (Explore Feed)
If no `q` parameter is provided, returns all public posts (explore/discovery feed).

**Example Request:**
```bash
GET /api/v1/user/search?page=1&limit=20
```

**Response:**
```json
{
  "success": true,
  "message": "Explore feed - all public posts",
  "data": {
    "type": "posts",
    "results": [...],
    "count": 20,
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "pages": 8
    }
  }
}
```

---

## Complete Examples

### Example 1: Search Everything for "travel"
```bash
curl -X GET "https://api.example.com/api/v1/user/search?q=travel&filter=all&page=1&limit=20" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Example 2: Search Only People Named "John"
```bash
curl -X GET "https://api.example.com/api/v1/user/search?q=john&filter=people&page=1&limit=10" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Example 3: Search Posts with Hashtag
```bash
curl -X GET "https://api.example.com/api/v1/user/search?q=%23travel&filter=hashtags&page=1&limit=20" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Example 4: Search Posts with Mentions
```bash
curl -X GET "https://api.example.com/api/v1/user/search?q=%40username%20travel&filter=posts&page=1&limit=20" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Example 5: Search by Location
```bash
curl -X GET "https://api.example.com/api/v1/user/search?q=New%20York&filter=location&page=1&limit=20" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Example 6: Explore Feed (No Query)
```bash
curl -X GET "https://api.example.com/api/v1/user/search?page=1&limit=20" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## JavaScript/Fetch Examples

### Search All Categories
```javascript
const searchAll = async (keyword, page = 1, limit = 20) => {
  const response = await fetch(
    `/api/v1/user/search?q=${encodeURIComponent(keyword)}&filter=all&page=${page}&limit=${limit}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  );
  return await response.json();
};
```

### Search People
```javascript
const searchPeople = async (keyword, page = 1, limit = 20) => {
  const response = await fetch(
    `/api/v1/user/search?q=${encodeURIComponent(keyword)}&filter=people&page=${page}&limit=${limit}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  );
  return await response.json();
};
```

### Search Posts
```javascript
const searchPosts = async (keyword, page = 1, limit = 20) => {
  const response = await fetch(
    `/api/v1/user/search?q=${encodeURIComponent(keyword)}&filter=posts&page=${page}&limit=${limit}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  );
  return await response.json();
};
```

### Search Hashtags
```javascript
const searchHashtags = async (hashtag, page = 1, limit = 20) => {
  const response = await fetch(
    `/api/v1/user/search?q=${encodeURIComponent(hashtag)}&filter=hashtags&page=${page}&limit=${limit}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  );
  return await response.json();
};
```

### Search Location
```javascript
const searchLocation = async (location, page = 1, limit = 20) => {
  const response = await fetch(
    `/api/v1/user/search?q=${encodeURIComponent(location)}&filter=location&page=${page}&limit=${limit}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  );
  return await response.json();
};
```

### Explore Feed
```javascript
const getExploreFeed = async (page = 1, limit = 20) => {
  const response = await fetch(
    `/api/v1/user/search?page=${page}&limit=${limit}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  );
  return await response.json();
};
```

---

## Notes

1. **Blocked Users**: All search results automatically exclude:
   - Users you have blocked
   - Users who have blocked you

2. **Privacy**: Only public posts are returned in search results

3. **Pagination**: Use `page` and `limit` parameters for pagination

4. **Special Characters**:
   - Hashtags: Use `#hashtag` or URL encode as `%23hashtag`
   - Mentions: Use `@username` or URL encode as `%40username`

5. **Empty Results**: If no keyword is provided and filter is not 'all', returns empty results with pagination info

6. **Case Insensitive**: All text searches are case-insensitive

---

## Error Responses

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Missing or invalid Authorization header"
}
```

### 400 Bad Request
```json
{
  "success": false,
  "message": "Invalid filter type"
}
```

### 500 Server Error
```json
{
  "success": false,
  "message": "Failed to search"
}
```

