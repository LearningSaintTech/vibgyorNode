# Delete Message Implementation Checklist

## Quick Reference Checklist

### Phase 1: Backend Foundation ✅
- [ ] Update Message Model schema (`deletedForEveryone` field)
- [ ] Update `deleteForUser` method with time restrictions
- [ ] Add `canDeleteForEveryone()` helper method
- [ ] Update Message Service `deleteMessage` method
- [ ] Update Message Controller to accept `deleteForEveryone` parameter
- [ ] Update message filtering to show placeholders
- [ ] Write unit tests for backend logic

### Phase 2: Frontend API & Components ✅
- [ ] Update `deleteMessage` API function
- [ ] Create `DeleteMessageDialog` component
- [ ] Create `DeletedMessageBubble` component
- [ ] Test API calls
- [ ] Test components in isolation

### Phase 3: ChatScreen Integration ✅
- [ ] Add delete dialog state management
- [ ] Update `handleDeleteSelected` to show dialog
- [ ] Create `handleConfirmDelete` handler
- [ ] Update message rendering for deleted messages
- [ ] Add `DeleteMessageDialog` to UI
- [ ] Update selection header delete button
- [ ] Test complete deletion flow

### Phase 4: Real-time Updates ✅
- [ ] Add `message_deleted` WebSocket event
- [ ] Handle real-time deletion in frontend
- [ ] Test cross-device synchronization
- [ ] Test deletion visibility

### Phase 5: Edge Cases & Polish ✅
- [ ] Handle deletion of messages with replies
- [ ] Handle deletion of forwarded messages
- [ ] Handle deletion of media messages
- [ ] Add loading states
- [ ] Add animations
- [ ] Improve error handling
- [ ] Test edge cases

### Phase 6: Documentation & Cleanup ✅
- [ ] Update API documentation
- [ ] Add code comments
- [ ] Code cleanup and refactoring
- [ ] Final testing
- [ ] Code review

---

## Key Files to Modify

### Backend
1. `vibgyorNode/src/user/social/userModel/messageModel.js`
2. `vibgyorNode/src/user/social/services/messageService.js`
3. `vibgyorNode/src/user/social/userController/enhancedMessageController.js`
4. `vibgyorNode/src/services/enhancedRealtimeService.js`

### Frontend
1. `vibgyorMain/src/api/socialMessagingAPI.js`
2. `vibgyorMain/src/screens/SocialScreen/Messages/ChatScreen.js`
3. `vibgyorMain/src/components/messages/DeleteMessageDialog.js` (NEW)
4. `vibgyorMain/src/components/messages/DeletedMessageBubble.js` (NEW)

---

## Testing Checklist

### Functional Tests
- [ ] Single message "Delete for Me"
- [ ] Single message "Delete for Everyone" (< 1 hour)
- [ ] Single message "Delete for Everyone" (> 1 hour) - should fail
- [ ] Multiple messages "Delete for Me"
- [ ] Multiple messages "Delete for Everyone"
- [ ] Mixed deletion (some for me, some for everyone)
- [ ] Deleted message shows placeholder
- [ ] "Delete for Me" removes from view
- [ ] Real-time deletion updates
- [ ] Confirmation dialogs appear

### Edge Cases
- [ ] Delete message with reply
- [ ] Delete forwarded message
- [ ] Delete media message
- [ ] Delete message in group chat
- [ ] Network error during deletion
- [ ] Partial deletion failure
- [ ] Delete message while offline
- [ ] Delete message while other user is viewing

### UI/UX Tests
- [ ] Dialog appears correctly
- [ ] Options shown based on message age
- [ ] Options shown based on ownership
- [ ] Loading states work
- [ ] Animations smooth
- [ ] Error messages clear
- [ ] Selection mode works
- [ ] Placeholder styling matches WhatsApp

---

## Code Review Points

### Backend
- [ ] Time calculation is accurate
- [ ] Timezone handling correct
- [ ] Security checks in place
- [ ] Error handling comprehensive
- [ ] Database queries optimized

### Frontend
- [ ] State management correct
- [ ] No memory leaks
- [ ] Performance optimized
- [ ] Error handling user-friendly
- [ ] UI/UX matches WhatsApp

---

## Deployment Checklist

- [ ] All tests passing
- [ ] Code review completed
- [ ] Documentation updated
- [ ] Migration script ready (if needed)
- [ ] Backward compatibility verified
- [ ] Performance tested
- [ ] Security reviewed
- [ ] Staging environment tested
- [ ] Production deployment plan ready
