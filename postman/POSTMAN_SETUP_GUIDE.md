# VibgyorNode API - Postman Setup Guide

This guide will help you set up and use the Postman collection for testing the VibgyorNode API.

## 📦 Files Included

1. **VibgyorNode_API.postman_collection.json** - Complete API collection with all endpoints
2. **VibgyorNode_API.postman_environment.json** - Environment variables for local development
3. **POSTMAN_SETUP_GUIDE.md** - This setup guide

## 🚀 Quick Start

### Step 1: Import Collection and Environment

1. Open Postman
2. Click **Import** button (top left)
3. Select both files:
   - `VibgyorNode_API.postman_collection.json`
   - `VibgyorNode_API.postman_environment.json`
4. Click **Import**

### Step 2: Select Environment

1. In the top-right corner, click the environment dropdown
2. Select **"VibgyorNode API - Local"**

### Step 3: Update Base URL (if needed)

1. Click the **eye icon** next to the environment dropdown
2. Click **Edit** on "VibgyorNode API - Local"
3. Update `base_url` if your server runs on a different port:
   - Default: `http://localhost:3000`
   - Production: `https://your-api-domain.com`

### Step 4: Get Authentication Tokens

#### For User Authentication:

1. Go to **User Authentication** → **Send OTP**
2. Update the request body with your phone number:
   ```json
   {
     "phoneNumber": "7776665555",
     "countryCode": "+91"
   }
   ```
3. Send the request
4. Go to **User Authentication** → **Verify OTP**
5. Update the request body:
   ```json
   {
     "phoneNumber": "7776665555",
     "otp": "123456"
   }
   ```
6. Send the request - **Token is automatically saved** to `user_access_token`

#### For Admin Authentication:

1. Go to **Admin Authentication** → **Admin Send OTP**
2. Use phone: `9999999999` (development)
3. Go to **Admin Authentication** → **Admin Verify OTP**
4. Use OTP: `123456` (development)
5. **Token is automatically saved** to `admin_token`

#### For SubAdmin Authentication:

1. Go to **SubAdmin Authentication** → **SubAdmin Send OTP**
2. Use phone: `8888888888` (development)
3. Go to **SubAdmin Authentication** → **SubAdmin Verify OTP**
4. Use OTP: `123456` (development)
5. **Token is automatically saved** to `subadmin_token`

## 📁 Collection Structure

The collection is organized into the following folders:

### 1. System
- Health Check
- API Info
- Root

### 2. User Authentication
- Send OTP
- Verify OTP (auto-saves token)
- Refresh Token
- Update Access Token
- Send Email OTP
- Verify Email OTP

### 3. User Profile
- Get Current User
- Get Profile
- Update Profile
- Get Profile Step
- Get/Update Privacy Settings

### 4. File Upload
- Upload File (generic)
- Upload Profile Picture

### 5. Username
- Check Username Available
- Get Username Suggestions

### 6. Catalog
- Get Catalog
- Get Gender Catalog
- Get HereFor Catalog

### 7. Posts
- Create Post
- Get Feed
- Get My Posts
- Get Post by ID
- Like Post
- Comment on Post
- Delete Post

### 8. Stories
- Create Story
- Get Stories Feed
- View Story
- Delete Story

### 9. Social
- Follow/Unfollow User
- Get Followers
- Get Following
- Search Users

### 10. Chat & Messages
- Create/Get Chat
- Get My Chats
- Get Chat Details
- Send Message
- Get Messages
- Mark Messages as Read

### 11. Calls
- Get Call History

### 12. Dating
- Get Dating Profile
- Get Dating Profiles (Discover)
- Like/Dislike Dating Profile
- Get Matches
- Get/Update Dating Preferences
- Upload Dating Photo
- Toggle Dating Profile

### 13. Notifications
- Get Notifications
- Mark Notification as Read
- Get/Update Notification Preferences
- Register FCM Token

### 14. Admin Authentication
- Admin Send OTP
- Admin Verify OTP (auto-saves token)

### 15. Admin Management
- Get All Users
- Get User Details
- Update User Status

### 16. SubAdmin Authentication
- SubAdmin Send OTP
- SubAdmin Verify OTP (auto-saves token)

## 🔑 Environment Variables

The environment includes the following variables:

| Variable | Description | Auto-populated |
|----------|-------------|----------------|
| `base_url` | API base URL | No (set manually) |
| `user_access_token` | User JWT token | Yes (on Verify OTP) |
| `user_refresh_token` | User refresh token | Yes (on Verify OTP) |
| `user_id` | Current user ID | Yes (on Verify OTP) |
| `admin_token` | Admin JWT token | Yes (on Admin Verify OTP) |
| `subadmin_token` | SubAdmin JWT token | Yes (on SubAdmin Verify OTP) |
| `chat_id` | Chat ID for testing | No (set manually) |
| `other_user_id` | Other user ID for testing | No (set manually) |
| `post_id` | Post ID for testing | No (set manually) |
| `story_id` | Story ID for testing | No (set manually) |

## 🧪 Testing Workflow

### Complete User Flow:

1. **Authenticate**
   - Send OTP → Verify OTP (token saved automatically)

2. **Complete Profile**
   - Get Profile Step
   - Update Profile
   - Upload Profile Picture
   - Check Username Available
   - Update Profile with username

3. **Create Content**
   - Upload File (for post media)
   - Create Post
   - Create Story

4. **Social Interactions**
   - Search Users
   - Follow User
   - Get Feed
   - Like Post
   - Comment on Post

5. **Messaging**
   - Create/Get Chat
   - Send Message
   - Get Messages

6. **Dating**
   - Get Dating Profile
   - Update Dating Preferences
   - Upload Dating Photo
   - Get Dating Profiles (Discover)
   - Like Dating Profile
   - Get Matches

### Admin Flow:

1. **Authenticate**
   - Admin Send OTP → Admin Verify OTP (token saved automatically)

2. **Manage Users**
   - Get All Users
   - Get User Details
   - Update User Status

## 🔧 Development Credentials

For development/testing, use these credentials:

| Role | Phone Number | OTP |
|------|-------------|-----|
| User | `7776665555` | `123456` |
| Admin | `9999999999` | `123456` |
| SubAdmin | `8888888888` | `123456` |

**Note:** These bypass the actual OTP service in development mode.

## 📝 Request Examples

### Create Post with Media

1. First, upload media using **File Upload** → **Upload File**
2. Copy the returned URL
3. Use **Posts** → **Create Post**
4. In form-data, add:
   - `caption`: "My post caption"
   - `visibility`: "public"
   - `files`: [Select file]

### Send Message

1. First, create/get a chat using **Chat & Messages** → **Create/Get Chat**
2. Copy the `chatId` from response
3. Update `chat_id` environment variable (or use directly)
4. Use **Chat & Messages** → **Send Message**
5. Body:
   ```json
   {
     "chatId": "{{chat_id}}",
     "content": "Hello!",
     "type": "text"
   }
   ```

## 🐛 Troubleshooting

### 401 Unauthorized
- Check if token is set in environment
- Verify token hasn't expired (tokens last 30 days)
- Re-authenticate to get a new token

### 404 Not Found
- Verify `base_url` is correct
- Check if the server is running
- Ensure endpoint path is correct

### 400 Bad Request
- Check request body format
- Verify required fields are provided
- Check data types match API expectations

### Token Not Auto-Saving
- Ensure you're using the correct Verify OTP request
- Check Postman console for errors
- Manually copy token from response and set in environment

## 🔄 Updating the Collection

If new endpoints are added to the API:

1. Export the updated collection from Postman
2. Replace `VibgyorNode_API.postman_collection.json`
3. Update this guide if needed

## 📚 Additional Resources

- **Backend Documentation**: See `BACKEND_DOCUMENTATION.md`
- **API Documentation**: See `scriptFiles/API_DOCUMENTATION.txt`
- **Posts & Stories API**: See `POSTS_AND_STORIES_API_DOCUMENTATION.md`
- **Dating API**: See `docs/dating-api.md`

## ✅ Best Practices

1. **Always use environment variables** for tokens and IDs
2. **Save successful responses** to update environment variables manually if needed
3. **Test in order**: Authentication → Profile → Content → Interactions
4. **Use the auto-save feature** for tokens (Verify OTP requests)
5. **Keep tokens secure** - don't commit environment files with real tokens

---

**Last Updated**: 2024-12-19  
**Version**: 1.0.0

