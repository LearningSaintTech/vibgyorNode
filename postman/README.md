# Admin Profile API - Postman Collection

This directory contains Postman collections and environments for testing the Admin Profile API.

## Files

1. **Admin_Profile_API.postman_collection.json** - Main Postman collection with all endpoints
2. **Admin_Profile_API.postman_environment.json** - Environment variables for local development

## Setup Instructions

### 1. Import Collection and Environment

1. Open Postman
2. Click **Import** button
3. Select both JSON files:
   - `Admin_Profile_API.postman_collection.json`
   - `Admin_Profile_API.postman_environment.json`
4. Click **Import**

### 2. Configure Environment Variables

1. Select the **Admin Profile API - Local** environment from the dropdown
2. Update the following variables:
   - `base_url`: Your server URL (default: `http://localhost:3000`)
   - `admin_token`: Your admin JWT token (get this from admin login)

### 3. Get Admin Token

To get the admin token, you need to authenticate first:

1. Use the admin login endpoint (if available):
   ```
   POST /admin-auth/send-otp
   Body: { "phoneNumber": "9999999999" }
   ```

2. Verify OTP:
   ```
   POST /admin-auth/verify-otp
   Body: { "phoneNumber": "9999999999", "otp": "123456" }
   ```

3. Copy the `accessToken` from the response and paste it in the `admin_token` environment variable.

## API Endpoints

### 1. Get Admin Profile
- **Method**: `GET`
- **URL**: `{{base_url}}/admin/profile`
- **Headers**: 
  - `Authorization: Bearer {{admin_token}}`
- **Description**: Retrieves the admin profile (only one admin exists)

### 2. Create Admin Profile
- **Method**: `POST`
- **URL**: `{{base_url}}/admin/profile`
- **Headers**: 
  - `Authorization: Bearer {{admin_token}}`
- **Body**: `multipart/form-data`
  - `firstName` (required): String
  - `lastName` (required): String
  - `dob` (optional): Date (YYYY-MM-DD)
  - `gender` (required): String (male, female, other)
  - `email` (required): String (unique)
  - `countryCode` (optional): String (default: +91)
  - `phoneNumber` (required): String (unique)
  - `address` (optional): String
  - `city` (required): String
  - `pinCode` (required): String
  - `state` (required): String
  - `isActive` (optional): Boolean (default: true)
  - `profileImage` (optional): File (JPEG, PNG, WebP, GIF - Max 5MB)

### 3. Update Admin Profile
- **Method**: `PUT`
- **URL**: `{{base_url}}/admin/profile`
- **Headers**: 
  - `Authorization: Bearer {{admin_token}}`
- **Body**: `multipart/form-data`
  - All fields are optional
  - Include only fields you want to update
  - If `profileImage` is provided, it replaces the existing image

### 4. Delete Admin Profile
- **Method**: `DELETE`
- **URL**: `{{base_url}}/admin/profile`
- **Headers**: 
  - `Authorization: Bearer {{admin_token}}`
- **Description**: Deletes the admin profile and associated image from S3

## Example Requests

### Create Profile with Image
```
POST /admin/profile
Content-Type: multipart/form-data

firstName: John
lastName: Doe
gender: male
email: admin@example.com
phoneNumber: 9999999999
city: Mumbai
pinCode: 400001
state: Maharashtra
profileImage: [select file]
```

### Update Profile (Text Only)
```
PUT /admin/profile
Content-Type: multipart/form-data

firstName: John
lastName: Smith
city: Delhi
```

### Update Profile Image Only
```
PUT /admin/profile
Content-Type: multipart/form-data

profileImage: [select new file]
```

## Response Format

### Success Response
```json
{
  "success": true,
  "message": "Admin profile created successfully",
  "data": {
    "_id": "...",
    "firstName": "John",
    "lastName": "Doe",
    "name": "John Doe",
    "email": "admin@example.com",
    "phoneNumber": "9999999999",
    "profileImage": "https://...",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message here"
}
```

## Notes

1. **Only One Admin**: The system allows only one admin profile. If you try to create a second one, you'll get an error.

2. **Image Upload**: 
   - Supported formats: JPEG, JPG, PNG, WebP, GIF
   - Maximum file size: 5MB
   - Images are uploaded to S3 and the URL is stored in the database

3. **Image Replacement**: When updating the profile image, the old image is automatically deleted from S3.

4. **Required Fields for Create**:
   - firstName
   - lastName
   - gender
   - email
   - phoneNumber
   - city
   - pinCode
   - state

5. **Unique Constraints**:
   - email must be unique
   - phoneNumber + countryCode combination must be unique

## Testing Workflow

1. **Get Token**: Authenticate and get admin token
2. **Set Token**: Update `admin_token` in environment
3. **Create Profile**: Use "Create Admin Profile" request
4. **Get Profile**: Verify with "Get Admin Profile"
5. **Update Profile**: Test updates with "Update Admin Profile"
6. **Update Image**: Test image replacement
7. **Delete Profile**: Clean up with "Delete Admin Profile"

## Troubleshooting

### 401 Unauthorized
- Check if `admin_token` is set correctly
- Verify token hasn't expired
- Ensure token is prefixed with "Bearer "

### 400 Bad Request
- Check required fields are provided
- Verify email format is valid
- Ensure phone number is unique

### 409 Conflict
- Email or phone number already exists
- Admin profile already exists (for create)

### 500 Server Error
- Check server logs
- Verify S3 configuration
- Check database connection


