# VibgyorNode API - Features Documentation

## Overview
VibgyorNode is a comprehensive social messaging platform with three user roles: Admin, SubAdmin, and User. This document describes all available features with practical examples.

## User Roles & Permissions

### Admin
- Full system access and control
- Can manage users, sub-admins, reports, and system catalogs
- Has access to all administrative functions

### SubAdmin  
- Limited administrative access
- Can manage users and reports
- Cannot manage other sub-admins or system-wide settings

### User
- Standard platform user
- Can interact with other users, send messages, manage profile
- Limited to personal and social features

---

## 1. Authentication System

### Admin Authentication
**Phone-based OTP authentication**

**Send OTP:**
- Admin enters phone number
- System sends OTP (currently hardcoded as "123456")
- Example: Admin enters "+91-9998887777"

**Verify OTP:**
- Admin enters received OTP
- System validates and provides access/refresh tokens
- Example: Admin enters "123456" and gets logged in

**Resend OTP:**
- Admin can request new OTP if previous one expired
- Rate limited to prevent spam

### SubAdmin Authentication
**Phone-based OTP authentication (same as Admin)**

**Send OTP:**
- SubAdmin enters phone number
- Example: SubAdmin enters "+91-8887776666"

**Verify OTP:**
- SubAdmin enters OTP and gets access tokens
- Example: SubAdmin enters "123456"

**Profile Completion:**
- After first login, SubAdmin must complete profile
- Includes name, email, and profile picture upload

### User Authentication
**Multi-step authentication process**

**Phone OTP (Primary):**
- User enters phone number
- Example: User enters "+91-7776665555"
- System sends OTP for phone verification

**Email OTP (Secondary):**
- After phone verification, user can add email
- System sends OTP to email for verification
- Example: User enters "john@example.com"

**Profile Setup:**
- User creates username, sets personal information
- Includes bio, interests, location, etc.

---

## 2. User Profile Management

### Get User Profile
**Retrieve complete user profile information**

**Get Profile:**
- User can view their complete profile data
- Includes personal info, verification status, social connections
- Example: User views their profile with all details including followers, verification status

### Profile Picture Management
**Upload and manage profile pictures**

**Upload Profile Picture:**
- Users can upload profile pictures via file upload
- Images are processed and stored in S3 cloud storage
- Supported formats: JPEG, PNG, WebP, GIF
- Example: User "alex" uploads a new profile picture from their phone

### ID Proof & Verification
**Document verification system**

**Upload ID Proof:**
- Users can upload identity documents for verification
- Documents are stored securely in S3
- Verification status automatically set to "pending"
- Document types: ID proof, passport, driving license
- Example: User uploads passport for account verification

**Verification Process:**
- Admin/SubAdmin reviews uploaded documents
- Can approve or reject with reasons
- Verification badge system for approved users

### Profile Data Structure
**Complete profile information includes:**
- Personal: Name, username, bio, date of birth, gender, pronouns
- Contact: Phone (masked), email, verification status
- Social: Likes, interests, following/followers lists
- Location: GPS coordinates, city, country
- Privacy: Privacy settings, blocked users list
- Verification: Document status, review history

---

## 4. User Management (Admin & SubAdmin)

### View All Users
**What Admins/SubAdmins can see:**
- List of all registered users with pagination
- Filter by active/inactive status
- Search by name, username, email, or phone
- Example: Admin views page 1 with 10 users, filtered by "active" status

### User Details
**Individual user information:**
- Complete profile information
- Account status and verification status
- Registration date and activity history
- Example: Admin views details for user "john_doe_123"

### User Status Management
**Activate/Deactivate Users:**
- Admins can enable or disable user accounts
- Example: Admin deactivates user "spam_user_456" due to policy violations

### User Verification System
**Document Verification Process:**
- Users submit ID proof documents
- Admins/SubAdmins review and approve/reject
- Example: User "jane_smith" submits passport copy, Admin approves after review

**Pending Verifications:**
- View all users waiting for verification
- Example: Admin sees 5 users with pending ID verification

**Approval/Rejection:**
- Approve: User gets verified status
- Reject: User gets rejection reason and can resubmit
- Example: Admin rejects user "fake_profile" with reason "Document not clear"

---

## 5. Social Features (Users)

### Following System
**Follow/Unfollow Users:**
- Users can follow other users to see their updates
- Example: User "alice" follows user "bob" to see his posts

**Followers & Following Lists:**
- View who follows you and who you follow
- Paginated lists with user details
- Example: User "charlie" has 150 followers and follows 89 users

### Blocking System
**Block/Unblock Users:**
- Users can block other users to prevent interaction
- Blocked users cannot message or see your profile
- Example: User "diana" blocks user "harasser_123"

**Blocked Users List:**
- View all blocked users
- Can unblock if needed
- Example: User "diana" sees 3 blocked users in her list

### Reporting System
**Report Inappropriate Behavior:**
- Users can report other users for various violations
- Report types: spam, harassment, fake profile, inappropriate content
- Example: User "eve" reports user "spammer_xyz" for sending spam messages

**Report Management (Admin/SubAdmin):**
- View all pending reports
- Take action: warn, suspend, or dismiss
- Example: Admin sees 12 pending reports, resolves spam complaint by suspending user

---

## 6. Messaging System

### Chat Management
**Create or Get Chat:**
- Users can start conversations with other users
- System creates chat if it doesn't exist
- Example: User "frank" starts chat with user "grace"

**Chat List:**
- View all active conversations
- Shows last message and timestamp
- Example: User "henry" sees 15 active chats in his list

**Chat Settings:**
- Pin important chats
- Mute notifications
- Archive old chats
- Example: User "iris" pins chat with "john" and mutes chat with "spam_group"

**Search Chats:**
- Search through chat history
- Example: User "jack" searches for "meeting" in all his chats

### Message Requests
**Send Message Request:**
- Users must request permission to message someone new
- Prevents spam and unwanted messages
- Example: User "kate" sends message request to user "leo"

**Manage Requests:**
- View pending requests from others
- Accept or reject message requests
- Example: User "mike" sees 5 pending requests, accepts 3 and rejects 2

**Request History:**
- View sent and received requests
- Track request status
- Example: User "nancy" sees her 10 sent requests, 8 accepted, 2 pending

### Messages
**Send Messages:**
- Text messages with optional file attachments
- Support for images, documents, etc.
- Example: User "olivia" sends "Hello!" with a photo attachment

**Message Features:**
- Edit sent messages
- Delete messages
- React with emojis
- Example: User "paul" reacts with 👍 to message from "quinn"

**Message Search:**
- Search within specific chats
- Find messages by content
- Example: User "rachel" searches for "birthday" in chat with "sam"

**Media Gallery:**
- View all shared media in a chat
- Organized by file type
- Example: User "tom" views all photos shared in family group chat

---

## 7. User Status & Presence

### Online Status
**Update Status:**
- Set online/offline status
- Add custom status messages
- Example: User "una" sets status to "Available" and goes online

**Privacy Settings:**
- Control who can see your online status
- Control who can see your last seen time
- Example: User "victor" hides his online status from everyone except friends

**Status Visibility:**
- See who's currently online
- View recently active users
- Example: User "wendy" sees 25 users currently online

### Activity Tracking
**Last Seen:**
- Track when users were last active
- Respects privacy settings
- Example: User "xavier" was last seen "2 hours ago"

**Typing Indicators:**
- See when someone is typing in a chat
- Real-time updates
- Example: User "yara" sees "zack is typing..." in their chat

---

## 8. Catalog Management (Admin/SubAdmin)

### System Catalogs
**Gender Options:**
- Manage available gender selections
- Example: Admin adds "non-binary" to gender options

**Pronoun Lists:**
- Manage pronoun options for profiles
- Example: SubAdmin adds "they/them" to pronoun list

**Interest Categories:**
- Manage user interest tags
- Example: Admin adds "photography" and "cooking" to interests

**Like Categories:**
- Manage things users can like
- Example: SubAdmin adds "travel" and "music" to likes list

### Catalog Operations
**Create New Catalog:**
- Set up initial catalog items
- Example: Admin creates catalog with basic gender, pronoun, interest options

**Update Catalog:**
- Modify existing catalog items
- Example: SubAdmin updates interest list to include "gaming"

**Add Items:**
- Add new items to specific lists
- Example: Admin adds "transgender" to gender list

**Remove Items:**
- Remove outdated or inappropriate items
- Example: SubAdmin removes "outdated_hobby" from interests

**Delete Entire Catalog:**
- Reset all catalog items
- Example: Admin deletes catalog to start fresh

---

## 9. Username System

### Username Availability
**Check Availability:**
- Verify if username is available
- Real-time checking
- Example: User checks if "cool_username_2024" is available

**Username Suggestions:**
- Get alternative suggestions if username taken
- Based on base name provided
- Example: User enters "john" and gets suggestions like "john_123", "john_doe", etc.

---

## 10. Reporting & Moderation

### Report Management (Admin/SubAdmin)
**View Pending Reports:**
- See all unresolved reports
- Filter by report type and priority
- Example: Admin sees 8 pending spam reports and 3 harassment reports

**Report Details:**
- View complete report information
- See reporter and reported user details
- Example: Admin reviews report from "user_a" against "user_b" for harassment

**Take Action:**
- Resolve reports with appropriate actions
- Actions: warning, suspension, account deletion
- Example: Admin resolves harassment report by issuing warning to "user_b"

**Report Statistics:**
- View report analytics and trends
- Track resolution times
- Example: Admin sees 95% of reports resolved within 24 hours

---

## 11. Real-time Features

### Socket.IO Integration
**Live Updates:**
- Real-time message delivery
- Live typing indicators
- Online status updates
- Example: User receives message instantly without refreshing

**Authentication:**
- Socket connections require valid tokens
- Secure real-time communication
- Example: User connects with valid access token

---

## 12. File Upload & Storage

### Profile Pictures
**Upload Profile Images:**
- Users and SubAdmins can upload profile pictures
- Images stored securely in cloud storage
- Example: User "alex" uploads new profile picture

### Message Attachments
**Share Files:**
- Send images, documents, and other files
- Support for multiple file types
- Example: User "beth" shares PDF document in work chat

### ID Verification Documents
**Upload Documents:**
- Users upload ID proof for verification
- Secure document storage
- Example: User "chris" uploads driver's license for verification

---

## 13. API Response Format

### Standard Response Structure
```json
{
  "success": true/false,
  "message": "Description of result",
  "data": {
    // Response data here
  },
  "error": {
    "code": "ERROR_CODE",
    "details": "Additional error information"
  }
}
```

### Common Error Codes
- `OTP_RATE_LIMIT`: Too many OTP requests
- `USERNAME_TAKEN`: Username already exists
- `INVALID_OTP`: OTP is incorrect or expired
- `UNAUTHORIZED`: Invalid or missing authentication
- `NOT_FOUND`: Requested resource doesn't exist

---

## 14. Security Features

### Authentication
- JWT-based access and refresh tokens
- Token expiration and renewal
- Role-based access control

### Rate Limiting
- OTP request limits
- API call throttling
- Spam prevention

### Data Privacy
- User privacy controls
- Secure file storage
- Data encryption

---

## 15. Audio/Video Calling System

### Call Features
**Real-time audio and video calling with WebRTC technology**

**Initiate Call:**
- Users can start audio or video calls from any chat
- System checks if other user is online and available
- Example: User "alice" starts a video call with user "bob" from their chat

**Call Management:**
- Accept incoming calls with one tap
- Reject calls with optional reason
- End calls and automatically calculate duration
- Example: User "charlie" receives call, accepts it, talks for 5 minutes, then ends call

**Call Settings:**
- Mute/unmute audio during call
- Enable/disable video during call
- Screen sharing capabilities
- Example: User "diana" mutes herself during a noisy environment

**Call History:**
- View complete call history for each chat
- Filter by call type (audio/video)
- See call duration and status
- Example: User "eve" sees 15 calls with "frank", 8 video calls and 7 audio calls

**Call Statistics:**
- Total calls made and received
- Average call duration
- Call success rates
- Example: User "grace" has made 50 calls, 45 completed, average duration 3.5 minutes

### WebRTC Integration
**Peer-to-peer media streaming**

**Signaling Server:**
- Socket.IO handles call initiation and acceptance
- WebRTC offer/answer exchange
- ICE candidate negotiation
- Example: Real-time signaling between users for optimal connection

**Call Quality:**
- Automatic quality adjustment based on network
- Connection type detection (WiFi, cellular, ethernet)
- Bandwidth monitoring
- Example: Call quality adjusts from HD to SD when user switches to cellular

**Network Handling:**
- STUN servers for NAT traversal
- TURN servers for relay (production)
- Automatic reconnection on network changes
- Example: Call continues seamlessly when user switches WiFi networks

---

## 16. Usage Examples

### Complete User Journey
1. **Registration**: User enters phone number, receives OTP, verifies
2. **Profile Setup**: User creates username, adds personal information
3. **Email Verification**: User adds and verifies email address
4. **Social Interaction**: User follows others, gets followed back
5. **Messaging**: User sends message requests, starts conversations
6. **Calling**: User initiates audio/video calls with contacts
7. **Status Updates**: User sets online status and custom messages
8. **Content Sharing**: User shares photos and documents in chats

### Admin Workflow
1. **Login**: Admin logs in with phone OTP
2. **User Management**: Admin reviews and manages user accounts
3. **Verification**: Admin processes ID verification requests
4. **Moderation**: Admin handles user reports and violations
5. **System Maintenance**: Admin updates system catalogs and settings

### SubAdmin Workflow
1. **Login**: SubAdmin logs in with phone OTP
2. **Profile Completion**: SubAdmin completes profile setup
3. **User Oversight**: SubAdmin manages assigned users
4. **Report Handling**: SubAdmin processes user reports
5. **Limited Admin Tasks**: SubAdmin performs restricted administrative functions

---

## 17. Complete API Route Summary

### Total Routes Implemented: **117 Endpoints**

#### **Admin Routes (19 endpoints):**
**Authentication (4 endpoints):**
- `POST /admin/send-otp` - Send OTP to admin phone
- `POST /admin/verify-otp` - Verify admin OTP
- `POST /admin/resend-otp` - Resend admin OTP
- `GET /admin/me` - Get admin profile

**User Management (6 endpoints):**
- `GET /admin/users` - Get all users with pagination
- `GET /admin/users/:userId` - Get user details
- `PATCH /admin/users/:userId/status` - Activate/deactivate user
- `GET /admin/users/verifications/pending` - Get pending verifications
- `PATCH /admin/users/:userId/verification/approve` - Approve user verification
- `PATCH /admin/users/:userId/verification/reject` - Reject user verification

**Report Management (4 endpoints):**
- `GET /admin/reports/pending` - Get pending reports
- `GET /admin/reports/:reportId` - Get report details
- `PATCH /admin/reports/:reportId/status` - Update report status
- `GET /admin/reports/stats` - Get report statistics

**SubAdmin Management (5 endpoints):**
- `GET /admin/subadmins` - Get all subadmins
- `GET /admin/subadmins/pending` - Get pending subadmins
- `GET /admin/subadmins/:subAdminId` - Get subadmin details
- `PATCH /admin/subadmins/:subAdminId/status` - Activate/deactivate subadmin
- `PATCH /admin/subadmins/:subAdminId/approval` - Approve/reject subadmin

#### **SubAdmin Routes (17 endpoints):**
**Authentication (5 endpoints):**
- `POST /subadmin/auth/send-otp` - Send OTP to subadmin phone
- `POST /subadmin/auth/verify-otp` - Verify subadmin OTP
- `POST /subadmin/auth/resend-otp` - Resend subadmin OTP
- `GET /subadmin/me` - Get subadmin profile
- `PUT /subadmin/profile` - Update subadmin profile

**User Management (6 endpoints):**
- `GET /subadmin/users` - Get all users
- `GET /subadmin/users/stats` - Get user statistics
- `GET /subadmin/users/:userId` - Get user details
- `PATCH /subadmin/users/:userId/status` - Activate/deactivate user
- `GET /subadmin/users/verifications/pending` - Get pending verifications
- `PATCH /subadmin/users/:userId/verification/approve` - Approve user verification
- `PATCH /subadmin/users/:userId/verification/reject` - Reject user verification

**Report Management (4 endpoints):**
- `GET /subadmin/reports/pending` - Get pending reports
- `GET /subadmin/reports/:reportId` - Get report details
- `PATCH /subadmin/reports/:reportId/status` - Update report status
- `GET /subadmin/reports/stats` - Get report statistics

#### **User Routes (79 endpoints):**
**Authentication (9 endpoints):**
- `POST /user/auth/send-otp` - Send phone OTP
- `POST /user/auth/verify-otp` - Verify phone OTP
- `POST /user/auth/resend-otp` - Resend phone OTP
- `POST /user/auth/email/send-otp` - Send email OTP
- `POST /user/auth/email/verify-otp` - Verify email OTP
- `POST /user/auth/email/resend-otp` - Resend email OTP
- `GET /user/auth/me` - Get user profile
- `GET /user/auth/profile` - Get detailed user profile
- `PUT /user/auth/profile` - Update user profile

**Catalog Management (7 endpoints):**
- `GET /user/catalog` - Get all catalog items
- `GET /user/catalog/:listType` - Get specific catalog list
- `POST /user/catalog` - Create catalog (Admin/SubAdmin)
- `PUT /user/catalog` - Update catalog (Admin/SubAdmin)
- `PATCH /user/catalog/add` - Add items to list (Admin/SubAdmin)
- `PATCH /user/catalog/remove` - Remove items from list (Admin/SubAdmin)
- `DELETE /user/catalog` - Delete catalog (Admin/SubAdmin)

**Username System (2 endpoints):**
- `GET /user/username/available` - Check username availability
- `GET /user/username/suggest` - Get username suggestions

**File Upload (2 endpoints):**
- `POST /user/upload/profile-picture` - Upload profile picture
- `POST /user/upload/id-proof` - Upload ID proof document

**Social Features (16 endpoints):**
- `POST /user/social/follow-request/:userId` - Send follow request
- `POST /user/social/follow-request/:requestId/accept` - Accept follow request
- `POST /user/social/follow-request/:requestId/reject` - Reject follow request
- `DELETE /user/social/follow-request/:requestId/cancel` - Cancel follow request
- `GET /user/social/follow-requests/pending` - Get pending follow requests
- `GET /user/social/follow-requests/sent` - Get sent follow requests
- `DELETE /user/social/follow/:userId` - Unfollow user
- `GET /user/social/followers` - Get followers list
- `GET /user/social/following` - Get following list
- `POST /user/social/block/:userId` - Block user
- `DELETE /user/social/block/:userId` - Unblock user
- `GET /user/social/blocked` - Get blocked users list
- `POST /user/social/report/:userId` - Report user
- `GET /user/social/reports` - Get user reports
- `GET /user/social/social-stats` - Get social statistics

**Chat Management (8 endpoints):**
- `POST /user/chats/:userId` - Create or get chat
- `GET /user/chats` - Get user chats
- `GET /user/chats/:chatId` - Get chat details
- `PUT /user/chats/:chatId` - Update chat settings
- `DELETE /user/chats/:chatId` - Delete chat
- `GET /user/chats/search` - Search chats
- `GET /user/chats/stats` - Get chat statistics
- `GET /user/chats/:chatId/typing` - Get typing users in chat

**User Status (7 endpoints):**
- `PUT /user/status` - Update user status
- `GET /user/status/:userId` - Get user status
- `GET /user/status/online` - Get online users
- `GET /user/status/recent` - Get recently active users
- `POST /user/status/batch` - Get batch user statuses
- `PUT /user/status/privacy` - Update privacy settings
- `GET /user/status/stats` - Get status statistics

**Message Requests (9 endpoints):**
- `POST /user/message-requests/:userId` - Send message request
- `GET /user/message-requests/pending` - Get pending requests
- `GET /user/message-requests/sent` - Get sent requests
- `POST /user/message-requests/:requestId/accept` - Accept message request
- `POST /user/message-requests/:requestId/reject` - Reject message request
- `DELETE /user/message-requests/:requestId` - Delete message request
- `GET /user/message-requests/:requestId` - Get message request details
- `GET /user/message-requests/stats` - Get message request statistics
- `GET /user/message-requests/between/:userId` - Get request between users

**Message Management (10 endpoints):**
- `POST /user/messages/chats/:chatId/messages` - Send message
- `GET /user/messages/chats/:chatId/messages` - Get chat messages
- `POST /user/messages/chats/:chatId/messages/read` - Mark messages as read
- `PUT /user/messages/:messageId` - Edit message
- `DELETE /user/messages/:messageId` - Delete message
- `POST /user/messages/:messageId/react` - React to message
- `DELETE /user/messages/:messageId/react` - Remove reaction
- `GET /user/messages/chats/:chatId/messages/search` - Search messages
- `GET /user/messages/chats/:chatId/media` - Get chat media
- `GET /user/messages/:messageId` - Get message details

**Call Management (10 endpoints):**
- `POST /user/calls/initiate` - Initiate audio/video call
- `POST /user/calls/:callId/accept` - Accept incoming call
- `POST /user/calls/:callId/reject` - Reject incoming call
- `POST /user/calls/:callId/end` - End active call
- `GET /user/calls/:callId/status` - Get call status and details
- `GET /user/calls/chats/:chatId/call-history` - Get call history for chat
- `GET /user/calls/stats` - Get user call statistics
- `PUT /user/calls/:callId/settings` - Update call settings (mute, video)
- `POST /user/calls/:callId/signaling` - Handle WebRTC signaling
- `GET /user/calls/chats/:chatId/active-call` - Get active call for chat

#### **System Routes (2 endpoints):**
- `GET /health` - Health check endpoint
- `GET /` - Root endpoint

---

## 18. Postman Collection Summary

### Total Postman Requests: **117 Endpoints**

The Postman collection includes all 117 implemented routes with:
- **Complete request configurations** for all endpoints
- **Authentication headers** properly set up
- **Environment variables** for dynamic data
- **Test scripts** to capture response IDs
- **Request bodies** with example data
- **Query parameters** for pagination and filtering

### Environment Variables Used:
- `BASE_URL` - API base URL (default: http://localhost:3000)
- `ADMIN_ACCESS_TOKEN` - Admin authentication token
- `SUBADMIN_ACCESS_TOKEN` - SubAdmin authentication token
- `USER_ACCESS_TOKEN` - User authentication token
- `USER_ID` - Dynamic user ID for testing
- `CHAT_ID` - Dynamic chat ID for testing
- `MESSAGE_ID` - Dynamic message ID for testing
- `MESSAGE_REQUEST_ID` - Dynamic message request ID for testing
- `CALL_ID` - Dynamic call ID for testing
- `PENDING_REPORT_ID` - Dynamic report ID for testing
- `PENDING_VERIFICATION_USER_ID` - Dynamic verification ID for testing

### Collection Organization:
- **Health & Root** - System endpoints
- **Admin** - All admin functionality (Authentication, User Management, Reports, SubAdmin Management)
- **SubAdmin** - All subadmin functionality (Authentication, Profile, User Management, Reports)
- **User** - All user functionality (Authentication, Profile, Social, Chats, Status, Messages, Message Requests, Call Management)

---

## 19. Implementation Status

### ✅ **Fully Implemented Features:**
- **Authentication System** - Complete OTP-based auth for all user types
- **User Management** - Full CRUD operations for admin/subadmin
- **Social Features** - Follow, block, report functionality
- **Messaging System** - Complete chat and message management
- **User Status** - Real-time status and presence tracking
- **Message Requests** - Permission-based messaging system
- **Catalog Management** - System-wide catalog administration
- **Username System** - Availability checking and suggestions
- **User Profile Management** - Complete profile retrieval and management
- **Report Management** - User reporting and moderation
- **File Upload** - Profile pictures and document uploads
- **Real-time Features** - Socket.IO integration
- **Audio/Video Calling** - Complete WebRTC calling system with signaling

### 🔧 **Technical Implementation:**
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT tokens with role-based access
- **File Storage**: AWS S3 integration
- **Real-time**: Socket.IO with authentication and WebRTC signaling
- **Email**: Nodemailer integration
- **Validation**: Input validation and error handling
- **Rate Limiting**: OTP request throttling and call initiation limits
- **Security**: Helmet, CORS, and secure headers
- **WebRTC**: Peer-to-peer audio/video calling with STUN/TURN servers
- **Call Management**: Complete call lifecycle with history and statistics

This documentation provides a comprehensive overview of all features available in the VibgyorNode platform, with practical examples of how each feature works in real-world scenarios.
