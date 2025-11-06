# Posts & Stories API - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Step 1: Authentication
```http
Authorization: Bearer <your-jwt-token>
```

### Step 2: Choose Your Content Type

---

## 📝 POSTS (Permanent Content)

### Create Your First Post
```bash
curl -X POST http://localhost:3000/api/user/posts \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Hello World! #firstpost"
  }'
```

### View Your Feed
```bash
curl -X GET http://localhost:3000/api/user/posts/feed \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Like a Post
```bash
curl -X POST http://localhost:3000/api/user/posts/POST_ID/like \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Add Comment
```bash
curl -X POST http://localhost:3000/api/user/posts/POST_ID/comment \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Great post!"
  }'
```

---

## 📖 STORIES (24-Hour Content)

### Create Your First Story
```bash
curl -X POST http://localhost:3000/api/user/stories \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "content=Quick update! #daily" \
  -F "privacy=public"
```

### View Stories Feed
```bash
curl -X GET http://localhost:3000/api/user/stories/feed \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Reply to Story
```bash
curl -X POST http://localhost:3000/api/user/stories/STORY_ID/replies \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Nice story!",
    "isDirectMessage": true
  }'
```

---

## 🎯 Common Tasks

### Upload Post with Image
```javascript
const formData = new FormData();
formData.append('content', 'Check this out! #photo');
formData.append('files', imageFile);

fetch('http://localhost:3000/api/user/posts', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData
});
```

### Search Posts
```javascript
fetch('http://localhost:3000/api/user/posts/search?q=travel&page=1&limit=20', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### Get Trending
```javascript
fetch('http://localhost:3000/api/user/posts/trending?hours=24&limit=20', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### Browse Hashtag
```javascript
fetch('http://localhost:3000/api/user/posts/hashtag/nature?page=1&limit=20', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

---

## 📊 Quick Reference

### Posts
- **Endpoint**: `/api/user/posts`
- **Total APIs**: 17
- **Content**: 2200 chars max
- **Media**: Multiple images/videos
- **Lifetime**: Permanent
- **Privacy**: All public
- **Engagement**: Likes, Comments, Shares

### Stories
- **Endpoint**: `/api/user/stories`
- **Total APIs**: 9
- **Content**: 2200 chars max
- **Media**: Single image/video
- **Lifetime**: 24 hours
- **Privacy**: Public, Followers, Close Friends
- **Engagement**: Views, Replies

---

## 🎨 Request/Response Examples

### Create Post Response
```json
{
  "success": true,
  "message": "Post created successfully",
  "data": {
    "_id": "post123",
    "content": "Hello World!",
    "likesCount": 0,
    "commentsCount": 0,
    "status": "published"
  }
}
```

### Create Story Response
```json
{
  "success": true,
  "message": "Story created successfully",
  "data": {
    "_id": "story456",
    "content": "Quick update!",
    "privacy": "public",
    "expiresAt": "2024-01-16T10:30:00Z",
    "timeRemaining": 86400
  }
}
```

---

## ⚠️ Important Notes

### Posts
- ✅ All posts are public (no privacy controls)
- ✅ Only images and videos (no audio/documents)
- ✅ Multiple media per post allowed
- ✅ Nested comments supported
- ✅ Location tagging available

### Stories
- ⏰ Auto-delete after 24 hours
- 🔒 Privacy controls available (3 levels)
- 📸 Single media per story
- 💬 Replies are simple (not nested)
- 🚫 No location tagging

---

## 📚 Full Documentation

For complete API reference, data models, examples, and best practices:

👉 **[POSTS_AND_STORIES_COMPLETE_DOCUMENTATION.md](./POSTS_AND_STORIES_COMPLETE_DOCUMENTATION.md)**

---

## 🧪 Testing

Import the Postman collection:
```
scriptFiles/corrected-postman-collection.json
```

Set environment variables:
- `BASE_URL`: http://localhost:3000
- `USER_ACCESS_TOKEN`: Your JWT token

---

## 💡 Pro Tips

1. **Start with simple text posts** to understand the flow
2. **Use the feed endpoint** to see content from followed users
3. **Test media upload** with small files first
4. **Explore hashtags** for content discovery
5. **Check analytics** to track post performance
6. **Try stories** for temporary, time-sensitive content

---

**Need detailed info?** Read the **[Complete Documentation](./POSTS_AND_STORIES_COMPLETE_DOCUMENTATION.md)**

**Version:** 1.0.0 | **Updated:** Jan 2024 | **Status:** ✅ Ready



