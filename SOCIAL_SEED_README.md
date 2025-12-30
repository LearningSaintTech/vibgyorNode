# Social Data Seed File

## Overview

This is a comprehensive seed file for populating the social side of the application with test data.

## Features

- ✅ **150 Users** - Generated from base phone number `9829699382`
- ✅ **100 Posts** - Random posts with content and captions
- ✅ **100 Comments** - Comments distributed across posts
- ✅ **100 Chats** - Direct chats between users
- ✅ **100 Messages per Chat** - 10,000 total messages (100 chats × 100 messages)
- ✅ **100 Likes** - Likes distributed across posts
- ✅ **Follow Relationships** - Random follow relationships between users

## Requirements

- Node.js
- MongoDB connection
- Environment variables set (MONGODB_URI)

## Usage

### Run the seed file:

```bash
node socialSeed.js
```

Or with environment variables:

```bash
MONGODB_URI=mongodb://localhost:27017/vib node socialSeed.js
```

## What Gets Created

### Users
- Base phone: `9829699382`
- Phone numbers increment: `9829699383`, `9829699384`, etc.
- Random usernames and full names
- Profile pictures from pravatar.cc
- Follow relationships (5-25 follows per user)

### Posts
- 100 posts with random content
- Distributed across all users
- Random publish dates (last 30 days)
- Public visibility
- Hashtags included

### Comments
- 100 comments on random posts
- Random users commenting
- Sample comment text

### Likes
- 100 likes on random posts
- No duplicate likes (user can't like same post twice)

### Chats
- 100 unique direct chats
- Between random pairs of users
- No duplicate chats between same users

### Messages
- 100 messages per chat
- Alternating senders
- Staggered timestamps
- Text messages only
- Read receipts for senders

## Data Structure

```
Users (150)
├── Followers/Following relationships
├── Posts (100)
│   ├── Likes (100 total)
│   └── Comments (100 total)
└── Chats (100)
    └── Messages (100 per chat = 10,000 total)
```

## Notes

- All existing data is cleared before seeding
- Phone numbers are unique and sequential from base
- Chats are unique (no duplicates between same users)
- Messages are distributed evenly across chats
- Posts have engagement (likes and comments)

## Customization

Edit the configuration constants at the top of `socialSeed.js`:

```javascript
const BASE_PHONE = '9829699382';
const TOTAL_USERS = 150;
const TOTAL_POSTS = 100;
const TOTAL_COMMENTS = 100;
const TOTAL_CHATS = 100;
const MESSAGES_PER_CHAT = 100;
const TOTAL_LIKES = 100;
```

## Testing

After running the seed, you can verify the data:

```javascript
// Check counts
const User = require('./src/user/auth/model/userAuthModel');
const Post = require('./src/user/social/userModel/postModel');
const Chat = require('./src/user/social/userModel/chatModel');
const Message = require('./src/user/social/userModel/messageModel');

const userCount = await User.countDocuments();
const postCount = await Post.countDocuments();
const chatCount = await Chat.countDocuments();
const messageCount = await Message.countDocuments();

console.log({ userCount, postCount, chatCount, messageCount });
```

## Base Phone Number

The seed uses `9829699382` as the base phone number. All users will have sequential phone numbers starting from this base.

Example:
- User 0: `9829699382`
- User 1: `9829699383`
- User 2: `9829699384`
- etc.

