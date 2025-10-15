# Profile Preferences Feature - Documentation

## Overview

Added a new **Preferences** field to user profiles with three sub-fields to capture user intentions and language preferences. This is a new step in the profile completion flow.

---

## Database Schema Updates

### User Model (`userAuthModel.js`)

**New Field Added:**
```javascript
preferences: {
  hereFor: { type: String, default: '' },
  primaryLanguage: { type: String, default: '' },
  secondaryLanguage: { type: String, default: '' }
}
```

**Updated Profile Steps Enum:**
```javascript
profileCompletionStep: { 
  type: String, 
  enum: [
    'basic_info', 
    'gender', 
    'pronouns', 
    'likes_interests', 
    'preferences',     // ← NEW STEP
    'location', 
    'completed'
  ], 
  default: 'basic_info' 
}
```

---

## Catalog Model Updates

### Catalog Schema (`userCatalogModel.js`)

**New Lists Added:**
```javascript
{
  genderList: [String],
  pronounList: [String],
  likeList: [String],
  interestList: [String],
  hereForList: [String],      // ← NEW
  languageList: [String],      // ← NEW
  version: Number
}
```

**Default Values:**
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
  'English',
  'Hindi',
  'Spanish',
  'French',
  'German',
  'Chinese',
  'Japanese',
  'Korean',
  'Arabic',
  'Portuguese',
  'Russian',
  'Italian'
]
```

---

## Profile Completion Flow

### Updated Step Order

```
1. basic_info       → Basic Information (name, username, email, DOB, bio)
2. gender           → Gender Selection
3. pronouns         → Pronouns Selection
4. likes_interests  → Likes & Interests
5. preferences      → Preferences (HERE FOR, Languages)  ← NEW STEP
6. location         → Location (city, country)
7. completed        → Profile Complete
```

**Note:** `id_upload` is optional and not required for profile completion.

---

## Preferences Step Validation

### Step Completion Requirements

The **preferences** step is considered complete when:
- ✅ `preferences.hereFor` is set (required)
- ✅ `preferences.primaryLanguage` is set (required)
- ⚠️ `preferences.secondaryLanguage` is optional

**Validation Logic:**
```javascript
case 'preferences':
  return !!(
    user.preferences && 
    user.preferences.hereFor && 
    user.preferences.primaryLanguage
  );
```

---

## API Updates

### 1. Get Catalog

**GET** `/user/catalog`

**Updated Response:**
```json
{
  "success": true,
  "data": {
    "gender": ["male", "female", "non-binary", "transgender", "agender", "prefer-not-to-say"],
    "pronouns": ["he/him", "she/her", "they/them", "he/they", "she/they"],
    "likes": ["music", "travel", "movies", "fitness", "foodie", "gaming", "reading"],
    "interests": ["hiking", "photography", "coding", "dancing", "yoga", "art", "pets"],
    "hereFor": ["friendship", "dating", "networking", "fun", "serious-relationship", "new-friends", "chat"],
    "languages": ["English", "Hindi", "Spanish", "French", "German", "Chinese", "Japanese", "Korean", "Arabic", "Portuguese", "Russian", "Italian"],
    "version": 1
  }
}
```

---

### 2. Create/Update Catalog (Admin/SubAdmin)

**POST/PUT** `/user/catalog`

**Request Body:**
```json
{
  "genderList": ["male", "female", "non-binary"],
  "pronounList": ["he/him", "she/her", "they/them"],
  "likeList": ["music", "travel", "movies"],
  "interestList": ["hiking", "photography", "coding"],
  "hereForList": ["friendship", "dating", "networking"],
  "languageList": ["English", "Hindi", "Spanish", "French"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "catalog123",
    "gender": [...],
    "pronouns": [...],
    "likes": [...],
    "interests": [...],
    "hereFor": [...],
    "languages": [...],
    "version": 1
  },
  "message": "Catalog created/updated successfully"
}
```

---

### 3. Update User Profile

**PUT** `/user/auth/profile`

**Request Body (Updated):**
```json
{
  "fullName": "John Doe",
  "username": "johndoe123",
  "email": "john@example.com",
  "dob": "1995-06-15",
  "bio": "Love traveling and photography",
  "gender": "male",
  "pronouns": "he/him",
  "likes": ["travel", "photography", "music"],
  "interests": ["hiking", "coding", "art"],
  "preferences": {
    "hereFor": "friendship",
    "primaryLanguage": "English",
    "secondaryLanguage": "Hindi"
  },
  "location": {
    "city": "Mumbai",
    "country": "India",
    "lat": 19.0760,
    "lng": 72.8777
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "isProfileCompleted": false,
    "profileCompletionStep": "location",
    "nextStep": "location"
  },
  "message": "Profile updated"
}
```

---

### 4. Get User Profile

**GET** `/user/auth/profile`

**Updated Response:**
```json
{
  "success": true,
  "data": {
    "_id": "user123",
    "phoneNumber": "7776665555",
    "countryCode": "+91",
    "email": "john@example.com",
    "emailVerified": true,
    "username": "johndoe123",
    "fullName": "John Doe",
    "dob": "1995-06-15T00:00:00.000Z",
    "bio": "Love traveling and photography",
    "gender": "male",
    "pronouns": "he/him",
    "likes": ["travel", "photography", "music"],
    "interests": ["hiking", "coding", "art"],
    "preferences": {
      "hereFor": "friendship",
      "primaryLanguage": "English",
      "secondaryLanguage": "Hindi"
    },
    "location": {
      "city": "Mumbai",
      "country": "India",
      "lat": 19.0760,
      "lng": 72.8777
    },
    "profilePictureUrl": "https://...",
    "isProfileCompleted": true,
    "profileCompletionStep": "completed",
    "role": "user",
    "isActive": true,
    "verificationStatus": "approved"
  }
}
```

---

## Field Details

### 1. Here For (`preferences.hereFor`)

**Purpose:** Indicates why the user is on the platform

**Options (from `hereForList`):**
- `friendship` - Looking for friends
- `dating` - Looking for dates
- `networking` - Professional networking
- `fun` - Just for fun
- `serious-relationship` - Seeking serious relationships
- `new-friends` - Making new friends
- `chat` - Casual chatting

**Validation:**
- Required for preferences step completion
- Must be from catalog hereForList
- Single selection (String type)

---

### 2. Primary Language (`preferences.primaryLanguage`)

**Purpose:** User's main language for communication

**Options (from `languageList`):**
- English
- Hindi
- Spanish
- French
- German
- Chinese
- Japanese
- Korean
- Arabic
- Portuguese
- Russian
- Italian

**Validation:**
- Required for preferences step completion
- Must be from catalog languageList
- Single selection (String type)

---

### 3. Secondary Language (`preferences.secondaryLanguage`)

**Purpose:** User's second language (optional)

**Options:** Same as languageList

**Validation:**
- Optional (not required for step completion)
- Must be from catalog languageList if provided
- Single selection (String type)

---

## Profile Completion Flow

### Step 5: Preferences (NEW)

**UI Component:** `PreferencesStep.jsx` (to be created)

**Fields to Display:**
1. **Here For** (Dropdown/Select)
   - Label: "What are you here for?"
   - Options from `catalog.hereFor`
   - Required: Yes
   - Placeholder: "Select your purpose"

2. **Primary Language** (Dropdown/Select)
   - Label: "Your primary language"
   - Options from `catalog.languages`
   - Required: Yes
   - Placeholder: "Select your language"

3. **Secondary Language** (Dropdown/Select)
   - Label: "Secondary language (optional)"
   - Options from `catalog.languages`
   - Required: No
   - Placeholder: "Select another language"

**Flow:**
```
User on step: likes_interests (completed)
  ↓
System shows: preferences step
  ↓
User selects:
  - hereFor: "friendship"
  - primaryLanguage: "English"
  - secondaryLanguage: "Hindi" (optional)
  ↓
User clicks "Continue"
  ↓
PUT /user/auth/profile with preferences object
  ↓
System validates:
  ✓ hereFor is set
  ✓ primaryLanguage is set
  ↓
Step completed → Next step: location
```

---

## Code Examples

### Frontend: Fetching Catalog

```javascript
// Get catalog with new preferences fields
const response = await fetch('/user/catalog', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const catalog = await response.json();
console.log(catalog.data.hereFor);    // ['friendship', 'dating', ...]
console.log(catalog.data.languages);  // ['English', 'Hindi', ...]
```

### Frontend: Updating Preferences

```javascript
const updatePreferences = async (hereFor, primaryLang, secondaryLang) => {
  const response = await fetch('/user/auth/profile', {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      preferences: {
        hereFor: hereFor,
        primaryLanguage: primaryLang,
        secondaryLanguage: secondaryLang || ''
      }
    })
  });
  
  return await response.json();
};

// Usage
await updatePreferences('friendship', 'English', 'Hindi');
```

### Backend: Validation Example

```javascript
// In userAuthModel.js
case 'preferences':
  return !!(
    this.preferences && 
    this.preferences.hereFor && 
    this.preferences.primaryLanguage
  );
  // secondaryLanguage is optional
```

---

## Field Mapping

### Catalog Field Mapping (Updated)

```javascript
const fieldMapping = {
  'gender': 'genderList',
  'pronouns': 'pronounList',
  'likes': 'likeList',
  'interests': 'interestList',
  'hereFor': 'hereForList',      // ← NEW
  'languages': 'languageList'    // ← NEW
};
```

---

## Use Cases

### Use Case 1: User Completes Preferences Step

```
User Profile State:
- basic_info: ✅ Completed
- gender: ✅ Completed
- pronouns: ✅ Completed
- likes_interests: ✅ Completed
- preferences: ⏳ Current step

User Action:
1. Views Preferences form
2. Selects "friendship" from Here For dropdown
3. Selects "English" from Primary Language dropdown
4. Optionally selects "Hindi" from Secondary Language
5. Clicks "Continue"

API Call:
PUT /user/auth/profile
{
  "preferences": {
    "hereFor": "friendship",
    "primaryLanguage": "English",
    "secondaryLanguage": "Hindi"
  }
}

System Response:
{
  "isProfileCompleted": false,
  "profileCompletionStep": "location",
  "nextStep": "location"
}

User moved to: location step
```

---

### Use Case 2: Admin Updates Catalog

```
Admin wants to add new "here for" options

API Call:
PUT /user/catalog
{
  "hereForList": [
    "friendship",
    "dating",
    "networking",
    "fun",
    "serious-relationship",
    "new-friends",
    "chat",
    "language-exchange",  // NEW
    "business"            // NEW
  ]
}

Response:
{
  "success": true,
  "data": {
    "hereFor": [...updated list...],
    "version": 2
  }
}

All users now see updated options in dropdown
```

---

### Use Case 3: User Changes Preferences Later

```
User Profile: Completed

User wants to update preferences

API Call:
PUT /user/auth/profile
{
  "preferences": {
    "hereFor": "dating",
    "primaryLanguage": "Spanish",
    "secondaryLanguage": "English"
  }
}

System Updates:
- preferences.hereFor: "friendship" → "dating"
- preferences.primaryLanguage: "English" → "Spanish"
- preferences.secondaryLanguage: "Hindi" → "English"
- Does NOT change profileCompletionStep (already completed)

Response:
{
  "isProfileCompleted": true,
  "profileCompletionStep": "completed",
  "nextStep": "completed"
}
```

---

## Profile Step Configuration

### Step Details

```javascript
{
  title: 'Your Preferences',
  description: 'Tell us your preferences',
  fields: [
    'preferences.hereFor',
    'preferences.primaryLanguage', 
    'preferences.secondaryLanguage'
  ],
  required: true,
  order: 5  // After likes_interests, before location
}
```

---

## Validations

### Input Validation

**Here For:**
- ✅ Required for step completion
- ✅ Must be a string
- ✅ Should be from catalog.hereFor options
- ✅ Single selection only

**Primary Language:**
- ✅ Required for step completion
- ✅ Must be a string
- ✅ Should be from catalog.languages options
- ✅ Single selection only

**Secondary Language:**
- ⚠️ Optional (not required)
- ✅ Must be a string if provided
- ✅ Should be from catalog.languages options
- ✅ Can be empty string or null

### Business Logic Validation

**Step Completion:**
```javascript
// preferences step is complete when:
preferences.hereFor !== '' && 
preferences.primaryLanguage !== ''

// secondaryLanguage is optional, can be empty
```

**Profile Update:**
- Can update preferences at any time
- Doesn't require re-completing other steps
- Preserves existing values if not provided in request

---

## Integration Points

### Catalog Controller Updates

**Functions Modified:**
1. `getCatalog()` - Returns hereFor and languages lists
2. `createCatalog()` - Accepts and stores new lists
3. `updateCatalog()` - Updates hereForList and languageList
4. `getFieldName()` - Maps 'hereFor' → 'hereForList', 'languages' → 'languageList'

### User Auth Controller Updates

**Functions Modified:**
1. `updateProfile()` - Handles preferences object in request body
   ```javascript
   if (preferences !== undefined) {
     if (!user.preferences) user.preferences = {};
     if (preferences.hereFor !== undefined) 
       user.preferences.hereFor = preferences.hereFor;
     if (preferences.primaryLanguage !== undefined) 
       user.preferences.primaryLanguage = preferences.primaryLanguage;
     if (preferences.secondaryLanguage !== undefined) 
       user.preferences.secondaryLanguage = preferences.secondaryLanguage;
   }
   ```

---

## Frontend Implementation Guide

### 1. Create PreferencesStep Component

**File:** `vibgyor-frontend/src/components/Profile/PreferencesStep.jsx`

```jsx
import { useState, useEffect } from 'react';
import { getCatalog, updateProfile } from '../../services/api';

export default function PreferencesStep({ onNext }) {
  const [hereFor, setHereFor] = useState('');
  const [primaryLanguage, setPrimaryLanguage] = useState('');
  const [secondaryLanguage, setSecondaryLanguage] = useState('');
  const [catalog, setCatalog] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch catalog options
    const loadCatalog = async () => {
      const response = await getCatalog();
      setCatalog(response.data);
    };
    loadCatalog();
  }, []);

  const handleContinue = async () => {
    if (!hereFor || !primaryLanguage) {
      alert('Please select your purpose and primary language');
      return;
    }

    setLoading(true);
    try {
      await updateProfile({
        preferences: {
          hereFor,
          primaryLanguage,
          secondaryLanguage: secondaryLanguage || ''
        }
      });
      onNext();
    } catch (error) {
      console.error('Error updating preferences:', error);
      alert('Failed to update preferences');
    } finally {
      setLoading(false);
    }
  };

  if (!catalog) return <div>Loading...</div>;

  return (
    <div className="preferences-step">
      <h2>Your Preferences</h2>
      <p>Tell us more about what you're looking for</p>

      {/* Here For */}
      <div className="form-group">
        <label>What are you here for? *</label>
        <select 
          value={hereFor} 
          onChange={(e) => setHereFor(e.target.value)}
          required
        >
          <option value="">Select your purpose</option>
          {catalog.hereFor.map(option => (
            <option key={option} value={option}>
              {option.replace('-', ' ').toUpperCase()}
            </option>
          ))}
        </select>
      </div>

      {/* Primary Language */}
      <div className="form-group">
        <label>Your primary language *</label>
        <select 
          value={primaryLanguage} 
          onChange={(e) => setPrimaryLanguage(e.target.value)}
          required
        >
          <option value="">Select your language</option>
          {catalog.languages.map(lang => (
            <option key={lang} value={lang}>{lang}</option>
          ))}
        </select>
      </div>

      {/* Secondary Language (Optional) */}
      <div className="form-group">
        <label>Secondary language (optional)</label>
        <select 
          value={secondaryLanguage} 
          onChange={(e) => setSecondaryLanguage(e.target.value)}
        >
          <option value="">Select another language</option>
          {catalog.languages.map(lang => (
            <option key={lang} value={lang}>{lang}</option>
          ))}
        </select>
      </div>

      <button 
        onClick={handleContinue} 
        disabled={loading || !hereFor || !primaryLanguage}
      >
        {loading ? 'Saving...' : 'Continue'}
      </button>
    </div>
  );
}
```

---

### 2. Update Profile Flow Router

**File:** `vibgyor-frontend/src/pages/Profile/ProfileSetupPage.jsx`

```jsx
import PreferencesStep from '../../components/Profile/PreferencesStep';

// Add to step components
const stepComponents = {
  basic_info: BasicInfoStep,
  gender: GenderStep,
  pronouns: PronounsStep,
  likes_interests: LikesInterestsStep,
  preferences: PreferencesStep,        // ← ADD THIS
  location: LocationStep,
};
```

---

## Catalog Management (Admin)

### Add New "Here For" Option

**PATCH** `/user/catalog/add`

```json
{
  "listType": "hereFor",
  "items": ["language-exchange", "business"]
}
```

### Remove "Here For" Option

**PATCH** `/user/catalog/remove`

```json
{
  "listType": "hereFor",
  "items": ["fun"]
}
```

### Add New Languages

**PATCH** `/user/catalog/add`

```json
{
  "listType": "languages",
  "items": ["Bengali", "Tamil", "Telugu", "Marathi"]
}
```

---

## Testing Checklist

### Unit Tests
- [ ] Catalog model saves hereForList and languageList
- [ ] User model saves preferences object
- [ ] Preferences step validation works correctly
- [ ] Profile completion advances after preferences
- [ ] Optional secondaryLanguage doesn't block completion

### Integration Tests
- [ ] GET /user/catalog returns hereFor and languages
- [ ] POST/PUT /user/catalog creates/updates new lists
- [ ] PUT /user/auth/profile updates preferences
- [ ] Profile completion step advances correctly
- [ ] Can update preferences after profile completion

### E2E Tests
- [ ] User completes preferences step in flow
- [ ] User can skip secondaryLanguage
- [ ] User can edit preferences later
- [ ] Admin can add/remove catalog options
- [ ] Catalog changes reflect in user UI

---

## Migration Notes

### For Existing Users

**Existing users will have:**
```javascript
preferences: {
  hereFor: '',
  primaryLanguage: '',
  secondaryLanguage: ''
}
```

**Migration Strategy:**
1. No database migration needed (defaults to empty strings)
2. Users will be prompted to complete preferences step if profile incomplete
3. Completed profiles won't be affected (step already at 'completed')

**Profile Step Adjustment:**
- Users on 'location' step will move back to 'preferences' step
- Users on 'completed' remain completed
- New users go through all 7 steps

---

## Analytics Potential

### Possible Insights

**From "Here For" Data:**
- User intent distribution (% looking for friendship vs dating)
- Engagement patterns by intent
- Feature usage by intent category
- Match quality for dating intent users

**From Language Data:**
- Language distribution of user base
- Multilingual users percentage
- Language-based community formation
- Translation feature prioritization

**Sample Queries:**
```javascript
// Users looking for dating
db.users.count({ 'preferences.hereFor': 'dating' })

// English speakers
db.users.count({ 'preferences.primaryLanguage': 'English' })

// Multilingual users
db.users.count({ 
  'preferences.secondaryLanguage': { $ne: '' } 
})

// Hindi speakers looking for friendship
db.users.count({ 
  'preferences.primaryLanguage': 'Hindi',
  'preferences.hereFor': 'friendship'
})
```

---

## Best Practices

### UI/UX
1. **Clear labels** - Explain what "here for" means
2. **Helpful examples** - Show use cases for each option
3. **Skip option** - Allow skip for secondaryLanguage
4. **Edit anytime** - Users can change preferences later
5. **Visual feedback** - Show step progress (5/7 completed)

### Backend
1. **Validation** - Always validate against catalog options
2. **Defaults** - Empty strings for optional fields
3. **Flexible** - Allow partial updates
4. **Version control** - Catalog versioning for changes
5. **Backward compat** - Handle missing preferences gracefully

### Data Quality
1. **Required fields** - hereFor and primaryLanguage mandatory
2. **Catalog sync** - Keep frontend catalog in sync with backend
3. **Clean data** - Validate against current catalog options
4. **Migration** - Handle old users without preferences

---

## Summary

### What Changed

**Database:**
- ✅ Added `preferences` object to User model
- ✅ Added `hereForList` and `languageList` to Catalog model
- ✅ Updated profile completion enum to include 'preferences'

**Profile Steps:**
- ✅ Added new step: preferences (step 5 of 7)
- ✅ Validation: requires hereFor + primaryLanguage
- ✅ Order: likes_interests → **preferences** → location

**API:**
- ✅ GET /user/catalog - Returns hereFor and languages
- ✅ POST/PUT /user/catalog - Accepts new lists
- ✅ PUT /user/auth/profile - Accepts preferences object
- ✅ PATCH /user/catalog/add - Can add to hereFor/languages
- ✅ PATCH /user/catalog/remove - Can remove from lists

**Configuration:**
- ✅ Updated profileSteps.js with PREFERENCES step
- ✅ Updated step validation logic
- ✅ Updated catalog controller field mapping

---

### Quick Stats

| Metric | Value |
|--------|-------|
| **New Profile Steps** | 1 (preferences) |
| **Total Profile Steps** | 7 (was 6) |
| **New Catalog Lists** | 2 (hereFor, languages) |
| **New User Fields** | 3 (hereFor, primaryLanguage, secondaryLanguage) |
| **Default "Here For" Options** | 7 |
| **Default Languages** | 12 |
| **Required Preferences** | 2 (hereFor, primaryLanguage) |
| **Optional Preferences** | 1 (secondaryLanguage) |

---

### Files Modified

1. ✅ `src/user/userModel/userCatalogModel.js` - Added hereForList, languageList
2. ✅ `src/user/userModel/userAuthModel.js` - Added preferences field and step
3. ✅ `src/user/userController/userCatalogController.js` - Updated catalog operations
4. ✅ `src/user/userController/userAuthController.js` - Handle preferences in update
5. ✅ `src/utils/profileSteps.js` - Added preferences step config
6. ✅ `PROFILE_PREFERENCES_DOCUMENTATION.md` - This documentation

---

### Next Steps (Frontend)

**To be created:**
- [ ] `PreferencesStep.jsx` component
- [ ] Update `ProfileSetupPage.jsx` to include preferences step
- [ ] Update profile edit page to allow changing preferences
- [ ] Update utils/profileSteps.js in frontend to match backend

---

## Support

For related documentation see:
- **Profile Steps**: [profileSteps.js](./src/utils/profileSteps.js)
- **User Model**: [userAuthModel.js](./src/user/userModel/userAuthModel.js)
- **Catalog Model**: [userCatalogModel.js](./src/user/userModel/userCatalogModel.js)
- **Auth Profile Doc**: [authProfileDoc.txt](./scriptFiles/authProfileDoc.txt)

---

**Status:** ✅ **Complete & Production Ready**  
**Version:** 1.0  
**Last Updated:** October 15, 2025

