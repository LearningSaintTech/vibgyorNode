# Two-Factor Authentication (2FA) Implementation Plan

## 📋 Overview

This document outlines the phased implementation plan for integrating the 2Factor API service into the VibgyorNode authentication system for **Admin**, **SubAdmin**, and **User** roles.

## 🔍 Current State Analysis

### Current Authentication Flow

#### **User Authentication**
- **Location**: `src/user/auth/controller/userAuthController.js`
- **Current Method**: Hardcoded OTP (`123456`) stored in database
- **Endpoints**:
  - `POST /user/auth/send-phone-otp`
  - `POST /user/auth/verify-phone-otp`
  - `POST /user/auth/resend-phone-otp`
- **OTP Storage**: Database fields (`otpCode`, `otpExpiresAt`, `lastOtpSentAt`)
- **TTL**: 5 minutes
- **Rate Limit**: 60 seconds between requests

#### **Admin Authentication**
- **Location**: `src/admin/adminController/unifiedAdminAuthController.js`
- **Current Method**: Hardcoded OTP (`123456`) with fixed phone numbers
- **Fixed Numbers**: 
  - Admin: `9999999999`
  - SubAdmin: `8888888888`
- **Endpoints**:
  - `POST /admin/auth/send-otp`
  - `POST /admin/auth/verify-otp`
  - `POST /admin/auth/resend-otp`
- **OTP Storage**: Database fields (`otpCode`, `otpExpiresAt`, `lastOtpSentAt`)

#### **SubAdmin Authentication**
- **Location**: Same as Admin (unified controller)
- **Current Method**: Same as Admin
- **Additional Fields**: `approvalStatus`, `isActive`

### 2Factor Module Structure (from oneRupeeClassroomBackend)

```
twofactor/
├── config/
│   └── twofactorConfig.js          # API configuration & axios client
├── services/
│   └── twofactorService.js         # Core 2Factor API integration
├── controllers/
│   └── twofactorAuthController.js  # Auth controllers with validation
└── routes/
    └── twofactorRoutes.js          # Express routes
```

**Key Features**:
- Real OTP sending via 2Factor API
- OTP verification via 2Factor API
- Session ID management
- Comprehensive error handling
- Development bypass for testing (`+911234567890` / `123456`)

---

## 🎯 Implementation Phases

### **Phase 1: Setup & Infrastructure** ⚙️
**Duration**: 1-2 days  
**Priority**: Critical

#### Tasks:
1. **Copy 2Factor Module**
   - Copy `twofactor` folder from `oneRupeeClassroomBackend` to `vibgyorNode/src/services/`
   - Update import paths to match vibgyorNode structure
   - Verify axios dependency (already in package.json)

2. **Environment Configuration**
   - Add to `.env`:
     ```env
     TWOFACTOR_API_KEY=your_api_key_here
     TWOFACTOR_BASE_URL=https://2factor.in/API/V1
     TWOFACTOR_OTP_TEMPLATE_NAME=YourTemplateName
     ```

3. **Update Package Dependencies**
   - Verify `axios` is installed (✅ already present)
   - No additional dependencies needed

4. **Create Unified 2Factor Service**
   - Adapt `twofactorService.js` to work with all three roles
   - Maintain backward compatibility with existing OTP fields

#### Deliverables:
- ✅ 2Factor module integrated into project
- ✅ Environment variables configured
- ✅ Service layer ready for integration

---

### **Phase 2: User Authentication Integration** 👤
**Duration**: 2-3 days  
**Priority**: High

#### Tasks:
1. **Update User Auth Controller**
   - File: `src/user/auth/controller/userAuthController.js`
   - Modify `sendPhoneOtp()`:
     - Replace hardcoded OTP with 2Factor API call
     - Store `sessionId` in database (new field)
     - Keep rate limiting logic
     - Maintain development bypass for testing
   
   - Modify `verifyPhoneOtp()`:
     - Replace database OTP check with 2Factor API verification
     - Use stored `sessionId` for verification
     - Keep existing token generation logic
   
   - Modify `resendPhoneOtp()`:
     - Use 2Factor API resend functionality
     - Update session ID

2. **Update User Model**
   - File: `src/user/auth/model/userAuthModel.js`
   - Add field:
     ```javascript
     twoFactorSessionId: { type: String, default: null }
     ```
   - Keep existing OTP fields for backward compatibility during migration

3. **Add Validation Helpers**
   - Port validation functions from `twofactorAuthController.js`:
     - `validateMobile()`
     - `validateOTP()`
     - `validateSessionId()`

4. **Error Handling**
   - Map 2Factor API errors to existing error codes
   - Maintain consistent API response format

#### Testing Checklist:
- [ ] Send OTP to new user
- [ ] Send OTP to existing user
- [ ] Verify OTP successfully
- [ ] Handle invalid OTP
- [ ] Handle expired OTP
- [ ] Handle expired session
- [ ] Resend OTP functionality
- [ ] Rate limiting still works
- [ ] Development bypass works (`+911234567890`)

#### Deliverables:
- ✅ User authentication uses 2Factor API
- ✅ All existing endpoints work with real OTP
- ✅ Backward compatibility maintained

---

### **Phase 3: Admin Authentication Integration** 👨‍💼
**Duration**: 2-3 days  
**Priority**: High

#### Tasks:
1. **Update Unified Admin Auth Controller**
   - File: `src/admin/adminController/unifiedAdminAuthController.js`
   - Modify `sendOtp()`:
     - Replace hardcoded OTP with 2Factor API call
     - Store `sessionId` in Admin/SubAdmin model
     - Keep role detection logic (`getRoleFromPhoneNumber`)
     - Maintain fixed phone number validation
   
   - Modify `verifyOtp()`:
     - Replace database OTP check with 2Factor API verification
     - Use stored `sessionId` for verification
     - Keep existing token generation logic
   
   - Modify `resendOtp()`:
     - Use 2Factor API resend functionality

2. **Update Admin Model**
   - File: `src/admin/adminModel/adminModel.js`
   - Add field:
     ```javascript
     twoFactorSessionId: { type: String, default: null }
     ```

3. **Update SubAdmin Model**
   - File: `src/subAdmin/subAdminModel/subAdminAuthModel.js`
   - Add field:
     ```javascript
     twoFactorSessionId: { type: String, default: null }
     ```

4. **Maintain Role-Based Logic**
   - Keep `getRoleFromPhoneNumber()` function
   - Ensure admin/subadmin separation works correctly
   - Handle SubAdmin approval status checks

#### Testing Checklist:
- [ ] Send OTP to admin phone (`9999999999`)
- [ ] Send OTP to subadmin phone (`8888888888`)
- [ ] Verify admin OTP successfully
- [ ] Verify subadmin OTP successfully
- [ ] Handle invalid phone numbers
- [ ] Handle invalid OTP
- [ ] Handle expired OTP
- [ ] Resend OTP functionality
- [ ] Role detection still works correctly

#### Deliverables:
- ✅ Admin authentication uses 2Factor API
- ✅ SubAdmin authentication uses 2Factor API
- ✅ Role-based access control maintained

---

### **Phase 4: Unified Service Layer** 🔄
**Duration**: 1-2 days  
**Priority**: Medium

#### Tasks:
1. **Create Role-Agnostic 2Factor Service**
   - Create `src/services/twoFactorAuthService.js`
   - Wrap 2Factor API calls with role-specific logic
   - Handle different phone number formats per role:
     - User: `+91XXXXXXXXXX` (with country code)
     - Admin/SubAdmin: `XXXXXXXXXX` (without country code, fixed numbers)

2. **Phone Number Normalization**
   - User: Ensure `+91` prefix
   - Admin/SubAdmin: Add `+91` prefix before API call
   - Maintain existing phone number storage format

3. **Session Management**
   - Store `sessionId` per role appropriately
   - Handle session expiration
   - Clean up expired sessions

4. **Development Bypass Logic**
   - Maintain bypass for:
     - User: `+911234567890` / `123456`
     - Admin: `9999999999` / `123456`
     - SubAdmin: `8888888888` / `123456`

#### Deliverables:
- ✅ Unified service layer created
- ✅ Phone number normalization working
- ✅ Development bypass maintained

---

### **Phase 5: Error Handling & Logging** 📝
**Duration**: 1 day  
**Priority**: Medium

#### Tasks:
1. **Standardize Error Responses**
   - Map 2Factor API errors to consistent format
   - Use existing `ApiResponse` utility
   - Maintain error codes:
     - `INVALID_OTP`
     - `OTP_EXPIRED`
     - `SESSION_EXPIRED`
     - `VERIFICATION_FAILED`

2. **Enhanced Logging**
   - Add structured logging for 2Factor API calls
   - Log success/failure rates
   - Track OTP delivery times
   - Monitor API quota usage

3. **Error Recovery**
   - Handle 2Factor API downtime gracefully
   - Fallback mechanism (optional: revert to hardcoded OTP in emergency)
   - Alert system for API failures

#### Deliverables:
- ✅ Consistent error handling across all roles
- ✅ Comprehensive logging in place
- ✅ Error recovery mechanisms

---

### **Phase 6: Testing & Validation** ✅
**Duration**: 2-3 days  
**Priority**: Critical

#### Tasks:
1. **Unit Tests**
   - Test 2Factor service methods
   - Test validation functions
   - Test error handling

2. **Integration Tests**
   - Test complete auth flows for each role
   - Test edge cases (expired OTP, invalid session, etc.)
   - Test rate limiting
   - Test development bypass

3. **Load Testing**
   - Test concurrent OTP requests
   - Test API rate limits
   - Monitor performance impact

4. **Security Testing**
   - Verify OTP cannot be bypassed
   - Test session hijacking prevention
   - Verify phone number validation

#### Testing Scenarios:

**User Authentication:**
- [ ] New user registration with OTP
- [ ] Existing user login with OTP
- [ ] OTP resend functionality
- [ ] Invalid OTP handling
- [ ] Expired OTP handling
- [ ] Rate limiting enforcement
- [ ] Development bypass (`+911234567890`)

**Admin Authentication:**
- [ ] Admin login with fixed phone (`9999999999`)
- [ ] OTP verification
- [ ] Invalid phone number rejection
- [ ] Role detection accuracy

**SubAdmin Authentication:**
- [ ] SubAdmin login with fixed phone (`8888888888`)
- [ ] OTP verification
- [ ] Approval status checks
- [ ] Inactive SubAdmin handling

#### Deliverables:
- ✅ All tests passing
- ✅ Performance benchmarks met
- ✅ Security validation complete

---

### **Phase 7: Documentation & Deployment** 📚
**Duration**: 1 day  
**Priority**: Medium

#### Tasks:
1. **Update API Documentation**
   - Document new 2Factor integration
   - Update endpoint documentation
   - Add error code reference
   - Include development bypass instructions

2. **Environment Setup Guide**
   - Document environment variables
   - 2Factor API setup instructions
   - Testing configuration

3. **Migration Guide**
   - Document changes from hardcoded OTP
   - Backward compatibility notes
   - Rollback procedures

4. **Deployment Checklist**
   - [ ] Environment variables set
   - [ ] 2Factor API key configured
   - [ ] Database migrations run (if needed)
   - [ ] Monitoring configured
   - [ ] Rollback plan ready

#### Deliverables:
- ✅ Updated API documentation
- ✅ Deployment guide
- ✅ Migration documentation

---

## 📊 Implementation Timeline

```
Week 1:
├── Phase 1: Setup & Infrastructure (Days 1-2)
└── Phase 2: User Authentication Integration (Days 3-5)

Week 2:
├── Phase 3: Admin Authentication Integration (Days 1-3)
├── Phase 4: Unified Service Layer (Days 4-5)
└── Phase 5: Error Handling & Logging (Day 6)

Week 3:
├── Phase 6: Testing & Validation (Days 1-3)
└── Phase 7: Documentation & Deployment (Day 4)
```

**Total Estimated Duration**: 2-3 weeks

---

## 🔧 Technical Considerations

### **Phone Number Format Handling**

**Current State:**
- User: Stores as `7776665555` (without country code prefix)
- Admin/SubAdmin: Stores as `9999999999` / `8888888888`

**2Factor API Requirement:**
- Requires format: `+91XXXXXXXXXX` (with country code)

**Solution:**
- Normalize phone numbers before API calls
- Store original format in database
- Add `countryCode` field if not present

### **Session ID Storage**

**New Database Fields:**
```javascript
// User Model
twoFactorSessionId: { type: String, default: null }

// Admin Model  
twoFactorSessionId: { type: String, default: null }

// SubAdmin Model
twoFactorSessionId: { type: String, default: null }
```

### **Backward Compatibility**

**Migration Strategy:**
1. Keep existing OTP fields during transition
2. Add new `twoFactorSessionId` field
3. Support both methods during migration period
4. Remove old fields after full migration

### **Development Bypass**

**Maintain for Testing:**
- User: `+911234567890` / `123456`
- Admin: `9999999999` / `123456`
- SubAdmin: `8888888888` / `123456`

**Implementation:**
- Check phone number before API call
- Return mock session ID for bypass numbers
- Skip 2Factor API call for bypass numbers

---

## 🚨 Risk Mitigation

### **Risk 1: 2Factor API Downtime**
**Mitigation:**
- Implement fallback mechanism
- Monitor API health
- Alert system for failures
- Optional: Keep hardcoded OTP as emergency fallback

### **Risk 2: API Rate Limits**
**Mitigation:**
- Implement client-side rate limiting (already exists)
- Monitor API quota usage
- Upgrade 2Factor plan if needed
- Cache successful verifications

### **Risk 3: Phone Number Format Issues**
**Mitigation:**
- Comprehensive validation before API calls
- Normalize phone numbers consistently
- Test with various phone number formats

### **Risk 4: Session Management**
**Mitigation:**
- Store session IDs securely
- Implement session expiration
- Clean up expired sessions
- Handle concurrent requests properly

---

## 📈 Success Metrics

### **Technical Metrics**
- ✅ 100% OTP delivery success rate (excluding invalid numbers)
- ✅ < 2 second API response time
- ✅ Zero authentication bypass vulnerabilities
- ✅ 99.9% uptime for auth endpoints

### **Business Metrics**
- ✅ Reduced support tickets for OTP issues
- ✅ Improved user trust and security
- ✅ Compliance with security standards

---

## 🔄 Rollback Plan

If issues arise during deployment:

1. **Immediate Rollback**
   - Revert code changes
   - Restore previous OTP logic
   - Update environment variables

2. **Partial Rollback**
   - Disable 2Factor for specific role
   - Re-enable hardcoded OTP temporarily
   - Investigate issues

3. **Data Cleanup**
   - Remove `twoFactorSessionId` fields if needed
   - Clean up test data
   - Restore database backups if necessary

---

## 📝 Notes

- All phases should be tested in development environment first
- Staging environment testing before production deployment
- Monitor 2Factor API usage and costs
- Keep development bypass for testing convenience
- Document any deviations from this plan

---

## ✅ Phase Completion Checklist

- [ ] Phase 1: Setup & Infrastructure
- [ ] Phase 2: User Authentication Integration
- [ ] Phase 3: Admin Authentication Integration
- [ ] Phase 4: Unified Service Layer
- [ ] Phase 5: Error Handling & Logging
- [ ] Phase 6: Testing & Validation
- [ ] Phase 7: Documentation & Deployment

---

**Document Version**: 1.0  
**Last Updated**: 2024  
**Author**: Implementation Team  
**Status**: Ready for Implementation

