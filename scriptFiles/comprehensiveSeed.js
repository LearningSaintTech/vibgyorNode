/**
 * Comprehensive Seed Script for VibgyorNode Platform
 * Merged script that creates at least 500 records in each table
 * 
 * Features:
 * - Creates user with phone number 9829699382
 * - Makes all posts and stories visible to that user
 * - Ensures posts have only images and videos (no other media types)
 * - Creates at least 500 records in each major table
 * 
 * Usage:
 * node scriptFiles/comprehensiveSeed.js --clear=true
 */

require('dotenv').config();
const { connectToDatabase, disconnectFromDatabase } = require('../src/dbConfig/db');

// Import models
const Admin = require('../src/admin/adminModel/adminModel');
const SubAdmin = require('../src/subAdmin/subAdminModel/subAdminAuthModel');
const User = require('../src/user/auth/model/userAuthModel');
const UserCatalog = require('../src/user/auth/model/userCatalogModel');
const Chat = require('../src/user/social/userModel/chatModel');
const Message = require('../src/user/social/userModel/messageModel');
const Call = require('../src/user/social/userModel/callModel');
const FollowRequest = require('../src/user/social/userModel/followRequestModel');
const MessageRequest = require('../src/user/social/userModel/messageRequestModel');
const UserReport = require('../src/user/social/userModel/userReportModel');
const Post = require('../src/user/social/userModel/postModel');
const Story = require('../src/user/social/userModel/storyModel');
const UserStatus = require('../src/user/social/userModel/userStatusModel');
const RefreshToken = require('../src/user/social/userModel/refreshTokenModel');
const ContentModeration = require('../src/user/social/userModel/contentModerationModel');
const Notification = require('../src/notification/models/notificationModel');
const NotificationPreferences = require('../src/notification/models/notificationPreferencesModel');
const DatingInteraction = require('../src/user/dating/models/datingInteractionModel');
const DatingMatch = require('../src/user/dating/models/datingMatchModel');
const DatingProfileComment = require('../src/user/dating/models/datingProfileCommentModel');

// Target user phone number
const TARGET_USER_PHONE = '9829699382';

// Media URLs - using real image and video URLs
const IMAGE_URL = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1080&h=1920&fit=crop';
const VIDEO_URL = 'https://yoraaecommerce.s3.ap-south-1.amazonaws.com/69045c2b833fc493301cb760/posts-video/1762856646669-njkjkjh.mp4';
const VIDEO_THUMBNAIL = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1080&h=1920&fit=crop';

// Demo data generators
const { faker } = require('@faker-js/faker');

// Configuration - minimum 500 for each table
const CONFIG = {
  users: 500,
  chats: 500,
  messages: 500,
  calls: 500,
  followRequests: 500,
  messageRequests: 500,
  reports: 500,
  posts: 500,
  stories: 500,
  notifications: 500,
  refreshTokens: 500,
  moderationEntries: 500,
  datingInteractions: 500,
  datingMatches: 500,
  datingComments: 500,
  userStatuses: 500
};

// Sample data arrays
const SAMPLE_NAMES = Array.from({ length: 1000 }, () => faker.person.fullName());
const SAMPLE_USERNAMES = Array.from({ length: 1000 }, () => faker.internet.username());
const SAMPLE_EMAILS = Array.from({ length: 1000 }, () => faker.internet.email());
const SAMPLE_PHONE_NUMBERS = Array.from({ length: 1000 }, () => faker.phone.number('##########'));

const SAMPLE_GENDERS = ['male', 'female', 'other'];
const SAMPLE_PRONOUNS = ['he/him', 'she/her', 'they/them', 'other'];
const SAMPLE_INTERESTS = ['music', 'travel', 'photography', 'food', 'sports', 'art', 'technology', 'fashion', 'gaming', 'fitness', 'reading', 'writing', 'dancing', 'singing', 'cooking'];
const SAMPLE_LIKES = ['pizza', 'coffee', 'books', 'movies', 'gaming', 'fitness', 'travel', 'photography', 'music', 'art'];

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
  'Creating magic in everyday moments ✨'
];

const SAMPLE_POST_CAPTIONS = [
  'Living my best life!',
  'Making memories',
  'Grateful for today',
  'Dreams coming true',
  'Blessed and thankful',
  'New adventures await',
  'Life is beautiful',
  'Creating magic',
  'Inspired and motivated',
  'Chasing dreams'
];

const SAMPLE_HASHTAGS = [
  '#life', '#love', '#happy', '#blessed', '#grateful', '#motivation', '#inspiration',
  '#travel', '#photography', '#nature', '#art', '#music', '#fitness', '#food',
  '#technology', '#coding', '#design', '#creativity', '#adventure', '#friends'
];

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
  'Today was perfect! ☀️'
];

// Utility functions
function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomElements(array, count) {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, array.length));
}

function getRandomDate(daysAgo = 30) {
  const now = new Date();
  const pastDate = new Date(now.getTime() - (Math.random() * daysAgo * 24 * 60 * 1000));
  return pastDate;
}

// Process items in parallel batches
async function processInBatches(items, batchSize, processor) {
  const results = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((item, index) => processor(item, i + index))
    );
    results.push(...batchResults.filter(r => r !== null));
    
    if ((i + batchSize) % (batchSize * 10) === 0 || i + batchSize >= items.length) {
      console.log(`   ✅ Processed ${Math.min(i + batchSize, items.length)}/${items.length} items...`);
    }
  }
  return results;
}

// Clear database
async function clearDatabase() {
  console.log('🗑️  Clearing existing data...');
  
  try {
    const deletePromises = [
      Admin.deleteMany({}),
      SubAdmin.deleteMany({}),
      User.deleteMany({}),
      Chat.deleteMany({}),
      Message.deleteMany({}),
      Call.deleteMany({}),
      FollowRequest.deleteMany({}),
      MessageRequest.deleteMany({}),
      UserReport.deleteMany({}),
      Post.deleteMany({}),
      Story.deleteMany({}),
      Notification.deleteMany({}),
      NotificationPreferences.deleteMany({}),
      UserStatus.deleteMany({}),
      RefreshToken.deleteMany({}),
      ContentModeration.deleteMany({}),
      DatingInteraction.deleteMany({}),
      DatingMatch.deleteMany({}),
      DatingProfileComment.deleteMany({}),
      UserCatalog.deleteMany({})
    ];
    
    await Promise.all(deletePromises);
    console.log('✅ Database cleared successfully');
  } catch (error) {
    console.error('❌ Error clearing database:', error);
    throw error;
  }
}

// Create users
async function createUsers(count) {
  console.log(`👥 Creating ${count} users...`);
  
  const userIndices = Array.from({ length: count }, (_, i) => i);
  const users = await processInBatches(userIndices, 50, async (index) => {
    const name = SAMPLE_NAMES[index] || faker.person.fullName();
    const username = SAMPLE_USERNAMES[index] || faker.internet.username();
    const phoneNumber = index === 0 ? TARGET_USER_PHONE : (SAMPLE_PHONE_NUMBERS[index] || faker.phone.number().replace(/\D/g, '').slice(0, 10));
    const email = SAMPLE_EMAILS[index] || faker.internet.email();
    
    const userData = {
      phoneNumber: phoneNumber,
      countryCode: '+91',
      username: username,
      usernameNorm: username.toLowerCase(),
      fullName: name,
      email: email,
      emailVerified: Math.random() > 0.2,
      bio: faker.lorem.sentence(),
      dob: faker.date.past({ years: 30, refDate: '2000-01-01' }),
      gender: getRandomElement(SAMPLE_GENDERS),
      pronouns: getRandomElement(SAMPLE_PRONOUNS),
      interests: getRandomElements(SAMPLE_INTERESTS, Math.floor(Math.random() * 5) + 1),
      likes: getRandomElements(SAMPLE_LIKES, Math.floor(Math.random() * 5) + 1),
      location: {
        lat: parseFloat(faker.location.latitude()),
        lng: parseFloat(faker.location.longitude()),
        city: faker.location.city(),
        country: faker.location.country()
      },
      profilePictureUrl: Math.random() > 0.3 ? IMAGE_URL : '',
      isActive: true,
      isProfileCompleted: true,
      verificationStatus: Math.random() > 0.8 ? 'approved' : 'pending',
      following: [],
      followers: [],
      blockedUsers: [],
      blockedBy: [],
      privacySettings: {
        isPrivate: Math.random() > 0.8,
        allowFollowRequests: Math.random() > 0.2,
        showOnlineStatus: Math.random() > 0.3,
        allowMessages: getRandomElement(['everyone', 'followers', 'none']),
        allowCommenting: Math.random() > 0.1,
        allowTagging: Math.random() > 0.1,
        allowStoriesSharing: Math.random() > 0.1
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
  });
  
  console.log(`✅ Created ${users.length} users`);
  return users;
}

// Create posts with only images and videos
async function createPosts(users, count) {
  console.log(`📝 Creating ${count} posts (images and videos only)...`);
  
  const postIndices = Array.from({ length: count }, (_, i) => i);
  const posts = await processInBatches(postIndices, 50, async (index) => {
    const author = getRandomElement(users);
    const content = getRandomElement(SAMPLE_POST_CONTENT);
    const caption = getRandomElement(SAMPLE_POST_CAPTIONS);
    const hashtags = getRandomElements(SAMPLE_HASHTAGS, Math.floor(Math.random() * 5) + 1);
    // All posts should be visible to target user (public or followers)
    const visibility = getRandomElement(['public', 'followers']);
    const publishedAt = getRandomDate(30);
    
    // All posts have media - either image or video (50/50 split)
    // User requirement: posts have only images and videos
    const isVideo = Math.random() > 0.5;
    const mediaItem = {
      type: isVideo ? 'video' : 'image',
      url: isVideo ? VIDEO_URL : IMAGE_URL,
      thumbnail: isVideo ? VIDEO_THUMBNAIL : null,
      filename: `post_${index}.${isVideo ? 'mp4' : 'jpg'}`,
      fileSize: isVideo ? Math.floor(Math.random() * 20000000) + 5000000 : Math.floor(Math.random() * 5000000) + 100000,
      mimeType: isVideo ? 'video/mp4' : 'image/jpeg',
      s3Key: `posts/${isVideo ? 'video' : 'image'}/post_${index}.${isVideo ? 'mp4' : 'jpg'}`
    };
    
    // Add duration for videos
    if (isVideo) {
      mediaItem.duration = Math.floor(Math.random() * 300) + 10;
      mediaItem.dimensions = { width: 1920, height: 1080 };
    } else {
      mediaItem.dimensions = { width: 1080, height: 1920 };
    }
    
    const media = [mediaItem];
    
    const post = {
      author: author._id,
      content: content,
      caption: caption,
      media: media,
      hashtags: hashtags,
      visibility: visibility,
      commentVisibility: getRandomElement(['everyone', 'followers', 'none']),
      status: 'published',
      publishedAt: publishedAt,
      likes: [],
      comments: [],
      shares: [],
      views: [],
      likesCount: Math.floor(Math.random() * 100),
      commentsCount: Math.floor(Math.random() * 50),
      sharesCount: Math.floor(Math.random() * 20),
      viewsCount: Math.floor(Math.random() * 500),
      isReported: false,
      reports: [],
      analytics: {
        reach: Math.floor(Math.random() * 1000),
        impressions: Math.floor(Math.random() * 1500),
        engagement: 0
      },
      createdAt: publishedAt,
      updatedAt: publishedAt
    };
    
    try {
      const createdPost = await Post.create(post);
      return createdPost;
    } catch (error) {
      console.error(`❌ Error creating post ${index + 1}:`, error.message);
      return null;
    }
  });
  
  console.log(`✅ Created ${posts.length} posts`);
  return posts;
}

// Create stories
async function createStories(users, count) {
  console.log(`📖 Creating ${count} stories...`);
  
  const storyIndices = Array.from({ length: count }, (_, i) => i);
  const stories = await processInBatches(storyIndices, 50, async (index) => {
    const author = getRandomElement(users);
    const content = Math.random() > 0.5 ? getRandomElement(SAMPLE_STORY_CONTENT) : null;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    // All stories should be visible to target user (public or followers)
    const privacy = getRandomElement(['public', 'followers']);
    
    // Stories can be image or video
    const isVideo = Math.random() > 0.5;
    const media = {
      type: isVideo ? 'video' : 'image',
      url: isVideo ? VIDEO_URL : IMAGE_URL,
      thumbnail: isVideo ? VIDEO_THUMBNAIL : null,
      filename: `story_${index}.${isVideo ? 'mp4' : 'jpg'}`,
      fileSize: isVideo ? Math.floor(Math.random() * 20000000) + 5000000 : Math.floor(Math.random() * 5000000) + 100000,
      mimeType: isVideo ? 'video/mp4' : 'image/jpeg',
      s3Key: `stories/${isVideo ? 'video' : 'image'}/story_${index}.${isVideo ? 'mp4' : 'jpg'}`
    };
    
    // Add duration for videos
    if (isVideo) {
      media.duration = Math.floor(Math.random() * 60) + 5;
      media.dimensions = { width: 1080, height: 1920 };
    } else {
      media.dimensions = { width: 1080, height: 1920 };
    }
    
    const story = {
      author: author._id,
      content: content,
      media: media,
      privacy: privacy, // Use the privacy set above (public or followers)
      status: 'active',
      expiresAt: expiresAt,
      views: [],
      analytics: {
        viewsCount: 0,
        likesCount: 0,
        repliesCount: 0,
        sharesCount: 0
      },
      createdAt: getRandomDate(1)
    };
    
    try {
      const createdStory = await Story.create(story);
      return createdStory;
    } catch (error) {
      console.error(`❌ Error creating story ${index + 1}:`, error.message);
      return null;
    }
  });
  
  console.log(`✅ Created ${stories.length} stories`);
  return stories;
}

// Create chats
async function createChats(users, count) {
  console.log(`💬 Creating ${count} chats...`);
  
  const chatIndices = Array.from({ length: count }, (_, i) => i);
  const chats = await processInBatches(chatIndices, 50, async (index) => {
    const user1 = getRandomElement(users);
    let user2 = getRandomElement(users);
    while (user2._id.toString() === user1._id.toString()) {
      user2 = getRandomElement(users);
    }
    
    const chat = {
      participants: [user1._id, user2._id],
      lastMessage: null,
      lastMessageAt: null,
      unreadCount: {
        [user1._id.toString()]: Math.floor(Math.random() * 10),
        [user2._id.toString()]: Math.floor(Math.random() * 10)
      },
      isArchived: {
        [user1._id.toString()]: false,
        [user2._id.toString()]: false
      },
      createdAt: getRandomDate(30),
      updatedAt: getRandomDate(30)
    };
    
    try {
      const createdChat = await Chat.create(chat);
      return createdChat;
    } catch (error) {
      console.error(`❌ Error creating chat ${index + 1}:`, error.message);
      return null;
    }
  });
  
  console.log(`✅ Created ${chats.length} chats`);
  return chats;
}

// Create messages
async function createMessages(chats, users, count) {
  console.log(`📨 Creating ${count} messages...`);
  
  const messageIndices = Array.from({ length: count }, (_, i) => i);
  const messages = await processInBatches(messageIndices, 50, async (index) => {
    const chat = getRandomElement(chats);
    if (!chat || !chat.participants || chat.participants.length === 0) return null;
    
    const sender = getRandomElement(chat.participants.map(id => users.find(u => u._id.toString() === id.toString())).filter(Boolean));
    if (!sender) return null;
    
    const message = {
      chatId: chat._id,
      senderId: sender._id,
      content: faker.lorem.sentence(),
      type: 'text',
      status: getRandomElement(['sent', 'delivered', 'read']),
      createdAt: getRandomDate(7)
    };
    
    // Optionally add readBy if status is 'read'
    if (message.status === 'read') {
      const otherParticipant = chat.participants.find(id => id.toString() !== sender._id.toString());
      if (otherParticipant) {
        message.readBy = [{
          userId: otherParticipant,
          readAt: getRandomDate(1)
        }];
      }
    }
    
    try {
      const createdMessage = await Message.create(message);
      return createdMessage;
    } catch (error) {
      console.error(`❌ Error creating message ${index + 1}:`, error.message);
      return null;
    }
  });
  
  const successfulMessages = messages.filter(m => m !== null);
  console.log(`✅ Created ${successfulMessages.length} messages`);
  return successfulMessages;
}

// Create calls
async function createCalls(chats, users, count) {
  console.log(`📞 Creating ${count} calls...`);
  
  const callIndices = Array.from({ length: count }, (_, i) => i);
  const calls = await processInBatches(callIndices, 50, async (index) => {
    // Get a random chat for the call
    const chat = getRandomElement(chats);
    if (!chat || !chat.participants || chat.participants.length !== 2) return null;
    
    const initiator = getRandomElement(chat.participants.map(id => users.find(u => u._id.toString() === id.toString())).filter(Boolean));
    if (!initiator) return null;
    
    const otherParticipant = chat.participants.find(id => id.toString() !== initiator._id.toString());
    if (!otherParticipant) return null;
    
    const callType = getRandomElement(['audio', 'video']);
    // Valid status values: 'initiating', 'ringing', 'connected', 'ended', 'missed', 'rejected', 'failed', 'timeout'
    const status = getRandomElement(['ended', 'missed', 'rejected', 'failed', 'timeout']);
    const startedAt = getRandomDate(7);
    const endedAt = status === 'ended' ? new Date(startedAt.getTime() + Math.floor(Math.random() * 3600000)) : null;
    
    // Generate unique callId (10-50 characters)
    const callId = `call_${Date.now()}_${index}_${faker.string.alphanumeric(10)}`;
    
    const call = {
      callId: callId,
      chatId: chat._id,
      initiator: initiator._id,
      participants: [initiator._id, otherParticipant],
      type: callType,
      status: status,
      startedAt: startedAt,
      endedAt: endedAt,
      duration: endedAt ? Math.floor((endedAt - startedAt) / 1000) : 0,
      createdAt: startedAt
    };
    
    // Add endReason for ended calls
    if (status === 'ended') {
      call.endReason = getRandomElement(['user_ended', 'network_error', 'timeout']);
    } else if (status === 'rejected') {
      call.endReason = 'user_rejected';
      call.rejectionReason = 'Call rejected';
    }
    
    try {
      const createdCall = await Call.create(call);
      return createdCall;
    } catch (error) {
      console.error(`❌ Error creating call ${index + 1}:`, error.message);
      return null;
    }
  });
  
  const successfulCalls = calls.filter(c => c !== null);
  console.log(`✅ Created ${successfulCalls.length} calls`);
  return successfulCalls;
}

// Create follow requests
async function createFollowRequests(users, count) {
  console.log(`👤 Creating ${count} follow requests...`);
  
  const requestIndices = Array.from({ length: count }, (_, i) => i);
  const requests = await processInBatches(requestIndices, 50, async (index) => {
    const requester = getRandomElement(users);
    let recipient = getRandomElement(users);
    while (recipient._id.toString() === requester._id.toString()) {
      recipient = getRandomElement(users);
    }
    
    const status = getRandomElement(['pending', 'accepted', 'rejected']);
    const request = {
      requester: requester._id,
      recipient: recipient._id,
      status: status,
      createdAt: getRandomDate(30),
      ...(status !== 'pending' && { respondedAt: getRandomDate(20) })
    };
    
    try {
      const createdRequest = await FollowRequest.create(request);
      return createdRequest;
    } catch (error) {
      console.error(`❌ Error creating follow request ${index + 1}:`, error.message);
      return null;
    }
  });
  
  console.log(`✅ Created ${requests.length} follow requests`);
  return requests;
}

// Create message requests
async function createMessageRequests(users, count) {
  console.log(`📩 Creating ${count} message requests...`);
  
  const requestIndices = Array.from({ length: count }, (_, i) => i);
  const requests = await processInBatches(requestIndices, 50, async (index) => {
    const sender = getRandomElement(users);
    let recipient = getRandomElement(users);
    while (recipient._id.toString() === sender._id.toString()) {
      recipient = getRandomElement(users);
    }
    
    const status = getRandomElement(['pending', 'accepted', 'rejected']);
    const request = {
      sender: sender._id,
      recipient: recipient._id,
      status: status,
      message: faker.lorem.sentence(),
      createdAt: getRandomDate(30),
      ...(status !== 'pending' && { respondedAt: getRandomDate(20) })
    };
    
    try {
      const createdRequest = await MessageRequest.create(request);
      return createdRequest;
    } catch (error) {
      console.error(`❌ Error creating message request ${index + 1}:`, error.message);
      return null;
    }
  });
  
  console.log(`✅ Created ${requests.length} message requests`);
  return requests;
}

// Create user reports
async function createUserReports(users, count) {
  console.log(`🚨 Creating ${count} user reports...`);
  
  const reportIndices = Array.from({ length: count }, (_, i) => i);
  const reports = await processInBatches(reportIndices, 50, async (index) => {
    const reporter = getRandomElement(users);
    let reported = getRandomElement(users);
    while (reported._id.toString() === reporter._id.toString()) {
      reported = getRandomElement(users);
    }
    
    const report = {
      reporter: reporter._id,
      reported: reported._id,
      reason: getRandomElement(['spam', 'harassment', 'inappropriate', 'fake', 'other']),
      description: faker.lorem.sentence(),
      status: getRandomElement(['pending', 'reviewed', 'resolved', 'dismissed']),
      createdAt: getRandomDate(30)
    };
    
    try {
      const createdReport = await UserReport.create(report);
      return createdReport;
    } catch (error) {
      console.error(`❌ Error creating user report ${index + 1}:`, error.message);
      return null;
    }
  });
  
  console.log(`✅ Created ${reports.length} user reports`);
  return reports;
}

// Create notifications
async function createNotifications(users, posts, count) {
  console.log(`🔔 Creating ${count} notifications...`);
  
  const notificationIndices = Array.from({ length: count }, (_, i) => i);
  const notifications = await processInBatches(notificationIndices, 50, async (index) => {
    const recipient = getRandomElement(users);
    const actor = getRandomElement(users);
    const type = getRandomElement(['post_like', 'post_comment', 'follow_request', 'story_reply', 'match']);
    
    const notification = {
      recipient: recipient._id,
      actor: actor._id,
      type: type,
      ...(type === 'post_like' && { post: getRandomElement(posts)?._id }),
      ...(type === 'post_comment' && { post: getRandomElement(posts)?._id }),
      isRead: Math.random() > 0.5,
      createdAt: getRandomDate(7)
    };
    
    try {
      const createdNotification = await Notification.create(notification);
      return createdNotification;
    } catch (error) {
      console.error(`❌ Error creating notification ${index + 1}:`, error.message);
      return null;
    }
  });
  
  console.log(`✅ Created ${notifications.length} notifications`);
  return notifications;
}

// Create refresh tokens
async function createRefreshTokens(users, count) {
  console.log(`🔑 Creating ${count} refresh tokens...`);
  
  const tokenIndices = Array.from({ length: count }, (_, i) => i);
  const tokens = await processInBatches(tokenIndices, 50, async (index) => {
    const user = getRandomElement(users);
    
    const token = {
      user: user._id,
      token: faker.string.alphanumeric(64),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      createdAt: getRandomDate(30)
    };
    
    try {
      const createdToken = await RefreshToken.create(token);
      return createdToken;
    } catch (error) {
      console.error(`❌ Error creating refresh token ${index + 1}:`, error.message);
      return null;
    }
  });
  
  console.log(`✅ Created ${tokens.length} refresh tokens`);
  return tokens;
}

// Create content moderation entries
async function createContentModeration(users, posts, count) {
  console.log(`🛡️  Creating ${count} content moderation entries...`);
  
  const moderationIndices = Array.from({ length: count }, (_, i) => i);
  const moderations = await processInBatches(moderationIndices, 50, async (index) => {
    const reporter = getRandomElement(users);
    const post = getRandomElement(posts);
    
    const moderation = {
      reporter: reporter._id,
      contentId: post._id,
      contentType: 'post',
      reason: getRandomElement(['spam', 'inappropriate', 'violence', 'hate_speech', 'other']),
      status: getRandomElement(['pending', 'reviewed', 'action_taken', 'dismissed']),
      createdAt: getRandomDate(30)
    };
    
    try {
      const createdModeration = await ContentModeration.create(moderation);
      return createdModeration;
    } catch (error) {
      console.error(`❌ Error creating content moderation ${index + 1}:`, error.message);
      return null;
    }
  });
  
  console.log(`✅ Created ${moderations.length} content moderation entries`);
  return moderations;
}

// Create dating interactions
async function createDatingInteractions(users, count) {
  console.log(`💕 Creating ${count} dating interactions...`);
  
  const interactionIndices = Array.from({ length: count }, (_, i) => i);
  const interactions = await processInBatches(interactionIndices, 50, async (index) => {
    const user1 = getRandomElement(users);
    let user2 = getRandomElement(users);
    while (user2._id.toString() === user1._id.toString()) {
      user2 = getRandomElement(users);
    }
    
    const interaction = {
      user: user1._id,
      targetUser: user2._id,
      type: getRandomElement(['like', 'super_like', 'pass']),
      createdAt: getRandomDate(30)
    };
    
    try {
      const createdInteraction = await DatingInteraction.create(interaction);
      return createdInteraction;
    } catch (error) {
      console.error(`❌ Error creating dating interaction ${index + 1}:`, error.message);
      return null;
    }
  });
  
  console.log(`✅ Created ${interactions.length} dating interactions`);
  return interactions;
}

// Create dating matches
async function createDatingMatches(users, count) {
  console.log(`💑 Creating ${count} dating matches...`);
  
  const matchIndices = Array.from({ length: count }, (_, i) => i);
  const matches = await processInBatches(matchIndices, 50, async (index) => {
    const user1 = getRandomElement(users);
    let user2 = getRandomElement(users);
    while (user2._id.toString() === user1._id.toString()) {
      user2 = getRandomElement(users);
    }
    
    const match = {
      users: [user1._id, user2._id],
      matchedAt: getRandomDate(30),
      isActive: Math.random() > 0.2,
      createdAt: getRandomDate(30)
    };
    
    try {
      const createdMatch = await DatingMatch.create(match);
      return createdMatch;
    } catch (error) {
      console.error(`❌ Error creating dating match ${index + 1}:`, error.message);
      return null;
    }
  });
  
  console.log(`✅ Created ${matches.length} dating matches`);
  return matches;
}

// Create dating profile comments
async function createDatingProfileComments(users, count) {
  console.log(`💬 Creating ${count} dating profile comments...`);
  
  const commentIndices = Array.from({ length: count }, (_, i) => i);
  const comments = await processInBatches(commentIndices, 50, async (index) => {
    const author = getRandomElement(users);
    let profileOwner = getRandomElement(users);
    while (profileOwner._id.toString() === author._id.toString()) {
      profileOwner = getRandomElement(users);
    }
    
    const comment = {
      author: author._id,
      profileOwner: profileOwner._id,
      content: faker.lorem.sentence(),
      isVisible: Math.random() > 0.1,
      createdAt: getRandomDate(30)
    };
    
    try {
      const createdComment = await DatingProfileComment.create(comment);
      return createdComment;
    } catch (error) {
      console.error(`❌ Error creating dating profile comment ${index + 1}:`, error.message);
      return null;
    }
  });
  
  console.log(`✅ Created ${comments.length} dating profile comments`);
  return comments;
}

// Create user statuses
async function createUserStatuses(users, count) {
  console.log(`📊 Creating ${count} user statuses...`);
  
  const statusIndices = Array.from({ length: count }, (_, i) => i);
  const statuses = await processInBatches(statusIndices, 50, async (index) => {
    const user = getRandomElement(users);
    
    const status = {
      user: user._id,
      status: getRandomElement(['online', 'offline', 'away', 'busy']),
      lastSeen: getRandomDate(1),
      isActive: Math.random() > 0.3,
      createdAt: getRandomDate(1)
    };
    
    try {
      const createdStatus = await UserStatus.create(status);
      return createdStatus;
    } catch (error) {
      console.error(`❌ Error creating user status ${index + 1}:`, error.message);
      return null;
    }
  });
  
  console.log(`✅ Created ${statuses.length} user statuses`);
  return statuses;
}

// Make target user follow all other users
async function makeTargetUserFollowAll(targetUser, allUsers) {
  console.log(`\n🔗 Making target user (${TARGET_USER_PHONE}) follow all other users...`);
  
  const otherUsers = allUsers.filter(u => u._id.toString() !== targetUser._id.toString());
  console.log(`📊 Found ${otherUsers.length} users to follow`);
  
  // Add all users to target user's following list
  targetUser.following = otherUsers.map(u => u._id);
  await targetUser.save();
  
  // Add target user to all other users' followers list
  await processInBatches(otherUsers, 50, async (user) => {
    if (!user.followers.includes(targetUser._id)) {
      user.followers.push(targetUser._id);
      await user.save();
    }
  });
  
  // Reload target user to get updated following count
  const updatedTargetUser = await User.findById(targetUser._id).select('following');
  
  console.log(`✅ Target user now follows ${updatedTargetUser.following.length} users`);
  console.log(`✅ All posts and stories from these users are now visible to target user`);
  
  // Verify visibility
  const visiblePostsCount = await Post.countDocuments({
    $or: [
      { visibility: 'public' },
      { visibility: 'followers', author: { $in: updatedTargetUser.following } }
    ]
  });
  
  const visibleStoriesCount = await Story.countDocuments({
    $or: [
      { privacy: 'public' },
      { privacy: 'followers', author: { $in: updatedTargetUser.following } }
    ],
    status: 'active',
    expiresAt: { $gt: new Date() }
  });
  
  console.log(`\n📊 Visibility Verification:`);
  console.log(`   - Posts visible to target user: ${visiblePostsCount}`);
  console.log(`   - Stories visible to target user: ${visibleStoriesCount}`);
}

// Main function
async function comprehensiveSeed() {
  const startTime = Date.now();
  console.log('🚀 Starting Comprehensive Seed Script...');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`📊 Configuration:`);
  Object.entries(CONFIG).forEach(([key, value]) => {
    console.log(`   - ${key}: ${value}`);
  });
  console.log(`📱 Target user phone: ${TARGET_USER_PHONE}`);
  console.log('═══════════════════════════════════════════════════════\n');
  
  try {
    // Connect to database
    await connectToDatabase();
    
    // Clear database if needed
    const args = process.argv.slice(2);
    if (args.includes('--clear=true')) {
      await clearDatabase();
    }
    
    // Create users
    const users = await createUsers(CONFIG.users);
    const targetUser = users.find(u => u.phoneNumber === TARGET_USER_PHONE);
    
    if (!targetUser) {
      throw new Error(`Target user with phone ${TARGET_USER_PHONE} not found!`);
    }
    
    console.log(`\n✅ Target user created: ${targetUser.username || targetUser.fullName} (${TARGET_USER_PHONE})\n`);
    
    // Create posts (images and videos only)
    const posts = await createPosts(users, CONFIG.posts);
    
    // Create stories
    const stories = await createStories(users, CONFIG.stories);
    
    // Create chats
    const chats = await createChats(users, CONFIG.chats);
    
    // Create messages
    const messages = await createMessages(chats, users, CONFIG.messages);
    
    // Create calls
    const calls = await createCalls(chats, users, CONFIG.calls);
    
    // Create follow requests
    const followRequests = await createFollowRequests(users, CONFIG.followRequests);
    
    // Create message requests
    const messageRequests = await createMessageRequests(users, CONFIG.messageRequests);
    
    // Create user reports
    const userReports = await createUserReports(users, CONFIG.reports);
    
    // Create notifications
    const notifications = await createNotifications(users, posts, CONFIG.notifications);
    
    // Create refresh tokens
    const refreshTokens = await createRefreshTokens(users, CONFIG.refreshTokens);
    
    // Create content moderation
    const contentModeration = await createContentModeration(users, posts, CONFIG.moderationEntries);
    
    // Create dating interactions
    const datingInteractions = await createDatingInteractions(users, CONFIG.datingInteractions);
    
    // Create dating matches
    const datingMatches = await createDatingMatches(users, CONFIG.datingMatches);
    
    // Create dating profile comments
    const datingComments = await createDatingProfileComments(users, CONFIG.datingComments);
    
    // Create user statuses
    const userStatuses = await createUserStatuses(users, CONFIG.userStatuses);
    
    // Make target user follow all other users
    await makeTargetUserFollowAll(targetUser, users);
    
    // Reload target user to get final state
    const finalTargetUser = await User.findById(targetUser._id).select('following username fullName phoneNumber');
    
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    
    // Print summary
    console.log('\n🎉 Comprehensive Seed Completed!');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`✅ Users: ${users.length}`);
    console.log(`✅ Posts: ${posts.length} (images and videos only)`);
    console.log(`✅ Stories: ${stories.length}`);
    console.log(`✅ Chats: ${chats.length}`);
    console.log(`✅ Messages: ${messages.length}`);
    console.log(`✅ Calls: ${calls.length}`);
    console.log(`✅ Follow Requests: ${followRequests.length}`);
    console.log(`✅ Message Requests: ${messageRequests.length}`);
    console.log(`✅ User Reports: ${userReports.length}`);
    console.log(`✅ Notifications: ${notifications.length}`);
    console.log(`✅ Refresh Tokens: ${refreshTokens.length}`);
    console.log(`✅ Content Moderation: ${contentModeration.length}`);
    console.log(`✅ Dating Interactions: ${datingInteractions.length}`);
    console.log(`✅ Dating Matches: ${datingMatches.length}`);
    console.log(`✅ Dating Profile Comments: ${datingComments.length}`);
    console.log(`✅ User Statuses: ${userStatuses.length}`);
    console.log(`\n📱 Target User (${TARGET_USER_PHONE}):`);
    console.log(`   - Username: ${finalTargetUser.username || finalTargetUser.fullName || 'N/A'}`);
    console.log(`   - Following: ${finalTargetUser.following.length} users`);
    console.log(`   - Can see all posts and stories from followed users`);
    console.log(`   - All posts contain only images or videos (no other media types)`);
    console.log(`\n⏱️  Total time: ${totalTime}s`);
    console.log('═══════════════════════════════════════════════════════');
    
  } catch (error) {
    console.error('❌ Error in comprehensive seed:', error);
    throw error;
  } finally {
    await disconnectFromDatabase();
  }
}

// Run if called directly
if (require.main === module) {
  comprehensiveSeed()
    .then(() => {
      console.log('\n✅ Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { comprehensiveSeed };

