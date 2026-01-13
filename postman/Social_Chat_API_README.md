# Social Chat API - Postman Collection

Complete Postman collection for the Social Chat module covering all chat, messaging, calling, message requests, and user status features.

## 📦 Files

- **Social_Chat_API.postman_collection.json** - Complete collection with all social chat endpoints
- **Social_Chat_API_README.md** - This documentation

## 🚀 Quick Start

### Step 1: Import Collection

1. Open Postman
2. Click **Import** button
3. Select `Social_Chat_API.postman_collection.json`
4. Also import `VibgyorNode_API.postman_environment.json` (from main collection) for environment variables

### Step 2: Set Up Environment

1. Select **"VibgyorNode API - Local"** environment
2. Ensure you have:
   - `base_url`: `http://localhost:3000`
   - `user_access_token`: Your JWT token (get from User Authentication)
   - `other_user_id`: ID of another user for testing
   - `chat_id`: Will be auto-populated when creating a chat
   - `message_id`: Will be auto-populated when sending a message
   - `call_id`: Will be auto-populated when initiating a call

### Step 3: Authenticate

1. Use the main collection's **User Authentication** → **Verify OTP** to get your token
2. Token will be auto-saved to `user_access_token`

## 📁 Collection Structure

### 1. Chat Management (9 endpoints)

| Endpoint | Method | Description |
|----------|--------|-------------|
| Create or Get Chat | POST | Create new chat or get existing chat |
| Get My Chats | GET | Get all chats with pagination |
| Search Chats | GET | Search chats by participant name |
| Get Chat Details | GET | Get detailed chat information |
| Update Chat Settings | PUT | Update archive, pin, mute settings |
| Delete Chat | DELETE | Delete/archive a chat |
| Get Chat Statistics | GET | Get chat stats for user |
| Join Chat Room | POST | Join chat room for real-time (Socket.IO) |
| Leave Chat Room | POST | Leave chat room |

**Key Features:**
- Auto-saves `chat_id` when creating a chat
- Supports pagination and search
- Chat settings: archive, pin, mute

### 2. Messages (21 endpoints)

#### Send Messages (9 types)
- **Text Message** - Basic text
- **Image Message** - With file upload
- **Video Message** - With file upload
- **Audio Message** - With file upload
- **Voice Message** - Voice recording
- **Document Message** - File/document
- **Location Message** - Share location
- **Reply Message** - Reply to another message
- **One-View Message** - Disappears after viewing

#### Message Operations (12 endpoints)
- Get Chat Messages - With pagination
- Mark Messages as Read
- Get Chat Media - Filter by type
- Search Messages in Chat
- Get Message Details
- Edit Message
- Delete Message
- Add Reaction
- Remove Reaction
- Forward Message
- Mark One-View as Viewed

**Message Types Supported:**
- `text` - Text message
- `image` - Image file
- `video` - Video file
- `audio` - Audio file
- `voice` - Voice recording
- `document` - Document/file
- `gif` - GIF (external or uploaded)
- `location` - Location sharing
- `system` - System message
- `forwarded` - Forwarded message

**Key Features:**
- Auto-saves `message_id` when sending
- Supports file uploads via form-data
- One-view messages with expiration
- Message reactions with emojis
- Reply and forward functionality

### 3. Calls (11 endpoints)

| Endpoint | Method | Description |
|----------|--------|-------------|
| Initiate Call | POST | Start audio/video call |
| Get Call Status | GET | Get current call status |
| Accept Call | POST | Accept incoming call |
| Reject Call | POST | Reject incoming call |
| End Call | POST | End active call |
| Update Call Settings | PUT | Update call settings (mute, video, etc.) |
| Handle WebRTC Signaling | POST | WebRTC offer/answer/ICE |
| Get Call History for Chat | GET | Get call history |
| Get Active Call for Chat | GET | Get active call |
| Get Call Statistics | GET | Get call stats |
| Force Cleanup Calls | POST | Cleanup calls (debugging) |

**Call Types:**
- `audio` - Audio call
- `video` - Video call

**Call Settings:**
- `isMuted` - Mute/unmute
- `isVideoEnabled` - Enable/disable video
- `isScreenSharing` - Screen sharing
- `isSpeakerEnabled` - Speaker mode
- `audioInput` - Audio input device
- `audioOutput` - Audio output device
- `videoInput` - Video input device

**End Call Reasons:**
- `user_ended`
- `network_error`
- `timeout`
- `device_error`
- `permission_denied`
- `user_busy`
- `user_offline`
- `system_error`

### 4. Message Requests (9 endpoints)

| Endpoint | Method | Description |
|----------|--------|-------------|
| Send Message Request | POST | Send request to another user |
| Get Pending Requests | GET | Get received requests |
| Get Sent Requests | GET | Get sent requests |
| Accept Request | POST | Accept request (creates chat) |
| Reject Request | POST | Reject request |
| Delete Request | DELETE | Delete request |
| Get Request Details | GET | Get request info |
| Get Request Statistics | GET | Get stats |
| Get Request Between Users | GET | Get request between two users |

**Key Features:**
- Auto-saves `message_request_id` when sending
- Accepting a request automatically creates a chat
- Privacy-based messaging system

### 5. User Status (8 endpoints)

| Endpoint | Method | Description |
|----------|--------|-------------|
| Update User Status | PUT | Update status (online/offline/away/busy) |
| Get User Status | GET | Get specific user's status |
| Get Online Users | GET | Get list of online users |
| Get Recently Active Users | GET | Get recently active users |
| Get User Statuses (Batch) | POST | Get multiple users' statuses |
| Update Privacy Settings | PUT | Update status privacy |
| Get Status Statistics | GET | Get status stats |
| Set Offline Status | POST | Set offline (sendBeacon) |

**Status Options:**
- `online` - User is online
- `offline` - User is offline
- `away` - User is away
- `busy` - User is busy

## 🧪 Testing Workflows

### Complete Chat Flow

1. **Create Chat**
   - Use "Create or Get Chat" with `other_user_id`
   - `chat_id` is auto-saved

2. **Send Messages**
   - Send text message
   - Send image/video/audio
   - Send location
   - Reply to message

3. **Manage Chat**
   - Get chat details
   - Update chat settings (pin, mute, archive)
   - Search messages
   - Get media

4. **Interact with Messages**
   - Add reactions
   - Edit message
   - Forward message
   - Delete message

### Call Flow

1. **Initiate Call**
   - Use "Initiate Call" with `chat_id` and type (`audio` or `video`)
   - `call_id` is auto-saved

2. **Handle Call**
   - Get call status
   - Accept/Reject call
   - Update call settings
   - Handle WebRTC signaling

3. **End Call**
   - End call with reason
   - Get call history

### Message Request Flow

1. **Send Request**
   - Use "Send Message Request" with `other_user_id`
   - `message_request_id` is auto-saved

2. **Manage Requests**
   - Get pending/sent requests
   - Accept/Reject request
   - Get request details

3. **Accept Request**
   - Accepting creates a chat automatically
   - Can then send messages

### Status Flow

1. **Update Status**
   - Update your status (online/offline/away/busy)

2. **Check Statuses**
   - Get other users' statuses
   - Get online users
   - Get recently active users

## 📝 Request Examples

### Send Text Message
```json
{
  "chatId": "{{chat_id}}",
  "type": "text",
  "content": "Hello! This is a test message."
}
```

### Send Image Message
```
POST /api/v1/user/messages
Content-Type: multipart/form-data

chatId: {{chat_id}}
type: image
content: Check out this image!
file: [select file]
```

### Send Location Message
```json
{
  "chatId": "{{chat_id}}",
  "type": "location",
  "location": {
    "latitude": 19.0760,
    "longitude": 72.8777,
    "address": "Mumbai, Maharashtra, India",
    "name": "Mumbai",
    "placeType": "city"
  }
}
```

### Send One-View Message
```json
{
  "chatId": "{{chat_id}}",
  "type": "text",
  "content": "This message will disappear after viewing",
  "isOneView": true,
  "oneViewExpirationHours": 24
}
```

### Initiate Audio Call
```json
{
  "chatId": "{{chat_id}}",
  "type": "audio"
}
```

### Update Chat Settings
```json
{
  "isArchived": false,
  "isPinned": true,
  "isMuted": false
}
```

### Send Message Request
```json
{
  "message": "Hi, I'd like to connect with you!"
}
```

## 🔑 Environment Variables

Required variables (from main environment):

| Variable | Description | Auto-populated |
|----------|-------------|----------------|
| `base_url` | API base URL | No |
| `user_access_token` | User JWT token | Yes (on Verify OTP) |
| `other_user_id` | Another user ID for testing | No |
| `chat_id` | Chat ID | Yes (on Create Chat) |
| `message_id` | Message ID | Yes (on Send Message) |
| `call_id` | Call ID | Yes (on Initiate Call) |
| `message_request_id` | Message request ID | Yes (on Send Request) |
| `target_chat_id` | Target chat for forwarding | No |

## 🎯 Key Features

### Auto-Save Functionality
- **Chat ID**: Automatically saved when creating a chat
- **Message ID**: Automatically saved when sending a message
- **Call ID**: Automatically saved when initiating a call
- **Request ID**: Automatically saved when sending a message request

### Real-time Features
- Socket.IO integration for real-time messaging
- Typing indicators
- Online status
- Message delivery status
- Call notifications

### Message Features
- Multiple message types (text, image, video, audio, voice, document, location)
- One-view messages (disappear after viewing)
- Message reactions
- Reply to messages
- Forward messages
- Edit messages
- Delete messages

### Call Features
- Audio and video calls
- WebRTC signaling
- Call settings (mute, video, screen sharing)
- Call history
- Call statistics

### Privacy Features
- Message requests for private profiles
- Status privacy settings
- Online status visibility

## 🐛 Troubleshooting

### 401 Unauthorized
- Check if `user_access_token` is set
- Verify token hasn't expired
- Re-authenticate if needed

### 404 Not Found
- Verify `chat_id`, `message_id`, or `call_id` are correct
- Check if resource exists

### 400 Bad Request
- Verify request body format
- Check required fields
- Validate data types

### File Upload Issues
- Ensure file is selected in form-data
- Check file size limits
- Verify file type is supported

## 📚 Related Documentation

- **Main API Collection**: See `VibgyorNode_API.postman_collection.json`
- **Backend Documentation**: See `BACKEND_DOCUMENTATION.md`
- **Social Messaging Flow**: See `SOCIAL_MESSAGING_FLOW_SCAN.md`
- **Complete Chat Flow**: See `COMPLETE_SOCIAL_CHAT_FLOW_SCAN.md`

## ✅ Best Practices

1. **Always authenticate first** - Get token before testing
2. **Use environment variables** - Don't hardcode IDs
3. **Test in order** - Create chat → Send message → Interact
4. **Use auto-save** - Let Postman save IDs automatically
5. **Check responses** - Verify success before proceeding
6. **Clean up** - Delete test chats/messages when done

---

**Last Updated**: 2024-12-19  
**Version**: 1.0.0  
**Total Endpoints**: 58

