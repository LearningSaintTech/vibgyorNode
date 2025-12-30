# SubAdmin Profile API - Quick Start Guide

## 🚀 Quick Import

1. **Open Postman**
2. Click **Import** button (top left)
3. Select these 2 files:
   - `SubAdmin_Profile_API.postman_collection.json`
   - `SubAdmin_Profile_API.postman_environment.json`
4. Click **Import**

## ⚙️ Setup Environment

1. Select **"SubAdmin Profile API - Local"** from environment dropdown
2. Update variables:
   - `base_url`: `http://localhost:3000` (already set)
   - `subadmin_token`: Paste your SubAdmin JWT token here
   - `admin_token`: Paste your Admin JWT token here (for admin routes)

## 🔑 Get SubAdmin Token

### Step 1: Send OTP
```
POST http://localhost:3000/subadmin/auth/send-otp
Body (JSON):
{
  "phoneNumber": "8888888888",
  "countryCode": "+91"
}
```

### Step 2: Verify OTP
```
POST http://localhost:3000/subadmin/auth/verify-otp
Body (JSON):
{
  "phoneNumber": "8888888888",
  "otp": "123456"
}
```

### Step 3: Copy Token
- Copy the `accessToken` from response
- Paste it in `subadmin_token` environment variable

## 📝 Create Profile (Minimal)

**Use this request:** `2. Create Profile (Minimal)`

1. Open the request
2. In **Body** tab, you'll see **form-data** mode (already selected)
3. Update values:
   - `firstName`: Your first name
   - `lastName`: Your last name
4. Click **Send**

✅ **That's it!** Profile created with just firstName and lastName.

## 📝 Create Profile (With Image)

**Use this request:** `3. Create Profile (With Image)`

1. Open the request
2. In **Body** tab, **form-data** mode is already selected
3. Update text fields:
   - `firstName`: Your first name
   - `lastName`: Your last name
   - `email`: Your email (optional)
   - `phone`: Your phone (optional)
   - etc.
4. For image:
   - Click on `profileImage` field
   - Change type from "Text" to **"File"** (dropdown on right)
   - Click **Select Files** and choose your image
5. Click **Send**

## ⚠️ Important Notes

### ✅ DO THIS:
- ✅ Use **form-data** mode (not raw/JSON)
- ✅ Use **multipart/form-data** for all POST/PUT requests
- ✅ Set `profileImage` field type to **"File"** when uploading images
- ✅ Include `Authorization: Bearer {{subadmin_token}}` header

### ❌ DON'T DO THIS:
- ❌ Don't use JSON/raw mode
- ❌ Don't manually set Content-Type header (Postman does it automatically)
- ❌ Don't use `application/json` for requests with images

## 📋 Available Requests

### SubAdmin Routes (Own Profile)
1. **Get Own Profile** - GET `/subadmin/profile`
2. **Create Profile (Minimal)** - POST `/subadmin/profile` (firstName, lastName only)
3. **Create Profile (With Image)** - POST `/subadmin/profile` (all fields + image)
4. **Update Profile** - PUT `/subadmin/profile` (update any fields)
5. **Update Profile Image Only** - PUT `/subadmin/profile` (just image)
6. **Delete Profile** - DELETE `/subadmin/profile`

### Admin Routes (Manage All)
7. **Get All SubAdmin Profiles** - GET `/subadmin/profiles` (with pagination)
8. **Get SubAdmin Profile by ID** - GET `/subadmin/profile/:id`

## 🧪 Test Sequence

1. **Get Token** → Use subadmin auth endpoints
2. **Set Token** → Update `subadmin_token` in environment
3. **Create Profile** → Use "Create Profile (Minimal)"
4. **Get Profile** → Use "Get Own Profile" to verify
5. **Update Profile** → Use "Update Profile" to modify
6. **Add Image** → Use "Update Profile Image Only"

## 🐛 Troubleshooting

### 500 Error
- Check server console logs for detailed error
- Verify all required fields are provided
- Check JWT token is valid

### 401 Unauthorized
- Verify `subadmin_token` is set in environment
- Check token hasn't expired
- Ensure token format: `Bearer <token>`

### Image Not Uploading
- Make sure `profileImage` field type is set to **"File"** (not Text)
- Check image size is under 5MB
- Verify image format (JPEG, PNG, WebP, GIF)

## 📞 Support

Check server console logs for detailed error messages. All errors are logged with `[SUBADMIN][PROFILE]` prefix.


