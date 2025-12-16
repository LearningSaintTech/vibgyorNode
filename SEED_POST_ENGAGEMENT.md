# 📊 Post Engagement Seeding Script

## Overview

This script seeds likes and comments for all posts in the database. It ensures that all active users engage with posts by either liking or commenting on them.

## Features

- ✅ **Comprehensive Strategy**: Every user engages with every post (like OR comment)
- ✅ **Standard Strategy**: Random engagement distribution (70% like, 30% comment)
- ✅ **Uses Post Model Methods**: Properly uses `addLike()` and `addComment()` methods
- ✅ **Automatic Count Updates**: Engagement counts are automatically updated
- ✅ **Excludes Authors**: Users don't like/comment on their own posts
- ✅ **Progress Tracking**: Shows progress every 10 posts
- ✅ **Final Statistics**: Displays comprehensive engagement statistics

## Usage

### Quick Start

```bash
cd vibgyor-backend

# Comprehensive strategy (default) - Every user engages with every post
npm run seed:engagement

# Or directly:
node seedPostEngagement.js
```

### Strategies

#### 1. Comprehensive Strategy (Default)
**Every user will engage with every post** - ensures maximum engagement.

```bash
npm run seed:engagement:comprehensive
# or
node seedPostEngagement.js --strategy=comprehensive
```

**Distribution:**
- 60% of users will like the post
- 20% of users will comment on the post
- 20% of users will both like and comment
- **Result**: Every user engages in some way

#### 2. Standard Strategy
**Random engagement** - more realistic distribution.

```bash
npm run seed:engagement:standard
# or
node seedPostEngagement.js --strategy=standard
```

**Distribution:**
- 70% chance to like
- 15% chance to comment only
- 15% chance to do both
- **Result**: Not all users engage, but good distribution

## How It Works

1. **Fetches all active users** from the database
2. **Fetches all published posts** from the database
3. **For each post:**
   - Excludes the post author from engagement
   - For each eligible user:
     - Checks if user already liked/commented (skips if already done)
     - Decides action based on strategy (like, comment, or both)
     - Uses Post model methods to add engagement
4. **Updates engagement counts** automatically
5. **Displays final statistics**

## Sample Output

```
🚀 Starting Post Engagement Seeding Script...

======================================================================
📊 Strategy: comprehensive
   ✅ Every user will engage with every post (like OR comment)

👥 Fetching all active users...
✅ Found 50 active users

📝 Fetching all published posts...
✅ Found 200 published posts

   ✅ Processed 10/200 posts...
      📊 Current totals: 450 likes, 150 comments
   ✅ Processed 20/200 posts...
      📊 Current totals: 900 likes, 300 comments
   ...

======================================================================

📊 Comprehensive Engagement Seeding Summary:

   ✅ Posts processed: 200
   ⏭️  Posts skipped: 0
   ❤️  Total likes added: 9000
   💬 Total comments added: 3000
   👥 Users engaged: 50
   📝 Posts with engagement: 200

📈 Final Statistics:

   📝 Total posts: 200
   ❤️  Total likes across all posts: 9000
   💬 Total comments across all posts: 3000
   📊 Average likes per post: 45
   📊 Average comments per post: 15
   🔥 Max likes on a post: 49
   🔥 Max comments on a post: 20
   📉 Min likes on a post: 40
   📉 Min comments on a post: 10

🎉 Post engagement seeding completed successfully!
```

## Post & Comment Flow

### Backend Flow

1. **Like Flow:**
   - Uses `Post.addLike(userId)` method
   - Adds like to `likes` array
   - Updates `likesCount` automatically
   - Updates `lastEngagementAt` timestamp

2. **Comment Flow:**
   - Uses `Post.addComment(userId, content)` method
   - Adds comment to `comments` array
   - Updates `commentsCount` automatically
   - Updates `lastEngagementAt` timestamp

### Model Methods Used

```javascript
// Like a post
await post.addLike(userId);

// Comment on a post
await post.addComment(userId, commentText);
```

## Sample Comments

The script uses a variety of realistic comments:
- 'Amazing! 🔥'
- 'Love this! ❤️'
- 'So good! 👏'
- 'Beautiful! ✨'
- 'Great post! 👍'
- And 45+ more variations...

## Prerequisites

1. **Database connection** configured in `.env`:
   ```env
   MONGODB_URI=mongodb://localhost:27017/vib
   ```

2. **Active users** in the database (users with `isActive: true`)

3. **Published posts** in the database (posts with `status: 'published'`)

## Notes

- ⚠️ **Idempotent**: Can be run multiple times - skips users who already engaged
- ⚠️ **Performance**: Processes posts sequentially to avoid overwhelming the database
- ⚠️ **Time**: Takes time based on number of posts and users (approximately 1-2 seconds per post)
- ✅ **Safe**: Uses proper model methods, won't corrupt data
- ✅ **Progress**: Shows progress every 10 posts

## Troubleshooting

### No users found
```
❌ No active users found in database!
```
**Solution**: Run user seeding script first or ensure users have `isActive: true`

### No posts found
```
❌ No published posts found in database!
```
**Solution**: Run post seeding script first or ensure posts have `status: 'published'`

### Connection error
```
❌ MongoDB connection error
```
**Solution**: Check `MONGODB_URI` in `.env` file and ensure MongoDB is running

## Integration with Other Scripts

This script works well with:
- `seedPosts.js` - Creates posts first
- `src/seed.js` - Creates users and posts
- `scriptFiles/seedOptimizationTest.js` - Comprehensive seeding

## Example Workflow

```bash
# 1. Seed users and posts
npm run seed

# 2. Seed engagement (likes and comments)
npm run seed:engagement

# 3. Check results in database or via API
```

## Statistics

After running, you'll see:
- Total posts processed
- Total likes added
- Total comments added
- Average engagement per post
- Min/Max engagement values
- Users engaged count

---

**Ready to seed engagement!** 🎉

