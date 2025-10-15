# Preferences Field - Quick Reference

## Overview
New **Preferences** field added to user profiles with 3 sub-fields for capturing user intent and language preferences.

---

## Quick Facts

| Property | Value |
|----------|-------|
| **Step Name** | `preferences` |
| **Step Order** | 5 of 7 |
| **Required Fields** | 2 (hereFor, primaryLanguage) |
| **Optional Fields** | 1 (secondaryLanguage) |
| **Catalog Lists** | 2 (hereForList, languageList) |
| **Default "Here For" Options** | 7 |
| **Default Languages** | 12 |

---

## Database Schema

### User Model
```javascript
preferences: {
  hereFor: String,           // Required
  primaryLanguage: String,   // Required
  secondaryLanguage: String  // Optional
}
```

### Catalog Model
```javascript
hereForList: [
  'friendship',
  'dating', 
  'networking',
  'fun',
  'serious-relationship',
  'new-friends',
  'chat'
]

languageList: [
  'English', 'Hindi', 'Spanish', 'French',
  'German', 'Chinese', 'Japanese', 'Korean',
  'Arabic', 'Portuguese', 'Russian', 'Italian'
]
```

---

## Profile Steps (Updated)

```
Step 1: basic_info       ✓
Step 2: gender           ✓
Step 3: pronouns         ✓
Step 4: likes_interests  ✓
Step 5: preferences      ✓ ← NEW STEP
Step 6: location         ✓
Step 7: completed        ✓
```

**Total Steps:** 7 (was 6)

---

## API Examples

### Get Catalog (includes new fields)

```bash
GET /user/catalog

Response:
{
  "success": true,
  "data": {
    "gender": [...],
    "pronouns": [...],
    "likes": [...],
    "interests": [...],
    "hereFor": ["friendship", "dating", ...],      ← NEW
    "languages": ["English", "Hindi", ...],        ← NEW
    "version": 1
  }
}
```

### Update Profile with Preferences

```bash
PUT /user/auth/profile

Request:
{
  "preferences": {
    "hereFor": "friendship",
    "primaryLanguage": "English",
    "secondaryLanguage": "Hindi"
  }
}

Response:
{
  "success": true,
  "data": {
    "isProfileCompleted": false,
    "profileCompletionStep": "location",
    "nextStep": "location"
  }
}
```

### Admin: Add Language to Catalog

```bash
PATCH /user/catalog/add

Request:
{
  "listType": "languages",
  "items": ["Bengali", "Tamil"]
}
```

---

## Validation Rules

### Step Completion
```javascript
✓ hereFor must be non-empty
✓ primaryLanguage must be non-empty
⚠ secondaryLanguage is optional
```

### Field Constraints
```javascript
✓ hereFor: String from hereForList
✓ primaryLanguage: String from languageList
✓ secondaryLanguage: String from languageList or empty
```

---

## Files Modified

| File | Changes |
|------|---------|
| `userCatalogModel.js` | Added hereForList, languageList |
| `userAuthModel.js` | Added preferences field, updated enum |
| `userCatalogController.js` | Updated all CRUD operations |
| `userAuthController.js` | Handle preferences in updateProfile |
| `profileSteps.js` | Added preferences step config |
| `corrected-postman-collection.json` | Updated examples |
| `PROFILE_PREFERENCES_DOCUMENTATION.md` | Full documentation |

---

## Frontend TODO

### Components to Create
```
src/components/Profile/
└── PreferencesStep.jsx  ← NEW COMPONENT
```

### Components to Update
```
src/pages/Profile/
└── ProfileSetupPage.jsx  ← Add preferences step routing

src/utils/
└── profileSteps.js  ← Add PREFERENCES constant
```

---

## Usage Example (Frontend)

```jsx
// PreferencesStep.jsx
import { useState, useEffect } from 'react';

export default function PreferencesStep({ onNext }) {
  const [hereFor, setHereFor] = useState('');
  const [primaryLang, setPrimaryLang] = useState('');
  const [secondaryLang, setSecondaryLang] = useState('');
  const [catalog, setCatalog] = useState(null);

  useEffect(() => {
    // Fetch catalog
    fetch('/user/catalog')
      .then(res => res.json())
      .then(data => setCatalog(data.data));
  }, []);

  const handleSubmit = async () => {
    await fetch('/user/auth/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        preferences: { 
          hereFor, 
          primaryLanguage: primaryLang, 
          secondaryLanguage: secondaryLang 
        }
      })
    });
    onNext();
  };

  return (
    <div>
      <h2>Your Preferences</h2>
      
      {/* Here For */}
      <select value={hereFor} onChange={e => setHereFor(e.target.value)}>
        <option value="">What are you here for?</option>
        {catalog?.hereFor.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>

      {/* Primary Language */}
      <select value={primaryLang} onChange={e => setPrimaryLang(e.target.value)}>
        <option value="">Your primary language</option>
        {catalog?.languages.map(lang => (
          <option key={lang} value={lang}>{lang}</option>
        ))}
      </select>

      {/* Secondary Language (Optional) */}
      <select value={secondaryLang} onChange={e => setSecondaryLang(e.target.value)}>
        <option value="">Secondary language (optional)</option>
        {catalog?.languages.map(lang => (
          <option key={lang} value={lang}>{lang}</option>
        ))}
      </select>

      <button 
        onClick={handleSubmit} 
        disabled={!hereFor || !primaryLang}
      >
        Continue
      </button>
    </div>
  );
}
```

---

## Testing Commands

### Test Catalog
```bash
# Get catalog
curl -X GET http://localhost:3000/user/catalog

# Update catalog (Admin)
curl -X PUT http://localhost:3000/user/catalog \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "hereForList": ["friendship", "dating"],
    "languageList": ["English", "Hindi"]
  }'
```

### Test Profile Update
```bash
# Update with preferences
curl -X PUT http://localhost:3000/user/auth/profile \
  -H "Authorization: Bearer USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "preferences": {
      "hereFor": "friendship",
      "primaryLanguage": "English",
      "secondaryLanguage": "Hindi"
    }
  }'
```

---

## Migration Guide

### For Existing Users

**No migration needed!**
- Existing users will have empty preferences: `{ hereFor: '', primaryLanguage: '', secondaryLanguage: '' }`
- If profile incomplete, they'll see preferences step
- If profile completed, they can update anytime from settings

### For Existing Catalog

**Auto-seeding:**
- If no hereForList exists, defaults are seeded on first GET /user/catalog
- If no languageList exists, defaults are seeded on first GET /user/catalog

---

## Analytics Queries

### User Intent Analysis
```javascript
// Count users by intent
db.users.aggregate([
  { $group: { 
      _id: "$preferences.hereFor", 
      count: { $sum: 1 } 
  }},
  { $sort: { count: -1 }}
])

// Users looking for dating
db.users.count({ 'preferences.hereFor': 'dating' })

// Users here for friendship
db.users.count({ 'preferences.hereFor': 'friendship' })
```

### Language Analysis
```javascript
// Primary language distribution
db.users.aggregate([
  { $group: { 
      _id: "$preferences.primaryLanguage", 
      count: { $sum: 1 } 
  }},
  { $sort: { count: -1 }}
])

// Multilingual users
db.users.count({ 
  'preferences.secondaryLanguage': { $ne: '' } 
})

// Hindi speakers
db.users.count({ 
  $or: [
    { 'preferences.primaryLanguage': 'Hindi' },
    { 'preferences.secondaryLanguage': 'Hindi' }
  ]
})
```

---

## Field Usage Examples

### "Here For" Field

| Value | User Intent | Use Case |
|-------|-------------|----------|
| `friendship` | Making friends | Connect with like-minded people |
| `dating` | Casual dating | Find romantic interests |
| `serious-relationship` | Long-term partner | Find serious relationships |
| `networking` | Professional | Business connections |
| `fun` | Entertainment | Casual interactions |
| `new-friends` | Expand circle | Meet new people |
| `chat` | Conversation | Just talk to people |

### Language Field

**Primary Language:**
- User's main communication language
- Used for content recommendations
- Used for matching with similar language users

**Secondary Language:**
- Additional language user knows
- Broadens matching pool
- Shows multilingual capability

---

## Complete Profile Example

```json
{
  "_id": "user123",
  "phoneNumber": "7776665555",
  "email": "john@example.com",
  "username": "johndoe123",
  "fullName": "John Doe",
  "dob": "1995-06-15",
  "bio": "Love traveling",
  "gender": "male",
  "pronouns": "he/him",
  "likes": ["travel", "photography"],
  "interests": ["hiking", "coding"],
  "preferences": {
    "hereFor": "friendship",
    "primaryLanguage": "English",
    "secondaryLanguage": "Hindi"
  },
  "location": {
    "city": "Mumbai",
    "country": "India"
  },
  "profilePictureUrl": "https://...",
  "isProfileCompleted": true,
  "profileCompletionStep": "completed"
}
```

---

## Summary

### ✅ What Was Added

**User Profile:**
- `preferences.hereFor` (required)
- `preferences.primaryLanguage` (required)
- `preferences.secondaryLanguage` (optional)

**Catalog:**
- `hereForList` (7 default options)
- `languageList` (12 default languages)

**Profile Steps:**
- New step: `preferences` (step 5 of 7)
- Requires: hereFor + primaryLanguage

**APIs:**
- GET /user/catalog - Returns hereFor & languages
- POST/PUT /user/catalog - Accepts new lists
- PUT /user/auth/profile - Accepts preferences object

---

### 📊 Impact

| Metric | Before | After |
|--------|--------|-------|
| Profile Steps | 6 | 7 |
| Catalog Lists | 4 | 6 |
| User Fields | ~15 | ~18 |
| Required Step Fields | ~10 | ~12 |

---

**Status:** ✅ **Complete & Production Ready**  
**Version:** 1.0  
**Last Updated:** October 15, 2025

For complete documentation, see: [PROFILE_PREFERENCES_DOCUMENTATION.md](./PROFILE_PREFERENCES_DOCUMENTATION.md)

