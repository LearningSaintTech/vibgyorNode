# Debug Logs - Social Chat Flow

## 📋 Overview

Comprehensive debug logs have been added to the social chat flow across both frontend and backend to help with debugging and monitoring.

---

## 🔵 FRONTEND (vibgyorMain)

### 1. API Layer (`src/api/socialMessagingAPI.js`)

**Log Prefix:** `[SOCIAL_CHAT_API]`

#### Functions with Debug Logs:
- ✅ `createOrGetChat()` - Logs request, response, and chat details
- ✅ `getUserChats()` - Logs pagination params, response, and chat count
- ✅ `searchChats()` - Logs search query and results
- ✅ `sendMessage()` - Logs message data, file info, and response
- ✅ `getChatMessages()` - Logs chatId, pagination, and message count

**Log Format:**
```javascript
🔵 [SOCIAL_CHAT_API] functionName called: { params }
🔵 [SOCIAL_CHAT_API] Sending REQUEST_TYPE /endpoint
🔵 [SOCIAL_CHAT_API] Response received: { details }
✅ [SOCIAL_CHAT_API] functionName success: { result }
❌ [SOCIAL_CHAT_API] functionName error: { error details }
```

### 2. Socket Service (`src/services/chatSocketService.js`)

**Log Prefix:** `[CHAT_SOCKET]`

#### Functions with Debug Logs:
- ✅ `initialize()` - Logs initialization status
- ✅ `joinChat()` - Logs chatId and connection status
- ✅ `leaveChat()` - Logs chatId
- ✅ `sendMessage()` - Logs message data and socket emission
- ✅ `handleMessage()` - Logs received messages and callback execution
- ✅ `onMessage()` - Logs message events with full details

**Log Format:**
```javascript
🔵 [CHAT_SOCKET] action: { details }
💬 [CHAT_SOCKET] message_received event: { messageData }
✅ [CHAT_SOCKET] action completed: { result }
❌ [CHAT_SOCKET] error: { error details }
```

### 3. Chat Screen (`src/screens/SocialScreen/Messages/ChatScreen.js`)

**Log Prefix:** `[CHAT_SCREEN]`

#### Functions with Debug Logs:
- ✅ `loadMessages()` - Logs chatId, API call, and message transformation
- ✅ `handleSendMessage()` - Logs message sending flow, temp message, API response, socket emission
- ✅ Socket event handlers - Logs message reception, typing indicators, and state updates

**Log Format:**
```javascript
🔵 [CHAT_SCREEN] action: { details }
✅ [CHAT_SCREEN] action completed: { result }
❌ [CHAT_SCREEN] error: { error details }
```

### 4. Messages Screen (`src/screens/SocialScreen/Messages/MessagesScreen.js`)

**Log Prefix:** `[MESSAGES_SCREEN]`

#### Functions with Debug Logs:
- ✅ `fetchChats()` - Logs search query, API calls, and chat transformation
- ✅ `fetchMessageRequests()` - Logs request fetching

**Log Format:**
```javascript
🔵 [MESSAGES_SCREEN] action: { details }
✅ [MESSAGES_SCREEN] action completed: { result }
❌ [MESSAGES_SCREEN] error: { error details }
```

---

## 🟢 BACKEND (vibgyorNode)

### 1. Message Controller (`src/user/social/userController/enhancedMessageController.js`)

**Log Prefix:** `[BACKEND_MSG_CTRL]`

#### Functions with Debug Logs:
- ✅ `sendMessage()` - Logs request data, validation, service call, and response
- ✅ `getChatMessages()` - Logs chatId, userId, pagination, and results

**Log Format:**
```javascript
🔵 [BACKEND_MSG_CTRL] functionName called: { request details }
🔵 [BACKEND_MSG_CTRL] Processing: { step details }
✅ [BACKEND_MSG_CTRL] functionName success: { result }
❌ [BACKEND_MSG_CTRL] functionName error: { error details }
```

### 2. Chat Controller (`src/user/social/userController/enhancedChatController.js`)

**Log Prefix:** `[BACKEND_CHAT_CTRL]`

#### Functions with Debug Logs:
- ✅ `createOrGetChat()` - Logs userId, otherUserId, service call, and result
- ✅ `getUserChats()` - Logs userId, pagination, and chat count

**Log Format:**
```javascript
🔵 [BACKEND_CHAT_CTRL] functionName called: { request details }
🔵 [BACKEND_CHAT_CTRL] Calling service: { params }
✅ [BACKEND_CHAT_CTRL] functionName success: { result }
❌ [BACKEND_CHAT_CTRL] functionName error: { error details }
```

### 3. Message Service (`src/user/social/services/messageService.js`)

**Log Prefix:** `[BACKEND_MSG_SVC]`

#### Functions with Debug Logs:
- ✅ `sendMessage()` - Logs input validation, chat access, message creation, real-time emission
- ✅ `getChatMessages()` - Logs validation, chat access, message fetching, pagination

**Log Format:**
```javascript
🔵 [BACKEND_MSG_SVC] functionName called: { params }
🔵 [BACKEND_MSG_SVC] Validating: { validation step }
✅ [BACKEND_MSG_SVC] Validation passed: { result }
🔵 [BACKEND_MSG_SVC] Processing: { step }
✅ [BACKEND_MSG_SVC] functionName completed: { result }
❌ [BACKEND_MSG_SVC] functionName error: { error details }
```

### 4. Real-time Service (`src/services/enhancedRealtimeService.js`)

**Log Prefix:** `[REALTIME_SVC]`

#### Events with Debug Logs:
- ✅ `join_chat` - Logs userId, chatId, room joining, message marking, unread reset
- ✅ `new_message` (socket event) - Logs message creation, validation, broadcasting, notifications
- ✅ `emitNewMessage()` - Logs message broadcasting with client count

**Log Format:**
```javascript
🔵 [REALTIME_SVC] eventName received: { event details }
🔵 [REALTIME_SVC] Validating: { validation step }
✅ [REALTIME_SVC] Validation passed
🔵 [REALTIME_SVC] Processing: { step }
✅ [REALTIME_SVC] eventName completed: { result }
❌ [REALTIME_SVC] eventName error: { error details }
```

---

## 📊 Log Categories

### 🔵 Info Logs (Blue Circle)
- Function/event entry points
- Request/response details
- State transitions
- Data transformations

### ✅ Success Logs (Green Checkmark)
- Successful operations
- Completed steps
- Data saved/retrieved

### ⚠️ Warning Logs (Yellow Triangle)
- Missing optional data
- Non-critical issues
- Fallback scenarios

### ❌ Error Logs (Red X)
- Validation failures
- Access denied
- Exceptions and errors
- Stack traces

---

## 🔍 Key Debug Points

### Message Sending Flow
1. **Frontend:** `[CHAT_SCREEN] handleSendMessage called`
2. **Frontend:** `[SOCIAL_CHAT_API] sendMessage called`
3. **Backend:** `[BACKEND_MSG_CTRL] sendMessage called`
4. **Backend:** `[BACKEND_MSG_SVC] sendMessage called`
5. **Backend:** `[BACKEND_MSG_SVC] Real-time message emitted`
6. **Backend:** `[REALTIME_SVC] emitNewMessage called`
7. **Frontend:** `[CHAT_SOCKET] message_received event`
8. **Frontend:** `[CHAT_SCREEN] handleNewMessage received`

### Chat Loading Flow
1. **Frontend:** `[MESSAGES_SCREEN] fetchChats called`
2. **Frontend:** `[SOCIAL_CHAT_API] getUserChats called`
3. **Backend:** `[BACKEND_CHAT_CTRL] getUserChats called`
4. **Backend:** `[BACKEND_CHAT_SVC] getUserChats called`
5. **Frontend:** `[MESSAGES_SCREEN] Chats set in state`

### Socket Connection Flow
1. **Frontend:** `[CHAT_SCREEN] Initializing Socket.IO for chat`
2. **Frontend:** `[CHAT_SOCKET] joinChat called`
3. **Backend:** `[REALTIME_SVC] join_chat event received`
4. **Backend:** `[REALTIME_SVC] User joined social chat room`
5. **Frontend:** `[CHAT_SOCKET] Chat joined confirmation`

---

## 📝 Log Data Included

### Request Logs Include:
- User IDs
- Chat IDs
- Message IDs
- Timestamps
- Request parameters
- File information (if applicable)

### Response Logs Include:
- Success status
- Data counts
- Error messages
- Pagination info
- Transformation results

### Socket Logs Include:
- Event types
- Room names
- Client counts
- Message data
- User information

---

## 🎯 Benefits

1. **End-to-End Tracing:** Follow a message from frontend to backend and back
2. **Error Identification:** Quickly identify where failures occur
3. **Performance Monitoring:** Track API call times and socket events
4. **State Debugging:** See state changes in real-time
5. **Flow Understanding:** Understand the complete message flow

---

## 🔧 Usage

### Enable Debug Logs
All logs are enabled by default. They use `console.log`, `console.warn`, and `console.error`.

### Filter Logs
Use log prefixes to filter:
- `[SOCIAL_CHAT_API]` - API calls
- `[CHAT_SOCKET]` - Socket events
- `[CHAT_SCREEN]` - Chat screen actions
- `[MESSAGES_SCREEN]` - Messages screen actions
- `[BACKEND_MSG_CTRL]` - Backend message controller
- `[BACKEND_CHAT_CTRL]` - Backend chat controller
- `[BACKEND_MSG_SVC]` - Backend message service
- `[REALTIME_SVC]` - Real-time service

### Example Filter Commands

**Frontend (React Native):**
```bash
# Filter API logs
adb logcat | grep "SOCIAL_CHAT_API"

# Filter socket logs
adb logcat | grep "CHAT_SOCKET"

# Filter chat screen logs
adb logcat | grep "CHAT_SCREEN"
```

**Backend (Node.js):**
```bash
# Filter all social chat logs
npm start | grep "SOCIAL_CHAT\|CHAT_SOCKET\|CHAT_SCREEN\|BACKEND_MSG\|BACKEND_CHAT\|REALTIME_SVC"

# Filter only errors
npm start | grep "❌"
```

---

## 📋 Files Modified

### Frontend
- ✅ `vibgyorMain/src/api/socialMessagingAPI.js`
- ✅ `vibgyorMain/src/services/chatSocketService.js`
- ✅ `vibgyorMain/src/screens/SocialScreen/Messages/ChatScreen.js`
- ✅ `vibgyorMain/src/screens/SocialScreen/Messages/MessagesScreen.js`

### Backend
- ✅ `vibgyorNode/src/user/social/userController/enhancedMessageController.js`
- ✅ `vibgyorNode/src/user/social/userController/enhancedChatController.js`
- ✅ `vibgyorNode/src/user/social/services/messageService.js`
- ✅ `vibgyorNode/src/services/enhancedRealtimeService.js`

---

## ✅ Status

All debug logs have been successfully added to the social chat flow. The logs provide comprehensive coverage of:
- API requests and responses
- Socket.IO events
- State management
- Error handling
- Real-time message flow

**Date:** 2024-12-19
**Status:** ✅ Complete

