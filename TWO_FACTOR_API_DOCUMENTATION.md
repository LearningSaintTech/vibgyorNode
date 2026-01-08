# Two-Factor Authentication API Documentation

## 📚 Overview

This document provides complete API documentation for the 2Factor authentication integration across User, Admin, and SubAdmin roles.

---

## 🔐 User Authentication Endpoints

### 1. Send Phone OTP

**Endpoint**: `POST /user/auth/send-phone-otp`

**Description**: Sends OTP to user's phone number via 2Factor API

**Request Body**:
```json
{
  "phoneNumber": "7776665555",
  "countryCode": "+91"
}
```

**Parameters**:
- `phoneNumber` (required): 10-digit phone number without country code
- `countryCode` (optional): Country code, defaults to "+91"

**Success Response** (200):
```json
{
  "success": true,
  "status": 200,
  "message": "OTP sent",
  "data": {
    "maskedPhone": "******5555",
    "ttlSeconds": 300,
    "sessionId": "2factor_session_id_here"
  }
}
```

**Error Responses**:
- `400`: Missing phoneNumber
- `429`: Rate limit exceeded (wait 60 seconds)
- `500`: Failed to send OTP

**Development Bypass**: Use `+911234567890` to skip API call

---

### 2. Verify Phone OTP

**Endpoint**: `POST /user/auth/verify-phone-otp`

**Description**: Verifies OTP and returns JWT tokens

**Request Body**:
```json
{
  "phoneNumber": "7776665555",
  "otp": "123456"
}
```

**Parameters**:
- `phoneNumber` (required): Phone number used to send OTP
- `otp` (required): 6-digit OTP code

**Success Response** (200):
```json
{
  "success": true,
  "status": 200,
  "message": "OTP verified",
  "data": {
    "accessToken": "jwt_access_token",
    "refreshToken": "jwt_refresh_token",
    "user": {
      "id": "user_id",
      "phoneNumber": "******5555",
      "countryCode": "+91",
      "email": "",
      "emailVerified": false,
      "username": "",
      "fullName": "",
      "role": "user",
      "isProfileCompleted": false,
      "isActive": true
    },
    "isProfileCompleted": false
  }
}
```

**Error Responses**:
- `400`: Missing phoneNumber or otp
- `401`: Invalid OTP, OTP expired, or session expired
- `404`: User not found
- `500`: Server error

**Error Codes**:
- `INVALID_OTP`: OTP doesn't match
- `OTP_EXPIRED`: OTP has expired
- `SESSION_EXPIRED`: Session ID expired

---

### 3. Resend Phone OTP

**Endpoint**: `POST /user/auth/resend-phone-otp`

**Description**: Resends OTP to user's phone number

**Request Body**:
```json
{
  "phoneNumber": "7776665555"
}
```

**Parameters**:
- `phoneNumber` (required): Phone number to resend OTP

**Success Response** (200):
```json
{
  "success": true,
  "status": 200,
  "message": "OTP resent",
  "data": {
    "maskedPhone": "******5555",
    "ttlSeconds": 300,
    "sessionId": "new_session_id"
  }
}
```

**Error Responses**:
- `400`: Missing phoneNumber
- `404`: User not found
- `429`: Rate limit exceeded
- `500`: Failed to resend OTP

---

## 👨‍💼 Admin Authentication Endpoints

### 4. Send OTP (Admin/SubAdmin)

**Endpoint**: `POST /admin/auth/send-otp`

**Description**: Sends OTP to admin or subadmin phone number

**Request Body**:
```json
{
  "phoneNumber": "9999999999",
  "countryCode": "+91"
}
```

**Parameters**:
- `phoneNumber` (required): 
  - `9999999999` for Admin
  - `8888888888` for SubAdmin
- `countryCode` (optional): Defaults to "+91"

**Success Response** (200):
```json
{
  "success": true,
  "status": 200,
  "message": "OTP sent",
  "data": {
    "maskedPhone": "******9999",
    "ttlSeconds": 300,
    "role": "admin",
    "sessionId": "session_id_here"
  }
}
```

**Error Responses**:
- `400`: Missing phoneNumber
- `401`: Invalid phone number for admin/subadmin
- `429`: Rate limit exceeded
- `500`: Failed to send OTP

**Note**: Role is automatically determined from phone number

---

### 5. Verify OTP (Admin/SubAdmin)

**Endpoint**: `POST /admin/auth/verify-otp`

**Description**: Verifies OTP and returns JWT tokens for admin/subadmin

**Request Body**:
```json
{
  "phoneNumber": "9999999999",
  "otp": "123456"
}
```

**Parameters**:
- `phoneNumber` (required): Admin or SubAdmin phone number
- `otp` (required): 6-digit OTP code

**Success Response - Admin** (200):
```json
{
  "success": true,
  "status": 200,
  "message": "OTP verified",
  "data": {
    "accessToken": "jwt_access_token",
    "refreshToken": "jwt_refresh_token",
    "role": "admin",
    "admin": {
      "id": "admin_id",
      "phoneNumber": "9999999999",
      "name": "",
      "email": "",
      "avatarUrl": "",
      "role": "admin"
    }
  }
}
```

**Success Response - SubAdmin** (200):
```json
{
  "success": true,
  "status": 200,
  "message": "OTP verified",
  "data": {
    "accessToken": "jwt_access_token",
    "refreshToken": "jwt_refresh_token",
    "role": "subadmin",
    "subadmin": {
      "id": "subadmin_id",
      "phoneNumber": "8888888888",
      "name": "",
      "email": "",
      "avatarUrl": "",
      "role": "subadmin",
      "isProfileCompleted": false,
      "approvalStatus": "pending",
      "isActive": false
    }
  }
}
```

**Error Responses**:
- `400`: Missing phoneNumber or otp
- `401`: Invalid OTP, OTP expired, or invalid phone number
- `404`: Admin/SubAdmin not found
- `500`: Server error

---

### 6. Resend OTP (Admin/SubAdmin)

**Endpoint**: `POST /admin/auth/resend-otp`

**Description**: Resends OTP to admin or subadmin phone number

**Request Body**:
```json
{
  "phoneNumber": "9999999999"
}
```

**Success Response**: Same as Send OTP endpoint

---

### 7. Check 2Factor Service Status

**Endpoint**: `GET /admin/auth/2factor-status`

**Description**: Checks 2Factor API service status and configuration

**Success Response** (200):
```json
{
  "success": true,
  "status": 200,
  "message": "2Factor service is operational",
  "data": {
    "status": "operational",
    "balance": "1000",
    "apiKeyConfigured": true,
    "baseUrl": "https://2factor.in/API/V1",
    "templateName": "OTP"
  }
}
```

**Error Response** (500):
```json
{
  "success": false,
  "status": 500,
  "message": "2Factor service is not operational",
  "data": {
    "status": "not_operational",
    "message": "Error details",
    "apiKeyConfigured": false
  }
}
```

---

## 🔑 Authentication Flow

### User Flow

```
1. POST /user/auth/send-phone-otp
   → Returns sessionId

2. POST /user/auth/verify-phone-otp
   → Returns accessToken & refreshToken

3. Use accessToken in Authorization header:
   Authorization: Bearer <accessToken>
```

### Admin/SubAdmin Flow

```
1. POST /admin/auth/send-otp
   → Returns sessionId & role

2. POST /admin/auth/verify-otp
   → Returns accessToken & refreshToken

3. Use accessToken in Authorization header:
   Authorization: Bearer <accessToken>
```

---

## 🛡️ Security Features

### Rate Limiting
- **Window**: 60 seconds between OTP requests
- **Error**: `429 Too Many Requests`
- **Message**: "Please wait Xs before requesting a new OTP"

### OTP Expiration
- **TTL**: 5 minutes (300 seconds)
- **Error**: `401 Unauthorized`
- **Code**: `OTP_EXPIRED`

### Session Management
- Session IDs stored securely in database
- Sessions expire after OTP verification
- Old sessions cleared on new OTP request

---

## 🧪 Development Bypass

For testing without API credentials:

| Role | Phone Number | OTP |
|------|-------------|-----|
| User | `+911234567890` | `123456` |
| Admin | `9999999999` | `123456` |
| SubAdmin | `8888888888` | `123456` |

**Note**: Bypass mode returns mock session IDs and skips API calls

---

## 📝 Error Codes Reference

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `INVALID_OTP` | OTP doesn't match | 401 |
| `OTP_EXPIRED` | OTP has expired | 401 |
| `SESSION_EXPIRED` | Session ID expired | 401 |
| `OTP_MISSING` | OTP not requested | 401 |
| `PHONE_REQUIRED` | Phone number missing | 400 |
| `OTP_REQUIRED` | OTP missing | 400 |
| `OTP_RATE_LIMIT` | Rate limit exceeded | 429 |
| `INVALID_PHONE` | Invalid phone number | 401 |
| `CONFIGURATION_ERROR` | API not configured | 500 |
| `SERVICE_ERROR` | 2Factor API error | 500 |

---

## 🔄 Backward Compatibility

The system maintains backward compatibility with the old hardcoded OTP method:

- Old OTP fields (`otpCode`, `otpExpiresAt`) still work
- New sessions use `twoFactorSessionId`
- Both methods supported during migration period

---

## 📞 Support

For issues or questions:
- Check `TWO_FACTOR_TESTING_GUIDE.md` for testing scenarios
- Check `ENV_SETUP_GUIDE.md` for configuration
- Review `TWO_FACTOR_IMPLEMENTATION_PLAN.md` for implementation details

---

**Last Updated**: 2024  
**Version**: 1.0

