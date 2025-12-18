const mongoose = require('mongoose');
require('dotenv').config();

// Import Post model
const Post = require('./src/user/social/userModel/postModel');

// Sample hashtags array (same as in comprehensiveSeed.js)
const SAMPLE_HASHTAGS = [
  'photography', 'photooftheday', 'instagood', 'picoftheday', 'beautiful', 'nature',
  'travel', 'adventure', 'explore', 'wanderlust', 'vacation', 'holiday', 'sunset',
  'sunrise', 'landscape', 'mountains', 'ocean', 'beach', 'city', 'urban', 'street',
  'portrait', 'selfie', 'fashion', 'style', 'ootd', 'outfit', 'fashionista', 'trendy',
  'food', 'foodie', 'foodporn', 'delicious', 'yummy', 'cooking', 'recipe', 'restaurant',
  'fitness', 'workout', 'gym', 'fitnessmotivation', 'health', 'wellness', 'yoga',
  'lifestyle', 'life', 'daily', 'motivation', 'inspiration', 'quote', 'positive',
  'happy', 'blessed', 'grateful', 'love', 'family', 'friends', 'friendship', 'memories',
  'art', 'artist', 'creative', 'design', 'drawing', 'painting', 'sketch', 'digitalart',
  'music', 'musician', 'song', 'concert', 'festival', 'dance', 'party', 'celebration',
  'sports', 'football', 'cricket', 'basketball', 'tennis', 'running', 'cycling',
  'technology', 'tech', 'gadgets', 'innovation', 'startup', 'business', 'entrepreneur',
  'india', 'mumbai', 'delhi', 'bangalore', 'culture', 'tradition', 'festival',
  'wedding', 'celebration', 'birthday', 'anniversary', 'graduation', 'achievement',
  'pet', 'dog', 'cat', 'animals', 'wildlife', 'naturelovers', 'outdoors', 'camping',
  'coffee', 'tea', 'drinks', 'cocktail', 'wine', 'dining', 'brunch', 'breakfast',
  'makeup', 'beauty', 'skincare', 'cosmetics', 'glam', 'makeupartist', 'beautyblogger',
  'cars', 'automotive', 'bike', 'motorcycle', 'travel', 'roadtrip', 'journey',
  'architecture', 'building', 'interior', 'design', 'home', 'decor', 'minimalist',
  'vintage', 'retro', 'classic', 'modern', 'contemporary', 'aesthetic', 'vibes'
];

// Database connection
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/vib';
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB:', mongoURI);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Utility functions
const getRandomElements = (array, count) => {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, array.length));
};

// Generate random hashtags for a post (3-10 hashtags)
const generateHashtags = () => {
  const hashtagCount = Math.floor(Math.random() * 8) + 3; // 3 to 10 hashtags
  const selectedHashtags = getRandomElements(SAMPLE_HASHTAGS, hashtagCount);
  // Return lowercase hashtags without '#' symbol (as per model schema)
  return selectedHashtags.map(tag => tag.toLowerCase().trim());
};

// Add hashtags to existing posts
const addHashtagsToPosts = async (options = {}) => {
  const {
    updateAll = false, // If true, update all posts. If false, only update posts without hashtags
    batchSize = 100, // Process posts in batches
    skip = 0 // Skip first N posts (useful for resuming)
  } = options;

  try {
    console.log('\n🚀 Starting Hashtag Update Script...\n');
    console.log('='.repeat(70));
    console.log(`📊 Configuration:`);
    console.log(`   Update all posts: ${updateAll ? 'Yes' : 'No (only posts without hashtags)'}`);
    console.log(`   Batch size: ${batchSize}`);
    console.log(`   Skip first: ${skip} posts`);
    console.log('='.repeat(70));

    // Build query
    const query = updateAll 
      ? { status: 'published' } // Update all published posts
      : { 
          status: 'published',
          $or: [
            { hashtags: { $exists: false } },
            { hashtags: { $size: 0 } },
            { hashtags: null }
          ]
        }; // Only posts without hashtags

    // Count total posts to update
    const totalPosts = await Post.countDocuments(query);
    console.log(`\n📝 Found ${totalPosts} posts to update\n`);

    if (totalPosts === 0) {
      console.log('✅ No posts need updating. All posts already have hashtags!\n');
      return { updated: 0, skipped: 0, errors: 0 };
    }

    let updated = 0;
    let skipped = 0;
    let errors = 0;
    let processed = 0;

    // Process posts in batches
    const totalBatches = Math.ceil((totalPosts - skip) / batchSize);
    
    for (let batch = 0; batch < totalBatches; batch++) {
      const batchStart = skip + (batch * batchSize);
      const batchEnd = Math.min(batchStart + batchSize, totalPosts);
      
      console.log(`\n📦 Processing batch ${batch + 1}/${totalBatches} (posts ${batchStart + 1}-${batchEnd})...`);

      // Fetch posts in current batch
      const posts = await Post.find(query)
        .skip(batchStart)
        .limit(batchSize)
        .select('_id hashtags');

      if (posts.length === 0) {
        console.log('   ⚠️  No posts found in this batch');
        break;
      }

      // Update each post in the batch
      for (const post of posts) {
        try {
          // Skip if post already has hashtags and we're not updating all
          if (!updateAll && post.hashtags && post.hashtags.length > 0) {
            skipped++;
            continue;
          }

          // Generate new hashtags
          const hashtags = generateHashtags();

          // Update post
          await Post.updateOne(
            { _id: post._id },
            { $set: { hashtags } }
          );

          updated++;
          processed++;

          // Progress update every 10 posts
          if (processed % 10 === 0) {
            console.log(`   ✅ Updated ${processed}/${posts.length} posts in this batch...`);
          }
        } catch (error) {
          console.error(`   ❌ Error updating post ${post._id}:`, error.message);
          errors++;
        }
      }

      console.log(`   ✅ Completed batch ${batch + 1}/${totalBatches}`);
      console.log(`   📊 Progress: ${processed}/${totalPosts} posts processed`);
    }

    // Final summary
    console.log('\n' + '='.repeat(70));
    console.log('\n🎉 Hashtag update completed!\n');
    console.log('📊 Final Statistics:\n');
    console.log(`   ✅ Updated: ${updated} posts`);
    console.log(`   ⏭️  Skipped: ${skipped} posts`);
    console.log(`   ❌ Errors: ${errors} posts`);
    console.log(`   📝 Total processed: ${processed} posts\n`);

    return { updated, skipped, errors, total: processed };
  } catch (error) {
    console.error('\n❌ Error in addHashtagsToPosts:', error);
    console.error('Error details:', error.message);
    console.error('Stack:', error.stack);
    throw error;
  }
};

// Main function
const main = async () => {
  try {
    await connectDB();

    // Parse command line arguments
    const args = process.argv.slice(2);
    const updateAll = args.includes('--all') || args.includes('-a');
    const batchSize = parseInt(args.find(arg => arg.startsWith('--batch-size='))?.split('=')[1]) || 100;
    const skip = parseInt(args.find(arg => arg.startsWith('--skip='))?.split('=')[1]) || 0;

    await addHashtagsToPosts({
      updateAll,
      batchSize,
      skip
    });
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed\n');
    process.exit(0);
  }
};

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { addHashtagsToPosts };

