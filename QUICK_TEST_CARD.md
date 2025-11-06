# 🚀 Quick Test Card - Updated APIs

## ✅ Postman Collection Updated!

**File:** `scriptFiles/corrected-postman-collection.json`

---

## 🆕 What's New in Posts API

### 1. Field Changes
```diff
- privacy: "public"              ❌ OLD
+ visibility: "public"            ✅ NEW
+ commentVisibility: "everyone"  ✅ NEW
```

**Valid Values:**
- `visibility`: `public` | `followers` | `private`
- `commentVisibility`: `everyone` | `followers` | `none`

### 2. New Endpoints (6)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/user/posts/me` | Get your own posts |
| PUT | `/user/posts/:id/archive` | Hide post (archive) |
| PUT | `/user/posts/:id/unarchive` | Unhide post |
| POST | `/user/posts/:id/save` | Save to collection |
| DELETE | `/user/posts/:id/save` | Remove from saved |
| GET | `/user/posts/saved` | View saved posts |

---

## 🎯 Quick Tests (Copy & Paste)

### Test 1: Create Post (NEW FIELDS)
```json
POST /user/posts
Headers: Authorization: Bearer {{USER_ACCESS_TOKEN}}

Body (form-data):
- content: "Testing new visibility!"
- visibility: "followers"
- commentVisibility: "everyone"
- files: [upload image]
```

### Test 2: Get Your Posts
```
GET /user/posts/me?page=1&limit=20
Headers: Authorization: Bearer {{USER_ACCESS_TOKEN}}
```

### Test 3: Save a Post
```
POST /user/posts/{POST_ID}/save
Headers: Authorization: Bearer {{USER_ACCESS_TOKEN}}
```

### Test 4: Get Saved Posts
```
GET /user/posts/saved?page=1&limit=20
Headers: Authorization: Bearer {{USER_ACCESS_TOKEN}}
```

### Test 5: Archive a Post
```
PUT /user/posts/{POST_ID}/archive
Headers: Authorization: Bearer {{USER_ACCESS_TOKEN}}
```

### Test 6: Update Post (NEW FIELDS)
```json
PUT /user/posts/{POST_ID}
Headers: Authorization: Bearer {{USER_ACCESS_TOKEN}}

Body:
{
  "content": "Updated!",
  "visibility": "private",
  "commentVisibility": "none"
}
```

---

## 📊 Total Endpoints: 150+

| Category | Count | Status |
|----------|-------|--------|
| Posts | **20** | ✅ **UPDATED** |
| Stories | 9 | ✅ |
| Social | 13 | ✅ |
| Messages | 11 | ✅ |
| Calls | 11 | ✅ |
| Auth | 13 | ✅ |
| Others | 70+ | ✅ |

---

## ⚡ Import & Test (3 Steps)

```bash
# 1. Import to Postman
Open Postman → Import → 
scriptFiles/corrected-postman-collection.json

# 2. Set Environment
BASE_URL = http://localhost:3000

# 3. Start Testing!
- Login first
- Create posts with new fields
- Test archive/save features
```

---

## 🔥 Test Credentials

**Seed Script:** `node scriptFiles/seed.js --clear=true`

| Role | Phone | OTP |
|------|-------|-----|
| Admin | +91-9998887777 | 123456 |
| User 1 | +91-7776665555 | 123456 |
| User 2 | +91-8887776666 | 123456 |

---

## ✅ Validation

```bash
✅ JSON syntax: VALID
✅ 150+ endpoints ready
✅ All match your code
✅ Fully documented
```

---

## 📚 Full Documentation

- `API_ENDPOINTS_GUIDE.md` - All 150+ endpoints
- `POSTMAN_UPDATE_COMPLETE.md` - Detailed changes
- `scriptFiles/API_DOCUMENTATION.txt` - API reference

---

**Ready to test! 🎉**

*Import → Set BASE_URL → Start Testing!*

