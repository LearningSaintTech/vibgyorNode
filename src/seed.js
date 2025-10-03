// const mongoose = require('mongoose');
// require('dotenv').config();

// // Import all models
// const User = require('./user/userModel/userAuthModel');
// const Admin = require('./admin/adminModel/adminModel');
// const SubAdmin = require('./subAdmin/subAdminModel/subAdminAuthModel');
// const Chat = require('./user/userModel/chatModel');
// const Message = require('./user/userModel/messageModel');
// const Call = require('./user/userModel/callModel');
// const UserStatus = require('./user/userModel/userStatusModel');
// const MessageRequest = require('./user/userModel/messageRequestModel');
// const FollowRequest = require('./user/userModel/followRequestModel');
// const UserCatalog = require('./user/userModel/userCatalogModel');
// const Report = require('./user/userModel/userReportModel');

// // Database connection
// const connectDB = async () => {
//   try {
//     const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/vibgyor';
//     await mongoose.connect(mongoURI);
//     console.log('✅ Connected to MongoDB');
//   } catch (error) {
//     console.error('❌ MongoDB connection error:', error);
//     process.exit(1);
//   }
// };

// // Utility functions
// const generateCallId = () => {
//   return 'call_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
// };

// const getRandomElement = (array) => {
//   return array[Math.floor(Math.random() * array.length)];
// };

// const getRandomElements = (array, count) => {
//   const shuffled = array.sort(() => 0.5 - Math.random());
//   return shuffled.slice(0, count);
// };

// const getRandomDate = (daysAgo = 30) => {
//   const now = new Date();
//   const pastDate = new Date(now.getTime() - (Math.random() * daysAgo * 24 * 60 * 60 * 1000));
//   return pastDate;
// };

// // Demo data arrays
// const demoData = {
//   names: [
//     'Test User 1', 'Test User 2', // Test users
//     'Alice Johnson', 'Bob Smith', 'Charlie Brown', 'Diana Prince', 'Eve Wilson',
//     'Frank Miller', 'Grace Lee', 'Henry Davis', 'Ivy Chen', 'Jack Taylor',
//     'Kate Williams', 'Liam O\'Connor', 'Maya Patel', 'Noah Kim', 'Olivia Garcia',
//     'Paul Rodriguez', 'Quinn Anderson', 'Rachel Green', 'Sam Wilson', 'Tina Turner',
//     'Uma Thurman', 'Victor Hugo', 'Wendy Darling', 'Xavier Woods', 'Yara Shahidi',
//     'Zoe Saldana', 'Alex Rivera', 'Blake Lively', 'Cameron Diaz', 'Drew Barrymore'
//   ],
  
//   usernames: [
//     'testuser1', 'testuser2', // Test users
//     'alice_j', 'bobsmith', 'charlie_b', 'diana_p', 'eve_w',
//     'frank_m', 'grace_l', 'henry_d', 'ivy_c', 'jack_t',
//     'kate_w', 'liam_o', 'maya_p', 'noah_k', 'olivia_g',
//     'paul_r', 'quinn_a', 'rachel_g', 'sam_w', 'tina_t',
//     'uma_t', 'victor_h', 'wendy_d', 'xavier_w', 'yara_s',
//     'zoe_s', 'alex_r', 'blake_l', 'cameron_d', 'drew_b'
//   ],
  
//   phoneNumbers: [
//     '1234567890', '1234567891', // Test users
//     '9876543210', '9876543211', '9876543212', '9876543213', '9876543214',
//     '9876543215', '9876543216', '9876543217', '9876543218', '9876543219',
//     '9876543220', '9876543221', '9876543222', '9876543223', '9876543224',
//     '9876543225', '9876543226', '9876543227', '9876543228', '9876543229',
//     '9876543230', '9876543231', '9876543232', '9876543233', '9876543234',
//     '9876543235', '9876543236', '9876543237', '9876543238', '9876543239'
//   ],
  
//   emails: [
//     'testuser1@example.com', 'testuser2@example.com', // Test users
//     'alice@example.com', 'bob@example.com', 'charlie@example.com', 'diana@example.com', 'eve@example.com',
//     'frank@example.com', 'grace@example.com', 'henry@example.com', 'ivy@example.com', 'jack@example.com',
//     'kate@example.com', 'liam@example.com', 'maya@example.com', 'noah@example.com', 'olivia@example.com',
//     'paul@example.com', 'quinn@example.com', 'rachel@example.com', 'sam@example.com', 'tina@example.com',
//     'uma@example.com', 'victor@example.com', 'wendy@example.com', 'xavier@example.com', 'yara@example.com',
//     'zoe@example.com', 'alex@example.com', 'blake@example.com', 'cameron@example.com', 'drew@example.com'
//   ],
  
//   bios: [
//     'Love traveling and meeting new people! 🌍',
//     'Photography enthusiast and coffee lover ☕',
//     'Fitness enthusiast and nature lover 🏃‍♀️',
//     'Artist, dreamer, and adventure seeker 🎨',
//     'Tech geek and gaming enthusiast 🎮',
//     'Foodie and cooking enthusiast 👨‍🍳',
//     'Music lover and concert goer 🎵',
//     'Bookworm and writer 📚',
//     'Yoga instructor and wellness advocate 🧘‍♀️',
//     'Entrepreneur and startup enthusiast 💼',
//     'Dog lover and animal rights activist 🐕',
//     'Fashion enthusiast and style blogger 👗',
//     'Environmentalist and sustainability advocate 🌱',
//     'Chef and food blogger 🍳',
//     'Travel blogger and digital nomad ✈️'
//   ],
  
//   interests: [
//     'Photography', 'Travel', 'Music', 'Art', 'Sports', 'Cooking', 'Reading', 'Gaming',
//     'Fitness', 'Yoga', 'Dancing', 'Movies', 'Technology', 'Fashion', 'Nature', 'Animals',
//     'Food', 'Wine', 'Coffee', 'Books', 'Writing', 'Painting', 'Singing', 'Dancing',
//     'Hiking', 'Swimming', 'Cycling', 'Running', 'Meditation', 'Volunteering'
//   ],
  
//   likes: [
//     'Pizza', 'Coffee', 'Chocolate', 'Ice Cream', 'Sushi', 'Pasta', 'Burgers', 'Tacos',
//     'Pancakes', 'Waffles', 'Donuts', 'Cake', 'Cookies', 'Brownies', 'Muffins', 'Bagels',
//     'Sandwiches', 'Salads', 'Smoothies', 'Tea', 'Juice', 'Water', 'Soda', 'Beer',
//     'Wine', 'Cocktails', 'Mocktails', 'Energy Drinks', 'Sports Drinks', 'Hot Chocolate'
//   ],
  
//   genders: ['Male', 'Female', 'Non-binary', 'Prefer not to say'],
//   pronouns: ['He/Him', 'She/Her', 'They/Them', 'He/They', 'She/They'],
  
//   cities: [
//     'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio',
//     'San Diego', 'Dallas', 'San Jose', 'Austin', 'Jacksonville', 'Fort Worth', 'Columbus',
//     'Charlotte', 'San Francisco', 'Indianapolis', 'Seattle', 'Denver', 'Washington',
//     'Boston', 'El Paso', 'Nashville', 'Detroit', 'Oklahoma City', 'Portland', 'Las Vegas',
//     'Memphis', 'Louisville', 'Baltimore', 'Milwaukee', 'Albuquerque', 'Tucson', 'Fresno',
//     'Sacramento', 'Mesa', 'Kansas City', 'Atlanta', 'Long Beach', 'Colorado Springs', 'Raleigh'
//   ],
  
//   countries: ['United States', 'Canada', 'United Kingdom', 'Australia', 'Germany', 'France', 'Japan', 'India'],
  
//   statusMessages: [
//     'Available for chat! 💬',
//     'Working from home 🏠',
//     'Out for a walk 🚶‍♀️',
//     'At the gym 💪',
//     'Cooking dinner 👨‍🍳',
//     'Reading a book 📖',
//     'Listening to music 🎵',
//     'Watching Netflix 📺',
//     'Taking a nap 😴',
//     'Busy but available 📱',
//     'In a meeting 🤝',
//     'Traveling ✈️',
//     'At a coffee shop ☕',
//     'Studying 📚',
//     'Playing games 🎮'
//   ],
  
//   messageContents: [
//     'Hey! How are you doing?',
//     'What\'s up?',
//     'How was your day?',
//     'Want to grab coffee sometime?',
//     'Did you see that movie?',
//     'Thanks for the help earlier!',
//     'Can\'t wait to see you!',
//     'Hope you\'re having a great day!',
//     'What are your plans for the weekend?',
//     'That sounds amazing!',
//     'I totally agree with you',
//     'Let me know when you\'re free',
//     'Sorry for the late reply',
//     'No worries at all!',
//     'That\'s so cool!',
//     'I\'m so excited!',
//     'Can you help me with something?',
//     'Of course! I\'d be happy to help',
//     'You\'re the best!',
//     'Thanks for being awesome!'
//   ],
  
//   reportTypes: ['spam', 'harassment', 'inappropriate_content', 'fake_profile', 'violence', 'hate_speech', 'other'],
//   reportDescriptions: [
//     'This user is sending spam messages',
//     'Inappropriate behavior in chat',
//     'Fake profile with misleading information',
//     'Harassment and bullying',
//     'Inappropriate content shared',
//     'Violent threats made',
//     'Hate speech and discrimination',
//     'Suspicious account activity',
//     'Inappropriate profile picture',
//     'Spreading false information'
//   ]
// };

// // Seed functions
// const seedAdmins = async () => {
//   console.log('🌱 Seeding Admins...');
  
//   const admins = [
//     {
//       phoneNumber: '9999999999',
//       countryCode: '+91',
//       name: 'Super Admin',
//       email: 'admin@vibgyor.com',
//       role: 'admin',
//       isVerified: true,
//       lastLoginAt: new Date()
//     },
//     {
//       phoneNumber: '9999999998',
//       countryCode: '+91',
//       name: 'System Admin',
//       email: 'system@vibgyor.com',
//       role: 'admin',
//       isVerified: true,
//       lastLoginAt: getRandomDate(7)
//     }
//   ];
  
//   await Admin.deleteMany({});
//   const createdAdmins = await Admin.insertMany(admins);
//   console.log(`✅ Created ${createdAdmins.length} admins`);
//   return createdAdmins;
// };

// const seedSubAdmins = async (admins) => {
//   console.log('🌱 Seeding SubAdmins...');
  
//   const subAdmins = [
//     {
//       phoneNumber: '8888888888',
//       countryCode: '+91',
//       name: 'Content Moderator',
//       email: 'moderator@vibgyor.com',
//       role: 'subadmin',
//       isVerified: true,
//       isActive: true,
//       approvalStatus: 'approved',
//       approvedBy: admins[0]._id,
//       approvedAt: getRandomDate(30),
//       lastLoginAt: getRandomDate(3)
//     },
//     {
//       phoneNumber: '8888888887',
//       countryCode: '+91',
//       name: 'Support Agent',
//       email: 'support@vibgyor.com',
//       role: 'subadmin',
//       isVerified: true,
//       isActive: true,
//       approvalStatus: 'approved',
//       approvedBy: admins[0]._id,
//       approvedAt: getRandomDate(25),
//       lastLoginAt: getRandomDate(1)
//     },
//     {
//       phoneNumber: '8888888886',
//       countryCode: '+91',
//       name: 'Pending SubAdmin',
//       email: 'pending@vibgyor.com',
//       role: 'subadmin',
//       isVerified: false,
//       isActive: false,
//       approvalStatus: 'pending',
//       lastLoginAt: getRandomDate(5)
//     }
//   ];
  
//   await SubAdmin.deleteMany({});
//   const createdSubAdmins = await SubAdmin.insertMany(subAdmins);
//   console.log(`✅ Created ${createdSubAdmins.length} subadmins`);
//   return createdSubAdmins;
// };

// const seedUsers = async () => {
//   console.log('🌱 Seeding Users...');
  
//   const users = [];
//   for (let i = 0; i < 30; i++) {
//     const user = {
//       phoneNumber: demoData.phoneNumbers[i],
//       countryCode: '+91',
//       email: demoData.emails[i],
//       emailVerified: Math.random() > 0.3, // 70% verified
//       username: demoData.usernames[i],
//       usernameNorm: demoData.usernames[i].toLowerCase(),
//       fullName: demoData.names[i],
//       dob: getRandomDate(365 * 25), // Random date within last 25 years
//       bio: getRandomElement(demoData.bios),
//       gender: getRandomElement(demoData.genders),
//       pronouns: getRandomElement(demoData.pronouns),
//       likes: getRandomElements(demoData.likes, Math.floor(Math.random() * 5) + 1),
//       interests: getRandomElements(demoData.interests, Math.floor(Math.random() * 8) + 1),
//       profilePictureUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${demoData.usernames[i]}`,
//       idProofUrl: Math.random() > 0.7 ? `https://example.com/id-proof-${i}.jpg` : '',
//       location: {
//         lat: 40.7128 + (Math.random() - 0.5) * 10,
//         lng: -74.0060 + (Math.random() - 0.5) * 10,
//         city: getRandomElement(demoData.cities),
//         country: getRandomElement(demoData.countries)
//       },
//       role: 'user',
//       isProfileCompleted: Math.random() > 0.2, // 80% completed
//       isActive: true, // All users active for testing
//       verificationStatus: getRandomElement(['none', 'none', 'none', 'pending', 'approved']), // Mostly none
//       privacySettings: {
//         isPrivate: Math.random() > 0.8, // 20% private
//         allowFollowRequests: true,
//         showOnlineStatus: Math.random() > 0.3, // 70% show online
//         allowMessages: getRandomElement(['everyone', 'followers', 'none'])
//       },
//       lastLoginAt: getRandomDate(7)
//     };
//     users.push(user);
//   }
  
//   await User.deleteMany({});
//   const createdUsers = await User.insertMany(users);
//   console.log(`✅ Created ${createdUsers.length} users`);
//   return createdUsers;
// };

// const seedUserStatuses = async (users) => {
//   console.log('🌱 Seeding User Statuses...');
  
//   const userStatuses = [];
//   for (const user of users) {
//     const isOnline = Math.random() > 0.6; // 40% online
//     const userStatus = {
//       userId: user._id,
//       isOnline,
//       lastSeen: getRandomDate(7),
//       status: isOnline ? getRandomElement(demoData.statusMessages) : '',
//       connectionId: isOnline ? `conn_${Math.random().toString(36).substr(2, 9)}` : '',
//       deviceInfo: {
//         platform: getRandomElement(['Windows', 'macOS', 'Linux', 'iOS', 'Android']),
//         browser: getRandomElement(['Chrome', 'Firefox', 'Safari', 'Edge']),
//         userAgent: 'Mozilla/5.0 (Demo Browser)'
//       },
//       privacySettings: {
//         showOnlineStatus: user.privacySettings.showOnlineStatus,
//         showLastSeen: Math.random() > 0.3,
//         showTypingStatus: Math.random() > 0.2
//       },
//       lastActivity: getRandomDate(1)
//     };
//     userStatuses.push(userStatus);
//   }
  
//   await UserStatus.deleteMany({});
//   const createdStatuses = await UserStatus.insertMany(userStatuses);
//   console.log(`✅ Created ${createdStatuses.length} user statuses`);
//   return createdStatuses;
// };

// const seedUserCatalog = async () => {
//   console.log('🌱 Seeding User Catalog...');
  
//   const catalog = {
//     genderList: demoData.genders,
//     pronounList: demoData.pronouns,
//     likeList: demoData.likes,
//     interestList: demoData.interests,
//     version: 1
//   };
  
//   await UserCatalog.deleteMany({});
//   const createdCatalog = await UserCatalog.create(catalog);
//   console.log(`✅ Created user catalog with ${createdCatalog.likeList.length} likes and ${createdCatalog.interestList.length} interests`);
//   return createdCatalog;
// };

// const seedFollowRequests = async (users) => {
//   console.log('🌱 Seeding Follow Requests...');
  
//   const followRequests = [];
//   const requestCount = Math.floor(users.length * 0.3); // 30% of users have follow requests
  
//   for (let i = 0; i < requestCount; i++) {
//     const requester = getRandomElement(users);
//     const recipient = getRandomElement(users.filter(u => u._id.toString() !== requester._id.toString()));
    
//     const followRequest = {
//       requester: requester._id,
//       recipient: recipient._id,
//       status: getRandomElement(['pending', 'accepted', 'rejected']),
//       message: Math.random() > 0.5 ? 'Hi! I\'d like to connect with you.' : '',
//       respondedAt: Math.random() > 0.3 ? getRandomDate(7) : null,
//       expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
//     };
//     followRequests.push(followRequest);
//   }
  
//   await FollowRequest.deleteMany({});
//   const createdRequests = await FollowRequest.insertMany(followRequests);
//   console.log(`✅ Created ${createdRequests.length} follow requests`);
//   return createdRequests;
// };

// const seedChats = async (users) => {
//   console.log('🌱 Seeding Chats...');
  
//   const chats = [];
//   const chatCount = Math.floor(users.length * 0.4); // 40% of users have chats
  
//   for (let i = 0; i < chatCount; i++) {
//     const participant1 = getRandomElement(users);
//     const participant2 = getRandomElement(users.filter(u => u._id.toString() !== participant1._id.toString()));
    
//     const chat = {
//       participants: [participant1._id, participant2._id],
//       createdBy: participant1._id,
//       isActive: true,
//       userSettings: [
//         {
//           userId: participant1._id,
//           isArchived: Math.random() > 0.9,
//           isPinned: Math.random() > 0.8,
//           isMuted: Math.random() > 0.9
//         },
//         {
//           userId: participant2._id,
//           isArchived: Math.random() > 0.9,
//           isPinned: Math.random() > 0.8,
//           isMuted: Math.random() > 0.9
//         }
//       ],
//       requestStatus: getRandomElement(['none', 'none', 'none', 'accepted']), // Mostly none
//       lastMessageAt: getRandomDate(7)
//     };
//     chats.push(chat);
//   }
  
//   await Chat.deleteMany({});
//   const createdChats = await Chat.insertMany(chats);
//   console.log(`✅ Created ${createdChats.length} chats`);
//   return createdChats;
// };

// const seedMessages = async (chats, users) => {
//   console.log('🌱 Seeding Messages...');
  
//   const messages = [];
  
//   for (const chat of chats) {
//     const messageCount = Math.floor(Math.random() * 20) + 5; // 5-25 messages per chat
    
//     for (let i = 0; i < messageCount; i++) {
//       const sender = getRandomElement(chat.participants);
//       const message = {
//         chatId: chat._id,
//         senderId: sender,
//         type: getRandomElement(['text', 'text', 'text', 'image', 'audio']), // Mostly text
//         content: getRandomElement(demoData.messageContents),
//         media: Math.random() > 0.8 ? {
//           url: `https://example.com/media/${Math.random().toString(36).substr(2, 9)}.jpg`,
//           thumbnailUrl: `https://example.com/thumbnails/${Math.random().toString(36).substr(2, 9)}.jpg`,
//           mimeType: 'image/jpeg',
//           fileName: `image_${i}.jpg`,
//           fileSize: Math.floor(Math.random() * 1000000) + 100000,
//           duration: 0,
//           dimensions: {
//             width: 1920,
//             height: 1080
//           }
//         } : undefined,
//         status: getRandomElement(['sent', 'delivered', 'read']),
//         readBy: Math.random() > 0.3 ? [{
//           userId: getRandomElement(chat.participants.filter(p => p.toString() !== sender.toString())),
//           readAt: getRandomDate(1)
//         }] : [],
//         reactions: Math.random() > 0.7 ? [{
//           userId: getRandomElement(chat.participants),
//           emoji: getRandomElement(['👍', '❤️', '😂', '😮', '😢', '😡']),
//           createdAt: getRandomDate(1)
//         }] : []
//       };
//       messages.push(message);
//     }
//   }
  
//   await Message.deleteMany({});
//   const createdMessages = await Message.insertMany(messages);
//   console.log(`✅ Created ${createdMessages.length} messages`);
//   return createdMessages;
// };

// const seedCalls = async (chats, users) => {
//   console.log('🌱 Seeding Calls...');
  
//   const calls = [];
//   const callCount = Math.floor(chats.length * 0.3); // 30% of chats have calls
  
//   for (let i = 0; i < callCount; i++) {
//     const chat = getRandomElement(chats);
//     const initiator = getRandomElement(chat.participants);
    
//     const call = {
//       callId: generateCallId(),
//       chatId: chat._id,
//       initiator: initiator,
//       participants: chat.participants,
//       type: getRandomElement(['audio', 'video']),
//       status: getRandomElement(['ended', 'missed', 'rejected']),
//       startedAt: getRandomDate(7),
//       endedAt: getRandomDate(1),
//       duration: Math.floor(Math.random() * 3600) + 60, // 1 minute to 1 hour
//       callQuality: getRandomElement(['excellent', 'good', 'fair', 'poor']),
//       networkInfo: {
//         connectionType: getRandomElement(['wifi', 'cellular', 'ethernet']),
//         bandwidth: Math.floor(Math.random() * 10000) + 1000
//       },
//       settings: {
//         isMuted: Math.random() > 0.7,
//         isVideoEnabled: Math.random() > 0.5,
//         isScreenSharing: Math.random() > 0.9
//       },
//       missedReason: Math.random() > 0.8 ? getRandomElement(['no_answer', 'busy', 'declined', 'network_error']) : undefined
//     };
//     calls.push(call);
//   }
  
//   await Call.deleteMany({});
//   const createdCalls = await Call.insertMany(calls);
//   console.log(`✅ Created ${createdCalls.length} calls`);
//   return createdCalls;
// };

// const seedMessageRequests = async (users) => {
//   console.log('🌱 Seeding Message Requests...');
  
//   const messageRequests = [];
//   const requestCount = Math.floor(users.length * 0.2); // 20% of users have message requests
  
//   for (let i = 0; i < requestCount; i++) {
//     const fromUser = getRandomElement(users);
//     const toUser = getRandomElement(users.filter(u => u._id.toString() !== fromUser._id.toString()));
    
//     const messageRequest = {
//       fromUserId: fromUser._id,
//       toUserId: toUser._id,
//       status: getRandomElement(['pending', 'accepted', 'rejected']),
//       message: getRandomElement(demoData.messageContents),
//       requestedAt: getRandomDate(7),
//       respondedAt: Math.random() > 0.3 ? getRandomDate(7) : null,
//       expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
//       responseMessage: Math.random() > 0.5 ? 'Thanks for reaching out!' : ''
//     };
//     messageRequests.push(messageRequest);
//   }
  
//   await MessageRequest.deleteMany({});
//   const createdRequests = await MessageRequest.insertMany(messageRequests);
//   console.log(`✅ Created ${createdRequests.length} message requests`);
//   return createdRequests;
// };

// const seedReports = async (users, admins) => {
//   console.log('🌱 Seeding Reports...');
  
//   const reports = [];
//   const reportCount = Math.floor(users.length * 0.1); // 10% of users have reports
  
//   for (let i = 0; i < reportCount; i++) {
//     const reporter = getRandomElement(users);
//     const reportedUser = getRandomElement(users.filter(u => u._id.toString() !== reporter._id.toString()));
    
//     const report = {
//       reporter: reporter._id,
//       reportedUser: reportedUser._id,
//       reportType: getRandomElement(demoData.reportTypes),
//       description: getRandomElement(demoData.reportDescriptions),
//       status: getRandomElement(['pending', 'under_review', 'resolved', 'dismissed']),
//       priority: getRandomElement(['low', 'medium', 'high', 'urgent']),
//       reviewedBy: Math.random() > 0.5 ? getRandomElement(admins)._id : null,
//       reviewedAt: Math.random() > 0.5 ? getRandomDate(7) : null,
//       actionTaken: Math.random() > 0.6 ? getRandomElement(['none', 'warning', 'temporary_ban', 'content_removed']) : 'none',
//       reviewerRole: Math.random() > 0.5 ? 'admin' : null,
//       reviewNotes: Math.random() > 0.7 ? 'Report reviewed and action taken' : '',
//       reportedContent: {
//         contentType: getRandomElement(['profile', 'post', 'message']),
//         contentId: Math.random().toString(36).substr(2, 9),
//         contentUrl: Math.random() > 0.5 ? `https://example.com/content/${Math.random().toString(36).substr(2, 9)}` : ''
//       },
//       notifiedReporter: Math.random() > 0.6,
//       notifiedAt: Math.random() > 0.6 ? getRandomDate(7) : null
//     };
//     reports.push(report);
//   }
  
//   await Report.deleteMany({});
//   const createdReports = await Report.insertMany(reports);
//   console.log(`✅ Created ${createdReports.length} reports`);
//   return createdReports;
// };

// // Update relationships
// const updateUserRelationships = async (users, followRequests) => {
//   console.log('🌱 Updating User Relationships...');
  
//   for (const user of users) {
//     const userFollowRequests = followRequests.filter(fr => 
//       fr.requester.toString() === user._id.toString() || 
//       fr.recipient.toString() === user._id.toString()
//     );
    
//     const following = userFollowRequests
//       .filter(fr => fr.requester.toString() === user._id.toString() && fr.status === 'accepted')
//       .map(fr => fr.recipient);
    
//     const followers = userFollowRequests
//       .filter(fr => fr.recipient.toString() === user._id.toString() && fr.status === 'accepted')
//       .map(fr => fr.requester);
    
//     await User.findByIdAndUpdate(user._id, {
//       following,
//       followers
//     });
//   }
  
//   console.log('✅ Updated user relationships');
// };

// const updateChatLastMessages = async (chats, messages) => {
//   console.log('🌱 Updating Chat Last Messages...');
  
//   for (const chat of chats) {
//     const chatMessages = messages.filter(m => m.chatId.toString() === chat._id.toString());
//     if (chatMessages.length > 0) {
//       const lastMessage = chatMessages.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
//       await Chat.findByIdAndUpdate(chat._id, {
//         lastMessage: lastMessage._id,
//         lastMessageAt: lastMessage.createdAt
//       });
//     }
//   }
  
//   console.log('✅ Updated chat last messages');
// };

// // Main seed function
// const seedDatabase = async () => {
//   try {
//     console.log('🚀 Starting database seeding...');
    
//     // Connect to database
//     await connectDB();
    
//     // Seed in order (respecting dependencies)
//     const admins = await seedAdmins();
//     const subAdmins = await seedSubAdmins(admins);
//     const users = await seedUsers();
//     const userStatuses = await seedUserStatuses(users);
//     const userCatalog = await seedUserCatalog();
//     const followRequests = await seedFollowRequests(users);
//     const chats = await seedChats(users);
//     const messages = await seedMessages(chats, users);
//     const calls = await seedCalls(chats, users);
//     const messageRequests = await seedMessageRequests(users);
//     const reports = await seedReports(users, admins);
    
//     // Update relationships
//     await updateUserRelationships(users, followRequests);
//     await updateChatLastMessages(chats, messages);
    
//     console.log('\n🎉 Database seeding completed successfully!');
//     console.log('\n📊 Summary:');
//     console.log(`   👑 Admins: ${admins.length}`);
//     console.log(`   🛡️  SubAdmins: ${subAdmins.length}`);
//     console.log(`   👥 Users: ${users.length}`);
//     console.log(`   📱 User Statuses: ${userStatuses.length}`);
//     console.log(`   📋 User Catalog: 1`);
//     console.log(`   👥 Follow Requests: ${followRequests.length}`);
//     console.log(`   💬 Chats: ${chats.length}`);
//     console.log(`   📨 Messages: ${messages.length}`);
//     console.log(`   📞 Calls: ${calls.length}`);
//     console.log(`   📩 Message Requests: ${messageRequests.length}`);
//     console.log(`   🚨 Reports: ${reports.length}`);
    
//     console.log('\n🔑 Demo Login Credentials:');
//     console.log('   Admin: +91 9999999999 (OTP: 123456)');
//     console.log('   SubAdmin: +91 8888888888 (OTP: 123456)');
//     console.log('   User: +91 9876543210 (OTP: 123456)');
    
//   } catch (error) {
//     console.error('❌ Seeding failed:', error);
//   } finally {
//     await mongoose.connection.close();
//     console.log('🔌 Database connection closed');
//     process.exit(0);
//   }
// };

// // Run seeding
// if (require.main === module) {
//   seedDatabase();
// }

// module.exports = { seedDatabase };
