# Two-Factor Authentication Testing Guide

## 🧪 Testing Overview

This guide provides comprehensive testing scenarios for the 2Factor authentication integration across User, Admin, and SubAdmin roles.

---

## 📋 Pre-Testing Checklist

- [ ] Environment variables configured in `.env`
- [ ] 2Factor API key obtained (or use development bypass)
- [ ] Database connection working
- [ ] Server running successfully

---

## 🔧 Environment Setup

### Development Bypass (No API Key Required)

The system includes development bypass for testing without API credentials:

| Role | Phone Number | OTP |
|------|-------------|-----|
| User | `+911234567890` | `123456` |
| Admin | `9999999999` | `123456` |
| SubAdmin | `8888888888` | `123456` |

### Production Testing (Requires API Key)

Add to `.env`:
```env
TWOFACTOR_API_KEY=your_api_key_here
TWOFACTOR_BASE_URL=https://2factor.in/API/V1
TWOFACTOR_OTP_TEMPLATE_NAME=YourTemplateName
```

---

## 👤 User Authentication Testing

### Test Case 1: Send OTP (New User)

**Endpoint**: `POST /user/auth/send-phone-otp`

**Request**:
```json
{
  "phoneNumber": "7776665555",
  "countryCode": "+91"
}
```

**Expected Response** (Development Bypass):
```json
{
  "success": true,
  "status": 200,
  "message": "OTP sent (bypass mode)",
  "data": {
    "maskedPhone": "******5555",
    "ttlSeconds": 300,
    "sessionId": "bypassed-session-..."
  }
}
```

**Expected Response** (Real API):
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

**Test Steps**:
1. Send request with new phone number
2. Verify user is created in database
3. Verify `twoFactorSessionId` is stored
4. Check response contains session ID

---

### Test Case 2: Send OTP (Existing User)

**Request**: Same as Test Case 1 with existing phone number

**Expected Behavior**:
- User found in database
- New session ID generated
- Old session ID replaced

---

### Test Case 3: Verify OTP (Success)

**Endpoint**: `POST /user/auth/verify-phone-otp`

**Request**:
```json
{
  "phoneNumber": "7776665555",
  "otp": "123456"
}
```

**Expected Response**:
```json
{
  "success": true,
  "status": 200,
  "message": "OTP verified",
  "data": {
    "accessToken": "jwt_token_here",
    "refreshToken": "refresh_token_here",
    "user": {
      "id": "user_id",
      "phoneNumber": "******5555",
      ...
    },
    "isProfileCompleted": false
  }
}
```

**Test Steps**:
1. First send OTP (Test Case 1)
2. Use session ID from response
3. Verify OTP with correct code
4. Verify tokens are generated
5. Verify session ID is cleared from database

---

### Test Case 4: Verify OTP (Invalid OTP)

**Request**:
```json
{
  "phoneNumber": "7776665555",
  "otp": "000000"
}
```

**Expected Response**:
```json
{
  "success": false,
  "status": 401,
  "message": "Invalid OTP. Please check and try again.",
  "code": "INVALID_OTP"
}
```

---

### Test Case 5: Verify OTP (Expired Session)

**Test Steps**:
1. Send OTP
2. Wait for session to expire (or manually expire)
3. Try to verify OTP

**Expected Response**:
```json
{
  "success": false,
  "status": 401,
  "message": "Session expired. Please request a new OTP.",
  "code": "SESSION_EXPIRED"
}
```

---

### Test Case 6: Resend OTP

**Endpoint**: `POST /user/auth/resend-phone-otp`

**Request**:
```json
{
  "phoneNumber": "7776665555"
}
```

**Expected Response**:
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

**Test Steps**:
1. Send initial OTP
2. Note session ID
3. Resend OTP
4. Verify new session ID is different
5. Verify old session ID is replaced

---

### Test Case 7: Rate Limiting

**Test Steps**:
1. Send OTP
2. Immediately try to resend (< 60 seconds)
3. Should receive rate limit error

**Expected Response**:
```json
{
  "success": false,
  "status": 429,
  "message": "Please wait Xs before requesting a new OTP",
  "code": "OTP_RATE_LIMIT"
}
```

---

## 👨‍💼 Admin Authentication Testing

### Test Case 8: Admin Send OTP

**Endpoint**: `POST /admin/auth/send-otp`

**Request**:
```json
{
  "phoneNumber": "9999999999",
  "countryCode": "+91"
}
```

**Expected Response**:
```json
{
  "success": true,
  "status": 200,
  "message": "OTP sent (bypass mode)",
  "data": {
    "maskedPhone": "******9999",
    "ttlSeconds": 300,
    "role": "admin",
    "sessionId": "bypassed-session-..."
  }
}
```

**Test Steps**:
1. Use admin phone number (`9999999999`)
2. Verify role is detected as "admin"
3. Verify admin record created/found
4. Verify session ID stored

---

### Test Case 9: Admin Verify OTP

**Endpoint**: `POST /admin/auth/verify-otp`

**Request**:
```json
{
  "phoneNumber": "9999999999",
  "otp": "123456"
}
```

**Expected Response**:
```json
{
  "success": true,
  "status": 200,
  "message": "OTP verified",
  "data": {
    "accessToken": "jwt_token",
    "refreshToken": "refresh_token",
    "role": "admin",
    "admin": {
      "id": "admin_id",
      "phoneNumber": "9999999999",
      ...
    }
  }
}
```

---

### Test Case 10: Invalid Admin Phone Number

**Request**:
```json
{
  "phoneNumber": "1111111111"
}
```

**Expected Response**:
```json
{
  "success": false,
  "status": 401,
  "message": "Invalid phone number for admin/subadmin access",
  "code": "INVALID_PHONE"
}
```

---

## 👨‍💼 SubAdmin Authentication Testing

### Test Case 11: SubAdmin Send OTP

**Endpoint**: `POST /admin/auth/send-otp`

**Request**:
```json
{
  "phoneNumber": "8888888888",
  "countryCode": "+91"
}
```

**Expected Response**:
```json
{
  "success": true,
  "status": 200,
  "message": "OTP sent (bypass mode)",
  "data": {
    "maskedPhone": "******8888",
    "ttlSeconds": 300,
    "role": "subadmin",
    "sessionId": "bypassed-session-..."
  }
}
```

**Test Steps**:
1. Use subadmin phone number (`8888888888`)
2. Verify role is detected as "subadmin"
3. Verify subadmin record created/found

---

### Test Case 12: SubAdmin Verify OTP

**Endpoint**: `POST /admin/auth/verify-otp`

**Request**:
```json
{
  "phoneNumber": "8888888888",
  "otp": "123456"
}
```

**Expected Response**:
```json
{
  "success": true,
  "status": 200,
  "message": "OTP verified",
  "data": {
    "accessToken": "jwt_token",
    "refreshToken": "refresh_token",
    "role": "subadmin",
    "subadmin": {
      "id": "subadmin_id",
      "phoneNumber": "8888888888",
      "approvalStatus": "pending",
      ...
    }
  }
}
```

---

## 🔍 Service Status Testing

### Test Case 13: Check 2Factor Service Status

**Endpoint**: `GET /admin/auth/2factor-status`

**Expected Response** (API Configured):
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

**Expected Response** (API Not Configured):
```json
{
  "success": false,
  "status": 500,
  "message": "2Factor service is not operational",
  "data": {
    "status": "not_operational",
    "apiKeyConfigured": false
  }
}
```

---

## 🐛 Error Scenarios Testing

### Test Case 14: Missing Phone Number

**Request**:
```json
{}
```

**Expected Response**:
```json
{
  "success": false,
  "status": 400,
  "message": "phoneNumber is required"
}
```

---

### Test Case 15: Missing OTP

**Request**:
```json
{
  "phoneNumber": "7776665555"
}
```

**Expected Response**:
```json
{
  "success": false,
  "status": 400,
  "message": "phoneNumber and otp are required"
}
```

---

### Test Case 16: OTP Not Requested

**Request**:
```json
{
  "phoneNumber": "7776665555",
  "otp": "123456"
}
```

**Expected Response** (without sending OTP first):
```json
{
  "success": false,
  "status": 401,
  "message": "OTP not requested"
}
```

---

## 📊 Test Results Template

| Test Case | Role | Endpoint | Status | Notes |
|-----------|------|----------|--------|-------|
| TC1 | User | POST /send-phone-otp | ⬜ Pass / ⬜ Fail | |
| TC2 | User | POST /send-phone-otp | ⬜ Pass / ⬜ Fail | |
| TC3 | User | POST /verify-phone-otp | ⬜ Pass / ⬜ Fail | |
| TC4 | User | POST /verify-phone-otp | ⬜ Pass / ⬜ Fail | |
| TC5 | User | POST /verify-phone-otp | ⬜ Pass / ⬜ Fail | |
| TC6 | User | POST /resend-phone-otp | ⬜ Pass / ⬜ Fail | |
| TC7 | User | POST /resend-phone-otp | ⬜ Pass / ⬜ Fail | |
| TC8 | Admin | POST /send-otp | ⬜ Pass / ⬜ Fail | |
| TC9 | Admin | POST /verify-otp | ⬜ Pass / ⬜ Fail | |
| TC10 | Admin | POST /send-otp | ⬜ Pass / ⬜ Fail | |
| TC11 | SubAdmin | POST /send-otp | ⬜ Pass / ⬜ Fail | |
| TC12 | SubAdmin | POST /verify-otp | ⬜ Pass / ⬜ Fail | |
| TC13 | All | GET /2factor-status | ⬜ Pass / ⬜ Fail | |
| TC14 | User | POST /send-phone-otp | ⬜ Pass / ⬜ Fail | |
| TC15 | User | POST /verify-phone-otp | ⬜ Pass / ⬜ Fail | |
| TC16 | User | POST /verify-phone-otp | ⬜ Pass / ⬜ Fail | |

---

## 🚀 Automated Testing

### Using Postman Collection

1. Import endpoints into Postman
2. Set environment variables:
   - `base_url`: Your API base URL
   - `user_phone`: Test user phone number
   - `admin_phone`: `9999999999`
   - `subadmin_phone`: `8888888888`
   - `otp`: `123456`

3. Run collection in sequence

### Using cURL

```bash
# Send OTP (User)
curl -X POST http://localhost:3000/user/auth/send-phone-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "7776665555", "countryCode": "+91"}'

# Verify OTP (User)
curl -X POST http://localhost:3000/user/auth/verify-phone-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "7776665555", "otp": "123456"}'
```

---

## ✅ Success Criteria

All tests should pass:
- ✅ OTP sending works for all roles
- ✅ OTP verification works for all roles
- ✅ Error handling works correctly
- ✅ Rate limiting enforced
- ✅ Development bypass works
- ✅ Real API integration works (when configured)
- ✅ Session management works correctly
- ✅ Backward compatibility maintained

---

**Last Updated**: 2024  
**Version**: 1.0

