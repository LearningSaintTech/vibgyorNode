/**
 * Follow Users With Stories
 * Makes a specific user follow all other users who have stories
 * so they can see those stories in their feed
 * 
 * Usage:
 * node scriptFiles/followUsersWithStories.js
 * 
 * This script will:
 * - Find the target user (9939151206)
 * - Find all users who have active stories
 * - Make the target user follow all those users
 * - Update followers lists accordingly
 * - Process in parallel batches for speed
 */

require('dotenv').config();
const { connectToDatabase, disconnectFromDatabase } = require('../src/dbConfig/db');
const User = require('../src/user/auth/model/userAuthModel');
const Story = require('../src/user/social/userModel/storyModel');

// Target user phone number
const TARGET_PHONE_NUMBER = '9939151206';

// Parallel processing configuration
const BATCH_SIZE = 50; // Process 50 users at a time

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
      console.log(`   ✅ Processed ${Math.min(i + batchSize, items.length)}/${items.length} users...`);
    }
  }
  return results;
}

/**
 * Make target user follow a specific user
 */
async function followUser(targetUser, userToFollow) {
  try {
    // Add userToFollow to targetUser's following list (if not already there)
    if (!targetUser.following.includes(userToFollow._id)) {
      targetUser.following.push(userToFollow._id);
    }
    
    // Add targetUser to userToFollow's followers list (if not already there)
    if (!userToFollow.followers.includes(targetUser._id)) {
      userToFollow.followers.push(targetUser._id);
    }
    
    // Save both users
    await targetUser.save();
    await userToFollow.save();
    
    return { targetUser, userToFollow };
  } catch (error) {
    console.error(`❌ Error making user follow ${userToFollow._id}:`, error.message);
    return null;
  }
}

/**
 * Main function to follow users with stories
 */
async function followUsersWithStories() {
  const startTime = Date.now();
  console.log('🚀 Starting Follow Users With Stories...');
  console.log(`📱 Target user phone number: ${TARGET_PHONE_NUMBER}`);
  console.log(`⚡ Batch size: ${BATCH_SIZE} (processing ${BATCH_SIZE} users in parallel)`);

  try {
    // Connect to database
    await connectToDatabase();

    // Find the target user
    console.log(`\n🔍 Finding user with phone number: ${TARGET_PHONE_NUMBER}...`);
    let targetUser = await User.findOne({ phoneNumber: TARGET_PHONE_NUMBER });
    
    if (!targetUser) {
      console.error(`❌ User with phone number ${TARGET_PHONE_NUMBER} not found!`);
      process.exit(1);
    }

    console.log(`✅ Found target user: ${targetUser.username || targetUser.fullName || targetUser.email} (ID: ${targetUser._id})`);

    // Find all users who have active stories (created today)
    console.log(`\n📊 Finding users with active stories...`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get distinct authors who have active stories
    const authorsWithStories = await Story.aggregate([
      {
        $match: {
          status: 'active',
          expiresAt: { $gt: new Date() },
          createdAt: { $gte: today },
          author: { $ne: targetUser._id } // Exclude target user's own stories
        }
      },
      {
        $group: {
          _id: '$author',
          storyCount: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 1,
          storyCount: 1
        }
      }
    ]);

    const uniqueAuthorIds = authorsWithStories.map(a => a._id);
    console.log(`✅ Found ${uniqueAuthorIds.length} users with active stories`);

    if (uniqueAuthorIds.length === 0) {
      console.log('\n⚠️  No users with stories found!');
      console.log('💡 Make sure stories have been created and reassigned to different users.');
      return;
    }

    // Get full user documents for these authors
    console.log(`\n👥 Fetching user details for ${uniqueAuthorIds.length} users...`);
    const usersWithStories = await User.find({
      _id: { $in: uniqueAuthorIds }
    }).select('_id username fullName phoneNumber following followers');

    console.log(`✅ Found ${usersWithStories.length} users to follow`);

    // Check which users the target user is already following
    const alreadyFollowing = targetUser.following || [];
    const usersToFollow = usersWithStories.filter(
      user => !alreadyFollowing.some(followingId => followingId.toString() === user._id.toString())
    );

    console.log(`\n📊 Following status:`);
    console.log(`   - Already following: ${alreadyFollowing.length} users`);
    console.log(`   - Need to follow: ${usersToFollow.length} users`);

    if (usersToFollow.length === 0) {
      console.log('\n✅ Target user is already following all users with stories!');
      return;
    }

    // Prepare follow tasks
    console.log(`\n🔄 Preparing to make target user follow ${usersToFollow.length} users...`);
    
    const followTasks = usersToFollow.map(user => ({
      targetUser: targetUser,
      userToFollow: user
    }));

    // Follow users in parallel batches
    console.log(`\n📝 Following users in parallel batches...`);
    const followStartTime = Date.now();
    
    // Use bulk operations for better performance
    const updatedFollows = [];
    for (let i = 0; i < followTasks.length; i += BATCH_SIZE) {
      const batch = followTasks.slice(i, i + BATCH_SIZE);
      
      // Process batch
      const batchResults = await Promise.all(
        batch.map(task => {
          // Add to following list if not already there
          if (!targetUser.following.some(id => id.toString() === task.userToFollow._id.toString())) {
            targetUser.following.push(task.userToFollow._id);
          }
          
          // Add to followers list if not already there
          if (!task.userToFollow.followers.some(id => id.toString() === targetUser._id.toString())) {
            task.userToFollow.followers.push(targetUser._id);
          }
          
          return { targetUser, userToFollow: task.userToFollow };
        })
      );
      
      // Save all users in batch
      await Promise.all([
        targetUser.save(),
        ...batch.map(task => task.userToFollow.save())
      ]);
      
      updatedFollows.push(...batchResults);
      
      // Reload targetUser to get updated following list for next batch
      targetUser = await User.findById(targetUser._id);
      
      if ((i + BATCH_SIZE) % (BATCH_SIZE * 2) === 0 || i + BATCH_SIZE >= followTasks.length) {
        console.log(`   ✅ Followed ${Math.min(i + BATCH_SIZE, followTasks.length)}/${followTasks.length} users...`);
      }
    }

    const followTime = ((Date.now() - followStartTime) / 1000).toFixed(2);
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);

    // Reload target user to get final state
    const finalTargetUser = await User.findById(targetUser._id).select('following');
    const finalFollowingCount = finalTargetUser.following.length;

    // Print summary
    console.log('\n🎉 Follow Users With Stories Completed!');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`✅ Target user: ${targetUser.username || targetUser.fullName} (${TARGET_PHONE_NUMBER})`);
    console.log(`✅ Users with stories found: ${usersWithStories.length}`);
    console.log(`✅ New users followed: ${updatedFollows.length}`);
    console.log(`✅ Total users now following: ${finalFollowingCount}`);
    console.log(`⏱️  Follow time: ${followTime}s`);
    console.log(`⏱️  Total time: ${totalTime}s`);
    console.log('═══════════════════════════════════════════════════════');

    // Verify stories will be visible
    const storiesCount = await Story.countDocuments({
      status: 'active',
      expiresAt: { $gt: new Date() },
      createdAt: { $gte: today },
      author: { $in: finalTargetUser.following }
    });

    console.log(`\n📊 Stories now visible in feed: ${storiesCount} stories`);
    console.log(`✅ User ${TARGET_PHONE_NUMBER} can now see stories from ${finalFollowingCount} users in their feed!`);

  } catch (error) {
    console.error('❌ Error following users:', error);
    throw error;
  } finally {
    await disconnectFromDatabase();
  }
}

// Run if called directly
if (require.main === module) {
  followUsersWithStories()
    .then(() => {
      console.log('\n✅ Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { followUsersWithStories };

