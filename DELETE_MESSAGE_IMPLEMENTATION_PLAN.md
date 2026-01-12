# Delete Message Implementation Plan

## Overview
This document outlines the phased implementation plan to bring delete message functionality to WhatsApp parity, including "Delete for Me" vs "Delete for Everyone" options, time restrictions, and improved UX.

---

## Phase 1: Backend Foundation (Week 1)

### 1.1 Update Message Model
**File**: `vibgyorNode/src/user/social/userModel/messageModel.js`

**Tasks**:
- [ ] Add `deletedForEveryone` field to track deletion type
- [ ] Update `deleteForUser` method to accept `deleteForEveryone` parameter
- [ ] Modify logic to support soft delete even for sender
- [ ] Add helper method `canDeleteForEveryone()` to check time restrictions (1 hour limit)
- [ ] Update message filtering to show "This message was deleted" placeholder

**Code Changes**:
```javascript
// Add to message schema
deletedForEveryone: {
  type: Boolean,
  default: false
},

// Update deleteForUser method
messageSchema.methods.deleteForUser = async function(userId, deleteForEveryone = false) {
  // Check time restriction for "Delete for Everyone"
  if (deleteForEveryone) {
    const messageAge = Date.now() - this.createdAt.getTime();
    const oneHour = 60 * 60 * 1000;
    if (messageAge > oneHour) {
      throw new Error('Cannot delete for everyone: Message is older than 1 hour');
    }
  }
  
  // Soft delete logic
  this.deletedBy.push({
    userId: userId,
    deletedAt: new Date(),
    deletedForEveryone: deleteForEveryone
  });
  
  // Only hard delete if "Delete for Everyone" and sender
  if (deleteForEveryone && this.senderId.toString() === userId.toString()) {
    this.isDeleted = true;
    this.deletedForEveryone = true;
  }
  
  await this.save();
  return this;
};
```

### 1.2 Update Message Service
**File**: `vibgyorNode/src/user/social/services/messageService.js`

**Tasks**:
- [ ] Update `deleteMessage` method to accept `deleteForEveryone` parameter
- [ ] Add validation for time restrictions
- [ ] Add validation for message ownership
- [ ] Update response to include deletion type

**Code Changes**:
```javascript
static async deleteMessage(messageId, userId, deleteForEveryone = false) {
  // Validation
  if (!messageId || !userId) {
    throw new Error('Message ID and User ID are required');
  }
  
  const message = await Message.findById(messageId);
  if (!message) {
    throw new Error('Message not found');
  }
  
  // Check ownership for "Delete for Everyone"
  if (deleteForEveryone && message.senderId.toString() !== userId.toString()) {
    throw new Error('You can only delete your own messages for everyone');
  }
  
  // Check time restriction
  if (deleteForEveryone) {
    const messageAge = Date.now() - message.createdAt.getTime();
    const oneHour = 60 * 60 * 1000;
    if (messageAge > oneHour) {
      throw new Error('Cannot delete for everyone: Message is older than 1 hour');
    }
  }
  
  await message.deleteForUser(userId, deleteForEveryone);
  
  return {
    messageId: message._id,
    isDeleted: message.isDeleted,
    deletedForEveryone: deleteForEveryone
  };
}
```

### 1.3 Update Message Controller
**File**: `vibgyorNode/src/user/social/userController/enhancedMessageController.js`

**Tasks**:
- [ ] Update `deleteMessage` controller to accept `deleteForEveryone` from request body
- [ ] Add proper error handling for time restrictions
- [ ] Update response format

**Code Changes**:
```javascript
static async deleteMessage(req, res) {
  try {
    const { messageId } = req.params;
    const { deleteForEveryone = false } = req.body; // Default to false
    const userId = req.user.userId;
    
    const result = await MessageService.deleteMessage(
      messageId, 
      userId, 
      deleteForEveryone
    );
    
    res.status(200).json(createResponse(
      'Message deleted successfully',
      result,
      { messageId }
    ));
  } catch (error) {
    // Handle time restriction error
    if (error.message.includes('older than 1 hour')) {
      return res.status(400).json(createErrorResponse(error.message));
    }
    // ... other error handling
  }
}
```

### 1.4 Update Message Filtering
**File**: `vibgyorNode/src/user/social/userModel/messageModel.js`

**Tasks**:
- [ ] Update `getChatMessages` to return deleted messages with placeholder
- [ ] Add logic to show "This message was deleted" for deleted messages
- [ ] Filter based on `deletedBy` array and `deletedForEveryone` flag

**Code Changes**:
```javascript
// In getChatMessages, modify query to include deleted messages
// Then transform them to show placeholder
if (message.isDeleted && message.deletedForEveryone) {
  message.content = 'This message was deleted';
  message.type = 'deleted';
  message.media = null;
}
```

### 1.5 Testing
- [ ] Unit tests for message deletion logic
- [ ] Test time restrictions (1 hour limit)
- [ ] Test "Delete for Me" vs "Delete for Everyone"
- [ ] Test message filtering with deleted messages

---

## Phase 2: Frontend API & Components (Week 1-2)

### 2.1 Update Frontend API
**File**: `vibgyorMain/src/api/socialMessagingAPI.js`

**Tasks**:
- [ ] Update `deleteMessage` function to accept `deleteForEveryone` parameter
- [ ] Update function signature and API call

**Code Changes**:
```javascript
export const deleteMessage = async (messageId, deleteForEveryone = false) => {
  try {
    const response = await apiClient.delete(`/api/v1/user/messages/${messageId}`, {
      data: { deleteForEveryone }
    });
    
    if (response.success) {
      return {
        success: true,
        message: response.message || 'Message deleted successfully',
        deletedForEveryone: response.data?.deletedForEveryone || false
      };
    }
    
    return {
      success: false,
      error: response.error || response.message || 'Failed to delete message'
    };
  } catch (error) {
    console.error('❌ SocialMessagingAPI: deleteMessage error:', error);
    return {
      success: false,
      error: error.message || 'Failed to delete message'
    };
  }
};
```

### 2.2 Create Delete Message Dialog Component
**File**: `vibgyorMain/src/components/messages/DeleteMessageDialog.js` (NEW)

**Tasks**:
- [ ] Create reusable dialog component
- [ ] Show appropriate options based on message ownership and age
- [ ] Handle single and multiple message deletion
- [ ] Show time restrictions clearly

**Component Structure**:
```javascript
const DeleteMessageDialog = ({
  visible,
  messages, // Array of selected messages
  onDeleteForMe,
  onDeleteForEveryone,
  onCancel,
  onClose
}) => {
  // Determine available options
  const canDeleteForEveryone = messages.every(msg => 
    msg.isUser && 
    (Date.now() - new Date(msg.createdAt).getTime()) < 3600000
  );
  
  const isOwnMessage = messages.every(msg => msg.isUser);
  const isMultiple = messages.length > 1;
  
  // Render dialog with appropriate options
};
```

### 2.3 Create Deleted Message Placeholder Component
**File**: `vibgyorMain/src/components/messages/DeletedMessageBubble.js` (NEW)

**Tasks**:
- [ ] Create component to show "This message was deleted"
- [ ] Match WhatsApp styling
- [ ] Show for messages deleted "for everyone"

**Component Structure**:
```javascript
const DeletedMessageBubble = ({ isUser, time }) => {
  return (
    <View style={[styles.deletedMessageContainer, isUser ? styles.deletedMessageRight : styles.deletedMessageLeft]}>
      <Text style={styles.deletedMessageText}>This message was deleted</Text>
      <Text style={styles.deletedMessageTime}>{time}</Text>
    </View>
  );
};
```

### 2.4 Testing
- [ ] Test API calls with both deletion types
- [ ] Test dialog component rendering
- [ ] Test placeholder component

---

## Phase 3: ChatScreen Integration (Week 2)

### 3.1 Update Delete Handler
**File**: `vibgyorMain/src/screens/SocialScreen/Messages/ChatScreen.js`

**Tasks**:
- [ ] Update `handleDeleteSelected` to show dialog first
- [ ] Add logic to determine available options
- [ ] Handle both deletion types
- [ ] Update message state after deletion
- [ ] Show deleted message placeholders

**Code Changes**:
```javascript
// Add state for delete dialog
const [showDeleteDialog, setShowDeleteDialog] = useState(false);
const [messagesToDelete, setMessagesToDelete] = useState([]);

// Update handleDeleteSelected
const handleDeleteSelected = useCallback(() => {
  if (selectedMessages.length === 0) return;
  
  const messagesToDelete = messages.filter(msg => 
    selectedMessages.includes(msg.id)
  );
  
  setMessagesToDelete(messagesToDelete);
  setShowDeleteDialog(true);
}, [selectedMessages, messages]);

// New handler for actual deletion
const handleConfirmDelete = useCallback(async (deleteForEveryone) => {
  try {
    const deletePromises = messagesToDelete.map(msg => 
      deleteMessageAPI(msg.id, deleteForEveryone)
    );
    
    await Promise.all(deletePromises);
    
    // Update message state
    if (deleteForEveryone) {
      // Show placeholders for deleted messages
      setMessages(prev => prev.map(msg => {
        if (selectedMessages.includes(msg.id)) {
          return {
            ...msg,
            isDeleted: true,
            content: 'This message was deleted',
            type: 'deleted'
          };
        }
        return msg;
      }));
    } else {
      // Remove from view completely
      setMessages(prev => prev.filter(msg => !selectedMessages.includes(msg.id)));
    }
    
    handleExitSelectionMode();
    setShowDeleteDialog(false);
    
    setSuccessModal({
      visible: true,
      title: 'Success',
      message: `${messagesToDelete.length} message(s) deleted`,
    });
  } catch (error) {
    // Error handling
  }
}, [messagesToDelete, selectedMessages, handleExitSelectionMode]);
```

### 3.2 Update Message Rendering
**File**: `vibgyorMain/src/screens/SocialScreen/Messages/ChatScreen.js`

**Tasks**:
- [ ] Add check for deleted messages in render
- [ ] Show `DeletedMessageBubble` for deleted messages
- [ ] Update all message bubble types to handle deleted state

**Code Changes**:
```javascript
// In renderMessageItem
if (item.isDeleted && item.deletedForEveryone) {
  return (
    <DeletedMessageBubble
      isUser={item.isUser}
      time={formatTime(item.createdAt)}
    />
  );
}

// Otherwise render normal message bubble
```

### 3.3 Add Delete Dialog to UI
**File**: `vibgyorMain/src/screens/SocialScreen/Messages/ChatScreen.js`**

**Tasks**:
- [ ] Import and add `DeleteMessageDialog` component
- [ ] Wire up handlers
- [ ] Position dialog appropriately

**Code Changes**:
```javascript
// In JSX, add dialog
<DeleteMessageDialog
  visible={showDeleteDialog}
  messages={messagesToDelete}
  onDeleteForMe={() => handleConfirmDelete(false)}
  onDeleteForEveryone={() => handleConfirmDelete(true)}
  onCancel={() => setShowDeleteDialog(false)}
  onClose={() => setShowDeleteDialog(false)}
/>
```

### 3.4 Update Selection Header
**File**: `vibgyorMain/src/screens/SocialScreen/Messages/ChatScreen.js`

**Tasks**:
- [ ] Update delete button to show dialog instead of immediate deletion
- [ ] Add visual indicator for time restrictions

**Code Changes**:
```javascript
// In selection header
<TouchableOpacity
  style={styles.selectionActionButton}
  onPress={handleDeleteSelected} // Now shows dialog
>
  <Text style={styles.selectionActionText}>Delete</Text>
</TouchableOpacity>
```

### 3.5 Testing
- [ ] Test single message deletion
- [ ] Test multiple message deletion
- [ ] Test time restrictions
- [ ] Test "Delete for Me" vs "Delete for Everyone"
- [ ] Test deleted message placeholders
- [ ] Test UI/UX flow

---

## Phase 4: Real-time Updates & WebSocket (Week 2-3)

### 4.1 Update WebSocket Events
**File**: `vibgyorNode/src/services/enhancedRealtimeService.js`

**Tasks**:
- [ ] Add `message_deleted` event
- [ ] Emit event when message is deleted
- [ ] Include deletion type in event data

**Code Changes**:
```javascript
// In message deletion service
if (deleteForEveryone) {
  // Emit to all chat participants
  realtime.to(`chat:${chatId}`).emit('message_deleted', {
    messageId: message._id,
    chatId: chatId,
    deletedForEveryone: true,
    deletedBy: userId
  });
} else {
  // Emit only to deleting user
  realtime.to(`user:${userId}`).emit('message_deleted', {
    messageId: message._id,
    chatId: chatId,
    deletedForEveryone: false
  });
}
```

### 4.2 Handle Real-time Deletion in Frontend
**File**: `vibgyorMain/src/screens/SocialScreen/Messages/ChatScreen.js`

**Tasks**:
- [ ] Listen for `message_deleted` event
- [ ] Update message state when deletion received
- [ ] Show placeholder or remove message based on deletion type

**Code Changes**:
```javascript
// In useEffect for socket listeners
socketService.on('message_deleted', (data) => {
  if (data.chatId === chatId) {
    setMessages(prev => prev.map(msg => {
      if (msg.id === data.messageId) {
        if (data.deletedForEveryone) {
          return {
            ...msg,
            isDeleted: true,
            content: 'This message was deleted',
            type: 'deleted'
          };
        } else {
          // Remove from view if deleted for me
          return null;
        }
      }
      return msg;
    }).filter(Boolean));
  }
});
```

### 4.3 Testing
- [ ] Test real-time deletion updates
- [ ] Test cross-device synchronization
- [ ] Test deletion visibility for different users

---

## Phase 5: Edge Cases & Polish (Week 3)

### 5.1 Handle Edge Cases
**Tasks**:
- [ ] Handle deletion of messages with replies
- [ ] Handle deletion of forwarded messages
- [ ] Handle deletion of media messages
- [ ] Handle deletion of messages in group chats (if applicable)
- [ ] Handle network errors during deletion
- [ ] Handle partial deletion failures (some succeed, some fail)

### 5.2 Add Loading States
**Tasks**:
- [ ] Show loading indicator during deletion
- [ ] Disable UI during deletion process
- [ ] Show progress for bulk deletions

### 5.3 Add Animations
**Tasks**:
- [ ] Animate message removal
- [ ] Animate placeholder appearance
- [ ] Smooth transitions

### 5.4 Error Handling
**Tasks**:
- [ ] Better error messages
- [ ] Retry mechanism for failed deletions
- [ ] Handle time restriction errors gracefully

### 5.5 Testing
- [ ] Comprehensive edge case testing
- [ ] Performance testing with many messages
- [ ] Cross-platform testing (iOS/Android)
- [ ] User acceptance testing

---

## Phase 6: Documentation & Cleanup (Week 3)

### 6.1 Documentation
**Tasks**:
- [ ] Update API documentation
- [ ] Add code comments
- [ ] Update user guide (if applicable)
- [ ] Document deletion behavior

### 6.2 Code Cleanup
**Tasks**:
- [ ] Remove unused code
- [ ] Refactor duplicate logic
- [ ] Optimize performance
- [ ] Code review

### 6.3 Final Testing
**Tasks**:
- [ ] End-to-end testing
- [ ] Regression testing
- [ ] Performance testing
- [ ] Security review

---

## Implementation Timeline

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: Backend Foundation | 3-4 days | None |
| Phase 2: Frontend API & Components | 2-3 days | Phase 1 |
| Phase 3: ChatScreen Integration | 3-4 days | Phase 2 |
| Phase 4: Real-time Updates | 2-3 days | Phase 3 |
| Phase 5: Edge Cases & Polish | 2-3 days | Phase 4 |
| Phase 6: Documentation & Cleanup | 1-2 days | Phase 5 |
| **Total** | **13-19 days** | |

---

## Risk Assessment

### High Risk
- **Time Restriction Logic**: Need to ensure accurate time calculation across timezones
- **Real-time Synchronization**: Ensuring all users see deletions correctly
- **Message State Management**: Complex state updates when messages are deleted

### Medium Risk
- **Backward Compatibility**: Existing deleted messages need to be handled
- **Performance**: Bulk deletion of many messages
- **UI/UX**: Ensuring smooth user experience

### Low Risk
- **Component Creation**: Standard React Native components
- **API Updates**: Straightforward parameter additions

---

## Success Criteria

### Must Have
- ✅ "Delete for Me" option works correctly
- ✅ "Delete for Everyone" option works with 1-hour restriction
- ✅ Deleted messages show placeholder
- ✅ Real-time updates work
- ✅ Confirmation dialogs appear
- ✅ Multiple message deletion works

### Nice to Have
- ⭐ Undo functionality (3-5 seconds)
- ⭐ "Select All" in selection mode
- ⭐ Better animations
- ⭐ Deletion analytics

---

## Notes

1. **Backward Compatibility**: Existing deleted messages will need migration or handling
2. **Testing**: Extensive testing required, especially for time restrictions
3. **User Education**: May need to educate users about the 1-hour limit
4. **Performance**: Consider pagination and lazy loading for large message lists
5. **Security**: Ensure users can't delete messages they don't own "for everyone"

---

## Next Steps

1. Review and approve this plan
2. Set up development branch
3. Begin Phase 1 implementation
4. Daily progress updates
5. Code reviews after each phase
