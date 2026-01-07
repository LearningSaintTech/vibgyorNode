# SubAdmin Profile API - Postman Collection

This directory contains Postman collections and environments for testing the SubAdmin Profile API.

## Files

1. **SubAdmin_Profile_API.postman_collection.json** - Main Postman collection with all endpoints
2. **SubAdmin_Profile_API.postman_environment.json** - Environment variables for local development

## Setup Instructions

### 1. Import Collection and Environment

1. Open Postman
2. Click **Import** button
3. Select both JSON files:
   - `SubAdmin_Profile_API.postman_collection.json`
   - `SubAdmin_Profile_API.postman_environment.json`
4. Click **Import**

### 2. Configure Environment Variables

1. Select the **SubAdmin Profile API - Local** environment from the dropdown
2. Update the following variables:
   - `base_url`: Your server URL (default: `http://localhost:3000`)
   - `subadmin_token`: Your subadmin JWT token (get this from subadmin login)
   - `admin_token`: Your admin JWT token (for admin-only endpoints)

### 3. Get SubAdmin Token

To get the subadmin token, authenticate first:

1. Use the subadmin login endpoint:
   ```
   POST /subadmin/auth/send-otp
   Body: { "phoneNumber": "8888888888", "countryCode": "+91" }
   ```

2. Verify OTP:
   ```
   POST /subadmin/auth/verify-otp
   Body: { "phoneNumber": "8888888888", "otp": "123456" }
   ```

3. Copy the `accessToken` from the response and paste it in the `subadmin_token` environment variable.

## API Endpoints

### SubAdmin Routes (Own Profile)

#### 1. Get Own Profile
- **Method**: `GET`
- **URL**: `{{base_url}}/subadmin/profile`
- **Headers**: `Authorization: Bearer {{subadmin_token}}`

#### 2. Create Profile (Minimal)
- **Method**: `POST`
- **URL**: `{{base_url}}/subadmin/profile`
- **Headers**: `Authorization: Bearer {{subadmin_token}}`
- **Body**: `multipart/form-data`
  - `firstName` (required): String
  - `lastName` (required): String

#### 3. Create Profile (Full)
- **Method**: `POST`
- **URL**: `{{base_url}}/subadmin/profile`
- **Headers**: `Authorization: Bearer {{subadmin_token}}`
- **Body**: `multipart/form-data`
  - `firstName` (required): String
  - `lastName` (required): String
  - `email` (optional): String
  - `phone` (optional): String
  - `gender` (optional): String (Male, Female, Other)
  - `dateOfBirth` (optional): Date (YYYY-MM-DD)
  - `address` (optional): String
  - `city` (optional): String
  - `state` (optional): String
  - `pinCode` (optional): String
  - `isActive` (optional): Boolean
  - `profileImage` (optional): File (JPEG, PNG, WebP, GIF - Max 5MB)

#### 4. Update Profile
- **Method**: `PUT`
- **URL**: `{{base_url}}/subadmin/profile`
- **Headers**: `Authorization: Bearer {{subadmin_token}}`
- **Body**: `multipart/form-data`
  - All fields are optional
  - Only include fields you want to update

#### 5. Delete Profile
- **Method**: `DELETE`
- **URL**: `{{base_url}}/subadmin/profile`
- **Headers**: `Authorization: Bearer {{subadmin_token}}`

### Admin Routes (Manage All SubAdmins)

#### 6. Get All SubAdmin Profiles
- **Method**: `GET`
- **URL**: `{{base_url}}/subadmin/profiles`
- **Headers**: `Authorization: Bearer {{admin_token}}`
- **Query Params**:
  - `page` (optional): Number
  - `limit` (optional): Number
  - `search` (optional): String
  - `isActive` (optional): Boolean

#### 7. Get SubAdmin Profile by ID
- **Method**: `GET`
- **URL**: `{{base_url}}/subadmin/profile/:id`
- **Headers**: `Authorization: Bearer {{admin_token}}`

## Quick Start

### Create Profile with Just firstName and lastName

1. Select **"Create Profile (Minimal - firstName, lastName)"** request
2. Update the form-data:
   - `firstName`: Your first name
   - `lastName`: Your last name
3. Make sure `subadmin_token` is set in environment
4. Click **Send**

### Create Profile with Image

1. Select **"Create Profile (With Image Only)"** request
2. Update the form-data:
   - `firstName`: Your first name
   - `lastName`: Your last name
   - `profileImage`: Select a file (image)
3. Click **Send**

## Response Examples

### Success Response (Create/Update)
```json
{
  "success": true,
  "message": "Subadmin profile created successfully",
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

### Error Response
```json
{
  "success": false,
  "message": "Missing required fields: firstName and lastName are required"
}
```

## Notes

1. **Required Fields**: Only `firstName` and `lastName` are required
2. **Email/Phone**: Optional - will use values from SubAdmin auth model if not provided
3. **Image Upload**: 
   - Field name: `profileImage`
   - Formats: JPEG, PNG, WebP, GIF
   - Max size: 5MB
   - Stored in S3
4. **JWT Token**: Must be valid subadmin token for own profile routes
5. **Admin Token**: Required for admin-only routes (get all profiles, get by ID)

## Troubleshooting

### 401 Unauthorized
- Check if `subadmin_token` is set correctly
- Verify token hasn't expired
- Ensure token is prefixed with "Bearer "

### 400 Bad Request
- Check required fields (firstName, lastName) are provided
- Verify email format if provided
- Check phone number format if provided

### 500 Server Error
- Check server console logs for detailed error
- Verify database connection
- Check S3 configuration for image uploads

