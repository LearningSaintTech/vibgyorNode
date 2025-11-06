## Post Feature APIs

**Base path**: `/user/posts` (mounted in `src/app.js`)

**Auth**: All endpoints require `authorize([Roles.USER])`.

**Uploads**: Post creation supports media via `uploadMultiple` (multipart/form-data).

Model source: `src/user/userModel/postModel.js`
Routes source: `src/user/userRoutes/postRoutes.js`
Controller source: `src/user/userController/postController.js`

### CRUD

- **Create Post**
  - Method/Path: `POST /`
  - Body: `content` (<=2200) or media files required, optional `caption` (<=500), `hashtags[]`, `mentions[]`, `location`, `visibility` (`public|followers|private`), `commentVisibility` (`everyone|followers|none`)
  - Notes: Validates content/media presence and length limits

- **Get Post**
  - Method/Path: `GET /:postId`

- **Update Post**
  - Method/Path: `PUT /:postId`
  - Body: same validation as create

- **Delete Post**
  - Method/Path: `DELETE /:postId`

### Feed & Discovery

- **Feed**
  - Method/Path: `GET /feed`
  - Desc: Personalized feed (following + self)

- **Search Posts**
  - Method/Path: `GET /search?query=...`
  - Desc: Search by content/caption/hashtags

- **Trending Posts**
  - Method/Path: `GET /trending`

- **By Hashtag**
  - Method/Path: `GET /hashtag/:hashtag`

### User Posts

- **Current user's posts**
  - Method/Path: `GET /me`
  - Desc: Returns authenticated user's posts (all except `deleted` by default)

- **User's Posts**
  - Method/Path: `GET /user/:userId`

### Engagement

- **Toggle Like**
  - Method/Path: `POST /:postId/like`

- **Add Comment**
  - Method/Path: `POST /:postId/comment`
  - Body: `content` required (<=500)

- **List Comments**
  - Method/Path: `GET /:postId/comments`

- **Share Post**
  - Method/Path: `POST /:postId/share`

### Archive

- **Archive Post**
  - Method/Path: `PUT /:postId/archive`
  - Desc: Author-only. Sets `status` to `archived`.

- **Unarchive Post**
  - Method/Path: `PUT /:postId/unarchive`
  - Desc: Author-only. Sets `status` back to `published`.

### Saved (Bookmarks)

- **Save Post**
  - Method/Path: `POST /:postId/save`
  - Desc: Save a post to current user’s bookmarks.

- **Unsave Post**
  - Method/Path: `DELETE /:postId/save`
  - Desc: Remove from bookmarks.

- **Get Saved Posts**
  - Method/Path: `GET /saved`
  - Desc: List current user’s saved posts with pagination.

### Analytics & Reporting

- **Post Analytics**
  - Method/Path: `GET /:postId/analytics`

- **Report Post**
  - Method/Path: `POST /:postId/report`
  - Body: `reason` in [`spam`, `inappropriate`, `harassment`, `fake_news`, `violence`, `other`], optional `description` (<=500)

### Advanced

- **Update Location**
  - Method/Path: `PUT /:postId/location`

- **Add Mentions**
  - Method/Path: `POST /:postId/mentions`
  - Desc: Accepts explicit `mentions[]`; controller also parses `@username` from `content`

### Validation Summary (middleware)

- `validateCreatePost`: requires `content` or media; `content` <= 2200, `caption` <= 500
- `validateComment`: requires `content` (<= 500)
- `validateReport`: requires valid `reason`

### Notes

- Create flow uploads media to S3, extracts hashtags and mentions, creates moderation record, and returns the populated post.
- Feed uses follow graph and `publishedAt` ordering; search filters only `status: 'published'`.


