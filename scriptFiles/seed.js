/*
  Enhanced Seed Script for VibgyorNode Platform
  Populates database with comprehensive demo data for testing all features
  
  Usage:
  node scriptFiles/seed.js --clear=true (uses default: 100 users, each with 3+ posts)
  node scriptFiles/seed.js --clear=true --users=150 --posts=750
  node scriptFiles/seed.js --clear=false --users=50 --chats=100 --messages=500 --calls=30
  
  Default Configuration:
  - 100 users (each user gets minimum 3 posts)
  - 200 chats, 1000 messages, 75 calls
  - 150 follow requests, 125 message requests, 40 reports
  - 500 posts (distributed: 3 per user + extras randomly)
  - 50 post templates, 75 post collections
  
  Available Parameters:
  --clear: Clear existing data (true/false, default: false)
  --users: Number of users to create (default: 100)
  --chats: Number of chats to create (default: 200)
  --messages: Number of messages to create (default: 1000)
  --calls: Number of calls to create (default: 75)
  --followRequests: Number of follow requests (default: 150)
  --messageRequests: Number of message requests (default: 125)
  --reports: Number of user reports (default: 40)
  --posts: Number of posts to create (default: 500, min 3 per user)
  --postTemplates: Number of post templates (default: 50)
  --postCollections: Number of post collections (default: 75)
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
// Optional models - will be handled gracefully if they don't exist
let PostTemplate, PostCollection;
try {
  PostTemplate = require('../src/user/userModel/postTemplateModel');
} catch (e) {
  PostTemplate = null;
}
try {
  PostCollection = require('../src/user/userModel/postCollectionModel');
} catch (e) {
  PostCollection = null;
}

// Video URL to use everywhere
const VIDEO_URL = 'https://yoraaecommerce.s3.ap-south-1.amazonaws.com/69045c2b833fc493301cb760/posts-video/1762856646669-njkjkjh.mp4';

// Demo data generators
const { faker } = require('@faker-js/faker');

// Configuration
const DEFAULT_CONFIG = {
  clear: false,
  users: 100,
  chats: 200,
  messages: 1000,
  calls: 75,
  followRequests: 150,
  messageRequests: 125,
  reports: 40,
  posts: 500,
  stories: 250,
  notifications: 400,
  refreshTokens: 150,
  moderationEntries: 60,
  datingInteractions: 200,
  datingComments: 120,
  postTemplates: 50,
  postCollections: 75
};

// Parse command line arguments
function parseArgs(argv) {
  const args = { ...DEFAULT_CONFIG };
  for (const part of argv.slice(2)) {
    const [k, v] = part.replace(/^--/, '').split('=');
    if (k && v !== undefined) {
      args[k] = v === 'true' ? true : v === 'false' ? false : parseInt(v) || v;
    }
  }
  return args;
}

// Sample data arrays
const SAMPLE_NAMES = [
  'Alice Johnson', 'Bob Smith', 'Charlie Brown', 'Diana Prince', 'Eve Wilson',
  'Frank Miller', 'Grace Lee', 'Henry Davis', 'Iris Chen', 'Jack Taylor',
  'Kate Williams', 'Leo Rodriguez', 'Maya Patel', 'Noah Kim', 'Olivia Garcia',
  'Paul Anderson', 'Quinn Thompson', 'Rachel Green', 'Sam Wilson', 'Tina Turner',
  'Uma Thurman', 'Victor Hugo', 'Wendy Darling', 'Xavier Woods', 'Yara Shahidi',
  'Zack Morris', 'Amy Santiago', 'Ben Wyatt', 'Claire Dunphy', 'David Rose'
];

const SAMPLE_USERNAMES = [
  'alice_j', 'bob_smith', 'charlie_b', 'diana_p', 'eve_w',
  'frank_m', 'grace_l', 'henry_d', 'iris_c', 'jack_t',
  'kate_w', 'leo_r', 'maya_p', 'noah_k', 'olivia_g',
  'paul_a', 'quinn_t', 'rachel_g', 'sam_w', 'tina_t',
  'uma_t', 'victor_h', 'wendy_d', 'xavier_w', 'yara_s',
  'zack_m', 'amy_s', 'ben_w', 'claire_d', 'david_r'
];

const SAMPLE_PHONE_NUMBERS = [
  '7776665555', '8887776666', '9998887777', '1112223333', '2223334444',
  '3334445555', '4445556666', '5556667777', '6667778888', '7778889999',
  '8889990000', '9990001111', '0001112222', '1113334444', '2224445555',
  '3335556666', '4446667777', '5557778888', '6668889999', '7779990000',
  '8880001111', '9991112222', '0002223333', '1114445555', '2225556666',
  '3336667777', '4447778888', '5558889999', '6669990000', '7770001111'
];

const SAMPLE_EMAILS = [
  'alice@example.com', 'bob@example.com', 'charlie@example.com', 'diana@example.com', 'eve@example.com',
  'frank@example.com', 'grace@example.com', 'henry@example.com', 'iris@example.com', 'jack@example.com',
  'kate@example.com', 'leo@example.com', 'maya@example.com', 'noah@example.com', 'olivia@example.com',
  'paul@example.com', 'quinn@example.com', 'rachel@example.com', 'sam@example.com', 'tina@example.com',
  'uma@example.com', 'victor@example.com', 'wendy@example.com', 'xavier@example.com', 'yara@example.com',
  'zack@example.com', 'amy@example.com', 'ben@example.com', 'claire@example.com', 'david@example.com'
];

const SAMPLE_INTERESTS = [
  'Photography', 'Music', 'Travel', 'Cooking', 'Sports', 'Art', 'Technology',
  'Reading', 'Gaming', 'Fitness', 'Movies', 'Dancing', 'Writing', 'Gardening',
  'Fashion', 'Business', 'Education', 'Health', 'Nature', 'Food'
];

const SAMPLE_LIKES = [
  'Coffee', 'Pizza', 'Beach', 'Mountains', 'Sunset', 'Rain', 'Books', 'Movies',
  'Music', 'Dancing', 'Cooking', 'Travel', 'Photography', 'Art', 'Sports',
  'Gaming', 'Technology', 'Nature', 'Animals', 'Friends'
];

const SAMPLE_GENDERS = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];
const SAMPLE_PRONOUNS = ['he/him', 'she/her', 'they/them', 'ze/zir', 'xe/xem'];

const SAMPLE_MESSAGE_CONTENT = [
  'Hey! How are you doing?',
  'What are your plans for the weekend?',
  'Did you see that new movie?',
  'I had such a great time yesterday!',
  'Can we meet up later?',
  'Thanks for the help!',
  'Happy birthday! 🎉',
  'Congratulations on your achievement!',
  'I miss you!',
  'Let\'s catch up soon',
  'How was your day?',
  'I love this song!',
  'Check out this photo I took',
  'What do you think about this?',
  'I\'m so excited!',
  'That sounds amazing!',
  'I totally agree with you',
  'Have a great day!',
  'See you tomorrow!',
  'Take care!'
];

const SAMPLE_CALL_REASONS = [
  'user_ended', 'user_rejected', 'no_answer', 'busy', 'network_error', 'timeout'
];

const SAMPLE_POST_CONTENT = [
  'Just had an amazing day at the beach! 🌊',
  'Working on some exciting new projects 💻',
  'Beautiful sunset today! 🌅',
  'Coffee and coding - perfect combination ☕',
  'Weekend vibes are the best! 🎉',
  'Learning something new every day 📚',
  'Nature never fails to amaze me 🌿',
  'Great workout session today! 💪',
  'Food photography is my new passion 📸',
  'Travel memories that last forever ✈️',
  'Music is the language of the soul 🎵',
  'Art is everywhere if you look closely 🎨',
  'Friends make everything better 👫',
  'Technology is changing the world 🚀',
  'Books are windows to other worlds 📖',
  'Cooking is an art form 👨‍🍳',
  'Fitness is not just physical, it\'s mental 🧠',
  'Photography captures moments in time 📷',
  'Travel broadens the mind 🌍',
  'Creativity knows no bounds ✨'
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
  '#technology', '#coding', '#design', '#creativity', '#adventure', '#friends',
  '#family', '#work', '#success', '#goals', '#dreams', '#peace', '#joy'
];

const SAMPLE_LANGUAGES = ['English', 'Spanish', 'French', 'German', 'Hindi', 'Mandarin'];

const SAMPLE_STATUS_MESSAGES = [
  'Online and thriving',
  'In a meeting',
  'Traveling today',
  'Heads down, coding',
  'Coffee first',
  'Exploring new ideas',
  'Available for chats',
  'Out for a walk',
  'Focusing on product',
  'Back soon'
];

const SAMPLE_NOTIFICATION_TYPES = [
  'post_like',
  'post_comment',
  'follow_request',
  'story_reply',
  'match',
  'dating_like',
  'system_announcement'
];

const SAMPLE_DATING_COMMENTS = [
  'Loved your travel vibes!',
  'Great smile!',
  'Let’s grab coffee sometime.',
  'This totally resonates.',
  'Amazing energy in your profile!'
];

// Utility functions
function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomElements(array, count) {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function getRandomDate(daysAgo = 30) {
  const now = new Date();
  const pastDate = new Date(now.getTime() - (Math.random() * daysAgo * 24 * 60 * 60 * 1000));
  return pastDate;
}

function getRandomPhoneNumber() {
  return getRandomElement(SAMPLE_PHONE_NUMBERS);
}

function getRandomEmail() {
  return getRandomElement(SAMPLE_EMAILS);
}

// Clear database function
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
    
    if (PostTemplate) deletePromises.push(PostTemplate.deleteMany({}));
    if (PostCollection) deletePromises.push(PostCollection.deleteMany({}));
    
    await Promise.all(deletePromises);
    
    console.log('✅ Database cleared successfully');
  } catch (error) {
    console.error('❌ Error clearing database:', error);
    throw error;
  }
}

// Create admin users
async function createAdmins() {
  console.log('👑 Creating admin users...');
  
  const admins = [
    {
      phoneNumber: '9998887777',
      countryCode: '+91',
      name: 'Super Admin',
      email: 'admin@vibgyor.com',
      avatarUrl: VIDEO_URL,
      isVerified: true
    },
    {
      phoneNumber: '8887776666',
      countryCode: '+91',
      name: 'System Admin',
      email: 'system@vibgyor.com',
      avatarUrl: VIDEO_URL,
      isVerified: true
    }
  ];
  
  try {
    const createdAdmins = await Admin.insertMany(admins);
    console.log(`✅ Created ${createdAdmins.length} admin users`);
    return createdAdmins;
  } catch (error) {
    console.error('❌ Error creating admins:', error);
    throw error;
  }
}

// Create sub-admin users
async function createSubAdmins() {
  console.log('👨‍💼 Creating sub-admin users...');
  
  const subAdmins = [
    {
      phoneNumber: '7776665555',
      countryCode: '+91',
      name: 'Moderator One',
      email: 'mod1@vibgyor.com',
      avatarUrl: VIDEO_URL,
      isVerified: true,
      isActive: true
    },
    {
      phoneNumber: '6665554444',
      countryCode: '+91',
      name: 'Moderator Two',
      email: 'mod2@vibgyor.com',
      avatarUrl: VIDEO_URL,
      isVerified: true,
      isActive: true
    }
  ];
  
  try {
    const createdSubAdmins = await SubAdmin.insertMany(subAdmins);
    console.log(`✅ Created ${createdSubAdmins.length} sub-admin users`);
    return createdSubAdmins;
  } catch (error) {
    console.error('❌ Error creating sub-admins:', error);
    throw error;
  }
}

// Create regular users
async function createUsers(count) {
  console.log(`👥 Creating ${count} regular users...`);
  
  const users = [];
  
  for (let i = 0; i < count; i++) {
    const name = SAMPLE_NAMES[i] || faker.person.fullName();
    const username = SAMPLE_USERNAMES[i] || faker.internet.username();
    const phoneNumber = SAMPLE_PHONE_NUMBERS[i] || faker.phone.number().replace(/\D/g, '').slice(0, 10);
    const email = SAMPLE_EMAILS[i] || faker.internet.email();
    
    // Create some users with incomplete profiles for realistic testing
    const profileCompleteness = Math.random();
    const primaryLanguage = getRandomElement(SAMPLE_LANGUAGES);
    const secondaryLanguage = getRandomElement(SAMPLE_LANGUAGES.filter(lang => lang !== primaryLanguage));

    let userData = {
      phoneNumber: phoneNumber,
      countryCode: '+91',
      username: username,
      usernameNorm: username.toLowerCase(),
      fullName: profileCompleteness > 0.1 ? name : '', // 90% have names
      email: profileCompleteness > 0.2 ? email : '', // 80% have emails
      emailVerified: profileCompleteness > 0.3 && Math.random() > 0.3, // 70% verified if they have email
      bio: profileCompleteness > 0.4 ? faker.lorem.sentence() : '', // 60% have bio
      dob: profileCompleteness > 0.5 ? faker.date.past({ years: 30, refDate: '2000-01-01' }) : null, // 50% have DOB
      gender: profileCompleteness > 0.6 ? getRandomElement(SAMPLE_GENDERS) : '', // 40% have gender
      pronouns: profileCompleteness > 0.7 ? getRandomElement(SAMPLE_PRONOUNS) : '', // 30% have pronouns
      interests: profileCompleteness > 0.8 ? getRandomElements(SAMPLE_INTERESTS, Math.floor(Math.random() * 5) + 1) : [], // 20% have interests
      likes: profileCompleteness > 0.8 ? getRandomElements(SAMPLE_LIKES, Math.floor(Math.random() * 5) + 1) : [], // 20% have likes
      location: profileCompleteness > 0.9 ? {
        lat: parseFloat(faker.location.latitude()),
        lng: parseFloat(faker.location.longitude()),
        city: faker.location.city(),
        country: faker.location.country()
      } : { lat: null, lng: null, city: '', country: '' }, // 10% have location
      profilePictureUrl: profileCompleteness > 0.3 ? VIDEO_URL : '',
      isActive: Math.random() > 0.1, // 90% active
      isProfileCompleted: false, // Will be calculated based on actual data
      profileCompletionStep: 'basic_info', // Will be calculated based on actual data
      verificationStatus: getRandomElement(['none', 'pending', 'approved', 'rejected']),
      verificationDocument: {
        documentType: Math.random() > 0.7 ? getRandomElement(['id_proof', 'passport', 'driving_license']) : '',
        documentUrl: Math.random() > 0.7 ? `https://example.com/documents/doc_${i}.pdf` : '',
        documentNumber: Math.random() > 0.7 ? faker.string.alphanumeric(10) : '',
        uploadedAt: Math.random() > 0.7 ? getRandomDate(30) : null,
        reviewedBy: null,
        reviewedAt: null,
        rejectionReason: '',
        reviewerRole: null
      },
      following: [],
      followers: [],
      blockedUsers: [],
      blockedBy: [],
      privacySettings: {
        isPrivate: Math.random() > 0.8, // 20% private
        allowFollowRequests: Math.random() > 0.2, // 80% allow
        showOnlineStatus: Math.random() > 0.3, // 70% show
        allowMessages: getRandomElement(['everyone', 'followers', 'none']),
        allowCommenting: Math.random() > 0.1, // 90% allow
        allowTagging: Math.random() > 0.1, // 90% allow
        allowStoriesSharing: Math.random() > 0.1 // 90% allow
      },
      preferences: {
        hereFor: getRandomElement(['Make New Friends', 'Dating', 'Networking']),
        primaryLanguage,
        secondaryLanguage,
        location: {
          city: profileCompleteness > 0.9 ? faker.location.city() : '',
          country: profileCompleteness > 0.9 ? faker.location.country() : '',
          lat: profileCompleteness > 0.9 ? parseFloat(faker.location.latitude()) : null,
          lng: profileCompleteness > 0.9 ? parseFloat(faker.location.longitude()) : null
        }
      },
      dating: {
        photos: [],
        videos: [],
        isDatingProfileActive: Math.random() > 0.6,
        // Dating preferences (used by controller even though not in schema)
        preferences: {
          hereTo: getRandomElement(['Make New Friends', 'Dating']),
          wantToMeet: getRandomElement(['Man', 'Woman', 'Everyone']),
          ageRange: {
            min: Math.floor(Math.random() * 5) + 20,
            max: Math.floor(Math.random() * 15) + 30
          },
          languages: getRandomElements(SAMPLE_LANGUAGES, 2),
          location: {
            city: profileCompleteness > 0.9 ? faker.location.city() : '',
            country: profileCompleteness > 0.9 ? faker.location.country() : '',
            coordinates: {
              lat: profileCompleteness > 0.9 ? parseFloat(faker.location.latitude()) : null,
              lng: profileCompleteness > 0.9 ? parseFloat(faker.location.longitude()) : null
            }
          },
          distanceRange: {
            min: 0,
            max: Math.floor(Math.random() * 50) + 10
          }
        },
        lastUpdatedAt: new Date()
      },
      otpCode: null,
      otpExpiresAt: null,
      lastOtpSentAt: getRandomDate(7),
      emailOtpCode: null,
      emailOtpExpiresAt: null,
      lastEmailOtpSentAt: getRandomDate(7),
      lastLoginAt: getRandomDate(7)
    };
    
    users.push(userData);
  }
  
  try {
    const createdUsers = await User.insertMany(users);
    console.log(`✅ Created ${createdUsers.length} regular users`);
    return createdUsers;
  } catch (error) {
    console.error('❌ Error creating users:', error);
    throw error;
  }
}

// Create chats between users
async function createChats(users, count) {
  console.log(`💬 Creating ${count} chats...`);
  
  const chats = [];
  
  for (let i = 0; i < count; i++) {
    const user1 = getRandomElement(users);
    let user2 = getRandomElement(users);
    
    // Ensure user1 and user2 are different
    while (user2._id.toString() === user1._id.toString()) {
      user2 = getRandomElement(users);
    }
    
    const chat = {
      participants: [user1._id, user2._id],
      chatType: 'direct',
      lastMessageAt: getRandomDate(7),
      userSettings: [
        {
          userId: user1._id,
          unreadCount: Math.floor(Math.random() * 5),
          isPinned: Math.random() > 0.8,
          isMuted: Math.random() > 0.9,
          isArchived: false
        },
        {
          userId: user2._id,
          unreadCount: Math.floor(Math.random() * 5),
          isPinned: Math.random() > 0.8,
          isMuted: Math.random() > 0.9,
          isArchived: false
        }
      ],
      createdAt: getRandomDate(30)
    };
    
    chats.push(chat);
  }
  
  try {
    const createdChats = await Chat.insertMany(chats);
    console.log(`✅ Created ${createdChats.length} chats`);
    return createdChats;
  } catch (error) {
    console.error('❌ Error creating chats:', error);
    throw error;
  }
}

// Create messages for chats
async function createMessages(chats, users, count) {
  console.log(`📝 Creating ${count} messages...`);
  
  const messages = [];
  
  for (let i = 0; i < count; i++) {
    const chat = getRandomElement(chats);
    const sender = getRandomElement(chat.participants);
    const content = getRandomElement(SAMPLE_MESSAGE_CONTENT);
    const messageType = Math.random() > 0.8 ? getRandomElement(['image', 'video', 'audio', 'document']) : 'text';
    
    const message = {
      chatId: chat._id,
      senderId: sender,
      type: messageType,
      content: messageType === 'text' ? content : null,
        media: messageType !== 'text' ? {
        url: messageType === 'video' ? VIDEO_URL : `https://example.com/media/${messageType}_${i}.${messageType === 'image' ? 'jpg' : messageType === 'video' ? 'mp4' : messageType === 'audio' ? 'mp3' : 'pdf'}`,
        fileName: `${messageType}_${i}.${messageType === 'image' ? 'jpg' : messageType === 'video' ? 'mp4' : messageType === 'audio' ? 'mp3' : 'pdf'}`,
        fileSize: Math.floor(Math.random() * 10000000) + 1000000,
        mimeType: messageType === 'image' ? 'image/jpeg' : messageType === 'video' ? 'video/mp4' : messageType === 'audio' ? 'audio/mp3' : 'application/pdf',
        duration: ['audio', 'video'].includes(messageType) ? Math.floor(Math.random() * 300) + 10 : undefined // 10-310 seconds
      } : null,
      reactions: Math.random() > 0.7 ? [
        { userId: getRandomElement(chat.participants), emoji: getRandomElement(['👍', '❤️', '😂', '😢', '😡']) }
      ] : [],
      readBy: Math.random() > 0.3 ? [{ userId: getRandomElement(chat.participants) }] : [],
      isDeleted: Math.random() > 0.95,
      forwardedFrom: Math.random() > 0.9 ? getRandomElement(messages)?.id : null,
      createdAt: getRandomDate(7)
    };
    
    messages.push(message);
  }
  
  try {
    const createdMessages = await Message.insertMany(messages);
    console.log(`✅ Created ${createdMessages.length} messages`);
    
    // Update chat last messages
    for (const message of createdMessages) {
      await Chat.findByIdAndUpdate(message.chatId, {
        lastMessage: message._id,
        lastMessageAt: message.createdAt
      });
    }
    
    return createdMessages;
  } catch (error) {
    console.error('❌ Error creating messages:', error);
    throw error;
  }
}

// Create calls between users
async function createCalls(chats, users, count) {
  console.log(`📞 Creating ${count} calls...`);
  
  const calls = [];
  
  for (let i = 0; i < count; i++) {
    const chat = getRandomElement(chats);
    const initiator = getRandomElement(chat.participants);
    const type = getRandomElement(['audio', 'video']);
    const status = getRandomElement(['ended', 'missed', 'rejected']);
    const startedAt = getRandomDate(7);
    const duration = status === 'ended' ? Math.floor(Math.random() * 1800) + 30 : 0; // 30 seconds to 30 minutes
    const endedAt = status === 'ended' ? new Date(startedAt.getTime() + duration * 1000) : null;
    
    const call = {
      callId: `call_${Date.now()}_${i}`,
      chatId: chat._id,
      initiator: initiator,
      participants: chat.participants,
      type: type,
      status: status,
      startedAt: startedAt,
      endedAt: endedAt,
      duration: duration,
      endReason: status === 'ended' ? 'user_ended' : status === 'rejected' ? 'user_rejected' : 'timeout',
      rejectionReason: status === 'rejected' ? getRandomElement(['busy', 'not_available', 'declined']) : null,
      webrtcData: {
        offer: status === 'ended' ? { sdp: 'mock_sdp_offer', type: 'offer' } : null,
        answer: status === 'ended' ? { sdp: 'mock_sdp_answer', type: 'answer' } : null,
        iceCandidates: status === 'ended' ? [
          { candidate: 'mock_ice_candidate_1', sdpMid: '0', sdpMLineIndex: 0 },
          { candidate: 'mock_ice_candidate_2', sdpMid: '1', sdpMLineIndex: 1 }
        ] : []
      },
      recording: {
        isRecording: status === 'ended' && Math.random() > 0.7,
        recordingUrl: status === 'ended' && Math.random() > 0.7 ? VIDEO_URL : null
      },
      createdAt: startedAt
    };
    
    calls.push(call);
  }
  
  try {
    const createdCalls = await Call.insertMany(calls);
    console.log(`✅ Created ${createdCalls.length} calls`);
    return createdCalls;
  } catch (error) {
    console.error('❌ Error creating calls:', error);
    throw error;
  }
}

// Create follow requests
async function createFollowRequests(users, count) {
  console.log(`👥 Creating ${count} follow requests...`);
  
  const followRequests = [];
  const usedPairs = new Set();
  
  for (let i = 0; i < count; i++) {
    const requester = getRandomElement(users);
    let recipient = getRandomElement(users);
    
    // Ensure requester and recipient are different
    while (recipient._id.toString() === requester._id.toString()) {
      recipient = getRandomElement(users);
    }
    
    // Create unique pair key
    const pairKey = `${requester._id.toString()}-${recipient._id.toString()}`;
    const reversePairKey = `${recipient._id.toString()}-${requester._id.toString()}`;
    
    // Skip if this pair already exists
    if (usedPairs.has(pairKey) || usedPairs.has(reversePairKey)) {
      continue;
    }
    
    usedPairs.add(pairKey);
    
    const status = getRandomElement(['pending', 'accepted', 'rejected']);
    
    const followRequest = {
      requester: requester._id,
      recipient: recipient._id,
      status: status,
      message: Math.random() > 0.5 ? faker.lorem.sentence() : null,
      createdAt: getRandomDate(14),
      updatedAt: status !== 'pending' ? getRandomDate(7) : null
    };
    
    followRequests.push(followRequest);
  }
  
  try {
    const createdFollowRequests = await FollowRequest.insertMany(followRequests);
    console.log(`✅ Created ${createdFollowRequests.length} follow requests`);
    return createdFollowRequests;
  } catch (error) {
    console.error('❌ Error creating follow requests:', error);
    throw error;
  }
}

// Create message requests
async function createMessageRequests(users, count) {
  console.log(`📨 Creating ${count} message requests...`);
  
  const messageRequests = [];
  const usedPairs = new Set();
  
  for (let i = 0; i < count; i++) {
    const requester = getRandomElement(users);
    let recipient = getRandomElement(users);
    
    // Ensure requester and recipient are different
    while (recipient._id.toString() === requester._id.toString()) {
      recipient = getRandomElement(users);
    }
    
    // Create unique pair key
    const pairKey = `${requester._id.toString()}-${recipient._id.toString()}`;
    const reversePairKey = `${recipient._id.toString()}-${requester._id.toString()}`;
    
    // Skip if this pair already exists
    if (usedPairs.has(pairKey) || usedPairs.has(reversePairKey)) {
      continue;
    }
    
    usedPairs.add(pairKey);
    
    const status = getRandomElement(['pending', 'accepted', 'rejected']);
    
    const messageRequest = {
      fromUserId: requester._id,
      toUserId: recipient._id,
      status: status,
      message: faker.lorem.sentence(),
      createdAt: getRandomDate(14),
      updatedAt: status !== 'pending' ? getRandomDate(7) : null
    };
    
    messageRequests.push(messageRequest);
  }
  
  try {
    const createdMessageRequests = await MessageRequest.insertMany(messageRequests);
    console.log(`✅ Created ${createdMessageRequests.length} message requests`);
    return createdMessageRequests;
  } catch (error) {
    console.error('❌ Error creating message requests:', error);
    throw error;
  }
}

// Create user reports
async function createUserReports(users, count) {
  console.log(`🚨 Creating ${count} user reports...`);
  
  const reports = [];
  const usedPairs = new Set();
  const reportTypes = ['spam', 'harassment', 'fake_profile', 'inappropriate_content', 'other'];
  
  for (let i = 0; i < count; i++) {
    const reporter = getRandomElement(users);
    let reportedUser = getRandomElement(users);
    
    // Ensure reporter and reported user are different
    while (reportedUser._id.toString() === reporter._id.toString()) {
      reportedUser = getRandomElement(users);
    }
    
    // Create unique pair key
    const pairKey = `${reporter._id.toString()}-${reportedUser._id.toString()}`;
    
    // Skip if this pair already exists
    if (usedPairs.has(pairKey)) {
      continue;
    }
    
    usedPairs.add(pairKey);
    
    const status = getRandomElement(['pending', 'resolved', 'dismissed']);
    
    const report = {
      reporter: reporter._id,
      reportedUser: reportedUser._id,
      reportType: getRandomElement(reportTypes),
      description: faker.lorem.paragraph(),
      status: status,
      adminNotes: status === 'resolved' ? faker.lorem.sentence() : null,
      resolvedBy: status === 'resolved' ? getRandomElement(users)._id : null,
      resolvedAt: status === 'resolved' ? getRandomDate(7) : null,
      createdAt: getRandomDate(14)
    };
    
    reports.push(report);
  }
  
  try {
    const createdReports = await UserReport.insertMany(reports);
    console.log(`✅ Created ${createdReports.length} user reports`);
    return createdReports;
  } catch (error) {
    console.error('❌ Error creating user reports:', error);
    throw error;
  }
}

// Create posts
async function createPosts(users, count) {
  console.log(`📝 Creating ${count} posts (ensuring each user has posts)...`);
  
  const posts = [];
  const minPostsPerUser = 3; // Minimum posts per user
  const totalMinimumPosts = users.length * minPostsPerUser;
  
  // Ensure we create at least minPostsPerUser for each user
  const actualPostCount = Math.max(count, totalMinimumPosts);
  
  // First, create minimum posts for each user
  for (let i = 0; i < users.length; i++) {
    const author = users[i];
    
    // Create minPostsPerUser posts for this user
    for (let j = 0; j < minPostsPerUser; j++) {
      const content = getRandomElement(SAMPLE_POST_CONTENT);
      const caption = getRandomElement(SAMPLE_POST_CAPTIONS);
      const hashtags = getRandomElements(SAMPLE_HASHTAGS, Math.floor(Math.random() * 5) + 1);
      const visibility = getRandomElement(['public', 'followers']);
      const status = getRandomElement(['published', 'published', 'published', 'draft']); // Mostly published
      const publishedAt = getRandomDate(30);
      
      // Create some posts with media
      const hasMedia = Math.random() > 0.6; // 40% have media
      const media = hasMedia ? [{
        type: 'video',
        url: VIDEO_URL,
        thumbnail: VIDEO_URL,
        filename: `post_${posts.length}.mp4`,
        fileSize: Math.floor(Math.random() * 20000000) + 5000000,
        mimeType: 'video/mp4',
        s3Key: `posts/video/post_${posts.length}.mp4`,
        duration: Math.floor(Math.random() * 300) + 10, // 10-310 seconds
        dimensions: {
          width: 1920,
          height: 1080
        }
      }] : [];
      
      // Ensure content or media exists (Post model requirement)
      if (!content && media.length === 0) {
        content = getRandomElement(SAMPLE_POST_CONTENT);
      }
      
      // Create some posts with location
      const hasLocation = Math.random() > 0.7; // 30% have location
      const location = hasLocation ? {
        name: faker.location.city(),
        coordinates: {
          lat: parseFloat(faker.location.latitude()),
          lng: parseFloat(faker.location.longitude())
        },
        address: faker.location.streetAddress(),
        placeId: `place_${posts.length}`,
        placeType: 'locality',
        accuracy: 'approximate',
        isVisible: true
      } : {};
      
      // Create some posts with mentions
      const hasMentions = Math.random() > 0.8; // 20% have mentions
      const mentions = hasMentions ? [{
        user: getRandomElement(users)._id,
        position: {
          start: Math.floor(Math.random() * content.length / 2),
          end: Math.floor(Math.random() * content.length / 2) + 10
        },
        context: 'content', // Valid enum: 'content', 'caption', 'comment', 'poll_option'
        notified: false,
        notificationSentAt: null
      }] : [];
      
      const post = {
        author: author._id,
        ...(content && { content: content }),
        ...(caption && { caption: caption }),
        media: media,
        hashtags: hashtags,
        mentions: mentions,
        ...(Object.keys(location).length > 0 && { location: location }),
        visibility: visibility,
        commentVisibility: getRandomElement(['everyone', 'followers', 'none']),
        status: status,
        publishedAt: status === 'published' ? publishedAt : null,
        scheduledAt: null,
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
          reach: 0,
          impressions: 0,
          engagement: 0,
          lastAnalyzed: new Date()
        },
        lastEngagementAt: publishedAt,
        createdAt: publishedAt,
        updatedAt: publishedAt
      };
      
      posts.push(post);
    }
  }
  
  // Create remaining random posts if needed
  const remainingPosts = actualPostCount - posts.length;
  for (let i = 0; i < remainingPosts; i++) {
    const author = getRandomElement(users);
    const content = getRandomElement(SAMPLE_POST_CONTENT);
    const caption = getRandomElement(SAMPLE_POST_CAPTIONS);
    const hashtags = getRandomElements(SAMPLE_HASHTAGS, Math.floor(Math.random() * 5) + 1);
    const visibility = getRandomElement(['public', 'followers']);
    const status = getRandomElement(['published', 'published', 'published', 'draft']); // Mostly published
    const publishedAt = getRandomDate(30);
    
    // Create some posts with media
    const hasMedia = Math.random() > 0.6; // 40% have media
    const media = hasMedia ? [{
      type: 'video',
      url: VIDEO_URL,
      thumbnail: VIDEO_URL,
      filename: `post_${i}.mp4`,
      fileSize: Math.floor(Math.random() * 20000000) + 5000000,
      mimeType: 'video/mp4',
      s3Key: `posts/video/post_${i}.mp4`,
      duration: Math.floor(Math.random() * 300) + 10, // 10-310 seconds
      dimensions: {
        width: 1920,
        height: 1080
      }
    }] : [];
    
    // Ensure content or media exists (Post model requirement)
    if (!content && media.length === 0) {
      content = getRandomElement(SAMPLE_POST_CONTENT);
    }
    
    // Create some posts with location
    const hasLocation = Math.random() > 0.7; // 30% have location
    const location = hasLocation ? {
      name: faker.location.city(),
      coordinates: {
        lat: parseFloat(faker.location.latitude()),
        lng: parseFloat(faker.location.longitude())
      },
      address: faker.location.streetAddress(),
      placeId: `place_${i}`,
      placeType: 'locality',
      accuracy: 'approximate',
      isVisible: true
    } : {};
    
    // Create some posts with mentions
    const hasMentions = Math.random() > 0.8; // 20% have mentions
    const mentions = hasMentions ? [{
      user: getRandomElement(users)._id,
      position: {
        start: Math.floor(Math.random() * content.length / 2),
        end: Math.floor(Math.random() * content.length / 2) + 10
      },
      context: 'content', // Valid enum: 'content', 'caption', 'comment', 'poll_option'
      notified: false,
      notificationSentAt: null
    }] : [];
    
    const post = {
      author: author._id,
      ...(content && { content: content }),
      ...(caption && { caption: caption }),
      media: media,
      hashtags: hashtags,
      mentions: mentions,
      ...(Object.keys(location).length > 0 && { location: location }),
      visibility: visibility,
      commentVisibility: getRandomElement(['everyone', 'followers', 'none']),
      status: status,
      publishedAt: status === 'published' ? publishedAt : null,
      scheduledAt: null,
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
        reach: 0,
        impressions: 0,
        engagement: 0,
        lastAnalyzed: new Date()
      },
      lastEngagementAt: publishedAt,
      createdAt: publishedAt,
      updatedAt: publishedAt
    };
    
    posts.push(post);
  }
  
  try {
    const createdPosts = await Post.insertMany(posts);
    console.log(`✅ Created ${createdPosts.length} posts`);
    return createdPosts;
  } catch (error) {
    console.error('❌ Error creating posts:', error);
    throw error;
  }
}

// Create stories
async function createStories(users, count) {
  console.log(`🎬 Creating ${count} stories...`);

  if (!count || users.length === 0) {
    return [];
  }

  const stories = [];

  for (let i = 0; i < count; i++) {
    const author = getRandomElement(users);
    const mediaType = Math.random() > 0.4 ? 'video' : 'image';
    const filename = `story_${i}.${mediaType === 'video' ? 'mp4' : 'jpg'}`;

    const mediaUrl = mediaType === 'video'
      ? VIDEO_URL
      : faker.image.urlLoremFlickr({ width: 1080, height: 1920, category: 'people' });

    // Ensure content or media exists for story
    const storyContent = Math.random() > 0.3 ? faker.lorem.sentence() : '';
    
    const story = {
      author: author._id,
      ...(storyContent && { content: storyContent }),
      media: {
        type: mediaType,
        url: mediaUrl,
        thumbnail: mediaType === 'video' ? VIDEO_URL : mediaUrl,
        filename,
        fileSize: Math.floor(Math.random() * 4_000_000) + 200_000,
        mimeType: mediaType === 'video' ? 'video/mp4' : 'image/jpeg',
        duration: mediaType === 'video' ? Math.floor(Math.random() * 20) + 5 : null,
        dimensions: { width: 1080, height: 1920 },
        s3Key: `stories/${author._id}/${filename}`
      },
      mentions: [],
      views: [],
      replies: [],
      status: 'active',
      privacy: getRandomElement(['public', 'followers', 'close_friends']),
      closeFriends: getRandomElements(users, Math.floor(Math.random() * 3))
        .map(user => user._id),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      analytics: {
        viewsCount: 0,
        likesCount: 0,
        repliesCount: 0,
        sharesCount: 0
      },
      isReported: false,
      reports: []
    };

    if (Math.random() > 0.7) {
      const mentionedUser = getRandomElement(users.filter(u => u._id.toString() !== author._id.toString()));
      story.mentions.push({
        user: mentionedUser?._id,
        position: { start: 0, end: 5 }
      });
    }

    if (Math.random() > 0.6) {
      const viewer = getRandomElement(users);
      story.views.push({
        user: viewer._id,
        viewedAt: new Date(),
        viewDuration: Math.floor(Math.random() * 30),
        isLiked: Math.random() > 0.5
      });
      story.analytics.viewsCount = story.views.length;
      story.analytics.likesCount = story.views.filter(view => view.isLiked).length;
    }

    stories.push(story);
  }

  try {
    const createdStories = await Story.insertMany(stories);
    console.log(`✅ Created ${createdStories.length} stories`);
    return createdStories;
  } catch (error) {
    console.error('❌ Error creating stories:', error);
    throw error;
  }
}

// Seed dating interactions, matches, and comments
async function seedDatingData(users, interactionsCount, commentsCount) {
  console.log(`💘 Creating ${interactionsCount} dating interactions and ${commentsCount} comments...`);

  if (!users.length) {
    return { interactions: [], matches: [], comments: [] };
  }

  const interactions = [];
  const usedPairs = new Set();
  const potentialMatches = [];

  for (let i = 0; i < interactionsCount; i++) {
    const user = getRandomElement(users);
    let target = getRandomElement(users);

    while (target._id.toString() === user._id.toString()) {
      target = getRandomElement(users);
    }

    const pairKey = `${user._id.toString()}-${target._id.toString()}`;
    if (usedPairs.has(pairKey)) {
      continue;
    }

    const action = Math.random() > 0.25 ? 'like' : 'dislike';
    const hasComment = action === 'like' && Math.random() > 0.8;
    const baseInteraction = {
      user: user._id,
      targetUser: target._id,
      action,
      status: action === 'like' ? 'pending' : 'dismissed',
      isMatchNotified: false,
      ...(hasComment && {
        comment: {
          text: getRandomElement(SAMPLE_DATING_COMMENTS),
          createdAt: new Date()
        }
      })
    };

    interactions.push(baseInteraction);
    usedPairs.add(pairKey);

    if (action === 'like' && Math.random() > 0.6) {
      const reverseKey = `${target._id.toString()}-${user._id.toString()}`;
      if (!usedPairs.has(reverseKey)) {
        interactions.push({
          user: target._id,
          targetUser: user._id,
          action: 'like',
          status: 'matched',
          matchedAt: new Date(),
          isMatchNotified: false
        });
        usedPairs.add(reverseKey);
      }
      potentialMatches.push([user._id, target._id]);
    }
  }

  let createdInteractions = [];
  let createdMatches = [];

  try {
    createdInteractions = await DatingInteraction.insertMany(interactions, { ordered: false });

    for (const [userId, targetId] of potentialMatches) {
      const match = await DatingMatch.createOrGetMatch(userId, targetId);
      createdMatches.push(match);
    }
  } catch (error) {
    console.error('❌ Error creating dating interactions:', error.message || error);
  }

  const comments = [];
  for (let i = 0; i < commentsCount; i++) {
    const author = getRandomElement(users);
    let target = getRandomElement(users);
    while (target._id.toString() === author._id.toString()) {
      target = getRandomElement(users);
    }
    comments.push({
      user: author._id,
      targetUser: target._id,
      text: getRandomElement(SAMPLE_DATING_COMMENTS),
      likes: [],
      likesCount: 0,
      isPinned: false,
      isDeleted: false
    });
  }

  let createdComments = [];
  try {
    createdComments = await DatingProfileComment.insertMany(comments);
  } catch (error) {
    console.error('❌ Error creating dating comments:', error);
  }

  console.log(`✅ Dating data seeded: ${createdInteractions.length} interactions, ${createdMatches.length} matches, ${createdComments.length} comments`);
  return { interactions: createdInteractions, matches: createdMatches, comments: createdComments };
}

// Create notifications
async function createNotifications(users, posts, matches, count) {
  console.log(`🔔 Creating ${count} notifications...`);

  if (!count) {
    return [];
  }

  const notifications = [];

  for (let i = 0; i < count; i++) {
    const recipient = getRandomElement(users);
    let sender = getRandomElement(users);
    while (sender._id.toString() === recipient._id.toString() && Math.random() > 0.2) {
      sender = getRandomElement(users);
    }

    const type = getRandomElement(SAMPLE_NOTIFICATION_TYPES);
    const context = ['dating_like', 'match'].includes(type) ? 'dating' : 'social';

    let relatedContent = null;
    if (type === 'post_like' || type === 'post_comment') {
      const post = getRandomElement(posts);
      if (post) {
        relatedContent = {
          contentType: 'post',
          contentId: post._id,
          metadata: {
            caption: post.caption,
            preview: post.content?.slice(0, 80)
          }
        };
      }
    } else if (type === 'match' && matches?.length) {
      const match = getRandomElement(matches);
      relatedContent = {
        contentType: 'match',
        contentId: match._id,
        metadata: {}
      };
    }

    notifications.push({
      context,
      recipient: recipient._id,
      sender: sender?._id,
      type,
      title: faker.helpers.arrayElement([
        'New like received',
        'Someone commented on your post',
        'You have a new match',
        'Reminder from Vibgyor'
      ]),
      message: faker.lorem.sentence(),
      relatedContent,
      deliveryStatus: 'delivered',
      status: Math.random() > 0.5 ? 'read' : 'unread',
      priority: getRandomElement(['low', 'normal', 'high']),
      deliveryChannels: {
        inApp: { delivered: true, deliveredAt: new Date() },
        push: { delivered: Math.random() > 0.3, deliveredAt: new Date(), deviceTokens: [] },
        email: { delivered: Math.random() > 0.7, deliveredAt: new Date(), emailAddress: recipient.email || '' },
        sms: { delivered: false }
      },
      analytics: {
        openCount: 0,
        clickCount: 0,
        lastOpenedAt: null,
        lastClickedAt: null
      }
    });
  }

  try {
    const createdNotifications = await Notification.insertMany(notifications);
    console.log(`✅ Created ${createdNotifications.length} notifications`);
    return createdNotifications;
  } catch (error) {
    console.error('❌ Error creating notifications:', error);
    throw error;
  }
}

// Create notification preferences
async function createNotificationPreferences(users) {
  console.log('🛎️  Creating notification preferences...');

  for (const user of users) {
    const typeSettings = {};
    SAMPLE_NOTIFICATION_TYPES.forEach(type => {
      typeSettings[type] = {
        enabled: true,
        channels: {
          inApp: true,
          push: type !== 'system_announcement',
          email: ['system_announcement', 'post_comment'].includes(type),
          sms: false
        }
      };
    });

    try {
      await NotificationPreferences.findOneAndUpdate(
        { user: user._id },
        {
          user: user._id,
          contexts: {
            social: { enabled: true, types: typeSettings },
            dating: { enabled: true, types: typeSettings }
          },
          globalSettings: {
            enableNotifications: true,
            quietHours: {
              enabled: Math.random() > 0.85,
              startTime: '22:00',
              endTime: '07:00',
              timezone: 'UTC'
            },
            frequency: getRandomElement(['immediate', 'daily', 'weekly'])
          },
          channels: {
            inApp: { enabled: true, sound: true, vibration: true },
            push: { enabled: true, sound: true, badge: true },
            email: { enabled: Math.random() > 0.4, frequency: 'daily' },
            sms: { enabled: false, emergencyOnly: true }
          }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    } catch (error) {
      console.error(`❌ Error creating notification preferences for user ${user._id}:`, error);
    }
  }
}

// Create refresh tokens
async function createRefreshTokens(users, count) {
  console.log(`🔐 Creating ${count} refresh tokens...`);

  if (!count) {
    return [];
  }

  const tokens = [];
  for (let i = 0; i < count; i++) {
    const user = getRandomElement(users);
    tokens.push({
      userId: user._id,
      token: faker.string.uuid(),
      issuedAt: new Date(),
      ipAddress: faker.internet.ip(),
      isValid: Math.random() > 0.2,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });
  }

  try {
    const createdTokens = await RefreshToken.insertMany(tokens);
    console.log(`✅ Created ${createdTokens.length} refresh tokens`);
    return createdTokens;
  } catch (error) {
    console.error('❌ Error creating refresh tokens:', error);
    throw error;
  }
}

// Create content moderation entries
async function createContentModerationEntries(posts, count) {
  console.log(`🛡️  Creating ${count} content moderation entries...`);

  if (!count || posts.length === 0) {
    return [];
  }

  const entries = [];
  for (let i = 0; i < count; i++) {
    const post = getRandomElement(posts);
    if (!post) continue;

    entries.push({
      contentType: 'post',
      contentId: post._id,
      contentAuthor: post.author,
      content: {
        text: post.content || faker.lorem.sentences(2),
        media: (post.media || []).slice(0, 1),
        hashtags: post.hashtags || [],
        mentions: (post.mentions || []).map(m => m.user?.toString())
      },
      moderationResults: {
        aiAnalysis: {
          isAnalyzed: true,
          analyzedAt: new Date(),
          confidence: Math.floor(Math.random() * 40) + 60,
          categories: [{
            category: getRandomElement(['spam', 'safe', 'inappropriate']),
            confidence: Math.floor(Math.random() * 30) + 50
          }],
          flagged: Math.random() > 0.85,
          flagReason: 'Automated sampling',
          riskScore: Math.floor(Math.random() * 40)
        },
        manualReview: {
          isReviewed: Math.random() > 0.7,
          reviewedAt: new Date(),
          decision: getRandomElement(['approved', 'pending', 'escalated']),
          actionTaken: getRandomElement(['none', 'warning'])
        }
      },
      status: getRandomElement(['active', 'under_review', 'hidden'])
    });
  }

  try {
    const createdEntries = await ContentModeration.insertMany(entries);
    console.log(`✅ Created ${createdEntries.length} content moderation entries`);
    return createdEntries;
  } catch (error) {
    console.error('❌ Error creating content moderation entries:', error);
    throw error;
  }
}

// Create user statuses
async function createUserStatuses(users) {
  console.log('🟢 Creating user presence snapshots...');

  const statuses = [];
  for (const user of users) {
    statuses.push({
      userId: user._id,
      isOnline: Math.random() > 0.6,
      lastSeen: getRandomDate(3),
      status: getRandomElement(SAMPLE_STATUS_MESSAGES),
      deviceInfo: {
        platform: getRandomElement(['ios', 'android', 'web']),
        browser: getRandomElement(['Safari', 'Chrome', 'Edge']),
        userAgent: faker.internet.userAgent()
      },
      privacySettings: {
        showOnlineStatus: Math.random() > 0.2,
        showLastSeen: Math.random() > 0.3,
        showTypingStatus: Math.random() > 0.3
      },
      lastActivity: getRandomDate(2),
      typingIn: []
    });
  }

  try {
    await UserStatus.deleteMany({});
    const createdStatuses = await UserStatus.insertMany(statuses);
    console.log(`✅ Created ${createdStatuses.length} user statuses`);
    return createdStatuses;
  } catch (error) {
    console.error('❌ Error creating user statuses:', error);
    throw error;
  }
}

// Create post templates
async function createPostTemplates(users, count) {
  if (!PostTemplate) {
    console.log('⚠️  PostTemplate model not found, skipping post templates creation');
    return [];
  }
  
  console.log(`📋 Creating ${count} post templates...`);
  
  const templates = [];
  const templateNames = [
    'Travel Post', 'Food Review', 'Daily Update', 'Motivational Quote',
    'Work Achievement', 'Weekend Fun', 'Book Recommendation', 'Photo Story',
    'Event Announcement', 'Product Review', 'Tutorial Post', 'Behind the Scenes'
  ];
  
  for (let i = 0; i < count; i++) {
    const creator = getRandomElement(users);
    const templateName = templateNames[i] || `Template ${i + 1}`;
    
    const template = {
      name: templateName,
      description: `A template for ${templateName.toLowerCase()} posts`,
      template: {
        content: getRandomElement(SAMPLE_POST_CONTENT),
        caption: getRandomElement(SAMPLE_POST_CAPTIONS),
        media: [{
          type: 'video',
          placeholder: 'Add your video here',
          url: VIDEO_URL,
          required: Math.random() > 0.5
        }],
        hashtags: getRandomElements(SAMPLE_HASHTAGS, 3)
      },
      customFields: [
        {
          name: 'title',
          type: 'text',
          label: 'Title',
          placeholder: 'Enter title',
          required: false,
          options: [],
          defaultValue: ''
        },
        {
          name: 'category',
          type: 'select',
          label: 'Category',
          placeholder: 'Select category',
          required: false,
          options: ['general', 'travel', 'food', 'work', 'personal'],
          defaultValue: 'general'
        }
      ],
      createdBy: creator._id,
      usageCount: Math.floor(Math.random() * 50),
      isPublic: Math.random() > 0.3 // 70% are public
    };
    
    templates.push(template);
  }
  
  try {
    const createdTemplates = await PostTemplate.insertMany(templates);
    console.log(`✅ Created ${createdTemplates.length} post templates`);
    return createdTemplates;
  } catch (error) {
    console.error('❌ Error creating post templates:', error);
    throw error;
  }
}

// Create post collections
async function createPostCollections(users, posts, count) {
  if (!PostCollection) {
    console.log('⚠️  PostCollection model not found, skipping post collections creation');
    return [];
  }
  
  console.log(`📚 Creating ${count} post collections...`);
  
  const collections = [];
  const collectionNames = [
    'My Favorites', 'Travel Memories', 'Food Adventures', 'Work Projects',
    'Weekend Fun', 'Inspiration', 'Tutorials', 'Behind the Scenes',
    'Product Reviews', 'Daily Life', 'Achievements', 'Learning Journey',
    'Creative Works', 'Nature Photos', 'Friends & Family'
  ];
  
  for (let i = 0; i < count; i++) {
    const owner = getRandomElement(users);
    const collectionName = collectionNames[i] || `Collection ${i + 1}`;
    
    // Select random posts for this collection
    const collectionPosts = getRandomElements(posts, Math.floor(Math.random() * 10) + 1);
    
    const collection = {
      name: collectionName,
      description: `A collection of ${collectionName.toLowerCase()}`,
      owner: owner._id,
      posts: collectionPosts.map(post => ({
        post: post._id,
        addedAt: getRandomDate(30),
        addedBy: owner._id,
        notes: Math.random() > 0.7 ? 'Great post!' : ''
      })),
      isPublic: Math.random() > 0.4, // 60% are public
      coverImage: collectionPosts.length > 0 && collectionPosts[0].media.length > 0 ? collectionPosts[0].media[0].url : VIDEO_URL,
      tags: getRandomElements(['collection', 'saved', 'favorites'], Math.floor(Math.random() * 2) + 1),
      stats: {
        totalPosts: collectionPosts.length,
        totalViews: Math.floor(Math.random() * 1000),
        totalLikes: Math.floor(Math.random() * 500),
        totalShares: Math.floor(Math.random() * 100),
        lastActivity: getRandomDate(30)
      },
      isActive: true
    };
    
    collections.push(collection);
  }
  
  try {
    const createdCollections = await PostCollection.insertMany(collections);
    console.log(`✅ Created ${createdCollections.length} post collections`);
    return createdCollections;
  } catch (error) {
    console.error('❌ Error creating post collections:', error);
    throw error;
  }
}

// Ensure user catalog values exist
async function ensureUserCatalog() {
  console.log('📚 Ensuring user catalog entries exist...');

  const existing = await UserCatalog.findOne();
  if (existing) {
    return existing;
  }

  const catalog = await UserCatalog.create({
    genderList: ['Male', 'Female', 'Non-binary', 'Prefer not to say'],
    pronounList: ['he/him', 'she/her', 'they/them', 'xe/xem'],
    likeList: SAMPLE_LIKES,
    interestList: SAMPLE_INTERESTS,
    hereForList: ['Make New Friends', 'Dating', 'Networking'],
    languageList: ['English', 'Spanish', 'French', 'German', 'Hindi'],
    version: 1
  });

  console.log('✅ User catalog created');
  return catalog;
}

// Add dating media (photos/videos) for users with active dating profiles
async function addDatingMedia(users) {
  console.log('📸 Adding dating photos/videos to active dating profiles...');
  
  try {
    const usersWithDating = users.filter(user => user.dating?.isDatingProfileActive);
    
    for (const user of usersWithDating) {
      const numPhotos = Math.floor(Math.random() * 4) + 1; // 1-4 photos
      const numVideos = Math.random() > 0.7 ? Math.floor(Math.random() * 2) + 1 : 0; // 0-2 videos
      
      const photos = [];
      for (let i = 0; i < numPhotos; i++) {
        photos.push({
          url: VIDEO_URL,
          thumbnailUrl: VIDEO_URL,
          order: i,
          uploadedAt: getRandomDate(30)
        });
      }
      
      const videos = [];
      for (let i = 0; i < numVideos; i++) {
        videos.push({
          url: VIDEO_URL,
          thumbnailUrl: VIDEO_URL,
          duration: Math.floor(Math.random() * 60) + 10, // 10-70 seconds
          order: i,
          uploadedAt: getRandomDate(30)
        });
      }
      
      await User.findByIdAndUpdate(user._id, {
        $set: {
          'dating.photos': photos,
          'dating.videos': videos,
          'dating.lastUpdatedAt': new Date()
        }
      });
    }
    
    console.log(`✅ Added dating media to ${usersWithDating.length} users`);
  } catch (error) {
    console.error('❌ Error adding dating media:', error);
    // Don't throw - this is optional
  }
}

// Update user statistics and relationships
async function updateUserStatistics(users, followRequests, messageRequests) {
  console.log('📊 Updating user statistics and relationships...');
  
  try {
    for (const user of users) {
      // Get accepted follow requests where this user is the recipient (followers)
      const followers = followRequests.filter(fr => 
        fr.recipient && fr.recipient.toString() === user._id.toString() && fr.status === 'accepted'
      );
      
      // Get accepted follow requests where this user is the requester (following)
      const following = followRequests.filter(fr => 
        fr.requester && fr.requester.toString() === user._id.toString() && fr.status === 'accepted'
      );
      
      // Extract user IDs for followers and following
      const followerIds = followers.map(fr => fr.requester);
      const followingIds = following.map(fr => fr.recipient);
      
      // Determine profile completion step based on user data
      let profileCompletionStep = 'basic_info';
      let isProfileCompleted = false;
      
      if (user.fullName && user.username && user.email && user.dob && user.bio) {
        if (user.gender) {
          if (user.pronouns) {
            if (user.likes && user.likes.length > 0 && user.interests && user.interests.length > 0) {
              if (user.idProofUrl) {
                if (user.location && user.location.city && user.location.country) {
                  profileCompletionStep = 'completed';
                  isProfileCompleted = true;
                } else {
                  profileCompletionStep = 'location';
                }
              } else {
                profileCompletionStep = 'id_upload';
              }
            } else {
              profileCompletionStep = 'likes_interests';
            }
          } else {
            profileCompletionStep = 'pronouns';
          }
        } else {
          profileCompletionStep = 'gender';
        }
      }
      
      // Update user with actual relationships and correct profile completion
      await User.findByIdAndUpdate(user._id, {
        $set: {
          followers: followerIds,
          following: followingIds,
          profileCompletionStep: profileCompletionStep,
          isProfileCompleted: isProfileCompleted
        }
      });
    }
    
    console.log('✅ User statistics and relationships updated');
  } catch (error) {
    console.error('❌ Error updating user statistics:', error);
    throw error;
  }
}

// Main seed function
async function seedDatabase(config) {
  console.log('🌱 Starting database seeding...');
  console.log('Configuration:', config);
  
  try {
    // Connect to database
    await connectToDatabase();
    
    // Clear database if requested
    if (config.clear) {
      await clearDatabase();
    }
    
    // Create users
    const admins = await createAdmins();
    const subAdmins = await createSubAdmins();
    const users = await createUsers(config.users);
    
    // Create relationships and content
    const chats = await createChats(users, config.chats);
    const messages = await createMessages(chats, users, config.messages);
    const calls = await createCalls(chats, users, config.calls);
    const followRequests = await createFollowRequests(users, config.followRequests);
    const messageRequests = await createMessageRequests(users, config.messageRequests);
    const reports = await createUserReports(users, config.reports);
    
    // Create Posts features
    const posts = await createPosts(users, config.posts);
    const stories = await createStories(users, config.stories);
    const datingData = await seedDatingData(users, config.datingInteractions, config.datingComments);
    const postTemplates = await createPostTemplates(users, config.postTemplates);
    const postCollections = await createPostCollections(users, posts, config.postCollections);
    const notifications = await createNotifications(users, posts, datingData.matches, config.notifications);
    await createNotificationPreferences(users);
    const refreshTokens = await createRefreshTokens(users, config.refreshTokens);
    const moderationEntries = await createContentModerationEntries(posts, config.moderationEntries);
    await createUserStatuses(users);
    await ensureUserCatalog();
    
    // Add dating photos/videos for users with active dating profiles
    await addDatingMedia(users);
    
    // Update statistics
    await updateUserStatistics(users, followRequests, messageRequests);
    
    // Print summary
    console.log('\n🎉 Database seeding completed successfully!');
    console.log('📊 Summary:');
    console.log(`   👑 Admins: ${admins.length}`);
    console.log(`   👨‍💼 Sub-Admins: ${subAdmins.length}`);
    console.log(`   👥 Users: ${users.length}`);
    console.log(`   💬 Chats: ${chats.length}`);
    console.log(`   📝 Messages: ${messages.length}`);
    console.log(`   📞 Calls: ${calls.length}`);
    console.log(`   👥 Follow Requests: ${followRequests.length}`);
    console.log(`   📨 Message Requests: ${messageRequests.length}`);
    console.log(`   🚨 Reports: ${reports.length}`);
    console.log(`   📝 Posts: ${posts.length}`);
    console.log(`   📸 Stories: ${stories.length}`);
    console.log(`   📋 Post Templates: ${postTemplates.length}`);
    console.log(`   📚 Post Collections: ${postCollections.length}`);
    console.log(`   💘 Dating Interactions: ${datingData.interactions.length}`);
    console.log(`   💞 Matches: ${datingData.matches.length}`);
    console.log(`   💬 Dating Comments: ${datingData.comments.length}`);
    console.log(`   🔔 Notifications: ${notifications.length}`);
    console.log(`   🔐 Refresh Tokens: ${refreshTokens.length}`);
    console.log(`   🛡️  Moderation Entries: ${moderationEntries.length}`);
    
    console.log('\n🔑 Test Credentials:');
    console.log('   Admin: +91-9998887777 (OTP: 123456)');
    console.log('   SubAdmin: +91-7776665555 (OTP: 123456)');
    console.log('   Users: +91-7776665555, +91-8887776666, etc. (OTP: 123456)');
    
    console.log('\n🚀 You can now test all the enhanced features!');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    await disconnectFromDatabase();
  }
}

// Run the seed script
async function main() {
  const config = parseArgs(process.argv);
  
  try {
    await seedDatabase(config);
    process.exit(0);
  } catch (error) {
    console.error('💥 Seed script failed:', error.message || error);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  seedDatabase,
  clearDatabase,
  createAdmins,
  createSubAdmins,
  createUsers,
  createChats,
  createMessages,
  createCalls,
  createFollowRequests,
  createMessageRequests,
  createUserReports,
  createPosts,
  createStories,
  createPostTemplates,
  createPostCollections,
  seedDatingData,
  createNotifications,
  createNotificationPreferences,
  createRefreshTokens,
  createContentModerationEntries,
  createUserStatuses,
  ensureUserCatalog
};
