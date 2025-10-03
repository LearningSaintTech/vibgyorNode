# Database Seeding Guide

This document explains how to use the seed.js file to populate your Vibgyor database with demo data.

## Overview

The seed file creates comprehensive demo data for all models in the application:

- **Admins** (2): Super Admin and System Admin
- **SubAdmins** (3): Content Moderator, Support Agent, and Pending SubAdmin
- **Users** (30): Complete user profiles with realistic data
- **User Statuses** (30): Online/offline status and activity data
- **User Catalog** (1): Predefined lists for likes, interests, genders, pronouns
- **Follow Requests** (~9): Social connection requests between users
- **Chats** (~12): Direct message conversations between users
- **Messages** (~200): Text and media messages in chats
- **Calls** (~4): Audio/video call history
- **Message Requests** (~6): Requests to start conversations
- **Reports** (~3): User reports for moderation

## Usage

### Basic Seeding
```bash
npm run seed
```

### Reset and Seed (Clears existing data)
```bash
npm run seed:reset
```

### Manual Execution
```bash
node src/seed.js
```

## Demo Login Credentials

After seeding, you can use these credentials to test the application:

### Admin Access
- **Phone**: +91 9999999999
- **OTP**: 123456
- **Role**: Super Admin

### SubAdmin Access
- **Phone**: +91 8888888888
- **OTP**: 123456
- **Role**: Content Moderator

### User Access
- **Phone**: +91 9876543210
- **OTP**: 123456
- **Role**: Regular User

## Data Features

### Realistic User Profiles
- Complete profile information (name, bio, interests, location)
- Profile pictures (generated via DiceBear API)
- Privacy settings and verification status
- Social connections (following/followers)

### Social Features
- Follow requests with different statuses
- Message requests between users
- Chat conversations with message history
- User reports for content moderation

### Communication Features
- Text and media messages
- Audio/video call history
- User online status and activity
- Typing indicators and read receipts

### Admin Features
- Admin and SubAdmin accounts
- User verification and approval workflows
- Content moderation reports
- System management capabilities

## Data Relationships

The seed file creates realistic relationships between entities:

- Users have follow relationships
- Chats contain multiple messages
- Calls are associated with chats
- Reports link users to admins
- Message requests create chat opportunities

## Customization

You can modify the seed file to:

- Change the number of users created
- Adjust demo data arrays (names, interests, etc.)
- Modify relationship patterns
- Add new demo scenarios

## Environment Requirements

Make sure you have:

1. MongoDB running (local or remote)
2. Environment variables set (JWT secrets, MongoDB URI)
3. All dependencies installed (`npm install`)

## Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   - Ensure MongoDB is running
   - Check MONGODB_URI in environment variables

2. **JWT Secret Error**
   - Set JWT_SECRET environment variable
   - Or use the default secrets in the seed file

3. **Duplicate Key Error**
   - Run with `--reset` flag to clear existing data
   - Or manually clear collections before seeding

### Reset Database
```bash
# Clear all collections
mongo vibgyor --eval "db.dropDatabase()"

# Then run seed
npm run seed
```

## Notes

- The seed file uses hard-coded OTP `123456` for all accounts
- Profile pictures are generated using DiceBear API
- All timestamps are randomized within realistic ranges
- The data is designed to be realistic but not personally identifiable
- Some users are intentionally inactive or unverified for testing edge cases
