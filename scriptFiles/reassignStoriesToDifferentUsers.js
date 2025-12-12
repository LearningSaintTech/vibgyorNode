/**
 * Reassign Stories to Different Users
 * Updates stories created for a specific user to have different authors
 * so that user can see stories from other users in their home page
 * 
 * Usage:
 * node scriptFiles/reassignStoriesToDifferentUsers.js
 * 
 * This script will:
 * - Find stories created by the seed script for user 9939151206
 * - Get all other users from the database
 * - Randomly reassign stories to different users
 * - Process in parallel batches for speed
 */

require('dotenv').config();
const { connectToDatabase, disconnectFromDatabase } = require('../src/dbConfig/db');
const User = require('../src/user/auth/model/userAuthModel');
const Story = require('../src/user/social/userModel/storyModel');

// Target user phone number (stories were created for this user)
const TARGET_PHONE_NUMBER = '9939151206';

// Parallel processing configuration
const BATCH_SIZE = 100; // Process 100 stories at a time

// Utility functions
const getRandomElement = (array) => array[Math.floor(Math.random() * array.length)];

/**
 * Process items in parallel batches
 */
async function processInBatches(items, batchSize, processor) {
  const results = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((item, index) => processor(item, i + index))
    );
    results.push(...batchResults.filter(r => r !== null));
    
    if ((i + batchSize) % (batchSize * 2) === 0 || i + batchSize >= items.length) {
      console.log(`   ✅ Updated ${Math.min(i + batchSize, items.length)}/${items.length} stories...`);
    }
  }
  return results;
}

/**
 * Update a single story with a new author
 */
async function updateStoryAuthor(story, newAuthor) {
  try {
    // Update the author field
    story.author = newAuthor._id;
    await story.save();
    
    return story;
  } catch (error) {
    console.error(`❌ Error updating story ${story._id}:`, error.message);
    return null;
  }
}

/**
 * Main function to reassign stories to different users
 */
async function reassignStoriesToDifferentUsers() {
  const startTime = Date.now();
  console.log('🚀 Starting Reassign Stories to Different Users...');
  console.log(`📱 Target user phone number: ${TARGET_PHONE_NUMBER}`);
  console.log(`⚡ Batch size: ${BATCH_SIZE} (processing ${BATCH_SIZE} stories in parallel)`);

  try {
    // Connect to database
    await connectToDatabase();

    // Find the target user
    console.log(`\n🔍 Finding user with phone number: ${TARGET_PHONE_NUMBER}...`);
    const targetUser = await User.findOne({ phoneNumber: TARGET_PHONE_NUMBER });
    
    if (!targetUser) {
      console.error(`❌ User with phone number ${TARGET_PHONE_NUMBER} not found!`);
      process.exit(1);
    }

    console.log(`✅ Found target user: ${targetUser.username || targetUser.fullName || targetUser.email} (ID: ${targetUser._id})`);

    // Find all stories created for this user (recently created stories)
    // We'll find stories created today (last 24 hours) to catch stories from the seed script
    console.log(`\n📊 Finding stories to reassign...`);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today
    
    // Find stories by the target user created today
    const storiesToReassign = await Story.find({
      author: targetUser._id,
      createdAt: { $gte: today }
    }).select('_id author createdAt').sort({ createdAt: -1 });

    const totalStories = storiesToReassign.length;
    console.log(`✅ Found ${totalStories} stories to reassign`);

    if (totalStories === 0) {
      console.log('\n⚠️  No stories found to reassign. They may have already been reassigned or were created before today.');
      console.log('💡 Tip: If stories were created earlier, you can modify the time filter in the script.');
      return;
    }

    // Get all other users (excluding the target user)
    console.log(`\n👥 Finding other users to assign stories to...`);
    const otherUsers = await User.find({
      _id: { $ne: targetUser._id }
    }).select('_id username fullName phoneNumber').limit(1000);

    if (otherUsers.length === 0) {
      console.error('❌ No other users found in the database!');
      console.error('Please ensure there are other users besides the target user.');
      process.exit(1);
    }

    console.log(`✅ Found ${otherUsers.length} other users to assign stories to`);

    // Prepare reassignment tasks
    console.log(`\n🔄 Preparing to reassign ${totalStories} stories to ${otherUsers.length} different users...`);
    
    const reassignmentTasks = storiesToReassign.map(story => ({
      story: story,
      newAuthor: getRandomElement(otherUsers)
    }));

    // Reassign stories in parallel batches
    console.log(`\n📝 Reassigning stories in parallel batches...`);
    const reassignStartTime = Date.now();
    
    const updatedStories = await processInBatches(
      reassignmentTasks,
      BATCH_SIZE,
      (task) => updateStoryAuthor(task.story, task.newAuthor)
    );

    const reassignTime = ((Date.now() - reassignStartTime) / 1000).toFixed(2);
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);

    // Print summary
    console.log('\n🎉 Reassign Stories Completed!');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`✅ Target user: ${targetUser.username || targetUser.fullName} (${TARGET_PHONE_NUMBER})`);
    console.log(`✅ Stories found: ${totalStories}`);
    console.log(`✅ Stories reassigned: ${updatedStories.length}`);
    console.log(`✅ Available authors: ${otherUsers.length} users`);
    console.log(`⏱️  Reassignment time: ${reassignTime}s`);
    console.log(`⏱️  Total time: ${totalTime}s`);
    console.log('═══════════════════════════════════════════════════════');

    // Verify the reassignment
    const remainingStoriesForTarget = await Story.countDocuments({
      author: targetUser._id,
      createdAt: { $gte: today }
    });

    if (remainingStoriesForTarget > 0) {
      console.log(`\n⚠️  Warning: ${remainingStoriesForTarget} stories still belong to the target user`);
    } else {
      console.log(`\n✅ All stories have been reassigned to different users!`);
    }

    // Show distribution of stories across users
    const storyDistribution = await Story.aggregate([
      {
        $match: {
          _id: { $in: storiesToReassign.map(s => s._id) }
        }
      },
      {
        $group: {
          _id: '$author',
          count: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $project: {
          username: '$user.username',
          fullName: '$user.fullName',
          phoneNumber: '$user.phoneNumber',
          storyCount: '$count'
        }
      },
      {
        $sort: { storyCount: -1 }
      },
      {
        $limit: 10
      }
    ]);

    if (storyDistribution.length > 0) {
      console.log(`\n📊 Top 10 users with reassigned stories:`);
      storyDistribution.forEach((dist, index) => {
        console.log(`   ${index + 1}. ${dist.username || dist.fullName || dist.phoneNumber}: ${dist.storyCount} stories`);
      });
    }

    console.log(`\n✅ Now user ${TARGET_PHONE_NUMBER} will see stories from ${otherUsers.length} different users in their home page!`);

  } catch (error) {
    console.error('❌ Error reassigning stories:', error);
    throw error;
  } finally {
    await disconnectFromDatabase();
  }
}

// Run if called directly
if (require.main === module) {
  reassignStoriesToDifferentUsers()
    .then(() => {
      console.log('\n✅ Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { reassignStoriesToDifferentUsers };

