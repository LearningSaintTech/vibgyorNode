const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('./src/user/auth/model/userAuthModel');
const Post = require('./src/user/social/userModel/postModel');
const Chat = require('./src/user/social/userModel/chatModel');
const Message = require('./src/user/social/userModel/messageModel');
const Story = require('./src/user/social/userModel/storyModel');
const MessageRequest = require('./src/user/social/userModel/messageRequestModel');
const FollowRequest = require('./src/user/social/userModel/followRequestModel');
const UserStatus = require('./src/user/social/userModel/userStatusModel');
const Call = require('./src/user/social/userModel/callModel');
const UserCatalog = require('./src/user/auth/model/userCatalogModel');

// Import dating models
const DatingMatch = require('./src/user/dating/models/datingMatchModel');
const DatingChat = require('./src/user/dating/models/datingChatModel');
const DatingMessage = require('./src/user/dating/models/datingMessageModel');
const DatingInteraction = require('./src/user/dating/models/datingInteractionModel');
const DatingProfileComment = require('./src/user/dating/models/datingProfileCommentModel');

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
const BASE_PHONE = '9829699382';
const TOTAL_USERS = 150; // Extra users for variety (need more for chats)
const TOTAL_POSTS = 100;
const TOTAL_COMMENTS = 100;
const TOTAL_CHATS = 100;
const MESSAGES_PER_CHAT = 100;
const TOTAL_LIKES = 100;

// Dating configuration
const TOTAL_DATING_INTERACTIONS = 500; // Likes/dislikes
const TOTAL_DATING_MATCHES = 50; // Matches from mutual likes
const DATING_MESSAGES_PER_CHAT = 50; // Messages per dating chat
const TOTAL_DATING_PROFILE_COMMENTS = 100; // Comments on dating profiles

// Sample data arrays
const FIRST_NAMES = [
  'Aarav', 'Aditi', 'Akshay', 'Ananya', 'Arjun', 'Avni', 'Dev', 'Diya', 'Ishaan', 'Kavya',
  'Krishna', 'Meera', 'Neha', 'Pranav', 'Priya', 'Rahul', 'Riya', 'Rohan', 'Saanvi', 'Sahil',
  'Sanjay', 'Shreya', 'Siddharth', 'Sneha', 'Tanvi', 'Varun', 'Ved', 'Vidya', 'Yash', 'Zara',
  'Aryan', 'Bhavya', 'Chaitanya', 'Disha', 'Esha', 'Gaurav', 'Harsh', 'Isha', 'Jai', 'Kiran',
  'Lakshmi', 'Manish', 'Nisha', 'Om', 'Pooja', 'Raj', 'Sakshi', 'Tanishq', 'Uma', 'Vikram',
  'Aman', 'Bhavna', 'Chirag', 'Deepika', 'Eshan', 'Farhan', 'Gauri', 'Himanshu', 'Indira', 'Jay',
  'Karan', 'Lavanya', 'Mohit', 'Nidhi', 'Ojas', 'Parth', 'Qamar', 'Radha', 'Sagar', 'Tara',
  'Uday', 'Varsha', 'Waseem', 'Xara', 'Yuvraj', 'Zoya', 'Aadi', 'Bina', 'Chetan', 'Divya'
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
  'Life is good 😊',
  'Just another day in paradise 🌴',
  'Feeling blessed 🙌',
  'Dreams don\'t work unless you do 💼',
  'Be yourself, everyone else is taken 🎭',
  'Stay positive, work hard, make it happen 💯',
  'Good vibes only ✨',
  'Living life to the fullest 🎊',
  'Making every moment count ⏰',
  'Success is a journey, not a destination 🚶',
  'Believe in yourself 🌟'
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
  'Absolutely amazing!', 'Love this post!', 'So inspiring!', 'This is incredible work!',
  'Wow! This is great!', 'So cool!', 'Amazing shot!', 'Love the colors!', 'Perfect timing!',
  'This is beautiful!', 'Great composition!', 'Love the mood!', 'So artistic!', 'Incredible!'
];

const SAMPLE_MESSAGES = [
  'Hey! How are you?',
  'What\'s up?',
  'Long time no see!',
  'How have you been?',
  'Miss you!',
  'Let\'s catch up soon',
  'Hope you\'re doing well',
  'Thinking of you',
  'Have a great day!',
  'You\'re awesome!',
  'Thanks for everything',
  'Really appreciate it',
  'That sounds great!',
  'I agree with you',
  'Tell me more about it',
  'That\'s really interesting',
  'Thanks for sharing',
  'I see what you mean',
  'That makes sense',
  'Good point!',
  'Let me know when you\'re free',
  'Can we talk?',
  'I have a question',
  'What do you think?',
  'That\'s awesome!',
  'So happy for you!',
  'Congratulations!',
  'Well done!',
  'You did it!',
  'Proud of you!',
  'Keep going!',
  'You got this!',
  'Believe in yourself',
  'Stay strong!',
  'You\'re doing great',
  'Keep it up!',
  'That\'s amazing news!',
  'So excited for you!',
  'Can\'t wait!',
  'Looking forward to it',
  'See you soon!',
  'Take care!',
  'Stay safe!',
  'Have fun!',
  'Enjoy!',
  'Good luck!',
  'All the best!',
  'Wishing you well',
  'Hope to see you soon',
  'Let\'s plan something',
  'That would be fun!'
];

const DATING_MESSAGES = [
  'Hey! I saw your profile and thought you seem really interesting 😊',
  'Hi there! How\'s your day going?',
  'You have a great smile! 😄',
  'I love your photos! Where was that taken?',
  'Hey! What are you up to this weekend?',
  'You seem like someone I\'d love to get to know better',
  'Hi! I noticed we have some things in common',
  'Hey there! How\'s it going?',
  'Your profile caught my attention! 👋',
  'Hi! I\'d love to chat if you\'re interested',
  'Hey! What brings you here?',
  'You seem really cool! Want to chat?',
  'Hi there! I\'m new here, how about you?',
  'Hey! I saw we\'re both into [interest], that\'s awesome!',
  'Hi! How long have you been on here?',
  'You have great taste! 😊',
  'Hey! What do you like to do for fun?',
  'Hi there! I\'d love to get to know you better',
  'You seem really genuine, I like that!',
  'Hey! Want to grab coffee sometime?',
  'Hi! I\'m really enjoying our conversation',
  'You\'re really easy to talk to!',
  'Hey! What\'s your favorite thing to do on weekends?',
  'Hi there! I think we\'d get along well',
  'You seem adventurous! Tell me more',
  'Hey! I love your energy!',
  'Hi! What are you looking for here?',
  'You seem really interesting!',
  'Hey! Want to continue this conversation?',
  'Hi there! I\'m enjoying chatting with you'
];

const DATING_PROFILE_COMMENTS = [
  'You seem really interesting!',
  'Love your profile!',
  'You have great photos!',
  'We should definitely chat!',
  'You seem like my type!',
  'Really impressed by your profile!',
  'You seem genuine and fun!',
  'Would love to get to know you!',
  'Your profile is amazing!',
  'You seem really cool!',
  'I think we\'d get along great!',
  'Love your vibe!',
  'You seem adventurous!',
  'Really like what I see!',
  'You seem really down to earth!',
  'Would love to chat sometime!',
  'Your profile caught my eye!',
  'You seem really interesting!',
  'Love your style!',
  'You seem like someone I\'d click with!'
];

const DATING_INTERESTS = [
  'Travel', 'Music', 'Food', 'Movies', 'Sports', 'Reading', 'Photography',
  'Art', 'Dancing', 'Cooking', 'Fitness', 'Gaming', 'Hiking', 'Yoga',
  'Writing', 'Technology', 'Fashion', 'Animals', 'Nature', 'Adventure'
];

// Catalog data with SVG support (admin can upload SVGs later)
const CATALOG_INTERESTS = [
  { name: 'Travel' },
  { name: 'Music' },
  { name: 'Food' },
  { name: 'Movies' },
  { name: 'Sports' },
  { name: 'Reading' },
  { name: 'Photography' },
  { name: 'Art' },
  { name: 'Dancing' },
  { name: 'Cooking' },
  { name: 'Fitness' },
  { name: 'Gaming' },
  { name: 'Hiking' },
  { name: 'Yoga' },
  { name: 'Writing' },
  { name: 'Technology' },
  { name: 'Fashion' },
  { name: 'Animals' },
  { name: 'Nature' },
  { name: 'Adventure' },
  { name: 'Swimming' },
  { name: 'Music Production' },
  { name: 'Traveling' },
  { name: 'Cooking' },
  { name: 'Fitness' },
  { name: 'Art & Crafts' },
  { name: 'Shopping' },
  { name: 'Speeches' },
  { name: 'Drinking' },
  { name: 'Extreme Sports' }
];

const CATALOG_LIKES = [
  { name: 'music' },
  { name: 'travel' },
  { name: 'movies' },
  { name: 'fitness' },
  { name: 'foodie' },
  { name: 'gaming' },
  { name: 'reading' },
  { name: 'photography' },
  { name: 'art' },
  { name: 'dancing' },
  { name: 'cooking' },
  { name: 'yoga' },
  { name: 'hiking' },
  { name: 'technology' },
  { name: 'fashion' },
  { name: 'writing' },
  { name: 'gardening' },
  { name: 'business' },
  { name: 'education' },
  { name: 'health' },
  { name: 'nature' },
  { name: 'adventure' }
];

const CATALOG_GENDERS = ['male', 'female', 'non-binary', 'transgender', 'agender', 'prefer-not-to-say'];
const CATALOG_PRONOUNS = ['he/him', 'she/her', 'they/them', 'he/they', 'she/they'];
const CATALOG_HERE_FOR = ['friendship', 'dating', 'networking', 'fun', 'serious-relationship', 'new-friends', 'chat'];
const CATALOG_LANGUAGES = ['English', 'Hindi', 'Spanish', 'French', 'German', 'Chinese', 'Japanese', 'Korean', 'Arabic', 'Portuguese', 'Russian', 'Italian'];

const DATING_PREFERENCES_HERETO = ['dating', 'friendship', 'serious_relationship', 'casual', 'networking'];
const DATING_PREFERENCES_WANTTOMEET = ['men', 'women', 'everyone'];

// Generate phone number
const generatePhone = (index) => {
  // Start from base phone and increment
  const baseNum = parseInt(BASE_PHONE);
  const newNum = baseNum + index;
  return newNum.toString();
};

// Generate username
const generateUsername = (firstName, lastName, index) => {
  const base = `${firstName.toLowerCase()}${lastName.toLowerCase()}`;
  return index === 0 ? base : `${base}${index}`;
};

// Main seed function
const seedSocialData = async () => {
  try {
    console.log('🌱 Starting social data seeding...\n');

    // Clear existing data in correct order (delete dependent data first)
    console.log('🗑️  Clearing existing data...');
    console.log('   Deleting dating messages...');
    await DatingMessage.deleteMany({});
    console.log('   Deleting dating chats...');
    await DatingChat.deleteMany({});
    console.log('   Deleting dating matches...');
    await DatingMatch.deleteMany({});
    console.log('   Deleting dating interactions...');
    await DatingInteraction.deleteMany({});
    console.log('   Deleting dating profile comments...');
    await DatingProfileComment.deleteMany({});
    console.log('   Deleting messages...');
    await Message.deleteMany({});
    console.log('   Deleting calls...');
    await Call.deleteMany({});
    console.log('   Deleting chats...');
    await Chat.deleteMany({});
    console.log('   Deleting message requests...');
    await MessageRequest.deleteMany({});
    console.log('   Deleting posts...');
    await Post.deleteMany({});
    console.log('   Deleting stories...');
    await Story.deleteMany({});
    console.log('   Deleting follow requests...');
    await FollowRequest.deleteMany({});
    console.log('   Deleting user status...');
    await UserStatus.deleteMany({});
    console.log('   Deleting users...');
    await User.deleteMany({});
    console.log('   Deleting catalog...');
    await UserCatalog.deleteMany({});
    console.log('✅ All existing data cleared\n');

    // Create catalog
    console.log('📋 Creating catalog data...');
    try {
      const catalog = new UserCatalog({
        genderList: CATALOG_GENDERS,
        pronounList: CATALOG_PRONOUNS,
        likeList: CATALOG_LIKES,
        interestList: CATALOG_INTERESTS,
        hereForList: CATALOG_HERE_FOR,
        languageList: CATALOG_LANGUAGES,
        version: 1
      });
      await catalog.save();
      console.log(`   ✅ Catalog created with ${CATALOG_INTERESTS.length} interests and ${CATALOG_LIKES.length} likes`);
    } catch (error) {
      console.error('   ❌ Error creating catalog:', error);
      // Continue with seeding even if catalog fails
    }
    console.log('✅ Catalog seeding completed\n');

    // Fetch catalog to use for user interests
    let catalogData = null;
    try {
      catalogData = await UserCatalog.findOne({});
      if (catalogData) {
        console.log(`   📋 Using catalog with ${catalogData.interestList?.length || 0} interests and ${catalogData.likeList?.length || 0} likes`);
      }
    } catch (error) {
      console.error('   ⚠️  Could not fetch catalog, using fallback arrays');
    }

    // Helper function to get interest names from catalog or fallback
    const getInterestsFromCatalog = () => {
      if (catalogData && catalogData.interestList && catalogData.interestList.length > 0) {
        return catalogData.interestList.map(item => typeof item === 'object' && item?.name ? item.name : item);
      }
      return DATING_INTERESTS;
    };

    // Create users
    console.log(`👥 Creating ${TOTAL_USERS} users...`);
    const users = [];
    for (let i = 0; i < TOTAL_USERS; i++) {
      const firstName = FIRST_NAMES[i % FIRST_NAMES.length];
      const lastName = LAST_NAMES[i % LAST_NAMES.length];
      const phone = generatePhone(i);
      const username = generateUsername(firstName, lastName, i);
      
      // Calculate age for dating profile (18-35 years old)
      const age = Math.floor(Math.random() * 18) + 18;
      const birthYear = new Date().getFullYear() - age;
      const birthMonth = Math.floor(Math.random() * 12);
      const birthDay = Math.floor(Math.random() * 28) + 1;
      const dob = new Date(birthYear, birthMonth, birthDay);
      
      // Generate gender (alternating for variety)
      const genders = ['male', 'female', 'non-binary', 'prefer not to say'];
      const gender = genders[i % genders.length];
      const pronouns = gender === 'male' ? 'he/him' : gender === 'female' ? 'she/her' : 'they/them';
      
      // Generate interests (3-5 random interests) from catalog
      const availableInterests = getInterestsFromCatalog();
      const userInterests = [];
      const numInterests = Math.floor(Math.random() * 3) + 3;
      const shuffledInterests = [...availableInterests].sort(() => 0.5 - Math.random());
      for (let j = 0; j < numInterests && j < shuffledInterests.length; j++) {
        userInterests.push(shuffledInterests[j]);
      }
      
      // Generate dating photos (2-5 photos)
      const datingPhotos = [];
      const numPhotos = Math.floor(Math.random() * 4) + 2;
      for (let j = 0; j < numPhotos; j++) {
        const photoId = i * 10 + j;
        datingPhotos.push({
          url: `https://picsum.photos/800/1000?random=${photoId}`,
          thumbnailUrl: `https://picsum.photos/400/500?random=${photoId}`,
          order: j,
          uploadedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
        });
      }
      
      // Generate dating videos (0-2 videos, 30% chance)
      const datingVideos = [];
      if (Math.random() > 0.7) {
        const numVideos = Math.floor(Math.random() * 2) + 1;
        for (let j = 0; j < numVideos; j++) {
          const videoId = i * 10 + j + 1000;
          datingVideos.push({
            url: `https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4`,
            thumbnailUrl: `https://picsum.photos/400/500?random=${videoId}`,
            duration: Math.floor(Math.random() * 60) + 10,
            order: j,
            uploadedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
          });
        }
      }
      
      const user = new User({
        phoneNumber: phone,
        countryCode: '+91',
        username: username,
        usernameNorm: username.toLowerCase(),
        fullName: `${firstName} ${lastName}`,
        email: `${username}@example.com`,
        dob: dob,
        gender: gender,
        pronouns: pronouns,
        bio: `Hi! I'm ${firstName}. ${userInterests.slice(0, 2).map(interest => `Love ${interest.toLowerCase()}`).join(' and ')}. Looking forward to meeting new people!`,
        likes: userInterests,
        interests: userInterests,
        preferences: {
          hereFor: DATING_PREFERENCES_HERETO[Math.floor(Math.random() * DATING_PREFERENCES_HERETO.length)],
          wantToMeet: DATING_PREFERENCES_WANTTOMEET[Math.floor(Math.random() * DATING_PREFERENCES_WANTTOMEET.length)],
          primaryLanguage: 'English',
          secondaryLanguage: Math.random() > 0.5 ? 'Hindi' : ''
        },
        location: {
          lat: 19.0760 + (Math.random() - 0.5) * 0.1, // Mumbai area
          lng: 72.8777 + (Math.random() - 0.5) * 0.1,
          city: 'Mumbai',
          country: 'India'
        },
        isActive: true,
        verificationStatus: i < 10 ? 'approved' : 'none', // First 10 users verified
        profilePictureUrl: `https://i.pravatar.cc/150?img=${i + 1}`,
        followers: [],
        following: [],
        isProfileCompleted: true,
        profileCompletionStep: 'completed',
        dating: {
          photos: datingPhotos,
          videos: datingVideos,
          isDatingProfileActive: Math.random() > 0.2, // 80% have active dating profiles
          preferences: {
            hereTo: DATING_PREFERENCES_HERETO[Math.floor(Math.random() * DATING_PREFERENCES_HERETO.length)],
            wantToMeet: DATING_PREFERENCES_WANTTOMEET[Math.floor(Math.random() * DATING_PREFERENCES_WANTTOMEET.length)],
            ageRange: {
              min: 18,
              max: 40
            },
            languages: ['English', Math.random() > 0.5 ? 'Hindi' : ''],
            location: {
              city: 'Mumbai',
              country: 'India',
              coordinates: {
                lat: 19.0760 + (Math.random() - 0.5) * 0.1,
                lng: 72.8777 + (Math.random() - 0.5) * 0.1
              }
            },
            distanceRange: {
              min: 0,
              max: 50
            }
          },
          lastUpdatedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) // Updated in last 7 days
        }
      });
      
      await user.save();
      users.push(user);
      
      if ((i + 1) % 10 === 0) {
        console.log(`   Created ${i + 1}/${TOTAL_USERS} users`);
      }
    }
    console.log(`✅ Created ${users.length} users\n`);

    // Create follow relationships
    console.log('🔗 Creating follow relationships...');
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      const followingCount = Math.floor(Math.random() * 20) + 5; // 5-25 follows
      const following = [];
      
      for (let j = 0; j < followingCount; j++) {
        const randomUser = users[Math.floor(Math.random() * users.length)];
        if (randomUser._id.toString() !== user._id.toString() && 
            !following.includes(randomUser._id)) {
          following.push(randomUser._id);
        }
      }
      
      user.following = following;
      await user.save();
      
      // Update followers for followed users
      for (const followedId of following) {
        const followedUser = users.find(u => u._id.toString() === followedId.toString());
        if (followedUser && !followedUser.followers.includes(user._id)) {
          followedUser.followers.push(user._id);
          await followedUser.save();
        }
      }
    }
    console.log('✅ Follow relationships created\n');

    // Create posts
    console.log(`📝 Creating ${TOTAL_POSTS} posts...`);
    const posts = [];
    for (let i = 0; i < TOTAL_POSTS; i++) {
      const author = users[Math.floor(Math.random() * users.length)];
      const content = SAMPLE_POST_CONTENT[i % SAMPLE_POST_CONTENT.length];
      
      // Add media to posts (mix of images and videos)
      const media = [];
      const hasMedia = Math.random() > 0.2; // 80% of posts have media
      
      if (hasMedia) {
        const mediaCount = Math.floor(Math.random() * 3) + 1; // 1-3 media items
        const isVideo = Math.random() > 0.7; // 30% chance of video
        
        for (let j = 0; j < mediaCount; j++) {
          if (isVideo && j === 0) {
            // Video
            const videoId = Math.floor(Math.random() * 1000);
            media.push({
              type: 'video',
              url: `https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4`,
              thumbnail: `https://picsum.photos/800/600?random=${videoId}`,
              filename: `video_${i}_${j}.mp4`,
              fileSize: Math.floor(Math.random() * 5000000) + 1000000, // 1-6 MB
              mimeType: 'video/mp4',
              duration: Math.floor(Math.random() * 60) + 10, // 10-70 seconds
              dimensions: {
                width: 1920,
                height: 1080
              },
              s3Key: `posts/${author._id}/videos/video_${i}_${j}_${Date.now()}.mp4`
            });
          } else {
            // Image
            const imageId = i * 10 + j;
            const width = 800;
            const height = 600;
            media.push({
              type: 'image',
              url: `https://picsum.photos/${width}/${height}?random=${imageId}`,
              thumbnail: `https://picsum.photos/400/300?random=${imageId}`,
              filename: `image_${i}_${j}.jpg`,
              fileSize: Math.floor(Math.random() * 2000000) + 500000, // 500KB-2.5MB
              mimeType: 'image/jpeg',
              dimensions: {
                width: width,
                height: height
              },
              s3Key: `posts/${author._id}/images/image_${i}_${j}_${Date.now()}.jpg`
            });
          }
        }
      }
      
      const post = new Post({
        author: author._id,
        content: content,
        caption: content,
        status: 'published',
        visibility: 'public',
        commentVisibility: 'everyone',
        media: media,
        likes: [],
        comments: [],
        shares: [],
        views: [],
        likesCount: 0,
        commentsCount: 0,
        sharesCount: 0,
        viewsCount: 0,
        hashtags: ['social', 'life', 'vibgyor'],
        publishedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) // Random date in last 30 days
      });
      
      await post.save();
      posts.push(post);
      
      if ((i + 1) % 10 === 0) {
        console.log(`   Created ${i + 1}/${TOTAL_POSTS} posts`);
      }
    }
    console.log(`✅ Created ${posts.length} posts\n`);

    // Create likes on posts
    console.log(`❤️  Creating ${TOTAL_LIKES} likes on posts...`);
    let likesCreated = 0;
    for (let i = 0; i < TOTAL_LIKES; i++) {
      const post = posts[Math.floor(Math.random() * posts.length)];
      const user = users[Math.floor(Math.random() * users.length)];
      
      // Check if user already liked this post
      const alreadyLiked = post.likes.some(like => 
        like.user.toString() === user._id.toString()
      );
      
      if (!alreadyLiked) {
        await post.addLike(user._id);
        likesCreated++;
      }
    }
    console.log(`✅ Created ${likesCreated} likes\n`);

    // Create comments on posts
    console.log(`💬 Creating ${TOTAL_COMMENTS} comments on posts...`);
    for (let i = 0; i < TOTAL_COMMENTS; i++) {
      const post = posts[Math.floor(Math.random() * posts.length)];
      const user = users[Math.floor(Math.random() * users.length)];
      const commentText = SAMPLE_COMMENTS[i % SAMPLE_COMMENTS.length];
      
      await post.addComment(user._id, commentText);
      
      if ((i + 1) % 10 === 0) {
        console.log(`   Created ${i + 1}/${TOTAL_COMMENTS} comments`);
      }
    }
    console.log(`✅ Created ${TOTAL_COMMENTS} comments\n`);

    // Find test user (phone: 9829699382)
    const testUser = users.find(u => u.phoneNumber === '9829699382');
    console.log(`🔍 Test user found:`, { 
      found: !!testUser, 
      userId: testUser?._id,
      username: testUser?.username 
    });
    
    // Create chats
    console.log(`💬 Creating ${TOTAL_CHATS} chats...`);
    const chats = [];
    const chatPairs = new Set(); // Track chat pairs to avoid duplicates
    
    // Ensure test user has 100 chats (one with each of the other users)
    let testUserChatsCreated = 0;
    const TARGET_TEST_USER_CHATS = 100;
    
    // First, create 100 chats for test user (one with each other user)
    if (testUser) {
      console.log(`   Creating ${TARGET_TEST_USER_CHATS} chats for test user (${testUser.username})...`);
      
      // Get all other users (excluding test user)
      const otherUsers = users.filter(u => u._id.toString() !== testUser._id.toString());
      console.log(`   Found ${otherUsers.length} other users to create chats with`);
      
      // Create chats with first 100 other users (or all if less than 100)
      const usersToChatWith = otherUsers.slice(0, Math.min(TARGET_TEST_USER_CHATS, otherUsers.length));
      
      for (const otherUser of usersToChatWith) {
        // Create unique pair key
        const pairKey = [testUser._id.toString(), otherUser._id.toString()].sort().join('-');
        
        // Skip if pair already exists
        if (chatPairs.has(pairKey)) {
          continue;
        }
        
        // Check if chat already exists in DB
        const existingChat = await Chat.findOne({
          participants: { $all: [testUser._id, otherUser._id] },
          chatType: 'direct',
          isActive: true
        });
        
        if (!existingChat) {
          const chat = new Chat({
            participants: [testUser._id, otherUser._id],
            chatType: 'direct',
            isActive: true,
            userSettings: [
              {
                userId: testUser._id,
                unreadCount: 0,
                lastReadAt: new Date()
              },
              {
                userId: otherUser._id,
                unreadCount: 0,
                lastReadAt: new Date()
              }
            ]
          });
          
          await chat.save();
          chats.push(chat);
          chatPairs.add(pairKey);
          testUserChatsCreated++;
          
          if (testUserChatsCreated % 10 === 0) {
            console.log(`   Created ${testUserChatsCreated}/${usersToChatWith.length} chats with test user`);
          }
        } else {
          chats.push(existingChat);
          chatPairs.add(pairKey);
          testUserChatsCreated++;
        }
      }
      console.log(`   ✅ Created ${testUserChatsCreated} chats for test user\n`);
    }
    
    // Then create remaining chats with random users (if we haven't reached TOTAL_CHATS)
    if (chats.length < TOTAL_CHATS) {
      console.log(`   Creating ${TOTAL_CHATS - chats.length} additional random chats...`);
      let attempts = 0;
      while (chats.length < TOTAL_CHATS && attempts < TOTAL_CHATS * 10) {
        attempts++;
        
        // Get two random users
        const user1 = users[Math.floor(Math.random() * users.length)];
        let user2 = users[Math.floor(Math.random() * users.length)];
        
        // Ensure different users
        while (user2._id.toString() === user1._id.toString()) {
          user2 = users[Math.floor(Math.random() * users.length)];
        }
        
        // Create unique pair key
        const pairKey = [user1._id.toString(), user2._id.toString()].sort().join('-');
        
        // Skip if pair already exists
        if (chatPairs.has(pairKey)) {
          continue;
        }
        
        // Check if chat already exists in DB
        const existingChat = await Chat.findOne({
          participants: { $all: [user1._id, user2._id] },
          chatType: 'direct',
          isActive: true
        });
        
        if (!existingChat) {
          const chat = new Chat({
            participants: [user1._id, user2._id],
            chatType: 'direct',
            isActive: true,
            userSettings: [
              {
                userId: user1._id,
                unreadCount: 0,
                lastReadAt: new Date()
              },
              {
                userId: user2._id,
                unreadCount: 0,
                lastReadAt: new Date()
              }
            ]
          });
          
          await chat.save();
          chats.push(chat);
          chatPairs.add(pairKey);
          
          if (chats.length % 10 === 0) {
            console.log(`   Created ${chats.length}/${TOTAL_CHATS} total chats`);
          }
        } else {
          chats.push(existingChat);
          chatPairs.add(pairKey);
        }
      }
    }
    console.log(`✅ Created ${chats.length} total chats (${testUserChatsCreated} for test user)\n`);

    // Create messages in chats (prioritize test user's chats)
    console.log(`📨 Creating ${MESSAGES_PER_CHAT} messages per chat...`);
    let totalMessages = 0;
    
    // Sort chats: test user's chats first
    const sortedChats = [...chats].sort((a, b) => {
      const aHasTestUser = testUser && a.participants.some(p => 
        (p._id || p).toString() === testUser._id.toString()
      );
      const bHasTestUser = testUser && b.participants.some(p => 
        (p._id || p).toString() === testUser._id.toString()
      );
      if (aHasTestUser && !bHasTestUser) return -1;
      if (!aHasTestUser && bHasTestUser) return 1;
      return 0;
    });
    
    for (const chat of sortedChats) {
      const participants = chat.participants;
      
      for (let i = 0; i < MESSAGES_PER_CHAT; i++) {
        // Alternate between participants
        const sender = participants[i % 2];
        const messageText = SAMPLE_MESSAGES[i % SAMPLE_MESSAGES.length];
        
        // Mix of text and media messages (80% text, 20% media)
        const isMediaMessage = Math.random() > 0.8;
        let messageType = 'text';
        let messageContent = messageText;
        let messageMedia = {};
        
        if (isMediaMessage) {
          const mediaType = Math.random() > 0.5 ? 'image' : 'image'; // Mostly images for now
          const mediaId = totalMessages;
          
          if (mediaType === 'image') {
            messageType = 'image';
            messageContent = '📷 Photo';
            messageMedia = {
              url: `https://picsum.photos/800/600?random=${mediaId}`,
              mimeType: 'image/jpeg',
              fileName: `photo_${mediaId}.jpg`,
              fileSize: Math.floor(Math.random() * 2000000) + 500000,
              dimensions: {
                width: 800,
                height: 600
              }
            };
          } else if (mediaType === 'video') {
            messageType = 'video';
            messageContent = '🎥 Video';
            messageMedia = {
              url: `https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4`,
              mimeType: 'video/mp4',
              fileName: `video_${mediaId}.mp4`,
              fileSize: Math.floor(Math.random() * 5000000) + 1000000,
              duration: Math.floor(Math.random() * 60) + 10,
              thumbnail: `https://picsum.photos/400/300?random=${mediaId}`,
              dimensions: {
                width: 1920,
                height: 1080
              }
            };
          }
        }
        
        const messageData = {
          chatId: chat._id,
          senderId: sender,
          type: messageType,
          content: messageType === 'text' ? messageContent : (messageContent || ''),
          status: 'sent',
          readBy: [],
          reactions: [],
          isDeleted: false,
          deletedBy: [],
          createdAt: new Date(Date.now() - (MESSAGES_PER_CHAT - i) * 60000) // Stagger messages
        };
        
        // Add media only for media messages
        if (isMediaMessage && Object.keys(messageMedia).length > 0) {
          messageData.media = messageMedia;
        }
        
        const message = new Message(messageData);
        
        await message.save();
        totalMessages++;
        
        // Update chat's last message
        chat.lastMessage = message._id;
        chat.lastMessageAt = message.createdAt;
        
        // Increment unread count for the other participant
        const otherParticipant = participants.find(p => p.toString() !== sender.toString());
        const otherUserSettings = chat.userSettings.find(us => 
          us.userId.toString() === otherParticipant.toString()
        );
        if (otherUserSettings) {
          otherUserSettings.unreadCount = (otherUserSettings.unreadCount || 0) + 1;
        }
        
        // Mark as read for sender
        message.readBy.push({
          userId: sender,
          readAt: new Date()
        });
        await message.save();
      }
      
      await chat.save();
      
      if (totalMessages % 1000 === 0) {
        console.log(`   Created ${totalMessages} messages`);
      }
    }
    console.log(`✅ Created ${totalMessages} messages across ${chats.length} chats\n`);

    // Add 200 messages between specific users (9829699382 and 9829699482)
    console.log('📨 Adding 200 messages between specific users (9829699382 and 9829699482)...');
    const user1 = users.find(u => u.phoneNumber === '9829699382');
    const user2 = users.find(u => u.phoneNumber === '9829699482');
    
    if (user1 && user2) {
      console.log(`   Found users: ${user1.username} (${user1.phoneNumber}) and ${user2.username} (${user2.phoneNumber})`);
      
      // Find or create chat between these two users
      let specificChat = await Chat.findOne({
        participants: { $all: [user1._id, user2._id] },
        chatType: 'direct',
        isActive: true
      });
      
      if (!specificChat) {
        console.log('   Creating new chat between these users...');
        specificChat = new Chat({
          participants: [user1._id, user2._id],
          chatType: 'direct',
          isActive: true,
          userSettings: [
            {
              userId: user1._id,
              unreadCount: 0,
              lastReadAt: new Date()
            },
            {
              userId: user2._id,
              unreadCount: 0,
              lastReadAt: new Date()
            }
          ]
        });
        await specificChat.save();
        chats.push(specificChat);
        console.log('   ✅ Chat created');
      } else {
        console.log('   ✅ Existing chat found');
      }
      
      // Add 200 messages to this chat
      const SPECIFIC_MESSAGES_COUNT = 200;
      let specificMessagesAdded = 0;
      
      for (let i = 0; i < SPECIFIC_MESSAGES_COUNT; i++) {
        // Alternate between the two users
        const sender = i % 2 === 0 ? user1._id : user2._id;
        const messageText = SAMPLE_MESSAGES[i % SAMPLE_MESSAGES.length];
        
        // Mix of text and media messages (80% text, 20% media)
        const isMediaMessage = Math.random() > 0.8;
        let messageType = 'text';
        let messageContent = messageText;
        let messageMedia = {};
        
        if (isMediaMessage) {
          const mediaType = Math.random() > 0.5 ? 'image' : 'image'; // Mostly images for now
          const mediaId = totalMessages + i;
          
          if (mediaType === 'image') {
            messageType = 'image';
            messageContent = '📷 Photo';
            messageMedia = {
              url: `https://picsum.photos/800/600?random=${mediaId}`,
              mimeType: 'image/jpeg',
              fileName: `photo_${mediaId}.jpg`,
              fileSize: Math.floor(Math.random() * 2000000) + 500000,
              dimensions: {
                width: 800,
                height: 600
              }
            };
          } else if (mediaType === 'video') {
            messageType = 'video';
            messageContent = '🎥 Video';
            messageMedia = {
              url: `https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4`,
              mimeType: 'video/mp4',
              fileName: `video_${mediaId}.mp4`,
              fileSize: Math.floor(Math.random() * 5000000) + 1000000,
              duration: Math.floor(Math.random() * 60) + 10,
              thumbnail: `https://picsum.photos/400/300?random=${mediaId}`,
              dimensions: {
                width: 1920,
                height: 1080
              }
            };
          }
        }
        
        const messageData = {
          chatId: specificChat._id,
          senderId: sender,
          type: messageType,
          content: messageType === 'text' ? messageContent : (messageContent || ''),
          status: 'sent',
          readBy: [],
          reactions: [],
          isDeleted: false,
          deletedBy: [],
          createdAt: new Date(Date.now() - (SPECIFIC_MESSAGES_COUNT - i) * 60000) // Stagger messages
        };
        
        // Add media only for media messages
        if (isMediaMessage && Object.keys(messageMedia).length > 0) {
          messageData.media = messageMedia;
        }
        
        const message = new Message(messageData);
        await message.save();
        specificMessagesAdded++;
        totalMessages++;
        
        // Update chat's last message
        specificChat.lastMessage = message._id;
        specificChat.lastMessageAt = message.createdAt;
        
        // Increment unread count for the other participant
        const otherParticipant = sender.toString() === user1._id.toString() ? user2._id : user1._id;
        const otherUserSettings = specificChat.userSettings.find(us => 
          us.userId.toString() === otherParticipant.toString()
        );
        if (otherUserSettings) {
          otherUserSettings.unreadCount = (otherUserSettings.unreadCount || 0) + 1;
        }
        
        // Mark as read for sender
        message.readBy.push({
          userId: sender,
          readAt: new Date()
        });
        await message.save();
        
        if ((i + 1) % 50 === 0) {
          console.log(`   Created ${i + 1}/${SPECIFIC_MESSAGES_COUNT} messages`);
        }
      }
      
      await specificChat.save();
      console.log(`✅ Added ${specificMessagesAdded} messages between ${user1.username} and ${user2.username}\n`);
    } else {
      console.log('⚠️  Could not find both users. User1 found:', !!user1, 'User2 found:', !!user2);
      if (!user1) console.log('   User with phone 9829699382 not found');
      if (!user2) console.log('   User with phone 9829699482 not found');
    }

    // ========== DATING DATA SEEDING ==========
    console.log('\n💕 Starting dating data seeding...\n');

    // Create dating interactions (likes/dislikes)
    console.log(`💖 Creating ${TOTAL_DATING_INTERACTIONS} dating interactions...`);
    
    // Filter users with active dating profiles first
    const usersWithDatingProfiles = users.filter(u => u.dating?.isDatingProfileActive);
    console.log(`   Found ${usersWithDatingProfiles.length} users with active dating profiles`);
    
    let datingInteractions = [];
    
    if (usersWithDatingProfiles.length < 2) {
      console.log('⚠️  Not enough users with active dating profiles. Skipping dating interactions.');
    } else {
      const interactions = [];
      const interactionPairs = new Set();
      let attempts = 0;
      const MAX_ATTEMPTS = TOTAL_DATING_INTERACTIONS * 10;
      
      for (let i = 0; i < TOTAL_DATING_INTERACTIONS && attempts < MAX_ATTEMPTS; i++) {
        attempts++;
        
        // Select users from those with active dating profiles
        const user = usersWithDatingProfiles[Math.floor(Math.random() * usersWithDatingProfiles.length)];
        let targetUser = usersWithDatingProfiles[Math.floor(Math.random() * usersWithDatingProfiles.length)];
        
        // Ensure different users
        let retryCount = 0;
        while (targetUser._id.toString() === user._id.toString() && retryCount < 100) {
          targetUser = usersWithDatingProfiles[Math.floor(Math.random() * usersWithDatingProfiles.length)];
          retryCount++;
        }
        
        // Skip if same user after retries
        if (targetUser._id.toString() === user._id.toString()) {
          i--; // Don't count this iteration
          continue;
        }
        
        // Create unique pair key
        const pairKey = [user._id.toString(), targetUser._id.toString()].sort().join('-');
        
        // Skip if pair already exists
        if (interactionPairs.has(pairKey)) {
          i--; // Don't count this iteration
          continue;
        }
        
        // 80% likes, 20% dislikes
        const action = Math.random() > 0.2 ? 'like' : 'dislike';
        const status = action === 'like' ? 'pending' : 'dismissed';
        
        // 10% of likes have comments
        const hasComment = action === 'like' && Math.random() > 0.9;
        const comment = hasComment ? {
          text: DATING_PROFILE_COMMENTS[Math.floor(Math.random() * DATING_PROFILE_COMMENTS.length)],
          createdAt: new Date()
        } : {
          text: '',
          createdAt: null
        };
        
        try {
          const interaction = new DatingInteraction({
            user: user._id,
            targetUser: targetUser._id,
            action: action,
            comment: comment,
            status: status
          });
          
          await interaction.save();
          interactions.push(interaction);
          interactionPairs.add(pairKey);
          
          if ((interactions.length) % 50 === 0) {
            console.log(`   Created ${interactions.length}/${TOTAL_DATING_INTERACTIONS} interactions`);
          }
        } catch (error) {
          // Skip if there's an error (e.g., duplicate key)
          i--; // Don't count this iteration
          continue;
        }
      }
      
      console.log(`✅ Created ${interactions.length} dating interactions\n`);
      
      // Store interactions for later use in match creation
      datingInteractions = interactions;
    }

    // Find test user (phone: 9829699382) for dating
    const testUserForDating = users.find(u => u.phoneNumber === '9829699382');
    console.log(`🔍 Test user for dating found:`, { 
      found: !!testUserForDating, 
      userId: testUserForDating?._id,
      username: testUserForDating?.username,
      hasDatingProfile: testUserForDating?.dating?.isDatingProfileActive
    });

    // Create matches from mutual likes
    console.log(`💑 Creating dating matches from mutual likes...`);
    const matches = [];
    const matchPairs = new Set();
    let matchesCreated = 0;
    let testUserMatchesCreated = 0;
    const TARGET_TEST_USER_MATCHES = 20; // Ensure test user has 20 matches
    
    // First, create matches for test user if they have an active dating profile
    if (testUserForDating && testUserForDating.dating?.isDatingProfileActive) {
      console.log(`   Creating ${TARGET_TEST_USER_MATCHES} matches for test user (${testUserForDating.username})...`);
      
      // Get other users with active dating profiles (excluding test user)
      const otherDatingUsers = usersWithDatingProfiles.filter(u => 
        u._id.toString() !== testUserForDating._id.toString()
      );
      
      // Create matches with first 20 other users (or all if less than 20)
      const usersToMatchWith = otherDatingUsers.slice(0, Math.min(TARGET_TEST_USER_MATCHES, otherDatingUsers.length));
      
      for (const otherUser of usersToMatchWith) {
        const pairKey = [testUserForDating._id.toString(), otherUser._id.toString()].sort().join('-');
        
        if (matchPairs.has(pairKey)) continue;
        
        try {
          const match = await DatingMatch.createOrGetMatch(testUserForDating._id, otherUser._id);
          matches.push(match);
          matchPairs.add(pairKey);
          matchesCreated++;
          testUserMatchesCreated++;
          
          // Create interactions for this match
          await DatingInteraction.findOneAndUpdate(
            { user: testUserForDating._id, targetUser: otherUser._id },
            {
              user: testUserForDating._id,
              targetUser: otherUser._id,
              action: 'like',
              status: 'matched',
              matchedAt: new Date()
            },
            { upsert: true, new: true }
          );
          
          await DatingInteraction.findOneAndUpdate(
            { user: otherUser._id, targetUser: testUserForDating._id },
            {
              user: otherUser._id,
              targetUser: testUserForDating._id,
              action: 'like',
              status: 'matched',
              matchedAt: new Date()
            },
            { upsert: true, new: true }
          );
          
          if (testUserMatchesCreated % 5 === 0) {
            console.log(`   Created ${testUserMatchesCreated}/${usersToMatchWith.length} matches for test user`);
          }
        } catch (error) {
          continue;
        }
      }
      console.log(`   ✅ Created ${testUserMatchesCreated} matches for test user\n`);
    }
    
    // Find mutual likes from interactions
    const likesByUser = {};
    if (datingInteractions && datingInteractions.length > 0) {
      for (const interaction of datingInteractions) {
        if (interaction.action === 'like' && interaction.status === 'pending') {
          const userId = interaction.user.toString();
          const targetUserId = interaction.targetUser.toString();
          
          if (!likesByUser[userId]) {
            likesByUser[userId] = [];
          }
          likesByUser[userId].push(targetUserId);
        }
      }
      
      // Check for mutual likes
      for (const userId in likesByUser) {
        for (const targetUserId of likesByUser[userId]) {
          if (likesByUser[targetUserId] && likesByUser[targetUserId].includes(userId)) {
            // Mutual like found - create match
            const pairKey = [userId, targetUserId].sort().join('-');
            
            if (!matchPairs.has(pairKey) && matchesCreated < TOTAL_DATING_MATCHES) {
              try {
                // Convert string IDs back to ObjectIds
                const user1Id = new mongoose.Types.ObjectId(userId);
                const user2Id = new mongoose.Types.ObjectId(targetUserId);
                const match = await DatingMatch.createOrGetMatch(user1Id, user2Id);
                matches.push(match);
                matchPairs.add(pairKey);
                matchesCreated++;
                
                // Update both interactions to matched status
                await DatingInteraction.updateMany(
                  {
                    $or: [
                      { user: user1Id, targetUser: user2Id },
                      { user: user2Id, targetUser: user1Id }
                    ],
                    action: 'like'
                  },
                  {
                    $set: {
                      status: 'matched',
                      matchedAt: new Date()
                    }
                  }
                );
              } catch (error) {
                // Match might already exist, skip
                continue;
              }
            }
          }
        }
        
        if (matchesCreated >= TOTAL_DATING_MATCHES) break;
      }
    }
    
    // If we don't have enough matches, create some manually
    if (matchesCreated < TOTAL_DATING_MATCHES && usersWithDatingProfiles.length >= 2) {
      console.log(`   Creating additional matches to reach ${TOTAL_DATING_MATCHES}...`);
      let attempts = 0;
      while (matchesCreated < TOTAL_DATING_MATCHES && attempts < TOTAL_DATING_MATCHES * 10) {
        attempts++;
        
        const user1 = usersWithDatingProfiles[Math.floor(Math.random() * usersWithDatingProfiles.length)];
        let user2 = usersWithDatingProfiles[Math.floor(Math.random() * usersWithDatingProfiles.length)];
        
        let retryCount = 0;
        while (user2._id.toString() === user1._id.toString() && retryCount < 100) {
          user2 = usersWithDatingProfiles[Math.floor(Math.random() * usersWithDatingProfiles.length)];
          retryCount++;
        }
        
        if (user2._id.toString() === user1._id.toString()) {
          continue;
        }
        
        const pairKey = [user1._id.toString(), user2._id.toString()].sort().join('-');
        
        if (matchPairs.has(pairKey)) continue;
        
        try {
          const match = await DatingMatch.createOrGetMatch(user1._id, user2._id);
          matches.push(match);
          matchPairs.add(pairKey);
          matchesCreated++;
          
          // Create interactions for this match
          await DatingInteraction.findOneAndUpdate(
            { user: user1._id, targetUser: user2._id },
            {
              user: user1._id,
              targetUser: user2._id,
              action: 'like',
              status: 'matched',
              matchedAt: new Date()
            },
            { upsert: true, new: true }
          );
          
          await DatingInteraction.findOneAndUpdate(
            { user: user2._id, targetUser: user1._id },
            {
              user: user2._id,
              targetUser: user1._id,
              action: 'like',
              status: 'matched',
              matchedAt: new Date()
            },
            { upsert: true, new: true }
          );
        } catch (error) {
          continue;
        }
      }
    }
    
    console.log(`✅ Created ${matches.length} dating matches (${testUserMatchesCreated} for test user)\n`);

    // Create dating chats for matches
    console.log(`💬 Creating dating chats for matches...`);
    const datingChats = [];
    
    for (const match of matches) {
      try {
        const chat = await DatingChat.findOrCreateByMatch(match._id, match.userA);
        datingChats.push(chat);
      } catch (error) {
        // Chat might already exist or match is invalid, skip
        continue;
      }
    }
    console.log(`✅ Created ${datingChats.length} dating chats\n`);

    // Create dating messages in chats
    console.log(`📨 Creating ${DATING_MESSAGES_PER_CHAT} messages per dating chat...`);
    let totalDatingMessages = 0;
    
    for (const chat of datingChats) {
      const participants = chat.participants;
      
      for (let i = 0; i < DATING_MESSAGES_PER_CHAT; i++) {
        // Alternate between participants
        const sender = participants[i % 2];
        const messageText = DATING_MESSAGES[i % DATING_MESSAGES.length];
        
        // Mix of text and media messages (85% text, 15% media)
        const isMediaMessage = Math.random() > 0.85;
        let messageType = 'text';
        let messageContent = messageText;
        let messageMedia = {};
        
        if (isMediaMessage) {
          const mediaType = Math.random() > 0.5 ? 'image' : 'image'; // Mostly images
          const mediaId = totalDatingMessages;
          
          if (mediaType === 'image') {
            messageType = 'image';
            messageContent = '📷 Photo';
            messageMedia = {
              url: `https://picsum.photos/800/600?random=${mediaId}`,
              mimeType: 'image/jpeg',
              fileName: `photo_${mediaId}.jpg`,
              fileSize: Math.floor(Math.random() * 2000000) + 500000,
              dimensions: {
                width: 800,
                height: 600
              }
            };
          } else if (mediaType === 'video') {
            messageType = 'video';
            messageContent = '🎥 Video';
            messageMedia = {
              url: `https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4`,
              mimeType: 'video/mp4',
              fileName: `video_${mediaId}.mp4`,
              fileSize: Math.floor(Math.random() * 5000000) + 1000000,
              duration: Math.floor(Math.random() * 60) + 10,
              thumbnail: `https://picsum.photos/400/300?random=${mediaId}`,
              dimensions: {
                width: 1920,
                height: 1080
              }
            };
          }
        }
        
        const messageData = {
          chatId: chat._id,
          senderId: sender,
          type: messageType,
          content: messageType === 'text' ? messageContent : (messageContent || ''),
          status: 'sent',
          readBy: [],
          reactions: [],
          isDeleted: false,
          deletedBy: [],
          createdAt: new Date(Date.now() - (DATING_MESSAGES_PER_CHAT - i) * 60000) // Stagger messages
        };
        
        // Add media only for media messages
        if (isMediaMessage && Object.keys(messageMedia).length > 0) {
          messageData.media = messageMedia;
        }
        
        const message = new DatingMessage(messageData);
        await message.save();
        totalDatingMessages++;
        
        // Update chat's last message
        chat.lastMessage = message._id;
        chat.lastMessageAt = message.createdAt;
        
        // Increment unread count for the other participant
        const otherParticipant = participants.find(p => p.toString() !== sender.toString());
        const otherUserSettings = chat.userSettings.find(us => 
          us.userId.toString() === otherParticipant.toString()
        );
        if (otherUserSettings) {
          otherUserSettings.unreadCount = (otherUserSettings.unreadCount || 0) + 1;
        }
        
        // Mark as read for sender
        message.readBy.push({
          userId: sender,
          readAt: new Date()
        });
        await message.save();
      }
      
      await chat.save();
      
      if (totalDatingMessages % 250 === 0) {
        console.log(`   Created ${totalDatingMessages} dating messages`);
      }
    }
    console.log(`✅ Created ${totalDatingMessages} dating messages across ${datingChats.length} chats\n`);

    // Create dating profile comments
    console.log(`💬 Creating ${TOTAL_DATING_PROFILE_COMMENTS} dating profile comments...`);
    let commentsCreated = 0;
    
    for (let i = 0; i < TOTAL_DATING_PROFILE_COMMENTS; i++) {
      const user = users[Math.floor(Math.random() * users.length)];
      let targetUser = users[Math.floor(Math.random() * users.length)];
      
      // Ensure different users and target has active dating profile
      while (targetUser._id.toString() === user._id.toString() ||
             !targetUser.dating?.isDatingProfileActive) {
        targetUser = users[Math.floor(Math.random() * users.length)];
      }
      
      const commentText = DATING_PROFILE_COMMENTS[i % DATING_PROFILE_COMMENTS.length];
      
      const comment = new DatingProfileComment({
        user: user._id,
        targetUser: targetUser._id,
        text: commentText,
        likes: [],
        likesCount: 0,
        isPinned: false,
        isDeleted: false
      });
      
      await comment.save();
      commentsCreated++;
      
      // Add some likes to comments (30% of comments)
      if (Math.random() > 0.7) {
        const numLikes = Math.floor(Math.random() * 5) + 1;
        for (let j = 0; j < numLikes && j < users.length; j++) {
          const liker = users[Math.floor(Math.random() * users.length)];
          if (liker._id.toString() !== user._id.toString() &&
              liker._id.toString() !== targetUser._id.toString()) {
            await comment.toggleLike(liker._id);
          }
        }
      }
      
      if ((i + 1) % 20 === 0) {
        console.log(`   Created ${i + 1}/${TOTAL_DATING_PROFILE_COMMENTS} comments`);
      }
    }
    console.log(`✅ Created ${commentsCreated} dating profile comments\n`);

    // Summary
    console.log('📊 Seeding Summary:');
    console.log(`   ✅ Catalog: Created with ${CATALOG_INTERESTS.length} interests, ${CATALOG_LIKES.length} likes`);
    console.log(`   ✅ Users: ${users.length}`);
    console.log(`   ✅ Posts: ${posts.length}`);
    console.log(`   ✅ Likes: ${likesCreated}`);
    console.log(`   ✅ Comments: ${TOTAL_COMMENTS}`);
    console.log(`   ✅ Chats: ${chats.length}`);
    console.log(`   ✅ Messages: ${totalMessages}`);
    console.log(`   ✅ Dating Interactions: ${datingInteractions ? datingInteractions.length : 0}`);
    console.log(`   ✅ Dating Matches: ${matches ? matches.length : 0}`);
    console.log(`   ✅ Dating Chats: ${datingChats ? datingChats.length : 0}`);
    console.log(`   ✅ Dating Messages: ${totalDatingMessages ? totalDatingMessages : 0}`);
    console.log(`   ✅ Dating Profile Comments: ${commentsCreated}`);
    console.log('\n🎉 Social and dating data seeding completed successfully!');

  } catch (error) {
    console.error('❌ Error seeding data:', error);
    throw error;
  }
};

// Run seed
const runSeed = async () => {
  try {
    await connectDB();
    await seedSocialData();
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Execute
if (require.main === module) {
  runSeed();
}

module.exports = { seedSocialData, runSeed };

