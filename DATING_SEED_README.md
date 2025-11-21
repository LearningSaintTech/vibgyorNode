# Dating API Seed & Testing

## 📁 Files Overview

This folder contains everything you need to test Dating APIs with pre-configured test profiles.

### Files

1. **`datingSeed.js`** - Seed script for creating test data
2. **`DATING_API_TESTING_GUIDE.md`** - Comprehensive testing guide with step-by-step instructions
3. **`DATING_TEST_PROFILES.txt`** - Quick reference card with all test profile details

---

## 🚀 Quick Start (3 Steps)

### Step 1: Seed the Database

**Option A: Add to Existing Data (Recommended)**
```bash
node datingSeed.js
```

This will:
- Connect to local MongoDB (`mongodb://localhost:27017/vibgyorNode`)
- **Preserve all existing data** 
- Add 8 test profiles (skip if already exist)
- Add sample interactions and comments
- Safe to run multiple times

**Option B: Clear and Fresh Seed**
```bash
node datingSeed.js --clear
```

This will:
- Connect to local MongoDB
- **Clear only dating test data** (users with phones starting with 555000)
- Create 8 fresh test profiles
- Create sample interactions, comments, and matches

**Output:** You'll see highlighted profile details with User IDs

### Step 2: Start Your Server
```bash
npm start
# or
npm run dev
```

### Step 3: Test in Postman

**Base URL:** `http://localhost:3000`

**Login with Alice (Main Test User):**
```
POST /auth/send-otp
Body: { "phoneNumber": "5550001111", "countryCode": "+91" }

POST /auth/verify-otp
Body: { "phoneNumber": "5550001111", "countryCode": "+91", "otp": "123456" }
```

**Use the token** from the response as Bearer Token for all other requests.

---

## 👥 Test Profiles Summary

| # | Name | Phone | Username | Gender | Location | Status | Special |
|---|------|-------|----------|--------|----------|--------|---------|
| 1️⃣ | Alice Johnson | +91 5550001111 | alice_dating_tester | Female | NY | ✅ Active | **Main Test User** |
| 2️⃣ | Bob Smith | +91 5550002222 | bob_nearby_match | Male | NY (~4.5km) | ✅ Active | **Match Ready** 💑 |
| 3️⃣ | Charlie Brown | +91 5550003333 | charlie_to_dislike | Male | NY (~8km) | ✅ Active | To Dislike |
| 4️⃣ | Diana Prince | +91 5550004444 | diana_friend | Female | NY (~2km) | ✅ Active | To Comment |
| 5️⃣ | Eve Wilson | +91 5550005555 | eve_far_away | Female | LA (~3936km) | ✅ Active | Far Away |
| 6️⃣ | Frank Miller | +91 5550006666 | frank_inactive | Male | NY (~3km) | ❌ Inactive | Won't appear |
| 7️⃣ | Grace Lee | +91 5550007777 | grace_new_dater | Female | NY (~1.5km) | ✅ Active | New Dater |
| 8️⃣ | Henry Davis | +91 5550008888 | henry_commenter | Male | NY (~6km) | ✅ Active | Has Comments |

---

## 🧪 Test Scenarios

### 1. Basic Flow
```
Login as Alice → Search Profiles → Like Bob → Create Match ✅
```

### 2. Search & Filter
```
- Near by: 5 profiles (Bob, Charlie, Diana, Grace, Henry)
- Men only: 3 profiles (Bob, Charlie, Henry)
- New dater: 1 profile (Grace)
- Far away (100km+): Eve appears
```

### 3. Interactions
```
- Like Bob → Match created (Bob already liked Alice)
- Dislike Charlie → Profile dismissed
- Comment on Diana → Comment added
- Block Henry → Profile hidden
- Report Charlie → Report created
```

### 4. Match Verification
```
View Matches → See Bob (mutual like) → Check last interaction time
```

---

## 📖 Documentation

### Quick Reference
→ **`DATING_TEST_PROFILES.txt`** - Print this out or keep it open while testing

### Detailed Guide
→ **`DATING_API_TESTING_GUIDE.md`** - Complete testing instructions with:
- API endpoints
- Request/response examples
- Expected results
- Advanced scenarios
- Troubleshooting

### API Reference
→ **`docs/dating-api.md`** - Full API documentation

---

## 🗂️ What Gets Seeded

### Users (8 profiles)
- Complete profile data (name, bio, location, preferences)
- Dating photos and videos (sample URLs)
- Active dating profiles (except Frank)
- Dating preferences (age range, distance, interests)

### Dating Interactions (3 interactions)
- Bob → Alice: Like (pending, ready to match)
- Henry → Diana: Like (pending)
- Charlie → Eve: Dislike (dismissed)

### Dating Comments (3 comments)
- Henry → Alice: "Great smile!"
- Bob → Alice: "Love your vibe!" (liked by Alice)
- Alice → Diana: "Nice profile!"

### No Matches Initially
- Matches are created when you like Bob back
- Tests the match creation flow

---

## 💡 Pro Tips

1. **Save User IDs** - After first search, copy User IDs from response
2. **Use Postman Environment** - Store token, bobId, etc. as variables
3. **Check Console** - Server logs show detailed operation info
4. **Verify in DB** - Use MongoDB Compass to check data
5. **Re-seed Anytime** - Run `node datingSeed.js --clear` to reset

---

## 🔍 Verification Checklist

After seeding, verify:

- [ ] 8 users created (phones: 5550001111 to 5550008888)
- [ ] Alice's dating profile is active
- [ ] Bob has already liked Alice
- [ ] Frank's profile is inactive
- [ ] Grace's profile was recently activated
- [ ] Henry has commented on Alice's profile
- [ ] All users in New York except Eve (LA)

Run this query in MongoDB Compass:
```javascript
db.users.find(
  { phoneNumber: /^555000/ },
  { username: 1, 'dating.isDatingProfileActive': 1, 'location.city': 1 }
)
```

---

## 🐛 Troubleshooting

### "Connection refused"
- Check MongoDB is running: `mongod --version`
- Default: `mongodb://localhost:27017/vibgyorNode`

### "Users already exist"
- This is normal! The script will skip duplicates automatically
- Users are preserved and re-used
- Use `--clear` flag only if you want fresh data: `node datingSeed.js --clear`

### "No profiles in search"
- Check `distanceMax` parameter (try 100)
- Verify Alice's location is set
- Check dating profiles are active

### "Can't create match"
- Verify both users liked each other
- Check both profiles are active
- Ensure users aren't blocked

---

## 📊 Expected API Results

### Search Nearby (50km)
```
Expected: 5 profiles (Bob, Charlie, Diana, Grace, Henry)
Not Expected: Eve (too far), Frank (inactive)
```

### Like Bob
```
Response: { "isMatch": true, "matchId": "..." }
Reason: Bob already liked Alice
```

### View Matches
```
Expected: 1 match (Bob)
```

### Dislike Charlie
```
Response: { "dismissed": true }
Effect: Charlie won't appear in future searches
```

---

## 🔄 Re-seeding

### Safe Re-seed (Preserves Existing Data)
```bash
node datingSeed.js
```
- Existing users are kept
- Skips creating duplicates
- Safe to run anytime

### Fresh Start (Clears Test Data Only)
```bash
node datingSeed.js --clear
```
- Removes only test users (phones: 555000xxxx)
- Preserves all other users in database
- Creates fresh test data

**Note:** The script intelligently handles duplicates and won't crash if users already exist.

---

## 📚 Additional Resources

- **Main Seed**: `src/seed.js` - Seeds entire database (all modules)
- **Dating Models**: `src/user/dating/models/`
- **User Model**: `src/user/auth/model/userAuthModel.js`
- **Controllers**: `src/user/dating/controllers/`

---

## 🎯 Testing Goals

This seed data helps you test:

✅ Profile search and discovery  
✅ Distance-based filtering  
✅ Like/dislike interactions  
✅ Match creation (mutual likes)  
✅ Profile commenting  
✅ Blocking and safety features  
✅ Reporting profiles  
✅ New user filters  
✅ Gender and age filtering  
✅ Active/inactive profile handling  

---

## 📞 Support

For issues or questions:
1. Check `DATING_API_TESTING_GUIDE.md` for detailed instructions
2. Review server console logs for errors
3. Verify database connection
4. Check MongoDB collections using Compass

---

**Happy Testing! 🚀**

Start with `DATING_TEST_PROFILES.txt` for quick reference, then dive into `DATING_API_TESTING_GUIDE.md` for detailed testing.

