/**
 * Add Captions to Posts Seed Script
 * Updates all posts that don't have captions with random captions
 * 
 * Usage:
 * node scriptFiles/addCaptionsToPosts.js
 * 
 * This script will:
 * - Find all posts without captions (or with empty/null captions)
 * - Add random captions to them
 * - Process in parallel batches for speed
 */

require('dotenv').config();
const { connectToDatabase, disconnectFromDatabase } = require('../src/dbConfig/db');
const Post = require('../src/user/social/userModel/postModel');

// Sample captions to use
const SAMPLE_CAPTIONS = [
  'Best day ever!',
  'Living the moment',
  'Pure happiness',
  'Making memories',
  'Life is good',
  'Blessed',
  'Grateful',
  'Amazing vibes',
  'Perfect day',
  'Unforgettable',
  'Sunset vibes 🌅',
  'Adventure awaits!',
  'Good times with great people',
  'Making every moment count',
  'Life is beautiful',
  'Chasing dreams',
  'Living my best life',
  'Grateful for today',
  'Beautiful moments',
  'Creating memories',
  'Just vibing ✨',
  'Good vibes only',
  'Living in the moment',
  'Every day is a new adventure',
  'Making it count',
  'Beautiful day',
  'Feeling blessed',
  'Amazing times',
  'Perfect moments',
  'Life\'s little joys',
  'Sunshine and smiles',
  'Good energy',
  'Positive vibes',
  'Living fully',
  'Making memories that last',
  'Beautiful journey',
  'Grateful heart',
  'Amazing experience',
  'Perfect timing',
  'Life\'s adventures',
  'Good times',
  'Beautiful moments captured',
  'Living life to the fullest',
  'Making the most of today',
  'Amazing day',
  'Perfect vibes',
  'Life is amazing',
  'Grateful for everything',
  'Beautiful memories',
  'Living the dream'
];

// Parallel processing configuration
const BATCH_SIZE = 100; // Process 100 posts at a time

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
      console.log(`   ✅ Updated ${Math.min(i + batchSize, items.length)}/${items.length} posts...`);
    }
  }
  return results;
}

/**
 * Update a single post with a caption
 */
async function updatePostWithCaption(post) {
  try {
    const caption = getRandomElement(SAMPLE_CAPTIONS);
    
    // Update the post with a caption
    post.caption = caption;
    await post.save();
    
    return post;
  } catch (error) {
    console.error(`❌ Error updating post ${post._id}:`, error.message);
    return null;
  }
}

/**
 * Main function to add captions to all posts
 */
async function addCaptionsToPosts() {
  const startTime = Date.now();
  console.log('🚀 Starting Add Captions to Posts...');
  console.log(`⚡ Batch size: ${BATCH_SIZE} (processing ${BATCH_SIZE} posts in parallel)`);

  try {
    // Connect to database
    await connectToDatabase();

    // Find all posts without captions (null, undefined, or empty string)
    console.log('\n📊 Finding posts without captions...');
    const postsWithoutCaptions = await Post.find({
      $or: [
        { caption: { $exists: false } },
        { caption: null },
        { caption: '' },
        { caption: { $regex: /^\s*$/ } } // Only whitespace
      ]
    }).select('_id caption');

    const totalPosts = postsWithoutCaptions.length;
    console.log(`✅ Found ${totalPosts} posts without captions`);

    if (totalPosts === 0) {
      console.log('\n✅ All posts already have captions!');
      return;
    }

    // Update posts in parallel batches
    console.log(`\n📝 Adding captions to ${totalPosts} posts...`);
    const updateStartTime = Date.now();
    
    const updatedPosts = await processInBatches(
      postsWithoutCaptions,
      BATCH_SIZE,
      updatePostWithCaption
    );

    const updateTime = ((Date.now() - updateStartTime) / 1000).toFixed(2);
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);

    // Print summary
    console.log('\n🎉 Add Captions Completed!');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`✅ Posts found without captions: ${totalPosts}`);
    console.log(`✅ Posts updated: ${updatedPosts.length}`);
    console.log(`⏱️  Update time: ${updateTime}s`);
    console.log(`⏱️  Total time: ${totalTime}s`);
    console.log('═══════════════════════════════════════════════════════');

    // Verify the update
    const remainingPosts = await Post.countDocuments({
      $or: [
        { caption: { $exists: false } },
        { caption: null },
        { caption: '' },
        { caption: { $regex: /^\s*$/ } }
      ]
    });

    if (remainingPosts > 0) {
      console.log(`\n⚠️  Warning: ${remainingPosts} posts still don't have captions`);
    } else {
      console.log('\n✅ All posts now have captions!');
    }

  } catch (error) {
    console.error('❌ Error adding captions:', error);
    throw error;
  } finally {
    await disconnectFromDatabase();
  }
}

// Run if called directly
if (require.main === module) {
  addCaptionsToPosts()
    .then(() => {
      console.log('\n✅ Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { addCaptionsToPosts };

