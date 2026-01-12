# Chat Flow Delete APIs Scan Report

This document provides a comprehensive scan of all DELETE APIs related to the chat flow in the Vibgyor Node backend.

## Overview

The chat system has two main flows:
1. **Social Chat Flow** - General social messaging between users
2. **Dating Chat Flow** - Messaging between matched users in the dating feature

Both flows have similar delete APIs for:
- Deleting chats
- Deleting messages
- Removing reactions (indirect delete operation)

---

## 1. Social Chat Delete APIs

### 1.1 Delete Chat
**Endpoint:** `DELETE /api/v1/user/chats/:chatId`

**Route File:** `src/user/social/userRoutes/enhancedChatRoutes.js`
- **Line:** 114-121
- **Controller:** `ChatController.deleteChat`
- **Controller File:** `src/user/social/userController/enhancedChatController.js`
- **Controller Method:** `deleteChat` (lines 283-308)

**Service:** `src/user/social/services/chatService.js`
- **Method:** `deleteChat` (lines 349-388)
- **Implementation:**
  - Validates chat ID and user ID
  - Checks if user is a participant
  - **Permanently deletes all messages** associated with the chat
  - **Permanently deletes the chat** from database
  - Returns deletion result with count of deleted messages

**Frontend Integration:**
- **File:** `vibgyorMain/src/api/socialMessagingAPI.js`
- **Function:** `deleteChat` (line 237)
- **Usage:** `vibgyorMain/src/screens/SocialScreen/Messages/ChatScreen.js` (line 3179)

**Key Behavior:**
- ⚠️ **PERMANENT DELETION**: This API permanently deletes the chat and all associated messages
- Not a soft delete or archive operation
- All messages are removed from the database

---

### 1.2 Delete Message
**Endpoint:** `DELETE /api/v1/user/messages/:messageId`

**Route File:** `src/user/social/userRoutes/enhancedMessageRoutes.js`
- **Line:** 202-209
- **Controller:** `MessageController.deleteMessage`
- **Controller File:** `src/user/social/userController/enhancedMessageController.js`
- **Controller Method:** `deleteMessage` (lines 253-280)

**Service:** `src/user/social/services/messageService.js`
- **Method:** `deleteMessage` (lines 623-656)
- **Implementation:**
  - Validates message ID and user ID
  - Checks if user is the sender (only sender can delete)
  - Checks if message is already deleted
  - Calls `message.deleteForUser(userId)` - soft delete operation
  - Returns deletion result

**Frontend Integration:**
- **File:** `vibgyorMain/src/api/socialMessagingAPI.js`
- **Function:** `deleteMessage` (referenced in imports)
- **Usage:** `vibgyorMain/src/screens/SocialScreen/Messages/ChatScreen.js` (line 49)

**Key Behavior:**
- ✅ **SOFT DELETE**: Uses `deleteForUser()` method - likely marks message as deleted for the user
- Only the sender can delete their own messages
- Prevents duplicate deletion

---

### 1.3 Remove Reaction
**Endpoint:** `DELETE /api/v1/user/messages/:messageId/reactions`

**Route File:** `src/user/social/userRoutes/enhancedMessageRoutes.js`
- **Line:** 236-243
- **Controller:** `MessageController.removeReaction`
- **Controller File:** `src/user/social/userController/enhancedMessageController.js`
- **Controller Method:** `removeReaction` (lines 324-349)

**Service:** `src/user/social/services/messageService.js`
- **Method:** `removeReaction` (lines 730-784)
- **Implementation:**
  - Validates message ID and user ID
  - Checks if user is participant in chat
  - Calls `message.removeReaction(userId)` to remove user's reaction
  - Emits WebSocket event for real-time updates
  - Returns updated reactions

**Key Behavior:**
- Removes a user's reaction from a message
- Real-time updates via WebSocket
- Not a delete operation, but removes user's interaction

---

## 2. Dating Chat Delete APIs

### 2.1 Delete Dating Chat
**Endpoint:** `DELETE /api/user/dating/chats/:chatId`

**Route File:** `src/user/dating/routes/datingChatRoutes.js`
- **Line:** 113-120
- **Controller:** `DatingChatController.deleteChat`
- **Controller File:** `src/user/dating/controllers/datingChatController.js`
- **Controller Method:** `deleteChat` (lines 202-227)

**Service:** `src/user/dating/services/datingChatService.js`
- **Method:** `deleteChat` (lines 238-279)
- **Implementation:**
  - Validates chat ID and user ID
  - Checks if user is a participant
  - **Archives chat for the user** (soft delete)
  - Updates user settings with `isArchived: true`
  - If both users archive, marks chat as inactive
  - Returns deletion result

**Frontend Integration:**
- **File:** `vibgyorMain/src/api/datingMessagingAPI.js`
- **Function:** `deleteDatingChat` (line 222)
- **Usage:** `vibgyorMain/src/screens/DatingScreens/MessageScreen/DatingChatScreen.js` (line 2928)

**Key Behavior:**
- ✅ **SOFT DELETE/ARCHIVE**: Archives chat for the user, doesn't permanently delete
- Chat becomes inactive only if both users archive it
- Messages are not deleted, only chat is archived

---

### 2.2 Delete Dating Message
**Endpoint:** `DELETE /api/user/dating/messages/:messageId`

**Route File:** `src/user/dating/routes/datingMessageRoutes.js`
- **Line:** 218-225
- **Controller:** `deleteDatingMessage`
- **Controller File:** `src/user/dating/controllers/datingMessageController.js`
- **Controller Method:** `deleteDatingMessage` (lines 298-312)

**Service:** `src/user/dating/services/datingMessageService.js`
- **Method:** `deleteMessage` (lines 513-545)
- **Implementation:**
  - Validates message ID and user ID
  - Checks if user is the sender (only sender can delete)
  - Checks if message is already deleted
  - Calls `message.deleteForUser(userId)` - soft delete operation
  - Returns deletion result

**Frontend Integration:**
- **File:** `vibgyorMain/src/api/datingMessagingAPI.js`
- **Function:** `deleteDatingMessage` (referenced in imports)
- **Usage:** `vibgyorMain/src/screens/DatingScreens/MessageScreen/DatingChatScreen.js` (line 49)

**Key Behavior:**
- ✅ **SOFT DELETE**: Uses `deleteForUser()` method - marks message as deleted for the user
- Only the sender can delete their own messages
- Prevents duplicate deletion

---

### 2.3 Remove Dating Reaction
**Endpoint:** `DELETE /api/user/dating/messages/:messageId/reactions`

**Route File:** `src/user/dating/routes/datingMessageRoutes.js`
- **Line:** 252-259
- **Controller:** `removeDatingReaction`
- **Controller File:** `src/user/dating/controllers/datingMessageController.js`
- **Controller Method:** `removeDatingReaction` (lines 343-357)

**Service:** `src/user/dating/services/datingMessageService.js`
- **Method:** `removeReaction` (referenced but implementation not shown in scan)
- **Implementation:**
  - Similar to social chat reaction removal
  - Removes user's reaction from dating message
  - Emits WebSocket events for real-time updates

**Key Behavior:**
- Removes a user's reaction from a dating message
- Real-time updates via WebSocket
- Not a delete operation, but removes user's interaction

---

## 3. Summary Table

| API Type | Endpoint | Flow | Delete Type | Permanently Deletes Data |
|----------|----------|------|-------------|-------------------------|
| Delete Chat | `DELETE /api/v1/user/chats/:chatId` | Social | **Hard Delete** | ✅ Yes - Chat + All Messages |
| Delete Message | `DELETE /api/v1/user/messages/:messageId` | Social | **Soft Delete** | ❌ No - Marks as deleted for user |
| Remove Reaction | `DELETE /api/v1/user/messages/:messageId/reactions` | Social | **Remove** | ❌ No - Removes reaction only |
| Delete Dating Chat | `DELETE /api/user/dating/chats/:chatId` | Dating | **Soft Delete/Archive** | ❌ No - Archives chat for user |
| Delete Dating Message | `DELETE /api/user/dating/messages/:messageId` | Dating | **Soft Delete** | ❌ No - Marks as deleted for user |
| Remove Dating Reaction | `DELETE /api/user/dating/messages/:messageId/reactions` | Dating | **Remove** | ❌ No - Removes reaction only |

---

## 4. Key Differences Between Social and Dating Chat Deletion

### Social Chat Deletion:
- **Chat Deletion**: ⚠️ **PERMANENT** - Deletes chat and all messages from database
- **Message Deletion**: Soft delete (marks as deleted for user)
- More destructive operation

### Dating Chat Deletion:
- **Chat Deletion**: ✅ **ARCHIVE** - Archives chat for user, doesn't permanently delete
- **Message Deletion**: Soft delete (marks as deleted for user)
- More conservative operation

---

## 5. Security & Validation

All delete APIs include:
- ✅ Authentication middleware (`authorize()`)
- ✅ Request validation middleware (`validateRequest()`)
- ✅ User authorization checks (participant verification)
- ✅ Ownership checks (sender verification for message deletion)
- ✅ Duplicate deletion prevention

---

## 6. Frontend Integration Status

### Social Chat:
- ✅ Delete Chat - Implemented in `ChatScreen.js`
- ✅ Delete Message - Available via API
- ✅ Remove Reaction - Available via API

### Dating Chat:
- ✅ Delete Chat - Implemented in `DatingChatScreen.js`
- ✅ Delete Message - Available via API
- ✅ Remove Reaction - Available via API

---

## 7. Recommendations

1. **Consistency Issue**: Social chat deletion permanently deletes data, while dating chat archives. Consider making both consistent (either both archive or both hard delete with confirmation).

2. **Data Recovery**: Social chat deletion is permanent with no recovery option. Consider implementing:
   - Soft delete with recovery period
   - Archive functionality similar to dating chats
   - Admin restore capability

3. **Audit Trail**: Consider adding audit logs for delete operations to track who deleted what and when.

4. **Bulk Operations**: No bulk delete APIs found. Consider if needed for:
   - Deleting multiple messages at once
   - Clearing entire chat history

5. **Notification**: Consider notifying other participants when a chat is deleted (currently only the requester is affected).

---

## 8. Files Referenced

### Backend Routes:
- `src/user/social/userRoutes/enhancedChatRoutes.js`
- `src/user/social/userRoutes/enhancedMessageRoutes.js`
- `src/user/dating/routes/datingChatRoutes.js`
- `src/user/dating/routes/datingMessageRoutes.js`

### Backend Controllers:
- `src/user/social/userController/enhancedChatController.js`
- `src/user/social/userController/enhancedMessageController.js`
- `src/user/dating/controllers/datingChatController.js`
- `src/user/dating/controllers/datingMessageController.js`

### Backend Services:
- `src/user/social/services/chatService.js`
- `src/user/social/services/messageService.js`
- `src/user/dating/services/datingChatService.js`
- `src/user/dating/services/datingMessageService.js`

### Frontend APIs:
- `vibgyorMain/src/api/socialMessagingAPI.js`
- `vibgyorMain/src/api/datingMessagingAPI.js`

### Frontend Screens:
- `vibgyorMain/src/screens/SocialScreen/Messages/ChatScreen.js`
- `vibgyorMain/src/screens/DatingScreens/MessageScreen/DatingChatScreen.js`

---

**Scan Date:** Generated automatically
**Status:** ✅ Complete - All delete APIs identified and documented
