const mongoose = require('mongoose');
require('dotenv').config();

// Import all models
const User = require('./user/auth/model/userAuthModel');
const Chat = require('./user/social/userModel/chatModel');
const Message = require('./user/social/userModel/messageModel');
const Call = require('./user/social/userModel/callModel');
const UserStatus = require('./user/social/userModel/userStatusModel');
const MessageRequest = require('./user/social/userModel/messageRequestModel');
const FollowRequest = require('./user/social/userModel/followRequestModel');
const Post = require('./user/social/userModel/postModel');
const Story = require('./user/social/userModel/storyModel');
const DatingInteraction = require('./user/dating/models/datingInteractionModel');
const DatingMatch = require('./user/dating/models/datingMatchModel');
const DatingProfileComment = require('./user/dating/models/datingProfileCommentModel');

// Database connection - Local MongoDB with database name 'vibgyor'
const connectDB = async () => {
  try {
    const mongoURI = 'mongodb://localhost:27017/vibgyor';
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to Local MongoDB (vibgyor database)');
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

// The 3 image URLs to use for dating profiles
const DATING_PHOTO_URLS = [
  'https://yoraaecommerce.s3.ap-south-1.amazonaws.com/69118cab8bf6620e4cdea973/profile-images/1764840483859-anjali-1.jpg',
  'https://yoraaecommerce.s3.ap-south-1.amazonaws.com/69118cab8bf6620e4cdea973/profile-images/1764840557569-anjali-2.jpg',
  'https://yoraaecommerce.s3.ap-south-1.amazonaws.com/69118cab8bf6620e4cdea973/profile-images/1764840607685-anjali-3.jpg'
];

// Demo data arrays
const demoData = {
  names: [
    'Anjali Sharma', 'Priya Patel', 'Sneha Reddy', 'Kavya Nair', 'Divya Singh',
    'Meera Joshi', 'Riya Kapoor', 'Aishwarya Rao', 'Neha Gupta', 'Shreya Verma',
    'Rahul Kumar', 'Arjun Singh', 'Vikram Reddy', 'Siddharth Nair', 'Aditya Joshi',
    'Rohan Kapoor', 'Karan Rao', 'Varun Gupta', 'Amit Verma', 'Sahil Sharma'
  ],
  
  usernames: [
    'anjali_sharma', 'priya_patel', 'sneha_reddy', 'kavya_nair', 'divya_singh',
    'meera_joshi', 'riya_kapoor', 'aishwarya_rao', 'neha_gupta', 'shreya_verma',
    'rahul_kumar', 'arjun_singh', 'vikram_reddy', 'siddharth_nair', 'aditya_joshi',
    'rohan_kapoor', 'karan_rao', 'varun_gupta', 'amit_verma', 'sahil_sharma'
  ],
  
  phoneNumbers: [
    '9876543210', '9876543211', '9876543212', '9876543213', '9876543214',
    '9876543215', '9876543216', '9876543217', '9876543218', '9876543219',
    '9876543220', '9876543221', '9876543222', '9876543223', '9876543224',
    '9876543225', '9876543226', '9876543227', '9876543228', '9876543229'
  ],
  
  emails: [
    'anjali@example.com', 'priya@example.com', 'sneha@example.com', 'kavya@example.com', 'divya@example.com',
    'meera@example.com', 'riya@example.com', 'aishwarya@example.com', 'neha@example.com', 'shreya@example.com',
    'rahul@example.com', 'arjun@example.com', 'vikram@example.com', 'siddharth@example.com', 'aditya@example.com',
    'rohan@example.com', 'karan@example.com', 'varun@example.com', 'amit@example.com', 'sahil@example.com'
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
    'Entrepreneur and startup enthusiast 💼'
  ],
  
  interests: [
    'Photography', 'Travel', 'Music', 'Art', 'Sports', 'Cooking', 'Reading', 'Gaming',
    'Fitness', 'Yoga', 'Dancing', 'Movies', 'Technology', 'Fashion', 'Nature', 'Animals'
  ],
  
  cities: [
    'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata', 'Ahmedabad'
  ],
  
  countries: ['India'],
  
  genders: ['Female', 'Male'],
  pronouns: ['She/Her', 'He/Him'],
  
  datingHereTo: ['Make New Friends', 'Dating', 'Serious Relationship', 'Networking'],
  datingWantToMeet: ['Woman', 'Man', 'Everyone'],
  
  languages: ['English', 'Hindi', 'Telugu', 'Tamil', 'Kannada', 'Marathi', 'Gujarati'],
  
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
    'New restaurant discovery - highly recommend! 🍽️'
  ],
  
  hashtags: [
    '#photography', '#travel', '#food', '#nature', '#fitness', '#art', '#music',
    '#coffee', '#sunset', '#beach', '#mountains', '#city', '#friends', '#life'
  ],
  
  storyContents: [
    'Behind the scenes! 📸',
    'Day in my life ✨',
    'New discovery! 🔍',
    'Quick update 💫',
    'Random thought 💭',
    'Good vibes only ✌️',
    'Making memories 📝',
    'Today\'s mood 🎭'
  ],
  
  messageContents: [
    'Hey! How are you doing?',
    'What\'s up?',
    'How was your day?',
    'Want to grab coffee sometime?',
    'Did you see that movie?',
    'Thanks for the help earlier!',
    'Can\'t wait to see you!',
    'Hope you\'re having a great day!'
  ]
};

/**
 * Seed Users with both social and dating profiles
 */
const seedUsers = async () => {
  console.log('🌱 Seeding Users...');
  
  const users = [];
  const userCount = 20;
  
  for (let i = 0; i < userCount; i++) {
    const primaryLanguage = getRandomElement(demoData.languages);
    const languages = [primaryLanguage];
    if (Math.random() > 0.5) {
      const secondaryLanguage = getRandomElement(demoData.languages.filter(lang => lang !== primaryLanguage));
      if (secondaryLanguage) languages.push(secondaryLanguage);
    }
    
    const gender = i < 10 ? 'Female' : 'Male';
    const pronouns = gender === 'Female' ? 'She/Her' : 'He/Him';
    
    // Dating photos - use the 3 URLs for all users
    const datingPhotos = DATING_PHOTO_URLS.map((url, idx) => ({
      url: url,
      thumbnailUrl: url,
      order: idx,
      uploadedAt: getRandomDate(10)
    }));
    
    const user = {
      phoneNumber: demoData.phoneNumbers[i],
      countryCode: '+91',
      email: demoData.emails[i],
      emailVerified: true,
      username: demoData.usernames[i],
      usernameNorm: demoData.usernames[i].toLowerCase(),
      fullName: demoData.names[i],
      dob: getRandomDate(365 * 25),
      bio: getRandomElement(demoData.bios),
      gender: gender,
      pronouns: pronouns,
      likes: ['Coffee', 'Travel', 'Music', 'Photography', 'Food'],
      interests: getRandomElements(demoData.interests, getRandomInt(5, 8)),
      profilePictureUrl: DATING_PHOTO_URLS[0],
      location: {
        lat: 19.0760 + (Math.random() - 0.5) * 2,
        lng: 72.8777 + (Math.random() - 0.5) * 2,
        city: getRandomElement(demoData.cities),
        country: 'India'
      },
      preferences: {
        hereFor: getRandomElement(demoData.datingHereTo),
        wantToMeet: getRandomElement(demoData.datingWantToMeet),
        primaryLanguage: languages[0] || 'English',
        secondaryLanguage: languages[1] || ''
      },
      role: 'user',
      isProfileCompleted: true,
      isActive: true,
      verificationStatus: 'approved',
      privacySettings: {
        isPrivate: randomBool(0.2),
        allowFollowRequests: true,
        showOnlineStatus: true,
        allowMessages: 'everyone'
      },
      lastLoginAt: getRandomDate(7),
      following: [],
      followers: [],
      blockedUsers: [],
      blockedBy: [],
      // Dating profile
      dating: {
        photos: datingPhotos,
        videos: [],
        isDatingProfileActive: true,
        lastUpdatedAt: new Date(),
        preferences: {
          hereTo: getRandomElement(demoData.datingHereTo),
          wantToMeet: getRandomElement(demoData.datingWantToMeet),
          ageRange: {
            min: getRandomInt(22, 28),
            max: getRandomInt(30, 40)
          },
          languages: languages,
          location: {
            city: getRandomElement(demoData.cities),
            country: 'India',
            coordinates: {
              lat: 19.0760 + (Math.random() - 0.5) * 2,
              lng: 72.8777 + (Math.random() - 0.5) * 2
            }
          },
          distanceRange: {
            min: 0,
            max: getRandomElement([10, 25, 50, 100])
          }
        }
      }
    };
    
    users.push(user);
  }
  
  const createdUsers = await User.insertMany(users);
  console.log(`✅ Created ${createdUsers.length} users`);
  return createdUsers;
};

/**
 * Seed Follow Requests and update relationships
 */
const seedFollowRequests = async (users) => {
  console.log('🌱 Seeding Follow Requests...');
  
  const followRequests = [];
  const requestCount = Math.floor(users.length * 0.4);
  
  for (let i = 0; i < requestCount; i++) {
    const requester = getRandomElement(users);
    const recipient = getRandomElement(users.filter(u => u._id.toString() !== requester._id.toString()));
    
    const status = getRandomElement(['pending', 'accepted', 'accepted', 'rejected']); // More accepted
    
    const followRequest = {
      requester: requester._id,
      recipient: recipient._id,
      status: status,
      message: Math.random() > 0.5 ? 'Hi! I\'d like to connect with you.' : '',
      respondedAt: status !== 'pending' ? getRandomDate(7) : null,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    };
    followRequests.push(followRequest);
  }
  
  const createdRequests = await FollowRequest.insertMany(followRequests);
  console.log(`✅ Created ${createdRequests.length} follow requests`);
  
  // Update user relationships
  console.log('🌱 Updating User Relationships...');
  for (const user of users) {
    const following = followRequests
      .filter(fr => fr.requester.toString() === user._id.toString() && fr.status === 'accepted')
      .map(fr => fr.recipient);
    
    const followers = followRequests
      .filter(fr => fr.recipient.toString() === user._id.toString() && fr.status === 'accepted')
      .map(fr => fr.requester);
    
    await User.findByIdAndUpdate(user._id, {
      following: following,
      followers: followers
    });
  }
  console.log('✅ Updated user relationships');
  
  return createdRequests;
};

/**
 * Seed Posts
 */
const seedPosts = async (users) => {
  console.log('🌱 Seeding Posts...');
  
  const posts = [];
  const postCount = Math.floor(users.length * 2); // 2 posts per user
  
  for (let i = 0; i < postCount; i++) {
    const author = getRandomElement(users);
    const content = getRandomElement(demoData.postContents);
    const hashtags = getRandomElements(demoData.hashtags, getRandomInt(1, 4));
    
    const likes = [];
    const comments = [];
    const numLikes = getRandomInt(5, 25);
    const numComments = getRandomInt(2, 10);
    
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
          isEdited: randomBool(0.1),
          editedAt: randomBool(0.1) ? getRandomDate(7) : null
        });
      }
    }
    
    const post = {
      author: author._id,
      content: content,
      caption: content.substring(0, 100),
      media: randomBool(0.7) ? [{
        type: 'image',
        url: DATING_PHOTO_URLS[getRandomInt(0, 2)],
        filename: `post_${i}.jpg`,
        fileSize: getRandomInt(100000, 5000000),
        mimeType: 'image/jpeg',
        s3Key: `posts/post_${i}.jpg`,
        thumbnail: DATING_PHOTO_URLS[getRandomInt(0, 2)],
        dimensions: {
          width: 1920,
          height: 1080
        }
      }] : [],
      hashtags: hashtags,
      privacy: getRandomElement(['public', 'followers']),
      status: 'published',
      likes: likes,
      comments: comments,
      likesCount: likes.length,
      commentsCount: comments.length,
      sharesCount: getRandomInt(0, 10),
      viewsCount: getRandomInt(50, 500),
      publishedAt: getRandomDate(30),
      lastEngagementAt: getRandomDate(7)
    };
    
    posts.push(post);
  }
  
  const createdPosts = await Post.insertMany(posts);
  console.log(`✅ Created ${createdPosts.length} posts`);
  return createdPosts;
};

/**
 * Seed Stories
 */
const seedStories = async (users) => {
  console.log('🌱 Seeding Stories...');
  
  const stories = [];
  const storyCount = Math.floor(users.length * 1.5); // 1.5 stories per user
  
  for (let i = 0; i < storyCount; i++) {
    const author = getRandomElement(users);
    const content = getRandomElement(demoData.storyContents);
    const expiresAt = new Date(Date.now() + (Math.random() * 24 * 60 * 60 * 1000));
    
    const views = [];
    const numViews = getRandomInt(5, 30);
    
    for (let j = 0; j < numViews; j++) {
      const viewer = getRandomElement(users);
      if (viewer._id.toString() !== author._id.toString()) {
        views.push({
          user: viewer._id,
          viewedAt: getRandomDate(1),
          viewDuration: getRandomInt(1, 30),
          isLiked: randomBool(0.3)
        });
      }
    }
    
    const story = {
      author: author._id,
      content: content,
      media: {
        type: randomBool(0.8) ? 'image' : 'text',
        url: randomBool(0.8) ? DATING_PHOTO_URLS[getRandomInt(0, 2)] : '',
        filename: `story_${i}.jpg`,
        fileSize: randomBool(0.8) ? getRandomInt(100000, 5000000) : content.length,
        mimeType: randomBool(0.8) ? 'image/jpeg' : 'text/plain',
        s3Key: randomBool(0.8) ? `stories/story_${i}.jpg` : 'text-story',
        dimensions: randomBool(0.8) ? {
          width: 1080,
          height: 1920
        } : null
      },
      privacy: 'public',
      status: 'active',
      expiresAt: expiresAt,
      views: views,
      analytics: {
        viewsCount: views.length,
        likesCount: views.filter(v => v.isLiked).length,
        repliesCount: 0,
        sharesCount: 0
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

/**
 * Seed Chats and Messages
 */
const seedChats = async (users) => {
  console.log('🌱 Seeding Chats...');
  
  const chats = [];
  const chatCount = Math.floor(users.length * 0.5);
  
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
          isArchived: randomBool(0.1),
          isPinned: randomBool(0.2),
          isMuted: randomBool(0.1)
        },
        {
          userId: participant2._id,
          isArchived: randomBool(0.1),
          isPinned: randomBool(0.2),
          isMuted: randomBool(0.1)
        }
      ],
      requestStatus: 'accepted',
      lastMessageAt: getRandomDate(7)
    };
    chats.push(chat);
  }
  
  const createdChats = await Chat.insertMany(chats);
  console.log(`✅ Created ${createdChats.length} chats`);
  
  // Seed messages for chats
  console.log('🌱 Seeding Messages...');
  const messages = [];
  
  for (const chat of createdChats) {
    const messageCount = getRandomInt(5, 15);
    
    for (let i = 0; i < messageCount; i++) {
      const sender = getRandomElement(chat.participants);
      const messageType = getRandomElement(['text', 'text', 'text', 'image']);
      
      const message = {
        chatId: chat._id,
        senderId: sender,
        type: messageType,
        content: messageType === 'text' ? getRandomElement(demoData.messageContents) : '',
        status: getRandomElement(['sent', 'delivered', 'read']),
        readBy: randomBool(0.6) ? [{
          userId: getRandomElement(chat.participants.filter(p => p.toString() !== sender.toString())),
          readAt: getRandomDate(1)
        }] : [],
        reactions: randomBool(0.2) ? [{
          userId: getRandomElement(chat.participants),
          emoji: getRandomElement(['👍', '❤️', '😂', '😮']),
          createdAt: getRandomDate(1)
        }] : [],
        createdAt: getRandomDate(7)
      };
      
      if (messageType === 'image') {
        message.media = {
          url: DATING_PHOTO_URLS[getRandomInt(0, 2)],
          thumbnailUrl: DATING_PHOTO_URLS[getRandomInt(0, 2)],
          mimeType: 'image/jpeg',
          fileName: `message_${i}.jpg`,
          fileSize: getRandomInt(100000, 2000000),
          dimensions: {
            width: 1920,
            height: 1080
          }
        };
      }
      
      messages.push(message);
    }
  }
  
  const createdMessages = await Message.insertMany(messages);
  console.log(`✅ Created ${createdMessages.length} messages`);
  
  // Update chat last messages
  for (const chat of createdChats) {
    const chatMessages = messages.filter(m => m.chatId.toString() === chat._id.toString());
    if (chatMessages.length > 0) {
      const lastMessage = chatMessages.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
      await Chat.findByIdAndUpdate(chat._id, {
        lastMessage: lastMessage._id,
        lastMessageAt: lastMessage.createdAt
      });
    }
  }
  
  return { chats: createdChats, messages: createdMessages };
};

/**
 * Seed Dating Interactions
 */
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
    
    const action = randomBool(0.7) ? 'like' : 'dislike';
    
    if (action === 'like' && randomBool(0.3)) {
      // Create match (mutual like)
      const timestamp = getRandomDate(5);
      
      interactions.push({
        user: liker._id,
        targetUser: target._id,
        action: 'like',
        status: 'matched',
        matchedAt: timestamp
      });
      
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
      interactions.push({
        user: liker._id,
        targetUser: target._id,
        action: action,
        status: action === 'like' ? 'pending' : 'dismissed',
        matchedAt: null
      });
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
      console.warn('⚠️  Some dating matches already existed (ignored)');
    }
  }
  
  console.log(`✅ Created ${interactionsCount} dating interactions and ${matchesCount} matches`);
  return { interactionsCount, matchesCount };
};

/**
 * Seed User Statuses
 */
const seedUserStatuses = async (users) => {
  console.log('🌱 Seeding User Statuses...');
  
  const userStatuses = [];
  for (const user of users) {
    const isOnline = randomBool(0.3);
    const userStatus = {
      userId: user._id,
      isOnline: isOnline,
      lastSeen: getRandomDate(7),
      status: isOnline ? getRandomElement(['Available', 'At work', 'Busy']) : '',
      connectionId: isOnline ? `conn_${Math.random().toString(36).substr(2, 9)}` : '',
      deviceInfo: {
        platform: getRandomElement(['Windows', 'macOS', 'iOS', 'Android']),
        browser: getRandomElement(['Chrome', 'Firefox', 'Safari']),
        userAgent: 'Mozilla/5.0 (Demo Browser)'
      },
      privacySettings: {
        showOnlineStatus: true,
        showLastSeen: true,
        showTypingStatus: true
      },
      lastActivity: getRandomDate(1)
    };
    userStatuses.push(userStatus);
  }
  
  const createdStatuses = await UserStatus.insertMany(userStatuses);
  console.log(`✅ Created ${createdStatuses.length} user statuses`);
  return createdStatuses;
};

/**
 * Main seed function
 */
const seedCompleteDatabase = async (clearFirst = false) => {
  try {
    console.log('🚀 Starting Complete Database Seeding (Social + Dating)...');
    console.log('📍 Using Local MongoDB Database: vibgyor');
    console.log('🖼️  Using 3 specific image URLs for dating photos\n');
    
    // Connect to database
    await connectDB();
    
    // Clear existing data if requested
    if (clearFirst) {
      console.log('🗑️  Clearing existing data...');
      await Promise.all([
        User.deleteMany({}),
        Chat.deleteMany({}),
        Message.deleteMany({}),
        Call.deleteMany({}),
        UserStatus.deleteMany({}),
        FollowRequest.deleteMany({}),
        MessageRequest.deleteMany({}),
        Post.deleteMany({}),
        Story.deleteMany({}),
        DatingInteraction.deleteMany({}),
        DatingMatch.deleteMany({}),
        DatingProfileComment.deleteMany({})
      ]);
      console.log('✅ Database cleared successfully\n');
    }
    
    // Seed in order
    const users = await seedUsers();
    const followRequests = await seedFollowRequests(users);
    const posts = await seedPosts(users);
    const stories = await seedStories(users);
    const { chats, messages } = await seedChats(users);
    const datingData = await seedDatingInteractions(users);
    const userStatuses = await seedUserStatuses(users);
    
    console.log('\n🎉 Complete Database Seeding Finished Successfully!');
    console.log('\n📊 Summary:');
    console.log(`   👥 Users: ${users.length}`);
    console.log(`   🔗 Follow Requests: ${followRequests.length}`);
    console.log(`   📝 Posts: ${posts.length}`);
    console.log(`   📖 Stories: ${stories.length}`);
    console.log(`   💬 Chats: ${chats.length}`);
    console.log(`   📨 Messages: ${messages.length}`);
    console.log(`   ❤️ Dating Interactions: ${datingData.interactionsCount}`);
    console.log(`   🔗 Dating Matches: ${datingData.matchesCount}`);
    console.log(`   📱 User Statuses: ${userStatuses.length}`);
    console.log(`   🖼️  Photos Per User: 3 (using provided URLs)`);
    console.log(`   📍 Database: vibgyor (Local MongoDB)`);
    
    console.log('\n📸 Image URLs Used:');
    DATING_PHOTO_URLS.forEach((url, idx) => {
      console.log(`   ${idx + 1}. ${url}`);
    });
    
    console.log('\n🔑 Test Phone Numbers (first 5):');
    users.slice(0, 5).forEach((user, idx) => {
      console.log(`   ${idx + 1}. ${user.phoneNumber} - ${user.fullName} (@${user.username})`);
    });
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
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
  seedCompleteDatabase(options.clear);
}

module.exports = { seedCompleteDatabase };

