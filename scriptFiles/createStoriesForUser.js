/**
 * Create Stories for Specific User Seed Script
 * Creates at least 400 stories for a specific user by phone number
 * 
 * Usage:
 * node scriptFiles/createStoriesForUser.js
 * 
 * This script will:
 * - Find user by phone number (9939151206)
 * - Create at least 400 stories with real media
 * - Upload media files to S3
 * - Process in parallel batches for speed
 */

require('dotenv').config();
const { connectToDatabase, disconnectFromDatabase } = require('../src/dbConfig/db');
const User = require('../src/user/auth/model/userAuthModel');
const Story = require('../src/user/social/userModel/storyModel');
const { uploadToS3 } = require('../src/services/s3Service');
const fs = require('fs');
const path = require('path');

// Target user phone number
const TARGET_PHONE_NUMBER = '9939151206';

// Media files from vibgyor-backend/media folder
const MEDIA_FOLDER = path.join(__dirname, '../media');
const MEDIA_FILES = [
  {
    filename: 'harshpathak1160-20251205-0001.jpg',
    type: 'image',
    mimeType: 'image/jpeg'
  },
  {
    filename: 'harshpathak1160-20251205-0002.jpg',
    type: 'image',
    mimeType: 'image/jpeg'
  },
  {
    filename: 'harshpathak1160-20251205-0003.jpg',
    type: 'image',
    mimeType: 'image/jpeg'
  },
  {
    filename: 'WhatsApp Video 2025-12-05 at 4.51.55 PM.mp4',
    type: 'video',
    mimeType: 'video/mp4'
  }
];

// Sample story content
const SAMPLE_STORY_CONTENT = [
  'Just had an amazing day! 🌟',
  'Life is beautiful when you appreciate the little things ✨',
  'New adventures await! 🚀',
  'Grateful for today 🙏',
  'Making memories that last forever 📸',
  'Living my best life! 💫',
  'Every moment is a new beginning 🌈',
  'Chasing dreams and catching them! ⭐',
  'Surrounded by amazing people ❤️',
  'Today was perfect! ☀️',
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
  'Creating memories'
];

// Parallel processing configuration
const BATCH_SIZE = 50; // Process 50 stories at a time
const MIN_STORIES = 400; // Minimum number of stories to create

// Utility functions
const getRandomElement = (array) => array[Math.floor(Math.random() * array.length)];

const getRandomDate = (daysAgo = 1) => {
  const now = new Date();
  const pastDate = new Date(now.getTime() - (Math.random() * daysAgo * 24 * 60 * 60 * 1000));
  return pastDate;
};

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
    
    if ((i + batchSize) % (batchSize * 5) === 0 || i + batchSize >= items.length) {
      console.log(`   ✅ Processed ${Math.min(i + batchSize, items.length)}/${items.length} stories...`);
    }
  }
  return results;
}

/**
 * Upload media file to S3 and get upload result
 */
async function uploadMediaFile(userId, mediaFile, category = 'stories', verbose = false) {
  try {
    const filePath = path.join(MEDIA_FOLDER, mediaFile.filename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      if (verbose) console.warn(`⚠️ Media file not found: ${filePath}`);
      return null;
    }

    // Read file buffer
    const buffer = fs.readFileSync(filePath);
    const fileStats = fs.statSync(filePath);

    if (verbose) {
      console.log(`📤 Uploading ${mediaFile.filename} (${(fileStats.size / 1024 / 1024).toFixed(2)} MB) for user ${userId}...`);
    }

    // Upload to S3 (this will automatically:
    // - Generate blurhash for images
    // - Use CloudFront if configured
    // - Generate responsive URLs
    const uploadResult = await uploadToS3({
      buffer: buffer,
      contentType: mediaFile.mimeType,
      userId: userId,
      category: category,
      type: mediaFile.type === 'image' ? 'image' : 'video',
      filename: mediaFile.filename,
      metadata: {
        originalName: mediaFile.filename,
        uploadedAt: new Date().toISOString(),
        seedScript: 'createStoriesForUser'
      }
    });

    if (verbose) {
      console.log(`✅ Uploaded ${mediaFile.filename}: ${uploadResult.url.substring(0, 60)}...`);
      if (uploadResult.blurhash) {
        console.log(`   📸 BlurHash: ${uploadResult.blurhash.substring(0, 20)}...`);
      }
    }

    return uploadResult;
  } catch (error) {
    console.error(`❌ Error uploading ${mediaFile.filename}:`, error.message);
    return null;
  }
}

/**
 * Create a single story with media
 */
async function createSingleStory({ author, mediaFile, mediaCache, allUsers }, index) {
  const cacheKey = `${author._id}_story_${mediaFile.filename}_${index}`;
  
  // Upload media if not cached (with unique cache key to allow multiple stories with same media)
  let uploadResult;
  if (!mediaCache[cacheKey]) {
    uploadResult = await uploadMediaFile(author._id, mediaFile, 'stories');
    if (uploadResult) {
      mediaCache[cacheKey] = uploadResult;
    } else {
      return null; // Skip if upload failed
    }
  } else {
    uploadResult = mediaCache[cacheKey];
  }

  const content = Math.random() > 0.7 ? getRandomElement(SAMPLE_STORY_CONTENT) : null;
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

  const media = {
    type: uploadResult.type,
    url: uploadResult.url,
    thumbnail: uploadResult.thumbnail || null,
    filename: uploadResult.filename,
    fileSize: uploadResult.size,
    mimeType: uploadResult.contentType,
    duration: uploadResult.duration || null,
    dimensions: uploadResult.dimensions || null,
    s3Key: uploadResult.key,
    blurhash: uploadResult.blurhash || null
  };

  // Add some views (random users viewing the story)
  const numViews = Math.floor(Math.random() * 50);
  const views = [];
  for (let j = 0; j < numViews && j < allUsers.length; j++) {
    const viewer = getRandomElement(allUsers);
    if (viewer._id.toString() !== author._id.toString() && !views.find(v => v.user.toString() === viewer._id.toString())) {
      views.push({
        user: viewer._id,
        viewedAt: getRandomDate(1),
        viewDuration: Math.floor(Math.random() * 10) + 1,
        isLiked: Math.random() > 0.7 // 30% chance of liking
      });
    }
  }

  const story = {
    author: author._id,
    content: content,
    media: media,
    privacy: getRandomElement(['public', 'followers', 'close_friends']),
    status: 'active',
    expiresAt: expiresAt,
    views: views,
    analytics: {
      viewsCount: views.length,
      likesCount: views.filter(v => v.isLiked).length,
      repliesCount: 0,
      sharesCount: 0
    },
    createdAt: getRandomDate(1)
  };

  try {
    const createdStory = await Story.create(story);
    return createdStory;
  } catch (error) {
    console.error(`❌ Error creating story:`, error.message);
    return null;
  }
}

/**
 * Create stories for a specific user
 */
async function createStoriesForUser(phoneNumber, minStories = 400) {
  const startTime = Date.now();
  console.log('🚀 Starting Create Stories for User...');
  console.log(`📱 Target phone number: ${phoneNumber}`);
  console.log(`📊 Minimum stories to create: ${minStories}`);
  console.log(`⚡ Batch size: ${BATCH_SIZE} (processing ${BATCH_SIZE} stories in parallel)`);
  console.log('📁 Media folder:', MEDIA_FOLDER);
  console.log('📦 Media files:', MEDIA_FILES.map(f => f.filename).join(', '));

  try {
    // Connect to database
    await connectToDatabase();

    // Find the target user
    console.log(`\n🔍 Finding user with phone number: ${phoneNumber}...`);
    const user = await User.findOne({ phoneNumber: phoneNumber });
    
    if (!user) {
      console.error(`❌ User with phone number ${phoneNumber} not found!`);
      console.error('Please ensure the user exists in the database.');
      process.exit(1);
    }

    console.log(`✅ Found user: ${user.username || user.fullName || user.email} (ID: ${user._id})`);

    // Check if media folder exists
    if (!fs.existsSync(MEDIA_FOLDER)) {
      console.error(`❌ Media folder not found: ${MEDIA_FOLDER}`);
      console.error('Please ensure media files are in vibgyor-backend/media/');
      process.exit(1);
    }

    // Verify media files exist
    const missingFiles = [];
    for (const mediaFile of MEDIA_FILES) {
      const filePath = path.join(MEDIA_FOLDER, mediaFile.filename);
      if (!fs.existsSync(filePath)) {
        missingFiles.push(mediaFile.filename);
      }
    }

    if (missingFiles.length > 0) {
      console.error(`❌ Missing media files: ${missingFiles.join(', ')}`);
      console.error('Please ensure all media files are in vibgyor-backend/media/');
      process.exit(1);
    }

    console.log('✅ All media files found\n');

    // Get all users for views (to simulate story views)
    const allUsers = await User.find({}).select('_id').limit(1000);
    console.log(`📊 Found ${allUsers.length} users for story views simulation\n`);

    // Prepare story creation tasks
    console.log(`📝 Preparing ${minStories} story creation tasks...`);
    const mediaCache = {}; // Cache uploaded media
    const storyTasks = [];

    // Create tasks with random media files
    for (let i = 0; i < minStories; i++) {
      const mediaFile = getRandomElement(MEDIA_FILES);
      storyTasks.push({ 
        author: user, 
        mediaFile: mediaFile, 
        mediaCache: mediaCache,
        allUsers: allUsers
      });
    }

    console.log(`✅ Prepared ${storyTasks.length} story tasks\n`);

    // Create stories in parallel batches
    const storyStartTime = Date.now();
    console.log(`📖 Creating ${minStories} stories in parallel batches...`);
    
    const stories = await processInBatches(storyTasks, BATCH_SIZE, createSingleStory);

    const storyTime = ((Date.now() - storyStartTime) / 1000).toFixed(2);
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);

    // Print summary
    console.log('\n🎉 Create Stories Completed!');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`✅ User: ${user.username || user.fullName || user.email} (${phoneNumber})`);
    console.log(`✅ Stories created: ${stories.length}`);
    console.log(`⏱️  Story creation time: ${storyTime}s`);
    console.log(`⏱️  Total time: ${totalTime}s`);
    console.log('═══════════════════════════════════════════════════════');

    // Verify the stories were created
    const userStoriesCount = await Story.countDocuments({ author: user._id });
    console.log(`\n📊 Total stories for this user: ${userStoriesCount}`);

    if (stories.length < minStories) {
      console.log(`\n⚠️  Warning: Created ${stories.length} stories, but requested ${minStories}`);
    } else {
      console.log(`\n✅ Successfully created at least ${minStories} stories!`);
    }

  } catch (error) {
    console.error('❌ Error creating stories:', error);
    throw error;
  } finally {
    await disconnectFromDatabase();
  }
}

// Run if called directly
if (require.main === module) {
  createStoriesForUser(TARGET_PHONE_NUMBER, MIN_STORIES)
    .then(() => {
      console.log('\n✅ Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { createStoriesForUser };

