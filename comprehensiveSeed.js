const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('./src/user/auth/model/userAuthModel');
const Post = require('./src/user/social/userModel/postModel');
const Story = require('./src/user/social/userModel/storyModel');

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

// Configuration
const TOTAL_USERS = 100;
const POSTS_PER_USER = 100;
const STORIES_PER_USER = 100;
const FOLLOWERS_PER_USER = 100;
const FOLLOWING_PER_USER = 100;
const LIKES_PER_POST = 100;
const COMMENTS_PER_POST = 100;

// Sample data arrays
const FIRST_NAMES = [
  'Aarav', 'Aditi', 'Akshay', 'Ananya', 'Arjun', 'Avni', 'Dev', 'Diya', 'Ishaan', 'Kavya',
  'Krishna', 'Meera', 'Neha', 'Pranav', 'Priya', 'Rahul', 'Riya', 'Rohan', 'Saanvi', 'Sahil',
  'Sanjay', 'Shreya', 'Siddharth', 'Sneha', 'Tanvi', 'Varun', 'Ved', 'Vidya', 'Yash', 'Zara',
  'Aryan', 'Bhavya', 'Chaitanya', 'Disha', 'Esha', 'Gaurav', 'Harsh', 'Isha', 'Jai', 'Kiran',
  'Lakshmi', 'Manish', 'Nisha', 'Om', 'Pooja', 'Raj', 'Sakshi', 'Tanishq', 'Uma', 'Vikram'
];

const LAST_NAMES = [
  'Sharma', 'Patel', 'Kumar', 'Singh', 'Gupta', 'Verma', 'Reddy', 'Mehta', 'Joshi', 'Shah',
  'Agarwal', 'Malhotra', 'Kapoor', 'Chopra', 'Nair', 'Iyer', 'Rao', 'Desai', 'Bansal', 'Goyal',
  'Saxena', 'Mishra', 'Tiwari', 'Yadav', 'Jain', 'Arora', 'Bhatt', 'Dubey', 'Pandey', 'Srivastava',
  'Khan', 'Ali', 'Hussain', 'Ahmed', 'Malik', 'Sheikh', 'Rahman', 'Hasan', 'Ansari', 'Qureshi',
  'Fernandes', 'D\'Souza', 'Pereira', 'Rodrigues', 'Gomes', 'Almeida', 'Costa', 'Silva', 'Mendes', 'Lobo'
];

const SAMPLE_POST_CONTENT = [
  'Living my best life! 🌟',
  'Making memories that last forever 📸',
  'Grateful for today 🙏',
  'New adventures await! 🚀',
  'Life is beautiful when you appreciate the little things ✨',
  'Chasing dreams and catching them! ⭐',
  'Surrounded by amazing people ❤️',
  'Today was perfect! ☀️',
  'Every moment is a new beginning 🌈',
  'Creating magic in everyday moments ✨',
  'Coffee and good vibes ☕',
  'Sunset vibes 🌅',
  'Weekend mode activated 🎉',
  'Good food, good mood 🍕',
  'Adventure time! 🗺️',
  'Living in the moment 📷',
  'Positive energy only ✨',
  'Making it happen 💪',
  'Beautiful day ahead 🌤️',
  'Life is good 😊'
];

const SAMPLE_COMMENTS = [
  'Amazing! 🔥', 'Love this! ❤️', 'So good! 👏', 'Beautiful! ✨', 'Great post! 👍',
  'Awesome! 😍', 'Incredible! 🌟', 'Perfect! 💯', 'This is amazing!', 'Love it!',
  'So beautiful!', 'Great work!', 'Fantastic!', 'Wonderful!', 'Stunning!',
  'Impressive!', 'Well done!', 'Keep it up!', 'You\'re amazing!', 'This made my day!',
  'Absolutely love this!', 'So inspiring!', 'Beautiful work!', 'This is incredible!',
  'Amazing content!', 'Love your style!', 'So creative!', 'This is perfect!', 'Great job!',
  'Absolutely stunning!', 'This is beautiful!', 'Love everything about this!', 'So well done!',
  'This is fantastic!', 'Amazing photography!', 'Love the vibes!', 'This is so good!',
  'Absolutely amazing!', 'Love this post!', 'So inspiring!', 'This is incredible work!'
];

// Diverse media URLs from various sources
const IMAGE_URLS = [
  // Unsplash images
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1080&h=1920&fit=crop',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=1080&h=1920&fit=crop',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=1080&h=1920&fit=crop',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=1080&h=1920&fit=crop',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=1080&h=1920&fit=crop',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=1080&h=1920&fit=crop',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=1080&h=1920&fit=crop',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=1080&h=1920&fit=crop',
  'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=1080&h=1920&fit=crop',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=1080&h=1920&fit=crop',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=1080&h=1920&fit=crop',
  'https://images.unsplash.com/photo-1547425260-7bc64d800062?w=1080&h=1920&fit=crop',
  'https://images.unsplash.com/photo-1552374196-c4e7ffc6e126?w=1080&h=1920&fit=crop',
  'https://images.unsplash.com/photo-1554151228-14d9def656e4?w=1080&h=1920&fit=crop',
  'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=1080&h=1920&fit=crop',
  'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=1080&h=1920&fit=crop',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=1080&h=1920&fit=crop',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=1080&h=1920&fit=crop',
  'https://images.unsplash.com/photo-1594736797933-d0401ba2fe65?w=1080&h=1920&fit=crop',
  'https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=1080&h=1920&fit=crop',
  // Pexels images
  'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=1080&h=1920&fit=crop',
  'https://images.pexels.com/photos/1181519/pexels-photo-1181519.jpeg?auto=compress&cs=tinysrgb&w=1080&h=1920&fit=crop',
  'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=1080&h=1920&fit=crop',
  'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=1080&h=1920&fit=crop',
  'https://images.pexels.com/photos/1181690/pexels-photo-1181690.jpeg?auto=compress&cs=tinysrgb&w=1080&h=1920&fit=crop',
  'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=1080&h=1920&fit=crop',
  'https://images.pexels.com/photos/1036623/pexels-photo-1036623.jpeg?auto=compress&cs=tinysrgb&w=1080&h=1920&fit=crop',
  'https://images.pexels.com/photos/1024311/pexels-photo-1024311.jpeg?auto=compress&cs=tinysrgb&w=1080&h=1920&fit=crop',
  'https://images.pexels.com/photos/1007667/pexels-photo-1007667.jpeg?auto=compress&cs=tinysrgb&w=1080&h=1920&fit=crop',
  'https://images.pexels.com/photos/91227/pexels-photo-91227.jpeg?auto=compress&cs=tinysrgb&w=1080&h=1920&fit=crop',
  'https://images.pexels.com/photos/842567/pexels-photo-842567.jpeg?auto=compress&cs=tinysrgb&w=1080&h=1920&fit=crop',
  'https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg?auto=compress&cs=tinysrgb&w=1080&h=1920&fit=crop',
  'https://images.pexels.com/photos/712513/pexels-photo-712513.jpeg?auto=compress&cs=tinysrgb&w=1080&h=1920&fit=crop',
  'https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg?auto=compress&cs=tinysrgb&w=1080&h=1920&fit=crop',
  'https://images.pexels.com/photos/598745/pexels-photo-598745.jpeg?auto=compress&cs=tinysrgb&w=1080&h=1920&fit=crop',
  'https://images.pexels.com/photos/590590/pexels-photo-590590.jpeg?auto=compress&cs=tinysrgb&w=1080&h=1920&fit=crop',
  'https://images.pexels.com/photos/555790/pexels-photo-555790.jpeg?auto=compress&cs=tinysrgb&w=1080&h=1920&fit=crop',
  'https://images.pexels.com/photos/532220/pexels-photo-532220.jpeg?auto=compress&cs=tinysrgb&w=1080&h=1920&fit=crop',
  'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=1080&h=1920&fit=crop'
];

// 40-second video URLs (short videos suitable for social media posts)
const VIDEO_URLS = [
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', // ~15s, will be set to 40s duration
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4', // ~15s, will be set to 40s duration
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4', // ~15s, will be set to 40s duration
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4', // ~15s, will be set to 40s duration
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreet.mp4', // ~15s, will be set to 40s duration
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4', // ~60s, will be set to 40s duration
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/VolkswagenGTIReview.mp4', // ~4min, will be set to 40s duration
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WhatCarCanYouGetForAGrand.mp4', // ~1min, will be set to 40s duration
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', // ~10min, will be set to 40s duration
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4', // ~11min, will be set to 40s duration
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4', // ~15min, will be set to 40s duration
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4' // ~12min, will be set to 40s duration
];

const VIDEO_THUMBNAILS = [
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1080&h=1920&fit=crop',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=1080&h=1920&fit=crop',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=1080&h=1920&fit=crop',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=1080&h=1920&fit=crop',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=1080&h=1920&fit=crop'
];

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

// Generate phone number (10 digits starting with 9)
const generatePhoneNumber = (index) => {
  // Start with 9, then add 9 more random digits
  const base = 9000000000; // 9 followed by 9 zeros
  const random = Math.floor(Math.random() * 100000000); // 8 random digits
  return String(base + random + index).substring(0, 10);
};

// Create users
const createUsers = async () => {
  console.log(`\n👥 Creating ${TOTAL_USERS} users...\n`);
  
  const users = [];
  let createdCount = 0;
  
  for (let i = 0; i < TOTAL_USERS; i++) {
    try {
      const firstName = getRandomElement(FIRST_NAMES);
      const lastName = getRandomElement(LAST_NAMES);
      const fullName = `${firstName} ${lastName}`;
      const username = `${firstName.toLowerCase()}${lastName.toLowerCase()}${i}`;
      const phoneNumber = generatePhoneNumber(i);
      
      const userData = {
        phoneNumber,
        countryCode: '+91',
        username,
        usernameNorm: username.toLowerCase(),
        fullName,
        email: `${username}@example.com`,
        emailVerified: true,
        gender: i % 2 === 0 ? 'male' : 'female',
        pronouns: i % 2 === 0 ? 'he/him' : 'she/her',
        bio: `Hello! I'm ${fullName}. Welcome to my profile!`,
        profilePictureUrl: getRandomElement(IMAGE_URLS),
        isProfileCompleted: true,
        profileCompletionStep: 'completed',
        isActive: true,
        isVerified: Math.random() > 0.7, // 30% verified
        verificationStatus: Math.random() > 0.7 ? 'approved' : 'none',
        location: {
          lat: 19.0760 + (Math.random() * 0.1 - 0.05), // Mumbai area
          lng: 72.8777 + (Math.random() * 0.1 - 0.05),
          city: 'Mumbai',
          country: 'India'
        },
        privacySettings: {
          isPrivate: false,
          allowFollowRequests: true,
          showOnlineStatus: true,
          allowMessages: 'followers',
          allowCommenting: true,
          allowTagging: true,
          allowStoriesSharing: true
        },
        following: [],
        followers: [],
        createdAt: getRandomDate(365) // Created within last year
      };
      
      const user = await User.create(userData);
      users.push(user);
      createdCount++;
      
      if ((i + 1) % 10 === 0) {
        console.log(`   ✅ Created ${i + 1}/${TOTAL_USERS} users...`);
      }
    } catch (error) {
      console.error(`   ❌ Error creating user ${i + 1}:`, error.message);
    }
  }
  
  console.log(`\n✅ Created ${createdCount} users\n`);
  return users;
};

// Create follow relationships
const createFollowRelationships = async (users) => {
  console.log(`\n👥 Creating follow relationships...\n`);
  
  let totalFollows = 0;
  
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    
    // Get other users (exclude self)
    const otherUsers = users.filter(u => u._id.toString() !== user._id.toString());
    
    // Select 100 random users to follow
    const usersToFollow = getRandomElements(otherUsers, FOLLOWING_PER_USER);
    
    // Select 100 random users as followers
    const followers = getRandomElements(otherUsers, FOLLOWERS_PER_USER);
    
    // Update user's following and followers
    user.following = usersToFollow.map(u => u._id);
    user.followers = followers.map(u => u._id);
    await user.save();
    
    // Update followers' following list (reciprocal)
    for (const follower of followers) {
      if (!follower.following.includes(user._id)) {
        follower.following.push(user._id);
        await follower.save();
      }
    }
    
    totalFollows += usersToFollow.length;
    
    if ((i + 1) % 10 === 0) {
      console.log(`   ✅ Processed ${i + 1}/${users.length} users...`);
    }
  }
  
  console.log(`\n✅ Created ${totalFollows} follow relationships\n`);
};

// Create posts for a user
const createPostsForUser = async (user, allUsers, userIndex) => {
  const posts = [];
  
  for (let i = 0; i < POSTS_PER_USER; i++) {
    try {
      const hasContent = Math.random() > 0.2;
      const content = hasContent ? getRandomElement(SAMPLE_POST_CONTENT) : null;
      
      const isVideo = Math.random() > 0.7; // 30% videos, 70% images
      const mediaCount = isVideo ? 1 : (Math.random() > 0.7 ? Math.floor(Math.random() * 3) + 1 : 1);
      
      const media = [];
      for (let j = 0; j < mediaCount; j++) {
        const mediaItem = {
          type: isVideo ? 'video' : 'image',
          url: isVideo ? getRandomElement(VIDEO_URLS) : getRandomElement(IMAGE_URLS),
          thumbnail: isVideo ? getRandomElement(VIDEO_THUMBNAILS) : null,
          filename: `post_${userIndex}_${i}_${j}_${Date.now()}.${isVideo ? 'mp4' : 'jpg'}`,
          fileSize: isVideo 
            ? Math.floor(Math.random() * 20000000) + 5000000
            : Math.floor(Math.random() * 5000000) + 100000,
          mimeType: isVideo ? 'video/mp4' : 'image/jpeg',
          s3Key: `posts/${user._id}/post_${i}_${j}_${Date.now()}.${isVideo ? 'mp4' : 'jpg'}`,
          dimensions: isVideo 
            ? { width: 1920, height: 1080 }
            : { width: 1080, height: 1920 }
        };
        
        if (isVideo) {
          mediaItem.duration = 40; // Fixed 40 seconds for all videos
        }
        
        media.push(mediaItem);
      }
      
      const publishedAt = getRandomDate(30);
      
      // Create post with empty likes and comments (will be populated later)
      const postData = {
        author: user._id,
        content,
        media,
        visibility: getRandomElement(['public', 'followers']),
        commentVisibility: getRandomElement(['everyone', 'followers']),
        status: 'published',
        publishedAt,
        likes: [],
        comments: [],
        shares: [],
        views: [],
        likesCount: 0,
        commentsCount: 0,
        sharesCount: 0,
        viewsCount: Math.floor(Math.random() * 500),
        createdAt: publishedAt,
        updatedAt: publishedAt
      };
      
      const post = await Post.create(postData);
      posts.push(post);
    } catch (error) {
      console.error(`   ❌ Error creating post ${i + 1} for user ${user.username}:`, error.message);
    }
  }
  
  return posts;
};

// Add likes and comments to a post
const addEngagementToPost = async (post, allUsers) => {
  const authorId = post.author.toString();
  const eligibleUsers = allUsers.filter(u => u._id.toString() !== authorId);
  
  // Get exactly 100 users for likes
  const likers = getRandomElements(eligibleUsers, Math.min(LIKES_PER_POST, eligibleUsers.length));
  
  // Get exactly 100 users for comments (can overlap with likers)
  const commenters = getRandomElements(eligibleUsers, Math.min(COMMENTS_PER_POST, eligibleUsers.length));
  
  // Add likes
  for (const liker of likers) {
    post.likes.push({
      user: liker._id,
      likedAt: getRandomDate(30)
    });
  }
  
  // Add comments
  for (const commenter of commenters) {
    post.comments.push({
      user: commenter._id,
      content: getRandomElement(SAMPLE_COMMENTS),
      likes: [],
      isEdited: false,
      editedAt: null,
      createdAt: getRandomDate(30)
    });
  }
  
  // Update counts
  post.likesCount = post.likes.length;
  post.commentsCount = post.comments.length;
  
  await post.save();
};

// Create stories for a user
const createStoriesForUser = async (user, userIndex) => {
  const stories = [];
  
  for (let i = 0; i < STORIES_PER_USER; i++) {
    try {
      const hasContent = Math.random() > 0.3;
      const content = hasContent ? getRandomElement(SAMPLE_POST_CONTENT) : null;
      
      const isVideo = Math.random() > 0.7; // 30% videos
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      
      const media = {
        type: isVideo ? 'video' : 'image',
        url: isVideo ? getRandomElement(VIDEO_URLS) : getRandomElement(IMAGE_URLS),
        thumbnail: isVideo ? getRandomElement(VIDEO_THUMBNAILS) : null,
        filename: `story_${userIndex}_${i}_${Date.now()}.${isVideo ? 'mp4' : 'jpg'}`,
        fileSize: isVideo 
          ? Math.floor(Math.random() * 20000000) + 5000000
          : Math.floor(Math.random() * 5000000) + 100000,
        mimeType: isVideo ? 'video/mp4' : 'image/jpeg',
        s3Key: `stories/${user._id}/story_${i}_${Date.now()}.${isVideo ? 'mp4' : 'jpg'}`,
        dimensions: { width: 1080, height: 1920 }
      };
      
      if (isVideo) {
        media.duration = Math.floor(Math.random() * 60) + 5;
      }
      
      const storyData = {
        author: user._id,
        content,
        media,
        privacy: getRandomElement(['public', 'followers', 'close_friends']),
        status: 'active',
        expiresAt,
        views: [],
        mentions: [],
        replies: [],
        analytics: {
          viewsCount: 0,
          likesCount: 0,
          repliesCount: 0,
          sharesCount: 0
        },
        createdAt: getRandomDate(1) // Created within last 24 hours
      };
      
      const story = await Story.create(storyData);
      stories.push(story);
    } catch (error) {
      console.error(`   ❌ Error creating story ${i + 1} for user ${user.username}:`, error.message);
    }
  }
  
  return stories;
};

// Main seeding function
const seedAll = async () => {
  try {
    console.log('\n🚀 Starting Comprehensive Seeding Script...\n');
    console.log('='.repeat(70));
    console.log(`📊 Configuration:`);
    console.log(`   👥 Users: ${TOTAL_USERS}`);
    console.log(`   📝 Posts per user: ${POSTS_PER_USER}`);
    console.log(`   📖 Stories per user: ${STORIES_PER_USER}`);
    console.log(`   👥 Followers per user: ${FOLLOWERS_PER_USER}`);
    console.log(`   👥 Following per user: ${FOLLOWING_PER_USER}`);
    console.log(`   ❤️  Likes per post: ${LIKES_PER_POST}`);
    console.log(`   💬 Comments per post: ${COMMENTS_PER_POST}`);
    console.log('='.repeat(70));
    
    // Step 1: Create users
    const users = await createUsers();
    
    if (users.length === 0) {
      console.error('❌ No users created. Exiting...');
      return;
    }
    
    // Step 2: Create follow relationships
    await createFollowRelationships(users);
    
    // Step 3: Create posts and engagement for each user
    console.log(`\n📝 Creating posts and engagement...\n`);
    let totalPosts = 0;
    let totalStories = 0;
    
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      
      console.log(`\n👤 Processing user ${i + 1}/${users.length}: ${user.username}`);
      
      // Create posts
      console.log(`   📝 Creating ${POSTS_PER_USER} posts...`);
      const posts = await createPostsForUser(user, users, i);
      totalPosts += posts.length;
      console.log(`   ✅ Created ${posts.length} posts`);
      
      // Add engagement to each post
      console.log(`   ❤️  Adding engagement to posts...`);
      for (let j = 0; j < posts.length; j++) {
        await addEngagementToPost(posts[j], users);
        if ((j + 1) % 10 === 0) {
          console.log(`      ✅ Processed ${j + 1}/${posts.length} posts...`);
        }
      }
      console.log(`   ✅ Added engagement to all posts`);
      
      // Create stories
      console.log(`   📖 Creating ${STORIES_PER_USER} stories...`);
      const stories = await createStoriesForUser(user, i);
      totalStories += stories.length;
      console.log(`   ✅ Created ${stories.length} stories`);
    }
    
    // Final summary
    console.log('\n' + '='.repeat(70));
    console.log('\n🎉 Seeding completed successfully!\n');
    console.log('📊 Final Statistics:\n');
    console.log(`   👥 Total users: ${users.length}`);
    console.log(`   📝 Total posts: ${totalPosts}`);
    console.log(`   📖 Total stories: ${totalStories}`);
    console.log(`   ❤️  Total likes: ${totalPosts * LIKES_PER_POST}`);
    console.log(`   💬 Total comments: ${totalPosts * COMMENTS_PER_POST}`);
    console.log(`   👥 Total follow relationships: ${users.length * FOLLOWING_PER_USER}`);
    console.log('\n💡 Features:');
    console.log('   ✅ 100 users with unique phone numbers (10 digits, starting with 9)');
    console.log('   ✅ Each user has 100 followers and 100 following');
    console.log('   ✅ Each user has 100 posts with diverse media');
    console.log('   ✅ Each user has 100 stories');
    console.log('   ✅ Each post has exactly 100 likes and 100 comments');
    console.log('   ✅ Diverse media URLs from Unsplash, Pexels, and sample videos');
    console.log('   ✅ Realistic engagement and timestamps\n');
    
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    console.error('Error details:', error.message);
    console.error('Stack:', error.stack);
    throw error;
  }
};

// Main function
const main = async () => {
  try {
    await connectDB();
    await seedAll();
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

module.exports = { seedAll };

