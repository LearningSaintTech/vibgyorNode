# Two-Factor Authentication Quick Reference

## 🎯 Quick Overview

This document provides a quick reference for implementing 2Factor API integration into VibgyorNode authentication system.

---

## 📁 File Structure Changes

### **New Files to Add:**
```
src/
└── services/
    └── twofactor/                    # NEW: Copy from oneRupeeClassroomBackend
        ├── config/
        │   └── twofactorConfig.js
        ├── services/
        │   └── twofactorService.js
        ├── controllers/
        │   └── twofactorAuthController.js
        └── routes/
            └── twofactorRoutes.js
```

### **Files to Modify:**

#### **User Authentication:**
- `src/user/auth/controller/userAuthController.js`
- `src/user/auth/model/userAuthModel.js`

#### **Admin Authentication:**
- `src/admin/adminController/unifiedAdminAuthController.js`
- `src/admin/adminModel/adminModel.js`

#### **SubAdmin Authentication:**
- `src/subAdmin/subAdminModel/subAdminAuthModel.js`

---

## 🔑 Environment Variables

Add to `.env`:
```env
TWOFACTOR_API_KEY=your_api_key_here
TWOFACTOR_BASE_URL=https://2factor.in/API/V1
TWOFACTOR_OTP_TEMPLATE_NAME=YourTemplateName
```

---

## 📊 Current vs New Flow

### **Current Flow (Hardcoded OTP):**
```
User Request → Generate OTP (123456) → Store in DB → Return Success
User Verify → Check DB OTP → Match? → Generate JWT → Return Tokens
```

### **New Flow (2Factor API):**
```
User Request → Call 2Factor API → Get Session ID → Store Session ID → Return Success
User Verify → Call 2Factor API with Session ID → Verified? → Generate JWT → Return Tokens
```

---

## 🔄 Key Changes Per Role

### **1. User Authentication**

**Before:**
```javascript
user.otpCode = '123456';
user.otpExpiresAt = new Date(now + OTP_TTL_MS);
```

**After:**
```javascript
const otpResult = await twofactorService.sendOTP(normalizedMobile);
user.twoFactorSessionId = otpResult.data.sessionId;
```

**Verification Before:**
```javascript
if (user.otpCode !== otp) return error;
```

**Verification After:**
```javascript
const verifyResult = await twofactorService.verifyOTP(
  normalizedMobile, 
  otp, 
  user.twoFactorSessionId
);
if (!verifyResult.success) return error;
```

---

### **2. Admin Authentication**

**Before:**
```javascript
adminOrSub.otpCode = HARD_CODED_OTP;
adminOrSub.otpExpiresAt = new Date(now + OTP_TTL_MS);
```

**After:**
```javascript
// Normalize phone: Add +91 prefix
const normalizedPhone = `+91${phoneNumber}`;
const otpResult = await twofactorService.sendOTP(normalizedPhone);
adminOrSub.twoFactorSessionId = otpResult.data.sessionId;
```

**Verification:**
```javascript
const normalizedPhone = `+91${phoneNumber}`;
const verifyResult = await twofactorService.verifyOTP(
  normalizedPhone,
  otp,
  adminOrSub.twoFactorSessionId
);
```

---

### **3. SubAdmin Authentication**

Same as Admin (uses unified controller).

---

## 🗄️ Database Schema Changes

### **User Model:**
```javascript
twoFactorSessionId: { type: String, default: null }
```

### **Admin Model:**
```javascript
twoFactorSessionId: { type: String, default: null }
```

### **SubAdmin Model:**
```javascript
twoFactorSessionId: { type: String, default: null }
```

**Note:** Keep existing `otpCode`, `otpExpiresAt` fields during migration for backward compatibility.

---

## 🔧 Phone Number Normalization

### **User:**
- **Stored Format**: `7776665555` (without prefix)
- **API Format**: `+917776665555` (with +91 prefix)
- **Normalization**: Add `+91` prefix before API call

### **Admin:**
- **Stored Format**: `9999999999` (without prefix)
- **API Format**: `+919999999999` (with +91 prefix)
- **Normalization**: Add `+91` prefix before API call

### **SubAdmin:**
- **Stored Format**: `8888888888` (without prefix)
- **API Format**: `+918888888888` (with +91 prefix)
- **Normalization**: Add `+91` prefix before API call

---

## 🧪 Development Bypass

Maintain these bypass numbers for testing:

| Role | Phone Number | OTP |
|------|-------------|-----|
| User | `+911234567890` | `123456` |
| Admin | `9999999999` | `123456` |
| SubAdmin | `8888888888` | `123456` |

**Implementation:**
```javascript
// Check before API call
if (phoneNumber === BYPASS_PHONE) {
  // Return mock session ID
  return { success: true, data: { sessionId: 'bypassed-session-' + Date.now() } };
}
```

---

## 📝 Code Snippets

### **Send OTP (User):**
```javascript
const twofactorService = require('../../services/twofactor/services/twofactorService');

async function sendPhoneOtp(req, res) {
  const { phoneNumber, countryCode = '+91' } = req.body;
  
  // Normalize phone number
  const normalizedMobile = phoneNumber.startsWith('+91') 
    ? phoneNumber 
    : `${countryCode}${phoneNumber}`;
  
  // Bypass check
  if (normalizedMobile === '+911234567890') {
    // Development bypass logic
    return handleBypass(req, res);
  }
  
  // Call 2Factor API
  const otpResult = await twofactorService.sendOTP(normalizedMobile);
  
  if (otpResult.success) {
    user.twoFactorSessionId = otpResult.data.sessionId;
    await user.save();
    return ApiResponse.success(res, { 
      maskedPhone: user.maskedPhone(),
      sessionId: otpResult.data.sessionId 
    }, 'OTP sent');
  }
  
  return ApiResponse.serverError(res, otpResult.data.message);
}
```

### **Verify OTP (User):**
```javascript
async function verifyPhoneOtp(req, res) {
  const { phoneNumber, otp } = req.body;
  
  // Normalize phone number
  const normalizedMobile = phoneNumber.startsWith('+91') 
    ? phoneNumber 
    : `+91${phoneNumber}`;
  
  // Bypass check
  if (normalizedMobile === '+911234567890' && otp === '123456') {
    // Development bypass logic
    return handleBypassVerify(req, res);
  }
  
  // Verify with 2Factor API
  const verifyResult = await twofactorService.verifyOTP(
    normalizedMobile,
    otp,
    user.twoFactorSessionId
  );
  
  if (verifyResult.success) {
    // Generate tokens and return
    const payload = { userId: String(user._id), role: 'user' };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);
    
    // Clear session ID
    user.twoFactorSessionId = null;
    await user.save();
    
    return ApiResponse.success(res, { accessToken, refreshToken, user }, 'OTP verified');
  }
  
  // Handle errors
  return ApiResponse.unauthorized(res, verifyResult.data.message);
}
```

---

## ⚠️ Error Handling

### **Common Errors:**

| Error Code | Description | HTTP Status |
|------------|-------------|-------------|
| `INVALID_OTP` | OTP doesn't match | 400 |
| `OTP_EXPIRED` | OTP has expired | 400 |
| `SESSION_EXPIRED` | Session ID expired | 400 |
| `VERIFICATION_FAILED` | General verification failure | 400 |
| `SERVICE_ERROR` | 2Factor API error | 500 |

### **Error Response Format:**
```javascript
{
  "success": false,
  "status": 400,
  "message": "Invalid OTP. Please check and try again.",
  "code": "INVALID_OTP",
  "data": {
    "error": "INVALID_OTP",
    "details": "The OTP you entered is incorrect"
  }
}
```

---

## ✅ Testing Checklist

### **User Auth:**
- [ ] Send OTP to new user
- [ ] Send OTP to existing user
- [ ] Verify valid OTP
- [ ] Reject invalid OTP
- [ ] Handle expired OTP
- [ ] Resend OTP
- [ ] Rate limiting works
- [ ] Development bypass works

### **Admin Auth:**
- [ ] Admin login (`9999999999`)
- [ ] SubAdmin login (`8888888888`)
- [ ] OTP verification
- [ ] Invalid phone rejection
- [ ] Role detection works

---

## 🚀 Quick Start Implementation

1. **Copy 2Factor Module**
   ```bash
   cp -r oneRupeeClassroomBackend/twofactor vibgyorNode/src/services/
   ```

2. **Update Environment Variables**
   ```env
   TWOFACTOR_API_KEY=your_key
   TWOFACTOR_BASE_URL=https://2factor.in/API/V1
   ```

3. **Add Database Fields**
   - Add `twoFactorSessionId` to User, Admin, SubAdmin models

4. **Update Controllers**
   - Replace hardcoded OTP with 2Factor API calls
   - Add phone number normalization
   - Implement development bypass

5. **Test**
   - Test all three roles
   - Verify error handling
   - Check rate limiting

---

## 📞 Support & Resources

- **2Factor API Docs**: https://2factor.in/API/
- **Implementation Plan**: See `TWO_FACTOR_AUTH_IMPLEMENTATION_PLAN.md`
- **Current Auth Flow**: See `BACKEND_DOCUMENTATION.md`

---

**Last Updated**: 2024  
**Version**: 1.0

