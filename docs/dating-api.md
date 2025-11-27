node src/seed.js --clear


## Vibgyor Dating APIs

All dating endpoints live under `/user/dating/*` and require an authenticated `Roles.USER` token (`Authorization: Bearer <JWT>`). Media upload routes sit in `datingMediaRoutes`, profile discovery in `datingProfileRoutes`, and social interactions in `datingInteractionRoutes`. Additional upload/update endpoints are available under `/user/file-upload/dating/*`.

---

### 1. Dating Media & Profile Activation

| Method | Endpoint | Body / Params | Notes |
| --- | --- | --- | --- |
| `GET` | `/user/dating/profile` | – | Returns full dating profile snapshot (`photos`, `videos`, `isDatingProfileActive`, preferences). |
| `POST` | `/user/dating/photos` | form-data `photos[]` (max 5, 50 MB each, JPEG/PNG/WebP/GIF) | Streams to S3 and appends metadata order. Response includes uploaded items + refreshed profile. |
| `POST` | `/user/dating/videos` | form-data `videos[]` (max 5, MP4/MOV/AVI/WebM, 50 MB each), optional `durations[]` | Stores media + optional duration per clip. |
| `POST` | `/user/file-upload/dating/photos` | form-data `photos[]` (max 5, 50 MB each) | Alternative upload endpoint (same functionality as `/user/dating/photos`). |
| `POST` | `/user/file-upload/dating/videos` | form-data `videos[]` (max 5, 50 MB each), optional `durations[]` | Alternative upload endpoint (same functionality as `/user/dating/videos`). |
| `PUT` | `/user/file-upload/dating/photos/:photoIndex` | form-data `photo` (single file, 50 MB max) | **Update/Replace** photo at specified index. Deletes old photo from S3 and uploads new one. |
| `PUT` | `/user/file-upload/dating/videos/:videoIndex` | form-data `video` (single file, 50 MB max), optional `duration` | **Update/Replace** video at specified index. Deletes old video from S3 and uploads new one. Optional `duration` in request body. |
| `DELETE` | `/user/dating/photos/:photoIndex` | path `photoIndex` (0-based) | Removes file + attempts S3 delete. |
| `DELETE` | `/user/dating/videos/:videoIndex` | path `videoIndex` | Same flow for videos. |
| `PUT` | `/user/dating/photos/order` | `{ "photoIndex": 0, "order": 3 }` | Reorders in place via user helpers. |
| `PUT` | `/user/dating/videos/order` | `{ "videoIndex": 1, "order": 0 }` | — |
| `PUT` | `/user/dating/toggle` | `{ "isActive": true }` | Calls `user.toggleDatingProfile` to activate/deactivate discoverability. |

Typical setup flow:
1. Hit `GET /user/dating/profile` to fetch current state.
2. Upload media (repeat `POST /photos` & `POST /videos` until 5 assets each max). Alternatively, use `/user/file-upload/dating/photos` and `/user/file-upload/dating/videos`.
3. Update existing media using `PUT /user/file-upload/dating/photos/:photoIndex` or `PUT /user/file-upload/dating/videos/:videoIndex` to replace specific items.
4. Reorder or delete as needed, then `PUT /toggle` with `true` once satisfied.

---

### 2. Preferences & Discovery

#### 2.1 Preference Management (`datingProfileController`)

End-to-end body handled in `updateDatingPreferences`:

```json
{
  "hereTo": "Make New Friends",
  "wantToMeet": "Woman",
  "ageMin": 20,
  "ageMax": 35,
  "languages": ["English", "French"],
  "location": {
    "city": "Berlin",
    "country": "Germany",
    "coordinates": { "lat": 52.52, "lng": 13.405 }
  },
  "distanceMin": 0,
  "distanceMax": 25
}
```

| Method | Endpoint | Notes |
| --- | --- | --- |
| `GET` | `/user/dating/preferences` | Auto-fills defaults from `User.preferences` if dating prefs absent. |
| `PUT` | `/user/dating/preferences` | Validates arrays, coerces numbers, refreshes `dating.lastUpdatedAt`. |

#### 2.2 Profile Discovery (`datingProfileService`)

`GET /user/dating/profiles` accepts rich filters (all optional):

- `search`: matches `fullName` or `username`.
- `hereTo`, `wantToMeet` (`everyone` disables gender filter).
- `ageMin`, `ageMax`: converted to DOB constraints.
- `languages`: comma string or array; checks dating + primary/secondary languages.
- `city`, `country`: matches either profile or stored dating location.
- `distanceMax`: numeric km; uses Haversine filtering when requester has coordinates.
- `filter`:  
  - `all` *(default)* – no extra constraints.  
  - `near_by` – prioritises distance sorting.  
  - `same_interests` – requires intersection with `currentUser.interests`.  
  - `new_dater` – users created within the last 7 days.  
  - `liked_you` – users who liked the current user (`targetUser = me`).  
  - `liked_by_you` – users the current user already liked (`user = me`).
- Pagination: `page`, `limit` (default 1,20).

Response payload:
```json
{
  "profiles": [
    {
      "_id": "...",
      "username": "anna",
      "age": 29,
      "distanceAway": "2.4 km away",
      "datingProfile": { "photos": [], "videos": [], "isActive": true },
      "preferences": { ... }
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 20, "hasMore": true }
}
```

---

### 3. Interactions, Matches & Safety

| Method | Endpoint | Payload / Params | Highlights |
| --- | --- | --- | --- |
| `POST` | `/user/dating/profiles/:userId/like` | `{ "comment": "Nice profile!" }?` (optional body) | Runs protection checks (self-like, blocked, inactive target). Mutual likes invoke `DatingMatch.createOrGetMatch` and return `{ liked, isMatch, matchId }`. Comment is stored only when provided. |
| `POST` | `/user/dating/profiles/:userId/dislike` | – | Sets `DatingInteraction` to `dislike` + `status: dismissed`, and `DatingMatch.endMatch`. |
| `GET` | `/user/dating/profiles/:userId/likes` | `page`, `limit` | Lists users that liked a profile, adds `likedAgo`, `isMatch`, `comment` snippet. |
| `GET` | `/user/dating/profiles/me/likes` | `page`, `limit` | Convenience alias for current user (accepts `me`, `self`, `current` or blank `:userId`). |
| `POST` | `/user/dating/profiles/:userId/comments` | `{ "text": "..." }` | Trims 500 chars, populates commenter fields. |
| `GET` | `/user/dating/profiles/:userId/comments` | `page`, `limit` | Sorted desc, returns pagination metadata. |
| `GET` | `/user/dating/profiles/me/comments` | `page`, `limit` | Same as above but scoped to the caller's profile (also accepts `me|self|current`). |
| `GET` | `/user/dating/matches` | `status` (`active|blocked|ended`), `page`, `limit` | Shapes each match with "other user" info + timestamps. |
| `POST` | `/user/dating/profiles/:userId/report` | `{ "description": "..." }` | Creates `Report` document (`reportType: inappropriate_content`). Duplicate by same reporter rejected (Mongo unique index). |
| `POST` | `/user/dating/profiles/:userId/block` | – | Mutually removes follows/follow-requests, appends to `blockedUsers/blockedBy`, ends matches as `blocked`. |
| `DELETE` | `/user/dating/profiles/:userId/block` | – | Pulls ids from block arrays. |

Error codes bubble up with descriptive messages (e.g., `Profile not found`, `User already blocked`, `You have already reported this profile`).

---

### 4. Data Surfaces

- `User.dating` stores `photos`, `videos`, `isDatingProfileActive`, `preferences`, `lastUpdatedAt`. Helper methods (`addDatingPhoto`, `toggleDatingProfile`, etc.) centralize S3 and ordering logic.
- `DatingInteraction`: tracks `user`, `targetUser`, `action`, `status (pending|matched|dismissed)`, `matchedAt`, optional inline `comment`.
- `DatingMatch`: enforces unique pair keys (`userA`, `userB`) and exposes `createOrGetMatch` / `endMatch(reason)` to keep single source of truth for match status.
- `DatingProfileComment`: regular comment store with `isDeleted`, `likes`, and user population for UI.

---

### 5. Postman Collection & Environment

1. **Import Collection**  
   - File: `docs/postman/dating-api.postman_collection.json` (groups calls by Media, Preferences, Discovery, Interactions, Safety).
   - Unified collection (`scriptFiles/corrected-postman-collection.json`) also contains these calls under *User → Dating* with extra test scripts that capture `targetUserId`, `matchId`, `commentId`, and `reportId`.

2. **Environment Variables**
   - `baseUrl = http://localhost:3000` (or deployed host).  
   - `token = <JWT>` (set in `Authorization` header used by all requests).  
   - Dynamic vars captured from test scripts: `targetUserId`, `matchId`, `commentId`, `reportId`.

3. **Auth Helper**
   - Under Collection → Authorization: type `Bearer Token` with `{{token}}`. Individual requests inherit.

4. **File Upload Requests**
   - Set Body → `form-data`.  
   - Key `photos` or `videos` marked as *File*, attach up to 5 files.  
   - Optional `durations` key (text) repeated per video to store seconds.
   - **Update endpoints**: Use `photo` (single file) for `PUT /user/file-upload/dating/photos/:photoIndex` or `video` (single file) for `PUT /user/file-upload/dating/videos/:videoIndex`.

5. **Test Scripts / Variable Chaining**
   ```js
   const json = pm.response.json();
   const data = json.data || {};
   if (data.matchId) pm.environment.set('matchId', data.matchId);
   if (data.datingProfile?._id) pm.environment.set('targetUserId', data.datingProfile._id);
   ```
   - Comments endpoint can store `commentId` similarly for subsequent delete/update steps if implemented later.

6. **Suggested Collection Structure**
   - `Dating Media`: profile snapshot, photo/video CRUD, toggle, **update/replace endpoints**.  
   - `Preferences`: get/update preferences payloads.  
   - `Discovery`: profiles search scenarios (`generic`, `near_by`, `same_interests`, `new_dater`, `liked_you`, `liked_by_you`). Each request writes the first profile ID back to `targetUserId` so interaction calls can reuse it.  
   - `Interactions`: like/dislike, likes feed (targeted + "me"), comments CRUD (targeted + "me"), matches listing.  
   - `Safety`: report/block/unblock flows.

---

### 6. End-to-End Smoke Flow (Recommended)

1. Authenticate user → set `{{token}}`.
2. `GET /user/dating/profile` (should return empty media).
3. Upload at least one photo and video using `POST /user/dating/photos` or `POST /user/file-upload/dating/photos`, reorder if needed, `PUT /toggle` to activate profile.
4. Update existing media using `PUT /user/file-upload/dating/photos/:photoIndex` or `PUT /user/file-upload/dating/videos/:videoIndex` to replace specific items.
5. `PUT /user/dating/preferences` to configure filters.
6. `GET /user/dating/profiles` using filters; capture a `targetUserId`. Use `filter=liked_you|liked_by_you|new_dater` for CTA-specific tabs.  
7. `POST /profiles/:userId/like`; if testing mutual match, run same request from second user account.  
8. `GET /matches` to confirm match entry, `GET /profiles/:userId/likes` (or `/profiles/me/likes`) to view inbound likes.  
9. Exercise `POST /profiles/:userId/comments`, `GET /profiles/:userId/comments` (and `/profiles/me/comments` for self-feed).  
10. Test `POST /profiles/:userId/report` and `POST /profiles/:userId/block`, then `DELETE` unblock to reset state.

Following this script ensures every controller/service path (`datingMediaController`, `datingProfileController`, `datingInteractionController`, `datingProfileService`, `userFileUploadController`) stays healthy after future refactors.

