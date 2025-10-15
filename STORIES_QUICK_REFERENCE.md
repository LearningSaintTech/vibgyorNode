# Stories - Quick Reference Guide

## Quick Links
- [Main Documentation](./STORIES_FLOW_DOCUMENTATION.md)
- [API Documentation](./API_DOCUMENTATION.txt)

---

## API Endpoints Summary

### Stories (`/user/stories`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/` | Create story | ✓ |
| GET | `/feed` | Get stories feed | ✓ |
| GET | `/user/:userId` | Get user's stories | ✓ |
| GET | `/:storyId` | Get single story | ✓ |
| DELETE | `/:storyId` | Delete story | ✓ |
| POST | `/:storyId/reactions` | Add reaction | ✓ |
| DELETE | `/:storyId/reactions` | Remove reaction | ✓ |
| POST | `/:storyId/replies` | Reply to story | ✓ |
| POST | `/:storyId/polls/vote` | Vote in poll | ✓ |
| POST | `/:storyId/questions/answer` | Answer question | ✓ |
| GET | `/hashtag/:hashtag` | Search by hashtag | ✓ |
| GET | `/:storyId/analytics` | Get analytics | ✓ |
| POST | `/:storyId/report` | Report story | ✓ |

### Story Highlights (`/user/story-highlights`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/` | Create highlight | ✓ |
| GET | `/user/:userId` | Get user highlights | ✓ |
| GET | `/public` | Get public highlights | ✓ |
| GET | `/search` | Search highlights | ✓ |
| GET | `/:highlightId` | Get single highlight | ✓ |
| PUT | `/:highlightId` | Update highlight | ✓ |
| DELETE | `/:highlightId` | Delete highlight | ✓ |
| POST | `/:highlightId/stories` | Add story to highlight | ✓ |
| DELETE | `/:highlightId/stories` | Remove story | ✓ |
| PUT | `/:highlightId/stories/reorder` | Reorder stories | ✓ |
| PUT | `/:highlightId/cover-image` | Update cover | ✓ |

---

## Flow Diagrams

### 1. Story Creation Flow

```
┌─────────────┐
│ User Opens  │
│ Story UI    │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│ Select Content Type │
│ • Image/Video/Text  │
└──────┬──────────────┘
       │
       ▼
┌──────────────────────┐
│ Customize Content    │
│ • Filters            │
│ • Text/Background    │
│ • Stickers           │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Add Interactive      │
│ • Poll               │
│ • Question           │
│ • Music/Countdown    │
│ • Location/Mentions  │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Set Privacy          │
│ • Public             │
│ • Followers          │
│ • Close Friends      │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ POST /user/stories   │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Backend Processing:  │
│ 1. Upload to S3      │
│ 2. Create DB record  │
│ 3. Content moderation│
│ 4. Notify mentions   │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Story Published      │
│ • Visible in feed    │
│ • Auto-expires 24h   │
└──────────────────────┘
```

### 2. Story Viewing Flow

```
┌─────────────┐
│ User Opens  │
│ Stories     │
└──────┬──────┘
       │
       ▼
┌──────────────────────┐
│ GET /stories/feed    │
│ • Filtered by privacy│
│ • Grouped by author  │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Display Authors      │
│ with Active Stories  │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ User Selects Author  │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ GET /stories/:id     │
│ • Track view         │
│ • Increment count    │
│ • Notify author      │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Story Display        │
│ • Auto-play          │
│ • Timer countdown    │
│ • Interactive UI     │
└──────┬───────────────┘
       │
       ├────────────────┐
       │                │
       ▼                ▼
┌───────────┐    ┌──────────────┐
│ React     │    │ Reply/Vote   │
│ Swipe Up  │    │ Swipe Down   │
└───────────┘    └──────────────┘
```

### 3. Engagement Flow

```
┌──────────────────┐
│ User Views Story │
└────────┬─────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐ ┌──────┐
│ React  │ │ Reply│
└───┬────┘ └──┬───┘
    │         │
    │    ┌────┴─────┐
    │    │          │
    │    ▼          ▼
    │ ┌──────┐  ┌─────────┐
    │ │ DM   │  │ Public  │
    │ └──────┘  └─────────┘
    │
    ├─────────────┐
    │             │
    ▼             ▼
┌────────┐   ┌─────────┐
│ Vote   │   │ Answer  │
│ in Poll│   │Question │
└────────┘   └─────────┘
    │             │
    └──────┬──────┘
           │
           ▼
   ┌───────────────┐
   │ Notification  │
   │ to Author     │
   └───────────────┘
```

### 4. Highlight Creation Flow

```
┌──────────────────┐
│ User Profile     │
│ "New Highlight"  │
└────────┬─────────┘
         │
         ▼
┌──────────────────────┐
│ Select Past Stories  │
│ (including expired)  │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│ Customize:           │
│ • Name (required)    │
│ • Description        │
│ • Cover image        │
│ • Privacy            │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│ Reorder Stories      │
│ (drag & drop)        │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│ POST /story-         │
│ highlights           │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│ Upload cover to S3   │
│ Create DB record     │
│ Add stories          │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│ Highlight Published  │
│ on Profile           │
└──────────────────────┘
```

### 5. Content Moderation Flow

```
┌──────────────────┐
│ Story Created    │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────┐
│ Auto Content Moderation  │
│ • AI text analysis       │
│ • Risk scoring           │
│ • Keyword detection      │
└────────┬─────────────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐ ┌──────┐
│Risk 0-39│ │Risk  │
│ ALLOW   │ │40-100│
└─────────┘ └──┬───┘
               │
          ┌────┴─────┐
          │          │
          ▼          ▼
      ┌───────┐  ┌───────┐
      │40-59  │  │60-100 │
      │ FLAG  │  │HIDE/  │
      │       │  │DELETE │
      └───┬───┘  └───────┘
          │
          ▼
   ┌─────────────┐
   │ Admin Queue │
   └──────┬──────┘
          │
          ▼
   ┌──────────────┐
   │ Manual Review│
   └──────┬───────┘
          │
     ┌────┴────┐
     │         │
     ▼         ▼
┌─────────┐ ┌──────────┐
│Approve  │ │Reject/   │
│Restore  │ │Delete    │
└─────────┘ └──────────┘
```

---

## Key Validations

### Story Creation
```javascript
✓ Content OR media required
✓ Content max 2200 chars
✓ Media max 10MB
✓ Valid MIME types only
✓ Privacy: public/followers/close_friends
✓ Poll: min 2 options
✓ Countdown: future date
```

### Engagement
```javascript
✓ Story not expired
✓ Valid reaction type
✓ Reply max 200 chars
✓ No duplicate votes (unless allowed)
✓ No duplicate answers
✓ Valid option index
```

### Highlights
```javascript
✓ Name required (max 50 chars)
✓ Cover image required
✓ Only own stories
✓ No duplicate stories
✓ Max stories limit (default 100)
```

---

## Privacy Matrix

| Privacy Setting | Public | Followers | Close Friends |
|----------------|--------|-----------|---------------|
| **Who can view** | Everyone | User's followers | Selected users |
| **In public feed** | Yes | No | No |
| **Search visible** | Yes | No | No |
| **Direct link** | Anyone | Followers only | Close friends only |

---

## Data Models Quick Reference

### Story Schema
```javascript
{
  author: ObjectId,
  content: String (max 2200),
  media: {
    type: 'image' | 'video' | 'text',
    url: String,
    s3Key: String,
    // ... metadata
  },
  privacy: 'public' | 'followers' | 'close_friends',
  stickers: [{ type, content, position, ... }],
  poll: { question, options, votes, ... },
  question: { questionText, type, responses, ... },
  music: { track, startTime, endTime, ... },
  countdown: { title, endDate, format },
  location: { name, coordinates, ... },
  mentions: [{ user, position, ... }],
  views: [{ user, viewedAt, viewDuration }],
  reactions: [{ user, type, reactedAt }],
  replies: [{ user, content, repliedAt }],
  analytics: {
    viewsCount, reactionsCount,
    repliesCount, sharesCount,
    reach, impressions
  },
  expiresAt: Date, // Auto 24h
  status: 'active' | 'expired' | 'archived' | 'deleted'
}
```

### Highlight Schema
```javascript
{
  name: String (required, max 50),
  description: String (max 200),
  owner: ObjectId,
  coverImage: {
    type: 'image' | 'video_thumbnail',
    url: String,
    s3Key: String,
    // ... metadata
  },
  stories: [{
    story: ObjectId,
    addedAt: Date,
    order: Number
  }],
  privacy: 'public' | 'followers' | 'close_friends',
  settings: {
    allowStoryAddition: Boolean,
    maxStories: Number (default 100),
    autoArchive: Boolean,
    archiveAfterDays: Number
  },
  analytics: {
    viewsCount: Number,
    totalStories: Number
  },
  status: 'active' | 'archived' | 'deleted'
}
```

---

## Common Use Cases

### 1. Create Image Story with Poll
```bash
POST /user/stories
Content-Type: multipart/form-data

files: [image.jpg]
content: "What do you think?"
poll: {
  isPoll: true,
  question: "Which one?",
  options: ["Option A", "Option B"]
}
privacy: "public"
```

### 2. Create Text Story with Countdown
```bash
POST /user/stories

content: "New year countdown!"
countdown: {
  isCountdown: true,
  title: "2025 🎉",
  endDate: "2025-01-01T00:00:00Z",
  format: "days"
}
privacy: "followers"
```

### 3. Get Stories Feed
```bash
GET /user/stories/feed?page=1&limit=20
Authorization: Bearer <token>

Response:
{
  success: true,
  data: {
    storiesFeed: [
      {
        author: { username, fullName, ... },
        stories: [Story, Story, ...]
      }
    ],
    totalAuthors: 5
  }
}
```

### 4. Create Highlight from Stories
```bash
# Step 1: Create highlight
POST /user/story-highlights
Content-Type: multipart/form-data

file: cover.jpg
name: "Summer Vibes"
description: "Best moments"
privacy: "public"

# Step 2: Add stories
POST /user/story-highlights/:highlightId/stories

{
  storyId: "story123",
  order: 0
}
```

### 5. Vote in Story Poll
```bash
POST /user/stories/:storyId/polls/vote

{
  optionIndex: 0
}

Response:
{
  success: true,
  data: {
    poll: {
      options: [
        { text: "Option A", voteCount: 15 },
        { text: "Option B", voteCount: 8 }
      ],
      totalVotes: 23
    },
    votedOption: 0
  }
}
```

---

## Response Examples

### Success Response
```json
{
  "success": true,
  "data": {
    "_id": "story123",
    "author": {
      "_id": "user123",
      "username": "johndoe",
      "fullName": "John Doe",
      "profilePictureUrl": "https://...",
      "isVerified": true
    },
    "content": "Amazing sunset!",
    "media": {
      "type": "image",
      "url": "https://s3.../story.jpg",
      "thumbnail": "https://s3.../thumb.jpg"
    },
    "privacy": "public",
    "analytics": {
      "viewsCount": 125,
      "reactionsCount": 42,
      "repliesCount": 8
    },
    "timeRemaining": 72000,
    "createdAt": "2025-10-13T10:00:00Z",
    "expiresAt": "2025-10-14T10:00:00Z"
  },
  "message": "Story created successfully"
}
```

### Error Response
```json
{
  "success": false,
  "message": "Story has expired",
  "errorCode": "BAD_REQUEST"
}
```

---

## Performance Tips

### Frontend
1. **Lazy load** story images/videos
2. **Preload** next story while viewing current
3. **Cache** viewed stories for 24h
4. **Compress** media before upload
5. **Batch** API calls for multiple stories

### Backend
1. **Use indexes** for all queries
2. **Populate** only needed fields
3. **Paginate** all list endpoints
4. **Cache** hot stories in Redis
5. **CDN** for media delivery

---

## Security Checklist

- [x] JWT authentication required
- [x] Owner-only operations (delete, edit)
- [x] Privacy-based filtering
- [x] Input validation (max lengths, types)
- [x] File type/size restrictions
- [x] S3 encryption
- [x] Content moderation
- [x] Rate limiting
- [x] XSS prevention
- [x] SQL injection prevention

---

## Testing Checklist

### Stories
- [ ] Create image story
- [ ] Create video story
- [ ] Create text story
- [ ] Add poll to story
- [ ] Add question to story
- [ ] Add countdown to story
- [ ] Add music to story
- [ ] Tag location
- [ ] Mention users
- [ ] View story (track view)
- [ ] React to story
- [ ] Reply to story
- [ ] Vote in poll
- [ ] Answer question
- [ ] Report story
- [ ] Delete story
- [ ] Check auto-expiration (24h)

### Highlights
- [ ] Create highlight
- [ ] Add stories to highlight
- [ ] Reorder stories
- [ ] Update cover image
- [ ] Update highlight details
- [ ] Search highlights
- [ ] Delete highlight

### Privacy
- [ ] Public story visible to all
- [ ] Followers story visible to followers only
- [ ] Close friends story visible to selected users
- [ ] Expired story not viewable
- [ ] Deleted story not accessible

### Moderation
- [ ] AI analysis on creation
- [ ] User report submission
- [ ] Admin review workflow
- [ ] Auto-hide high-risk content
- [ ] Manual approval/rejection

---

## Troubleshooting

### Story not appearing in feed
- Check story status (active)
- Check expiration date
- Check privacy settings
- Check follower relationship

### Upload failing
- Check file size (<10MB)
- Check MIME type (supported formats)
- Check S3 credentials
- Check network connection

### Poll vote not working
- Check story not expired
- Check valid option index
- Check already voted (if not allowed)

### Highlight not showing stories
- Check story ownership
- Check story added to highlight
- Check highlight not deleted
- Check privacy settings

---

## Quick Metrics

| Metric | Location | Description |
|--------|----------|-------------|
| Views | `story.analytics.viewsCount` | Unique views |
| Reactions | `story.analytics.reactionsCount` | Total reactions |
| Replies | `story.analytics.repliesCount` | Total replies |
| Engagement Rate | `story.engagementRate` | (reactions + replies) / views |
| Time Remaining | `story.timeRemaining` | Seconds until expiration |
| Poll Votes | `story.poll.totalVotes` | Total votes in poll |
| Question Responses | `story.question.totalResponses` | Total answers |

---

## Support & Documentation

- **Main Docs**: [STORIES_FLOW_DOCUMENTATION.md](./STORIES_FLOW_DOCUMENTATION.md)
- **API Docs**: [API_DOCUMENTATION.txt](./API_DOCUMENTATION.txt)
- **Search API**: [SEARCH_API_DOCUMENTATION.md](./SEARCH_API_DOCUMENTATION.md)
- **Refresh Token**: [REFRESH_TOKEN_DOCUMENTATION.md](./REFRESH_TOKEN_DOCUMENTATION.md)

---

## Version History

- **v1.0** - Initial implementation
  - Basic stories (image/video/text)
  - Interactive elements (poll, question, music, countdown)
  - Story highlights
  - Content moderation
  - Privacy controls
  - Analytics

