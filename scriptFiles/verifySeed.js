/**
 * Database Seed Verification Script
 * Checks the counts of users, posts, matches, and chats in MongoDB.
 */

require('dotenv').config();
const { connectToDatabase, disconnectFromDatabase } = require('../src/dbConfig/db');
const User = require('../src/modules/user/user.model');
const Post = require('../src/modules/social/post/post.model');
const DatingMatch = require('../src/modules/dating/interaction/datingMatch.model');
const DatingChat = require('../src/modules/dating/chat/datingChat.model');
const DatingMessage = require('../src/modules/dating/message/datingMessage.model');
const DatingInteraction = require('../src/modules/dating/interaction/datingInteraction.model');
const UserStatus = require('../src/modules/social/status/status.model');

async function verifySeed() {
  try {
    await connectToDatabase();
    
    const userCount = await User.countDocuments();
    const datingUserCount = await User.countDocuments({ 'dating.isDatingProfileActive': true });
    const postCount = await Post.countDocuments();
    const matchCount = await DatingMatch.countDocuments();
    const chatCount = await DatingChat.countDocuments();
    const messageCount = await DatingMessage.countDocuments();
    const interactionCount = await DatingInteraction.countDocuments();
    const statusCount = await UserStatus.countDocuments();
    
    // Catalog check
    const UserCatalog = require('../src/modules/user/catalog/catalog.model');
    const catalogDoc = await UserCatalog.findOne({});
    const idListCount = catalogDoc?.identificationList?.length || 0;
    const pronounListCount = catalogDoc?.pronounList?.length || 0;
    const orientationListCount = catalogDoc?.orientationList?.length || 0;
    const likeListCount = catalogDoc?.likeList?.length || 0;
    
    console.log('\n📊 SEED DATA VERIFICATION RESULTS:');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`   👥 Total Users:              ${userCount}`);
    console.log(`   💕 Active Dating Profiles:   ${datingUserCount}`);
    console.log(`   📝 Social Posts:             ${postCount}`);
    console.log(`   💑 Dating Matches:           ${matchCount}`);
    console.log(`   💬 Dating Chats:             ${chatCount}`);
    console.log(`   📨 Dating Messages:          ${messageCount}`);
    console.log(`   💖 Dating Interactions:      ${interactionCount}`);
    console.log(`   🟢 User Status Records:      ${statusCount}`);
    console.log(`   📋 Identification Catalog:   ${idListCount} items`);
    console.log(`   📋 Pronoun Catalog:          ${pronounListCount} items`);
    console.log(`   📋 Orientation Catalog:      ${orientationListCount} items`);
    console.log(`   📋 Hobby/Like Catalog:       ${likeListCount} items`);
    console.log('═══════════════════════════════════════════════════════');
    
    const sampleUser = await User.findOne({ phoneNumber: '+919000000001' });
    if (sampleUser) {
      console.log(`\n🔍 Sample Test User Verification (+919000000001):`);
      console.log(`   - Name: ${sampleUser.fullName}`);
      console.log(`   - Username: ${sampleUser.username}`);
      console.log(`   - Profile Pic: ${sampleUser.profilePictureUrl}`);
      console.log(`   - Dating Photos count: ${sampleUser.dating?.photos?.length || 0}`);
      console.log(`   - Verification Status: ${sampleUser.verificationStatus}`);
    } else {
      console.log('\n❌ Sample user +919000000001 not found!');
    }
    
    console.log('\n✅ Verification checks complete.');
  } catch (error) {
    console.error('❌ Verification failed:', error);
  } finally {
    await disconnectFromDatabase();
  }
}

verifySeed();
