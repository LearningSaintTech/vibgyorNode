/**
 * Create Test Users for Pagination Testing
 * Creates at least 100 new users for testing pagination and other features
 * 
 * Usage:
 * node scriptFiles/createTestUsers.js
 * 
 * This script will:
 * - Create 100+ new users with realistic data
 * - Process in parallel batches for speed
 * - Optionally create some posts/stories for these users
 */

require('dotenv').config();
const { connectToDatabase, disconnectFromDatabase } = require('../src/dbConfig/db');
const User = require('../src/user/auth/model/userAuthModel');
const Post = require('../src/user/social/userModel/postModel');
const Story = require('../src/user/social/userModel/storyModel');
const { faker } = require('@faker-js/faker');

// Configuration
const USER_COUNT = 100; // Number of users to create
const CREATE_POSTS = true; // Whether to create posts for these users
const POSTS_PER_USER = 2; // Number of posts per user
const CREATE_STORIES = true; // Whether to create stories for these users
const STORIES_PER_USER = 5; // Number of stories per user (increased for better testing)

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
    
    if ((i + batchSize) % (batchSize * 2) === 0 || i + batchSize >= items.length) {
      console.log(`   ✅ Processed ${Math.min(i + batchSize, items.length)}/${items.length} items...`);
    }
  }
  return results;
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
    interests: getRandomElements(['music', 'travel', 'photography', 'food', 'sports', 'art', 'technology', 'fashion', 'gaming', 'fitness'], 3),
    likes: getRandomElements(['pizza', 'coffee', 'books', 'movies', 'gaming', 'fitness', 'travel', 'photography'], 3),
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
async function createUsers(count = 100) {
  console.log(`\n👥 Creating ${count} users in parallel batches...`);
  
  const userIndices = Array.from({ length: count }, (_, i) => i);
  const users = await processInBatches(userIndices, BATCH_SIZE, createSingleUser);

  console.log(`✅ Created ${users.length} users`);
  return users;
}

/**
 * Create a simple post for a user (without media for speed)
 */
async function createSimplePost(author, allUsers) {
  const sampleCaptions = [
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

  const hashtags = getRandomElements(
    ['vibgyor', 'life', 'happiness', 'memories', 'adventure', 'photography', 'lifestyle', 'beautiful', 'amazing', 'blessed'],
    Math.floor(Math.random() * 5) + 1
  );

  const numLikes = Math.floor(Math.random() * 50);
  const likes = [];
  for (let k = 0; k < numLikes && k < allUsers.length; k++) {
    const liker = getRandomElement(allUsers);
    if (liker._id.toString() !== author._id.toString()) {
      likes.push({
        user: liker._id,
        likedAt: getRandomDate(7)
      });
    }
  }

  const numComments = Math.floor(Math.random() * 10);
  const comments = [];
  for (let k = 0; k < numComments && k < allUsers.length; k++) {
    const commenter = getRandomElement(allUsers);
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
    caption: getRandomElement(sampleCaptions),
    hashtags: hashtags,
    visibility: getRandomElement(['public', 'followers', 'public']),
    commentVisibility: getRandomElement(['everyone', 'followers', 'none']),
    status: 'published',
    publishedAt: getRandomDate(30),
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
 * Create posts for users
 */
async function createPostsForUsers(users, postsPerUser = 2) {
  if (!CREATE_POSTS || postsPerUser === 0) {
    return [];
  }

  console.log(`\n📝 Creating ${postsPerUser} posts per user (${users.length * postsPerUser} total)...`);
  
  const postTasks = [];
  for (const user of users) {
    for (let i = 0; i < postsPerUser; i++) {
      postTasks.push({ author: user, allUsers: users });
    }
  }

  const posts = await processInBatches(postTasks, BATCH_SIZE, (task) => 
    createSimplePost(task.author, task.allUsers)
  );

  console.log(`✅ Created ${posts.length} posts`);
  return posts;
}

/**
 * Create a simple story for a user (without media for speed)
 */
async function createSimpleStory(author, allUsers) {
  const sampleContent = [
    'Just had an amazing day! 🌟',
    'Life is beautiful ✨',
    'New adventures await! 🚀',
    'Grateful for today 🙏',
    'Making memories 📸'
  ];

  const content = Math.random() > 0.5 ? getRandomElement(sampleContent) : null;
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

  // Simple text story (no media)
  const media = {
    type: 'text',
    url: '',
    thumbnail: null,
    filename: 'text-story',
    fileSize: 0,
    mimeType: 'text/plain',
    duration: null,
    dimensions: null,
    s3Key: 'text-story',
    blurhash: null
  };

  // Add some views
  const numViews = Math.floor(Math.random() * 30);
  const views = [];
  for (let j = 0; j < numViews && j < allUsers.length; j++) {
    const viewer = getRandomElement(allUsers);
    if (viewer._id.toString() !== author._id.toString() && !views.find(v => v.user.toString() === viewer._id.toString())) {
      views.push({
        user: viewer._id,
        viewedAt: getRandomDate(1),
        viewDuration: Math.floor(Math.random() * 10) + 1,
        isLiked: Math.random() > 0.7
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
 * Create stories for users
 */
async function createStoriesForUsers(users, storiesPerUser = 1) {
  if (!CREATE_STORIES || storiesPerUser === 0) {
    return [];
  }

  console.log(`\n📖 Creating ${storiesPerUser} story per user (${users.length * storiesPerUser} total)...`);
  
  const storyTasks = [];
  for (const user of users) {
    for (let i = 0; i < storiesPerUser; i++) {
      storyTasks.push({ author: user, allUsers: users });
    }
  }

  const stories = await processInBatches(storyTasks, BATCH_SIZE, (task) => 
    createSimpleStory(task.author, task.allUsers)
  );

  console.log(`✅ Created ${stories.length} stories`);
  return stories;
}

/**
 * Main function
 */
async function createTestUsers() {
  const startTime = Date.now();
  console.log('🚀 Starting Create Test Users for Pagination Testing...');
  console.log(`📊 Configuration:`);
  console.log(`   - Users to create: ${USER_COUNT}`);
  console.log(`   - Create posts: ${CREATE_POSTS} (${POSTS_PER_USER} per user)`);
  console.log(`   - Create stories: ${CREATE_STORIES} (${STORIES_PER_USER} per user)`);
  console.log(`⚡ Batch size: ${BATCH_SIZE} (processing ${BATCH_SIZE} items in parallel)`);

  try {
    // Connect to database
    await connectToDatabase();

    // Create users
    const userStartTime = Date.now();
    const users = await createUsers(USER_COUNT);
    const userTime = ((Date.now() - userStartTime) / 1000).toFixed(2);
    console.log(`⏱️  Users created in ${userTime}s\n`);

    // Create posts if enabled
    let posts = [];
    let postTime = '0.00';
    if (CREATE_POSTS && POSTS_PER_USER > 0) {
      const postStartTime = Date.now();
      posts = await createPostsForUsers(users, POSTS_PER_USER);
      postTime = ((Date.now() - postStartTime) / 1000).toFixed(2);
      console.log(`⏱️  Posts created in ${postTime}s\n`);
    }

    // Create stories if enabled
    let stories = [];
    let storyTime = '0.00';
    if (CREATE_STORIES && STORIES_PER_USER > 0) {
      const storyStartTime = Date.now();
      stories = await createStoriesForUsers(users, STORIES_PER_USER);
      storyTime = ((Date.now() - storyStartTime) / 1000).toFixed(2);
      console.log(`⏱️  Stories created in ${storyTime}s\n`);
    }

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);

    // Print summary
    console.log('\n🎉 Create Test Users Completed!');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`✅ Users created: ${users.length} (${userTime}s)`);
    if (CREATE_POSTS) {
      console.log(`✅ Posts created: ${posts.length} (${postTime}s)`);
    }
    if (CREATE_STORIES) {
      console.log(`✅ Stories created: ${stories.length} (${storyTime}s)`);
    }
    console.log(`⏱️  Total time: ${totalTime}s`);
    console.log('═══════════════════════════════════════════════════════');
    console.log('\n📊 Test Data Summary:');
    console.log(`   ✅ ${users.length} users ready for pagination testing`);
    console.log(`   ✅ Each user has realistic profile data`);
    console.log(`   ✅ Users can be used for testing:`);
    console.log(`      - User lists/pagination`);
    console.log(`      - Search functionality`);
    console.log(`      - Follow/unfollow features`);
    console.log(`      - Profile viewing`);
    if (CREATE_POSTS) {
      console.log(`      - Post feeds/pagination`);
    }
    if (CREATE_STORIES) {
      console.log(`      - Stories feed/pagination`);
    }

  } catch (error) {
    console.error('❌ Error creating test users:', error);
    throw error;
  } finally {
    await disconnectFromDatabase();
  }
}

// Run if called directly
if (require.main === module) {
  createTestUsers()
    .then(() => {
      console.log('\n✅ Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { createTestUsers };

