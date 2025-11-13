# Search API - Complete Filter & Scenario Documentation

## Table of Contents
1. [Overview](#overview)
2. [API Endpoint](#api-endpoint)
3. [Query Parameters](#query-parameters)
4. [Filter Types](#filter-types)
5. [Scenarios & Use Cases](#scenarios--use-cases)
6. [Response Formats](#response-formats)
7. [Search Behavior Details](#search-behavior-details)
8. [Privacy & Security](#privacy--security)
9. [Edge Cases](#edge-cases)
10. [Examples](#examples)

---

## Overview

The Search API provides a unified endpoint for searching across multiple content types in the VibgyorNode platform. It supports searching for people, posts, hashtags, and locations with flexible filtering options.

**Base URL:** `GET /api/v1/user/search`

**Authentication:** Required (Bearer Token)

---

## API Endpoint

```
GET /api/v1/user/search
```

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

---

## Query Parameters

| Parameter | Type | Required | Default | Description | Example |
|-----------|------|----------|---------|-------------|---------|
| `q` | string | No | `''` | Search keyword/query. Can include hashtags (#tag), mentions (@username), or plain text | `travel`, `#travel`, `@john travel` |
| `filter` | string | No | `'all'` | Filter type to narrow search scope | `all`, `people`, `posts`, `hashtags`, `location` |
| `page` | number | No | `1` | Page number for pagination (starts at 1) | `1`, `2`, `3` |
| `limit` | number | No | `20` | Number of results per page (max recommended: 50) | `10`, `20`, `50` |

---

## Filter Types

### 1. `filter=all` (Default)

**Description:** Searches across all categories simultaneously (people, posts, hashtags, locations).

**Behavior:**
- Executes parallel searches across all categories
- Returns results grouped by category
- If no query provided, returns explore feed (all public posts)

**Search Fields:**
- **People:** `fullName`, `username`
- **Posts:** `content`, `caption`, `hashtags`, `location.name`, `mentions.user`
- **Hashtags:** Post `hashtags` array
- **Location:** `location.name`, `location.address`, `location.city`, `location.country`

**Response Structure:**
```json
{
  "people": { "results": [...], "count": number },
  "posts": { "results": [...], "count": number },
  "hashtags": { "results": [...], "count": number },
  "location": { "results": [...], "count": number },
  "totalResults": number,
  "pagination": { "page": number, "limit": number }
}
```

---

### 2. `filter=people`

**Description:** Searches for users by name or username only.

**Behavior:**
- Requires a search query (`q` parameter)
- Returns empty results if no query provided
- Case-insensitive partial matching
- Searches both `fullName` and `username` fields

**Search Fields:**
- `fullName` - User's full name
- `username` - User's username

**Sorting:**
1. Verified users first (`verificationStatus: 'approved'`)
2. Then by creation date (newest first)

**Response Structure:**
```json
{
  "type": "people",
  "results": [
    {
      "_id": "user_id",
      "username": "john_doe",
      "fullName": "John Doe",
      "profilePictureUrl": "url",
      "verificationStatus": "approved" | "pending" | "none" | "rejected"
    }
  ],
  "count": number,
  "pagination": {
    "page": number,
    "limit": number,
    "total": number,
    "pages": number
  }
}
```

**Filters Applied:**
- Excludes blocked users
- Excludes users who blocked you
- Only active users (`isActive: true`)

---

### 3. `filter=posts`

**Description:** Searches for posts by content, caption, hashtags, location, or mentions.

**Behavior:**
- If no query provided, returns all public posts (explore feed)
- Supports multiple search criteria simultaneously
- Extracts and processes mentions (`@username`) from query
- Case-insensitive partial matching

**Search Fields:**
- `content` - Post content text
- `caption` - Post caption text
- `hashtags` - Array of hashtags (regex match)
- `location.name` - Location name
- `mentions.user` - Mentioned user IDs (extracted from `@username` in query)

**Sorting:**
- By `publishedAt` (newest first)

**Response Structure:**
```json
{
  "type": "posts",
  "results": [
    {
      "_id": "post_id",
      "author": {
        "_id": "user_id",
        "username": "username",
        "fullName": "Full Name",
        "profilePictureUrl": "url",
        "verificationStatus": "approved"
      },
      "content": "Post content",
      "caption": "Post caption",
      "hashtags": ["tag1", "tag2"],
      "media": [...],
      "location": {
        "name": "Location Name",
        "coordinates": { "lat": number, "lng": number },
        "address": "Address",
        "city": "City",
        "country": "Country"
      },
      "mentions": [
        {
          "user": { "_id": "user_id", "username": "username" },
          "position": { "start": number, "end": number },
          "context": "content"
        }
      ],
      "likesCount": number,
      "commentsCount": number,
      "sharesCount": number,
      "viewsCount": number,
      "publishedAt": "ISO_date_string"
    }
  ],
  "count": number,
  "pagination": {
    "page": number,
    "limit": number,
    "total": number,
    "pages": number
  }
}
```

**Filters Applied:**
- Only published posts (`status: 'published'`)
- Only public posts (`visibility: 'public'`)
- Excludes posts from blocked users
- Excludes posts from users who blocked you

**Special Features:**
- **Mention Extraction:** If query contains `@username`, searches for posts mentioning that user
- **Hashtag Matching:** Matches hashtags in query against post hashtags array
- **Location Matching:** Searches location name field

---

### 4. `filter=hashtags`

**Description:** Searches for posts by hashtags only.

**Behavior:**
- **With `#` symbol:** Extracts hashtags from query (e.g., `#travel` → `travel`)
- **Without `#` symbol:** Uses entire keyword as hashtag search term (e.g., `travel` → searches for hashtag "travel")
- Returns empty results if no query provided
- Case-insensitive matching
- **Always searches the `hashtags` column regardless of `#` presence**

**Search Fields:**
- `hashtags` - Array of hashtags in posts (always searched, even without `#`)

**Processing Logic:**
1. Attempts to extract hashtags from query using regex `/#\w+/g`
2. **If hashtags found (`#` present):**
   - Removes `#` symbol from each hashtag
   - Converts to lowercase
   - Uses extracted hashtags for search
3. **If no hashtags found (`#` NOT present):**
   - Uses entire keyword as hashtag search term
   - Converts to lowercase
   - Searches `hashtags` array with the keyword
4. Matches against post `hashtags` array using `$in` operator

**Response Structure:**
```json
{
  "type": "hashtags",
  "results": [
    {
      "_id": "post_id",
      "author": {...},
      "content": "...",
      "hashtags": ["travel", "adventure"],
      "media": [...],
      "publishedAt": "ISO_date_string"
    }
  ],
  "count": number,
  "pagination": {
    "page": number,
    "limit": number,
    "total": number,
    "pages": number
  }
}
```

**Filters Applied:**
- Only published posts
- Only public posts
- Excludes posts from blocked users

**Example Queries:**
- `q=#travel` → searches for posts with hashtag "travel" (extracts from `#travel`)
- `q=travel` → **searches for posts with hashtag "travel"** (uses "travel" as hashtag search term, even without `#`)
- `q=#travel #adventure` → searches for posts with either "travel" or "adventure" (extracts both)
- `q=travel adventure` → searches for posts with hashtag "travel adventure" (single term, no `#`)

**Important:** The `#` symbol is optional. Both `q=travel` and `q=#travel` will search the `hashtags` column for "travel".

---

### 5. `filter=location`

**Description:** Searches for posts by location information.

**Behavior:**
- Requires a search query
- Returns empty results if no query provided
- Searches multiple location fields
- Case-insensitive partial matching

**Search Fields:**
- `location.name` - Location name (e.g., "Paris", "Eiffel Tower")
- `location.address` - Street address
- `location.city` - City name
- `location.country` - Country name

**Response Structure:**
```json
{
  "type": "location",
  "results": [
    {
      "_id": "post_id",
      "author": {...},
      "content": "...",
      "location": {
        "name": "Paris, France",
        "coordinates": { "lat": 48.8566, "lng": 2.3522 },
        "address": "123 Main St",
        "city": "Paris",
        "country": "France",
        "placeId": "ChIJD7fiBh9u5kcRYJSMaMOCCwQ",
        "placeType": "locality",
        "accuracy": "exact",
        "isVisible": true
      },
      "publishedAt": "ISO_date_string"
    }
  ],
  "count": number,
  "pagination": {
    "page": number,
    "limit": number,
    "total": number,
    "pages": number
  }
}
```

**Filters Applied:**
- Only published posts
- Only public posts
- Excludes posts from blocked users

---

## Scenarios & Use Cases

### Scenario 1: General Search (All Categories)

**Use Case:** User wants to search for "travel" across all content types.

**Request:**
```
GET /api/v1/user/search?q=travel&filter=all&page=1&limit=20
```

**Behavior:**
- Searches people with name/username containing "travel"
- Searches posts with content/caption/hashtags/location containing "travel"
- Searches posts with hashtag "travel"
- Searches posts with location containing "travel"
- Returns all results grouped by category

**Response:** Combined results from all categories

---

### Scenario 2: Find User by Name

**Use Case:** User wants to find a specific person named "John".

**Request:**
```
GET /api/v1/user/search?q=john&filter=people&page=1&limit=20
```

**Behavior:**
- Searches only in `fullName` and `username` fields
- Returns user profiles matching "john"
- Verified users appear first
- Excludes blocked users

**Response:** Array of user profiles

---

### Scenario 3: Search Posts with Keyword

**Use Case:** User wants to find posts about "travel".

**Request:**
```
GET /api/v1/user/search?q=travel&filter=posts&page=1&limit=20
```

**Behavior:**
- Searches in post content, caption, hashtags, and location
- Returns posts matching "travel" in any of these fields
- Only public, published posts
- Excludes blocked users' posts

**Response:** Array of post objects

---

### Scenario 4: Search Posts with Hashtag

**Use Case:** User wants to find posts tagged with "#travel" or "travel".

**Request (with `#`):**
```
GET /api/v1/user/search?q=#travel&filter=hashtags&page=1&limit=20
```

**Request (without `#`):**
```
GET /api/v1/user/search?q=travel&filter=hashtags&page=1&limit=20
```

**Behavior:**
- **With `#`:** Extracts hashtag "travel" from `#travel`
- **Without `#`:** Uses "travel" directly as hashtag search term
- Both queries search the `hashtags` column for "travel"
- Case-insensitive matching
- Returns posts with matching hashtags

**Response:** Array of post objects with matching hashtags

**Note:** Both queries produce identical results. The `#` symbol is optional when using `filter=hashtags`.

---

### Scenario 5: Search Posts with Mention

**Use Case:** User wants to find posts mentioning "@username".

**Request:**
```
GET /api/v1/user/search?q=@username travel&filter=posts&page=1&limit=20
```

**Behavior:**
- Extracts "@username" from query
- Resolves username to user ID
- Searches posts mentioning that user
- Also searches for "travel" in content/caption/hashtags/location
- Combines both criteria with OR logic

**Response:** Array of post objects matching mention or keyword

---

### Scenario 6: Search by Location

**Use Case:** User wants to find posts from "Paris".

**Request:**
```
GET /api/v1/user/search?q=Paris&filter=location&page=1&limit=20
```

**Behavior:**
- Searches in location name, address, city, and country fields
- Returns posts with location matching "Paris"
- Case-insensitive partial matching

**Response:** Array of post objects with matching locations

---

### Scenario 7: Explore Feed (No Query)

**Use Case:** User wants to browse all public posts (discovery feed).

**Request:**
```
GET /api/v1/user/search?page=1&limit=20
```

**Behavior:**
- Returns all public, published posts
- Sorted by newest first
- Excludes blocked users' posts
- Works with `filter=all` or `filter=posts` (defaults to posts)

**Response:** Array of all public posts

---

### Scenario 8: Empty Query with People Filter

**Use Case:** User searches for people without providing a query.

**Request:**
```
GET /api/v1/user/search?q=&filter=people&page=1&limit=20
```

**Behavior:**
- Returns empty results
- Returns pagination structure with zeros

**Response:**
```json
{
  "success": true,
  "message": "No search keyword provided",
  "data": {
    "results": [],
    "count": 0,
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 0,
      "pages": 0
    }
  }
}
```

---

### Scenario 9: Pagination

**Use Case:** User wants to load more results (page 2).

**Request:**
```
GET /api/v1/user/search?q=travel&filter=all&page=2&limit=20
```

**Behavior:**
- Calculates skip: `(page - 1) * limit = (2 - 1) * 20 = 20`
- Returns results 21-40
- Maintains same search criteria

**Response:** Paginated results with updated page number

---

### Scenario 10: Multiple Hashtags

**Use Case:** User searches for posts with multiple hashtags.

**Request:**
```
GET /api/v1/user/search?q=#travel #adventure&filter=hashtags&page=1&limit=20
```

**Behavior:**
- Extracts both hashtags: ["travel", "adventure"]
- Searches posts with either hashtag (OR logic)
- Returns posts matching any of the hashtags

**Response:** Array of posts with matching hashtags

---

## Response Formats

### Success Response Structure

**Standard Response:**
```json
{
  "success": true,
  "message": "Optional message",
  "data": {
    // Response data (varies by filter)
  }
}
```

### Filter-Specific Responses

#### `filter=all` Response
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

#### `filter=people` Response
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

#### `filter=posts` Response
```json
{
  "success": true,
  "data": {
    "type": "posts",
    "results": [
      {
        "_id": "post_id",
        "author": {
          "_id": "user_id",
          "username": "username",
          "fullName": "Full Name",
          "profilePictureUrl": "https://...",
          "verificationStatus": "approved"
        },
        "content": "Post content...",
        "caption": "Post caption",
        "hashtags": ["tag1", "tag2"],
        "media": [
          {
            "type": "video",
            "url": "https://...",
            "thumbnail": "https://...",
            "filename": "video.mp4",
            "fileSize": 5000000,
            "mimeType": "video/mp4",
            "duration": 120,
            "dimensions": { "width": 1920, "height": 1080 },
            "s3Key": "posts/video/video.mp4"
          }
        ],
        "location": {
          "name": "Location Name",
          "coordinates": { "lat": 48.8566, "lng": 2.3522 },
          "address": "123 Main St",
          "city": "City",
          "country": "Country",
          "placeId": "ChIJD7fiBh9u5kcRYJSMaMOCCwQ",
          "placeType": "locality",
          "accuracy": "exact",
          "isVisible": true
        },
        "mentions": [
          {
            "user": {
              "_id": "mentioned_user_id",
              "username": "mentioned_user"
            },
            "position": { "start": 0, "end": 10 },
            "context": "content"
          }
        ],
        "likesCount": 10,
        "commentsCount": 5,
        "sharesCount": 2,
        "viewsCount": 100,
        "status": "published",
        "visibility": "public",
        "publishedAt": "2024-01-15T10:30:00.000Z",
        "createdAt": "2024-01-15T10:30:00.000Z",
        "updatedAt": "2024-01-15T10:30:00.000Z"
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

#### `filter=hashtags` Response
```json
{
  "success": true,
  "data": {
    "type": "hashtags",
    "results": [
      {
        "_id": "post_id",
        "author": {...},
        "content": "...",
        "hashtags": ["travel", "adventure"],
        "media": [...],
        "publishedAt": "2024-01-15T10:30:00.000Z"
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

#### `filter=location` Response
```json
{
  "success": true,
  "data": {
    "type": "location",
    "results": [
      {
        "_id": "post_id",
        "author": {...},
        "content": "...",
        "location": {
          "name": "Paris, France",
          "coordinates": { "lat": 48.8566, "lng": 2.3522 },
          "address": "123 Main St",
          "city": "Paris",
          "country": "France"
        },
        "publishedAt": "2024-01-15T10:30:00.000Z"
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

### Error Responses

#### 401 Unauthorized
```json
{
  "success": false,
  "message": "Missing or invalid Authorization header",
  "error": "UNAUTHORIZED"
}
```

#### 400 Bad Request
```json
{
  "success": false,
  "message": "Invalid filter type",
  "error": "BAD_REQUEST"
}
```

#### 404 Not Found
```json
{
  "success": false,
  "message": "User not found",
  "error": "NOT_FOUND"
}
```

#### 500 Server Error
```json
{
  "success": false,
  "message": "Failed to search",
  "error": "INTERNAL_SERVER_ERROR"
}
```

---

## Search Behavior Details

### Query Processing

1. **Input Processing:**
   - Trims whitespace
   - Extracts hashtags using regex `/#\w+/g`
   - Separates keywords from hashtags
   - Preserves original input for reference

2. **Mention Extraction:**
   - Extracts mentions using regex `/@\w+/g`
   - Resolves usernames to user IDs
   - Used in post search queries

3. **Hashtag Processing:**
   - Removes `#` symbol
   - Converts to lowercase
   - Matches against post hashtags array

### Search Logic

**People Search:**
- Uses `$or` for `fullName` and `username`
- Case-insensitive regex matching
- Excludes blocked users

**Posts Search:**
- Uses `$or` for multiple fields:
  - `content`
  - `caption`
  - `hashtags` (array match)
  - `location.name`
  - `mentions.user` (if mentions found)
- All conditions combined with OR logic

**Hashtags Search:**
- Uses `$in` operator for array matching
- Case-insensitive matching
- Supports multiple hashtags

**Location Search:**
- Uses `$or` for multiple location fields:
  - `location.name`
  - `location.address`
  - `location.city`
  - `location.country`
- Case-insensitive regex matching

### Sorting

**People:**
1. Verified users first (`verificationStatus: -1`)
2. Then by creation date (`createdAt: -1`)

**Posts:**
- By publication date (`publishedAt: -1`) - newest first

### Pagination

**Calculation:**
```javascript
skip = (page - 1) * limit
```

**Example:**
- Page 1, Limit 20: skip = 0, returns results 1-20
- Page 2, Limit 20: skip = 20, returns results 21-40
- Page 3, Limit 20: skip = 40, returns results 41-60

**Response Includes:**
- Current page number
- Results per page (limit)
- Total results count
- Total pages count

---

## Privacy & Security

### Blocked Users Filtering

**Applied to All Searches:**
- Users you have blocked are excluded
- Users who have blocked you are excluded
- Posts from blocked users are excluded
- Posts from users who blocked you are excluded

**Implementation:**
```javascript
{
  $and: [
    { author: { $nin: [...blockedUsers, ...blockedBy] } },
    // ... other conditions
  ]
}
```

### Post Visibility

**Only Public Posts:**
- Only posts with `visibility: 'public'` are returned
- Posts with `visibility: 'followers'` are excluded
- Ensures privacy of follower-only content

### Post Status

**Only Published Posts:**
- Only posts with `status: 'published'` are returned
- Drafts, archived, and deleted posts are excluded

### User Status

**Only Active Users:**
- Only users with `isActive: true` appear in people search
- Inactive users are excluded

### Authentication

**Required for All Requests:**
- Bearer token must be present in Authorization header
- Token is validated before processing search
- User ID extracted from token for blocking logic

---

## Edge Cases

### 1. Empty Query

**Scenario:** `q=` or `q` not provided

**Behavior by Filter:**
- `filter=all`: Returns explore feed (all public posts)
- `filter=posts`: Returns explore feed (all public posts)
- `filter=people`: Returns empty results
- `filter=hashtags`: Returns empty results
- `filter=location`: Returns empty results

### 2. Invalid Filter

**Scenario:** `filter=invalid`

**Behavior:**
- Returns 400 Bad Request
- Error message: "Invalid filter type"

### 3. Special Characters in Query

**Scenario:** Query contains special characters

**Behavior:**
- URL encode special characters
- **Hashtags:** 
  - `#travel` → `%23travel` (URL encoded) or use `#travel` directly
  - **Important:** For `filter=hashtags`, the `#` symbol is optional. Both `travel` and `#travel` search the hashtags column
- Mentions: `@username` → `%40username` or use `@username` directly
- Spaces: `travel adventure` → `travel%20adventure` or use `+`

### 4. Very Long Query

**Scenario:** Query exceeds reasonable length

**Behavior:**
- No explicit length limit enforced
- MongoDB regex handles long queries
- Performance may degrade with very long queries

### 5. Non-existent Mentions

**Scenario:** Query contains `@nonexistentuser`

**Behavior:**
- Mention extraction returns empty array
- Search continues with other criteria
- No error thrown

### 6. No Results Found

**Scenario:** Search query matches no results

**Behavior:**
- Returns empty results array
- Pagination shows `total: 0`, `pages: 0`
- Success response (not an error)

### 7. Large Page Number

**Scenario:** `page=999` with limited results

**Behavior:**
- Returns empty results array
- Pagination shows correct total and pages
- No error thrown

### 8. Zero or Negative Limit

**Scenario:** `limit=0` or `limit=-5`

**Behavior:**
- MongoDB handles gracefully
- May return unexpected results
- Recommended: Validate on client side (min: 1, max: 50)

### 9. Multiple Filters (Not Supported)

**Scenario:** Attempting `filter=people,posts`

**Behavior:**
- Treated as invalid filter
- Returns 400 Bad Request
- Use `filter=all` instead

### 10. Case Sensitivity

**Scenario:** Query with mixed case

**Behavior:**
- All text searches are case-insensitive
- `Travel`, `TRAVEL`, `travel` all match the same results

---

## Examples

### Example 1: General Search
```bash
curl -X GET "https://api.example.com/api/v1/user/search?q=travel&filter=all&page=1&limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Example 2: Find User
```bash
curl -X GET "https://api.example.com/api/v1/user/search?q=john%20doe&filter=people&page=1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Example 3: Search Posts
```bash
curl -X GET "https://api.example.com/api/v1/user/search?q=amazing%20travel&filter=posts&page=1&limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Example 4: Hashtag Search (with #)
```bash
curl -X GET "https://api.example.com/api/v1/user/search?q=%23travel&filter=hashtags&page=1&limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Example 4b: Hashtag Search (without #)
```bash
# Both queries produce identical results - # is optional
curl -X GET "https://api.example.com/api/v1/user/search?q=travel&filter=hashtags&page=1&limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Example 5: Location Search
```bash
curl -X GET "https://api.example.com/api/v1/user/search?q=Paris&filter=location&page=1&limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Example 6: Posts with Mention
```bash
curl -X GET "https://api.example.com/api/v1/user/search?q=%40username%20travel&filter=posts&page=1&limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Example 7: Explore Feed
```bash
curl -X GET "https://api.example.com/api/v1/user/search?page=1&limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Example 8: Pagination
```bash
curl -X GET "https://api.example.com/api/v1/user/search?q=travel&filter=all&page=2&limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Example 9: Multiple Hashtags
```bash
curl -X GET "https://api.example.com/api/v1/user/search?q=%23travel%20%23adventure&filter=hashtags&page=1&limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Example 10: JavaScript Implementation
```javascript
class SearchAPI {
  constructor(baseURL, token) {
    this.baseURL = baseURL;
    this.token = token;
  }

  async search(keyword = '', filter = 'all', page = 1, limit = 20) {
    const params = new URLSearchParams();
    if (keyword) params.append('q', keyword);
    params.append('filter', filter);
    params.append('page', page);
    params.append('limit', limit);

    const response = await fetch(`${this.baseURL}/api/v1/user/search?${params}`, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Search failed: ${response.statusText}`);
    }

    return await response.json();
  }

  // Convenience methods
  async searchAll(keyword, page = 1, limit = 20) {
    return this.search(keyword, 'all', page, limit);
  }

  async searchPeople(keyword, page = 1, limit = 20) {
    return this.search(keyword, 'people', page, limit);
  }

  async searchPosts(keyword, page = 1, limit = 20) {
    return this.search(keyword, 'posts', page, limit);
  }

  async searchHashtags(hashtag, page = 1, limit = 20) {
    return this.search(hashtag, 'hashtags', page, limit);
  }

  async searchLocation(location, page = 1, limit = 20) {
    return this.search(location, 'location', page, limit);
  }

  async getExploreFeed(page = 1, limit = 20) {
    return this.search('', 'posts', page, limit);
  }
}

// Usage
const searchAPI = new SearchAPI('https://api.example.com', 'YOUR_TOKEN');

// Search all
const allResults = await searchAPI.searchAll('travel');

// Search people
const people = await searchAPI.searchPeople('john');

// Search posts
const posts = await searchAPI.searchPosts('travel');

// Search hashtags
const hashtags = await searchAPI.searchHashtags('#travel');

// Search location
const location = await searchAPI.searchLocation('Paris');

// Explore feed
const feed = await searchAPI.getExploreFeed();
```

---

## Best Practices

1. **Pagination:**
   - Use reasonable page sizes (10-50)
   - Implement infinite scroll or "Load More" buttons
   - Cache results on client side

2. **Query Optimization:**
   - Use specific filters when possible (e.g., `filter=people` instead of `filter=all`)
   - Keep queries concise and relevant
   - Use hashtags for hashtag searches

3. **Error Handling:**
   - Always check `success` field in response
   - Handle empty results gracefully
   - Implement retry logic for network errors

4. **Performance:**
   - Debounce search input (wait 300-500ms after user stops typing)
   - Cache frequently searched terms
   - Use appropriate page sizes

5. **User Experience:**
   - Show loading states during search
   - Display "No results found" messages
   - Provide search suggestions/autocomplete
   - Highlight search terms in results

---

## Summary

The Search API provides a flexible, unified interface for searching across all content types in the VibgyorNode platform. Key features:

- **Single Endpoint:** One API for all search types
- **Multiple Filters:** Choose specific content types or search all
- **Privacy-Aware:** Automatically excludes blocked users and private content
- **Flexible Queries:** Supports keywords, hashtags, mentions, and locations
- **Hashtag Search:** The `#` symbol is **optional** when using `filter=hashtags`. Both `q=travel` and `q=#travel` search the hashtags column
- **Pagination:** Built-in pagination support
- **Performance:** Parallel queries for `filter=all`
- **Security:** Authentication required, respects user privacy settings

**Important Hashtag Behavior:**
When using `filter=hashtags`, the search always queries the `hashtags` column in posts, regardless of whether the `#` symbol is present in the query:
- `q=#travel` → Extracts "travel" from hashtag and searches hashtags column
- `q=travel` → Uses "travel" directly to search hashtags column
- Both produce identical results

For implementation details, refer to the controller code in `userSearchController.js`.

