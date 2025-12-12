/**
 * Optimization Test Seed Script
 * Creates 500 users and 2000+ posts/stories using actual media files
 * Tests: Image compression, BlurHash, CloudFront, Video compression, Thumbnails
 * 
 * Usage:
 * node scriptFiles/seedOptimizationTest.js
 * 
 * This script will:
 * - Create 500 users
 * - Upload media files to S3 (tests compression, blurhash, CloudFront)
 * - Create 2000+ posts with real media
 * - Create stories with real media
 * - Test all optimization features
 */

require('dotenv').config();
const { connectToDatabase, disconnectFromDatabase } = require('../src/dbConfig/db');
const User = require('../src/user/auth/model/userAuthModel');
const Post = require('../src/user/social/userModel/postModel');
const Story = require('../src/user/social/userModel/storyModel');
const { uploadToS3 } = require('../src/services/s3Service');
const fs = require('fs');
const path = require('path');
const { faker } = require('@faker-js/faker');

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

// Sample data
const SAMPLE_POST_CONTENT = [
  'Just had an amazing day! 🌟',
  'Life is beautiful when you appreciate the little things ✨',
  'New adventures await! 🚀',
  'Grateful for today 🙏',
  'Making memories that last forever 📸',
  'Living my best life! 💫',
  'Every moment is a new beginning 🌈',
  'Chasing dreams and catching them! ⭐',
  'Surrounded by amazing people ❤️',
  'Today was perfect! ☀️'
];

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
  'Unforgettable'
];

const SAMPLE_HASHTAGS = [
  'vibgyor', 'life', 'happiness', 'memories', 'adventure',
  'photography', 'lifestyle', 'beautiful', 'amazing', 'blessed',
  'grateful', 'love', 'friends', 'family', 'travel',
  'nature', 'sunset', 'sunrise', 'beach', 'mountains'
];

// Parallel processing configuration
const BATCH_SIZE = 50; // Process 50 items at a time

// Utility functions
const getRandomElement = (array) => array[Math.floor(Math.random() * array.length)];
const getRandomElements = (array, count) => {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, array.length));
};

const getRandomDate = (daysAgo = 30) => {
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
      console.log(`   ✅ Processed ${Math.min(i + batchSize, items.length)}/${items.length} items...`);
    }
  }
  return results;
}

/**
 * Upload media file to S3 and get upload result
 */
async function uploadMediaFile(userId, mediaFile, category = 'posts', verbose = false) {
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
        seedScript: 'true'
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
 * Create a single user
 */
async function createSingleUser(index) {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  const username = faker.internet.username({ firstName, lastName }).toLowerCase();
  const email = faker.internet.email({ firstName, lastName });
  const phoneNumber = faker.phone.number('##########');

  const userData = {
    phoneNumber: phoneNumber,
    countryCode: '+91',
    email: email,
    username: username,
    fullName: `${firstName} ${lastName}`,
    bio: faker.person.bio(),
    dateOfBirth: faker.date.birthdate({ min: 18, max: 65, mode: 'age' }),
    gender: getRandomElement(['male', 'female', 'other']),
    pronouns: getRandomElement(['he/him', 'she/her', 'they/them', 'other']),
    location: {
      city: faker.location.city(),
      state: faker.location.state(),
      country: 'India',
      coordinates: {
        lat: parseFloat(faker.location.latitude()),
        lng: parseFloat(faker.location.longitude())
      }
    },
    interests: getRandomElements(['music', 'travel', 'photography', 'food', 'sports', 'art', 'technology', 'fashion'], 3),
    likes: getRandomElements(['pizza', 'coffee', 'books', 'movies', 'gaming', 'fitness'], 3),
    isVerified: Math.random() > 0.9, // 10% verified
    verificationStatus: Math.random() > 0.9 ? 'approved' : 'pending',
    privacySettings: {
      profileVisibility: getRandomElement(['public', 'followers', 'private']),
      allowCommenting: Math.random() > 0.2, // 80% allow commenting
      allowMentions: true,
      allowTags: true
    }
  };

  try {
    const user = new User(userData);
    await user.save();
    return user;
  } catch (error) {
    console.error(`❌ Error creating user ${index + 1}:`, error.message);
    return null;
  }
}

/**
 * Create users in parallel batches
 */
async function createUsers(count = 500) {
  console.log(`\n👥 Creating ${count} users in parallel batches...`);
  
  const userIndices = Array.from({ length: count }, (_, i) => i);
  const users = await processInBatches(userIndices, BATCH_SIZE, createSingleUser);

  console.log(`✅ Created ${users.length} users`);
  return users;
}

/**
 * Create a single post with media
 */
async function createSinglePost({ author, mediaFile, users, mediaCache }) {
  const cacheKey = `${author._id}_${mediaFile.filename}`;
  
  // Upload media if not cached (with thread-safe check)
  let uploadResult;
  if (!mediaCache[cacheKey]) {
    uploadResult = await uploadMediaFile(author._id, mediaFile, 'posts');
    if (uploadResult) {
      mediaCache[cacheKey] = uploadResult;
    } else {
      return null; // Skip if upload failed
    }
  } else {
    uploadResult = mediaCache[cacheKey];
  }

  const hashtags = getRandomElements(SAMPLE_HASHTAGS, Math.floor(Math.random() * 5) + 1);
  const visibility = getRandomElement(['public', 'followers', 'public']);
  const publishedAt = getRandomDate(30);

  // Create media array for post
  const media = [{
    type: uploadResult.type,
    url: uploadResult.url,
    thumbnail: uploadResult.thumbnail || null,
    filename: uploadResult.filename,
    fileSize: uploadResult.size,
    mimeType: uploadResult.contentType,
    duration: uploadResult.duration || null,
    dimensions: uploadResult.dimensions || null,
    s3Key: uploadResult.key,
    blurhash: uploadResult.blurhash || null,
    responsiveUrls: uploadResult.responsiveUrls || null
  }];

  // Add some likes and comments
  const numLikes = Math.floor(Math.random() * 100);
  const likes = [];
  for (let k = 0; k < numLikes && k < users.length; k++) {
    const liker = getRandomElement(users);
    if (liker._id.toString() !== author._id.toString()) {
      likes.push({
        user: liker._id,
        likedAt: getRandomDate(7)
      });
    }
  }

  const numComments = Math.floor(Math.random() * 20);
  const comments = [];
  for (let k = 0; k < numComments && k < users.length; k++) {
    const commenter = getRandomElement(users);
    if (commenter._id.toString() !== author._id.toString()) {
      comments.push({
        user: commenter._id,
        content: getRandomElement(['Amazing!', 'Love this!', 'So beautiful!', 'Great post!', 'Awesome!']),
        createdAt: getRandomDate(7)
      });
    }
  }

  const post = {
    author: author._id,
    media: media,
    hashtags: hashtags,
    visibility: visibility,
    commentVisibility: getRandomElement(['everyone', 'followers', 'none']),
    status: 'published',
    publishedAt: publishedAt,
    likes: likes,
    comments: comments,
    shares: [],
    views: [],
    likesCount: likes.length,
    commentsCount: comments.length,
    sharesCount: Math.floor(Math.random() * 10),
    viewsCount: Math.floor(Math.random() * 500),
    isReported: false,
    reports: [],
    analytics: {
      reach: Math.floor(Math.random() * 1000),
      impressions: Math.floor(Math.random() * 1500),
      engagement: likes.length + comments.length
    }
  };

  try {
    const createdPost = await Post.create(post);
    return createdPost;
  } catch (error) {
    console.error(`❌ Error creating post:`, error.message);
    return null;
  }
}

/**
 * Create posts with real media in parallel
 */
async function createPosts(users, count = 2000) {
  console.log(`\n📝 Creating ${count} posts with real media in parallel...`);
  const mediaCache = {}; // Cache uploaded media to reuse

  // Ensure at least 4 posts per user (one for each media file)
  const minPostsPerUser = 4;
  const totalMinimumPosts = users.length * minPostsPerUser;
  const actualPostCount = Math.max(count, totalMinimumPosts);

  // Prepare post creation tasks
  const postTasks = [];

  // First pass: Create minimum posts for each user with all media files
  for (let i = 0; i < users.length; i++) {
    const author = users[i];
    for (let j = 0; j < MEDIA_FILES.length; j++) {
      if (postTasks.length >= actualPostCount) break;
      postTasks.push({ author, mediaFile: MEDIA_FILES[j], users, mediaCache });
    }
    if (postTasks.length >= actualPostCount) break;
  }

  // Second pass: Create additional random posts
  while (postTasks.length < actualPostCount) {
    const author = getRandomElement(users);
    const mediaFile = getRandomElement(MEDIA_FILES);
    postTasks.push({ author, mediaFile, users, mediaCache });
  }

  // Process posts in parallel batches
  const posts = await processInBatches(postTasks, BATCH_SIZE, createSinglePost);

  console.log(`✅ Created ${posts.length} posts`);
  return posts;
}

/**
 * Create a single story with media
 */
async function createSingleStory({ author, mediaFile, users, mediaCache }) {
  const cacheKey = `${author._id}_story_${mediaFile.filename}`;

  // Upload media if not cached
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

  const content = Math.random() > 0.7 ? getRandomElement(SAMPLE_POST_CONTENT) : null;
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

  // Add some views
  const numViews = Math.floor(Math.random() * 50);
  const views = [];
  for (let j = 0; j < numViews && j < users.length; j++) {
    const viewer = getRandomElement(users);
    if (viewer._id.toString() !== author._id.toString() && !views.find(v => v.user.toString() === viewer._id.toString())) {
      views.push({
        user: viewer._id,
        viewedAt: getRandomDate(1)
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
    reactions: [],
    analytics: {
      viewsCount: views.length,
      reactionsCount: 0,
      repliesCount: 0,
      sharesCount: 0,
      reach: Math.floor(Math.random() * 100),
      impressions: Math.floor(Math.random() * 150)
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
 * Create stories with real media in parallel
 */
async function createStories(users, count = 500) {
  console.log(`\n📖 Creating ${count} stories with real media in parallel...`);
  const mediaCache = {};

  // Ensure at least 1 story per user
  const minStoriesPerUser = 1;
  const totalMinimumStories = users.length * minStoriesPerUser;
  const actualStoryCount = Math.max(count, totalMinimumStories);

  // Prepare story creation tasks
  const storyTasks = [];
  for (let i = 0; i < users.length && storyTasks.length < actualStoryCount; i++) {
    const author = users[i];
    const mediaFile = getRandomElement(MEDIA_FILES);
    storyTasks.push({ author, mediaFile, users, mediaCache });
  }

  // Process stories in parallel batches
  const stories = await processInBatches(storyTasks, BATCH_SIZE, createSingleStory);

  console.log(`✅ Created ${stories.length} stories`);
  return stories;
}

/**
 * Main seed function
 */
async function seedOptimizationTest() {
  const startTime = Date.now();
  console.log('🚀 Starting Optimization Test Seeding (Parallel Processing)...');
  console.log(`⚡ Batch size: ${BATCH_SIZE} (processing ${BATCH_SIZE} items in parallel)`);
  console.log('📁 Media folder:', MEDIA_FOLDER);
  console.log('📦 Media files:', MEDIA_FILES.map(f => f.filename).join(', '));

  try {
    // Connect to database
    await connectToDatabase();

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

    // Create users
    const userStartTime = Date.now();
    const users = await createUsers(500);
    const userTime = ((Date.now() - userStartTime) / 1000).toFixed(2);
    console.log(`⏱️  Users created in ${userTime}s\n`);

    // Create posts (at least 2000)
    const postStartTime = Date.now();
    const posts = await createPosts(users, 2000);
    const postTime = ((Date.now() - postStartTime) / 1000).toFixed(2);
    console.log(`⏱️  Posts created in ${postTime}s\n`);

    // Create stories (at least 500, one per user minimum)
    const storyStartTime = Date.now();
    const stories = await createStories(users, 500);
    const storyTime = ((Date.now() - storyStartTime) / 1000).toFixed(2);
    console.log(`⏱️  Stories created in ${storyTime}s\n`);

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);

    // Print summary
    console.log('\n🎉 Optimization Test Seeding Completed!');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`✅ Users created: ${users.length} (${userTime}s)`);
    console.log(`✅ Posts created: ${posts.length} (${postTime}s)`);
    console.log(`✅ Stories created: ${stories.length} (${storyTime}s)`);
    console.log(`⏱️  Total time: ${totalTime}s`);
    console.log('═══════════════════════════════════════════════════════');
    console.log('\n📊 Optimization Features Tested:');
    console.log('   ✅ Image compression (via uploadToS3)');
    console.log('   ✅ BlurHash generation (automatic for images)');
    console.log('   ✅ CloudFront URLs (if configured)');
    console.log('   ✅ Responsive image URLs');
    console.log('   ✅ Video uploads');
    console.log('   ✅ S3 storage');
    console.log('   ✅ Parallel processing (faster seeding)');
    console.log('\n🧪 Next Steps:');
    console.log('   1. Check backend logs for BlurHash generation');
    console.log('   2. Check API responses include blurhash');
    console.log('   3. Test feed loading in app');
    console.log('   4. Verify CloudFront URLs in responses');
    console.log('   5. Test image display with BlurHash placeholders');

  } catch (error) {
    console.error('❌ Seeding error:', error);
    throw error;
  } finally {
    await disconnectFromDatabase();
  }
}

// Run if called directly
if (require.main === module) {
  seedOptimizationTest()
    .then(() => {
      console.log('\n✅ Seeding completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedOptimizationTest };

