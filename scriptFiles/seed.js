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
const User = require('../src/user/userModel/userAuthModel');
const Chat = require('../src/user/userModel/chatModel');
const Message = require('../src/user/userModel/messageModel');
const Call = require('../src/user/userModel/callModel');
const FollowRequest = require('../src/user/userModel/followRequestModel');
const MessageRequest = require('../src/user/userModel/messageRequestModel');
const UserReport = require('../src/user/userModel/userReportModel');
const Post = require('../src/user/userModel/postModel');
const PostTemplate = require('../src/user/userModel/postTemplateModel');
const PostCollection = require('../src/user/userModel/postCollectionModel');

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
    await Promise.all([
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
      PostTemplate.deleteMany({}),
      PostCollection.deleteMany({})
    ]);
    
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
      avatarUrl: 'https://yoraaecommerce.s3.ap-south-1.amazonaws.com/68e75b3b6375ab1ca60c7d44/profile-images/1759992714775-group-three-fashion-designers-working-atelier-with-laptop-papers.jpg',
      isVerified: true
    },
    {
      phoneNumber: '8887776666',
      countryCode: '+91',
      name: 'System Admin',
      email: 'system@vibgyor.com',
      avatarUrl: 'https://yoraaecommerce.s3.ap-south-1.amazonaws.com/68e75b3b6375ab1ca60c7d44/profile-images/1759992714775-group-three-fashion-designers-working-atelier-with-laptop-papers.jpg',
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
      avatarUrl: 'https://yoraaecommerce.s3.ap-south-1.amazonaws.com/68e75b3b6375ab1ca60c7d44/profile-images/1759992714775-group-three-fashion-designers-working-atelier-with-laptop-papers.jpg',
      isVerified: true,
      isActive: true
    },
    {
      phoneNumber: '6665554444',
      countryCode: '+91',
      name: 'Moderator Two',
      email: 'mod2@vibgyor.com',
      avatarUrl: 'https://yoraaecommerce.s3.ap-south-1.amazonaws.com/68e75b3b6375ab1ca60c7d44/profile-images/1759992714775-group-three-fashion-designers-working-atelier-with-laptop-papers.jpg',
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
      profilePictureUrl: profileCompleteness > 0.3 ? 'https://yoraaecommerce.s3.ap-south-1.amazonaws.com/68e75b3b6375ab1ca60c7d44/profile-images/1759992714775-group-three-fashion-designers-working-atelier-with-laptop-papers.jpg' : '',
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
        allowMessages: getRandomElement(['everyone', 'followers', 'none'])
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
        url: `https://example.com/media/${messageType}_${i}.${messageType === 'image' ? 'jpg' : messageType === 'video' ? 'mp4' : messageType === 'audio' ? 'mp3' : 'pdf'}`,
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
        recordingUrl: status === 'ended' && Math.random() > 0.7 ? `https://example.com/recordings/call_${i}.mp4` : null
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
      const privacy = getRandomElement(['public', 'followers', 'close_friends']);
      const status = getRandomElement(['published', 'published', 'published', 'draft']); // Mostly published
      const publishedAt = getRandomDate(30);
      
      // Create some posts with media
      const hasMedia = Math.random() > 0.6; // 40% have media
      const media = hasMedia ? [{
        type: 'image',
        url: 'https://yoraaecommerce.s3.ap-south-1.amazonaws.com/68e75b3b6375ab1ca60c7d44/profile-images/1759992714775-group-three-fashion-designers-working-atelier-with-laptop-papers.jpg',
        thumbnail: 'https://yoraaecommerce.s3.ap-south-1.amazonaws.com/68e75b3b6375ab1ca60c7d44/profile-images/1759992714775-group-three-fashion-designers-working-atelier-with-laptop-papers.jpg',
        filename: `post_${posts.length}.jpg`,
        fileSize: Math.floor(Math.random() * 2000000) + 500000,
        mimeType: 'image/jpeg',
        s3Key: `posts/images/post_${posts.length}.jpg`,
        duration: null,
        dimensions: {
          width: 1920,
          height: 1080
        }
      }] : [];
      
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
        content: content,
        caption: caption,
        media: media,
        hashtags: hashtags,
        mentions: mentions,
        location: location,
        privacy: privacy,
        status: status,
        publishedAt: status === 'published' ? publishedAt : null,
        scheduledAt: null,
        likesCount: Math.floor(Math.random() * 100),
        commentsCount: Math.floor(Math.random() * 50),
        sharesCount: Math.floor(Math.random() * 20),
        viewsCount: Math.floor(Math.random() * 500),
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
    const privacy = getRandomElement(['public', 'followers', 'close_friends']);
    const status = getRandomElement(['published', 'published', 'published', 'draft']); // Mostly published
    const publishedAt = getRandomDate(30);
    
    // Create some posts with media
    const hasMedia = Math.random() > 0.6; // 40% have media
    const media = hasMedia ? [{
      type: 'image',
      url: 'https://yoraaecommerce.s3.ap-south-1.amazonaws.com/68e75b3b6375ab1ca60c7d44/profile-images/1759992714775-group-three-fashion-designers-working-atelier-with-laptop-papers.jpg',
      thumbnail: 'https://yoraaecommerce.s3.ap-south-1.amazonaws.com/68e75b3b6375ab1ca60c7d44/profile-images/1759992714775-group-three-fashion-designers-working-atelier-with-laptop-papers.jpg',
      filename: `post_${i}.jpg`,
      fileSize: Math.floor(Math.random() * 2000000) + 500000,
      mimeType: 'image/jpeg',
      s3Key: `posts/images/post_${i}.jpg`,
      duration: null,
      dimensions: {
        width: 1920,
        height: 1080
      }
    }] : [];
    
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
      content: content,
      caption: caption,
      media: media,
      hashtags: hashtags,
      mentions: mentions,
      location: location,
      privacy: privacy,
      status: status,
      publishedAt: status === 'published' ? publishedAt : null,
      scheduledAt: null,
      likesCount: Math.floor(Math.random() * 100),
      commentsCount: Math.floor(Math.random() * 50),
      sharesCount: Math.floor(Math.random() * 20),
      viewsCount: Math.floor(Math.random() * 500),
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

// Create post templates
async function createPostTemplates(users, count) {
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
          type: 'image',
          placeholder: 'Add your image here',
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
      coverImage: collectionPosts.length > 0 && collectionPosts[0].media.length > 0 ? collectionPosts[0].media[0].url : '',
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
    const postTemplates = await createPostTemplates(users, config.postTemplates);
    const postCollections = await createPostCollections(users, posts, config.postCollections);
    
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
    console.log(`   📋 Post Templates: ${postTemplates.length}`);
    console.log(`   📚 Post Collections: ${postCollections.length}`);
    
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
  createPostTemplates,
  createPostCollections
};
