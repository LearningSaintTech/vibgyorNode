const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('./src/user/auth/model/userAuthModel');
const DatingInteraction = require('./src/user/dating/models/datingInteractionModel');
const DatingMatch = require('./src/user/dating/models/datingMatchModel');
const DatingProfileComment = require('./src/user/dating/models/datingProfileCommentModel');

// ====================================================================
// 🎯 DATING API SEED SCRIPT - HIGHLIGHTED TEST PROFILES
// ====================================================================
//
// LOCAL DATABASE: mongodb://localhost:27017/vib
//
// 📱 TEST PROFILES TO USE IN POSTMAN:
// ====================================================================
//
// 1️⃣ MAIN TEST USER (Alice) - Use this for testing
//    Phone: +91 5550001111
//    Username: alice_dating_tester
//    Location: New York, USA (40.7128, -74.0060)
//    Gender: Female
//    Dating Profile: ACTIVE ✅
//    Preferences: Looking for Men, Age 25-35, Distance 0-50km
//
// 2️⃣ TEST USER (Bob) - Male nearby (like him for match)
//    Phone: +91 5550002222
//    Username: bob_nearby_match
//    Location: New York, USA (40.7500, -74.0100) - ~4.5km away
//    Gender: Male
//    Dating Profile: ACTIVE ✅
//    Preferences: Looking for Women, Age 22-32, Distance 0-50km
//    Status: Will auto-like Alice, creating a MATCH 💑
//
// 3️⃣ TEST USER (Charlie) - Male nearby (dislike him)
//    Phone: +91 5550003333
//    Username: charlie_to_dislike
//    Location: New York, USA (40.7800, -74.0200) - ~8km away
//    Gender: Male
//    Dating Profile: ACTIVE ✅
//    
// 4️⃣ TEST USER (Diana) - Female nearby
//    Phone: +91 5550004444
//    Username: diana_friend
//    Location: New York, USA (40.7300, -74.0000) - ~2km away
//    Gender: Female
//    Dating Profile: ACTIVE ✅
//    Preferences: Looking for Everyone, Age 20-40, Distance 0-30km
//
// 5️⃣ TEST USER (Eve) - Far away (won't appear in nearby search)
//    Phone: +91 5550005555
//    Username: eve_far_away
//    Location: Los Angeles, USA (34.0522, -118.2437) - ~3936km away
//    Gender: Female
//    Dating Profile: ACTIVE ✅
//
// 6️⃣ TEST USER (Frank) - Dating profile INACTIVE
//    Phone: +91 5550006666
//    Username: frank_inactive
//    Location: New York, USA (40.7400, -74.0050) - ~3km away
//    Gender: Male
//    Dating Profile: INACTIVE ❌
//
// 7️⃣ TEST USER (Grace) - New to dating (new_dater filter)
//    Phone: +91 5550007777
//    Username: grace_new_dater
//    Location: New York, USA (40.7200, -74.0080) - ~1.5km away
//    Gender: Female
//    Dating Profile: ACTIVE ✅ (Recently activated)
//    Preferences: Looking for Everyone, Age 18-45, Distance 0-100km
//
// 8️⃣ TEST USER (Henry) - Has commented on profiles
//    Phone: +91 5550008888
//    Username: henry_commenter
//    Location: New York, USA (40.7600, -74.0120) - ~6km away
//    Gender: Male
//    Dating Profile: ACTIVE ✅
//    Status: Has left comments on Alice's profile
//
// ====================================================================
// 🧪 HOW TO TEST:
// ====================================================================
//
// 1. Run this seed script:
//    node datingSeed.js --clear
//
// 2. Get auth token for Alice (Phone: +91 5550001111):
//    POST /auth/send-otp (phoneNumber: "5550001111", countryCode: "+91")
//    POST /auth/verify-otp (phoneNumber: "5550001111", countryCode: "+91", otp: "123456")
//
// 3. Test Dating APIs:
//    a. GET /user/dating/profile (see Alice's photos/videos)
//    b. GET /user/dating/preferences (see Alice's preferences)
//    c. GET /user/dating/profiles?distanceMax=50&filter=near_by (see nearby profiles)
//    d. POST /user/dating/profiles/{bobId}/like (like Bob → creates MATCH)
//    e. POST /user/dating/profiles/{charlieId}/dislike (dislike Charlie)
//    f. POST /user/dating/profiles/{dianaId}/comments (comment on Diana)
//    g. GET /user/dating/matches (see all matches including Bob)
//    h. POST /user/dating/profiles/{henryId}/block (block Henry)
//
// ====================================================================

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

// Utility functions
const getRandomDate = (daysAgo = 30) => {
  const now = new Date();
  const pastDate = new Date(now.getTime() - (Math.random() * daysAgo * 24 * 60 * 60 * 1000));
  return pastDate;
};

// Sample media URLs
const SAMPLE_PHOTOS = {
  female: [
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800',
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=800',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800'
  ],
  male: [
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800',
    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800',
    'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=800'
  ]
};

const SAMPLE_VIDEOS = [
  'https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4',
  'https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_2mb.mp4'
];

// Dating comments
const DATING_COMMENTS = [
  'Great smile! Would love to get to know you better 😊',
  'Your travel photos are amazing!',
  'Love your vibe! Let\'s grab coffee sometime ☕',
  'You seem really interesting!',
  'Nice profile! Your hobbies sound fun 🎉',
  'Would love to chat and see if we connect!',
  'Your sense of adventure is inspiring! ⛰️',
  'Coffee enthusiast here too! ☕ Let\'s meet up',
  'Your profile made me smile 😄',
  'Love your positive energy! ✨'
];

// Test users data
const testUsers = [
  {
    // 1️⃣ MAIN TEST USER - Alice
    phoneNumber: '5550001111',
    countryCode: '+91',
    email: 'alice.dating.test@example.com',
    emailVerified: true,
    username: 'alice_dating_tester',
    usernameNorm: 'alice_dating_tester',
    fullName: 'Alice Johnson',
    dob: new Date('1995-03-15'),
    bio: 'Coffee lover ☕, travel enthusiast 🌍, and always up for new adventures! Looking to meet genuine people.',
    gender: 'Female',
    pronouns: 'She/Her',
    likes: ['Coffee', 'Pizza', 'Chocolate', 'Sushi', 'Wine'],
    interests: ['Travel', 'Photography', 'Hiking', 'Music', 'Reading'],
    preferences: {
      hereFor: 'Dating',
      primaryLanguage: 'English',
      secondaryLanguage: 'French'
    },
    profilePictureUrl: SAMPLE_PHOTOS.female[0],
    location: {
      lat: 40.7128,
      lng: -74.0060,
      city: 'New York',
      country: 'United States'
    },
    role: 'user',
    isProfileCompleted: true,
    profileCompletionStep: 'completed',
    isActive: true,
    verificationStatus: 'approved',
    dating: {
      photos: [
        { url: SAMPLE_PHOTOS.female[0], thumbnailUrl: SAMPLE_PHOTOS.female[0], order: 0, uploadedAt: getRandomDate(10) },
        { url: SAMPLE_PHOTOS.female[1], thumbnailUrl: SAMPLE_PHOTOS.female[1], order: 1, uploadedAt: getRandomDate(9) },
        { url: SAMPLE_PHOTOS.female[2], thumbnailUrl: SAMPLE_PHOTOS.female[2], order: 2, uploadedAt: getRandomDate(8) }
      ],
      videos: [
        { url: SAMPLE_VIDEOS[0], thumbnailUrl: SAMPLE_PHOTOS.female[0], duration: 15, order: 0, uploadedAt: getRandomDate(7) }
      ],
      isDatingProfileActive: true,
      lastUpdatedAt: getRandomDate(5),
      preferences: {
        hereTo: 'Dating',
        wantToMeet: 'Man',
        ageRange: { min: 25, max: 35 },
        languages: ['English', 'French'],
        location: {
          city: 'New York',
          country: 'United States',
          coordinates: { lat: 40.7128, lng: -74.0060 }
        },
        distanceRange: { min: 0, max: 50 }
      }
    },
    lastLoginAt: new Date()
  },
  {
    // 2️⃣ Bob - Male nearby (will match with Alice)
    phoneNumber: '5550002222',
    countryCode: '+91',
    email: 'bob.match.test@example.com',
    emailVerified: true,
    username: 'bob_nearby_match',
    usernameNorm: 'bob_nearby_match',
    fullName: 'Bob Smith',
    dob: new Date('1992-07-20'),
    bio: 'Tech enthusiast 💻, foodie 🍕, and gym lover 💪. Looking for someone special to share adventures with!',
    gender: 'Male',
    pronouns: 'He/Him',
    likes: ['Burgers', 'Coffee', 'Beer', 'Pizza', 'Sushi'],
    interests: ['Technology', 'Fitness', 'Cooking', 'Movies', 'Sports'],
    preferences: {
      hereFor: 'Serious Relationship',
      primaryLanguage: 'English',
      secondaryLanguage: 'Spanish'
    },
    profilePictureUrl: SAMPLE_PHOTOS.male[0],
    location: {
      lat: 40.7500,
      lng: -74.0100,
      city: 'New York',
      country: 'United States'
    },
    role: 'user',
    isProfileCompleted: true,
    profileCompletionStep: 'completed',
    isActive: true,
    verificationStatus: 'approved',
    dating: {
      photos: [
        { url: SAMPLE_PHOTOS.male[0], thumbnailUrl: SAMPLE_PHOTOS.male[0], order: 0, uploadedAt: getRandomDate(12) },
        { url: SAMPLE_PHOTOS.male[1], thumbnailUrl: SAMPLE_PHOTOS.male[1], order: 1, uploadedAt: getRandomDate(11) }
      ],
      videos: [],
      isDatingProfileActive: true,
      lastUpdatedAt: getRandomDate(6),
      preferences: {
        hereTo: 'Serious Relationship',
        wantToMeet: 'Woman',
        ageRange: { min: 22, max: 32 },
        languages: ['English', 'Spanish'],
        location: {
          city: 'New York',
          country: 'United States',
          coordinates: { lat: 40.7500, lng: -74.0100 }
        },
        distanceRange: { min: 0, max: 50 }
      }
    },
    lastLoginAt: getRandomDate(1)
  },
  {
    // 3️⃣ Charlie - Male nearby (to dislike)
    phoneNumber: '5550003333',
    countryCode: '+91',
    email: 'charlie.test@example.com',
    emailVerified: true,
    username: 'charlie_to_dislike',
    usernameNorm: 'charlie_to_dislike',
    fullName: 'Charlie Brown',
    dob: new Date('1990-11-10'),
    bio: 'Artist 🎨 and musician 🎵. Living life one day at a time.',
    gender: 'Male',
    pronouns: 'He/Him',
    likes: ['Wine', 'Pasta', 'Chocolate', 'Ice Cream'],
    interests: ['Art', 'Music', 'Painting', 'Movies'],
    preferences: {
      hereFor: 'Make New Friends',
      primaryLanguage: 'English',
      secondaryLanguage: ''
    },
    profilePictureUrl: SAMPLE_PHOTOS.male[2],
    location: {
      lat: 40.7800,
      lng: -74.0200,
      city: 'New York',
      country: 'United States'
    },
    role: 'user',
    isProfileCompleted: true,
    profileCompletionStep: 'completed',
    isActive: true,
    verificationStatus: 'none',
    dating: {
      photos: [
        { url: SAMPLE_PHOTOS.male[2], thumbnailUrl: SAMPLE_PHOTOS.male[2], order: 0, uploadedAt: getRandomDate(20) }
      ],
      videos: [],
      isDatingProfileActive: true,
      lastUpdatedAt: getRandomDate(15),
      preferences: {
        hereTo: 'Make New Friends',
        wantToMeet: 'Everyone',
        ageRange: { min: 20, max: 40 },
        languages: ['English'],
        location: {
          city: 'New York',
          country: 'United States',
          coordinates: { lat: 40.7800, lng: -74.0200 }
        },
        distanceRange: { min: 0, max: 30 }
      }
    },
    lastLoginAt: getRandomDate(2)
  },
  {
    // 4️⃣ Diana - Female nearby
    phoneNumber: '5550004444',
    countryCode: '+91',
    email: 'diana.test@example.com',
    emailVerified: true,
    username: 'diana_friend',
    usernameNorm: 'diana_friend',
    fullName: 'Diana Prince',
    dob: new Date('1993-05-25'),
    bio: 'Yoga instructor 🧘‍♀️ and wellness advocate. Spreading positivity and good vibes! ✨',
    gender: 'Female',
    pronouns: 'She/Her',
    likes: ['Smoothies', 'Tea', 'Salads', 'Water'],
    interests: ['Yoga', 'Fitness', 'Meditation', 'Nature', 'Wellness'],
    preferences: {
      hereFor: 'Make New Friends',
      primaryLanguage: 'English',
      secondaryLanguage: 'Hindi'
    },
    profilePictureUrl: SAMPLE_PHOTOS.female[3],
    location: {
      lat: 40.7300,
      lng: -74.0000,
      city: 'New York',
      country: 'United States'
    },
    role: 'user',
    isProfileCompleted: true,
    profileCompletionStep: 'completed',
    isActive: true,
    verificationStatus: 'approved',
    dating: {
      photos: [
        { url: SAMPLE_PHOTOS.female[3], thumbnailUrl: SAMPLE_PHOTOS.female[3], order: 0, uploadedAt: getRandomDate(8) },
        { url: SAMPLE_PHOTOS.female[0], thumbnailUrl: SAMPLE_PHOTOS.female[0], order: 1, uploadedAt: getRandomDate(7) }
      ],
      videos: [
        { url: SAMPLE_VIDEOS[1], thumbnailUrl: SAMPLE_PHOTOS.female[3], duration: 20, order: 0, uploadedAt: getRandomDate(6) }
      ],
      isDatingProfileActive: true,
      lastUpdatedAt: getRandomDate(4),
      preferences: {
        hereTo: 'Make New Friends',
        wantToMeet: 'Everyone',
        ageRange: { min: 20, max: 40 },
        languages: ['English', 'Hindi'],
        location: {
          city: 'New York',
          country: 'United States',
          coordinates: { lat: 40.7300, lng: -74.0000 }
        },
        distanceRange: { min: 0, max: 30 }
      }
    },
    lastLoginAt: getRandomDate(1)
  },
  {
    // 5️⃣ Eve - Far away (Los Angeles)
    phoneNumber: '5550005555',
    countryCode: '+91',
    email: 'eve.faraway@example.com',
    emailVerified: true,
    username: 'eve_far_away',
    usernameNorm: 'eve_far_away',
    fullName: 'Eve Wilson',
    dob: new Date('1994-09-30'),
    bio: 'Beach lover 🏖️ and sunset chaser 🌅. Living the California dream!',
    gender: 'Female',
    pronouns: 'She/Her',
    likes: ['Tacos', 'Cocktails', 'Sushi', 'Smoothies'],
    interests: ['Beach', 'Surfing', 'Photography', 'Travel'],
    preferences: {
      hereFor: 'Travel Buddy',
      primaryLanguage: 'English',
      secondaryLanguage: ''
    },
    profilePictureUrl: SAMPLE_PHOTOS.female[1],
    location: {
      lat: 34.0522,
      lng: -118.2437,
      city: 'Los Angeles',
      country: 'United States'
    },
    role: 'user',
    isProfileCompleted: true,
    profileCompletionStep: 'completed',
    isActive: true,
    verificationStatus: 'approved',
    dating: {
      photos: [
        { url: SAMPLE_PHOTOS.female[1], thumbnailUrl: SAMPLE_PHOTOS.female[1], order: 0, uploadedAt: getRandomDate(5) }
      ],
      videos: [],
      isDatingProfileActive: true,
      lastUpdatedAt: getRandomDate(3),
      preferences: {
        hereTo: 'Travel Buddy',
        wantToMeet: 'Everyone',
        ageRange: { min: 22, max: 35 },
        languages: ['English'],
        location: {
          city: 'Los Angeles',
          country: 'United States',
          coordinates: { lat: 34.0522, lng: -118.2437 }
        },
        distanceRange: { min: 0, max: 100 }
      }
    },
    lastLoginAt: getRandomDate(1)
  },
  {
    // 6️⃣ Frank - Dating profile INACTIVE
    phoneNumber: '5550006666',
    countryCode: '+91',
    email: 'frank.inactive@example.com',
    emailVerified: true,
    username: 'frank_inactive',
    usernameNorm: 'frank_inactive',
    fullName: 'Frank Miller',
    dob: new Date('1991-12-05'),
    bio: 'Chef and food enthusiast 👨‍🍳. Love experimenting with new recipes!',
    gender: 'Male',
    pronouns: 'He/Him',
    likes: ['Burgers', 'Pizza', 'Pasta', 'Beer'],
    interests: ['Cooking', 'Food', 'Wine', 'Travel'],
    preferences: {
      hereFor: 'Networking',
      primaryLanguage: 'English',
      secondaryLanguage: 'Italian'
    },
    profilePictureUrl: SAMPLE_PHOTOS.male[3],
    location: {
      lat: 40.7400,
      lng: -74.0050,
      city: 'New York',
      country: 'United States'
    },
    role: 'user',
    isProfileCompleted: true,
    profileCompletionStep: 'completed',
    isActive: true,
    verificationStatus: 'none',
    dating: {
      photos: [
        { url: SAMPLE_PHOTOS.male[3], thumbnailUrl: SAMPLE_PHOTOS.male[3], order: 0, uploadedAt: getRandomDate(30) }
      ],
      videos: [],
      isDatingProfileActive: false, // ❌ INACTIVE
      lastUpdatedAt: getRandomDate(25),
      preferences: {
        hereTo: 'Networking',
        wantToMeet: 'Woman',
        ageRange: { min: 25, max: 40 },
        languages: ['English', 'Italian'],
        location: {
          city: 'New York',
          country: 'United States',
          coordinates: { lat: 40.7400, lng: -74.0050 }
        },
        distanceRange: { min: 0, max: 25 }
      }
    },
    lastLoginAt: getRandomDate(5)
  },
  {
    // 7️⃣ Grace - New to dating
    phoneNumber: '5550007777',
    countryCode: '+91',
    email: 'grace.newdater@example.com',
    emailVerified: true,
    username: 'grace_new_dater',
    usernameNorm: 'grace_new_dater',
    fullName: 'Grace Lee',
    dob: new Date('1996-02-14'),
    bio: 'Book lover 📚 and aspiring writer ✍️. Just joined and excited to meet new people!',
    gender: 'Female',
    pronouns: 'She/Her',
    likes: ['Coffee', 'Books', 'Tea', 'Chocolate'],
    interests: ['Reading', 'Writing', 'Literature', 'Coffee', 'Movies'],
    preferences: {
      hereFor: 'Make New Friends',
      primaryLanguage: 'English',
      secondaryLanguage: 'Korean'
    },
    profilePictureUrl: SAMPLE_PHOTOS.female[2],
    location: {
      lat: 40.7200,
      lng: -74.0080,
      city: 'New York',
      country: 'United States'
    },
    role: 'user',
    isProfileCompleted: true,
    profileCompletionStep: 'completed',
    isActive: true,
    verificationStatus: 'none',
    dating: {
      photos: [
        { url: SAMPLE_PHOTOS.female[2], thumbnailUrl: SAMPLE_PHOTOS.female[2], order: 0, uploadedAt: new Date() } // Recently uploaded
      ],
      videos: [],
      isDatingProfileActive: true,
      lastUpdatedAt: new Date(), // Just activated today
      preferences: {
        hereTo: 'Make New Friends',
        wantToMeet: 'Everyone',
        ageRange: { min: 18, max: 45 },
        languages: ['English', 'Korean'],
        location: {
          city: 'New York',
          country: 'United States',
          coordinates: { lat: 40.7200, lng: -74.0080 }
        },
        distanceRange: { min: 0, max: 100 }
      }
    },
    lastLoginAt: new Date()
  },
  {
    // 8️⃣ Henry - Commenter
    phoneNumber: '5550008888',
    countryCode: '+91',
    email: 'henry.commenter@example.com',
    emailVerified: true,
    username: 'henry_commenter',
    usernameNorm: 'henry_commenter',
    fullName: 'Henry Davis',
    dob: new Date('1989-08-18'),
    bio: 'Entrepreneur and startup enthusiast 💼. Always looking to connect with interesting people!',
    gender: 'Male',
    pronouns: 'He/Him',
    likes: ['Coffee', 'Beer', 'Pizza', 'Burgers'],
    interests: ['Technology', 'Business', 'Networking', 'Travel', 'Sports'],
    preferences: {
      hereFor: 'Networking',
      primaryLanguage: 'English',
      secondaryLanguage: 'Mandarin'
    },
    profilePictureUrl: SAMPLE_PHOTOS.male[1],
    location: {
      lat: 40.7600,
      lng: -74.0120,
      city: 'New York',
      country: 'United States'
    },
    role: 'user',
    isProfileCompleted: true,
    profileCompletionStep: 'completed',
    isActive: true,
    verificationStatus: 'approved',
    dating: {
      photos: [
        { url: SAMPLE_PHOTOS.male[1], thumbnailUrl: SAMPLE_PHOTOS.male[1], order: 0, uploadedAt: getRandomDate(14) },
        { url: SAMPLE_PHOTOS.male[0], thumbnailUrl: SAMPLE_PHOTOS.male[0], order: 1, uploadedAt: getRandomDate(13) }
      ],
      videos: [],
      isDatingProfileActive: true,
      lastUpdatedAt: getRandomDate(10),
      preferences: {
        hereTo: 'Networking',
        wantToMeet: 'Everyone',
        ageRange: { min: 20, max: 45 },
        languages: ['English', 'Mandarin'],
        location: {
          city: 'New York',
          country: 'United States',
          coordinates: { lat: 40.7600, lng: -74.0120 }
        },
        distanceRange: { min: 0, max: 50 }
      }
    },
    lastLoginAt: getRandomDate(1)
  }
];

// Seed functions
const seedTestUsers = async () => {
  console.log('🌱 Seeding Dating Test Users...\n');
  
  const createdUsers = [];
  let skippedCount = 0;
  
  for (const userData of testUsers) {
    try {
      // Check if user already exists
      const existingUser = await User.findOne({ phoneNumber: userData.phoneNumber });
      
      if (existingUser) {
        console.log(`⏭️  Skipped: ${userData.fullName} (${userData.phoneNumber}) - already exists`);
        createdUsers.push(existingUser);
        skippedCount++;
      } else {
        const newUser = await User.create(userData);
        console.log(`✅ Created: ${userData.fullName} (${userData.phoneNumber})`);
        createdUsers.push(newUser);
      }
    } catch (error) {
      if (error.code === 11000) {
        // Duplicate key error - user already exists
        console.log(`⏭️  Skipped: ${userData.fullName} - duplicate entry`);
        const existingUser = await User.findOne({ phoneNumber: userData.phoneNumber });
        if (existingUser) createdUsers.push(existingUser);
        skippedCount++;
      } else {
        console.error(`❌ Error creating ${userData.fullName}:`, error.message);
      }
    }
  }
  
  console.log(`\n📊 Summary: ${createdUsers.length - skippedCount} created, ${skippedCount} skipped (already existed)\n`);
  
  return createdUsers;
};

const seedDatingInteractions = async (users) => {
  console.log('🌱 Seeding Dating Interactions...\n');
  
  const alice = users.find(u => u.username === 'alice_dating_tester');
  const bob = users.find(u => u.username === 'bob_nearby_match');
  const charlie = users.find(u => u.username === 'charlie_to_dislike');
  const diana = users.find(u => u.username === 'diana_friend');
  const henry = users.find(u => u.username === 'henry_commenter');
  const eve = users.find(u => u.username === 'eve_far_away');
  
  if (!alice || !bob || !charlie || !diana || !henry || !eve) {
    console.log('⚠️  Some test users not found, skipping interactions\n');
    return { createdInteractions: [], alice, bob, charlie, diana, henry };
  }
  
  const interactions = [
    {
      user: bob._id,
      targetUser: alice._id,
      action: 'like',
      status: 'pending',
      createdAt: getRandomDate(2)
    },
    {
      user: henry._id,
      targetUser: diana._id,
      action: 'like',
      status: 'pending',
      createdAt: getRandomDate(3)
    },
    {
      user: charlie._id,
      targetUser: eve._id,
      action: 'dislike',
      status: 'dismissed',
      createdAt: getRandomDate(4)
    }
  ];
  
  const createdInteractions = [];
  let skippedCount = 0;
  
  for (const interactionData of interactions) {
    try {
      // Check if interaction already exists
      const existing = await DatingInteraction.findOne({
        user: interactionData.user,
        targetUser: interactionData.targetUser
      });
      
      if (existing) {
        console.log(`⏭️  Interaction already exists: ${interactionData.action}`);
        createdInteractions.push(existing);
        skippedCount++;
      } else {
        const newInteraction = await DatingInteraction.create(interactionData);
        console.log(`✅ Created interaction: ${interactionData.action}`);
        createdInteractions.push(newInteraction);
      }
    } catch (error) {
      console.log(`⏭️  Skipped interaction (already exists or error): ${error.message}`);
      skippedCount++;
    }
  }
  
  console.log(`\n📊 Interactions: ${createdInteractions.length - skippedCount} created, ${skippedCount} skipped\n`);
  
  return { createdInteractions, alice, bob, charlie, diana, henry };
};

const seedDatingComments = async (users, alice, bob, diana, henry) => {
  console.log('🌱 Seeding Dating Profile Comments...\n');
  
  if (!alice || !bob || !diana || !henry) {
    console.log('⚠️  Some test users not found, skipping comments\n');
    return [];
  }
  
  const commentData = [
    {
      user: henry._id,
      targetUser: alice._id,
      text: DATING_COMMENTS[0],
      likes: [],
      likesCount: 0,
      isPinned: false,
      isDeleted: false,
      createdAt: getRandomDate(2)
    },
    {
      user: bob._id,
      targetUser: alice._id,
      text: DATING_COMMENTS[2],
      likes: [{ user: alice._id, likedAt: getRandomDate(1) }],
      likesCount: 1,
      isPinned: false,
      isDeleted: false,
      createdAt: getRandomDate(3)
    },
    {
      user: alice._id,
      targetUser: diana._id,
      text: DATING_COMMENTS[4],
      likes: [],
      likesCount: 0,
      isPinned: false,
      isDeleted: false,
      createdAt: getRandomDate(1)
    }
  ];
  
  const createdComments = [];
  let skippedCount = 0;
  
  for (const comment of commentData) {
    try {
      // Check if similar comment already exists
      const existing = await DatingProfileComment.findOne({
        user: comment.user,
        targetUser: comment.targetUser,
        text: comment.text
      });
      
      if (existing) {
        console.log(`⏭️  Comment already exists`);
        createdComments.push(existing);
        skippedCount++;
      } else {
        const newComment = await DatingProfileComment.create(comment);
        console.log(`✅ Created comment`);
        createdComments.push(newComment);
      }
    } catch (error) {
      console.log(`⏭️  Skipped comment (error): ${error.message}`);
      skippedCount++;
    }
  }
  
  console.log(`\n📊 Comments: ${createdComments.length - skippedCount} created, ${skippedCount} skipped\n`);
  
  return createdComments;
};

// Main seed function
const seedDatingDatabase = async (clearFirst = false) => {
  try {
    console.log('\n🚀 Starting Dating API Database Seeding...\n');
    console.log('=' .repeat(70));
    
    // Connect to database
    await connectDB();
    
    // Clear existing data if requested
    if (clearFirst) {
      console.log('\n🗑️  Clearing existing dating test data...\n');
      
      // Get test user IDs first
      const testUsers = await User.find({ phoneNumber: { $regex: '^555000' } }).select('_id');
      const testUserIds = testUsers.map(u => u._id);
      
      await Promise.all([
        User.deleteMany({ phoneNumber: { $regex: '^555000' } }), // Only delete test users
        DatingInteraction.deleteMany({
          $or: [
            { user: { $in: testUserIds } },
            { targetUser: { $in: testUserIds } }
          ]
        }),
        DatingMatch.deleteMany({
          $or: [
            { userA: { $in: testUserIds } },
            { userB: { $in: testUserIds } }
          ]
        }),
        DatingProfileComment.deleteMany({
          $or: [
            { user: { $in: testUserIds } },
            { targetUser: { $in: testUserIds } }
          ]
        })
      ]);
      console.log('✅ Test data cleared successfully\n');
    } else {
      console.log('\n📝 Adding test data to existing database (use --clear to remove old data)\n');
    }
    
    // Seed in order (respecting dependencies)
    const users = await seedTestUsers();
    const { createdInteractions, alice, bob, charlie, diana, henry } = await seedDatingInteractions(users);
    const comments = await seedDatingComments(users, alice, bob, charlie, diana, henry);
    
    console.log('=' .repeat(70));
    console.log('\n🎉 Dating API Database Seeding Completed Successfully!\n');
    console.log('📊 Summary:');
    console.log(`   👥 Test Users: ${users.length} (in database)`);
    console.log(`   💌 Dating Interactions: ${createdInteractions.length} (in database)`);
    console.log(`   💬 Dating Comments: ${comments.length} (in database)`);
    
    console.log('\n' + '=' .repeat(70));
    console.log('🎯 HIGHLIGHTED TEST PROFILES FOR POSTMAN:');
    console.log('=' .repeat(70));
    console.log('\n1️⃣  MAIN TEST USER (Alice):');
    console.log(`    Phone: +91 5550001111`);
    console.log(`    Username: alice_dating_tester`);
    console.log(`    User ID: ${alice._id}`);
    console.log(`    Dating Profile: ACTIVE ✅`);
    console.log(`    Location: New York (40.7128, -74.0060)`);
    
    console.log('\n2️⃣  MATCH USER (Bob) - Like him to create match:');
    console.log(`    Phone: +91 5550002222`);
    console.log(`    Username: bob_nearby_match`);
    console.log(`    User ID: ${bob._id}`);
    console.log(`    Dating Profile: ACTIVE ✅`);
    console.log(`    Status: Already liked Alice - MATCH READY 💑`);
    
    console.log('\n3️⃣  DISLIKE USER (Charlie):');
    console.log(`    Phone: +91 5550003333`);
    console.log(`    Username: charlie_to_dislike`);
    console.log(`    User ID: ${charlie._id}`);
    console.log(`    Dating Profile: ACTIVE ✅`);
    
    console.log('\n4️⃣  COMMENT USER (Diana):');
    console.log(`    Phone: +91 5550004444`);
    console.log(`    Username: diana_friend`);
    console.log(`    User ID: ${diana._id}`);
    console.log(`    Dating Profile: ACTIVE ✅`);
    
    console.log('\n5️⃣  COMMENTER (Henry):');
    console.log(`    Phone: +91 5550008888`);
    console.log(`    Username: henry_commenter`);
    console.log(`    User ID: ${henry._id}`);
    console.log(`    Status: Has commented on Alice\'s profile`);
    
    console.log('\n' + '=' .repeat(70));
    console.log('🧪 TESTING FLOW:');
    console.log('=' .repeat(70));
    console.log('\n1. Login as Alice: POST /auth/send-otp');
    console.log('   Body: { "phoneNumber": "5550001111", "countryCode": "+91" }');
    console.log('   Then: POST /auth/verify-otp with OTP: 123456');
    
    console.log('\n2. View Alice\'s Dating Profile:');
    console.log('   GET /user/dating/profile');
    
    console.log('\n3. View Alice\'s Dating Preferences:');
    console.log('   GET /user/dating/preferences');
    
    console.log('\n4. Search Nearby Dating Profiles:');
    console.log('   GET /user/dating/profiles?distanceMax=50&filter=near_by');
    console.log('   (You should see Bob, Charlie, Diana, Henry, Grace)');
    
    console.log(`\n5. Like Bob to Create a MATCH:`);
    console.log(`   POST /user/dating/profiles/${bob._id}/like`);
    console.log('   Body: { "comment": "You seem awesome!" }');
    
    console.log(`\n6. Dislike Charlie:`);
    console.log(`   POST /user/dating/profiles/${charlie._id}/dislike`);
    
    console.log(`\n7. Comment on Diana\'s Profile:`);
    console.log(`   POST /user/dating/profiles/${diana._id}/comments`);
    console.log('   Body: { "text": "Love your vibe!" }');
    
    console.log('\n8. View All Matches:');
    console.log('   GET /user/dating/matches?status=active');
    console.log('   (You should see match with Bob)');
    
    console.log(`\n9. Block Henry:`);
    console.log(`   POST /user/dating/profiles/${henry._id}/block`);
    
    console.log(`\n10. Report a Profile:`);
    console.log(`    POST /user/dating/profiles/${charlie._id}/report`);
    console.log('    Body: { "description": "Inappropriate content" }');
    
    console.log('\n' + '=' .repeat(70));
    console.log('💡 TIP: Use filter parameters in GET /user/dating/profiles:');
    console.log('   - filter=near_by (location-based)');
    console.log('   - filter=new_dater (Grace will appear)');
    console.log('   - filter=same_interests (based on Alice\'s interests)');
    console.log('   - wantToMeet=Man (only male profiles)');
    console.log('   - ageMin=25&ageMax=35 (age range filter)');
    console.log('   - distanceMax=10 (max 10km away)');
    console.log('=' .repeat(70));
    
    console.log('\n💾 NOTE: Existing data was preserved. Test users were added/updated.');
    console.log('   Run with --clear flag to remove old test data before seeding.\n');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    console.error('Error details:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed\n');
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
  console.log('\n📋 Dating Seed Options:', options.clear ? '✅ --clear flag (will remove old test data first)' : '✅ No --clear flag (will add to existing data)');
  seedDatingDatabase(options.clear);
}

module.exports = { seedDatingDatabase };

