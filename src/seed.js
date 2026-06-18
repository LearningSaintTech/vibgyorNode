/**
 * Database Seeding Script
 * Populates the MongoDB database with 100 premium dating users, photos, and social posts.
 * 
 * Usage:
 * npm run seed:reset  (or node src/seed.js --reset)
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { connectToDatabase, disconnectFromDatabase } = require('./dbConfig/db');

// Import models
const User = require('./modules/user/user.model');
const Post = require('./modules/social/post/post.model');
const Chat = require('./modules/social/chat/chat.model');
const Message = require('./modules/social/message/message.model');
const Story = require('./modules/social/story/story.model');
const MessageRequest = require('./modules/social/messageRequest/messageRequest.model');
const FollowRequest = require('./modules/social/graph/followRequest.model');
const UserStatus = require('./modules/social/status/status.model');
const Call = require('./modules/social/call/call.model');
const UserCatalog = require('./modules/user/catalog/catalog.model');

// Import dating models
const DatingMatch = require('./modules/dating/interaction/datingMatch.model');
const DatingChat = require('./modules/dating/chat/datingChat.model');
const DatingMessage = require('./modules/dating/message/datingMessage.model');
const DatingInteraction = require('./modules/dating/interaction/datingInteraction.model');
const DatingProfileComment = require('./modules/dating/profile/datingProfileComment.model');

// Configuration
const SEED_PHONE_PREFIX = '90000000'; // Phone numbers will be +91 9000000001 to 9000000100
const USER_COUNT = 100;
const POST_COUNT = 150;
const CHAT_COUNT = 30; // Social chats
const DATING_MATCH_COUNT = 25; // Pre-created active dating matches

// Mock Data Lists
const FIRST_NAMES_MALE = [
  'Aarav', 'Akshay', 'Arjun', 'Dev', 'Ishaan', 'Pranav', 'Rahul', 'Rohan', 'Sahil', 'Siddharth',
  'Aryan', 'Chaitanya', 'Gaurav', 'Harsh', 'Jai', 'Manish', 'Raj', 'Vikram', 'Aman', 'Chirag',
  'Farhan', 'Himanshu', 'Karan', 'Mohit', 'Parth', 'Sagar', 'Uday', 'Yuvraj', 'Chetan', 'Kabir',
  'Aditya', 'Abhishek', 'Rishi', 'Samar', 'Dhruv', 'Kunal', 'Neil', 'Vivaan', 'Ranbir', 'Sameer'
];

const FIRST_NAMES_FEMALE = [
  'Aditi', 'Ananya', 'Avni', 'Diya', 'Kavya', 'Meera', 'Neha', 'Priya', 'Riya', 'Saanvi',
  'Shreya', 'Sneha', 'Tanvi', 'Vidya', 'Zara', 'Disha', 'Esha', 'Isha', 'Nisha', 'Pooja',
  'Sakshi', 'Uma', 'Deepika', 'Gauri', 'Indira', 'Lavanya', 'Nidhi', 'Radha', 'Tara', 'Varsha',
  'Zoya', 'Bina', 'Divya', 'Kiara', 'Alia', 'Kriti', 'Shraddha', 'Priyanka', 'Anushka', 'Kareena'
];

const LAST_NAMES = [
  'Sharma', 'Patel', 'Kumar', 'Singh', 'Gupta', 'Verma', 'Reddy', 'Mehta', 'Joshi', 'Shah',
  'Agarwal', 'Malhotra', 'Kapoor', 'Chopra', 'Nair', 'Iyer', 'Rao', 'Desai', 'Bansal', 'Goyal',
  'Saxena', 'Mishra', 'Tiwari', 'Yadav', 'Jain', 'Arora', 'Bhatt', 'Dubey', 'Pandey', 'Srivastava'
];

const HOBBIES = [
  'Music', 'Travel', 'Movies', 'Fitness', 'Foodie', 'Gaming', 'Reading', 'Photography', 'Art',
  'Dancing', 'Cooking', 'Yoga', 'Hiking', 'Technology', 'Fashion', 'Writing', 'Gardening'
];

const SAMPLE_POST_CAPTIONS = [
  'Living life in full bloom 🌸',
  'Chasing sunsets and good vibes 🌅',
  'Exploring the unexplored corners of the city 🏙️',
  'A cup of coffee shared with a friend is happiness tasted and time well spent ☕',
  'Focus on the journey, not the destination 🚀',
  'Creating my own sunshine on a rainy day ☀️',
  'Eat well, travel often, live simple 🍕✈️',
  'Weekend getaway done right! 🌲🎒',
  'Grateful for where I am, excited for where I am going ✨',
  'Surround yourself with people who make you feel like sunshine 💛',
  'Art is not what you see, but what you make others see 🎨',
  'Work hard, play harder 💪🎮',
  'Nature never goes out of style 🌿',
  'Good food, good mood, good company 🍔',
  'Life is better when you are laughing 😂'
];

const MOCK_COMMENTS = [
  'Love this vibe! 😍',
  'Wow, absolutely stunning capture!',
  'Where is this place? Need to visit!',
  'So true! Couldn\'t agree more 💯',
  'Amazing shot! Keep it up 🙌',
  'Great caption and beautiful colors!',
  'Looks like so much fun!',
  'Incredible photography!',
  'Keep shining! ✨',
  'So beautiful!'
];

const DATING_BIOS = [
  'Spontaneous traveler, amateur chef, and dog lover. Looking for someone to join my next adventure.',
  'Fitness enthusiast who believes in balance—meaning I hit the gym so I can eat more pizza 🍕',
  'Bookworm and coffee addict. Let\'s grab a drink and discuss our favorite authors.',
  'Aspiring photographer capturing moments that matter. Tell me your favorite movie.',
  'Living life one song at a time. Let\'s swap playlists and see if we vibe 🎧',
  'Always looking for the best street food in town. Let\'s go on a food crawl together!',
  'Yoga practitioner, nature lover, and believer in kindness. Seeking a meaningful connection.',
  'Software engineer by day, gamer by night. Looking for player 2 🎮',
  'Fashion lover who enjoys deep conversations. Tell me something that makes you laugh.',
  'Art enthusiast and museum walker. Looking for someone who appreciates the little details.'
];

const DATING_MESSAGES = [
  'Hey! I really liked your profile. How is your week going?',
  'Hi! Your travel photos look incredible. Where was the latest one taken?',
  'Hey there! I notice we both like music. What kind of genres are you into?',
  'Hello! Let\'s settle a debate: pizza with pineapple or absolutely not?',
  'Hey! Your bio made me laugh. I agree, balance is key 😂',
  'Hi! I\'d love to know what kind of books you are reading lately.',
  'Hey! Let\'s grab coffee sometime if you are free. What\'s your favorite spot?',
  'Hi there! It\'s really easy talking to you. Hope you have a great evening!'
];

// Helper to pick random item
const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Helper to pick multiple random items
const randomItems = (arr, count) => {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

// Main Seeder Function
async function seedDatabase() {
  const isReset = process.argv.includes('--reset') || true; // Force reset for clean results

  try {
    console.log('🔌 Connecting to database...');
    await connectToDatabase();

    if (isReset) {
      console.log('🗑️  Resetting database collections (except admin accounts)...');

      // Delete regular users
      const userDeleteResult = await User.deleteMany({ role: { $ne: 'admin' } });
      console.log(`   Deleted ${userDeleteResult.deletedCount} regular users`);

      // Delete posts and comments
      await Post.deleteMany({});
      console.log('   Deleted all social posts');

      // Delete chats and messages (social)
      await Chat.deleteMany({});
      await Message.deleteMany({});
      console.log('   Deleted all social chats & messages');

      // Delete dating data
      await DatingMatch.deleteMany({});
      await DatingChat.deleteMany({});
      await DatingMessage.deleteMany({});
      await DatingInteraction.deleteMany({});
      await DatingProfileComment.deleteMany({});
      console.log('   Deleted all dating matches, chats, messages, and interactions');

      // Delete other social collections
      await Story.deleteMany({});
      await FollowRequest.deleteMany({});
      await UserStatus.deleteMany({});
      await Call.deleteMany({});
      await UserCatalog.deleteMany({});
      console.log('   Deleted stories, statuses, calls, and follow requests');
    }

    // 1. Create Catalog Data
    console.log('📋 Creating User Catalog lists...');
    const catalog = new UserCatalog({
      identificationList: [
        { text: 'Man', description: '' },
        { text: 'Woman', description: '' },
        { text: 'Non-binary', description: '' }
      ],
      genderList: ['male', 'female', 'non-binary', 'prefer-not-to-say'],
      pronounList: [
        { identification: 'Man', text: 'He/Him' },
        { identification: 'Man', text: 'They/Them' },
        { identification: 'Woman', text: 'She/Her' },
        { identification: 'Woman', text: 'They/Them' },
        { identification: 'Non-binary', text: 'They/Them' },
        { identification: 'Non-binary', text: 'He/They' },
        { identification: 'Non-binary', text: 'She/They' }
      ],
      orientationList: [
        { identification: 'Man', icon: '', text: 'Straight' },
        { identification: 'Man', icon: '', text: 'Gay' },
        { identification: 'Man', icon: '', text: 'Bisexual' },
        { identification: 'Woman', icon: '', text: 'Straight' },
        { identification: 'Woman', icon: '', text: 'Lesbian' },
        { identification: 'Woman', icon: '', text: 'Bisexual' },
        { identification: 'Non-binary', icon: '', text: 'Bisexual' },
        { identification: 'Non-binary', icon: '', text: 'Queer' },
        { identification: 'Non-binary', icon: '', text: 'Straight' }
      ],
      lookingForList: [
        { text: 'Friendship', icon: '' },
        { text: 'Dating', icon: '' },
        { text: 'Long-term', icon: '' }
      ],
      likeList: HOBBIES.map(hobby => ({ text: hobby, icon: '' })),
      whatBringsYouToVibgyorList: [
        { community: 'Meet new people', icon: '' },
        { community: 'Dating', icon: '' },
        { community: 'Explore community', icon: '' }
      ],
      relationshipStyleList: [
        { text: 'Monogamous', subtext: 'One partner' },
        { text: 'Open', subtext: 'Ethical non-monogamy' }
      ],
      languageList: ['English', 'Hindi', 'Spanish', 'French'],
      version: 1
    });
    await catalog.save();
    console.log('   ✅ Catalog seeded successfully');

    // 2. Generate 100 Dating Users
    console.log(`👥 Generating ${USER_COUNT} premium dating users...`);
    const users = [];

    for (let i = 1; i <= USER_COUNT; i++) {
      // Determine gender distribution
      let gender, firstName, pronouns, portraitUrl;

      if (i <= 45) {
        gender = 'male';
        firstName = FIRST_NAMES_MALE[(i - 1) % FIRST_NAMES_MALE.length];
        pronouns = 'he/him';
        portraitUrl = `https://randomuser.me/api/portraits/men/${i}.jpg`;
      } else if (i <= 90) {
        gender = 'female';
        firstName = FIRST_NAMES_FEMALE[(i - 46) % FIRST_NAMES_FEMALE.length];
        pronouns = 'she/her';
        portraitUrl = `https://randomuser.me/api/portraits/women/${i - 45}.jpg`;
      } else {
        gender = 'non-binary';
        // Alternate names for non-binary
        firstName = (i % 2 === 0)
          ? FIRST_NAMES_FEMALE[(i - 91) % FIRST_NAMES_FEMALE.length]
          : FIRST_NAMES_MALE[(i - 91) % FIRST_NAMES_MALE.length];
        pronouns = 'they/them';
        portraitUrl = `https://randomuser.me/api/portraits/lego/${i % 10}.jpg`;
      }

      const lastName = LAST_NAMES[i % LAST_NAMES.length];
      const fullName = `${firstName} ${lastName}`;
      const username = `${firstName.toLowerCase()}_${lastName.toLowerCase()}_${i}`;

      // Sequential phone number for easy login testing
      // Format: +91 9000000001, +91 9000000010, +91 9000000100
      const suffix = String(i).padStart(3, '0');
      const phoneNumber = `+919000000${suffix}`;

      // Date of birth: ages 19 to 34
      const age = 19 + (i % 16);
      const dob = new Date();
      dob.setFullYear(dob.getFullYear() - age);
      dob.setMonth(i % 12);
      dob.setDate((i % 28) + 1);

      // Random Mumbai location coordinates with cluster offsets
      const latOffset = (Math.random() - 0.5) * 0.08;
      const lngOffset = (Math.random() - 0.5) * 0.08;
      const latitude = 19.0760 + latOffset;
      const longitude = 72.8777 + lngOffset;

      // Select 3-5 random likes
      const likesCount = 3 + (i % 3);
      const chosenLikes = randomItems(HOBBIES, likesCount).map(like => ({ text: like, icon: '' }));

      // Setup Dating Profile photos (3-4 photos)
      const datingPhotos = [];
      const photoCount = 3 + (i % 2); // 3 or 4 photos
      for (let p = 0; p < photoCount; p++) {
        datingPhotos.push({
          url: `https://picsum.photos/800/1000?random=${i}_photo_${p}`,
          thumbnailUrl: `https://picsum.photos/400/500?random=${i}_photo_${p}`,
          blurhash: 'L6PZ|Ye.d.g2_3t7o#fQ_3o#t7fQ',
          order: p,
          uploadedAt: new Date()
        });
      }

      const user = new User({
        phoneNumber: phoneNumber,
        countryCode: '+91',
        email: `${username}@vibgyor.love`,
        emailVerified: true,
        username: username,
        usernameNorm: username.toLowerCase(),
        fullName: fullName,
        dob: dob,
        bio: randomItem(DATING_BIOS),
        gender: gender,
        pronouns: pronouns,
        profilePictureUrl: portraitUrl,
        identification: [{ text: gender === 'male' ? 'Man' : gender === 'female' ? 'Woman' : 'Non-binary', icon: '' }],
        lookingFor: [{ text: 'Dating', icon: '' }],
        whatBringsYouToVibgyor: [{ text: 'Dating', icon: '' }],
        likes: chosenLikes,
        relationshipStyle: { text: 'Monogamous', subtext: 'One partner' },
        location: {
          lat: latitude,
          lng: longitude,
          city: 'Mumbai',
          country: 'India',
          address: 'Mumbai, Maharashtra, India'
        },
        role: 'user',
        isProfileCompleted: true,
        profileCompletionStep: 'completed',
        isActive: true,
        verificationStatus: i % 5 === 0 ? 'none' : 'approved', // 80% approved
        otpCode: '123456',
        otpExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year OTP validity
        dating: {
          photos: datingPhotos,
          videos: [],
          isDatingProfileActive: true,
          preferences: {
            hereTo: 'dating',
            wantToMeet: gender === 'male' ? 'women' : gender === 'female' ? 'men' : 'everyone',
            ageRange: { min: 18, max: 40 },
            languages: ['English', 'Hindi'],
            location: {
              city: 'Mumbai',
              country: 'India',
              coordinates: { lat: latitude, lng: longitude }
            },
            distanceRange: { min: 0, max: 50 }
          },
          lastUpdatedAt: new Date()
        }
      });

      await user.save();
      users.push(user);
    }

    console.log(`   ✅ Seeded ${users.length} users with complete profiles and dating photos`);

    // 3. Establish social relationships (followers / following)
    console.log('🔗 Establishing social relationships...');
    for (let u = 0; u < users.length; u++) {
      const user = users[u];
      // Select 10-25 random users to follow
      const followCount = 10 + (u % 16);
      const followees = randomItems(users, followCount).filter(f => f._id.toString() !== user._id.toString());

      user.following = followees.map(f => f._id);
      await user.save();

      // Add user to followees' followers lists
      for (const followee of followees) {
        if (!followee.followers.includes(user._id)) {
          followee.followers.push(user._id);
          await followee.save();
        }
      }
    }
    console.log('   ✅ Social followings linked');

    // 4. Create Social Posts
    console.log(`📝 Seeding ${POST_COUNT} social posts with rich media, likes, and comments...`);
    const posts = [];

    for (let p = 1; p <= POST_COUNT; p++) {
      const author = randomItem(users);
      const hasMedia = p % 5 !== 0; // 80% posts have media
      const caption = randomItem(SAMPLE_POST_CAPTIONS);
      const hashtags = ['vibgyor', 'dating', 'love', 'lifestyle', 'goodvibes'].slice(0, 1 + (p % 4));

      const mediaList = [];
      if (hasMedia) {
        mediaList.push({
          type: 'image',
          url: `https://picsum.photos/800/800?random=post_${p}`,
          thumbnail: `https://picsum.photos/400/400?random=post_${p}`,
          filename: `post_img_${p}.jpg`,
          fileSize: 102400 + (p * 500),
          mimeType: 'image/jpeg',
          s3Key: `posts/img_${p}.jpg`,
          dimensions: { width: 800, height: 800 }
        });
      }

      // Generate Likes
      const likeUsers = randomItems(users, 5 + (p % 25)); // 5-30 likes
      const likes = likeUsers.map(user => ({
        user: user._id,
        likedAt: new Date(Date.now() - (p * 2 * 60 * 60 * 1000))
      }));

      // Generate Comments
      const commentCount = p % 6; // 0 to 5 comments
      const commentUsers = randomItems(users, commentCount);
      const comments = commentUsers.map((user, idx) => ({
        user: user._id,
        content: MOCK_COMMENTS[(p + idx) % MOCK_COMMENTS.length],
        createdAt: new Date(Date.now() - (p * 2 * 60 * 60 * 1000) + (idx * 5 * 60 * 1000))
      }));

      // Generate Views
      const viewUsers = randomItems(users, 30 + (p % 50));
      const views = viewUsers.map(user => ({
        user: user._id,
        viewedAt: new Date(Date.now() - (p * 2 * 60 * 60 * 1000)),
        viewDuration: 2 + (p % 8)
      }));

      const post = new Post({
        author: author._id,
        content: caption,
        caption: caption,
        media: mediaList,
        status: 'published',
        visibility: 'public',
        likeVisibility: 'everyone',
        commentVisibility: 'everyone',
        hashtags: hashtags,
        likes: likes,
        likesCount: likes.length,
        comments: comments,
        commentsCount: comments.length,
        shares: [],
        sharesCount: p % 4,
        views: views,
        viewsCount: views.length,
        publishedAt: new Date(Date.now() - (p * 4 * 60 * 60 * 1000)), // staggered publishing dates
        engagementScore: likes.length * 2 + comments.length * 5 + views.length
      });

      await post.save();
      posts.push(post);
    }
    console.log(`   ✅ Seeded ${posts.length} social posts successfully`);

    // 5. Generate Dating Matches & Chats (prioritize user 1 for easy testing)
    console.log(`💑 Creating dating interactions, matches and chats...`);
    const testUser = users[0]; // +919000000001

    // Seed matches specifically for our test user
    const otherUsersForMatches = users.slice(1, DATING_MATCH_COUNT + 1); // matches with users 2 through 26

    for (let m = 0; m < otherUsersForMatches.length; m++) {
      const partner = otherUsersForMatches[m];

      // 1. Create mutual likes
      await DatingInteraction.create({
        user: testUser._id,
        targetUser: partner._id,
        action: 'like',
        status: 'matched',
        matchedAt: new Date()
      });

      await DatingInteraction.create({
        user: partner._id,
        targetUser: testUser._id,
        action: 'like',
        status: 'matched',
        matchedAt: new Date()
      });

      // 2. Create the DatingMatch record
      const match = await DatingMatch.createOrGetMatch(testUser._id, partner._id);

      // 3. Create the DatingChat
      const chat = await DatingChat.findOrCreateByMatch(match._id, testUser._id);

      // 4. Create 5 messages in this chat alternating
      let lastMsgId = null;
      let lastMsgDate = null;
      for (let msgIndex = 0; msgIndex < 5; msgIndex++) {
        const sender = msgIndex % 2 === 0 ? testUser : partner;
        const msgDate = new Date(Date.now() - (5 - msgIndex) * 10 * 60 * 1000);

        const message = new DatingMessage({
          chatId: chat._id,
          senderId: sender._id,
          type: 'text',
          content: DATING_MESSAGES[(m + msgIndex) % DATING_MESSAGES.length],
          status: 'read',
          readBy: [
            { userId: testUser._id, readAt: msgDate },
            { userId: partner._id, readAt: msgDate }
          ],
          createdAt: msgDate
        });

        await message.save();
        lastMsgId = message._id;
        lastMsgDate = message.createdAt;
      }

      // Update DatingChat last message
      chat.lastMessage = lastMsgId;
      chat.lastMessageAt = lastMsgDate;
      await chat.save();
    }

    console.log(`   ✅ Seeded ${DATING_MATCH_COUNT} active dating matches & chats for test user ${testUser.phoneNumber}`);

    // Create 10 more random matches between other users
    let additionalMatches = 0;
    for (let r = 0; r < 20; r++) {
      const idxA = 10 + (r % 40);
      const idxB = 50 + (r % 40);
      const uA = users[idxA];
      const uB = users[idxB];

      if (uA && uB && uA._id.toString() !== uB._id.toString()) {
        try {
          const match = await DatingMatch.createOrGetMatch(uA._id, uB._id);
          const chat = await DatingChat.findOrCreateByMatch(match._id, uA._id);

          const message = new DatingMessage({
            chatId: chat._id,
            senderId: uA._id,
            type: 'text',
            content: 'Hey there! Nice matching with you.',
            status: 'sent',
            readBy: [{ userId: uA._id, readAt: new Date() }],
            createdAt: new Date()
          });
          await message.save();

          chat.lastMessage = message._id;
          chat.lastMessageAt = message.createdAt;
          await chat.save();

          additionalMatches++;
          if (additionalMatches >= 10) break;
        } catch (err) {
          // ignore duplicate matching key errors
        }
      }
    }
    console.log(`   ✅ Seeded ${additionalMatches} additional random dating matches between other users`);

    // 6. Create User Status entries
    console.log('🟢 Creating User Status entries...');
    for (const user of users) {
      await UserStatus.create({
        userId: user._id,
        isOnline: Math.random() > 0.4, // 60% online
        lastSeen: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
        lastActivity: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000)
      });
    }
    console.log('   ✅ All user statuses seeded');

    // Seeding Complete Summary
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('🎉 DATABASE SEEDING COMPLETED SUCCESSFULLY!');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`   ✅ Users Created:        ${users.length}`);
    console.log(`   ✅ Social Posts Seeded:  ${posts.length}`);
    console.log(`   ✅ Catalog lists:        Created (v1)`);
    console.log(`   ✅ Active Dating Matches: ${DATING_MATCH_COUNT + additionalMatches}`);
    console.log(`   ✅ OTP for all accounts: 123456`);
    console.log('═══════════════════════════════════════════════════════\n');
    console.log('👉 Use phone number: +919000000001 with OTP: 123456 to test the swiper and chats immediately.\n');

  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    throw error;
  } finally {
    console.log('🔌 Disconnecting from database...');
    await disconnectFromDatabase();
  }
}

// Run the seeder if executed directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('✅ Seeding script complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding script crashed:', error);
      process.exit(1);
    });
}

module.exports = { seedDatabase };
