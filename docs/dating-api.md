## Vibgyor Dating API

### 1. Media & Profile Setup

| Endpoint | Method | Description |
| --- | --- | --- |
| `/user/dating/photos` | `POST` | Upload 1–5 photos (`photos[]` multipart) |
| `/user/dating/videos` | `POST` | Upload 1–5 videos (`videos[]` multipart) |
| `/user/dating/photos/:photoIndex` | `DELETE` | Remove photo by index |
| `/user/dating/videos/:videoIndex` | `DELETE` | Remove video by index |
| `/user/dating/photos/order` | `PUT` | Body `{ photoIndex, order }` |
| `/user/dating/videos/order` | `PUT` | Body `{ videoIndex, order }` |
| `/user/dating/toggle` | `PUT` | Body `{ isActive: true/false }` |
| `/user/dating/profile` | `GET` | Fetch media + status |

### 2. Preferences & Discovery

#### Preferences

- `GET /user/dating/preferences`
- `PUT /user/dating/preferences`

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
    "lat": 52.52,
    "lng": 13.405
  },
  "distanceMin": 0,
  "distanceMax": 25
}
```

#### Profile Search

`GET /user/dating/profiles`

- Query params: `search`, `hereTo`, `wantToMeet`, `ageMin`, `ageMax`, `languages`, `city`, `country`, `distanceMax`, `filter` (`all|new_dater|near_by|same_interests`), `page`, `limit`.
- Uses `datingProfileService` for query-building and distance filtering.

### 3. Interactions

| Endpoint | Method | Description |
| --- | --- | --- |
| `/user/dating/profiles/:profileId/like` | `POST` | Body `{ comment? }` – mutual likes trigger matches |
| `/user/dating/profiles/:profileId/dislike` | `POST` | Marks interaction as dismissed |
| `/user/dating/profiles/:profileId/comments` | `POST` | Body `{ text }` |
| `/user/dating/profiles/:profileId/comments` | `GET` | Query `page`, `limit` |
| `/user/dating/matches` | `GET` | Query `status`, `page`, `limit` |
| `/user/dating/profiles/:profileId/report` | `POST` | Body `{ description }` |
| `/user/dating/profiles/:profileId/block` | `POST` | Blocks & ends matches |
| `/user/dating/profiles/:profileId/block` | `DELETE` | Unblocks |

- **Match flow**: `likeProfile` creates/updates `DatingInteraction`. If reciprocal like exists, `DatingMatch.createOrGetMatch` returns match data (response `{ liked: true, isMatch, matchId }`).
- **Comments**: stored in `DatingProfileComment`, supports like toggles, pagination.
- **Reports**: reuse `userReportModel`; unique reporter/reported constraint.
- **Blocking**: mirrors social module + ends matches + deletes follow requests.

### 4. Data Models

- `User.dating`: photos, videos, `isDatingProfileActive`, `lastUpdatedAt`, dynamic `preferences`.
- `DatingInteraction`: `user`, `targetUser`, `action (like/dislike)`, optional comment snapshot, `status`, `matchedAt`.
- `DatingMatch`: unique `userA/userB`, `status (active/blocked/ended)`, helper methods `createOrGetMatch`, `endMatch`.
- `DatingProfileComment`: `user`, `targetUser`, `text`, likes, pinned/deleted flags.

### 5. Postman Configuration

1. **Environment**
   - `{{baseUrl}} = http://localhost:3000`
   - Global header `Authorization: Bearer {{token}}`
2. **Collections (suggested folders)**
   - `Dating Media`
   - `Dating Preferences`
   - `Dating Discovery`
   - `Dating Interactions`
   - `Dating Safety`
3. **Sample Requests**
   - `POST {{baseUrl}}/user/dating/profiles/{{profileId}}/like`
   - `GET {{baseUrl}}/user/dating/profiles?search=anna&hereTo=Make%20New%20Friends&city=Berlin&distanceMax=25`
   - `PUT {{baseUrl}}/user/dating/preferences` (use body above)
4. **Tests/Variables**
   ```js
   if (pm.response.json().data?.matchId) {
     pm.environment.set("matchId", pm.response.json().data.matchId);
   }
   ```
   - Set `profileId`, `commentId`, `matchId` after creation for subsequent calls.

### 6. Flow Summary

1. User uploads photos/videos (`datingMediaController`), toggles profile active.
2. Sets preferences (`PUT /preferences`).
3. Discovers profiles via `/profiles` list with filters/distance.
4. Likes/dislikes/comment/report/block using interaction endpoints.
5. Mutual likes become matches, accessible via `/matches`.

