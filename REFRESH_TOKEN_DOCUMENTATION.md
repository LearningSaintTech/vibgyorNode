# Refresh Token Implementation Documentation

## Overview

This document describes the refresh token implementation in VibgyorNode API, including endpoints, flow, and best practices.

---

## 📋 Summary of Changes

### Files Updated:
1. **API_DOCUMENTATION.txt** - Added comprehensive token refresh documentation
2. **corrected-postman-collection.json** - Added 3 new refresh token endpoints
3. **Total API Count**: 177 endpoints (increased from 174)

---

## 🔑 Refresh Token Endpoints

### 1. User Refresh Token
```http
POST /user/auth/update-access-token
Content-Type: application/json

{
  "refreshToken": "your_refresh_token_here"
}
```

**Alternative**: Can also send refresh token via cookies with key `jwt`

### 2. Admin Refresh Token
```http
POST /admin/auth/refresh-token
Content-Type: application/json

{
  "refreshToken": "your_refresh_token_here"
}
```

### 3. SubAdmin Refresh Token
```http
POST /subadmin/auth/refresh-token
Content-Type: application/json

{
  "refreshToken": "your_refresh_token_here"
}
```

---

## 📊 Response Format

### Success Response
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "new_jwt_access_token",
    "refreshToken": "new_jwt_refresh_token"
  }
}
```

### Error Response (Token Expired)
```json
{
  "success": false,
  "message": "Refresh token expired",
  "error": {
    "code": "REFRESH_TOKEN_EXPIRED",
    "details": "Please login again",
    "timestamp": "2025-01-13"
  }
}
```

---

## 🔄 Token Lifecycle Flow

### 1. Initial Login (OTP Verification)
```
User → POST /user/auth/verify-otp
     ← { accessToken, refreshToken, user }
```
**Action**: Store both tokens securely

### 2. Making API Requests
```
User → GET /user/profile
       Header: Authorization: Bearer <accessToken>
     ← { success: true, data: {...} }
```
**Action**: Use access token for all API calls

### 3. Access Token Expired
```
User → GET /user/profile
       Header: Authorization: Bearer <expired_accessToken>
     ← { success: false, error: "TOKEN_EXPIRED" }
```
**Action**: Proceed to step 4

### 4. Refresh Access Token
```
User → POST /user/auth/update-access-token
       Body: { refreshToken }
     ← { accessToken: "new", refreshToken: "new" }
```
**Action**: Update stored tokens, retry original request

### 5. Refresh Token Expired
```
User → POST /user/auth/update-access-token
       Body: { refreshToken }
     ← { success: false, error: "REFRESH_TOKEN_EXPIRED" }
```
**Action**: Redirect to login page

---

## ⚙️ Token Configuration

### Access Token
- **Expiry**: 7 days (default)
- **Secret**: `JWT_ACCESS_SECRET` or `JWT_SECRET`
- **Purpose**: Authenticate API requests
- **Storage**: Memory, sessionStorage, or secure storage

### Refresh Token
- **Expiry**: 7 days (default)
- **Secret**: `JWT_REFRESH_SECRET` or `JWT_SECRET`
- **Purpose**: Obtain new access tokens
- **Storage**: httpOnly cookies (recommended) or secure storage

### Environment Variables
```env
JWT_ACCESS_SECRET=your_access_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here
# or use a single secret
JWT_SECRET=your_jwt_secret_here
```

---

## 🛡️ Security Best Practices

### Token Storage
✅ **Recommended**:
- Store refresh tokens in httpOnly cookies
- Store access tokens in memory or sessionStorage
- Never store tokens in localStorage (XSS vulnerable)

❌ **Avoid**:
- Storing tokens in URLs
- Logging tokens
- Exposing tokens in client-side code

### Token Handling
1. **Automatic Refresh**: Implement interceptors to automatically refresh tokens
2. **Token Rotation**: Generate new refresh token on each refresh (implemented)
3. **Secure Transmission**: Always use HTTPS in production
4. **Clear on Logout**: Remove all tokens when user logs out

### Error Handling
```javascript
// Example: Axios interceptor for automatic token refresh
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Call refresh endpoint
        const { data } = await axios.post('/user/auth/update-access-token', {
          refreshToken: getRefreshToken()
        });
        
        // Update tokens
        setAccessToken(data.data.accessToken);
        setRefreshToken(data.data.refreshToken);
        
        // Retry original request
        originalRequest.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return axios(originalRequest);
      } catch (refreshError) {
        // Refresh token expired - redirect to login
        redirectToLogin();
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);
```

---

## 📝 Postman Collection Updates

### New Requests Added:
1. **Admin → Authentication → Refresh Access Token**
2. **SubAdmin → Authentication → Refresh Access Token**
3. **User → Authentication → Refresh Access Token**

### Auto-Update Environment Variables:
All refresh token endpoints include test scripts that automatically update:
- `ADMIN_ACCESS_TOKEN` / `ADMIN_REFRESH_TOKEN`
- `SUBADMIN_ACCESS_TOKEN` / `SUBADMIN_REFRESH_TOKEN`
- `USER_ACCESS_TOKEN` / `USER_REFRESH_TOKEN`
- `ACCESS_TOKEN` / `REFRESH_TOKEN` (for User)

---

## 📈 API Statistics

### Total Endpoints: **177**
- GET: 92
- POST: 49 (includes 3 new refresh endpoints)
- PUT: 14
- DELETE: 10
- PATCH: 12

### Breakdown by Category:
- **System**: 3 endpoints
- **Admin**: 25 endpoints (including refresh)
- **SubAdmin**: 15 endpoints (including refresh)
- **User**: 134 endpoints (including refresh)

---

## 🔍 Testing the Refresh Flow

### Using Postman:

1. **Login**:
   ```
   POST /user/auth/verify-otp
   → Stores ACCESS_TOKEN and REFRESH_TOKEN
   ```

2. **Make API Call**:
   ```
   GET /user/auth/profile
   → Uses ACCESS_TOKEN
   ```

3. **Simulate Token Expiry**:
   - Manually expire the access token (wait or modify)
   - Or use an expired token

4. **Refresh Token**:
   ```
   POST /user/auth/update-access-token
   Body: { "refreshToken": "{{USER_REFRESH_TOKEN}}" }
   → Updates ACCESS_TOKEN and REFRESH_TOKEN
   ```

5. **Retry API Call**:
   ```
   GET /user/auth/profile
   → Uses new ACCESS_TOKEN
   ```

---

## 🚀 Frontend Implementation Example

### React with Axios

```javascript
// api.js
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000',
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const { data } = await axios.post(
          'http://localhost:3000/user/auth/update-access-token',
          { refreshToken }
        );
        
        localStorage.setItem('accessToken', data.data.accessToken);
        localStorage.setItem('refreshToken', data.data.refreshToken);
        
        originalRequest.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
```

---

## 📚 Additional Resources

### Documentation Files:
- `API_DOCUMENTATION.txt` - Complete API reference
- `corrected-postman-collection.json` - Postman collection with all endpoints
- `SEARCH_API_DOCUMENTATION.md` - Search API specific documentation

### Related Sections in API_DOCUMENTATION.txt:
- **Authentication** (Lines 39-86) - Token lifecycle and refresh endpoints
- **Error Handling** (Lines 2550-2670) - Token error codes and examples
- **Best Practices** (Lines 2844-2854) - Token security recommendations

---

## 🎯 Key Takeaways

1. ✅ **3 new refresh token endpoints** added (User, Admin, SubAdmin)
2. ✅ **Automatic token rotation** - new refresh token on each refresh
3. ✅ **Comprehensive documentation** - flow diagrams, examples, best practices
4. ✅ **Postman collection updated** - auto-updates environment variables
5. ✅ **Security-first approach** - httpOnly cookies, HTTPS, secure storage
6. ✅ **Error handling** - specific error codes for different token states
7. ✅ **Frontend examples** - React/Axios interceptor implementation

---

**Last Updated**: January 13, 2025  
**API Version**: 2.0.0  
**Total Endpoints**: 177


