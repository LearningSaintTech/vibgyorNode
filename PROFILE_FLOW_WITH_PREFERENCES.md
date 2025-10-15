# Complete Profile Flow with Preferences - Visual Guide

## Profile Completion Steps (1-7)

```
┌─────────────────────────────────────────────────────────────┐
│                   USER REGISTRATION FLOW                    │
└─────────────────────────────────────────────────────────────┘

Step 1: BASIC INFO
┌──────────────────────────┐
│ Full Name               │ → Required
│ Username                │ → Required, Unique
│ Email                   │ → Required, Valid format
│ Date of Birth           │ → Required, 18+ years old
│ Bio                     │ → Required
└────────┬─────────────────┘
         │ ✓ All fields complete
         ↓
    
Step 2: GENDER
┌──────────────────────────┐
│ Select Gender           │ → Required
│ - male                  │
│ - female                │
│ - non-binary            │
│ - transgender           │
│ - agender               │
│ - prefer-not-to-say     │
└────────┬─────────────────┘
         │ ✓ Gender selected
         ↓
    
Step 3: PRONOUNS
┌──────────────────────────┐
│ Select Pronouns         │ → Required
│ - he/him                │
│ - she/her               │
│ - they/them             │
│ - he/they               │
│ - she/they              │
└────────┬─────────────────┘
         │ ✓ Pronouns selected
         ↓

Step 4: LIKES & INTERESTS
┌──────────────────────────┐
│ Select Likes (multi)    │ → Required (at least 1)
│ ☑ music                 │
│ ☑ travel                │
│ ☐ movies                │
│ ☐ fitness               │
├──────────────────────────┤
│ Select Interests (multi)│ → Required (at least 1)
│ ☑ hiking                │
│ ☑ photography           │
│ ☐ coding                │
│ ☐ dancing               │
└────────┬─────────────────┘
         │ ✓ Both selected
         ↓

Step 5: PREFERENCES ← ✨ NEW STEP ✨
┌──────────────────────────────────────┐
│ What are you here for?              │ → Required
│ ▼ [Select purpose]                  │
│   - friendship                       │
│   - dating                          │
│   - networking                      │
│   - fun                             │
│   - serious-relationship            │
│   - new-friends                     │
│   - chat                            │
├──────────────────────────────────────┤
│ Your primary language               │ → Required
│ ▼ [Select language]                 │
│   - English                         │
│   - Hindi                           │
│   - Spanish                         │
│   - French                          │
│   - German                          │
│   - Chinese                         │
│   - Japanese                        │
│   ... (12 total)                    │
├──────────────────────────────────────┤
│ Secondary language (optional)       │ → Optional
│ ▼ [Select another language]         │
│   - (Same options as above)         │
└────────┬─────────────────────────────┘
         │ ✓ Required fields complete
         ↓

Step 6: LOCATION
┌──────────────────────────┐
│ City                    │ → Required
│ Country                 │ → Required
│ Coordinates (optional)  │
│ - Latitude              │
│ - Longitude             │
└────────┬─────────────────┘
         │ ✓ Location set
         ↓

Step 7: COMPLETED ✅
┌──────────────────────────┐
│ Profile Complete!       │
│ isProfileCompleted=true │
│ All features unlocked   │
└──────────────────────────┘
```

---

## API Flow for Preferences Step

```
┌─────────────────────────┐
│ User on Step 4          │
│ (likes_interests done)  │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Frontend: Fetch Catalog │
│ GET /user/catalog       │
└────────┬────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│ Response:                        │
│ {                               │
│   "hereFor": [                  │
│     "friendship",               │
│     "dating",                   │
│     "networking", ...           │
│   ],                            │
│   "languages": [                │
│     "English",                  │
│     "Hindi",                    │
│     "Spanish", ...              │
│   ]                             │
│ }                               │
└────────┬─────────────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Render Preferences UI   │
│ - Here For dropdown     │
│ - Primary Lang dropdown │
│ - Secondary Lang (opt)  │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ User Selects:           │
│ ✓ hereFor = friendship  │
│ ✓ primary = English     │
│ ✓ secondary = Hindi     │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Validate Input          │
│ ✓ hereFor not empty     │
│ ✓ primary not empty     │
└────────┬────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│ PUT /user/auth/profile           │
│ {                                │
│   "preferences": {               │
│     "hereFor": "friendship",     │
│     "primaryLanguage": "English",│
│     "secondaryLanguage": "Hindi" │
│   }                              │
│ }                                │
└────────┬─────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│ Backend Validation               │
│ ✓ Check hereFor in catalog       │
│ ✓ Check primaryLang in catalog   │
│ ✓ Update user.preferences        │
│ ✓ Check step completion          │
└────────┬─────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│ Response:                        │
│ {                                │
│   "isProfileCompleted": false,   │
│   "profileCompletionStep": "location",│
│   "nextStep": "location"         │
│ }                                │
└────────┬─────────────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Navigate to Location    │
│ Step (Step 6)           │
└─────────────────────────┘
```

---

## Data Model

### User Profile Structure

```javascript
{
  "_id": "user123",
  "phoneNumber": "7776665555",
  "email": "john@example.com",
  "username": "johndoe123",
  "fullName": "John Doe",
  "dob": "1995-06-15",
  "bio": "Love traveling and photography",
  
  // Step 2
  "gender": "male",
  
  // Step 3
  "pronouns": "he/him",
  
  // Step 4
  "likes": ["travel", "photography", "music"],
  "interests": ["hiking", "coding", "art"],
  
  // Step 5 ← NEW
  "preferences": {
    "hereFor": "friendship",
    "primaryLanguage": "English",
    "secondaryLanguage": "Hindi"
  },
  
  // Step 6
  "location": {
    "city": "Mumbai",
    "country": "India",
    "lat": 19.0760,
    "lng": 72.8777
  },
  
  // Status
  "isProfileCompleted": true,
  "profileCompletionStep": "completed",
  "role": "user",
  "isActive": true
}
```

---

## Catalog Structure

```javascript
{
  "_id": "catalog123",
  
  // Existing Lists
  "genderList": [
    "male", "female", "non-binary", 
    "transgender", "agender", "prefer-not-to-say"
  ],
  "pronounList": [
    "he/him", "she/her", "they/them", 
    "he/they", "she/they"
  ],
  "likeList": [
    "music", "travel", "movies", "fitness", 
    "foodie", "gaming", "reading"
  ],
  "interestList": [
    "hiking", "photography", "coding", "dancing", 
    "yoga", "art", "pets"
  ],
  
  // NEW Lists
  "hereForList": [
    "friendship",
    "dating",
    "networking",
    "fun",
    "serious-relationship",
    "new-friends",
    "chat"
  ],
  "languageList": [
    "English", "Hindi", "Spanish", "French",
    "German", "Chinese", "Japanese", "Korean",
    "Arabic", "Portuguese", "Russian", "Italian"
  ],
  
  "version": 1
}
```

---

## Step-by-Step API Calls

### Complete Profile Setup Sequence

```javascript
// Step 1: Basic Info
PUT /user/auth/profile
{
  "fullName": "John Doe",
  "username": "johndoe123",
  "email": "john@example.com",
  "dob": "1995-06-15",
  "bio": "Love traveling"
}
// → Next: gender

// Step 2: Gender
PUT /user/auth/profile
{
  "gender": "male"
}
// → Next: pronouns

// Step 3: Pronouns
PUT /user/auth/profile
{
  "pronouns": "he/him"
}
// → Next: likes_interests

// Step 4: Likes & Interests
PUT /user/auth/profile
{
  "likes": ["travel", "photography", "music"],
  "interests": ["hiking", "coding", "art"]
}
// → Next: preferences

// Step 5: Preferences ← NEW
PUT /user/auth/profile
{
  "preferences": {
    "hereFor": "friendship",
    "primaryLanguage": "English",
    "secondaryLanguage": "Hindi"
  }
}
// → Next: location

// Step 6: Location
PUT /user/auth/profile
{
  "location": {
    "city": "Mumbai",
    "country": "India",
    "lat": 19.0760,
    "lng": 72.8777
  }
}
// → Next: completed

// Step 7: Profile Completed! ✅
```

---

## Validation Matrix

| Step | Field | Required | Validation |
|------|-------|----------|------------|
| 1 | fullName | ✅ | Non-empty string |
| 1 | username | ✅ | Unique, normalized |
| 1 | email | ✅ | Valid email format |
| 1 | dob | ✅ | 18+ years old |
| 1 | bio | ✅ | Non-empty string |
| 2 | gender | ✅ | From catalog.gender |
| 3 | pronouns | ✅ | From catalog.pronouns |
| 4 | likes | ✅ | Array, at least 1 item |
| 4 | interests | ✅ | Array, at least 1 item |
| **5** | **preferences.hereFor** | **✅** | **From catalog.hereFor** |
| **5** | **preferences.primaryLanguage** | **✅** | **From catalog.languages** |
| **5** | **preferences.secondaryLanguage** | **⚠️** | **Optional, from catalog** |
| 6 | location.city | ✅ | Non-empty string |
| 6 | location.country | ✅ | Non-empty string |

---

## Postman Collection Updates

### New Endpoints Added

1. **Get Specific Catalog - Languages (NEW)**
   ```
   GET /user/catalog/languages
   ```

2. **Get Specific Catalog - Here For (NEW)**
   ```
   GET /user/catalog/hereFor
   ```

3. **Update Profile - Preferences Step (NEW)**
   ```
   PUT /user/auth/profile
   Body: { "preferences": {...} }
   ```

### Updated Endpoints

1. **Get All Catalogs**
   - Now includes `hereFor` and `languages` in response
   - Updated description

2. **Create Catalog**
   - Now accepts `hereForList` and `languageList`
   - Example updated

3. **Update Catalog**
   - Now accepts `hereForList` and `languageList`
   - Example updated

4. **Add Items to Catalog**
   - Now supports `hereFor` and `languages` listTypes
   - Examples for new lists

5. **Remove Items from Catalog**
   - Now supports `hereFor` and `languages` listTypes
   - Examples for new lists

6. **Update User Profile**
   - Now includes preferences in example
   - Updated description with new step flow

7. **Get Profile Step**
   - Updated description to include preferences step

---

## Testing Scenarios

### Scenario 1: New User Complete Profile

```bash
# 1. Register
POST /user/auth/send-otp
POST /user/auth/verify-otp

# 2. Get catalog options
GET /user/catalog
# Returns: gender, pronouns, likes, interests, hereFor, languages

# 3. Step 1: Basic Info
PUT /user/auth/profile
{
  "fullName": "John Doe",
  "username": "johndoe",
  "email": "john@example.com",
  "dob": "1995-06-15",
  "bio": "Traveler"
}

# 4. Step 2: Gender
PUT /user/auth/profile { "gender": "male" }

# 5. Step 3: Pronouns
PUT /user/auth/profile { "pronouns": "he/him" }

# 6. Step 4: Likes & Interests
PUT /user/auth/profile {
  "likes": ["travel", "music"],
  "interests": ["hiking", "coding"]
}

# 7. Step 5: Preferences ← NEW
PUT /user/auth/profile {
  "preferences": {
    "hereFor": "friendship",
    "primaryLanguage": "English",
    "secondaryLanguage": "Hindi"
  }
}

# 8. Step 6: Location
PUT /user/auth/profile {
  "location": {
    "city": "Mumbai",
    "country": "India"
  }
}

# 9. Profile Complete! ✅
GET /user/auth/profile
# Returns: isProfileCompleted = true
```

---

### Scenario 2: Admin Adds New Language

```bash
# Admin wants to add regional languages

PATCH /user/catalog/add
{
  "listType": "languages",
  "items": ["Bengali", "Tamil", "Telugu", "Marathi"]
}

# Response
{
  "success": true,
  "data": {
    "languages": [
      "English", "Hindi", "Spanish", "French",
      "German", "Chinese", "Japanese", "Korean",
      "Arabic", "Portuguese", "Russian", "Italian",
      "Bengali", "Tamil", "Telugu", "Marathi"  ← NEW
    ],
    "version": 2
  }
}

# All users now see 16 language options
```

---

### Scenario 3: User Updates Preferences After Completion

```bash
# User completed profile but wants to change intent

PUT /user/auth/profile
{
  "preferences": {
    "hereFor": "dating",              # Changed from "friendship"
    "primaryLanguage": "Spanish",     # Changed from "English"
    "secondaryLanguage": "English"    # Changed from "Hindi"
  }
}

# Response
{
  "isProfileCompleted": true,         # Still completed
  "profileCompletionStep": "completed", # No change
  "nextStep": "completed"
}

# Preferences updated without affecting completion status
```

---

## Field Usage Examples

### Here For - User Intent

| Value | Description | Typical User |
|-------|-------------|--------------|
| `friendship` | Looking for friends | Social users |
| `dating` | Casual dating | Singles |
| `serious-relationship` | Long-term partner | Committed seekers |
| `networking` | Professional connections | Business users |
| `fun` | Entertainment, casual | Casual users |
| `new-friends` | Expand social circle | Active socializers |
| `chat` | Just conversations | Chatty users |

### Language - Communication Preference

**Primary Language:**
- Main language for app interface
- Language for content recommendations
- Matching with similar language users

**Secondary Language:**
- Additional language proficiency
- Broader matching possibilities
- Shows multilingual capability

---

## Analytics Queries

### User Distribution by Intent

```javascript
// Count by "here for"
db.users.aggregate([
  { $group: { 
      _id: "$preferences.hereFor", 
      count: { $sum: 1 } 
  }},
  { $sort: { count: -1 }}
])

// Results:
// friendship: 450 users
// dating: 320 users
// networking: 180 users
// fun: 150 users
// ...
```

### Language Distribution

```javascript
// Primary language breakdown
db.users.aggregate([
  { $group: { 
      _id: "$preferences.primaryLanguage", 
      count: { $sum: 1 } 
  }},
  { $sort: { count: -1 }}
])

// Results:
// English: 650 users
// Hindi: 280 users
// Spanish: 120 users
// ...
```

### Multilingual Users

```javascript
// Users with secondary language
db.users.count({ 
  'preferences.secondaryLanguage': { $ne: '' } 
})

// Users speaking specific language pair
db.users.count({
  'preferences.primaryLanguage': 'English',
  'preferences.secondaryLanguage': 'Hindi'
})
```

---

## Frontend Component Example

### PreferencesStep.jsx (Complete Implementation)

```jsx
import React, { useState, useEffect } from 'react';
import { getCatalog, updateProfile } from '../../services/api';
import { Button } from '../UI/Button';
import { LoadingSpinner } from '../UI/LoadingSpinner';

export default function PreferencesStep({ onNext, onBack }) {
  const [formData, setFormData] = useState({
    hereFor: '',
    primaryLanguage: '',
    secondaryLanguage: ''
  });
  const [catalog, setCatalog] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch catalog on mount
  useEffect(() => {
    const loadCatalog = async () => {
      try {
        const response = await getCatalog();
        setCatalog(response.data);
      } catch (err) {
        setError('Failed to load options');
      }
    };
    loadCatalog();
  }, []);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.hereFor) {
      setError('Please select what you\'re here for');
      return;
    }
    if (!formData.primaryLanguage) {
      setError('Please select your primary language');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await updateProfile({
        preferences: {
          hereFor: formData.hereFor,
          primaryLanguage: formData.primaryLanguage,
          secondaryLanguage: formData.secondaryLanguage || ''
        }
      });
      onNext(); // Move to next step
    } catch (err) {
      setError(err.message || 'Failed to update preferences');
    } finally {
      setLoading(false);
    }
  };

  if (!catalog) return <LoadingSpinner />;

  return (
    <div className="preferences-step max-w-md mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Your Preferences</h2>
        <p className="text-gray-600">
          Tell us what you're looking for and your language preferences
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Here For */}
        <div>
          <label className="block text-sm font-medium mb-2">
            What are you here for? <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.hereFor}
            onChange={(e) => setFormData({...formData, hereFor: e.target.value})}
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Select your purpose</option>
            {catalog.hereFor.map(option => (
              <option key={option} value={option}>
                {option.split('-').map(w => 
                  w.charAt(0).toUpperCase() + w.slice(1)
                ).join(' ')}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            This helps us connect you with like-minded people
          </p>
        </div>

        {/* Primary Language */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Your primary language <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.primaryLanguage}
            onChange={(e) => setFormData({...formData, primaryLanguage: e.target.value})}
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Select your language</option>
            {catalog.languages.map(lang => (
              <option key={lang} value={lang}>{lang}</option>
            ))}
          </select>
        </div>

        {/* Secondary Language */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Secondary language <span className="text-gray-400">(optional)</span>
          </label>
          <select
            value={formData.secondaryLanguage}
            onChange={(e) => setFormData({...formData, secondaryLanguage: e.target.value})}
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select another language</option>
            {catalog.languages.map(lang => (
              <option key={lang} value={lang}>{lang}</option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            This helps broaden your connections
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex gap-4">
          <Button
            type="button"
            onClick={onBack}
            variant="secondary"
            disabled={loading}
            className="flex-1"
          >
            Back
          </Button>
          <Button
            type="submit"
            disabled={loading || !formData.hereFor || !formData.primaryLanguage}
            className="flex-1"
          >
            {loading ? 'Saving...' : 'Continue'}
          </Button>
        </div>

        {/* Progress Indicator */}
        <div className="text-center text-sm text-gray-500">
          Step 5 of 7
        </div>
      </form>
    </div>
  );
}
```

---

## Postman Collection Summary

### Updated Requests (11 total)

| # | Request Name | Method | Updates |
|---|--------------|--------|---------|
| 1 | Get All Catalogs | GET | ✅ Description updated |
| 2 | Get Specific Catalog - Gender | GET | ✅ Renamed, description added |
| 3 | Get Specific Catalog - Languages | GET | ✨ NEW endpoint |
| 4 | Get Specific Catalog - Here For | GET | ✨ NEW endpoint |
| 5 | Create Catalog | POST | ✅ Body includes hereForList, languageList |
| 6 | Update Catalog | PUT | ✅ Body includes new lists |
| 7 | Add Items to Catalog | PATCH | ✅ Examples for hereFor, languages |
| 8 | Remove Items from Catalog | PATCH | ✅ Examples for new lists |
| 9 | Update User Profile | PUT | ✅ Includes preferences example |
| 10 | Update Profile - Preferences Step | PUT | ✨ NEW dedicated example |
| 11 | Get Profile Step | GET | ✅ Description lists all 7 steps |

---

## Quick Reference

### Preferences Object Structure

```javascript
// Full structure
preferences: {
  hereFor: String,           // Required
  primaryLanguage: String,   // Required  
  secondaryLanguage: String  // Optional
}

// Example values
preferences: {
  hereFor: "friendship",
  primaryLanguage: "English",
  secondaryLanguage: "Hindi"
}

// Minimal (for step completion)
preferences: {
  hereFor: "dating",
  primaryLanguage: "Spanish"
  // secondaryLanguage omitted (optional)
}
```

### Catalog Response Format

```javascript
{
  "success": true,
  "data": {
    "gender": [...],       // 6 options
    "pronouns": [...],     // 5 options
    "likes": [...],        // 7 options
    "interests": [...],    // 7 options
    "hereFor": [...],      // 7 options (NEW)
    "languages": [...],    // 12 options (NEW)
    "version": 1
  }
}
```

---

## Summary

### ✅ Complete Postman Updates

**Collection Info:**
- ✅ Updated description

**Catalog Management Folder:**
- ✅ Added folder description
- ✅ Added 2 new GET endpoints for languages and hereFor
- ✅ Updated all CRUD operations with examples
- ✅ Documented all 6 listTypes

**Authentication Folder:**
- ✅ Added dedicated preferences step example
- ✅ Updated main profile update with preferences
- ✅ Updated Get Profile Step with new step list

**Documentation in Requests:**
- ✅ Field validations
- ✅ Required vs optional fields
- ✅ Examples for each catalog operation
- ✅ Step completion flow

---

### 📊 Postman Collection Stats

| Category | Count |
|----------|-------|
| **Total Requests** | ~180+ |
| **New Requests** | 3 |
| **Updated Requests** | 8 |
| **Catalog Endpoints** | 9 |
| **Profile Endpoints** | 12+ |
| **Documented Steps** | 7 |

---

## Support Resources

**Documentation Files:**
1. `PROFILE_PREFERENCES_DOCUMENTATION.md` - Complete guide
2. `PREFERENCES_QUICK_REFERENCE.md` - Quick reference
3. `PREFERENCES_CHANGES_SUMMARY.md` - Change summary
4. `PROFILE_FLOW_WITH_PREFERENCES.md` - This file (flow guide)
5. `authProfileDoc.txt` - Updated auth docs

**Code Files:**
1. `userCatalogModel.js` - Catalog schema
2. `userAuthModel.js` - User schema with preferences
3. `userCatalogController.js` - Catalog operations
4. `userAuthController.js` - Profile operations
5. `profileSteps.js` - Step configuration

**Postman:**
1. `corrected-postman-collection.json` - Full collection with preferences

---

**Status:** ✅ **Postman Collection Updated - Ready to Import**  
**Version:** 1.0  
**Total Endpoints:** 180+  
**Last Updated:** October 15, 2025

Import the updated Postman collection and test the new preferences endpoints! 🚀

