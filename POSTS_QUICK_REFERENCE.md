# Posts API - Quick Reference Card

## 🚀 Base URL
```
/api/user/posts
```

---

## 📋 All Endpoints (17 Total)

### POST Requests (5)
```
✅ POST   /posts                      Create post
✅ POST   /posts/:postId/like         Like/unlike post
✅ POST   /posts/:postId/comment      Add comment
✅ POST   /posts/:postId/share        Share post
✅ POST   /posts/:postId/mentions     Add mention
✅ POST   /posts/:postId/report       Report post
```

### GET Requests (8)
```
✅ GET    /posts/feed                 Get personalized feed
✅ GET    /posts/search               Search posts
✅ GET    /posts/trending             Get trending posts
✅ GET    /posts/hashtag/:hashtag     Get posts by hashtag
✅ GET    /posts/:postId              Get single post
✅ GET    /posts/user/:userId         Get user's posts
✅ GET    /posts/:postId/comments     Get post comments
✅ GET    /posts/:postId/analytics    Get post analytics
```

### PUT Requests (2)
```
✅ PUT    /posts/:postId              Update post
✅ PUT    /posts/:postId/location     Update location
```

### DELETE Requests (1)
```
✅ DELETE /posts/:postId              Delete post
```

---

## 🎨 Request Examples

### Create Post
```json
POST /posts
{
  "content": "Hello! #test",
  "caption": "My caption",
  "privacy": "public",
  "location": {
    "name": "Paris",
    "coordinates": { "lat": 48.8566, "lng": 2.3522 }
  }
}
```

### Like Post
```json
POST /posts/:postId/like
// No body required
```

### Add Comment
```json
POST /posts/:postId/comment
{
  "content": "Great post!",
  "parentCommentId": null
}
```

### Share Post
```json
POST /posts/:postId/share
{
  "shareType": "repost",
  "shareMessage": "Amazing!"
}
```

---

## 📊 Response Format

### Success
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { /* response data */ }
}
```

### Error
```json
{
  "success": false,
  "message": "Error message",
  "statusCode": 400
}
```

### Paginated
```json
{
  "success": true,
  "data": {
    "posts": [ /* items */ ],
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

## 🔑 Authentication

```http
Authorization: Bearer <jwt-token>
```

---

## 📏 Limits

| Item | Limit |
|------|-------|
| Post Content | 2200 chars |
| Caption | 500 chars |
| Comment | 500 chars |
| Share Message | 200 chars |
| Report Description | 500 chars |

---

## 📸 Media

**Supported:**
- ✅ Images (JPG, PNG, GIF, WEBP)
- ✅ Videos (MP4, MOV, AVI, WebM)

**Not Supported:**
- ❌ Audio files
- ❌ Documents

---

## 🔒 Privacy

| Level | Who Sees |
|-------|----------|
| `public` | Everyone |
| `followers` | Followers only |
| `close_friends` | Close friends |
| `private` | Author only |

---

## 📊 Status

| Status | Meaning |
|--------|---------|
| `draft` | Not published |
| `published` | Live and visible |
| `archived` | Hidden from feed |
| `deleted` | Soft deleted |

---

## 🔔 Share Types

- `repost` - Simple share
- `quote` - Share with message
- `external` - External platform

---

## 🚨 Report Reasons

- `spam`
- `inappropriate`
- `harassment`
- `fake_news`
- `violence`
- `other`

---

## 📈 Metrics

```
Engagement Rate = ((Likes + Comments + Shares) / Views) × 100
```

---

## 💡 Quick Tips

1. **Always authenticate** - Include Bearer token
2. **Validate client-side** - Check limits before sending
3. **Handle errors gracefully** - Check success field
4. **Use pagination** - Don't load everything at once
5. **Optimize media** - Compress before upload
6. **Cache feeds** - Reduce API calls

---

## ⚡ Common Patterns

### Infinite Scroll Feed
```javascript
let page = 1;
async function loadMore() {
  const response = await fetch(
    `/posts/feed?page=${page}&limit=20`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await response.json();
  if (data.data.pagination.hasNext) {
    page++;
  }
  return data.data.posts;
}
```

### Optimistic Like
```javascript
// Update UI immediately
setLiked(true);
setLikesCount(prev => prev + 1);

// Then call API
try {
  await fetch(`/posts/${postId}/like`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
} catch (error) {
  // Revert on error
  setLiked(false);
  setLikesCount(prev => prev - 1);
}
```

---

## 🐛 Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| 400 | Validation failed | Check request body |
| 401 | Not authenticated | Include valid token |
| 403 | Not authorized | Check ownership |
| 404 | Post not found | Verify post ID |
| 500 | Server error | Contact support |

---

## 🎯 Use Cases

✅ Social media posting  
✅ Photo/video sharing  
✅ Blog-style content  
✅ News updates  
✅ Community engagement  
✅ Event announcements  
✅ Product showcases  

---

## 📚 Full Documentation

For complete details, see: **[POSTS_API_DOCUMENTATION.md](./POSTS_API_DOCUMENTATION.md)**

---

**Version:** 1.0.0 | **Updated:** Jan 2024 | **Status:** ✅ Ready

