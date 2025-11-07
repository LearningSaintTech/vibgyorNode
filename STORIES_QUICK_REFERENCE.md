# 📋 Stories API - Quick Reference Card

## 🚀 Quick Start

```bash
BASE_URL=http://localhost:3000/user/stories
AUTH=Authorization: Bearer YOUR_ACCESS_TOKEN
```

---

## 📡 All Endpoints (9 Total)

| # | Endpoint | Method | Purpose |
|---|----------|--------|---------|
| 1 | `/user/stories` | POST | Create story |
| 2 | `/user/stories/feed` | GET | Get stories feed |
| 3 | `/user/stories/user/:userId` | GET | Get user's stories |
| 4 | `/user/stories/:storyId` | GET | View single story |
| 5 | `/user/stories/:storyId/replies` | POST | Reply to story |
| 6 | `/user/stories/:storyId` | DELETE | Delete story |
| 7 | `/user/stories/:storyId/report` | POST | Report story |
| 8 | `/user/stories/:storyId/analytics` | GET | Get analytics |
| 9 | `/user/stories/hashtag/:hashtag` | GET | Search by hashtag |

---

## 🎯 Common Workflows

### 1. Create Story
```bash
POST /user/stories
Content-Type: multipart/form-data

Form Data:
- files: [image/video]
- content: "Text @mention #hashtag"
- privacy: "public" | "followers" | "close_friends"
```

### 2. View Stories Feed
```bash
GET /user/stories/feed?page=1&limit=20

Response includes:
- hasViewed: true/false per story
- hasUnviewedStories: true/false per author
```

### 3. Watch Story
```bash
GET /user/stories/:storyId

Automatically:
- Tracks view (if not author)
- Sets hasViewed = true
- Increments viewsCount
```

### 4. Reply to Story
```bash
POST /user/stories/:storyId/replies
Content-Type: application/json

{
  "content": "Reply text",
  "isDirectMessage": true
}
```

### 5. Check Analytics
```bash
GET /user/stories/:storyId/analytics

Response:
- views count
- replies count  
- engagement rate
- time remaining
```

---

## 🎨 Frontend Quick Guide

### Display Story Rings (Instagram-like)

```jsx
{storiesFeed.map(({ author, stories, hasUnviewedStories }) => (
  <div className={hasUnviewedStories ? 'ring-new' : 'ring-seen'}>
    <img src={author.profilePictureUrl} />
  </div>
))}
```

### CSS for Rings

```css
/* Unwatched - colorful gradient */
.ring-new {
  background: linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366);
  border-radius: 50%;
  padding: 3px;
}

/* Watched - gray */
.ring-seen {
  background: #d1d5db;
  border-radius: 50%;
  padding: 3px;
}
```

### Auto-Skip to Unwatched

```javascript
const firstUnwatched = stories.findIndex(s => !s.hasViewed);
const startIndex = firstUnwatched !== -1 ? firstUnwatched : 0;
openStory(stories[startIndex]);
```

---

## 📦 Response Structure Examples

### Stories Feed
```json
{
  "storiesFeed": [
    {
      "author": { "username": "john_doe" },
      "stories": [
        {
          "_id": "story123",
          "content": "Text",
          "hasViewed": false  // ← Key flag
        }
      ],
      "hasUnviewedStories": true  // ← Key flag
    }
  ]
}
```

### Single Story
```json
{
  "_id": "story123",
  "author": {...},
  "content": "Amazing sunset!",
  "media": {
    "type": "image",
    "url": "https://..."
  },
  "hasViewed": true,  // ← Key flag
  "analytics": {
    "viewsCount": 42,
    "repliesCount": 5
  },
  "expiresAt": "2024-01-16T10:00:00Z"
}
```

---

## ⚡ Key Features

| Feature | Details |
|---------|---------|
| **Expiry** | Auto-expires in 24 hours |
| **View Tracking** | Silent tracking, no notifications |
| **Privacy** | public / followers / close_friends |
| **Media** | Images, videos, or text |
| **Max Size** | 10MB per file |
| **Text Limit** | 2200 characters |
| **Reply Limit** | 200 characters |
| **Mentions** | Auto-extracted from @username |
| **Hashtags** | Auto-extracted from #tag |

---

## 🔒 Privacy Levels

| Level | Who Can View |
|-------|--------------|
| `public` | Everyone |
| `followers` | Only followers |
| `close_friends` | Only close friends list |

---

## ✅ Best Practices

### Do's ✅
- Use hasViewed flag for colored/gray rings
- Paginate story feeds (don't load all at once)
- Cache viewed stories temporarily
- Show progress bars in story viewer
- Auto-skip to first unwatched story
- Validate file size before upload
- Handle errors gracefully

### Don'ts ❌
- Don't mark as viewed without opening story
- Don't show private stories to unauthorized users
- Don't forget to check expiry times
- Don't upload uncompressed media
- Don't make unnecessary API calls
- Don't ignore privacy settings

---

## 🚨 Common Errors

| Code | Message | Solution |
|------|---------|----------|
| 400 | Story has expired | Story is older than 24h |
| 403 | Cannot view this story | Check privacy settings |
| 404 | Story not found | Verify story ID |
| 403 | Can only delete own stories | User not author |
| 400 | Already reported | User already reported this story |

---

## 🧪 Testing Sequence

1. **Create story** → POST /user/stories
2. **Check feed** → GET /user/stories/feed (hasViewed = false)
3. **Watch story** → GET /user/stories/:id
4. **Check feed again** → (hasViewed = true, ring turns gray)
5. **Reply** → POST /user/stories/:id/replies
6. **Check analytics** → GET /user/stories/:id/analytics

---

## 📊 Story States

```
Active (0-24h) → Can be viewed, replied to
    ↓
Expired (>24h) → Only author can view
    ↓
Deleted → Not accessible
```

---

## 🎯 hasViewed Flag Logic

```javascript
// Story NOT watched yet
hasViewed: false → Show colorful ring

// Story watched
hasViewed: true → Show gray ring

// Author has any unwatched stories
hasUnviewedStories: true → Show colorful ring

// All author's stories watched
hasUnviewedStories: false → Show gray ring
```

---

## 💡 Pro Tips

1. **Preload next story** while current one is playing
2. **Sort feed** to show unwatched authors first
3. **Cache stories** in localStorage/sessionStorage
4. **Show badge** with unwatched count
5. **Use tap gestures** for next/previous story
6. **Auto-play videos** in story viewer
7. **Show "X views"** on own stories
8. **Add swipe-to-close** gesture

---

## 📱 Mobile-Friendly

```javascript
// Tap left = previous story
// Tap right = next story
// Tap center = pause/play
// Swipe down = close viewer
```

---

## 🔗 Related Endpoints

- **Upload media**: Use S3 service
- **Get user profile**: `/user/auth/profile`
- **Get followers**: `/user/social/followers`
- **Send DM**: Use messaging endpoints

---

## 📈 Analytics Metrics

```json
{
  "views": 42,           // Total unique views
  "replies": 5,          // Total replies
  "shares": 3,           // Total shares
  "engagementRate": 11.90, // (replies/views) * 100
  "timeRemaining": 43200  // Seconds until expiry
}
```

---

## 🎨 UI Components Needed

1. **Story Ring** - Avatar with colored/gray border
2. **Story Viewer** - Full-screen modal with media
3. **Progress Bars** - Show position in story sequence
4. **Reply Input** - Bottom input for replies
5. **Create Form** - Upload media + text input
6. **Analytics Card** - Show views/engagement
7. **Settings Modal** - Privacy options

---

## ⌨️ Postman Environment Variables

```javascript
// Set after login
USER_ACCESS_TOKEN: "eyJhbGc..."

// Auto-set after creating story
STORY_ID: "690c5ffcbdd0b95bb4d2d055"

// Auto-set from feed
USER_ID: "67861d2ab01852cf60c7d123"
```

---

## 🔄 Story Lifecycle

```
Create → Active (visible) → Viewed (tracked) → Expire (24h) → Deleted
```

---

## 🎉 You're All Set!

**See `STORIES_COMPLETE_GUIDE.md` for detailed documentation.**

**Test endpoints in Postman → Implement frontend → Deploy! 🚀**

