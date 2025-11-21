# 🎯 Dating API Testing Guide

## 📋 Overview
This guide provides detailed instructions for testing the Dating APIs using the seed data provided in `datingSeed.js`.

**Database:** Local MongoDB (`mongodb://localhost:27017/vibgyorNode`)

---

## 🚀 Quick Start

### 1. Seed the Database

**Add to existing data (safe):**
```bash
node datingSeed.js
```

**Or clear test data first:**
```bash
node datingSeed.js --clear
```

The `--clear` flag removes only test users (phones starting with 555000) before seeding.

### 2. Start the Server
```bash
npm start
# or
npm run dev
```

### 3. Import Postman Collection
Use the endpoints described below in Postman with base URL: `http://localhost:3000`

---

## 👥 Test Profiles

### 🔑 Main Test User

| Field | Value |
|-------|-------|
| **Name** | Alice Johnson |
| **Phone** | `+91 5550001111` |
| **Username** | `alice_dating_tester` |
| **Gender** | Female |
| **Location** | New York, USA (40.7128, -74.0060) |
| **Dating Status** | ✅ ACTIVE |
| **Preferences** | Men, Age 25-35, 0-50km |

**Use this profile for all testing!**

---

### 📱 Supporting Test Profiles

#### 2️⃣ Bob Smith - **MATCH READY** 💑
- **Phone:** `+91 5550002222`
- **Username:** `bob_nearby_match`
- **Gender:** Male
- **Location:** New York (~4.5km from Alice)
- **Status:** ✅ ACTIVE
- **Special:** Already liked Alice - like him back to create a match!

#### 3️⃣ Charlie Brown - **TO DISLIKE**
- **Phone:** `+91 5550003333`
- **Username:** `charlie_to_dislike`
- **Gender:** Male
- **Location:** New York (~8km from Alice)
- **Status:** ✅ ACTIVE

#### 4️⃣ Diana Prince - **TO COMMENT**
- **Phone:** `+91 5550004444`
- **Username:** `diana_friend`
- **Gender:** Female
- **Location:** New York (~2km from Alice)
- **Status:** ✅ ACTIVE

#### 5️⃣ Eve Wilson - **FAR AWAY**
- **Phone:** `+91 5550005555`
- **Username:** `eve_far_away`
- **Gender:** Female
- **Location:** Los Angeles (~3936km away)
- **Status:** ✅ ACTIVE
- **Note:** Won't appear in nearby search

#### 6️⃣ Frank Miller - **INACTIVE PROFILE**
- **Phone:** `+91 5550006666`
- **Username:** `frank_inactive`
- **Gender:** Male
- **Location:** New York (~3km from Alice)
- **Status:** ❌ INACTIVE
- **Note:** Won't appear in search results

#### 7️⃣ Grace Lee - **NEW DATER**
- **Phone:** `+91 5550007777`
- **Username:** `grace_new_dater`
- **Gender:** Female
- **Location:** New York (~1.5km from Alice)
- **Status:** ✅ ACTIVE (Recently activated)
- **Note:** Use `filter=new_dater` to find her

#### 8️⃣ Henry Davis - **COMMENTER**
- **Phone:** `+91 5550008888`
- **Username:** `henry_commenter`
- **Gender:** Male
- **Location:** New York (~6km from Alice)
- **Status:** ✅ ACTIVE
- **Note:** Has already commented on Alice's profile

---

## 🧪 Step-by-Step Testing Flow

### Step 1: Authentication

#### 1.1 Send OTP
```http
POST /auth/send-otp
Content-Type: application/json

{
  "phoneNumber": "5550001111",
  "countryCode": "+91"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "data": {
    "otpSent": true
  }
}
```

#### 1.2 Verify OTP
```http
POST /auth/verify-otp
Content-Type: application/json

{
  "phoneNumber": "5550001111",
  "countryCode": "+91",
  "otp": "123456"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "userId": "...",
      "username": "alice_dating_tester",
      "fullName": "Alice Johnson"
    }
  }
}
```

**💡 Copy the `token` and set it as Bearer Token in Postman!**

---

### Step 2: View Dating Profile

#### 2.1 Get Own Dating Profile
```http
GET /user/dating/profile
Authorization: Bearer <your_token>
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "photos": [
      {
        "url": "...",
        "thumbnailUrl": "...",
        "order": 0,
        "uploadedAt": "2025-11-10T..."
      }
    ],
    "videos": [
      {
        "url": "...",
        "thumbnailUrl": "...",
        "duration": 15,
        "order": 0,
        "uploadedAt": "2025-11-07T..."
      }
    ],
    "isDatingProfileActive": true,
    "lastUpdatedAt": "2025-11-15T..."
  }
}
```

#### 2.2 Get Dating Preferences
```http
GET /user/dating/preferences
Authorization: Bearer <your_token>
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "preferences": {
      "hereTo": "Dating",
      "wantToMeet": "Man",
      "ageRange": { "min": 25, "max": 35 },
      "languages": ["English", "French"],
      "location": {
        "city": "New York",
        "country": "United States",
        "coordinates": { "lat": 40.7128, "lng": -74.0060 }
      },
      "distanceRange": { "min": 0, "max": 50 }
    }
  }
}
```

---

### Step 3: Search Dating Profiles

#### 3.1 Search Nearby Profiles
```http
GET /user/dating/profiles?distanceMax=50&filter=near_by&page=1&limit=10
Authorization: Bearer <your_token>
```

**Expected:** Bob, Charlie, Diana, Henry, Grace (all within 50km)
**Not Expected:** Eve (too far), Frank (inactive)

#### 3.2 Filter by Gender
```http
GET /user/dating/profiles?wantToMeet=Man&distanceMax=50
Authorization: Bearer <your_token>
```

**Expected:** Bob, Charlie, Henry
**Not Expected:** Diana, Grace (they're Female)

#### 3.3 Filter New Daters
```http
GET /user/dating/profiles?filter=new_dater&distanceMax=50
Authorization: Bearer <your_token>
```

**Expected:** Grace (recently activated)

#### 3.4 Filter by Age Range
```http
GET /user/dating/profiles?ageMin=25&ageMax=32&distanceMax=50
Authorization: Bearer <your_token>
```

**Expected:** Users within the age range

#### 3.5 Search by Name/Username
```http
GET /user/dating/profiles?search=bob&distanceMax=100
Authorization: Bearer <your_token>
```

**Expected:** Bob Smith (bob_nearby_match)

---

### Step 4: Interactions

#### 4.1 Like Bob (Creates Match! 💑)

**⚠️ Copy Bob's User ID from the search results above**

```http
POST /user/dating/profiles/{BOB_USER_ID}/like
Authorization: Bearer <your_token>
Content-Type: application/json

{
  "comment": "You seem awesome! Would love to get to know you better! ☕"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Profile liked successfully",
  "data": {
    "liked": true,
    "isMatch": true,
    "matchId": "..."
  }
}
```

**✅ Congrats! You created a MATCH with Bob!**

#### 4.2 Dislike Charlie

**Copy Charlie's User ID**

```http
POST /user/dating/profiles/{CHARLIE_USER_ID}/dislike
Authorization: Bearer <your_token>
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Profile dismissed",
  "data": {
    "dismissed": true
  }
}
```

#### 4.3 Comment on Diana's Profile

**Copy Diana's User ID**

```http
POST /user/dating/profiles/{DIANA_USER_ID}/comments
Authorization: Bearer <your_token>
Content-Type: application/json

{
  "text": "Love your positive energy! Let's connect! ✨"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Comment added successfully",
  "data": {
    "commentId": "...",
    "text": "Love your positive energy! Let's connect! ✨",
    "createdAt": "..."
  }
}
```

#### 4.4 Get Comments on Diana's Profile

```http
GET /user/dating/profiles/{DIANA_USER_ID}/comments?page=1&limit=10
Authorization: Bearer <your_token>
```

**Expected:** Your comment plus any existing comments

---

### Step 5: View Matches

#### 5.1 Get All Active Matches
```http
GET /user/dating/matches?status=active&page=1&limit=10
Authorization: Bearer <your_token>
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "matches": [
      {
        "_id": "...",
        "matchedUser": {
          "userId": "...",
          "username": "bob_nearby_match",
          "fullName": "Bob Smith",
          "profilePictureUrl": "...",
          "gender": "Male",
          "age": 33,
          "location": {
            "city": "New York",
            "country": "United States"
          }
        },
        "matchedAt": "2025-11-20T...",
        "lastInteractionAt": "2025-11-20T...",
        "status": "active"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalMatches": 1,
      "hasNext": false,
      "hasPrev": false
    }
  }
}
```

---

### Step 6: Safety Features

#### 6.1 Block Henry

**Copy Henry's User ID**

```http
POST /user/dating/profiles/{HENRY_USER_ID}/block
Authorization: Bearer <your_token>
```

**Expected Response:**
```json
{
  "success": true,
  "message": "User blocked successfully",
  "data": {
    "blocked": true,
    "blockedUserId": "..."
  }
}
```

**Effect:**
- Henry won't appear in your search results
- Any existing matches with Henry will be ended
- Henry can't see your profile
- His comments on your profile are hidden

#### 6.2 Unblock Henry

```http
DELETE /user/dating/profiles/{HENRY_USER_ID}/block
Authorization: Bearer <your_token>
```

**Expected Response:**
```json
{
  "success": true,
  "message": "User unblocked successfully",
  "data": {
    "unblocked": true
  }
}
```

#### 6.3 Report Charlie's Profile

**Copy Charlie's User ID**

```http
POST /user/dating/profiles/{CHARLIE_USER_ID}/report
Authorization: Bearer <your_token>
Content-Type: application/json

{
  "description": "Inappropriate content in profile"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Profile reported successfully",
  "data": {
    "reportId": "...",
    "reported": true
  }
}
```

---

### Step 7: Media Management

#### 7.1 Upload Dating Photo
```http
POST /user/dating/photos
Authorization: Bearer <your_token>
Content-Type: multipart/form-data

photos: [file1.jpg, file2.jpg]
```

**Limits:** Max 5 photos total

#### 7.2 Upload Dating Video
```http
POST /user/dating/videos
Authorization: Bearer <your_token>
Content-Type: multipart/form-data

videos: [video1.mp4]
```

**Limits:** Max 5 videos total

#### 7.3 Delete Dating Photo
```http
DELETE /user/dating/photos/0
Authorization: Bearer <your_token>
```

Deletes photo at index 0

#### 7.4 Reorder Dating Photos
```http
PUT /user/dating/photos/order
Authorization: Bearer <your_token>
Content-Type: application/json

{
  "photoIndex": 0,
  "order": 2
}
```

---

### Step 8: Update Preferences

#### 8.1 Update Dating Preferences
```http
PUT /user/dating/preferences
Authorization: Bearer <your_token>
Content-Type: application/json

{
  "hereTo": "Serious Relationship",
  "wantToMeet": "Man",
  "ageMin": 28,
  "ageMax": 38,
  "languages": ["English", "Spanish"],
  "location": {
    "city": "New York",
    "country": "United States",
    "lat": 40.7128,
    "lng": -74.0060
  },
  "distanceMin": 0,
  "distanceMax": 100
}
```

#### 8.2 Toggle Dating Profile (Activate/Deactivate)
```http
PUT /user/dating/toggle
Authorization: Bearer <your_token>
Content-Type: application/json

{
  "isActive": true
}
```

Set to `false` to deactivate your dating profile.

---

## 🔍 Advanced Testing Scenarios

### Scenario 1: Complete Dating Flow
1. Login as Alice
2. View your dating profile
3. Search for nearby profiles
4. Like Bob (creates match)
5. Comment on Diana's profile
6. View your matches
7. Check Bob's profile to see match status

### Scenario 2: Filter Testing
1. Search with `filter=near_by` - verify distance sorting
2. Search with `filter=new_dater` - verify Grace appears
3. Search with `filter=same_interests` - verify interest matching
4. Search with `wantToMeet=Man` - verify only males appear
5. Search with `ageMin=30&ageMax=40` - verify age filtering

### Scenario 3: Safety Testing
1. Block Henry
2. Search profiles - verify Henry doesn't appear
3. Unblock Henry
4. Search again - verify Henry reappears
5. Report Charlie
6. Verify report was created

### Scenario 4: Match Creation
1. Login as Alice
2. Search for Bob
3. Like Bob (creates match because Bob already liked Alice)
4. View matches - verify Bob appears
5. Login as Bob
6. View matches - verify Alice appears

---

## 📊 Expected User Counts by Filter

| Filter | Expected Profiles | Names |
|--------|-------------------|-------|
| `near_by` (50km) | 5 | Bob, Charlie, Diana, Grace, Henry |
| `wantToMeet=Man` | 3 | Bob, Charlie, Henry |
| `wantToMeet=Woman` | 2 | Diana, Grace |
| `new_dater` | 1 | Grace |
| No filters | 6 | All except Frank (inactive) |
| `distanceMax=5` | 3-4 | Bob, Diana, Grace, Frank (if active) |

---

## 🐛 Common Issues & Solutions

### Issue: "Route not found"
**Solution:** Ensure server is running on correct port (usually 3000)

### Issue: "Authentication failed"
**Solution:** 
1. Check Bearer token is set in Authorization header
2. Token format: `Bearer <token>`
3. Re-login if token expired

### Issue: "No profiles found"
**Solution:**
1. Check `distanceMax` parameter (try 100km)
2. Verify test users are seeded correctly
3. Check if user's location is set

### Issue: "Profile not active"
**Solution:** Verify dating profile is active with `GET /user/dating/profile`

### Issue: "Can't create match"
**Solution:**
1. Ensure both users have active dating profiles
2. Verify both users have liked each other
3. Check if users are blocked

---

## 💡 Pro Tips

1. **Save User IDs**: After first search, save user IDs in Postman environment variables
   ```javascript
   // In Postman Tests tab
   pm.environment.set("bobId", pm.response.json().data.profiles[0]._id);
   ```

2. **Use Postman Collections**: Organize requests into folders:
   - Authentication
   - Profile Management
   - Search & Discovery
   - Interactions
   - Matches
   - Safety

3. **Check Database**: Use MongoDB Compass to verify data
   ```
   mongodb://localhost:27017/vibgyorNode
   Collections: users, datinginteractions, datingmatches, datingprofilecomments
   ```

4. **Test Multiple Users**: Login as different users to test mutual interactions

5. **Monitor Console**: Check server console for error logs

---

## 📝 Checklist

- [ ] Seed database with test data
- [ ] Start server
- [ ] Setup Postman with base URL
- [ ] Login as Alice and get token
- [ ] View dating profile
- [ ] Search nearby profiles
- [ ] Like Bob (create match)
- [ ] Dislike Charlie
- [ ] Comment on Diana
- [ ] View matches
- [ ] Block/unblock Henry
- [ ] Report a profile
- [ ] Update preferences
- [ ] Upload/delete photos
- [ ] Toggle dating profile

---

## 🆘 Need Help?

- **Check Logs**: Server console logs show detailed error messages
- **Database Issues**: Verify MongoDB is running: `mongod --version`
- **Seed Issues**: Re-run seed with `--clear` flag
- **API Docs**: Check `docs/dating-api.md` for API reference

---

## 📚 Additional Resources

- **Main Seed Script**: `src/seed.js` (full database seed)
- **Dating Seed Script**: `datingSeed.js` (dating-focused seed)
- **API Documentation**: `docs/dating-api.md`
- **Models**: 
  - `src/user/auth/model/userAuthModel.js`
  - `src/user/dating/models/datingInteractionModel.js`
  - `src/user/dating/models/datingMatchModel.js`
  - `src/user/dating/models/datingProfileCommentModel.js`

---

**Happy Testing! 🚀**

