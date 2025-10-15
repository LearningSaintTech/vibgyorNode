# Stories Flow Documentation

## Table of Contents
1. [Overview](#overview)
2. [Database Models](#database-models)
3. [API Endpoints](#api-endpoints)
4. [User Flows](#user-flows)
5. [Validations](#validations)
6. [Features](#features)
7. [Security & Privacy](#security--privacy)
8. [Content Moderation](#content-moderation)

---

## Overview

The Stories feature is a comprehensive ephemeral content system similar to Instagram/Facebook Stories, with advanced features including:
- Image/Video/Text stories
- Interactive elements (polls, questions, stickers, music)
- Story highlights for permanent storage
- Rich analytics and engagement tracking
- Content moderation and reporting
- Privacy controls
- Auto-expiration after 24 hours

---

## Database Models

### 1. Story Model (`storyModel.js`)

#### Core Fields

**Basic Information:**
- `author` (ObjectId, required) - Story creator reference
- `content` (String, max 2200 chars) - Text content
- `status` (enum) - 'active', 'expired', 'archived', 'deleted'
- `expiresAt` (Date, required) - Auto-set to 24 hours from creation
- `createdAt` / `lastEngagementAt` (Date) - Timestamps

**Media Information:**
```javascript
media: {
  type: 'image' | 'video' | 'text',
  url: String (required),
  thumbnail: String,
  filename: String (required),
  fileSize: Number (required),
  mimeType: String (required),
  duration: Number (for videos),
  dimensions: { width, height },
  s3Key: String (required)
}
```

**Story Customization:**
- `background` (enum) - 'solid', 'gradient', 'image', 'video'
- `backgroundColor` (String, default '#000000')
- `textColor` (String, default '#FFFFFF')
- `fontFamily` (String, default 'Arial')
- `fontSize` (Number, default 16)

**Filters:**
```javascript
filters: {
  type: 'none' | 'vintage' | 'black_white' | 'sepia' | 'blur' | 'custom',
  intensity: Number (0-100),
  customFilter: String
}
```

#### Interactive Elements

**Stickers:**
```javascript
stickers: [{
  type: 'emoji' | 'gif' | 'location' | 'mention' | 'hashtag' | 'poll' | 'question' | 'music' | 'countdown',
  content: String (required),
  position: { x: Number, y: Number },
  size: { width: Number, height: Number },
  rotation: Number,
  metadata: Map
}]
```

**Poll:**
```javascript
poll: {
  isPoll: Boolean,
  question: String,
  options: [{
    text: String,
    votes: [{ user: ObjectId, votedAt: Date }],
    voteCount: Number
  }],
  settings: {
    allowMultipleVotes: Boolean,
    showResultsBeforeVoting: Boolean,
    endDate: Date
  },
  totalVotes: Number
}
```

**Question:**
```javascript
question: {
  isQuestion: Boolean,
  questionText: String,
  questionType: 'open' | 'multiple_choice' | 'yes_no',
  options: [String],
  responses: [{
    user: ObjectId,
    answer: String,
    respondedAt: Date
  }],
  totalResponses: Number
}
```

**Music:**
```javascript
music: {
  isMusic: Boolean,
  track: {
    id, title, artist, album, 
    duration, previewUrl, coverUrl
  },
  startTime: Number (default 0),
  endTime: Number (default 15),
  isLooping: Boolean
}
```

**Countdown:**
```javascript
countdown: {
  isCountdown: Boolean,
  title: String,
  endDate: Date,
  format: 'days' | 'hours' | 'minutes' | 'seconds'
}
```

**Location:**
```javascript
location: {
  name: String,
  coordinates: { lat: Number, lng: Number },
  address: String,
  placeId: String,
  isVisible: Boolean (default true)
}
```

**Mentions:**
```javascript
mentions: [{
  user: ObjectId,
  position: { start: Number, end: Number },
  notified: Boolean,
  notificationSentAt: Date
}]
```

#### Engagement

**Views:**
```javascript
views: [{
  user: ObjectId,
  viewedAt: Date,
  viewDuration: Number (seconds)
}]
```

**Reactions:**
```javascript
reactions: [{
  user: ObjectId,
  type: 'like' | 'love' | 'laugh' | 'wow' | 'sad' | 'angry',
  reactedAt: Date
}]
```

**Replies:**
```javascript
replies: [{
  user: ObjectId,
  content: String (max 200 chars),
  repliedAt: Date,
  isDirectMessage: Boolean (default true)
}]
```

**Highlights:**
```javascript
highlights: [{
  highlightId: ObjectId (ref StoryHighlight),
  addedAt: Date
}]
```

#### Privacy & Analytics

**Privacy:**
- `privacy` (enum) - 'public', 'followers', 'close_friends'
- `closeFriends` [ObjectId] - List of close friends if privacy = 'close_friends'

**Analytics:**
```javascript
analytics: {
  viewsCount: Number,
  reactionsCount: Number,
  repliesCount: Number,
  sharesCount: Number,
  reach: Number,
  impressions: Number
}
```

**Moderation:**
```javascript
isReported: Boolean,
reports: [{
  user: ObjectId,
  reason: 'spam' | 'inappropriate' | 'harassment' | 'fake_news' | 'violence' | 'other',
  description: String (max 500 chars),
  reportedAt: Date
}]
```

#### Model Methods

**Instance Methods:**
- `addView(userId, viewDuration)` - Track story view
- `addReaction(userId, reactionType)` - Add/update reaction
- `removeReaction(userId)` - Remove reaction
- `addReply(userId, content, isDirectMessage)` - Add reply
- `voteInPoll(userId, optionIndex)` - Vote in poll
- `answerQuestion(userId, answer)` - Answer question
- `addMention(userId, start, end)` - Add mention
- `reportStory(userId, reason, description)` - Report story
- `addToHighlight(highlightId)` - Add to highlight
- `removeFromHighlight(highlightId)` - Remove from highlight

**Static Methods:**
- `getActiveStories(userId, page, limit)` - Get active stories with privacy filtering
- `getUserStories(userId, includeExpired)` - Get user's stories
- `getStoriesByHashtag(hashtag, page, limit)` - Get public stories by hashtag

**Virtual Properties:**
- `timeRemaining` - Seconds until expiration
- `engagementRate` - Engagement percentage

**Indexes:**
- `{ author: 1, createdAt: -1 }`
- `{ status: 1, expiresAt: 1 }`
- `{ privacy: 1, status: 1 }`
- `{ 'mentions.user': 1 }`
- `{ 'views.user': 1 }`
- `{ 'reactions.user': 1 }`
- `{ isReported: 1 }`
- TTL index on `expiresAt` for auto-deletion

### 2. Story Highlight Model (`storyHighlightModel.js`)

#### Core Fields

**Basic Information:**
- `name` (String, required, max 50 chars) - Highlight name
- `description` (String, max 200 chars) - Highlight description
- `owner` (ObjectId, required) - Highlight owner
- `status` (enum) - 'active', 'archived', 'deleted'

**Cover Image:**
```javascript
coverImage: {
  type: 'image' | 'video_thumbnail',
  url: String (required),
  thumbnail: String,
  filename: String (required),
  s3Key: String (required),
  dimensions: { width, height }
}
```

**Stories:**
```javascript
stories: [{
  story: ObjectId (ref Story),
  addedAt: Date,
  order: Number (for sorting)
}]
```

**Privacy & Settings:**
- `privacy` (enum) - 'public', 'followers', 'close_friends'

```javascript
settings: {
  allowStoryAddition: Boolean (default true),
  maxStories: Number (default 100),
  autoArchive: Boolean (default false),
  archiveAfterDays: Number (default 30)
}
```

**Analytics:**
```javascript
analytics: {
  viewsCount: Number,
  totalStories: Number
}
```

#### Model Methods

**Instance Methods:**
- `addStory(storyId, order)` - Add story to highlight
- `removeStory(storyId)` - Remove story from highlight
- `reorderStories(storyOrders)` - Reorder stories
- `updateCoverImage(coverImageData)` - Update cover image
- `addView()` - Increment view count

**Static Methods:**
- `getUserHighlights(userId, includeArchived)` - Get user's highlights
- `getPublicHighlights(page, limit)` - Get public highlights
- `searchHighlights(query, page, limit)` - Search highlights by name/description

**Virtual Properties:**
- `totalStories` - Total number of stories in highlight

**Indexes:**
- `{ owner: 1, status: 1 }`
- `{ privacy: 1, status: 1 }`
- `{ 'stories.story': 1 }`

---

## API Endpoints

### Story Routes (`/user/stories`)

#### Basic Operations

**1. Create Story**
```http
POST /user/stories
Authorization: Bearer <token>
Content-Type: multipart/form-data

Body (Form Data):
- files: File[] (optional) - Media files
- content: String (optional, max 2200)
- background: String (default 'solid')
- backgroundColor: String (default '#000000')
- textColor: String (default '#FFFFFF')
- fontFamily: String (default 'Arial')
- fontSize: Number (default 16)
- privacy: String (default 'public')
- closeFriends: ObjectId[] (optional)
- stickers: Object[] (optional)
- poll: Object (optional)
- question: Object (optional)
- music: Object (optional)
- countdown: Object (optional)
- location: Object (optional)
- mentions: Object[] (optional)

Response:
{
  success: true,
  data: Story,
  message: "Story created successfully"
}
```

**2. Get Stories Feed**
```http
GET /user/stories/feed?page=1&limit=20
Authorization: Bearer <token>

Response:
{
  success: true,
  data: {
    storiesFeed: [
      {
        author: User,
        stories: [Story]
      }
    ],
    totalAuthors: Number
  }
}
```

**3. Get User Stories**
```http
GET /user/stories/user/:userId?includeExpired=false
Authorization: Bearer <token>

Response:
{
  success: true,
  data: {
    stories: [Story],
    totalStories: Number
  }
}
```

**4. Get Single Story**
```http
GET /user/stories/:storyId
Authorization: Bearer <token>

Response:
{
  success: true,
  data: Story,
  message: "Story retrieved successfully"
}
```

**5. Delete Story**
```http
DELETE /user/stories/:storyId
Authorization: Bearer <token>

Response:
{
  success: true,
  data: null,
  message: "Story deleted successfully"
}
```

#### Engagement Endpoints

**6. Add Reaction**
```http
POST /user/stories/:storyId/reactions
Authorization: Bearer <token>

Body:
{
  reactionType: 'like' | 'love' | 'laugh' | 'wow' | 'sad' | 'angry'
}

Response:
{
  success: true,
  data: {
    reactions: [Reaction],
    reactionsCount: Number
  }
}
```

**7. Remove Reaction**
```http
DELETE /user/stories/:storyId/reactions
Authorization: Bearer <token>

Response:
{
  success: true,
  data: {
    reactions: [Reaction],
    reactionsCount: Number
  }
}
```

**8. Reply to Story**
```http
POST /user/stories/:storyId/replies
Authorization: Bearer <token>

Body:
{
  content: String (required, max 200),
  isDirectMessage: Boolean (default true)
}

Response:
{
  success: true,
  data: {
    replies: [Reply],
    repliesCount: Number
  }
}
```

#### Interactive Features

**9. Vote in Poll**
```http
POST /user/stories/:storyId/polls/vote
Authorization: Bearer <token>

Body:
{
  optionIndex: Number
}

Response:
{
  success: true,
  data: {
    poll: Poll,
    votedOption: Number
  }
}
```

**10. Answer Question**
```http
POST /user/stories/:storyId/questions/answer
Authorization: Bearer <token>

Body:
{
  answer: String
}

Response:
{
  success: true,
  data: {
    question: Question,
    totalResponses: Number
  }
}
```

#### Discovery & Analytics

**11. Get Stories by Hashtag**
```http
GET /user/stories/hashtag/:hashtag?page=1&limit=20
Authorization: Bearer <token>

Response:
{
  success: true,
  data: {
    stories: [Story],
    hashtag: String,
    pagination: {
      currentPage: Number,
      totalPages: Number,
      totalStories: Number,
      hasNext: Boolean,
      hasPrev: Boolean
    }
  }
}
```

**12. Get Story Analytics**
```http
GET /user/stories/:storyId/analytics
Authorization: Bearer <token>

Response:
{
  success: true,
  data: {
    views: Number,
    reactions: Number,
    replies: Number,
    reach: Number,
    impressions: Number,
    engagementRate: String,
    timeRemaining: Number,
    createdAt: Date,
    expiresAt: Date
  }
}
```

**13. Report Story**
```http
POST /user/stories/:storyId/report
Authorization: Bearer <token>

Body:
{
  reason: 'spam' | 'inappropriate' | 'harassment' | 'fake_news' | 'violence' | 'other',
  description: String (optional, max 500)
}

Response:
{
  success: true,
  data: null,
  message: "Story reported successfully"
}
```

### Story Highlight Routes (`/user/story-highlights`)

**1. Create Highlight**
```http
POST /user/story-highlights
Authorization: Bearer <token>
Content-Type: multipart/form-data

Body:
- file: File (required) - Cover image
- name: String (required, max 50)
- description: String (optional, max 200)
- privacy: String (default 'public')
- settings: Object (optional)

Response:
{
  success: true,
  data: StoryHighlight
}
```

**2. Get User Highlights**
```http
GET /user/story-highlights/user/:userId?includeArchived=false
Authorization: Bearer <token>

Response:
{
  success: true,
  data: {
    highlights: [StoryHighlight],
    totalHighlights: Number
  }
}
```

**3. Get Public Highlights**
```http
GET /user/story-highlights/public?page=1&limit=20
Authorization: Bearer <token>

Response:
{
  success: true,
  data: {
    highlights: [StoryHighlight],
    pagination: Object
  }
}
```

**4. Search Highlights**
```http
GET /user/story-highlights/search?q=query&page=1&limit=20
Authorization: Bearer <token>

Response:
{
  success: true,
  data: {
    highlights: [StoryHighlight],
    query: String,
    pagination: Object
  }
}
```

**5. Get Single Highlight**
```http
GET /user/story-highlights/:highlightId
Authorization: Bearer <token>

Response:
{
  success: true,
  data: StoryHighlight
}
```

**6. Update Highlight**
```http
PUT /user/story-highlights/:highlightId
Authorization: Bearer <token>

Body:
{
  name: String (optional),
  description: String (optional),
  privacy: String (optional),
  settings: Object (optional)
}

Response:
{
  success: true,
  data: StoryHighlight
}
```

**7. Delete Highlight**
```http
DELETE /user/story-highlights/:highlightId
Authorization: Bearer <token>

Response:
{
  success: true,
  data: null,
  message: "Highlight deleted successfully"
}
```

**8. Add Story to Highlight**
```http
POST /user/story-highlights/:highlightId/stories
Authorization: Bearer <token>

Body:
{
  storyId: ObjectId,
  order: Number (optional)
}

Response:
{
  success: true,
  data: {
    stories: [Story],
    totalStories: Number
  }
}
```

**9. Remove Story from Highlight**
```http
DELETE /user/story-highlights/:highlightId/stories
Authorization: Bearer <token>

Body:
{
  storyId: ObjectId
}

Response:
{
  success: true,
  data: {
    stories: [Story],
    totalStories: Number
  }
}
```

**10. Reorder Stories**
```http
PUT /user/story-highlights/:highlightId/stories/reorder
Authorization: Bearer <token>

Body:
{
  storyOrders: [
    { storyId: ObjectId, order: Number }
  ]
}

Response:
{
  success: true,
  data: {
    stories: [Story]
  }
}
```

**11. Update Cover Image**
```http
PUT /user/story-highlights/:highlightId/cover-image
Authorization: Bearer <token>
Content-Type: multipart/form-data

Body:
- file: File (required)

Response:
{
  success: true,
  data: {
    coverImage: Object
  }
}
```

---

## User Flows

### Flow 1: Creating a Story

1. **User initiates story creation**
   - Opens story creation interface
   - Chooses content type: image/video/text

2. **Content preparation**
   - If media: Capture/select photo or video
   - If text: Type content (max 2200 chars)
   - Apply filters, stickers, text customization

3. **Add interactive elements** (optional)
   - Add poll with options
   - Add question (open/multiple choice)
   - Add music track
   - Add countdown timer
   - Tag location
   - Mention users (@username)

4. **Set privacy**
   - Choose: Public / Followers / Close Friends
   - If close friends, select specific users

5. **Submit story**
   - API uploads media to S3
   - Story record created in database
   - Content moderation triggered automatically
   - Mentions notified
   - Story appears in feed

6. **Auto-expiration**
   - Story expires after 24 hours
   - MongoDB TTL index auto-deletes expired stories

### Flow 2: Viewing Stories

1. **User opens stories feed**
   - API fetches active stories based on:
     - Following relationships
     - Privacy settings
     - Close friends lists
   - Stories grouped by author

2. **User selects author's stories**
   - Stories displayed in chronological order
   - Auto-play with timer
   - Show time remaining badge

3. **View tracking**
   - View recorded on first open
   - View duration tracked
   - Author receives view notification

4. **Interactions**
   - Swipe up to reply
   - Tap to react (emoji reactions)
   - Vote in poll (if present)
   - Answer question (if present)
   - Tap location/music for details

5. **Navigation**
   - Tap left: Previous story
   - Tap right: Next story
   - Swipe down: Exit stories

### Flow 3: Story Engagement

**Reactions:**
1. User taps reaction button while viewing
2. Selects emoji (like, love, laugh, wow, sad, angry)
3. Previous reaction replaced if exists
4. Author notified of reaction
5. Reaction count updated

**Replies:**
1. User swipes up or taps reply
2. Types message (max 200 chars)
3. Choose: Send as DM (default) or public
4. Reply saved to story
5. If DM: Sent to author's inbox
6. Author notified

**Poll Voting:**
1. User taps poll option
2. System checks:
   - Story not expired
   - Option valid
   - Not already voted (unless multiple votes allowed)
3. Vote recorded
4. Results displayed
5. Vote count updated

**Question Answering:**
1. User taps question
2. Types answer or selects option
3. System checks:
   - Story not expired
   - Not already answered
4. Response saved
5. Author can view all responses

### Flow 4: Creating Highlights

1. **User accesses highlights**
   - View own profile
   - Tap "New Highlight" or edit existing

2. **Select stories**
   - Choose from past stories (including expired)
   - Only own stories can be added
   - Multiple selection allowed

3. **Customize highlight**
   - Name highlight (max 50 chars)
   - Add description (max 200 chars)
   - Choose/upload cover image
   - Set privacy (public/followers/close friends)

4. **Configure settings**
   - Allow story addition: Yes/No
   - Max stories limit (default 100)
   - Auto-archive after days

5. **Organize stories**
   - Reorder stories by drag-drop
   - Order numbers assigned
   - Stories sorted by order

6. **Publish highlight**
   - Highlight created
   - Cover image uploaded to S3
   - Appears on profile

### Flow 5: Story Reporting

1. **User flags inappropriate story**
   - Tap report icon
   - Select reason:
     - Spam
     - Inappropriate content
     - Harassment
     - Fake news
     - Violence
     - Other

2. **Provide details**
   - Optional description (max 500 chars)
   - Submit report

3. **System processing**
   - Report added to story
   - Content moderation record updated
   - If 3+ reports: Auto-flagged for review
   - Admins notified for manual review

4. **Admin review**
   - Admin reviews content
   - Decision: Approve/Reject/Escalate
   - Action taken: None/Warning/Hide/Delete/Ban
   - User notified of outcome

---

## Validations

### Input Validations

#### Story Creation:
- **Content**: Max 2200 characters
- **Media files**:
  - Supported types: image (jpeg, png, webp, gif), video (mp4, mov, avi)
  - Max file size: 10MB
  - Required if no text content
- **Text stories**: Content required if no media
- **Privacy**: Must be 'public', 'followers', or 'close_friends'
- **Close friends**: Required if privacy = 'close_friends'
- **Stickers**: Valid type, position coordinates required
- **Poll**:
  - Question required if isPoll = true
  - At least 2 options
  - Option text required
- **Question**:
  - Question text required if isQuestion = true
  - Valid question type
- **Countdown**:
  - End date required if isCountdown = true
  - End date must be in future
- **Music**: Valid track object if isMusic = true

#### Story Engagement:
- **Reactions**:
  - Valid reaction type: 'like', 'love', 'laugh', 'wow', 'sad', 'angry'
  - Story not expired
- **Replies**:
  - Content required
  - Max 200 characters
  - Story not expired
- **Poll votes**:
  - Valid option index
  - Story not expired
  - Check duplicate votes (unless allowed)
- **Question answers**:
  - Answer required
  - Story not expired
  - Check duplicate answers

#### Story Highlights:
- **Name**: Required, max 50 characters
- **Description**: Max 200 characters
- **Cover image**: Required, valid image file
- **Stories**:
  - Must exist
  - Must belong to highlight owner
  - Max stories limit enforced
  - No duplicates

#### Reports:
- **Reason**: Required, valid enum value
- **Description**: Max 500 characters
- **No duplicate reports**: Same user can't report twice

### Business Logic Validations

#### Authorization:
- **Story operations**: Only author can delete/edit
- **Highlight operations**: Only owner can modify
- **View access**: Privacy-based filtering
  - Public: Anyone can view
  - Followers: Only followers
  - Close friends: Only in close friends list
- **Analytics**: Only author can view

#### Story Lifecycle:
- **Expiration**: Auto-expires 24 hours after creation
- **Expired stories**: Cannot be viewed/engaged (except by author)
- **Deleted stories**: Soft delete (status = 'deleted')
- **Media cleanup**: S3 files deleted on story deletion

#### Engagement Rules:
- **Self-engagement**: Can't react/reply to own stories (view tracking excluded)
- **One reaction per user**: Latest replaces previous
- **One vote per user**: Unless allowMultipleVotes = true
- **One answer per user**: Per question
- **View tracking**: One view per user

#### Highlight Rules:
- **Story ownership**: Only own stories in highlights
- **Story uniqueness**: No duplicate stories in same highlight
- **Capacity**: Enforced maxStories limit
- **Order management**: Valid order numbers

### Error Handling

**Common Error Responses:**
```javascript
// 400 Bad Request
{
  success: false,
  message: "Story content or media is required",
  errorCode: "BAD_REQUEST"
}

// 401 Unauthorized
{
  success: false,
  message: "Invalid or expired token",
  errorCode: "UNAUTHORIZED"
}

// 403 Forbidden
{
  success: false,
  message: "You can only delete your own stories",
  errorCode: "FORBIDDEN"
}

// 404 Not Found
{
  success: false,
  message: "Story not found",
  errorCode: "NOT_FOUND"
}

// 500 Server Error
{
  success: false,
  message: "Failed to create story",
  errorCode: "SERVER_ERROR"
}
```

---

## Features

### 1. Media Support
- **Image stories**: jpeg, png, webp, gif
- **Video stories**: mp4, mov, avi
- **Text stories**: Pure text with backgrounds
- **S3 integration**: Secure cloud storage
- **Thumbnails**: Auto-generated for videos
- **Dimensions tracking**: Width/height metadata

### 2. Customization
- **Backgrounds**: Solid colors, gradients, images, videos
- **Text styling**: Color, font family, font size
- **Filters**: Vintage, B&W, sepia, blur, custom
- **Filter intensity**: 0-100 scale

### 3. Interactive Elements

**Stickers:**
- Emoji, GIF
- Location tags
- User mentions
- Hashtags
- Poll, question
- Music
- Countdown timers

**Polls:**
- Multiple choice
- Vote tracking per user
- Settings: Multiple votes, show results
- End date support
- Real-time vote counts

**Questions:**
- Open-ended
- Multiple choice
- Yes/No
- Response collection
- Privacy controls

**Music:**
- Track integration
- Start/end time selection
- Loop support
- Preview URL
- Album art display

**Countdown:**
- Custom title
- End date/time
- Format: Days/hours/minutes/seconds
- Real-time countdown

### 4. Privacy Controls
- **Public**: Anyone can view
- **Followers**: Only followers
- **Close Friends**: Selected users only
- **Highlight privacy**: Separate from story privacy

### 5. Engagement Features
- **Views**: Track unique views with duration
- **Reactions**: 6 emoji types
- **Replies**: DM or public
- **Sharing**: (count tracked)
- **Mentions**: Auto-detect @username
- **Location tags**: Geo-coordinates, place names

### 6. Analytics
- Views count with viewer list
- Reactions count by type
- Replies count
- Shares count
- Reach (unique users)
- Impressions (total views)
- Engagement rate calculation
- Time remaining display

### 7. Story Highlights
- Permanent story collection
- Custom cover images
- Reorderable stories
- Search functionality
- Privacy controls
- Auto-archive options
- View counting

### 8. Discovery
- Feed grouping by author
- Hashtag search
- Trending stories
- Location-based stories
- Mention notifications

---

## Security & Privacy

### Authentication & Authorization
- **JWT-based auth**: Bearer token required for all endpoints
- **Role validation**: User role verified via middleware
- **Owner verification**: Operations restricted to content owner
- **Privacy enforcement**: Feed filtered by relationships

### Data Security
- **S3 encryption**: Media files encrypted at rest
- **Access control**: Pre-signed URLs for media access
- **Input sanitization**: XSS prevention on text inputs
- **SQL injection prevention**: Mongoose parameterized queries

### Privacy Features
- **Private stories**: Not visible to non-followers
- **Close friends lists**: Exclusive content sharing
- **View privacy**: Authors see who viewed
- **Reply privacy**: DM vs public replies
- **Location privacy**: Toggle visibility
- **Mention consent**: Users control tagging

### Rate Limiting
- **Upload limits**: Max 10MB per file
- **Content limits**: Max 2200 chars text
- **Engagement limits**: Anti-spam measures
- **Report limits**: One report per user per story

---

## Content Moderation

### Automated Moderation

**AI Analysis** (via `contentModerationModel`):
- Text analysis for inappropriate content
- Keyword detection (spam, hate speech, violence)
- Risk scoring (0-100)
- Auto-flagging based on risk

**Moderation Actions:**
- **Risk 80-100**: Auto-delete
- **Risk 60-79**: Auto-hide
- **Risk 40-59**: Flag for review
- **Risk 0-39**: Allow with monitoring

**Triggers:**
- Story creation (immediate analysis)
- User reports (manual trigger)
- Pattern detection (automated)

### Manual Moderation

**Admin Review Process:**
1. Flagged content queued
2. Admin reviews story + context
3. Decision made:
   - Approved: Restore visibility
   - Rejected: Delete content
   - Escalated: Senior admin review
4. Action taken:
   - None: Content approved
   - Warning: User notified
   - Hide: Content hidden
   - Delete: Content removed
   - Ban: User suspended

**Report Handling:**
- User reports tracked per story
- 3+ reports: Auto-flag for review
- Report status: Pending → Reviewed → Resolved/Dismissed
- Reporter anonymity maintained

### Content Moderation Flow

1. **Story Creation**
   ```
   User creates story
   → Media uploaded to S3
   → Story saved to DB
   → Moderation record created
   → AI analysis triggered
   → Risk assessment
   → Auto-action if needed
   → Story visible (or hidden/deleted)
   ```

2. **User Report**
   ```
   User reports story
   → Report added to story
   → Moderation record updated
   → If 3+ reports: Flag for review
   → Admin notified
   → Manual review queue
   ```

3. **Admin Review**
   ```
   Admin accesses review queue
   → Views story + reports + AI analysis
   → Makes decision
   → Takes action
   → Updates moderation record
   → Notifies relevant users
   ```

### Moderation Categories
- Spam
- Inappropriate content
- Harassment
- Hate speech
- Violence
- Adult content
- Fake news
- Copyright violation
- Safe (approved)

---

## Database Indexes

### Story Model Indexes
```javascript
// Performance indexes
{ author: 1, createdAt: -1 }         // User stories
{ status: 1, expiresAt: 1 }          // Active stories
{ privacy: 1, status: 1 }            // Privacy filtering
{ 'mentions.user': 1 }               // Mention queries
{ 'views.user': 1 }                  // View tracking
{ 'reactions.user': 1 }              // Reaction queries
{ isReported: 1 }                    // Moderation

// TTL index for auto-deletion
{ expiresAt: 1, expireAfterSeconds: 0 }
```

### Story Highlight Indexes
```javascript
{ owner: 1, status: 1 }              // User highlights
{ privacy: 1, status: 1 }            // Privacy filtering
{ 'stories.story': 1 }               // Story lookups
```

### Content Moderation Indexes
```javascript
{ contentType: 1, contentId: 1 }     // Content lookup
{ contentAuthor: 1, createdAt: -1 }  // Author content
{ status: 1, createdAt: -1 }         // Status filtering
{ 'moderationResults.aiAnalysis.flagged': 1 }  // Flagged content
{ 'moderationResults.manualReview.decision': 1 }  // Review decisions
```

---

## File Upload Configuration

**Supported MIME Types:**
```javascript
Images: 'image/jpeg', 'image/png', 'image/webp', 'image/gif'
Videos: 'video/mp4', 'video/quicktime', 'video/avi', 'video/mov'
```

**Limits:**
- Max file size: 10MB
- Max files per upload: 10 (for multiple stickers/media)

**Storage:**
- Memory storage (multer)
- S3 upload with metadata
- Organized by: userId/category/filename
- Categories: 'stories', 'story-highlights'

---

## Error Scenarios & Handling

### Creation Errors
1. **No content**: "Story content or media is required"
2. **Invalid file type**: "Unsupported file type"
3. **File too large**: "File size exceeds 10MB limit"
4. **S3 upload fail**: "Failed to upload media"
5. **Invalid privacy**: "Invalid privacy setting"
6. **Mention user not found**: User skipped, no error

### Engagement Errors
1. **Story expired**: "Story has expired"
2. **Already voted**: "You have already voted in this poll"
3. **Already answered**: "You have already answered this question"
4. **Invalid option**: "Invalid option index"
5. **Not a poll/question**: "This story does not have a poll/question"

### Authorization Errors
1. **Not owner**: "You can only delete your own stories"
2. **Private story**: "You cannot view this story"
3. **Not follower**: Story not in feed
4. **Not close friend**: Story not visible

### Highlight Errors
1. **Story not found**: "Story not found"
2. **Not story owner**: "You can only add your own stories to highlights"
3. **Duplicate story**: "Story already exists in this highlight"
4. **Limit reached**: "Highlight has reached maximum stories limit"
5. **Invalid highlight**: "Highlight not found"

---

## Performance Considerations

### Optimizations
1. **Pagination**: All list endpoints paginated (default 20)
2. **Selective population**: Only necessary fields populated
3. **Indexed queries**: All frequent queries use indexes
4. **TTL indexes**: Auto-cleanup of expired stories
5. **Aggregation**: Feed stories grouped by author
6. **Caching**: Consider Redis for hot stories

### Best Practices
1. **Lazy loading**: Load stories on-demand
2. **Image optimization**: Compress before upload
3. **Video thumbnails**: Generate on upload
4. **Batch operations**: Use transactions for multi-step ops
5. **Error handling**: Graceful degradation
6. **Logging**: Comprehensive error logging

### Scalability
1. **S3 storage**: Unlimited media scaling
2. **MongoDB sharding**: Ready for horizontal scaling
3. **Read replicas**: Separate read/write DBs
4. **CDN integration**: Serve media via CDN
5. **Microservices**: Can split story/highlight services

---

## Integration Points

### Services Used
1. **S3 Service** (`s3Service.js`)
   - Media upload/delete
   - Pre-signed URLs
   - Thumbnail generation

2. **Notification Service** (`notificationService.js`)
   - Story view notifications
   - Mention notifications
   - Engagement notifications
   - Report notifications

3. **Content Moderation** (`contentModerationModel.js`)
   - Auto-analysis on creation
   - Report handling
   - Admin review workflow

4. **Auth Middleware** (`authMiddleware.js`)
   - JWT verification
   - Role-based access
   - User context injection

5. **Upload Middleware** (`uploadMiddleware.js`)
   - File validation
   - Memory storage
   - Size/type limits

### External Dependencies
- **AWS S3**: Media storage
- **MongoDB**: Primary database
- **JWT**: Authentication
- **Multer**: File upload handling
- **Mongoose**: ODM

---

## Testing Recommendations

### Unit Tests
- Model methods (addView, addReaction, etc.)
- Validation logic
- Privacy filtering
- Expiration handling

### Integration Tests
- Story creation flow
- Engagement flows
- Highlight management
- Content moderation pipeline

### E2E Tests
- Complete user journeys
- Multi-user interactions
- Real-time features
- Error scenarios

### Performance Tests
- Feed loading speed
- Large media uploads
- Concurrent views
- Database query performance

---

## Future Enhancements

### Potential Features
1. **Live Stories**: Real-time streaming
2. **Story Templates**: Pre-designed layouts
3. **Collaborative Stories**: Multi-user stories
4. **Story Remix**: Share/recreate others' stories
5. **Advanced Analytics**: Demographics, retention
6. **Story Ads**: Monetization
7. **Story Insights**: AI-powered suggestions
8. **Cross-platform**: Web, iOS, Android sync
9. **Story Archive**: Download personal archive
10. **Story Challenges**: Interactive campaigns

### Technical Improvements
1. **GraphQL API**: More flexible queries
2. **WebSocket**: Real-time updates
3. **Redis Caching**: Hot content caching
4. **CDN Integration**: Faster media delivery
5. **Video Transcoding**: Multiple quality options
6. **ML Moderation**: Advanced content analysis
7. **Microservices**: Service decomposition
8. **Event Sourcing**: Audit trail
9. **CQRS**: Separate read/write models
10. **Rate Limiting**: API throttling

---

## Conclusion

The Stories feature is a comprehensive, production-ready implementation with:
- ✅ Rich media support (image/video/text)
- ✅ Interactive elements (polls, questions, stickers, music, countdown)
- ✅ Privacy controls (public/followers/close friends)
- ✅ Story highlights for permanent collections
- ✅ Advanced analytics and engagement tracking
- ✅ Content moderation (AI + manual)
- ✅ Reporting system
- ✅ Auto-expiration (24 hours)
- ✅ S3 integration for scalable storage
- ✅ Comprehensive validation and error handling
- ✅ Performance optimized with indexes
- ✅ Security and privacy features

All flows are documented, validated, and ready for production deployment.

