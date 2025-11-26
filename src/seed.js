const mongoose = require('mongoose');
require('dotenv').config();

// Import all models
const User = require('./user/auth/model/userAuthModel');
const Admin = require('./admin/adminModel/adminModel');
const SubAdmin = require('./subAdmin/subAdminModel/subAdminAuthModel');
const Chat = require('./user/social/userModel/chatModel');
const Message = require('./user/social/userModel/messageModel');
const Call = require('./user/social/userModel/callModel');
const UserStatus = require('./user/social/userModel/userStatusModel');
const MessageRequest = require('./user/social/userModel/messageRequestModel');
const FollowRequest = require('./user/social/userModel/followRequestModel');
const UserCatalog = require('./user/auth/model/userCatalogModel');
const Report = require('./user/social/userModel/userReportModel');
const Post = require('./user/social/userModel/postModel');
const Story = require('./user/social/userModel/storyModel');
const DatingInteraction = require('./user/dating/models/datingInteractionModel');
const DatingMatch = require('./user/dating/models/datingMatchModel');
const DatingProfileComment = require('./user/dating/models/datingProfileCommentModel');
// TODO: Notification models will be updated with new architecture
// const Notification = require('./user/social/userModel/notificationModel');
// const NotificationPreferences = require('./user/social/userModel/notificationPreferencesModel');
const ContentModeration = require('./user/social/userModel/contentModerationModel');

// Database connection
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/vib';
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Utility functions
const generateCallId = () => {
  return 'call_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
};

const getRandomElement = (array) => {
  return array[Math.floor(Math.random() * array.length)];
};

const getRandomElements = (array, count) => {
  const shuffled = array.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

const getRandomDate = (daysAgo = 30) => {
  const now = new Date();
  const pastDate = new Date(now.getTime() - (Math.random() * daysAgo * 24 * 60 * 60 * 1000));
  return pastDate;
};

const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const randomBool = (probability = 0.5) => Math.random() < probability;

// Demo data arrays
const demoData = {
  names: [
    'Test User 1', 'Test User 2', // Test users
    'Alice Johnson', 'Bob Smith', 'Charlie Brown', 'Diana Prince', 'Eve Wilson',
    'Frank Miller', 'Grace Lee', 'Henry Davis', 'Ivy Chen', 'Jack Taylor',
    'Kate Williams', 'Liam O\'Connor', 'Maya Patel', 'Noah Kim', 'Olivia Garcia',
    'Paul Rodriguez', 'Quinn Anderson', 'Rachel Green', 'Sam Wilson', 'Tina Turner',
    'Uma Thurman', 'Victor Hugo', 'Wendy Darling', 'Xavier Woods', 'Yara Shahidi',
    'Zoe Saldana', 'Alex Rivera', 'Blake Lively', 'Cameron Diaz', 'Drew Barrymore'
  ],
  
  usernames: [
    'testuser1', 'testuser2', // Test users
    'alice_j', 'bobsmith', 'charlie_b', 'diana_p', 'eve_w',
    'frank_m', 'grace_l', 'henry_d', 'ivy_c', 'jack_t',
    'kate_w', 'liam_o', 'maya_p', 'noah_k', 'olivia_g',
    'paul_r', 'quinn_a', 'rachel_g', 'sam_w', 'tina_t',
    'uma_t', 'victor_h', 'wendy_d', 'xavier_w', 'yara_s',
    'zoe_s', 'alex_r', 'blake_l', 'cameron_d', 'drew_b'
  ],
  
  phoneNumbers: [
    '1234567890', '1234567891', // Test users
    '9876543210', '9876543211', '9876543212', '9876543213', '9876543214',
    '9876543215', '9876543216', '9876543217', '9876543218', '9876543219',
    '9876543220', '9876543221', '9876543222', '9876543223', '9876543224',
    '9876543225', '9876543226', '9876543227', '9876543228', '9876543229',
    '9876543230', '9876543231', '9876543232', '9876543233', '9876543234',
    '9876543235', '9876543236', '9876543237', '9876543238', '9876543239'
  ],
  
  emails: [
    'testuser1@example.com', 'testuser2@example.com', // Test users
    'alice@example.com', 'bob@example.com', 'charlie@example.com', 'diana@example.com', 'eve@example.com',
    'frank@example.com', 'grace@example.com', 'henry@example.com', 'ivy@example.com', 'jack@example.com',
    'kate@example.com', 'liam@example.com', 'maya@example.com', 'noah@example.com', 'olivia@example.com',
    'paul@example.com', 'quinn@example.com', 'rachel@example.com', 'sam@example.com', 'tina@example.com',
    'uma@example.com', 'victor@example.com', 'wendy@example.com', 'xavier@example.com', 'yara@example.com',
    'zoe@example.com', 'alex@example.com', 'blake@example.com', 'cameron@example.com', 'drew@example.com'
  ],
  
  bios: [
    'Love traveling and meeting new people! 🌍',
    'Photography enthusiast and coffee lover ☕',
    'Fitness enthusiast and nature lover 🏃‍♀️',
    'Artist, dreamer, and adventure seeker 🎨',
    'Tech geek and gaming enthusiast 🎮',
    'Foodie and cooking enthusiast 👨‍🍳',
    'Music lover and concert goer 🎵',
    'Bookworm and writer 📚',
    'Yoga instructor and wellness advocate 🧘‍♀️',
    'Entrepreneur and startup enthusiast 💼',
    'Dog lover and animal rights activist 🐕',
    'Fashion enthusiast and style blogger 👗',
    'Environmentalist and sustainability advocate 🌱',
    'Chef and food blogger 🍳',
    'Travel blogger and digital nomad ✈️'
  ],
  
  interests: [
    'Photography', 'Travel', 'Music', 'Art', 'Sports', 'Cooking', 'Reading', 'Gaming',
    'Fitness', 'Yoga', 'Dancing', 'Movies', 'Technology', 'Fashion', 'Nature', 'Animals',
    'Food', 'Wine', 'Coffee', 'Books', 'Writing', 'Painting', 'Singing', 'Dancing',
    'Hiking', 'Swimming', 'Cycling', 'Running', 'Meditation', 'Volunteering'
  ],
  
  likes: [
    'Pizza', 'Coffee', 'Chocolate', 'Ice Cream', 'Sushi', 'Pasta', 'Burgers', 'Tacos',
    'Pancakes', 'Waffles', 'Donuts', 'Cake', 'Cookies', 'Brownies', 'Muffins', 'Bagels',
    'Sandwiches', 'Salads', 'Smoothies', 'Tea', 'Juice', 'Water', 'Soda', 'Beer',
    'Wine', 'Cocktails', 'Mocktails', 'Energy Drinks', 'Sports Drinks', 'Hot Chocolate'
  ],
  
  genders: ['Male', 'Female', 'Non-binary', 'Prefer not to say'],
  pronouns: ['He/Him', 'She/Her', 'They/Them', 'He/They', 'She/They'],
  languages: ['English', 'French', 'Spanish', 'German', 'Hindi', 'Mandarin', 'Arabic', 'Portuguese', 'Italian', 'Japanese', 'Korean'],
  datingHereTo: ['Make New Friends', 'Dating', 'Serious Relationship', 'Networking', 'Travel Buddy'],
  datingWantToMeet: ['Woman', 'Man', 'Everyone', 'Non-binary'],
  datingComments: [
    'Great smile!',
    'Love your travel photos.',
    'You seem really interesting!',
    'Would love to grab coffee sometime.',
    'Nice profile! 😊',
    'Your hobbies sound fun!',
    'Big fan of your vibe.',
    'Totally into the same music!',
    'Your adventures look amazing.',
    'Love the positivity here!'
  ],
  
  cities: [
    'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio',
    'San Diego', 'Dallas', 'San Jose', 'Austin', 'Jacksonville', 'Fort Worth', 'Columbus',
    'Charlotte', 'San Francisco', 'Indianapolis', 'Seattle', 'Denver', 'Washington',
    'Boston', 'El Paso', 'Nashville', 'Detroit', 'Oklahoma City', 'Portland', 'Las Vegas',
    'Memphis', 'Louisville', 'Baltimore', 'Milwaukee', 'Albuquerque', 'Tucson', 'Fresno',
    'Sacramento', 'Mesa', 'Kansas City', 'Atlanta', 'Long Beach', 'Colorado Springs', 'Raleigh'
  ],
  
  countries: ['United States', 'Canada', 'United Kingdom', 'Australia', 'Germany', 'France', 'Japan', 'India'],
  
  statusMessages: [
    'Available for chat! 💬',
    'Working from home 🏠',
    'Out for a walk 🚶‍♀️',
    'At the gym 💪',
    'Cooking dinner 👨‍🍳',
    'Reading a book 📖',
    'Listening to music 🎵',
    'Watching Netflix 📺',
    'Taking a nap 😴',
    'Busy but available 📱',
    'In a meeting 🤝',
    'Traveling ✈️',
    'At a coffee shop ☕',
    'Studying 📚',
    'Playing games 🎮'
  ],
  
  messageContents: [
    'Hey! How are you doing?',
    'What\'s up?',
    'How was your day?',
    'Want to grab coffee sometime?',
    'Did you see that movie?',
    'Thanks for the help earlier!',
    'Can\'t wait to see you!',
    'Hope you\'re having a great day!',
    'What are your plans for the weekend?',
    'That sounds amazing!',
    'I totally agree with you',
    'Let me know when you\'re free',
    'Sorry for the late reply',
    'No worries at all!',
    'That\'s so cool!',
    'I\'m so excited!',
    'Can you help me with something?',
    'Of course! I\'d be happy to help',
    'You\'re the best!',
    'Thanks for being awesome!'
  ],
  
  reportTypes: ['spam', 'harassment', 'inappropriate_content', 'fake_profile', 'violence', 'hate_speech', 'other'],
  reportDescriptions: [
    'This user is sending spam messages',
    'Inappropriate behavior in chat',
    'Fake profile with misleading information',
    'Harassment and bullying',
    'Inappropriate content shared',
    'Violent threats made',
    'Hate speech and discrimination',
    'Suspicious account activity',
    'Inappropriate profile picture',
    'Spreading false information'
  ],

  // Post and Story content
  postContents: [
    'Just had an amazing day at the beach! 🌊☀️',
    'New recipe I tried today - turned out delicious! 🍝',
    'Beautiful sunset from my balcony tonight 🌅',
    'Coffee and a good book - perfect Sunday morning ☕📖',
    'Hiking adventure with friends today! 🥾⛰️',
    'New workout routine is paying off! 💪',
    'Concert last night was incredible! 🎵🎤',
    'Working on a new art project 🎨',
    'Weekend getaway was exactly what I needed ✈️',
    'New restaurant discovery - highly recommend! 🍽️',
    'Movie night with the best people 🍿🎬',
    'Morning run with my dog 🐕🏃‍♀️',
    'Learning something new every day 📚',
    'Grateful for all the amazing people in my life 🙏',
    'Adventure awaits! 🗺️',
    'New skill unlocked: cooking! 👨‍🍳',
    'Nature never fails to amaze me 🌿',
    'Productive day at work! 💼',
    'Weekend vibes are the best vibes ✨',
    'Life is good when you have good friends 👫'
  ],

  hashtags: [
    '#photography', '#travel', '#food', '#nature', '#fitness', '#art', '#music',
    '#coffee', '#sunset', '#beach', '#mountains', '#city', '#friends', '#family',
    '#love', '#happiness', '#grateful', '#motivation', '#inspiration', '#life',
    '#adventure', '#explore', '#discover', '#create', '#dream', '#believe',
    '#success', '#growth', '#mindfulness', '#wellness', '#selfcare', '#peace'
  ],

  storyContents: [
    'Behind the scenes! 📸',
    'Day in my life ✨',
    'New discovery! 🔍',
    'Quick update 💫',
    'Random thought 💭',
    'Good vibes only ✌️',
    'Making memories 📝',
    'Today\'s mood 🎭',
    'Little moments 🌟',
    'Coffee break ☕',
    'Work in progress 🔨',
    'Just vibing 🎵',
    'Grateful today 🙏',
    'New beginnings 🌱',
    'Weekend energy 🎉'
  ],

  highlightNames: [
    'Travel',
    'Food',
    'Fitness',
    'Work',
    'Fun',
    'Pets',
    'Family',
    'Friends',
    'Hobbies',
    'Achievements',
    'Memories',
    'Inspiration',
    'Daily Life',
    'Adventures',
    'Moments'
  ],

  notificationTitles: [
    'New Message',
    'Post Liked',
    'New Follower',
    'Comment Added',
    'Story Viewed',
    'Mentioned You',
    'Follow Request',
    'Call Missed',
    'System Update',
    'Content Approved',
    'Account Verified',
    'Welcome!',
    'New Feature',
    'Reminder',
    'Achievement Unlocked'
  ],

  notificationMessages: [
    'sent you a message',
    'liked your post',
    'started following you',
    'commented on your post',
    'viewed your story',
    'mentioned you in a post',
    'wants to follow you',
    'missed call from',
    'New system update available',
    'Your content has been approved',
    'Your account is now verified',
    'Welcome to the platform!',
    'Check out our new feature',
    'Don\'t forget to update your profile',
    'Congratulations on your milestone!'
  ],

  moderationCategories: [
    'spam', 'inappropriate', 'harassment', 'hate_speech', 'violence', 
    'adult_content', 'fake_news', 'copyright', 'safe'
  ],

  moderationReasons: [
    'Contains spam content',
    'Inappropriate language or content',
    'Harassment or bullying',
    'Hate speech detected',
    'Violent content',
    'Adult or explicit content',
    'False information',
    'Copyright violation',
    'Content appears safe'
  ]
};

// Seed functions
const seedAdmins = async () => {
  console.log('🌱 Seeding Admins...');
  
  const admins = [
    {
      phoneNumber: '9999999999',
      countryCode: '+91',
      name: 'Super Admin',
      email: 'admin@vibgyor.com',
      role: 'admin',
      isVerified: true,
      lastLoginAt: new Date()
    },
    {
      phoneNumber: '9999999998',
      countryCode: '+91',
      name: 'System Admin',
      email: 'system@vibgyor.com',
      role: 'admin',
      isVerified: true,
      lastLoginAt: getRandomDate(7)
    }
  ];
  
  const createdAdmins = await Admin.insertMany(admins);
  console.log(`✅ Created ${createdAdmins.length} admins`);
  return createdAdmins;
};

const seedSubAdmins = async (admins) => {
  console.log('🌱 Seeding SubAdmins...');
  
  const subAdmins = [
    {
      phoneNumber: '8888888888',
      countryCode: '+91',
      name: 'Content Moderator',
      email: 'moderator@vibgyor.com',
      role: 'subadmin',
      isVerified: true,
      isActive: true,
      approvalStatus: 'approved',
      approvedBy: admins[0]._id,
      approvedAt: getRandomDate(30),
      lastLoginAt: getRandomDate(3)
    },
    {
      phoneNumber: '8888888887',
      countryCode: '+91',
      name: 'Support Agent',
      email: 'support@vibgyor.com',
      role: 'subadmin',
      isVerified: true,
      isActive: true,
      approvalStatus: 'approved',
      approvedBy: admins[0]._id,
      approvedAt: getRandomDate(25),
      lastLoginAt: getRandomDate(1)
    },
    {
      phoneNumber: '8888888886',
      countryCode: '+91',
      name: 'Pending SubAdmin',
      email: 'pending@vibgyor.com',
      role: 'subadmin',
      isVerified: false,
      isActive: false,
      approvalStatus: 'pending',
      lastLoginAt: getRandomDate(5)
    }
  ];
  
  const createdSubAdmins = await SubAdmin.insertMany(subAdmins);
  console.log(`✅ Created ${createdSubAdmins.length} subadmins`);
  return createdSubAdmins;
};

const seedUsers = async () => {
  console.log('🌱 Seeding Users...');
  
  const users = [];
  for (let i = 0; i < 30; i++) {
    const primaryLanguage = getRandomElement(demoData.languages);
    const secondaryLanguage = getRandomElement(demoData.languages.filter(lang => lang !== primaryLanguage));

    const user = {
      phoneNumber: demoData.phoneNumbers[i],
      countryCode: '+91',
      email: demoData.emails[i],
      emailVerified: Math.random() > 0.3, // 70% verified
      username: demoData.usernames[i],
      usernameNorm: demoData.usernames[i].toLowerCase(),
      fullName: demoData.names[i],
      dob: getRandomDate(365 * 25), // Random date within last 25 years
      bio: getRandomElement(demoData.bios),
      gender: getRandomElement(demoData.genders),
      pronouns: getRandomElement(demoData.pronouns),
      likes: getRandomElements(demoData.likes, Math.floor(Math.random() * 5) + 1),
      interests: getRandomElements(demoData.interests, Math.floor(Math.random() * 8) + 1),
      profilePictureUrl: 'https://yoraaecommerce.s3.ap-south-1.amazonaws.com/68e75b3b6375ab1ca60c7d44/profile-images/1759992714775-group-three-fashion-designers-working-atelier-with-laptop-papers.jpg',
      idProofUrl: Math.random() > 0.7 ? `https://example.com/id-proof-${i}.jpg` : '',
      location: {
        lat: 40.7128 + (Math.random() - 0.5) * 10,
        lng: -74.0060 + (Math.random() - 0.5) * 10,
        city: getRandomElement(demoData.cities),
        country: getRandomElement(demoData.countries)
      },
      preferences: {
        hereFor: getRandomElement(demoData.datingHereTo),
        wantToMeet: getRandomElement(demoData.datingWantToMeet),
        primaryLanguage,
        secondaryLanguage
      },
      role: 'user',
      isProfileCompleted: Math.random() > 0.2, // 80% completed
      isActive: true, // All users active for testing
      verificationStatus: getRandomElement(['none', 'none', 'none', 'pending', 'approved']), // Mostly none
      privacySettings: {
        isPrivate: Math.random() > 0.8, // 20% private
        allowFollowRequests: true,
        showOnlineStatus: Math.random() > 0.3, // 70% show online
        allowMessages: getRandomElement(['everyone', 'followers', 'none'])
      },
      lastLoginAt: getRandomDate(7)
    };
    users.push(user);
  }
  
  const createdUsers = await User.insertMany(users);
  console.log(`✅ Created ${createdUsers.length} users`);
  return createdUsers;
};

const searchSampleProfiles = [
  {
    city: 'Berlin',
    country: 'Germany',
    lat: 52.52,
    lng: 13.405,
    hereTo: 'Make New Friends',
    wantToMeet: 'Woman',
    languages: ['English', 'French'],
    interests: ['Photography', 'Travel', 'Music']
  },
  {
    city: 'Paris',
    country: 'France',
    lat: 48.8566,
    lng: 2.3522,
    hereTo: 'Dating',
    wantToMeet: 'Man',
    languages: ['French', 'English'],
    interests: ['Cooking', 'Art', 'Travel']
  },
  {
    city: 'New York',
    country: 'United States',
    lat: 40.7128,
    lng: -74.0060,
    hereTo: 'Serious Relationship',
    wantToMeet: 'Everyone',
    languages: ['English', 'Spanish'],
    interests: ['Photography', 'Food', 'Music']
  }
];

const seedDatingProfiles = async (users) => {
  console.log('🌱 Configuring Dating Profiles...');

  const mediaSamples = [
    'https://images.unsplash.com/photo-1504593811423-6dd665756598',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d',
    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1',
    'https://images.unsplash.com/photo-1463453091185-61582044d556'
  ];

  const operations = [];
  let activeCount = 0;

  users.forEach((user, index) => {
    const isActive = randomBool(0.6);
    if (isActive) activeCount += 1;

    const photoCount = getRandomInt(1, 3);
    const videoCount = randomBool(0.4) ? 1 : 0;

    const photos = Array.from({ length: photoCount }).map((_, idx) => {
      const url = getRandomElement(mediaSamples);
      return {
        url,
        thumbnailUrl: url,
        order: idx,
        uploadedAt: getRandomDate(10)
      };
    });

    const videos = Array.from({ length: videoCount }).map((_, idx) => {
      const url = `${getRandomElement(mediaSamples)}?video=${idx}`;
      return {
        url,
        thumbnailUrl: url,
        duration: getRandomInt(5, 60),
        order: idx,
        uploadedAt: getRandomDate(10)
      };
    });

    const sampleProfile = searchSampleProfiles[index] || null;

    const hereTo = sampleProfile?.hereTo || getRandomElement(demoData.datingHereTo);
    const wantToMeet = sampleProfile?.wantToMeet || getRandomElement(demoData.datingWantToMeet);
    const languages = sampleProfile?.languages || getRandomElements(demoData.languages, getRandomInt(1, 3));
    const location = sampleProfile ? {
      city: sampleProfile.city,
      country: sampleProfile.country,
      coordinates: { lat: sampleProfile.lat, lng: sampleProfile.lng }
    } : {
      city: user.location?.city || getRandomElement(demoData.cities),
      country: user.location?.country || getRandomElement(demoData.countries),
      coordinates: {
        lat: user.location?.lat || 40.7128 + (Math.random() - 0.5) * 10,
        lng: user.location?.lng || -74.0060 + (Math.random() - 0.5) * 10
      }
    };

    const preferences = {
      hereTo,
      wantToMeet,
      ageRange: {
        min: getRandomInt(18, 28),
        max: getRandomInt(30, 45)
      },
      languages,
      location,
      distanceRange: {
        min: 0,
        max: sampleProfile ? 25 : getRandomElement([5, 10, 25, 50, 100])
      }
    };

    const setPayload = {
      'dating.photos': photos,
      'dating.videos': videos,
      'dating.isDatingProfileActive': isActive,
      'dating.lastUpdatedAt': new Date(),
      'dating.preferences': preferences,
      'preferences.hereFor': hereTo,
      'preferences.wantToMeet': wantToMeet,
      'preferences.primaryLanguage': languages[0] || '',
      'preferences.secondaryLanguage': languages[1] || '',
      'location.city': location.city,
      'location.country': location.country,
      'location.lat': location.coordinates.lat,
      'location.lng': location.coordinates.lng
    };

    if (sampleProfile?.interests) {
      setPayload.interests = sampleProfile.interests;
    }

    operations.push({
      updateOne: {
        filter: { _id: user._id },
        update: {
          $set: setPayload
        }
      }
    });
  });

  if (operations.length > 0) {
    await User.bulkWrite(operations);
  }

  console.log(`✅ Configured dating profiles for ${users.length} users (${activeCount} active)`);
  return { activeProfiles: activeCount };
};

const seedUserStatuses = async (users) => {
  console.log('🌱 Seeding User Statuses...');
  
  const userStatuses = [];
  for (const user of users) {
    const isOnline = Math.random() > 0.6; // 40% online
    const userStatus = {
      userId: user._id,
      isOnline,
      lastSeen: getRandomDate(7),
      status: isOnline ? getRandomElement(demoData.statusMessages) : '',
      connectionId: isOnline ? `conn_${Math.random().toString(36).substr(2, 9)}` : '',
      deviceInfo: {
        platform: getRandomElement(['Windows', 'macOS', 'Linux', 'iOS', 'Android']),
        browser: getRandomElement(['Chrome', 'Firefox', 'Safari', 'Edge']),
        userAgent: 'Mozilla/5.0 (Demo Browser)'
      },
      privacySettings: {
        showOnlineStatus: user.privacySettings.showOnlineStatus,
        showLastSeen: Math.random() > 0.3,
        showTypingStatus: Math.random() > 0.2
      },
      lastActivity: getRandomDate(1)
    };
    userStatuses.push(userStatus);
  }
  
  const createdStatuses = await UserStatus.insertMany(userStatuses);
  console.log(`✅ Created ${createdStatuses.length} user statuses`);
  return createdStatuses;
};

const dedupeList = (list) => [...new Set(list.filter(Boolean))];

const seedUserCatalog = async () => {
  console.log('🌱 Seeding User Catalog...');
  
  const catalog = {
    genderList: dedupeList(demoData.genders),
    pronounList: dedupeList(demoData.pronouns),
    likeList: dedupeList(demoData.likes),
    interestList: dedupeList(demoData.interests),
    hereForList: dedupeList(demoData.datingHereTo),
    languageList: dedupeList(demoData.languages),
    version: 1
  };
  
  const createdCatalog = await UserCatalog.create(catalog);
  console.log(
    `✅ Created user catalog (genders: ${createdCatalog.genderList.length}, pronouns: ${createdCatalog.pronounList.length}, likes: ${createdCatalog.likeList.length}, interests: ${createdCatalog.interestList.length}, hereFor: ${createdCatalog.hereForList.length}, languages: ${createdCatalog.languageList.length})`
  );
  return createdCatalog;
};

const seedFollowRequests = async (users) => {
  console.log('🌱 Seeding Follow Requests...');
  
  const followRequests = [];
  const requestCount = Math.floor(users.length * 0.3); // 30% of users have follow requests
  
  for (let i = 0; i < requestCount; i++) {
    const requester = getRandomElement(users);
    const recipient = getRandomElement(users.filter(u => u._id.toString() !== requester._id.toString()));
    
    const followRequest = {
      requester: requester._id,
      recipient: recipient._id,
      status: getRandomElement(['pending', 'accepted', 'rejected']),
      message: Math.random() > 0.5 ? 'Hi! I\'d like to connect with you.' : '',
      respondedAt: Math.random() > 0.3 ? getRandomDate(7) : null,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    };
    followRequests.push(followRequest);
  }
  
  const createdRequests = await FollowRequest.insertMany(followRequests);
  console.log(`✅ Created ${createdRequests.length} follow requests`);
  return createdRequests;
};

const seedChats = async (users) => {
  console.log('🌱 Seeding Chats...');
  
  const chats = [];
  const chatCount = Math.floor(users.length * 0.4); // 40% of users have chats
  
  for (let i = 0; i < chatCount; i++) {
    const participant1 = getRandomElement(users);
    const participant2 = getRandomElement(users.filter(u => u._id.toString() !== participant1._id.toString()));
    
    const chat = {
      participants: [participant1._id, participant2._id],
      createdBy: participant1._id,
      isActive: true,
      userSettings: [
        {
          userId: participant1._id,
          isArchived: Math.random() > 0.9,
          isPinned: Math.random() > 0.8,
          isMuted: Math.random() > 0.9
        },
        {
          userId: participant2._id,
          isArchived: Math.random() > 0.9,
          isPinned: Math.random() > 0.8,
          isMuted: Math.random() > 0.9
        }
      ],
      requestStatus: getRandomElement(['none', 'none', 'none', 'accepted']), // Mostly none
      lastMessageAt: getRandomDate(7)
    };
    chats.push(chat);
  }
  
  const createdChats = await Chat.insertMany(chats);
  console.log(`✅ Created ${createdChats.length} chats`);
  return createdChats;
};

const seedMessages = async (chats, users) => {
  console.log('🌱 Seeding Messages...');
  
  const messages = [];
  
  for (const chat of chats) {
    const messageCount = Math.floor(Math.random() * 20) + 5; // 5-25 messages per chat
    
    for (let i = 0; i < messageCount; i++) {
      const sender = getRandomElement(chat.participants);
      const messageType = getRandomElement(['text', 'text', 'text', 'image', 'audio']); // Mostly text
      
      const message = {
        chatId: chat._id,
        senderId: sender,
        type: messageType,
        content: getRandomElement(demoData.messageContents),
        status: getRandomElement(['sent', 'delivered', 'read']),
        readBy: Math.random() > 0.3 ? [{
          userId: getRandomElement(chat.participants.filter(p => p.toString() !== sender.toString())),
          readAt: getRandomDate(1)
        }] : [],
        reactions: Math.random() > 0.7 ? [{
          userId: getRandomElement(chat.participants),
          emoji: getRandomElement(['👍', '❤️', '😂', '😮', '😢', '😡']),
          createdAt: getRandomDate(1)
        }] : []
      };

      // Only add media for non-text messages
      if (messageType !== 'text') {
        if (messageType === 'image') {
          message.media = {
            url: `https://example.com/media/${Math.random().toString(36).substr(2, 9)}.jpg`,
            thumbnailUrl: `https://example.com/thumbnails/${Math.random().toString(36).substr(2, 9)}.jpg`,
            mimeType: 'image/jpeg',
            fileName: `image_${i}.jpg`,
            fileSize: Math.floor(Math.random() * 1000000) + 100000,
            duration: 0,
            dimensions: {
              width: 1920,
              height: 1080
            }
          };
        } else if (messageType === 'audio') {
          message.media = {
            url: `https://example.com/media/${Math.random().toString(36).substr(2, 9)}.mp3`,
            mimeType: 'audio/mpeg',
            fileName: `audio_${i}.mp3`,
            fileSize: Math.floor(Math.random() * 5000000) + 100000,
            duration: Math.floor(Math.random() * 300) + 10 // 10-310 seconds
          };
        }
      }
      
      messages.push(message);
    }
  }
  
  const createdMessages = await Message.insertMany(messages);
  console.log(`✅ Created ${createdMessages.length} messages`);
  return createdMessages;
};

const seedCalls = async (chats, users) => {
  console.log('🌱 Seeding Calls...');
  
  const calls = [];
  const callCount = Math.floor(chats.length * 0.3); // 30% of chats have calls
  
  for (let i = 0; i < callCount; i++) {
    const chat = getRandomElement(chats);
    const initiator = getRandomElement(chat.participants);
    
    const call = {
      callId: generateCallId(),
      chatId: chat._id,
      initiator: initiator,
      participants: chat.participants,
      type: getRandomElement(['audio', 'video']),
      status: getRandomElement(['ended', 'missed', 'rejected']),
      startedAt: getRandomDate(7),
      endedAt: getRandomDate(1),
      duration: Math.floor(Math.random() * 3600) + 60, // 1 minute to 1 hour
      callQuality: getRandomElement(['excellent', 'good', 'fair', 'poor']),
      networkInfo: {
        connectionType: getRandomElement(['wifi', 'cellular', 'ethernet']),
        bandwidth: Math.floor(Math.random() * 10000) + 1000
      },
      settings: {
        isMuted: Math.random() > 0.7,
        isVideoEnabled: Math.random() > 0.5,
        isScreenSharing: Math.random() > 0.9
      },
      missedReason: Math.random() > 0.8 ? getRandomElement(['no_answer', 'busy', 'declined', 'network_error']) : undefined
    };
    calls.push(call);
  }
  
  const createdCalls = await Call.insertMany(calls);
  console.log(`✅ Created ${createdCalls.length} calls`);
  return createdCalls;
};

const seedMessageRequests = async (users) => {
  console.log('🌱 Seeding Message Requests...');
  
  const messageRequests = [];
  const requestCount = Math.floor(users.length * 0.2); // 20% of users have message requests
  
  for (let i = 0; i < requestCount; i++) {
    const fromUser = getRandomElement(users);
    const toUser = getRandomElement(users.filter(u => u._id.toString() !== fromUser._id.toString()));
    
    const messageRequest = {
      fromUserId: fromUser._id,
      toUserId: toUser._id,
      status: getRandomElement(['pending', 'accepted', 'rejected']),
      message: getRandomElement(demoData.messageContents),
      requestedAt: getRandomDate(7),
      respondedAt: Math.random() > 0.3 ? getRandomDate(7) : null,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      responseMessage: Math.random() > 0.5 ? 'Thanks for reaching out!' : ''
    };
    messageRequests.push(messageRequest);
  }
  
  const createdRequests = await MessageRequest.insertMany(messageRequests);
  console.log(`✅ Created ${createdRequests.length} message requests`);
  return createdRequests;
};

const seedReports = async (users, admins) => {
  console.log('🌱 Seeding Reports...');
  
  const reports = [];
  const reportCount = Math.floor(users.length * 0.1); // 10% of users have reports
  
  for (let i = 0; i < reportCount; i++) {
    const reporter = getRandomElement(users);
    const reportedUser = getRandomElement(users.filter(u => u._id.toString() !== reporter._id.toString()));
    
    const report = {
      reporter: reporter._id,
      reportedUser: reportedUser._id,
      reportType: getRandomElement(demoData.reportTypes),
      description: getRandomElement(demoData.reportDescriptions),
      status: getRandomElement(['pending', 'under_review', 'resolved', 'dismissed']),
      priority: getRandomElement(['low', 'medium', 'high', 'urgent']),
      reviewedBy: Math.random() > 0.5 ? getRandomElement(admins)._id : null,
      reviewedAt: Math.random() > 0.5 ? getRandomDate(7) : null,
      actionTaken: Math.random() > 0.6 ? getRandomElement(['none', 'warning', 'temporary_ban', 'content_removed']) : 'none',
      reviewerRole: Math.random() > 0.5 ? 'admin' : null,
      reviewNotes: Math.random() > 0.7 ? 'Report reviewed and action taken' : '',
      reportedContent: {
        contentType: getRandomElement(['profile', 'post', 'message']),
        contentId: Math.random().toString(36).substr(2, 9),
        contentUrl: Math.random() > 0.5 ? `https://example.com/content/${Math.random().toString(36).substr(2, 9)}` : ''
      },
      notifiedReporter: Math.random() > 0.6,
      notifiedAt: Math.random() > 0.6 ? getRandomDate(7) : null
    };
    reports.push(report);
  }
  
  const createdReports = await Report.insertMany(reports);
  console.log(`✅ Created ${createdReports.length} reports`);
  return createdReports;
};

const seedDatingInteractions = async (users) => {
  console.log('🌱 Seeding Dating Interactions...');

  const interactions = [];
  const matches = [];
  const usedPairs = new Set();

  const interactionCount = Math.floor(users.length * 1.5);

  const getKey = (a, b) => `${a}_${b}`;
  const sortPair = (a, b) => (a.toString() < b.toString() ? [a, b] : [b, a]);

  for (let i = 0; i < interactionCount; i++) {
    const liker = getRandomElement(users);
    const potentialTargets = users.filter(u => u._id.toString() !== liker._id.toString());
    if (potentialTargets.length === 0) continue;
    const target = getRandomElement(potentialTargets);

    const key = getKey(liker._id.toString(), target._id.toString());
    if (usedPairs.has(key)) continue;
    usedPairs.add(key);

    const action = randomBool(0.75) ? 'like' : 'dislike';
    const baseInteraction = {
      user: liker._id,
      targetUser: target._id,
      action,
      status: action === 'like' ? 'pending' : 'dismissed',
      matchedAt: null
    };

    if (action === 'like' && randomBool(0.35)) {
      const timestamp = getRandomDate(5);
      baseInteraction.status = 'matched';
      baseInteraction.matchedAt = timestamp;
      interactions.push(baseInteraction);

      interactions.push({
        user: target._id,
        targetUser: liker._id,
        action: 'like',
        status: 'matched',
        matchedAt: timestamp
      });

      const [userA, userB] = sortPair(liker._id, target._id);
      matches.push({
        userA,
        userB,
        status: 'active',
        matchedBy: 'mutual_like',
        lastInteractionAt: timestamp
      });
    } else {
      interactions.push(baseInteraction);
    }
  }

  let interactionsCount = 0;
  let matchesCount = 0;

  if (interactions.length > 0) {
    await DatingInteraction.insertMany(interactions, { ordered: false });
    interactionsCount = interactions.length;
  }

  if (matches.length > 0) {
    try {
      await DatingMatch.insertMany(matches, { ordered: false });
      matchesCount = matches.length;
    } catch (error) {
      console.warn('[SEED] Some dating matches already existed (ignored).');
    }
  }

  console.log(`✅ Created ${interactionsCount} dating interactions and ${matchesCount} matches`);
  return { interactionsCount, matchesCount };
};

const seedDatingComments = async (users) => {
  console.log('🌱 Seeding Dating Profile Comments...');

  const comments = [];
  const commentCount = Math.floor(users.length * 1.2);

  for (let i = 0; i < commentCount; i++) {
    const author = getRandomElement(users);
    const potentialTargets = users.filter(u => u._id.toString() !== author._id.toString());
    if (potentialTargets.length === 0) continue;
    const target = getRandomElement(potentialTargets);

    comments.push({
      user: author._id,
      targetUser: target._id,
      text: getRandomElement(demoData.datingComments),
      likes: [],
      likesCount: 0,
      isPinned: false,
      isDeleted: false,
      createdAt: getRandomDate(7),
      updatedAt: getRandomDate(3)
    });
  }

  if (comments.length > 0) {
    await DatingProfileComment.insertMany(comments, { ordered: false });
  }

  console.log(`✅ Created ${comments.length} dating profile comments`);
  return { commentsCount: comments.length };
};

// Update relationships
const updateUserRelationships = async (users, followRequests) => {
  console.log('🌱 Updating User Relationships...');
  
  for (const user of users) {
    const userFollowRequests = followRequests.filter(fr => 
      fr.requester.toString() === user._id.toString() || 
      fr.recipient.toString() === user._id.toString()
    );
    
    const following = userFollowRequests
      .filter(fr => fr.requester.toString() === user._id.toString() && fr.status === 'accepted')
      .map(fr => fr.recipient);
    
    const followers = userFollowRequests
      .filter(fr => fr.recipient.toString() === user._id.toString() && fr.status === 'accepted')
      .map(fr => fr.requester);
    
    await User.findByIdAndUpdate(user._id, {
      following,
      followers
    });
  }
  
  console.log('✅ Updated user relationships');
};

const updateChatLastMessages = async (chats, messages) => {
  console.log('🌱 Updating Chat Last Messages...');
  
  for (const chat of chats) {
    const chatMessages = messages.filter(m => m.chatId.toString() === chat._id.toString());
    if (chatMessages.length > 0) {
      const lastMessage = chatMessages.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
      await Chat.findByIdAndUpdate(chat._id, {
        lastMessage: lastMessage._id,
        lastMessageAt: lastMessage.createdAt
      });
    }
  }
  
  console.log('✅ Updated chat last messages');
};

// Main seed function
// New seeding functions for additional models
const seedPosts = async (users) => {
  console.log('🌱 Seeding Posts...');
  
  const posts = [];
  const postCount = Math.floor(users.length * 3); // 3 posts per user on average
  
  for (let i = 0; i < postCount; i++) {
    const author = getRandomElement(users);
    const content = getRandomElement(demoData.postContents);
    const hashtags = getRandomElements(demoData.hashtags, Math.floor(Math.random() * 5) + 1);
    
    // Generate some likes and comments
    const likes = [];
    const comments = [];
    const numLikes = Math.floor(Math.random() * 20);
    const numComments = Math.floor(Math.random() * 10);
    
    for (let j = 0; j < numLikes; j++) {
      const liker = getRandomElement(users);
      if (liker._id.toString() !== author._id.toString()) {
        likes.push({
          user: liker._id,
          likedAt: getRandomDate(7)
        });
      }
    }
    
    for (let j = 0; j < numComments; j++) {
      const commenter = getRandomElement(users);
      if (commenter._id.toString() !== author._id.toString()) {
        comments.push({
          user: commenter._id,
          content: getRandomElement(demoData.messageContents),
          createdAt: getRandomDate(7),
          isEdited: Math.random() > 0.8,
          editedAt: Math.random() > 0.8 ? getRandomDate(7) : null
        });
      }
    }
    
    const post = {
      author: author._id,
      content: content,
      caption: Math.random() > 0.5 ? content.substring(0, 100) : '',
      media: Math.random() > 0.7 ? [{
        type: getRandomElement(['image', 'video']),
        url: 'https://yoraaecommerce.s3.ap-south-1.amazonaws.com/68e75b3b6375ab1ca60c7d44/profile-images/1759992714775-group-three-fashion-designers-working-atelier-with-laptop-papers.jpg',
        filename: `post_${i}.jpg`,
        fileSize: Math.floor(Math.random() * 5000000) + 100000,
        mimeType: getRandomElement(['image/jpeg', 'image/png', 'video/mp4', 'audio/mp3']),
        s3Key: `posts/post_${i}.jpg`,
        thumbnail: Math.random() > 0.5 ? `https://example.com/thumbnails/post_${i}.jpg` : null,
        duration: Math.random() > 0.5 ? Math.floor(Math.random() * 300) + 10 : null,
        dimensions: {
          width: 1920,
          height: 1080
        }
      }] : [],
      hashtags: hashtags,
      privacy: getRandomElement(['public', 'followers', 'close_friends']),
      status: 'published',
      likes: likes,
      comments: comments,
      likesCount: likes.length,
      commentsCount: comments.length,
      sharesCount: Math.floor(Math.random() * 10),
      viewsCount: Math.floor(Math.random() * 100),
      publishedAt: getRandomDate(30),
      lastEngagementAt: getRandomDate(7)
    };
    
    posts.push(post);
  }
  
  const createdPosts = await Post.insertMany(posts);
  console.log(`✅ Created ${createdPosts.length} posts`);
  return createdPosts;
};

const seedStories = async (users) => {
  console.log('🌱 Seeding Stories...');
  
  const stories = [];
  const storyCount = Math.floor(users.length * 2); // 2 stories per user on average
  
  for (let i = 0; i < storyCount; i++) {
    const author = getRandomElement(users);
    const content = getRandomElement(demoData.storyContents);
    const expiresAt = new Date(Date.now() + (Math.random() * 24 * 60 * 60 * 1000)); // Random expiry within 24 hours
    
    // Generate some views and reactions
    const views = [];
    const reactions = [];
    const numViews = Math.floor(Math.random() * 50);
    const numReactions = Math.floor(Math.random() * 15);
    
    for (let j = 0; j < numViews; j++) {
      const viewer = getRandomElement(users);
      if (viewer._id.toString() !== author._id.toString()) {
        views.push({
          user: viewer._id,
          viewedAt: getRandomDate(1),
          viewDuration: Math.floor(Math.random() * 30) + 1
        });
      }
    }
    
    for (let j = 0; j < numReactions; j++) {
      const reactor = getRandomElement(users);
      if (reactor._id.toString() !== author._id.toString()) {
        reactions.push({
          user: reactor._id,
          type: getRandomElement(['like', 'love', 'laugh', 'wow', 'sad', 'angry']),
          reactedAt: getRandomDate(1)
        });
      }
    }
    
    const story = {
      author: author._id,
      content: content,
      media: {
        type: getRandomElement(['image', 'video', 'text']),
        url: 'https://yoraaecommerce.s3.ap-south-1.amazonaws.com/68e75b3b6375ab1ca60c7d44/profile-images/1759992714775-group-three-fashion-designers-working-atelier-with-laptop-papers.jpg',
        filename: `story_${i}.jpg`,
        fileSize: Math.floor(Math.random() * 5000000) + 100000,
        mimeType: 'image/jpeg',
        s3Key: `stories/story_${i}.jpg`,
        duration: Math.random() > 0.5 ? Math.floor(Math.random() * 60) + 5 : null,
        dimensions: {
          width: 1080,
          height: 1920
        }
      },
      privacy: getRandomElement(['public', 'followers', 'close_friends']),
      status: 'active',
      expiresAt: expiresAt,
      views: views,
      reactions: reactions,
      analytics: {
        viewsCount: views.length,
        reactionsCount: reactions.length,
        repliesCount: Math.floor(Math.random() * 5),
        sharesCount: Math.floor(Math.random() * 3),
        reach: Math.floor(Math.random() * 100),
        impressions: Math.floor(Math.random() * 150)
      },
      createdAt: getRandomDate(1),
      lastEngagementAt: getRandomDate(1)
    };
    
    stories.push(story);
  }
  
  const createdStories = await Story.insertMany(stories);
  console.log(`✅ Created ${createdStories.length} stories`);
  return createdStories;
};

// TODO: Notification seeding will be implemented with new architecture
const seedNotifications = async (users, posts, stories) => {
  console.log('🌱 Seeding Notifications... (Skipped - will be implemented with new architecture)');
  // Notification seeding disabled - will be re-implemented with new architecture
  return [];
};

// TODO: Notification preferences seeding will be implemented with new architecture
const seedNotificationPreferences = async (users) => {
  console.log('🌱 Seeding Notification Preferences... (Skipped - will be implemented with new architecture)');
  // Notification preferences seeding disabled - will be re-implemented with new architecture
  return [];
};

const seedContentModeration = async (posts, stories) => {
  console.log('🌱 Seeding Content Moderation...');
  
  const moderationRecords = [];
  const recordCount = Math.floor((posts.length + stories.length) * 0.1); // 10% of content gets moderated
  
  const allContent = [
    ...posts.map(post => ({ type: 'post', id: post._id, author: post.author, content: post.content })),
    ...stories.map(story => ({ type: 'story', id: story._id, author: story.author, content: story.content }))
  ];
  
  const selectedContent = getRandomElements(allContent, Math.min(recordCount, allContent.length));
  
  for (const content of selectedContent) {
    const category = getRandomElement(demoData.moderationCategories);
    const reason = getRandomElement(demoData.moderationReasons);
    
    const moderationRecord = {
      contentType: content.type,
      contentId: content.id,
      contentAuthor: content.author,
      content: {
        text: content.content,
        media: [],
        hashtags: [],
        mentions: []
      },
      moderationResults: {
        aiAnalysis: {
          isAnalyzed: true,
          analyzedAt: getRandomDate(30),
          confidence: Math.floor(Math.random() * 40) + 60,
          categories: [{
            category: category,
            confidence: Math.floor(Math.random() * 30) + 70,
            details: {}
          }],
          flagged: category !== 'safe',
          flagReason: category !== 'safe' ? reason : null,
          riskScore: category === 'safe' ? Math.floor(Math.random() * 30) : Math.floor(Math.random() * 40) + 60
        },
        manualReview: {
          isReviewed: Math.random() > 0.5,
          reviewedAt: Math.random() > 0.5 ? getRandomDate(30) : null,
          reviewedBy: null,
          decision: Math.random() > 0.5 ? getRandomElement(['approved', 'rejected', 'pending']) : 'pending',
          reason: Math.random() > 0.5 ? reason : null,
          notes: Math.random() > 0.7 ? 'Content reviewed and approved' : null,
          actionTaken: Math.random() > 0.8 ? getRandomElement(['none', 'warning', 'hide', 'delete']) : 'none'
        },
        userReports: Math.random() > 0.8 ? [{
          reportedBy: new mongoose.Types.ObjectId(),
          reason: category,
          description: reason,
          reportedAt: getRandomDate(30),
          status: getRandomElement(['pending', 'reviewed', 'resolved', 'dismissed'])
        }] : [],
        automatedActions: category !== 'safe' ? [{
          action: getRandomElement(['hide', 'flag_for_review', 'warn_user']),
          triggeredBy: 'ai_analysis',
          executedAt: getRandomDate(30),
          details: { reason: reason }
        }] : []
      },
      status: category === 'safe' ? 'active' : getRandomElement(['active', 'hidden', 'under_review']),
      visibility: {
        isPublic: category === 'safe',
        isHidden: category !== 'safe' && Math.random() > 0.5,
        hiddenReason: category !== 'safe' ? reason : null,
        hiddenAt: category !== 'safe' && Math.random() > 0.5 ? getRandomDate(30) : null,
        hiddenBy: null
      },
      analytics: {
        viewCount: Math.floor(Math.random() * 1000),
        reportCount: Math.floor(Math.random() * 5),
        lastReportedAt: Math.random() > 0.7 ? getRandomDate(30) : null,
        moderationScore: Math.floor(Math.random() * 100)
      },
      createdAt: getRandomDate(30),
      lastAnalyzedAt: getRandomDate(7)
    };
    
    moderationRecords.push(moderationRecord);
  }
  
  const createdRecords = await ContentModeration.insertMany(moderationRecords);
  console.log(`✅ Created ${createdRecords.length} content moderation records`);
  return createdRecords;
};

const seedDatabase = async (clearFirst = false) => {
  try {
    console.log('🚀 Starting database seeding...');
    
    // Connect to database
    await connectDB();
    
    // Clear existing data if requested
    if (clearFirst) {
      console.log('🗑️  Clearing existing data...');
      await Promise.all([
        Admin.deleteMany({}),
        SubAdmin.deleteMany({}),
        User.deleteMany({}),
        UserStatus.deleteMany({}),
        UserCatalog.deleteMany({}),
        FollowRequest.deleteMany({}),
        Chat.deleteMany({}),
        Message.deleteMany({}),
        Call.deleteMany({}),
        MessageRequest.deleteMany({}),
        Report.deleteMany({}),
        DatingInteraction.deleteMany({}),
        DatingMatch.deleteMany({}),
        DatingProfileComment.deleteMany({}),
        Post.deleteMany({}),
        Story.deleteMany({}),
        // TODO: Notification cleanup will be implemented with new architecture
        // Notification.deleteMany({}),
        // NotificationPreferences.deleteMany({}),
        ContentModeration.deleteMany({})
      ]);
      console.log('✅ Database cleared successfully');
    }
    
    // Seed in order (respecting dependencies)
    const admins = await seedAdmins();
    const subAdmins = await seedSubAdmins(admins);
    const users = await seedUsers();
    const datingProfiles = await seedDatingProfiles(users);
    const userStatuses = await seedUserStatuses(users);
    const userCatalog = await seedUserCatalog();
    const followRequests = await seedFollowRequests(users);
    const chats = await seedChats(users);
    const messages = await seedMessages(chats, users);
    const calls = await seedCalls(chats, users);
    const messageRequests = await seedMessageRequests(users);
    const reports = await seedReports(users, admins);
    const datingInteractions = await seedDatingInteractions(users);
    const datingComments = await seedDatingComments(users);
    
    // Seed new models
    const posts = await seedPosts(users);
    const stories = await seedStories(users);
    const notifications = await seedNotifications(users, posts, stories);
    const notificationPreferences = await seedNotificationPreferences(users);
    const contentModeration = await seedContentModeration(posts, stories);
    
    // Update relationships
    await updateUserRelationships(users, followRequests);
    await updateChatLastMessages(chats, messages);
    
    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   👑 Admins: ${admins.length}`);
    console.log(`   🛡️  SubAdmins: ${subAdmins.length}`);
    console.log(`   👥 Users: ${users.length}`);
    console.log(`   ❤️ Dating Profiles Active: ${datingProfiles.activeProfiles}`);
    console.log(`   💌 Dating Interactions: ${datingInteractions.interactionsCount}`);
    console.log(`   🔗 Dating Matches: ${datingInteractions.matchesCount}`);
    console.log(`   💬 Dating Comments: ${datingComments.commentsCount}`);
    console.log(`   📱 User Statuses: ${userStatuses.length}`);
    console.log(`   📋 User Catalog: 1`);
    console.log(`   👥 Follow Requests: ${followRequests.length}`);
    console.log(`   💬 Chats: ${chats.length}`);
    console.log(`   📨 Messages: ${messages.length}`);
    console.log(`   📞 Calls: ${calls.length}`);
    console.log(`   📩 Message Requests: ${messageRequests.length}`);
    console.log(`   🚨 Reports: ${reports.length}`);
    console.log(`   📝 Posts: ${posts.length}`);
    console.log(`   📖 Stories: ${stories.length}`);
    console.log(`   🔔 Notifications: ${notifications.length}`);
    console.log(`   ⚙️  Notification Preferences: ${notificationPreferences.length}`);
    console.log(`   🛡️  Content Moderation: ${contentModeration.length}`);
    
    console.log('\n🔑 Demo Login Credentials:');
    console.log('   Admin: +91 9999999999 (OTP: 123456)');
    console.log('   SubAdmin: +91 8888888888 (OTP: 123456)');
    console.log('   User: +91 9876543210 (OTP: 123456)');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
};

// Parse command line arguments
const parseArgs = () => {
  const args = process.argv.slice(2);
  const options = { clear: false };
  
  for (const arg of args) {
    if (arg === '--clear' || arg === '--clear=true') {
      options.clear = true;
    }
  }
  
  return options;
};

// Run seeding
if (require.main === module) {
  const options = parseArgs();
  seedDatabase(options.clear);
}

module.exports = { seedDatabase };
