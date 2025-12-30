# SubAdmin Profile API Documentation

## Overview
Complete CRUD operations for SubAdmin profile management with image upload support using multer middleware and S3 storage.

## Authentication
All routes require JWT authentication with `SUBADMIN` role, except admin routes which require `ADMIN` role.

## Base URL
```
/subadmin
```

---

## SubAdmin Routes (Own Profile)

### 1. Get Own Profile
**GET** `/subadmin/profile`

Get the current subadmin's profile using JWT token.

**Headers:**
```
Authorization: Bearer <subadmin_jwt_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Subadmin profile fetched successfully",
  "data": {
    "_id": "...",
    "firstName": "John",
    "lastName": "Doe",
    "email": "subadmin@example.com",
    "phone": "8888888888",
    "gender": "Male",
    "profileImage": "https://...",
    "createdBy": "...",
    "isActive": true,
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

---

### 2. Create Own Profile
**POST** `/subadmin/profile`

Create subadmin profile after authentication.

**Headers:**
```
Authorization: Bearer <subadmin_jwt_token>
Content-Type: multipart/form-data
```

**Body (form-data):**
- `firstName` (required): String
- `lastName` (required): String
- `email` (required): String (unique)
- `phone` (required): String (unique)
- `gender` (optional): String (Male, Female, Other) - default: Male
- `dateOfBirth` (optional): Date (YYYY-MM-DD)
- `address` (optional): String
- `city` (optional): String
- `state` (optional): String
- `pinCode` (optional): String
- `isActive` (optional): Boolean - default: true
- `profileImage` (optional): File (JPEG, PNG, WebP, GIF - Max 5MB)

**Response:**
```json
{
  "success": true,
  "message": "Subadmin profile created successfully",
  "data": { ... }
}
```

---

### 3. Update Own Profile
**PUT** `/subadmin/profile`

Update subadmin profile. All fields are optional.

**Headers:**
```
Authorization: Bearer <subadmin_jwt_token>
Content-Type: multipart/form-data
```

**Body (form-data):**
- All fields from create are optional
- Only include fields you want to update
- If `profileImage` is provided, it replaces the existing image

**Response:**
```json
{
  "success": true,
  "message": "Subadmin profile updated successfully",
  "data": { ... }
}
```

---

### 4. Delete Own Profile
**DELETE** `/subadmin/profile`

Delete subadmin profile and associated image from S3.

**Headers:**
```
Authorization: Bearer <subadmin_jwt_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Subadmin profile deleted successfully",
  "data": null
}
```

---

## Admin Routes (Manage All SubAdmins)

### 5. Get All SubAdmin Profiles
**GET** `/subadmin/profiles`

Get all subadmin profiles with pagination and search.

**Headers:**
```
Authorization: Bearer <admin_jwt_token>
```

**Query Parameters:**
- `page` (optional): Number - default: 1
- `limit` (optional): Number - default: 10
- `search` (optional): String - search by firstName, lastName, email, phone
- `isActive` (optional): Boolean - filter by active status

**Response:**
```json
{
  "success": true,
  "message": "Subadmin profiles fetched successfully",
  "data": {
    "profiles": [...],
    "pagination": {
      "total": 50,
      "page": 1,
      "limit": 10,
      "totalPages": 5
    }
  }
}
```

---

### 6. Get SubAdmin Profile by ID
**GET** `/subadmin/profile/:id`

Get a specific subadmin profile by ID (Admin only).

**Headers:**
```
Authorization: Bearer <admin_jwt_token>
```

**URL Parameters:**
- `id`: SubAdmin Profile ID

**Response:**
```json
{
  "success": true,
  "message": "Subadmin profile fetched successfully",
  "data": { ... }
}
```

---

## Image Upload Specifications

- **Field Name**: `profileImage`
- **Supported Formats**: JPEG, JPG, PNG, WebP, GIF
- **Maximum Size**: 5MB
- **Storage**: AWS S3
- **Middleware**: `multerSubadminProfile.js`

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Missing required fields: firstName, lastName, email, phone"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Subadmin ID not found in token"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Subadmin profile not found"
}
```

### 409 Conflict
```json
{
  "success": false,
  "message": "email already exists"
}
```

### 500 Server Error
```json
{
  "success": false,
  "message": "Failed to create subadmin profile"
}
```

---

## Example cURL Commands

### Create Profile
```bash
curl -X POST "http://localhost:3000/subadmin/profile" \
  -H "Authorization: Bearer YOUR_SUBADMIN_TOKEN" \
  -F "firstName=John" \
  -F "lastName=Doe" \
  -F "email=subadmin@example.com" \
  -F "phone=8888888888" \
  -F "gender=Male" \
  -F "city=Mumbai" \
  -F "profileImage=@/path/to/image.jpg"
```

### Update Profile
```bash
curl -X PUT "http://localhost:3000/subadmin/profile" \
  -H "Authorization: Bearer YOUR_SUBADMIN_TOKEN" \
  -F "city=Delhi" \
  -F "profileImage=@/path/to/new-image.jpg"
```

### Get Profile
```bash
curl -X GET "http://localhost:3000/subadmin/profile" \
  -H "Authorization: Bearer YOUR_SUBADMIN_TOKEN"
```

### Delete Profile
```bash
curl -X DELETE "http://localhost:3000/subadmin/profile" \
  -H "Authorization: Bearer YOUR_SUBADMIN_TOKEN"
```

---

## Notes

1. **JWT Token**: Subadmin must authenticate first using OTP to get JWT token
2. **Profile Linking**: Profile is linked to SubAdmin auth model via `createdBy` field
3. **Auto Sync**: Profile updates automatically sync with SubAdmin auth model (name, email, avatarUrl)
4. **Image Cleanup**: Old images are automatically deleted from S3 when updated
5. **Profile Completion**: Creating profile sets `isProfileCompleted = true` in auth model

---

## File Structure

```
src/
├── middleware/
│   └── multerSubadminProfile.js       # Multer config for subadmin images
├── subAdmin/
│   ├── subAdminController/
│   │   └── subAdminProfileController.js  # CRUD operations
│   ├── subAdminModel/
│   │   └── subAdminProfile.js            # Profile model
│   └── subAdminRoutes/
│       └── subAdminProfileRoutes.js      # Route definitions
```

