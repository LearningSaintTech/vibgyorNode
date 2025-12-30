# Admin User Count API - Postman Configuration

## Overview
This document describes the Admin User Count API endpoint and how to use it in Postman.

## Endpoint

### Get User Counts
**Method:** `GET`  
**URL:** `/admin/counts`  
**Authorization:** Required (Admin token)

## Postman Collection

The Postman collection file is located at:
```
docs/postman/admin-user-count-api.postman_collection.json
```

## Setup Instructions

### 1. Import Collection
1. Open Postman
2. Click **Import** button
3. Select the file: `admin-user-count-api.postman_collection.json`
4. Click **Import**

### 2. Configure Environment Variables

Set the following variables in your Postman environment:

| Variable | Description | Example Value |
|----------|-------------|---------------|
| `baseUrl` | Base URL of your API server | `http://localhost:3000` |
| `adminToken` | Admin access token | (Obtained from admin login) |

### 3. Get Admin Token

Before using the count API, you need to authenticate as admin:

1. **Send OTP:**
   ```
   POST {{baseUrl}}/admin-auth/send-otp
   Body: {
     "phoneNumber": "9999999999",
     "countryCode": "+91"
   }
   ```

2. **Verify OTP:**
   ```
   POST {{baseUrl}}/admin-auth/verify-otp
   Body: {
     "phoneNumber": "9999999999",
     "otp": "123456"
   }
   ```

3. **Copy the `accessToken` from response** and set it as `adminToken` in your Postman environment.

## Request Example

```http
GET {{baseUrl}}/admin/counts
Authorization: Bearer {{adminToken}}
```

## Response Example

### Success Response (200 OK)
```json
{
  "success": true,
  "status": 200,
  "message": "User counts fetched successfully",
  "data": {
    "totalUsers": 24000,
    "verifiedUsers": 18000,
    "verificationPending": 2400
  }
}
```

### Error Responses

#### Unauthorized (401)
```json
{
  "success": false,
  "status": 401,
  "message": "Missing or invalid Authorization header"
}
```

#### Forbidden (403)
```json
{
  "success": false,
  "status": 403,
  "message": "Forbidden: insufficient role",
  "code": "ROLE_FORBIDDEN"
}
```

## Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `totalUsers` | Number | Total count of users (excluding admin/subadmin roles) |
| `verifiedUsers` | Number | Count of users with `verificationStatus === 'approved'` |
| `verificationPending` | Number | Count of users with `verificationStatus === 'pending'` |

## Test Scripts

The Postman collection includes automated tests that verify:
- Status code is 200
- Response has success field
- Response has data with all count fields
- Counts are numbers
- Verified users ≤ total users
- Verification pending ≤ total users

## Notes

- Only users with `role: 'admin'` can access this endpoint
- The counts exclude admin and subadmin accounts
- Counts are calculated in real-time from the database
- No query parameters are required

