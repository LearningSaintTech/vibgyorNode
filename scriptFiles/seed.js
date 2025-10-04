/*
  Enhanced Seed Script for VibgyorNode Platform
  Populates database with comprehensive demo data for testing all features
  
  Usage:
  node scriptFiles/seed.js --clear=true --users=50 --chats=100 --messages=500 --calls=30
  node scriptFiles/seed.js --clear=false --users=10 --chats=20 --messages=100 --calls=5
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

// Demo data generators
const { faker } = require('@faker-js/faker');

// Configuration
const DEFAULT_CONFIG = {
  clear: false,
  users: 20,
  chats: 40,
  messages: 200,
  calls: 15,
  followRequests: 30,
  messageRequests: 25,
  reports: 8
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
      UserReport.deleteMany({})
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
      avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
      isVerified: true
    },
    {
      phoneNumber: '8887776666',
      countryCode: '+91',
      name: 'System Admin',
      email: 'system@vibgyor.com',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
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
      avatarUrl: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
      isVerified: true,
      isActive: true
    },
    {
      phoneNumber: '6665554444',
      countryCode: '+91',
      name: 'Moderator Two',
      email: 'mod2@vibgyor.com',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
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
    const username = SAMPLE_USERNAMES[i] || faker.internet.userName();
    const phoneNumber = SAMPLE_PHONE_NUMBERS[i] || faker.phone.number().replace(/\D/g, '').slice(0, 10);
    const email = SAMPLE_EMAILS[i] || faker.internet.email();
    
    const user = {
      phoneNumber: phoneNumber,
      countryCode: '+91',
      username: username,
      fullName: name,
      email: email,
      bio: faker.lorem.sentence(),
      dateOfBirth: faker.date.past({ years: 30, refDate: '2000-01-01' }),
      gender: getRandomElement(SAMPLE_GENDERS),
      pronouns: getRandomElement(SAMPLE_PRONOUNS),
      interests: getRandomElements(SAMPLE_INTERESTS, Math.floor(Math.random() * 5) + 1),
      likes: getRandomElements(SAMPLE_LIKES, Math.floor(Math.random() * 5) + 1),
      location: {
        city: faker.location.city(),
        country: faker.location.country(),
        coordinates: {
          latitude: parseFloat(faker.location.latitude()),
          longitude: parseFloat(faker.location.longitude())
        }
      },
      profilePictureUrl: `https://images.unsplash.com/photo-${1500000000000 + i}?w=150&h=150&fit=crop&crop=face`,
      isActive: Math.random() > 0.1, // 90% active
      isVerified: Math.random() > 0.3, // 70% verified
      lastSeen: getRandomDate(7),
      createdAt: getRandomDate(90)
    };
    
    users.push(user);
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

// Update user statistics
async function updateUserStatistics(users, followRequests, messageRequests) {
  console.log('📊 Updating user statistics...');
  
  try {
    for (const user of users) {
      const followersCount = followRequests.filter(fr => 
        fr.recipient && fr.recipient.toString() === user._id.toString() && fr.status === 'accepted'
      ).length;
      
      const followingCount = followRequests.filter(fr => 
        fr.requester && fr.requester.toString() === user._id.toString() && fr.status === 'accepted'
      ).length;
      
      const messageRequestsSent = messageRequests.filter(mr => 
        mr.fromUserId && mr.fromUserId.toString() === user._id.toString()
      ).length;
      
      const messageRequestsReceived = messageRequests.filter(mr => 
        mr.toUserId && mr.toUserId.toString() === user._id.toString()
      ).length;
      
      await User.findByIdAndUpdate(user._id, {
        $set: {
          'socialStats.followersCount': followersCount,
          'socialStats.followingCount': followingCount,
          'socialStats.messageRequestsSent': messageRequestsSent,
          'socialStats.messageRequestsReceived': messageRequestsReceived
        }
      });
    }
    
    console.log('✅ User statistics updated');
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
  createUserReports
};
