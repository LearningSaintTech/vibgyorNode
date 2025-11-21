# 🎯 Complete Dating Flow - Detailed Explanation

## 📚 Table of Contents
1. [Overview](#overview)
2. [Phase 1: Profile Setup](#phase-1-profile-setup)
3. [Phase 2: Discovery & Search](#phase-2-discovery--search)
4. [Phase 3: Interactions](#phase-3-interactions)
5. [Phase 4: Matching](#phase-4-matching)
6. [Phase 5: Match Management](#phase-5-match-management)
7. [Phase 6: Safety Features](#phase-6-safety-features)
8. [Data Flow Diagrams](#data-flow-diagrams)
9. [Database Models](#database-models)
10. [Real-World Example](#real-world-example)

---

## Overview

The dating flow consists of **6 main phases**:

```
┌─────────────────────────────────────────────────────────────────┐
│                      DATING FLOW OVERVIEW                        │
└─────────────────────────────────────────────────────────────────┘

   1. SETUP          2. DISCOVER       3. INTERACT       4. MATCH
      │                  │                 │                │
      ▼                  ▼                 ▼                ▼
  ┌────────┐       ┌────────┐       ┌────────┐       ┌────────┐
  │ Upload │       │ Search │       │ Like / │       │ Mutual │
  │ Photos │  -->  │ Filter │  -->  │Dislike │  -->  │ Match  │
  │ Videos │       │ Browse │       │Comment │       │ Create │
  └────────┘       └────────┘       └────────┘       └────────┘
      │                                                     │
      ▼                                                     ▼
  ┌────────┐                                          ┌────────┐
  │  Set   │                                          │  View  │
  │Prefer- │                                          │ Match  │
  │ ences  │                                          │  List  │
  └────────┘                                          └────────┘
      │                                                     │
      ▼                                                     ▼
  ┌────────┐       ┌────────┐                        ┌────────┐
  │Activate│       │ Block/ │                        │  Chat  │
  │Profile │       │ Report │                        │  with  │
  │        │       │ Safety │                        │ Match  │
  └────────┘       └────────┘                        └────────┘

    5. MANAGE                        6. SAFETY
```

---

## Phase 1: Profile Setup

### Step 1.1: Upload Media (Photos & Videos)

**Purpose:** Make your profile attractive and authentic

#### Upload Photos (Max 5)
```http
POST /user/dating/photos
Content-Type: multipart/form-data
Authorization: Bearer <token>

photos: [file1.jpg, file2.jpg, file3.jpg]
```

**Response:**
```json
{
  "success": true,
  "message": "Photos uploaded successfully",
  "data": {
    "photos": [
      {
        "url": "https://s3.../photo1.jpg",
        "thumbnailUrl": "https://s3.../thumb1.jpg",
        "order": 0,
        "uploadedAt": "2025-11-20T10:30:00Z"
      }
    ],
    "totalPhotos": 3
  }
}
```

#### Upload Videos (Max 5)
```http
POST /user/dating/videos
Content-Type: multipart/form-data

videos: [intro.mp4]
```

**What Happens:**
1. Files uploaded to S3
2. Thumbnails generated for videos
3. URLs saved to `User.dating.photos` or `User.dating.videos`
4. Each media item has an `order` field for display priority

### Step 1.2: Reorder Media

```http
PUT /user/dating/photos/order

{
  "photoIndex": 2,
  "order": 0
}
```

**Purpose:** Make your best photo appear first

### Step 1.3: Set Dating Preferences

```http
PUT /user/dating/preferences

{
  "hereTo": "Dating",
  "wantToMeet": "Woman",
  "ageMin": 25,
  "ageMax": 35,
  "languages": ["English", "Spanish"],
  "location": {
    "city": "New York",
    "country": "United States",
    "lat": 40.7128,
    "lng": -74.0060
  },
  "distanceMin": 0,
  "distanceMax": 50
}
```

**Preference Fields Explained:**

| Field | Options | Purpose |
|-------|---------|---------|
| `hereTo` | "Make New Friends", "Dating", "Serious Relationship", "Networking", "Travel Buddy" | Your dating goal |
| `wantToMeet` | "Woman", "Man", "Everyone", "Non-binary" | Gender preference |
| `ageMin`, `ageMax` | 18-100 | Age range filter |
| `languages` | Array of languages | Common language preference |
| `distanceMin`, `distanceMax` | In kilometers | Search radius |

**What Gets Saved:**
```javascript
User.dating.preferences = {
  hereTo: "Dating",
  wantToMeet: "Woman",
  ageRange: { min: 25, max: 35 },
  languages: ["English", "Spanish"],
  location: {
    city: "New York",
    country: "United States",
    coordinates: { lat: 40.7128, lng: -74.0060 }
  },
  distanceRange: { min: 0, max: 50 }
}
```

### Step 1.4: Activate Dating Profile

```http
PUT /user/dating/toggle

{
  "isActive": true
}
```

**What Happens:**
```javascript
User.dating.isDatingProfileActive = true
User.dating.lastUpdatedAt = new Date()
```

**Profile now visible in search results! ✅**

---

## Phase 2: Discovery & Search

### Step 2.1: Search Profiles

```http
GET /user/dating/profiles?distanceMax=50&filter=near_by&page=1&limit=20
```

**Filter Options:**

| Filter | Description | Use Case |
|--------|-------------|----------|
| `all` | All active profiles | Browse everyone |
| `near_by` | Distance-sorted | Find nearby people |
| `new_dater` | Recently joined | Welcome new users |
| `same_interests` | Shared interests | Find compatible people |

**Additional Parameters:**

```http
GET /user/dating/profiles?
  search=alice                    # Search by name/username
  &wantToMeet=Woman                # Filter by gender
  &ageMin=25&ageMax=35             # Age range
  &distanceMax=50                  # Max distance in km
  &hereTo=Dating                   # Intent filter
  &languages=English,Spanish       # Language match
  &city=New York                   # City filter
  &country=United%20States         # Country filter
  &page=1&limit=20                 # Pagination
```

**Response:**
```json
{
  "success": true,
  "data": {
    "profiles": [
      {
        "userId": "674d8f2a...",
        "username": "alice_dating",
        "fullName": "Alice Johnson",
        "age": 29,
        "gender": "Female",
        "profilePictureUrl": "https://...",
        "bio": "Coffee lover, travel enthusiast",
        "location": {
          "city": "New York",
          "country": "United States",
          "distance": 4.5
        },
        "dating": {
          "photos": [...],
          "videos": [...],
          "preferences": {
            "hereTo": "Dating",
            "wantToMeet": "Man"
          }
        },
        "interests": ["Travel", "Photography", "Coffee"],
        "languages": ["English", "French"],
        "isVerified": true
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalProfiles": 48,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

### How Search Algorithm Works

```javascript
// Behind the scenes in datingProfileService

1. BASE QUERY:
   - isDatingProfileActive = true
   - Exclude current user
   - Exclude blocked users
   - Exclude blockedBy users

2. APPLY FILTERS:
   - Age: match ageMin/ageMax
   - Gender: match wantToMeet
   - Location: city/country match
   - Languages: has common language
   - Search: name/username contains text

3. CALCULATE DISTANCE:
   - Haversine formula for distance
   - Filter by distanceMax
   - Sort by distance (if near_by filter)

4. SPECIAL FILTERS:
   - new_dater: joined in last 7 days
   - same_interests: common interests > 2
   - liked_you: already liked current user

5. PAGINATION:
   - Skip: (page - 1) * limit
   - Limit: results per page
```

---

## Phase 3: Interactions

### Step 3.1: Like a Profile

```http
POST /user/dating/profiles/674d8f2a.../like

{
  "comment": "Love your travel photos! Would love to connect ☕"
}
```

**What Happens:**

```
┌─────────────────────────────────────────────────────────────┐
│                   LIKE INTERACTION FLOW                      │
└─────────────────────────────────────────────────────────────┘

You like Alice
      │
      ▼
┌──────────────────┐
│ DatingInteraction│  Created/Updated
│   user: You      │  {
│   targetUser: Alice│    action: "like",
│   action: "like"  │    status: "pending",
│   status: "pending"│   comment: "Love your photos..."
│   comment: {...}  │  }
└──────────────────┘
      │
      ▼
   Check: Has Alice liked you?
      │
      ├─── NO ──────────────────┐
      │                          │
      │                          ▼
      │                   Return: liked = true
      │                          isMatch = false
      │
      └─── YES ─────────────────┐
                                 │
                                 ▼
                        ┌────────────────┐
                        │  IT'S A MATCH! │
                        │  DatingMatch   │
                        │  created       │
                        └────────────────┘
                                 │
                                 ▼
                        Update BOTH interactions
                        status = "matched"
                        matchedAt = now
                                 │
                                 ▼
                        Return: liked = true
                               isMatch = true
                               matchId = "..."
```

**Response (No Match Yet):**
```json
{
  "success": true,
  "message": "Profile liked successfully",
  "data": {
    "liked": true,
    "isMatch": false,
    "matchId": null
  }
}
```

**Response (Match Created!):**
```json
{
  "success": true,
  "message": "It's a match!",
  "data": {
    "liked": true,
    "isMatch": true,
    "matchId": "674d9f3b..."
  }
}
```

### Step 3.2: Dislike a Profile

```http
POST /user/dating/profiles/674d8f2a.../dislike
```

**What Happens:**
```javascript
// 1. Create/Update interaction
DatingInteraction.findOneAndUpdate({
  user: currentUserId,
  targetUser: profileId
}, {
  action: "dislike",
  status: "dismissed",
  matchedAt: null
})

// 2. End any existing match
DatingMatch.endMatch(currentUserId, profileId)

// 3. Profile won't appear in future searches
```

**Purpose:** 
- Remove profile from your feed
- End any existing match
- Profile won't be shown again

### Step 3.3: Comment on Profile

```http
POST /user/dating/profiles/674d8f2a.../comments

{
  "text": "Your profile looks amazing! Would love to know more about your travels."
}
```

**What Gets Created:**
```javascript
DatingProfileComment {
  user: currentUserId,
  targetUser: profileId,
  text: "Your profile looks amazing!...",
  likes: [],
  likesCount: 0,
  isPinned: false,
  isDeleted: false,
  createdAt: now,
  updatedAt: now
}
```

**View Comments:**
```http
GET /user/dating/profiles/674d8f2a.../comments?page=1&limit=20
```

**Response:**
```json
{
  "success": true,
  "data": {
    "comments": [
      {
        "_id": "674e...",
        "user": {
          "userId": "674d...",
          "username": "bob_smith",
          "fullName": "Bob Smith",
          "profilePictureUrl": "..."
        },
        "text": "Your profile looks amazing!...",
        "likesCount": 3,
        "createdAt": "2025-11-20T10:45:00Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalComments": 8,
      "hasNext": false
    }
  }
}
```

---

## Phase 4: Matching

### How Matches Are Created

```
┌─────────────────────────────────────────────────────────────┐
│                    MATCH CREATION LOGIC                      │
└─────────────────────────────────────────────────────────────┘

Timeline:

Day 1:
  Alice likes Bob
    └─> DatingInteraction created
        { user: Alice, targetUser: Bob, action: "like", status: "pending" }
    └─> Bob receives notification (optional)
    └─> Bob sees Alice in "liked_you" filter

Day 2:
  Bob searches profiles
    └─> Sees Alice's profile
    └─> Likes Alice back

  POST /user/dating/profiles/{ALICE_ID}/like
    │
    ▼
  System checks:
    ├─> Does Alice have active dating profile? ✅
    ├─> Are they blocked? ❌
    ├─> Has Alice liked Bob? ✅ YES!
    │
    ▼
  MUTUAL LIKE DETECTED!
    │
    ▼
  1. Create DatingMatch
     ┌────────────────────────┐
     │ DatingMatch            │
     │ userA: Alice (sorted)  │
     │ userB: Bob   (sorted)  │
     │ status: "active"       │
     │ matchedBy: "mutual_like"│
     │ matchedAt: now         │
     └────────────────────────┘
    │
    ▼
  2. Update Alice's interaction
     status: "pending" → "matched"
     matchedAt: now
    │
    ▼
  3. Update Bob's interaction
     status: "pending" → "matched"
     matchedAt: now
    │
    ▼
  4. Return response
     { isMatch: true, matchId: "..." }
    │
    ▼
  5. Both users see each other in /matches endpoint
```

### Match Data Structure

```javascript
DatingMatch {
  _id: ObjectId("674e..."),
  userA: ObjectId("674d..."),  // Always the smaller ID (sorted)
  userB: ObjectId("674d..."),  // Always the larger ID (sorted)
  status: "active",  // or "blocked", "ended"
  matchedBy: "mutual_like",
  lastInteractionAt: Date("2025-11-20T11:00:00Z"),
  metadata: {},
  createdAt: Date("2025-11-20T11:00:00Z"),
  updatedAt: Date("2025-11-20T11:00:00Z")
}
```

**Why Sorted IDs?**
- Ensures uniqueness (no duplicate matches)
- Easy lookup in either direction
- Prevents Alice-Bob and Bob-Alice duplicates

---

## Phase 5: Match Management

### Step 5.1: View All Matches

```http
GET /user/dating/matches?status=active&page=1&limit=20
```

**Status Options:**
- `active` - Current matches
- `blocked` - Blocked users
- `ended` - Ended matches

**Response:**
```json
{
  "success": true,
  "data": {
    "matches": [
      {
        "_id": "674e...",
        "matchedUser": {
          "userId": "674d...",
          "username": "alice_dating",
          "fullName": "Alice Johnson",
          "profilePictureUrl": "https://...",
          "gender": "Female",
          "age": 29,
          "bio": "Coffee lover...",
          "location": {
            "city": "New York",
            "country": "United States",
            "distance": 4.5
          },
          "interests": ["Travel", "Photography"],
          "isVerified": true
        },
        "matchedAt": "2025-11-20T11:00:00Z",
        "lastInteractionAt": "2025-11-20T11:00:00Z",
        "status": "active",
        "likeComment": "Love your travel photos!"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 2,
      "totalMatches": 23,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

### Step 5.2: View Specific Match Details

From the matches list, you can:
- See when you matched
- View their full profile
- Read the comment you left when liking
- Start a conversation (integrate with chat module)

### What You Can Do With Matches

```
┌────────────────────────────────────────────────────────────┐
│                    MATCH ACTIONS                            │
└────────────────────────────────────────────────────────────┘

✅ Active Match:
   ├─> View full profile
   ├─> Send messages (chat integration)
   ├─> Block user
   ├─> Report user
   └─> Unmatch (dislike to end)

🚫 Blocked Match:
   ├─> Unblock user
   └─> Match ends automatically

⛔ Ended Match:
   └─> View history only
       (can't interact)
```

---

## Phase 6: Safety Features

### Step 6.1: Block a User

```http
POST /user/dating/profiles/674d8f2a.../block
```

**What Happens:**

```
Block Action Cascade:
│
├─> 1. Add to blockedUsers array
│      User.blockedUsers.push(targetUserId)
│
├─> 2. Add to blockedBy array (target user)
│      TargetUser.blockedBy.push(currentUserId)
│
├─> 3. End dating match
│      DatingMatch.status = "blocked"
│
├─> 4. Remove from followers/following
│      Remove social connections
│
├─> 5. Delete follow requests
│      FollowRequest.deleteMany({ user or target })
│
└─> 6. Hide from searches
       User won't appear in any search results
```

**Response:**
```json
{
  "success": true,
  "message": "User blocked successfully",
  "data": {
    "blocked": true,
    "blockedUserId": "674d..."
  }
}
```

### Step 6.2: Unblock a User

```http
DELETE /user/dating/profiles/674d8f2a.../block
```

**What Happens:**
- Remove from `blockedUsers` array
- Remove from their `blockedBy` array
- User can appear in searches again
- Match remains ended (doesn't auto-restore)

### Step 6.3: Report a User

```http
POST /user/dating/profiles/674d8f2a.../report

{
  "description": "Inappropriate content in profile photos"
}
```

**What Gets Created:**
```javascript
Report {
  reporter: currentUserId,
  reportedUser: targetUserId,
  reportType: "dating_profile",
  description: "Inappropriate content...",
  status: "pending",
  priority: "medium",
  createdAt: now
}
```

**Report Flow:**
```
User Reports Profile
      │
      ▼
Report Created (status: "pending")
      │
      ▼
Admin/Moderator Review
      │
      ├─── Valid Report ────────┐
      │                          │
      │                          ▼
      │                   Take Action:
      │                   - Warn user
      │                   - Remove content
      │                   - Ban user
      │                   - No action
      │
      └─── Invalid Report ──────┐
                                 │
                                 ▼
                          Mark as "dismissed"
```

### Safety Best Practices

```
✅ DO:
  - Report inappropriate content
  - Block users who make you uncomfortable
  - Verify profiles before meeting
  - Meet in public places first
  - Share location with friends

❌ DON'T:
  - Share personal information too quickly
  - Send money to people you haven't met
  - Share your exact home address
  - Meet alone in private places first time
```

---

## Data Flow Diagrams

### Complete User Journey

```
┌──────────────────────────────────────────────────────────────┐
│                  COMPLETE USER JOURNEY                        │
└──────────────────────────────────────────────────────────────┘

USER SIGN UP
    │
    ▼
Complete Profile
(name, bio, interests, location)
    │
    ▼
DATING PHASE 1: SETUP
    │
    ├─> Upload Photos (1-5)
    ├─> Upload Videos (0-5)
    ├─> Set Preferences
    │   ├─> Who to meet
    │   ├─> Age range
    │   ├─> Distance
    │   └─> Intentions
    └─> Activate Profile
    │
    ▼
DATING PHASE 2: DISCOVER
    │
    ├─> Browse Profiles
    │   ├─> Filter by distance
    │   ├─> Filter by age
    │   ├─> Filter by gender
    │   └─> Filter by interests
    │
    ▼
DATING PHASE 3: INTERACT
    │
    ├─> Like Profile ──────┐
    │                       │
    ├─> Dislike Profile    │
    │                       │
    └─> Comment on Profile │
                           │
                           ▼
                    Check for Mutual Like
                           │
                           ├─── NO ────> Wait for response
                           │
                           └─── YES ───> CREATE MATCH! 💑
                                          │
                                          ▼
                                   DATING PHASE 4: MATCH
                                          │
                                          ├─> View Matches
                                          ├─> Chat with Match
                                          ├─> Meet in Person
                                          └─> Build Relationship
                                          │
                                          ▼
                                   DATING PHASE 5: MANAGE
                                          │
                                          ├─> Continue Match
                                          ├─> Block User
                                          ├─> Report User
                                          └─> End Match (Unmatch)
```

### API Call Sequence

```
┌──────────────────────────────────────────────────────────────┐
│              API CALL SEQUENCE (Happy Path)                  │
└──────────────────────────────────────────────────────────────┘

1. POST /auth/send-otp
   └─> POST /auth/verify-otp
       └─> Receive JWT token

2. POST /user/dating/photos (upload 3 photos)
   └─> Photos stored in S3
       └─> URLs saved to User.dating.photos

3. PUT /user/dating/preferences
   └─> Preferences saved to User.dating.preferences

4. PUT /user/dating/toggle { isActive: true }
   └─> Profile now visible

5. GET /user/dating/profiles?distanceMax=50&filter=near_by
   └─> Receive list of 20 nearby profiles

6. POST /user/dating/profiles/{BOB_ID}/like
   └─> Like saved as DatingInteraction
       └─> Check for reciprocal like
           └─> No match yet (Bob hasn't liked back)

7. [Bob's side] POST /user/dating/profiles/{ALICE_ID}/like
   └─> System detects mutual like!
       └─> DatingMatch created
           └─> Both interactions updated to "matched"

8. GET /user/dating/matches?status=active
   └─> See Bob in matches list

9. [Start chatting with Bob via chat module]

10. POST /user/dating/profiles/{CHARLIE_ID}/dislike
    └─> Charlie's profile dismissed

11. POST /user/dating/profiles/{EVE_ID}/block
    └─> Eve blocked, match ended
```

---

## Database Models

### User Model (Dating Section)

```javascript
User {
  // ... other user fields ...
  
  dating: {
    photos: [
      {
        url: String,
        thumbnailUrl: String,
        order: Number,
        uploadedAt: Date
      }
    ],
    videos: [
      {
        url: String,
        thumbnailUrl: String,
        duration: Number,  // seconds
        order: Number,
        uploadedAt: Date
      }
    ],
    isDatingProfileActive: Boolean,
    lastUpdatedAt: Date,
    preferences: {
      hereTo: String,
      wantToMeet: String,
      ageRange: {
        min: Number,
        max: Number
      },
      languages: [String],
      location: {
        city: String,
        country: String,
        coordinates: {
          lat: Number,
          lng: Number
        }
      },
      distanceRange: {
        min: Number,
        max: Number
      }
    }
  },
  
  blockedUsers: [ObjectId],
  blockedBy: [ObjectId]
}
```

### DatingInteraction Model

```javascript
DatingInteraction {
  _id: ObjectId,
  user: ObjectId,          // Who performed the action
  targetUser: ObjectId,    // Who received the action
  action: String,          // "like" or "dislike"
  status: String,          // "pending", "matched", "dismissed"
  comment: {
    text: String,
    createdAt: Date
  },
  matchedAt: Date,
  isMatchNotified: Boolean,
  metadata: Map,
  createdAt: Date,
  updatedAt: Date
}

// Unique index on: user + targetUser (one interaction per pair)
```

### DatingMatch Model

```javascript
DatingMatch {
  _id: ObjectId,
  userA: ObjectId,         // Smaller ID (sorted)
  userB: ObjectId,         // Larger ID (sorted)
  status: String,          // "active", "blocked", "ended"
  matchedBy: String,       // "mutual_like", "manual"
  lastInteractionAt: Date,
  metadata: Map,
  createdAt: Date,
  updatedAt: Date
}

// Unique index on: userA + userB (one match per pair)

// Static methods:
DatingMatch.createOrGetMatch(userId1, userId2)
DatingMatch.endMatch(userId1, userId2, reason)
```

### DatingProfileComment Model

```javascript
DatingProfileComment {
  _id: ObjectId,
  user: ObjectId,          // Who wrote the comment
  targetUser: ObjectId,    // Whose profile
  text: String,
  likes: [
    {
      user: ObjectId,
      likedAt: Date
    }
  ],
  likesCount: Number,
  isPinned: Boolean,
  isDeleted: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

---

## Real-World Example

### Complete Scenario: Alice & Bob

```
┌──────────────────────────────────────────────────────────────┐
│            ALICE & BOB'S DATING JOURNEY                      │
└──────────────────────────────────────────────────────────────┘

📅 Monday, 9:00 AM - Alice Sets Up Profile
────────────────────────────────────────────
✅ Alice uploads 3 photos
POST /user/dating/photos
   Photos: [profile.jpg, travel.jpg, hobby.jpg]

✅ Alice sets preferences
PUT /user/dating/preferences
   {
     "hereTo": "Dating",
     "wantToMeet": "Man",
     "ageMin": 25,
     "ageMax": 35,
     "distanceMax": 50
   }

✅ Alice activates profile
PUT /user/dating/toggle { "isActive": true }

────────────────────────────────────────────
📅 Monday, 10:00 AM - Alice Browses Profiles
────────────────────────────────────────────
GET /user/dating/profiles?distanceMax=50&filter=near_by

📱 Alice sees:
   1. Bob Smith (4.5km away) ⭐
   2. Charlie Brown (8km away)
   3. David Lee (12km away)

────────────────────────────────────────────
📅 Monday, 10:15 AM - Alice Likes Bob
────────────────────────────────────────────
POST /user/dating/profiles/{BOB_ID}/like
Body: { "comment": "Love your travel photos! ☕" }

📊 Database State:
   DatingInteraction created:
   {
     user: Alice,
     targetUser: Bob,
     action: "like",
     status: "pending",
     comment: { text: "Love your travel photos! ☕" }
   }

📱 Response: { "isMatch": false }
   (Bob hasn't liked Alice yet)

────────────────────────────────────────────
📅 Monday, 11:00 AM - Alice Dislikes Charlie
────────────────────────────────────────────
POST /user/dating/profiles/{CHARLIE_ID}/dislike

📊 Database State:
   DatingInteraction created:
   {
     user: Alice,
     targetUser: Charlie,
     action: "dislike",
     status: "dismissed"
   }

────────────────────────────────────────────
📅 Monday, 2:00 PM - Bob Logs In
────────────────────────────────────────────
✅ Bob searches profiles
GET /user/dating/profiles?distanceMax=50

📱 Bob sees Alice's profile
   (Alice appears because Bob matches her preferences)

────────────────────────────────────────────
📅 Monday, 2:15 PM - Bob Likes Alice Back
────────────────────────────────────────────
POST /user/dating/profiles/{ALICE_ID}/like
Body: { "comment": "Would love to grab coffee! ☕" }

🎉 SYSTEM DETECTS MUTUAL LIKE!

📊 Database State:
   1. DatingMatch created:
      {
        userA: Alice._id,
        userB: Bob._id,
        status: "active",
        matchedBy: "mutual_like",
        matchedAt: now
      }
   
   2. Alice's interaction updated:
      status: "pending" → "matched"
      matchedAt: now
   
   3. Bob's interaction updated:
      status: "pending" → "matched"
      matchedAt: now

📱 Bob's Response:
   {
     "success": true,
     "message": "It's a match!",
     "data": {
       "liked": true,
       "isMatch": true,
       "matchId": "674e..."
     }
   }

🔔 BOTH RECEIVE NOTIFICATIONS:
   Alice: "Bob liked you back! It's a match! 💑"
   Bob: "You matched with Alice! 💑"

────────────────────────────────────────────
📅 Monday, 2:20 PM - Alice Sees Match
────────────────────────────────────────────
GET /user/dating/matches?status=active

📱 Alice sees Bob in matches:
   {
     "matchedUser": {
       "fullName": "Bob Smith",
       "profilePictureUrl": "...",
       "bio": "Tech enthusiast..."
     },
     "matchedAt": "2025-11-20T14:15:00Z",
     "likeComment": "Would love to grab coffee! ☕"
   }

────────────────────────────────────────────
📅 Monday, 3:00 PM - They Start Chatting
────────────────────────────────────────────
[Integrate with chat module]

Alice → Bob: "Hi! Thanks for the match! I love coffee too! ☕"
Bob → Alice: "Great! Want to meet at Starbucks this weekend?"

────────────────────────────────────────────
📅 Tuesday, 10:00 AM - Alice Blocks Spam User
────────────────────────────────────────────
POST /user/dating/profiles/{SPAM_ID}/block

📊 What Happens:
   ✅ SpamUser added to Alice.blockedUsers
   ✅ Alice added to SpamUser.blockedBy
   ✅ Any match ended: status = "blocked"
   ✅ SpamUser won't appear in Alice's searches
   ✅ SpamUser can't see Alice's profile

────────────────────────────────────────────
📅 Result: Alice & Bob Success Story! 💑
────────────────────────────────────────────
✅ Matched on dating app
✅ Started chatting
✅ Planned first date
✅ Living happily ever after! 🎉
```

---

## Key Concepts Summary

### 1. Mutual Likes = Match
- Both users must like each other
- Match created automatically
- Both interactions updated to "matched"

### 2. Sorted User IDs
- `userA` always < `userB`
- Prevents duplicate matches
- Easy bidirectional lookup

### 3. Three-Way Blocking
- `blockedUsers` - who I blocked
- `blockedBy` - who blocked me
- Both checked in searches

### 4. Distance Calculation
- Haversine formula
- Based on lat/lng coordinates
- Filtered by `distanceMax`

### 5. Status Flow
```
Interaction Status:
  pending → matched (when reciprocal like)
  pending → dismissed (if disliked)

Match Status:
  active → blocked (if user blocked)
  active → ended (if unmatched)
```

### 6. Privacy & Safety
- Block = immediate invisibility
- Report = admin review
- Active profile required for visibility

---

## Testing the Flow

### Quick Test with Seed Data

```bash
# 1. Seed test data
node datingSeed.js

# 2. Login as Alice
POST /auth/verify-otp
  Phone: 5550001111, OTP: 123456

# 3. Search profiles
GET /user/dating/profiles?distanceMax=50

# 4. Like Bob (creates match!)
POST /user/dating/profiles/{BOB_ID}/like

# 5. View matches
GET /user/dating/matches?status=active
  → See Bob in matches list ✅
```

---

## Conclusion

The dating flow is a **complete lifecycle** from profile setup to matching:

1. **Setup** → Upload media, set preferences, activate
2. **Discover** → Search with filters, browse profiles
3. **Interact** → Like, dislike, comment
4. **Match** → Mutual likes create matches
5. **Manage** → View matches, chat, meet
6. **Safety** → Block, report, protect

Each phase builds on the previous one, creating a seamless and safe dating experience! 💑

---

**For detailed API testing, see: `DATING_API_TESTING_GUIDE.md`**

