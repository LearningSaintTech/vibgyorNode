/**
 * Add up to 500 followers to a user (identified by phone number) for testing.
 *
 * Usage:
 *   node scriptFiles/addFollowersForPhone.js
 *
 * What it does:
 * - Finds the user by phone number (configured below).
 * - Samples up to 500 other active users.
 * - Adds them to the target user's followers (deduped).
 * - Also adds the target user to each sampled user's following (to keep the relationship consistent).
 */

require('dotenv').config();
const { connectToDatabase, disconnectFromDatabase } = require('../src/dbConfig/db');
const User = require('../src/user/auth/model/userAuthModel');

// ---------- CONFIG ----------
const TARGET_PHONE = '9829699382'; // Phone number of the user to receive followers
const MAX_FOLLOWERS = 500;         // How many followers to add (max)
// -----------------------------

async function addFollowers() {
  await connectToDatabase();
  console.log('✅ Connected to database');

  // 1) Find target user
  const targetUser = await User.findOne({ phoneNumber: TARGET_PHONE }).select('_id username fullName followers following');
  if (!targetUser) {
    throw new Error(`User with phoneNumber ${TARGET_PHONE} not found`);
  }

  const targetId = targetUser._id;
  const alreadyFollowers = new Set((targetUser.followers || []).map(id => String(id)));

  console.log(`👤 Target user: ${targetUser.username || targetUser.fullName || targetId}`);
  console.log(`   Existing followers: ${alreadyFollowers.size}`);

  // 2) Sample up to MAX_FOLLOWERS other active users (exclude target)
  const sampleSize = MAX_FOLLOWERS;
  const sampledUsers = await User.aggregate([
    { $match: { _id: { $ne: targetId }, isActive: true } },
    { $sample: { size: sampleSize } },
    { $project: { _id: 1 } }
  ]);

  if (!sampledUsers || sampledUsers.length === 0) {
    console.log('⚠️ No users available to add as followers.');
    return;
  }

  const followerIds = sampledUsers
    .map(u => String(u._id))
    .filter(id => !alreadyFollowers.has(id))
    .slice(0, MAX_FOLLOWERS);

  if (followerIds.length === 0) {
    console.log('⚠️ All sampled users are already followers. Nothing to do.');
    return;
  }

  console.log(`👥 Will add ${followerIds.length} followers to target user`);

  // 3) Add followers to target user (deduped)
  await User.updateOne(
    { _id: targetId },
    { $addToSet: { followers: { $each: followerIds } } }
  );

  // 4) Add target to each sampled user's following (keep relationship consistent)
  const bulkOps = followerIds.map(followerId => ({
    updateOne: {
      filter: { _id: followerId },
      update: { $addToSet: { following: targetId } }
    }
  }));

  if (bulkOps.length > 0) {
    const bulkResult = await User.bulkWrite(bulkOps, { ordered: false });
    console.log('🔄 Updated following for sampled users:', {
      matched: bulkResult.matchedCount,
      modified: bulkResult.modifiedCount
    });
  }

  // 5) Fetch final counts
  const refreshed = await User.findById(targetId).select('followers following');
  console.log('✅ Done');
  console.log('   Followers count:', refreshed.followers?.length || 0);
  console.log('   Following count:', refreshed.following?.length || 0);
}

addFollowers()
  .catch((err) => {
    console.error('❌ Error:', err.message || err);
  })
  .finally(async () => {
    await disconnectFromDatabase();
    console.log('🔌 Disconnected');
  });






