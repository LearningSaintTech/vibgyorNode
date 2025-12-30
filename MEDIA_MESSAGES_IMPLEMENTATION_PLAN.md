# Media Messages Implementation Plan
## Adding Music, GIF, Documents, Camera, Location, One-View Image, and Voice Chat Features

### 📋 Overview
This document outlines the implementation plan for adding comprehensive media support to chat messages, including:
- **Music** (audio files)
- **GIF** (animated images)
- **Documents** (PDF, DOC, etc.)
- **Camera** (capture photos/videos)
- **Location** (share location)
- **One-View Image** (disappearing image after viewing)
- **Voice Chat** (voice message recording and playback)

---

## 🔍 Current State Analysis

### Frontend (`vibgyorMain`)
✅ **Already Available:**
- `react-native-image-picker` (v8.2.1) - For gallery/camera access
- `@react-native-camera-roll/camera-roll` (v7.10.2) - For gallery access
- `react-native-vision-camera` (v4.7.2) - For camera capture
- `@react-native-community/geolocation` (v3.4.0) - For location
- `react-native-sound` (v0.12.0) - For audio playback
- `react-native-video` (v6.17.0) - For video playback
- FormData support in `socialMessagingAPI.js` for file uploads
- Icons already created: `ImageAttachmentIcon`, `OneViewIcon`, `LocationAttachmentIcon`

⚠️ **Missing:**
- Document picker library (need to add)
- GIF picker/search integration
- Music file picker
- Voice recording library (need to add)
- One-view image implementation logic
- Location sharing UI and backend support

### Backend (`vibgyorNode`)
✅ **Already Available:**
- S3 service (`s3Service.js`) with `uploadBuffer` and `uploadToS3`
- Upload middleware (`uploadMiddleware.js`) with multer
- Message model supports: `text`, `audio`, `video`, `image`, `document`, `system`, `forwarded`
- Message service handles file uploads to S3
- Route supports file uploads via `uploadSingle` middleware
- Media schema in message model with: `url`, `mimeType`, `fileName`, `fileSize`, `duration`, `thumbnail`, `dimensions`

⚠️ **Missing:**
- `gif` type in message enum
- `location` type in message enum
- `voice` type in message enum (or use existing `audio` type)
- `oneview` or `disappearing` flag in message model
- Location data structure in message model
- GIF-specific handling
- Music metadata extraction
- Voice message duration tracking
- One-view expiration logic

---

## 📦 Required Dependencies

### Frontend - New Dependencies Needed:
```json
{
  "react-native-document-picker": "^9.1.1",  // For document selection
  "react-native-gif-search": "^1.0.0" OR "giphy-react-native-sdk": "^2.0.0",  // For GIF search
  "react-native-music-picker": "^1.0.0" OR use react-native-fs with manual picker  // For music files
  "react-native-audio-recorder-player": "^3.6.0",  // For voice recording
  "react-native-permissions": "^5.4.2"  // Already installed, for microphone permissions
}
```

### Backend - New Dependencies Needed:
```json
{
  "music-metadata": "^8.0.0",  // For extracting music metadata (duration, artist, etc.)
  "sharp": "^0.33.0"  // For image processing (thumbnails, GIF handling)
}
```

---

## 🏗️ Implementation Phases

### **Phase 1: Backend Foundation** ⚙️
**Goal:** Extend backend to support all new media types

#### 1.1 Update Message Model
- [ ] Add `gif` and `location` to message type enum
- [ ] Add `isOneView` boolean field (default: false)
- [ ] Add `oneViewExpiresAt` Date field (optional)
- [ ] Add `viewedBy` array field (for one-view tracking)
- [ ] Add `location` object field:
  ```javascript
  location: {
    latitude: Number,
    longitude: Number,
    address: String,
    name: String,
    placeType: String
  }
  ```
- [ ] Add `musicMetadata` object field:
  ```javascript
  musicMetadata: {
    title: String,
    artist: String,
    album: String,
    duration: Number,
    genre: String
  }
  ```

#### 1.2 Update Upload Middleware
- [ ] Add GIF MIME types: `image/gif`
- [ ] Add music MIME types: `audio/mpeg`, `audio/mp3`, `audio/wav`, `audio/m4a`, `audio/aac`, `audio/flac`
- [ ] Add document MIME types: `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.*`, `text/plain`
- [ ] Increase max file size for music (50MB) and documents (25MB)

#### 1.3 Update Message Service
- [ ] Add GIF detection and handling
- [ ] Add music metadata extraction using `music-metadata`
- [ ] Add location data handling
- [ ] Add one-view expiration logic (background job or on-read)
- [ ] Update S3 upload paths:
  - Messages: `{userId}/messages-{type}/{filename}`
  - Example: `12345/messages-gif/1699999999-animation.gif`
  - Example: `12345/messages-music/1699999999-song.mp3`
  - Example: `12345/messages-document/1699999999-file.pdf`

#### 1.4 Update Message Routes
- [ ] Add validation for location data
- [ ] Add validation for one-view flag
- [ ] Add endpoint to mark one-view message as viewed
- [ ] Add endpoint to get location preview

#### 1.5 Add Background Jobs (Optional)
- [ ] One-view expiration cleanup job
- [ ] Music metadata extraction job (for large files)

---

### **Phase 2: Frontend UI Components** 🎨
**Goal:** Create UI components for media selection and display

#### 2.1 Attachment Menu Enhancement
- [ ] Add Music button with icon
- [ ] Add GIF button with icon
- [ ] Add Document button with icon
- [ ] Add Camera button with icon
- [ ] Add Location button (already exists, enhance)
- [ ] Add One-View toggle/button
- [ ] Update attachment menu layout to accommodate all options

#### 2.2 Media Selection Components
- [ ] **Music Picker Component:**
  - Use `react-native-document-picker` or `react-native-fs`
  - Filter for audio files only
  - Show music metadata preview
  - Allow selection from device storage

- [ ] **GIF Picker Component:**
  - Integrate Giphy API or similar
  - Search functionality
  - Trending GIFs
  - Recent GIFs
  - Preview before sending

- [ ] **Document Picker Component:**
  - Use `react-native-document-picker`
  - Show file type icons
  - Display file size
  - Preview for PDFs/images

- [ ] **Camera Component:**
  - Use `react-native-vision-camera` or `react-native-image-picker`
  - Photo capture
  - Video capture (optional)
  - Preview before sending
  - One-view toggle for camera

- [ ] **Location Picker Component:**
  - Use `@react-native-community/geolocation`
  - Map view (optional, can use static map image)
  - Current location button
  - Location search
  - Address display

#### 2.3 Message Display Components
- [ ] **Music Message Bubble:**
  - Show music metadata (title, artist)
  - Play button
  - Progress bar
  - Duration display
  - Album art placeholder

- [ ] **GIF Message Bubble:**
  - Animated GIF display
  - Auto-play on view
  - Pause on scroll
  - Full-screen view option

- [ ] **Document Message Bubble:**
  - File icon based on type
  - File name
  - File size
  - Download button
  - Preview button (for PDFs/images)

- [ ] **Location Message Bubble:**
  - Static map image
  - Address text
  - "Open in Maps" button
  - Coordinates display

- [ ] **One-View Image Bubble:**
  - Blurred preview
  - "Tap to view" indicator
  - View count (if multiple recipients)
  - Expiration timer
  - Auto-delete after viewing

---

### **Phase 3: Integration & API Updates** 🔌
**Goal:** Connect frontend to backend and update API calls

#### 3.1 Update `socialMessagingAPI.js`
- [ ] Add `sendMusicMessage(chatId, file, metadata)`
- [ ] Add `sendGifMessage(chatId, gifUrl, gifData)`
- [ ] Add `sendDocumentMessage(chatId, file)`
- [ ] Add `sendCameraMessage(chatId, file, isOneView)`
- [ ] Add `sendLocationMessage(chatId, locationData)`
- [ ] Add `sendOneViewImageMessage(chatId, file)`
- [ ] Add `markOneViewAsViewed(messageId)`
- [ ] Update `sendMessage` to handle all new types

#### 3.2 Update `ChatScreen.js`
- [ ] Add handlers for each media type:
  - `handleMusicSelect()`
  - `handleGifSelect()`
  - `handleDocumentSelect()`
  - `handleCameraCapture()`
  - `handleLocationSelect()`
  - `handleOneViewToggle()`
- [ ] Update `handleSendMessage` to route to appropriate API
- [ ] Add media preview modals
- [ ] Add upload progress indicators
- [ ] Handle one-view message viewing logic

#### 3.3 Update Message Transformation
- [ ] Update `transformMessage` to handle all new types
- [ ] Add media-specific rendering logic
- [ ] Handle one-view state (viewed/unviewed)

---

### **Phase 4: Real-time Updates** ⚡
**Goal:** Ensure real-time delivery and status updates

#### 4.1 Socket.IO Updates
- [ ] Update `message_received` event to include all media types
- [ ] Add `one_view_viewed` event for one-view tracking
- [ ] Ensure media URLs are included in socket events
- [ ] Add typing indicators for media uploads

#### 4.2 Status Updates
- [ ] Show upload progress for media messages
- [ ] Update status icons for media messages
- [ ] Handle failed uploads gracefully
- [ ] Retry logic for failed uploads

---

### **Phase 5: Advanced Features** 🚀
**Goal:** Polish and advanced functionality

#### 5.1 One-View Implementation
- [ ] Backend: Mark message as viewed when opened
- [ ] Backend: Auto-delete after viewing (or expiration)
- [ ] Frontend: Blur preview until viewed
- [ ] Frontend: Show view count
- [ ] Frontend: Expiration timer
- [ ] Frontend: Screenshot detection (optional, difficult)

#### 5.2 Music Features
- [ ] Audio player integration
- [ ] Playback controls
- [ ] Progress tracking
- [ ] Background playback (optional)

#### 5.3 GIF Features
- [ ] GIF search integration
- [ ] Trending GIFs
- [ ] Recent GIFs
- [ ] Favorites (optional)
- [ ] GIF preview in chat list

#### 5.4 Document Features
- [ ] PDF preview
- [ ] Image preview
- [ ] Download functionality
- [ ] Share functionality

#### 5.5 Location Features
- [ ] Static map image generation
- [ ] Open in Google Maps / Apple Maps
- [ ] Location sharing permissions
- [ ] Location history (optional)

---

## 📁 File Structure Changes

### Backend Files to Modify:
```
vibgyorNode/
├── src/
│   ├── user/social/
│   │   ├── userModel/
│   │   │   └── messageModel.js          [MODIFY: Add new fields]
│   │   ├── services/
│   │   │   └── messageService.js        [MODIFY: Add new handlers]
│   │   └── userController/
│   │       └── enhancedMessageController.js  [MODIFY: Add new endpoints]
│   ├── middleware/
│   │   └── uploadMiddleware.js          [MODIFY: Add MIME types]
│   └── services/
│       └── s3Service.js                 [MODIFY: Add new categories]
```

### Frontend Files to Modify:
```
vibgyorMain/
├── src/
│   ├── screens/SocialScreen/Messages/
│   │   └── ChatScreen.js                [MODIFY: Add handlers & UI]
│   ├── api/
│   │   └── socialMessagingAPI.js        [MODIFY: Add new API calls]
│   ├── components/
│   │   └── messages/                    [NEW: Media components]
│   │       ├── MusicMessageBubble.js
│   │       ├── GifMessageBubble.js
│   │       ├── DocumentMessageBubble.js
│   │       ├── LocationMessageBubble.js
│   │       └── OneViewMessageBubble.js
│   └── services/
│       └── mediaPickerService.js        [NEW: Media selection service]
```

---

## 🔐 Security Considerations

1. **File Size Limits:**
   - Images: 10MB
   - Videos: 50MB
   - Music: 50MB
   - Documents: 25MB
   - GIFs: 10MB

2. **File Type Validation:**
   - Strict MIME type checking
   - File extension validation
   - Magic number validation (for security)

3. **One-View Security:**
   - Server-side view tracking
   - Screenshot detection (if possible)
   - Expiration enforcement

4. **Location Privacy:**
   - User consent for location sharing
   - Optional location fuzzing
   - Location history cleanup

---

## 📊 Database Schema Updates

### Message Model Additions:
```javascript
{
  // New type enum values: 'gif', 'location'
  type: { enum: ['text', 'audio', 'video', 'image', 'document', 'gif', 'location', 'system', 'forwarded'] },
  
  // One-view fields
  isOneView: { type: Boolean, default: false },
  oneViewExpiresAt: { type: Date, default: null },
  viewedBy: [{
    userId: { type: ObjectId, ref: 'User' },
    viewedAt: { type: Date, default: Date.now }
  }],
  
  // Location data
  location: {
    latitude: { type: Number, required: function() { return this.type === 'location'; } },
    longitude: { type: Number, required: function() { return this.type === 'location'; } },
    address: String,
    name: String,
    placeType: String
  },
  
  // Music metadata
  musicMetadata: {
    title: String,
    artist: String,
    album: String,
    duration: Number,
    genre: String
  },
  
  // Enhanced media for GIFs
  media: {
    // ... existing fields ...
    isAnimated: Boolean, // For GIFs
    gifSource: String,   // 'upload' or 'giphy' or 'tenor'
    gifId: String        // External GIF ID if from service
  }
}
```

---

## 🧪 Testing Checklist

### Backend Tests:
- [ ] Message creation with all media types
- [ ] S3 upload for all file types
- [ ] Music metadata extraction
- [ ] One-view expiration logic
- [ ] Location data validation
- [ ] File size limits enforcement
- [ ] MIME type validation

### Frontend Tests:
- [ ] Media selection from all sources
- [ ] Upload progress indicators
- [ ] Message display for all types
- [ ] One-view viewing flow
- [ ] Location sharing flow
- [ ] Error handling for failed uploads
- [ ] Real-time updates

---

## 📝 Implementation Notes

1. **S3 Path Structure:**
   - Follow existing pattern: `{userId}/messages-{type}/{timestamp}-{filename}`
   - Example: `694a957ba0f9398c0fd551c2/messages-music/1699999999-song.mp3`

2. **GIF Handling:**
   - Support both uploaded GIFs and external GIF services (Giphy, Tenor)
   - Store external GIF URL and ID for reference
   - For uploaded GIFs, store in S3 like images

3. **One-View Implementation:**
   - Mark as viewed when message is opened in chat
   - Delete media from S3 after viewing (or after expiration)
   - Show view count for group chats
   - Optional: Screenshot detection (challenging)

4. **Music Metadata:**
   - Extract on backend during upload
   - Store in `musicMetadata` field
   - Display in message bubble
   - Fallback to filename if metadata unavailable

5. **Location Sharing:**
   - Store coordinates and address
   - Generate static map image (optional)
   - Allow opening in native maps app
   - Privacy: Only share when user explicitly sends

---

## 🎯 Success Criteria

✅ All media types can be sent and received
✅ One-view images work correctly
✅ Location sharing works
✅ Music playback works
✅ GIFs animate correctly
✅ Documents can be previewed/downloaded
✅ Real-time updates work for all types
✅ Upload progress is shown
✅ Error handling is robust
✅ File size limits are enforced
✅ Security validations pass

---

## ⏱️ Estimated Timeline

- **Phase 1 (Backend):** 2-3 days
- **Phase 2 (Frontend UI):** 3-4 days
- **Phase 3 (Integration):** 2-3 days
- **Phase 4 (Real-time):** 1-2 days
- **Phase 5 (Advanced):** 2-3 days

**Total:** ~10-15 days

---

## 🚀 Ready for Implementation

This plan is ready for implementation. Please review and provide feedback or approval to proceed with Phase 1.


