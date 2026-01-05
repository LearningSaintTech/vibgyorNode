# Complete Chat Flow Scan - VibgyorNode Backend

## Overview
This document provides a comprehensive scan of the complete chat messaging flow in the VibgyorNode backend. The system implements a full-featured real-time messaging platform with Socket.IO integration, message requests, media support, and comprehensive state management.

**Last Updated:** 2024
**Scope:** Backend (vibgyorNode) - Social Chat Flow

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Route Structure](#route-structure)
3. [Controller Layer](#controller-layer)
4. [Service Layer](#service-layer)
5. [Model Layer](#model-layer)
6. [Real-time Service (Socket.IO)](#real-time-service-socketio)
7. [Message Request Flow](#message-request-flow)
8. [Chat Creation Flow](#chat-creation-flow)
9. [Message Sending Flow](#message-sending-flow)
10. [Message Retrieval Flow](#message-retrieval-flow)
11. [Real-time Events](#real-time-events)
12. [Key Features](#key-features)
13. [Data Flow Diagrams](#data-flow-diagrams)
14. [API Endpoints Summary](#api-endpoints-summary)

---

## Architecture Overview

### System Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                    Client (Frontend)                        │
│  - React Native App                                         │
│  - Socket.IO Client                                         │
│  - HTTP API Client                                          │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ HTTP REST API + WebSocket (Socket.IO)
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                  Express Server (app.js)                    │
│  - Routes                                                    │
│  - Middleware (Auth, Validation, Upload)                    │
│  - Socket.IO Server                                         │
└─────────────────────┬───────────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
┌───────▼────┐ ┌──────▼─────┐ ┌────▼──────────┐
│ Controller │ │  Service   │ │  Real-time    │
│   Layer    │ │   Layer    │ │   Service     │
│            │ │            │ │ (Socket.IO)   │
└───────┬────┘ └──────┬─────┘ └────┬──────────┘
        │             │             │
        └─────────────┼─────────────┘
                      │
              ┌───────▼────────┐
              │   Model Layer  │
              │  - Chat Model  │
              │  - Message     │
              │  - User        │
              │  - MessageReq  │
              └───────┬────────┘
                      │
              ┌───────▼────────┐
              │   MongoDB      │
              └────────────────┘
```

### Key Components

1. **Routes** (`/src/user/social/userRoutes/`)
   - `enhancedChatRoutes.js` - Chat management endpoints
   - `enhancedMessageRoutes.js` - Message endpoints
   - `userMessageRequestRoutes.js` - Message request endpoints

2. **Controllers** (`/src/user/social/userController/`)
   - `enhancedChatController.js` - Chat business logic
   - `enhancedMessageController.js` - Message business logic
   - `messageRequestController.js` - Message request logic

3. **Services** (`/src/user/social/services/`)
   - `chatService.js` - Chat operations
   - `messageService.js` - Message operations

4. **Models** (`/src/user/social/userModel/`)
   - `chatModel.js` - Chat schema and methods
   - `messageModel.js` - Message schema and methods
   - `messageRequestModel.js` - Message request schema

5. **Real-time Service** (`/src/services/enhancedRealtimeService.js`)
   - Socket.IO server setup
   - Real-time event handlers
   - Room management

---

## Route Structure

### Chat Routes (`/api/v1/user/chats`)

| Method | Endpoint | Description | Controller Method |
|--------|----------|-------------|-------------------|
| POST | `/` | Create or get chat | `createOrGetChat` |
| GET | `/` | Get user's chats (with search) | `getUserChats` |
| GET | `/search` | Search chats (deprecated) | `searchChats` |
| GET | `/stats` | Get chat statistics | `getChatStats` |
| GET | `/:chatId` | Get chat details | `getChatDetails` |
| PUT | `/:chatId/settings` | Update chat settings | `updateChatSettings` |
| DELETE | `/:chatId` | Delete/archive chat | `deleteChat` |
| POST | `/:chatId/join` | Join chat room | `joinChat` |
| POST | `/:chatId/leave` | Leave chat room | `leaveChat` |

### Message Routes (`/api/v1/user/messages`)

| Method | Endpoint | Description | Controller Method |
|--------|----------|-------------|-------------------|
| POST | `/` | Send message | `sendMessage` |
| GET | `/chat/:chatId` | Get chat messages | `getChatMessages` |
| PUT | `/chat/:chatId/read` | Mark messages as read | `markMessagesAsRead` |
| GET | `/chat/:chatId/media` | Get media messages | `getChatMedia` |
| GET | `/chat/:chatId/search` | Search messages | `searchMessages` |
| GET | `/:messageId` | Get message details | `getMessageDetails` |
| PUT | `/:messageId` | Edit message | `editMessage` |
| DELETE | `/:messageId` | Delete message | `deleteMessage` |
| PUT | `/:messageId/view` | Mark one-view as viewed | `markOneViewAsViewed` |
| POST | `/:messageId/reactions` | Add reaction | `reactToMessage` |
| DELETE | `/:messageId/reactions` | Remove reaction | `removeReaction` |
| POST | `/:messageId/forward` | Forward message | `forwardMessage` |

### Message Request Routes (`/user/message-requests`)

| Method | Endpoint | Description | Controller Method |
|--------|----------|-------------|-------------------|
| POST | `/:userId` | Send message request | `sendMessageRequest` |
| GET | `/pending` | Get pending requests | `getPendingRequests` |
| GET | `/sent` | Get sent requests | `getSentRequests` |
| PUT | `/:requestId/accept` | Accept request | `acceptMessageRequest` |
| PUT | `/:requestId/reject` | Reject request | `rejectMessageRequest` |
| DELETE | `/:requestId` | Delete request | `deleteMessageRequest` |
| GET | `/:requestId` | Get request details | `getMessageRequestDetails` |
| GET | `/stats` | Get request stats | `getMessageRequestStats` |
| GET | `/between/:userId` | Get request between users | `getRequestBetweenUsers` |

---

## Controller Layer

### Chat Controller (`enhancedChatController.js`)

#### Key Methods:

1. **createOrGetChat**
   - Creates or retrieves existing chat between two users
   - Validates user permissions
   - Checks message request status
   - Returns chat with unread count

2. **getUserChats**
   - Gets user's active chats with pagination
   - Supports search via query parameter (`q` or `search`)
   - Filters archived chats
   - Sorts by pinned first, then last message time
   - Returns enhanced chat data with participant info

3. **getChatDetails**
   - Gets detailed chat information
   - Includes participant details
   - Returns user-specific settings (archive, pin, mute)
   - Includes unread count

4. **updateChatSettings**
   - Updates chat settings: archive, pin, mute
   - User-specific settings (per participant)

5. **deleteChat**
   - Archives chat for user
   - If all participants archive, marks chat as inactive

6. **searchChats**
   - Searches chats by participant name (username/fullName)
   - Filters archived chats
   - Returns paginated results

### Message Controller (`enhancedMessageController.js`)

#### Key Methods:

1. **sendMessage**
   - Sends text or media message
   - Handles file uploads (images, videos, audio, documents, voice, GIFs)
   - Supports location messages
   - Supports one-view messages
   - Supports reply-to and forwarded messages
   - Updates chat's last message
   - Increments unread counts
   - Emits real-time event

2. **getChatMessages**
   - Retrieves messages with pagination
   - Excludes deleted messages (user-specific)
   - Supports reverse chronological order
   - Includes sender, reply-to, forwarded-from data

3. **markMessagesAsRead**
   - Marks all unread messages in chat as read
   - Resets unread count
   - Updates read receipts

4. **editMessage**
   - Edits message content (24-hour limit)
   - Only sender can edit
   - Maintains edit history
   - Emits update event

5. **deleteMessage**
   - Deletes message for user
   - Soft delete (marks as deleted, doesn't remove)
   - If sender deletes or all participants delete, marks as deleted

6. **reactToMessage**
   - Adds emoji reaction to message
   - One reaction per user (replaces existing)
   - Emits reaction event

7. **forwardMessage**
   - Forwards message to another chat
   - Validates access to both chats
   - Creates new message with forwarded reference

8. **searchMessages**
   - Searches messages in a chat
   - Text search in message content
   - Returns paginated results

9. **getChatMedia**
   - Gets media messages (images, videos, audio, etc.)
   - Optional type filter
   - Paginated results

10. **markOneViewAsViewed**
    - Marks one-view message as viewed
    - Tracks viewer information
    - Handles expiration

---

## Service Layer

### Chat Service (`chatService.js`)

#### Key Methods:

1. **createOrGetChat(userId1, userId2, createdBy)**
   - Validates users exist and are active
   - Checks if users can chat (permissions)
   - Uses `Chat.findOrCreateChat()` to find or create chat
   - Returns chat with unread count and canChat status

2. **getUserChats(userId, page, limit)**
   - Calls `Chat.getUserChats()` for database query
   - Enhances chats with user settings
   - Filters archived chats
   - Adds other participant info
   - Sorts by pinned first, then last message time

3. **getChatDetails(chatId, userId)**
   - Validates chat access
   - Populates participant details
   - Gets unread count
   - Returns user settings and other participant

4. **searchChats(userId, query, page, limit)**
   - Finds chats for user
   - Filters by participant name match (username/fullName)
   - Filters archived chats
   - Enhances and sorts results
   - Returns paginated results

5. **updateChatSettings(chatId, userId, settings)**
   - Updates user-specific settings (archive, pin, mute)
   - Uses `chat.updateUserSettings()` method

6. **deleteChat(chatId, userId)**
   - Archives chat for user
   - If all participants archive, marks chat as inactive

### Message Service (`messageService.js`)

#### Key Methods:

1. **sendMessage(messageData, file)**
   - Validates message data
   - Validates chat access
   - Handles file upload to S3 (if media message)
   - Creates message document
   - Updates chat (last message, unread counts)
   - Emits real-time event via `enhancedRealtimeService.emitNewMessage()`
   - Returns created message

2. **getChatMessages(chatId, userId, page, limit)**
   - Validates chat access
   - Calls `Message.getChatMessages()` for database query
   - Returns paginated messages

3. **markMessagesAsRead(chatId, userId)**
   - Calls `Message.markChatAsRead()` to update read receipts
   - Resets unread count in chat
   - Returns read count

4. **editMessage(messageId, userId, newContent)**
   - Validates ownership (only sender can edit)
   - Validates 24-hour edit window
   - Calls `message.editMessage()` method
   - Emits update event
   - Returns updated message

5. **deleteMessage(messageId, userId)**
   - Validates ownership (only sender can delete)
   - Calls `message.deleteForUser()` method
   - Returns deletion result

6. **reactToMessage(messageId, userId, emoji)**
   - Validates chat access
   - Calls `message.addReaction()` method
   - Emits reaction event
   - Returns updated reactions

7. **forwardMessage(messageId, targetChatId, userId)**
   - Validates access to both chats
   - Creates forwarded message
   - Updates target chat
   - Emits real-time event

8. **searchMessages(chatId, userId, query, page, limit)**
   - Validates chat access
   - Calls `Message.searchMessages()` for database query
   - Returns paginated results

9. **getChatMedia(chatId, userId, type, page, limit)**
   - Validates chat access
   - Calls `Message.getChatMedia()` for database query
   - Returns media messages

10. **markOneViewAsViewed(messageId, userId)**
    - Validates message is one-view type
    - Adds viewer to viewedBy array
    - Checks expiration
    - Returns updated message

---

## Model Layer

### Chat Model (`chatModel.js`)

#### Schema Structure:
```javascript
{
  participants: [ObjectId], // Array of user IDs
  chatType: String, // 'direct' or 'group' (default: 'direct')
  isActive: Boolean, // Chat active status
  lastMessage: ObjectId, // Reference to last message
  lastMessageAt: Date, // Timestamp of last message
  userSettings: [{ // Per-user settings
    userId: ObjectId,
    isArchived: Boolean,
    isPinned: Boolean,
    isMuted: Boolean,
    unreadCount: Number,
    lastReadAt: Date,
    archivedAt: Date,
    pinnedAt: Date,
    mutedAt: Date
  }],
  activeCall: { // Active call tracking
    callId: String,
    type: String, // 'audio' or 'video'
    status: String, // 'initiating', 'ringing', 'connected', 'ended'
    startedAt: Date
  },
  createdAt: Date,
  updatedAt: Date
}
```

#### Static Methods:

1. **findOrCreateChat(userId1, userId2, createdBy)**
   - Finds existing chat or creates new one
   - Ensures exactly 2 participants for direct chat
   - Creates userSettings for both participants

2. **getUserChats(userId, page, limit)**
   - Finds active chats for user
   - Populates participants and lastMessage
   - Sorts by lastMessageAt (descending)
   - Filters archived chats
   - Returns paginated results

3. **canUsersChat(userId1, userId2)**
   - Checks if users can chat
   - Validates users exist and are active
   - Checks for existing chat
   - Checks for accepted message request
   - Returns `{ canChat: Boolean, reason: String }`

#### Instance Methods:

1. **updateUserSettings(userId, updates)**
   - Updates user-specific settings
   - Handles timestamp fields

2. **getUserSettings(userId)**
   - Gets user-specific settings or defaults

3. **incrementUnreadCount(userId)**
   - Increments unread count for user

4. **resetUnreadCount(userId)**
   - Resets unread count to 0
   - Updates lastReadAt

5. **setActiveCall(callData)**
   - Sets active call information

6. **clearActiveCall()**
   - Clears active call information

### Message Model (`messageModel.js`)

#### Schema Structure:
```javascript
{
  chatId: ObjectId, // Reference to chat
  senderId: ObjectId, // Reference to sender user
  type: String, // 'text', 'audio', 'video', 'image', 'document', 'gif', 'location', 'voice', 'system', 'forwarded'
  content: String, // Message text content (required for text/system)
  media: { // Media properties (required for media messages)
    url: String, // S3 URL
    mimeType: String,
    fileName: String,
    fileSize: Number,
    duration: Number, // For audio/video/voice (in seconds)
    thumbnail: String, // For video/image thumbnails
    dimensions: { width: Number, height: Number }, // For images/videos
    isAnimated: Boolean, // For GIFs
    gifSource: String, // 'upload', 'giphy', 'tenor'
    gifId: String // External GIF ID
  },
  location: { // For location messages
    latitude: Number,
    longitude: Number,
    address: String,
    name: String,
    placeType: String
  },
  musicMetadata: { // For audio/music files
    title: String,
    artist: String,
    album: String,
    duration: Number,
    genre: String
  },
  replyTo: ObjectId, // Reference to replied message
  forwardedFrom: ObjectId, // Reference to forwarded message
  status: String, // 'sending', 'sent', 'delivered', 'read', 'failed'
  readBy: [{ // Read receipts
    userId: ObjectId,
    readAt: Date
  }],
  reactions: [{ // Message reactions
    userId: ObjectId,
    emoji: String,
    createdAt: Date
  }],
  editedAt: Date, // Edit timestamp
  editHistory: [{ // Edit history (last 10)
    content: String,
    editedAt: Date
  }],
  isDeleted: Boolean, // Deletion flag
  deletedBy: [{ // Per-user deletion tracking
    userId: ObjectId,
    deletedAt: Date
  }],
  isOneView: Boolean, // One-view/disappearing message flag
  oneViewExpiresAt: Date, // Expiration time
  viewedBy: [{ // One-view viewers
    userId: ObjectId,
    viewedAt: Date
  }],
  createdAt: Date,
  updatedAt: Date
}
```

#### Static Methods:

1. **getChatMessages(chatId, page, limit, userId)**
   - Finds messages in chat
   - Excludes deleted messages (user-specific)
   - Populates sender, replyTo, forwardedFrom, reactions
   - Sorts by createdAt (descending, then reversed)
   - Returns paginated results

2. **getUnreadCount(chatId, userId)**
   - Counts unread messages for user
   - Excludes sender's messages
   - Excludes already read messages
   - Excludes deleted messages

3. **markChatAsRead(chatId, userId)**
   - Marks all unread messages as read
   - Adds userId to readBy array
   - Updates status to 'read'
   - Returns modified count

4. **searchMessages(chatId, query, userId, page, limit)**
   - Searches messages by content (regex)
   - Excludes deleted messages
   - Returns paginated results

5. **getChatMedia(chatId, type, userId, page, limit)**
   - Gets media messages (optional type filter)
   - Excludes deleted messages
   - Returns paginated results

#### Instance Methods:

1. **editMessage(newContent)**
   - Validates 24-hour edit window
   - Stores edit history (max 10)
   - Updates content and editedAt
   - Saves message

2. **deleteForUser(userId)**
   - Adds user to deletedBy array
   - If sender deletes or all participants delete, marks isDeleted=true
   - Saves message

3. **addReaction(userId, emoji)**
   - Removes existing reaction from user (if any)
   - Adds new reaction
   - Saves message

4. **removeReaction(userId)**
   - Removes user's reaction
   - Saves message

5. **markAsRead(userId)**
   - Adds user to readBy array (if not already)
   - Updates status to 'delivered'
   - Saves message

---

## Real-time Service (Socket.IO)

### Service File: `enhancedRealtimeService.js`

#### Initialization:
- Initialized in `app.js` after server creation
- Singleton pattern
- Configures CORS, transports, ping settings

#### Authentication:
- Token-based authentication via middleware
- Supports expired tokens (allows connection but emits warning)
- Stores userId and user info in socket object

#### Connection Management:
- Tracks connected users (Map: userId → Set of socketIds)
- Supports multiple connections per user (multiple devices/tabs)
- User rooms: `user:${userId}` (personal room for each user)
- Chat rooms: `chat:${chatId}` (room for each chat)

#### Chat Events:

1. **join_chat (Social Chat)**
   - Event: `join_chat`
   - Validates chat access
   - Joins room: `chat:${chatId}`
   - Marks messages as read
   - Resets unread count
   - Emits: `chat_joined`, `user_joined_chat` (to others)

2. **leave_chat (Social Chat)**
   - Event: `leave_chat`
   - Leaves room: `chat:${chatId}`
   - Emits: `user_left_chat` (to others)

3. **new_message (Social Chat)**
   - Event: `new_message`
   - Validates chat access
   - Checks for duplicate messages (5-second window)
   - Creates message in database
   - Updates chat (last message, unread counts)
   - Broadcasts to room: `chat:${chatId}`
   - Emits: `message_received`, `message_status_update`, `new_message_notification`

4. **typing_start / typing_stop**
   - Events: `typing_start`, `typing_stop`
   - Broadcasts typing indicators to chat room
   - Emits: `user_typing`

#### Real-time Broadcasting:

1. **emitNewMessage(chatId, messageData)**
   - Called from MessageService after message creation
   - Broadcasts to room: `chat:${chatId}`
   - Emits: `message_received`

2. **emitToUser(userId, event, data)**
   - Emits to user's personal room
   - All user's connections receive event

3. **emitToChat(chatId, event, data)**
   - Emits to chat room
   - All participants in chat receive event

#### User Presence:
- Tracks online/offline status
- Updates UserStatus model
- Emits: `user_online`, `user_offline`
- Only marks offline when ALL connections are closed

#### Disconnection Handling:
- Removes socket from user's connection set
- Only marks offline if no connections remain
- Cleans up active calls
- Emits offline status to other users

---

## Message Request Flow

### Purpose:
Message requests allow users to initiate conversations with users they don't follow or who don't follow them back. This prevents spam and unwanted messages.

### Flow:

1. **Send Request**
   ```
   POST /user/message-requests/:userId
   Body: { message: "Optional message" }
   ```
   - Validates users exist and are active
   - Checks if users can already chat (mutual follow)
   - Checks for existing chat
   - Creates MessageRequest document
   - Status: 'pending'
   - Expires after configured time (default: 7 days)

2. **Accept Request**
   ```
   PUT /user/message-requests/:requestId/accept
   Body: { responseMessage: "Optional response" }
   ```
   - Validates request is pending and not expired
   - Creates Chat between users
   - Updates MessageRequest status to 'accepted'
   - Users can now chat freely

3. **Reject Request**
   ```
   PUT /user/message-requests/:requestId/reject
   Body: { responseMessage: "Optional response" }
   ```
   - Validates request is pending
   - Updates MessageRequest status to 'rejected'
   - No chat is created

4. **Delete Request**
   ```
   DELETE /user/message-requests/:requestId
   ```
   - Only sender can delete
   - Only if status is 'pending'
   - Removes MessageRequest document

### Permission Check:
- `Chat.canUsersChat()` checks for:
  1. Existing active chat → `canChat: true, reason: 'existing_chat'`
  2. Accepted message request → `canChat: true, reason: 'accepted_request'`
  3. No permission → `canChat: false, reason: 'no_permission'`

---

## Chat Creation Flow

### Scenario 1: Users Can Already Chat (Mutual Follow/Accepted Request)

```
1. Client: POST /api/v1/user/chats
   Body: { otherUserId: "..." }
   
2. Controller: createOrGetChat()
   - Validates otherUserId
   
3. Service: ChatService.createOrGetChat()
   - Validates users exist and are active
   - Calls Chat.canUsersChat() → returns canChat: true
   - Calls Chat.findOrCreateChat()
   
4. Model: Chat.findOrCreateChat()
   - Searches for existing chat
   - If found, returns it
   - If not found, creates new chat
   - Creates userSettings for both participants
   
5. Service: Returns chat with unread count
   
6. Controller: Returns chat to client
```

### Scenario 2: Users Cannot Chat (No Permission)

```
1. Client: POST /api/v1/user/chats
   Body: { otherUserId: "..." }
   
2. Controller: createOrGetChat()
   
3. Service: ChatService.createOrGetChat()
   - Calls Chat.canUsersChat() → returns canChat: false, reason: 'no_permission'
   - Checks for existing message request
   - Throws error: "Cannot start chat. Send a message request first."
   
4. Controller: Returns 400 error
```

---

## Message Sending Flow

### Complete Flow:

```
1. Client: POST /api/v1/user/messages
   Body: {
     chatId: "...",
     type: "text",
     content: "Hello",
     replyTo: "...", // optional
     forwardedFrom: "...", // optional
     isOneView: false, // optional
     location: {...}, // for location messages
     gifSource: "...", // for GIFs
     musicMetadata: {...} // for audio files
   }
   File: (for media messages)
   
2. Middleware: uploadSingle (multer)
   - Handles file upload (if present)
   - Attaches file to req.file
   
3. Controller: MessageController.sendMessage()
   - Validates chatId, type, content
   - Validates file (for media messages)
   - Validates location (for location messages)
   - Prepares messageData object
   
4. Service: MessageService.sendMessage()
   - Validates chat access
   - If media message:
     a. Validates file size and type
     b. Uploads to S3 via uploadBuffer()
     c. Creates mediaData object
     d. Adds duration (for audio/video/voice)
     e. Adds dimensions (for images/videos)
   - If location message:
     a. Validates location data
     b. Creates locationData object
   - Validates replyTo message (if provided)
   - Validates forwardedFrom message (if provided)
   - Handles one-view expiration
   - Creates Message document
   - Saves message
   - Populates sender, replyTo, forwardedFrom
   
5. Chat Update:
   - Updates chat.lastMessage = message._id
   - Updates chat.lastMessageAt = new Date()
   - Increments unread count for all participants (except sender)
   - Saves chat
   
6. Real-time Event:
   - Calls enhancedRealtimeService.emitNewMessage()
   - Broadcasts to room: chat:${chatId}
   - Emits: message_received
   - Emits: message_status_update (delivered status to sender)
   
7. Controller: Returns created message to client
```

### Media Upload Process:

1. **File Validation**
   - Checks file size (based on type)
   - Checks MIME type
   - Normalizes MIME type (jpg → jpeg)

2. **S3 Upload**
   - Category: 'messages'
   - Type: 'voice', 'music', or message type
   - Filename: `${Date.now()}-${originalname}`
   - Returns S3 URL

3. **Media Data Structure**
   ```javascript
   {
     url: String, // S3 URL
     mimeType: String,
     fileName: String,
     fileSize: Number,
     duration: Number, // For audio/video/voice
     dimensions: { width, height }, // For images/videos
     isAnimated: Boolean, // For GIFs
     gifSource: String, // For GIFs
     gifId: String // For external GIFs
   }
   ```

---

## Message Retrieval Flow

```
1. Client: GET /api/v1/user/messages/chat/:chatId?page=1&limit=50
   
2. Controller: MessageController.getChatMessages()
   - Validates chatId
   - Gets page and limit from query
   
3. Service: MessageService.getChatMessages()
   - Validates chat access
   - Calls Message.getChatMessages()
   
4. Model: Message.getChatMessages()
   - Builds query:
     - chatId matches
     - isDeleted: false
     - deletedBy.userId not equal to userId (user-specific deletion)
   - Populates: senderId, replyTo, forwardedFrom, reactions.userId
   - Sorts by createdAt (descending)
   - Applies pagination (skip, limit)
   - Reverses array (chronological order)
   
5. Service: Returns messages with pagination info
   
6. Controller: Returns messages to client
```

### Deletion Handling:
- Messages are soft-deleted (isDeleted flag)
- Per-user deletion tracking (deletedBy array)
- When querying, excludes messages deleted by the user
- If sender deletes or all participants delete, message is marked as deleted

---

## Real-time Events

### Client → Server Events:

| Event | Description | Data |
|-------|-------------|------|
| `join_chat` | Join social chat room | `chatId` |
| `leave_chat` | Leave social chat room | `chatId` |
| `new_message` | Send message via socket | `{ chatId, content, type, ... }` |
| `typing_start` | Start typing indicator | `{ chatId }` |
| `typing_stop` | Stop typing indicator | `{ chatId }` |

### Server → Client Events:

| Event | Description | Data |
|-------|-------------|------|
| `connection_success` | Connection established | `{ userId, socketId, totalConnections }` |
| `chat_joined` | Joined chat room | `{ chatId, timestamp }` |
| `user_joined_chat` | User joined chat (to others) | `{ userId, username, chatId, timestamp }` |
| `user_left_chat` | User left chat (to others) | `{ userId, username, chatId, timestamp }` |
| `message_received` | New message received | Full message object |
| `user_typing` | Typing indicator | `{ userId, username, chatId, isTyping, timestamp }` |
| `message_status_update` | Message status changed | `{ messageId, chatId, status, timestamp }` |
| `new_message_notification` | New message notification | `{ chatId, messageId, sender, content, type, timestamp }` |
| `message_update` | Message edited | `{ messageId, chatId, content, editedAt }` |
| `message_reaction` | Reaction added/removed | `{ messageId, chatId, reactions }` |
| `user_online` | User came online | `{ userId, username, timestamp }` |
| `user_offline` | User went offline | `{ userId, username, timestamp }` |
| `error` | Error occurred | `{ message }` |

### Room Structure:
- **User Rooms:** `user:${userId}` - Personal room for each user (all their connections)
- **Chat Rooms:** `chat:${chatId}` - Room for each chat (all participants)

---

## Key Features

### 1. Message Types
- ✅ Text messages
- ✅ Image messages (with dimensions, thumbnails)
- ✅ Video messages (with duration, dimensions, thumbnails)
- ✅ Audio/Music messages (with duration, metadata)
- ✅ Voice messages (with duration)
- ✅ Document messages
- ✅ GIF messages (upload or external: Giphy, Tenor)
- ✅ Location messages (latitude, longitude, address, name, placeType)
- ✅ System messages
- ✅ Forwarded messages

### 2. Message Features
- ✅ Reply to messages
- ✅ Forward messages
- ✅ Edit messages (24-hour window, edit history)
- ✅ Delete messages (per-user soft delete)
- ✅ React to messages (emoji reactions)
- ✅ One-view/disappearing messages (images, videos, GIFs)
- ✅ Read receipts
- ✅ Message status (sending, sent, delivered, read, failed)

### 3. Chat Features
- ✅ Direct chats (1-on-1)
- ✅ Chat settings (archive, pin, mute) - per-user
- ✅ Unread count tracking
- ✅ Last message tracking
- ✅ Chat search (by participant name)
- ✅ Chat statistics

### 4. Real-time Features
- ✅ Real-time message delivery (Socket.IO)
- ✅ Typing indicators
- ✅ Online/offline status
- ✅ Read receipts
- ✅ Message status updates
- ✅ Multiple device support (multiple connections per user)

### 5. Permission System
- ✅ Message requests (for non-followers)
- ✅ Permission validation (canUsersChat)
- ✅ Access control (participant validation)

### 6. Media Handling
- ✅ S3 storage integration
- ✅ File size validation
- ✅ MIME type validation
- ✅ Duration tracking (audio/video/voice)
- ✅ Dimensions tracking (images/videos)
- ✅ Thumbnail support (videos/images)

---

## Data Flow Diagrams

### Message Send Flow:

```
┌──────────┐
│  Client  │
└────┬─────┘
     │ POST /api/v1/user/messages
     │ { chatId, type, content, file? }
     ▼
┌─────────────────┐
│  Upload         │
│  Middleware     │ (if file)
└────┬────────────┘
     │
     ▼
┌─────────────────┐
│  Message        │
│  Controller     │
└────┬────────────┘
     │
     ▼
┌─────────────────┐
│  Message        │
│  Service        │
│  - Validate     │
│  - Upload file  │ (if media)
│  - Create msg   │
└────┬────────────┘
     │
     ├─────────────────┐
     │                 │
     ▼                 ▼
┌──────────┐    ┌──────────────┐
│ Message  │    │ Chat Model   │
│ Model    │    │ - Update     │
│ - Save   │    │   lastMsg    │
└────┬─────┘    │ - Inc unread │
     │          └──────┬───────┘
     │                 │
     └─────────┬───────┘
               │
               ▼
     ┌─────────────────┐
     │ Real-time       │
     │ Service         │
     │ - Emit to room  │
     └────────┬────────┘
              │
              ├──────────────┐
              │              │
              ▼              ▼
     ┌────────────┐  ┌──────────────┐
     │ Chat Room  │  │ User Rooms   │
     │ (all users)│  │ (sender)     │
     └────────────┘  └──────────────┘
```

### Message Receive Flow (Real-time):

```
┌─────────────────┐
│ Socket.IO       │
│ Server          │
│ emitNewMessage  │
└────────┬────────┘
         │
         │ Broadcast to chat:${chatId}
         │
         ▼
┌─────────────────┐
│ Chat Room       │
│ chat:${chatId}  │
└────────┬────────┘
         │
         ├──────────────┬──────────────┐
         │              │              │
         ▼              ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Participant  │ │ Participant  │ │ Participant  │
│ 1 (Client)   │ │ 2 (Client)   │ │ 3 (Client)   │
│              │ │              │ │              │
│ Receives:    │ │ Receives:    │ │ Receives:    │
│ message_     │ │ message_     │ │ message_     │
│ received     │ │ received     │ │ received     │
└──────────────┘ └──────────────┘ └──────────────┘
```

---

## API Endpoints Summary

### Base URLs:
- **Social Chats:** `/api/v1/user/chats`
- **Social Messages:** `/api/v1/user/messages`
- **Message Requests:** `/user/message-requests`

### Authentication:
- All endpoints require JWT token in `Authorization` header
- Format: `Bearer <token>`

### Common Response Format:
```javascript
{
  success: true,
  message: "Operation successful",
  data: { ... },
  meta: { ... }
}
```

### Error Response Format:
```javascript
{
  success: false,
  message: "Error message",
  error: "Detailed error information"
}
```

### Pagination:
- Query parameters: `page` (default: 1), `limit` (default: 20-50)
- Response includes: `{ page, limit, total, hasMore }`

---

## Summary

The VibgyorNode backend implements a comprehensive real-time messaging system with:

✅ **Full-featured messaging** - Text, media, location, voice, GIFs
✅ **Real-time communication** - Socket.IO integration
✅ **Permission system** - Message requests for non-followers
✅ **Advanced features** - Reactions, replies, forwards, edits, one-view
✅ **Media handling** - S3 storage, validation, metadata
✅ **User experience** - Typing indicators, read receipts, online status
✅ **Scalability** - Pagination, indexing, efficient queries
✅ **Security** - Authentication, authorization, access control

The system is production-ready and supports a wide range of messaging scenarios with proper error handling, validation, and real-time updates.

