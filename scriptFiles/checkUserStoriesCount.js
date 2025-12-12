/**
 * Check User Stories Count
 * Shows detailed statistics about stories for a specific user
 * 
 * Usage:
 * node scriptFiles/checkUserStoriesCount.js
 */

require('dotenv').config();
const { connectToDatabase, disconnectFromDatabase } = require('../src/dbConfig/db');
const User = require('../src/user/auth/model/userAuthModel');
const Story = require('../src/user/social/userModel/storyModel');

// Target user phone number
const TARGET_PHONE_NUMBER = '9939151206';

async function checkUserStoriesCount() {
  try {
    await connectToDatabase();

    console.log('🔍 Finding user...');
    const user = await User.findOne({ phoneNumber: TARGET_PHONE_NUMBER });
    
    if (!user) {
      console.error(`❌ User with phone number ${TARGET_PHONE_NUMBER} not found!`);
      process.exit(1);
    }

    console.log(`✅ Found user: ${user.username || user.fullName} (ID: ${user._id})\n`);

    // Count user's own stories
    const totalOwnStories = await Story.countDocuments({ author: user._id });
    const activeOwnStories = await Story.countDocuments({ 
      author: user._id,
      status: 'active',
      expiresAt: { $gt: new Date() }
    });
    const expiredOwnStories = await Story.countDocuments({ 
      author: user._id,
      $or: [
        { status: { $ne: 'active' } },
        { expiresAt: { $lte: new Date() } }
      ]
    });

    // Count stories from users they're following
    const followingIds = user.following || [];
    const storiesFromFollowing = await Story.countDocuments({
      status: 'active',
      expiresAt: { $gt: new Date() },
      author: { $in: followingIds }
    });

    // Count unique authors with stories
    const authorsWithStories = await Story.aggregate([
      {
        $match: {
          status: 'active',
          expiresAt: { $gt: new Date() },
          author: { $in: followingIds }
        }
      },
      {
        $group: {
          _id: '$author',
          storyCount: { $sum: 1 }
        }
      }
    ]);

    // Total stories in database
    const totalStoriesInDB = await Story.countDocuments({});
    const totalActiveStoriesInDB = await Story.countDocuments({
      status: 'active',
      expiresAt: { $gt: new Date() }
    });

    // Print summary
    console.log('📊 Stories Statistics:');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`\n👤 User's Own Stories:`);
    console.log(`   ✅ Total stories: ${totalOwnStories}`);
    console.log(`   ✅ Active stories: ${activeOwnStories}`);
    console.log(`   ⏰ Expired stories: ${expiredOwnStories}`);

    console.log(`\n👥 Stories from Followed Users:`);
    console.log(`   ✅ Following ${followingIds.length} users`);
    console.log(`   ✅ Stories available in feed: ${storiesFromFollowing}`);
    console.log(`   ✅ Unique authors with stories: ${authorsWithStories.length}`);

    if (authorsWithStories.length > 0) {
      console.log(`\n📋 Top 10 Authors with Most Stories:`);
      const sortedAuthors = authorsWithStories.sort((a, b) => b.storyCount - a.storyCount).slice(0, 10);
      for (let i = 0; i < sortedAuthors.length; i++) {
        const authorInfo = await User.findById(sortedAuthors[i]._id).select('username fullName');
        const authorName = authorInfo ? (authorInfo.username || authorInfo.fullName) : 'Unknown';
        console.log(`   ${i + 1}. ${authorName}: ${sortedAuthors[i].storyCount} stories`);
      }
    }

    console.log(`\n🌐 Database Totals:`);
    console.log(`   ✅ Total stories in database: ${totalStoriesInDB}`);
    console.log(`   ✅ Active stories in database: ${totalActiveStoriesInDB}`);

    console.log('\n═══════════════════════════════════════════════════════');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await disconnectFromDatabase();
  }
}

// Run if called directly
if (require.main === module) {
  checkUserStoriesCount()
    .then(() => {
      console.log('\n✅ Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { checkUserStoriesCount };

