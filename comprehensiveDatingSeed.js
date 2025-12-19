const mongoose = require('mongoose');
require('dotenv').config();

// Import models - Social
const User = require('./src/user/auth/model/userAuthModel');
const Post = require('./src/user/social/userModel/postModel');
const Story = require('./src/user/social/userModel/storyModel');

// Import models - Dating
const DatingInteraction = require('./src/user/dating/models/datingInteractionModel');
const DatingMatch = require('./src/user/dating/models/datingMatchModel');
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

// Configuration - Social
const TOTAL_USERS = 100; // Total users (will have both social and dating profiles)
const POSTS_PER_USER = 100;
const STORIES_PER_USER = 100;
const FOLLOWERS_PER_USER = 100;
const FOLLOWING_PER_USER = 100;
const LIKES_PER_POST = 100;
const COMMENTS_PER_POST = 100;

// Configuration - Dating
const PHOTOS_PER_USER = 5; // Max 5 photos per user
const VIDEOS_PER_USER = 3; // Max 3 videos per user
const DATING_LIKES_PER_USER = 200; // Each user likes 200 profiles
const DISLIKES_PER_USER = 100; // Each user dislikes 100 profiles
const DATING_COMMENTS_PER_PROFILE = 50; // 50 comments per profile on average
const MATCH_PERCENTAGE = 15; // 15% of likes result in matches (mutual likes)

// Sample data arrays
const FIRST_NAMES = [
  'Aarav', 'Aditi', 'Akshay', 'Ananya', 'Arjun', 'Avni', 'Dev', 'Diya', 'Ishaan', 'Kavya',
  'Krishna', 'Meera', 'Neha', 'Pranav', 'Priya', 'Rahul', 'Riya', 'Rohan', 'Saanvi', 'Sahil',
  'Sanjay', 'Shreya', 'Siddharth', 'Sneha', 'Tanvi', 'Varun', 'Ved', 'Vidya', 'Yash', 'Zara',
  'Aryan', 'Bhavya', 'Chaitanya', 'Disha', 'Esha', 'Gaurav', 'Harsh', 'Isha', 'Jai', 'Kiran',
  'Lakshmi', 'Manish', 'Nisha', 'Om', 'Pooja', 'Raj', 'Sakshi', 'Tanishq', 'Uma', 'Vikram',
  'Alia', 'Arnav', 'Bhavna', 'Chetan', 'Divya', 'Ethan', 'Fatima', 'Gurpreet', 'Hina', 'Inder',
  'Jaspreet', 'Kamal', 'Lalita', 'Mohit', 'Naina', 'Omkar', 'Pooja', 'Qadir', 'Rakhi', 'Sameer',
  'Tarun', 'Urvashi', 'Vivek', 'Yamini', 'Zainab', 'Aarush', 'Anvi', 'Bhaumik', 'Chhavi', 'Dhruv',
  'Eshaan', 'Farah', 'Gitanjali', 'Harshit', 'Inaya', 'Jahan', 'Karan', 'Lavanya', 'Mayank', 'Navya'
];

const LAST_NAMES = [
  'Sharma', 'Patel', 'Kumar', 'Singh', 'Gupta', 'Verma', 'Reddy', 'Mehta', 'Joshi', 'Shah',
  'Agarwal', 'Malhotra', 'Kapoor', 'Chopra', 'Nair', 'Iyer', 'Rao', 'Desai', 'Bansal', 'Goyal',
  'Saxena', 'Mishra', 'Tiwari', 'Yadav', 'Jain', 'Arora', 'Bhatt', 'Dubey', 'Pandey', 'Srivastava',
  'Khan', 'Ali', 'Hussain', 'Ahmed', 'Malik', 'Sheikh', 'Rahman', 'Hasan', 'Ansari', 'Qureshi',
  'Fernandes', 'D\'Souza', 'Pereira', 'Rodrigues', 'Gomes', 'Almeida', 'Costa', 'Silva', 'Mendes', 'Lobo',
  'Verma', 'Reddy', 'Kumar', 'Nair', 'Iyer', 'Menon', 'Pillai', 'Nambiar', 'Krishnan', 'Raman'
];

const CITIES = [
  'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 'Ahmedabad',
  'Jaipur', 'Surat', 'Lucknow', 'Kanpur', 'Nagpur', 'Indore', 'Thane', 'Bhopal', 'Visakhapatnam',
  'Patna', 'Vadodara', 'Ghaziabad', 'Ludhiana', 'Agra', 'Nashik', 'Faridabad', 'Meerut', 'Rajkot',
  'Varanasi', 'Srinagar', 'Amritsar', 'Chandigarh', 'Jodhpur', 'Udaipur', 'Goa', 'Shimla',
  'Manali', 'Dehradun', 'Rishikesh', 'Haridwar', 'Allahabad', 'Bhubaneswar', 'Mysore', 'Coimbatore'
];

const COUNTRIES = ['India', 'United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 'France', 'Japan'];

const LANGUAGES = ['English', 'Hindi', 'Marathi', 'Gujarati', 'Bengali', 'Tamil', 'Telugu', 'Kannada', 'Malayalam', 'Punjabi', 'Urdu', 'French', 'Spanish', 'German', 'Japanese'];

const HERE_TO_OPTIONS = ['Make New Friends', 'Dating', 'Serious Relationship', 'Networking', 'Travel Buddy', 'Casual Dating', 'Long-term Relationship'];

const WANT_TO_MEET_OPTIONS = ['Man', 'Woman', 'Everyone', 'Non-binary'];

const GENDERS = ['male', 'female', 'non-binary'];

const PRONOUNS = ['he/him', 'she/her', 'they/them', 'he/they', 'she/they'];

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
  'Life is good 😊'
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
  'Absolutely amazing!', 'Love this post!', 'So inspiring!', 'This is incredible work!'
];

const SAMPLE_DATING_COMMENTS = [
  'Great profile! 😊',
  'Love your photos! ❤️',
  'You seem really interesting!',
  'Would love to connect!',
  'Nice smile! 😃',
  'Your bio is awesome!',
  'Great vibe! ✨',
  'Beautiful photos! 📸',
  'Love your energy! ⚡',
  'You look amazing!',
  'Interesting hobbies!',
  'Great taste! 👌',
  'Love your style!',
  'Awesome profile!',
  'Beautiful! 🌟',
  'You seem fun!',
  'Great personality!',
  'Love your passion!',
  'Amazing! 🔥',
  'You\'re awesome!'
];

const SAMPLE_BIO = [
  'Love traveling and exploring new places! ✈️',
  'Coffee enthusiast ☕ | Food lover 🍕 | Adventure seeker 🌍',
  'Living life one day at a time 🌟',
  'Photography lover 📸 | Nature enthusiast 🌲',
  'Music, books, and good vibes 🎵📚',
  'Fitness enthusiast 💪 | Always up for a challenge',
  'Art and creativity inspire me 🎨',
  'Foodie 🍜 | Cook 🧑‍🍳 | Always hungry for more',
  'Yoga practitioner 🧘 | Mindfulness advocate ✨',
  'Tech enthusiast 💻 | Coffee addict ☕',
  'Dance like nobody\'s watching 💃',
  'Books, movies, and deep conversations 📖🎬',
  'Adventure sports enthusiast 🏄‍♂️',
  'Dog lover 🐕 | Nature lover 🌿',
  'Minimalist lifestyle | Mindfulness seeker 🧘‍♀️',
  'Love cooking Italian food 🍝',
  'Wanderlust soul 🌎 | Always planning the next trip',
  'Fitness and wellness coach 💪',
  'Music producer 🎹 | DJ 🎧',
  'Plant parent 🌱 | Sustainable living advocate 🌍'
];

const SAMPLE_HASHTAGS = [
  'photography', 'photooftheday', 'instagood', 'picoftheday', 'beautiful', 'nature',
  'travel', 'adventure', 'explore', 'wanderlust', 'vacation', 'holiday', 'sunset',
  'sunrise', 'landscape', 'mountains', 'ocean', 'beach', 'city', 'urban', 'street',
  'portrait', 'selfie', 'fashion', 'style', 'ootd', 'outfit', 'fashionista', 'trendy',
  'food', 'foodie', 'foodporn', 'delicious', 'yummy', 'cooking', 'recipe', 'restaurant',
  'fitness', 'workout', 'gym', 'fitnessmotivation', 'health', 'wellness', 'yoga',
  'lifestyle', 'life', 'daily', 'motivation', 'inspiration', 'quote', 'positive',
  'happy', 'blessed', 'grateful', 'love', 'family', 'friends', 'friendship', 'memories',
  'art', 'artist', 'creative', 'design', 'drawing', 'painting', 'sketch', 'digitalart',
  'music', 'musician', 'song', 'concert', 'festival', 'dance', 'party', 'celebration',
  'sports', 'football', 'cricket', 'basketball', 'tennis', 'running', 'cycling',
  'technology', 'tech', 'gadgets', 'innovation', 'startup', 'business', 'entrepreneur',
  'india', 'mumbai', 'delhi', 'bangalore', 'culture', 'tradition', 'festival',
  'wedding', 'celebration', 'birthday', 'anniversary', 'graduation', 'achievement',
  'pet', 'dog', 'cat', 'animals', 'wildlife', 'naturelovers', 'outdoors', 'camping',
  'coffee', 'tea', 'drinks', 'cocktail', 'wine', 'dining', 'brunch', 'breakfast',
  'makeup', 'beauty', 'skincare', 'cosmetics', 'glam', 'makeupartist', 'beautyblogger',
  'cars', 'automotive', 'bike', 'motorcycle', 'travel', 'roadtrip', 'journey',
  'architecture', 'building', 'interior', 'design', 'home', 'decor', 'minimalist',
  'vintage', 'retro', 'classic', 'modern', 'contemporary', 'aesthetic', 'vibes'
];

// Diverse media URLs
const IMAGE_URLS = [
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1080&h=1920&fit=crop',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=1080&h=1920&fit=crop',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=1080&h=1920&fit=crop',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=1080&h=1920&fit=crop',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=1080&h=1920&fit=crop',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=1080&h=1920&fit=crop',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=1080&h=1920&fit=crop',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=1080&h=1920&fit=crop',
  'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=1080&h=1920&fit=crop',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=1080&h=1920&fit=crop',
  'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=1080&h=1920&fit=crop',
  'https://images.pexels.com/photos/1181519/pexels-photo-1181519.jpeg?auto=compress&cs=tinysrgb&w=1080&h=1920&fit=crop',
  'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=1080&h=1920&fit=crop',
  'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=1080&h=1920&fit=crop',
  'https://images.pexels.com/photos/1181690/pexels-photo-1181690.jpeg?auto=compress&cs=tinysrgb&w=1080&h=1920&fit=crop'
];

const VIDEO_URLS = [
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreet.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/VolkswagenGTIReview.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WhatCarCanYouGetForAGrand.mp4'
];

const VIDEO_THUMBNAILS = [
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1080&h=1920&fit=crop',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=1080&h=1920&fit=crop',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=1080&h=1920&fit=crop',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=1080&h=1920&fit=crop',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=1080&h=1920&fit=crop'
];

// Utility functions
const getRandomElement = (array) => array[Math.floor(Math.random() * array.length)];
const getRandomElements = (array, count) => {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, array.length));
};

// Generate random hashtags for a post (3-10 hashtags)
const generateHashtags = () => {
  const hashtagCount = Math.floor(Math.random() * 8) + 3; // 3 to 10 hashtags
  const selectedHashtags = getRandomElements(SAMPLE_HASHTAGS, hashtagCount);
  // Return lowercase hashtags without '#' symbol (as per model schema)
  return selectedHashtags.map(tag => tag.toLowerCase().trim());
};

const getRandomDate = (daysAgo = 365) => {
  const now = new Date();
  const pastDate = new Date(now.getTime() - (Math.random() * daysAgo * 24 * 60 * 60 * 1000));
  return pastDate;
};

const getRandomBirthDate = (minAge = 18, maxAge = 45) => {
  const currentYear = new Date().getFullYear();
  const birthYear = currentYear - (Math.floor(Math.random() * (maxAge - minAge + 1)) + minAge);
  const month = Math.floor(Math.random() * 12);
  const day = Math.floor(Math.random() * 28) + 1; // Use 28 to avoid month-end issues
  return new Date(birthYear, month, day);
};

// Generate phone number (10 digits starting with 9)
const generatePhoneNumber = (index) => {
  const base = 9000000000;
  const random = Math.floor(Math.random() * 100000000);
  return String(base + random + index).substring(0, 10);
};

// Create users with both social and dating profiles
const createUsers = async () => {
  console.log(`\n👥 Creating ${TOTAL_USERS} users with social and dating profiles...\n`);
  
  const users = [];
  let createdCount = 0;
  
  for (let i = 0; i < TOTAL_USERS; i++) {
    try {
      const firstName = getRandomElement(FIRST_NAMES);
      const lastName = getRandomElement(LAST_NAMES);
      const fullName = `${firstName} ${lastName}`;
      const username = `${firstName.toLowerCase()}${lastName.toLowerCase()}${i}`;
      const phoneNumber = generatePhoneNumber(i);
      const gender = getRandomElement(GENDERS);
      const pronouns = gender === 'male' ? 'he/him' : gender === 'female' ? 'she/her' : getRandomElement(['they/them', 'he/they', 'she/they']);
      const city = getRandomElement(CITIES);
      const country = getRandomElement(COUNTRIES);
      const dob = getRandomBirthDate(18, 45);
      const age = new Date().getFullYear() - dob.getFullYear();
      
      // Generate dating photos (2-5 photos) with unique media URLs
      const photoCount = Math.floor(Math.random() * 4) + 2;
      const photos = [];
      // Offset dating photos to avoid overlap with posts/stories
      const datingPhotoOffset = (TOTAL_USERS * POSTS_PER_USER) + (TOTAL_USERS * STORIES_PER_USER) + (i * PHOTOS_PER_USER);
      for (let j = 0; j < photoCount; j++) {
        const imageIndex = (datingPhotoOffset + j) % IMAGE_URLS.length;
        photos.push({
          url: IMAGE_URLS[imageIndex],
          thumbnailUrl: IMAGE_URLS[(imageIndex + 1) % IMAGE_URLS.length], // Different thumbnail
          blurhash: null,
          responsiveUrls: null,
          order: j,
          uploadedAt: getRandomDate(30)
        });
      }
      
      // Generate dating videos (0-3 videos) with unique media URLs
      const videoCount = Math.floor(Math.random() * 4);
      const videos = [];
      // Offset dating videos to avoid overlap
      const datingVideoOffset = (TOTAL_USERS * POSTS_PER_USER) + (TOTAL_USERS * STORIES_PER_USER) + (TOTAL_USERS * PHOTOS_PER_USER) + (i * VIDEOS_PER_USER);
      for (let j = 0; j < videoCount; j++) {
        const videoIndex = (datingVideoOffset + j) % VIDEO_URLS.length;
        const thumbnailIndex = (datingVideoOffset + j) % VIDEO_THUMBNAILS.length;
        videos.push({
          url: VIDEO_URLS[videoIndex],
          thumbnailUrl: VIDEO_THUMBNAILS[thumbnailIndex],
          blurhash: null,
          duration: Math.floor(Math.random() * 60) + 10, // 10-70 seconds
          order: j,
          uploadedAt: getRandomDate(30)
        });
      }
      
      // Generate dating preferences
      const hereTo = getRandomElement(HERE_TO_OPTIONS);
      const wantToMeet = getRandomElement(WANT_TO_MEET_OPTIONS);
      const languages = getRandomElements(LANGUAGES, Math.floor(Math.random() * 3) + 1);
      
      // Location with slight variation for distance testing
      const baseLat = 19.0760; // Mumbai
      const baseLng = 72.8777;
      const lat = baseLat + (Math.random() * 2 - 1); // ±1 degree variation
      const lng = baseLng + (Math.random() * 2 - 1);
      
      const userData = {
        phoneNumber,
        countryCode: '+91',
        username,
        usernameNorm: username.toLowerCase(),
        fullName,
        email: `${username}@example.com`,
        emailVerified: true,
        gender,
        pronouns,
        bio: getRandomElement(SAMPLE_BIO),
        dob,
        profilePictureUrl: getRandomElement(IMAGE_URLS),
        isProfileCompleted: true,
        profileCompletionStep: 'completed',
        isActive: true,
        isVerified: Math.random() > 0.7, // 30% verified
        verificationStatus: Math.random() > 0.7 ? 'approved' : 'none',
        location: {
          lat,
          lng,
          city,
          country
        },
        preferences: {
          hereFor: hereTo,
          wantToMeet: wantToMeet,
          primaryLanguage: languages[0] || 'English',
          secondaryLanguage: languages[1] || ''
        },
        interests: getRandomElements(['Travel', 'Music', 'Food', 'Sports', 'Photography', 'Art', 'Fitness', 'Reading', 'Movies', 'Dancing'], Math.floor(Math.random() * 5) + 2),
        likes: getRandomElements(['Pizza', 'Coffee', 'Chocolate', 'Ice Cream', 'Sushi', 'Pasta'], Math.floor(Math.random() * 4) + 1),
        privacySettings: {
          isPrivate: false,
          allowFollowRequests: true,
          showOnlineStatus: true,
          allowMessages: 'followers',
          allowCommenting: true,
          allowTagging: true,
          allowStoriesSharing: true
        },
        following: [],
        followers: [],
        // Dating profile
        dating: {
          photos,
          videos,
          isDatingProfileActive: true,
          preferences: {
            hereTo,
            wantToMeet,
            ageRange: {
              min: Math.max(18, age - 5),
              max: Math.min(50, age + 10)
            },
            languages,
            location: {
              city,
              country,
              coordinates: {
                lat,
                lng
              }
            },
            distanceRange: {
              min: 0,
              max: Math.floor(Math.random() * 50) + 10 // 10-60 km
            }
          },
          lastUpdatedAt: getRandomDate(30)
        },
        // Create 30% of users within last 7 days (for "new_dater" filter), rest within last year
        createdAt: Math.random() < 0.3 ? getRandomDate(7) : getRandomDate(365)
      };
      
      const user = await User.create(userData);
      users.push(user);
      createdCount++;
      
      if ((i + 1) % 50 === 0) {
        console.log(`   ✅ Created ${i + 1}/${TOTAL_USERS} users...`);
      }
    } catch (error) {
      console.error(`   ❌ Error creating user ${i + 1}:`, error.message);
    }
  }
  
  console.log(`\n✅ Created ${createdCount} users with social and dating profiles\n`);
  return users;
};

// SOCIAL FLOW FUNCTIONS

// Create follow relationships
const createFollowRelationships = async (users) => {
  console.log(`\n👥 Creating follow relationships...\n`);
  
  let totalFollows = 0;
  
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    
    // Get other users (exclude self)
    const otherUsers = users.filter(u => u._id.toString() !== user._id.toString());
    
    // Select random users to follow
    const usersToFollow = getRandomElements(otherUsers, Math.min(FOLLOWING_PER_USER, otherUsers.length));
    
    // Select random users as followers
    const followers = getRandomElements(otherUsers, Math.min(FOLLOWERS_PER_USER, otherUsers.length));
    
    // Update user's following and followers
    user.following = usersToFollow.map(u => u._id);
    user.followers = followers.map(u => u._id);
    await user.save();
    
    // Update followers' following list (reciprocal)
    for (const follower of followers) {
      if (!follower.following.includes(user._id)) {
        follower.following.push(user._id);
        await follower.save();
      }
    }
    
    totalFollows += usersToFollow.length;
    
    if ((i + 1) % 50 === 0) {
      console.log(`   ✅ Processed ${i + 1}/${users.length} users...`);
    }
  }
  
  console.log(`\n✅ Created ${totalFollows} follow relationships\n`);
};

// Create posts for a user
const createPostsForUser = async (user, allUsers, userIndex) => {
  const posts = [];
  // Media counter to ensure unique media URLs per post
  let mediaCounter = userIndex * POSTS_PER_USER;
  
  for (let i = 0; i < POSTS_PER_USER; i++) {
    try {
      const hasContent = Math.random() > 0.2;
      const content = hasContent ? getRandomElement(SAMPLE_POST_CONTENT) : null;
      
      const isVideo = Math.random() > 0.7; // 30% videos, 70% images
      const mediaCount = isVideo ? 1 : (Math.random() > 0.7 ? Math.floor(Math.random() * 3) + 1 : 1);
      
      const media = [];
      for (let j = 0; j < mediaCount; j++) {
        // Use counter to ensure unique media URLs - cycle through arrays
        const imageIndex = (mediaCounter + j) % IMAGE_URLS.length;
        const videoIndex = (mediaCounter + j) % VIDEO_URLS.length;
        const thumbnailIndex = (mediaCounter + j) % VIDEO_THUMBNAILS.length;
        
        const mediaItem = {
          type: isVideo ? 'video' : 'image',
          url: isVideo ? VIDEO_URLS[videoIndex] : IMAGE_URLS[imageIndex],
          thumbnail: isVideo ? VIDEO_THUMBNAILS[thumbnailIndex] : null,
          filename: `post_${userIndex}_${i}_${j}_${Date.now()}.${isVideo ? 'mp4' : 'jpg'}`,
          fileSize: isVideo 
            ? Math.floor(Math.random() * 20000000) + 5000000
            : Math.floor(Math.random() * 5000000) + 100000,
          mimeType: isVideo ? 'video/mp4' : 'image/jpeg',
          s3Key: `posts/${user._id}/post_${i}_${j}_${Date.now()}.${isVideo ? 'mp4' : 'jpg'}`,
          dimensions: isVideo 
            ? { width: 1920, height: 1080 }
            : { width: 1080, height: 1920 }
        };
        
        if (isVideo) {
          mediaItem.duration = 40; // Fixed 40 seconds for all videos
        }
        
        media.push(mediaItem);
      }
      
      // Increment counter for next post
      mediaCounter += mediaCount;
      
      const publishedAt = getRandomDate(30);
      
      // Generate hashtags for the post
      const hashtags = generateHashtags();
      
      // Create post with empty likes and comments (will be populated later)
      const postData = {
        author: user._id,
        content,
        media,
        hashtags,
        visibility: getRandomElement(['public', 'followers']),
        commentVisibility: getRandomElement(['everyone', 'followers']),
        status: 'published',
        publishedAt,
        likes: [],
        comments: [],
        shares: [],
        views: [],
        likesCount: 0,
        commentsCount: 0,
        sharesCount: 0,
        viewsCount: Math.floor(Math.random() * 500),
        createdAt: publishedAt,
        updatedAt: publishedAt
      };
      
      const post = await Post.create(postData);
      posts.push(post);
    } catch (error) {
      console.error(`   ❌ Error creating post ${i + 1} for user ${user.username}:`, error.message);
    }
  }
  
  return posts;
};

// Add likes and comments to a post
const addEngagementToPost = async (post, allUsers) => {
  const authorId = post.author.toString();
  const eligibleUsers = allUsers.filter(u => u._id.toString() !== authorId);
  
  // Get users for likes
  const likers = getRandomElements(eligibleUsers, Math.min(LIKES_PER_POST, eligibleUsers.length));
  
  // Get users for comments (can overlap with likers)
  const commenters = getRandomElements(eligibleUsers, Math.min(COMMENTS_PER_POST, eligibleUsers.length));
  
  // Add likes
  for (const liker of likers) {
    post.likes.push({
      user: liker._id,
      likedAt: getRandomDate(30)
    });
  }
  
  // Add comments
  for (const commenter of commenters) {
    post.comments.push({
      user: commenter._id,
      content: getRandomElement(SAMPLE_COMMENTS),
      likes: [],
      isEdited: false,
      editedAt: null,
      createdAt: getRandomDate(30)
    });
  }
  
  // Update counts
  post.likesCount = post.likes.length;
  post.commentsCount = post.comments.length;
  
  await post.save();
};

// Create stories for a user
const createStoriesForUser = async (user, userIndex) => {
  const stories = [];
  // Media counter to ensure unique media URLs per story
  // Offset by total posts to avoid overlap with post media
  let mediaCounter = (TOTAL_USERS * POSTS_PER_USER) + (userIndex * STORIES_PER_USER);
  
  for (let i = 0; i < STORIES_PER_USER; i++) {
    try {
      const hasContent = Math.random() > 0.3;
      const content = hasContent ? getRandomElement(SAMPLE_POST_CONTENT) : null;
      
      const isVideo = Math.random() > 0.7; // 30% videos
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      
      // Use counter to ensure unique media URLs - cycle through arrays
      const imageIndex = (mediaCounter + i) % IMAGE_URLS.length;
      const videoIndex = (mediaCounter + i) % VIDEO_URLS.length;
      const thumbnailIndex = (mediaCounter + i) % VIDEO_THUMBNAILS.length;
      
      const media = {
        type: isVideo ? 'video' : 'image',
        url: isVideo ? VIDEO_URLS[videoIndex] : IMAGE_URLS[imageIndex],
        thumbnail: isVideo ? VIDEO_THUMBNAILS[thumbnailIndex] : null,
        filename: `story_${userIndex}_${i}_${Date.now()}.${isVideo ? 'mp4' : 'jpg'}`,
        fileSize: isVideo 
          ? Math.floor(Math.random() * 20000000) + 5000000
          : Math.floor(Math.random() * 5000000) + 100000,
        mimeType: isVideo ? 'video/mp4' : 'image/jpeg',
        s3Key: `stories/${user._id}/story_${i}_${Date.now()}.${isVideo ? 'mp4' : 'jpg'}`,
        dimensions: { width: 1080, height: 1920 }
      };
      
      if (isVideo) {
        media.duration = Math.floor(Math.random() * 60) + 5;
      }
      
      const storyData = {
        author: user._id,
        content,
        media,
        privacy: getRandomElement(['public', 'followers', 'close_friends']),
        status: 'active',
        expiresAt,
        views: [],
        mentions: [],
        replies: [],
        analytics: {
          viewsCount: 0,
          likesCount: 0,
          repliesCount: 0,
          sharesCount: 0
        },
        createdAt: getRandomDate(1) // Created within last 24 hours
      };
      
      const story = await Story.create(storyData);
      stories.push(story);
    } catch (error) {
      console.error(`   ❌ Error creating story ${i + 1} for user ${user.username}:`, error.message);
    }
  }
  
  return stories;
};

// DATING FLOW FUNCTIONS

// Create dating interactions (likes and dislikes)
const createDatingInteractions = async (users) => {
  console.log(`\n❤️ Creating dating interactions (likes and dislikes)...\n`);
  
  let totalLikes = 0;
  let totalDislikes = 0;
  const interactionMap = new Map(); // Track interactions to avoid duplicates
  
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const otherUsers = users.filter(u => u._id.toString() !== user._id.toString());
    
    // Select users to like
    const usersToLike = getRandomElements(otherUsers, Math.min(DATING_LIKES_PER_USER, otherUsers.length));
    
    // Select users to dislike (different from liked users)
    const likedIds = new Set(usersToLike.map(u => u._id.toString()));
    const usersToDislike = getRandomElements(
      otherUsers.filter(u => !likedIds.has(u._id.toString())),
      Math.min(DISLIKES_PER_USER, otherUsers.length - usersToLike.length)
    );
    
    // Create like interactions
    for (const targetUser of usersToLike) {
      const key = `${user._id}_${targetUser._id}`;
      if (!interactionMap.has(key)) {
        try {
          const hasComment = Math.random() > 0.7; // 30% have comments
          await DatingInteraction.create({
            user: user._id,
            targetUser: targetUser._id,
            action: 'like',
            comment: hasComment ? {
              text: getRandomElement(SAMPLE_DATING_COMMENTS),
              createdAt: getRandomDate(30)
            } : undefined,
            status: 'pending',
            createdAt: getRandomDate(30)
          });
          interactionMap.set(key, true);
          totalLikes++;
        } catch (error) {
          // Skip duplicate interactions
          if (!error.message.includes('duplicate')) {
            console.error(`   ❌ Error creating like interaction:`, error.message);
          }
        }
      }
    }
    
    // Create dislike interactions
    for (const targetUser of usersToDislike) {
      const key = `${user._id}_${targetUser._id}`;
      if (!interactionMap.has(key)) {
        try {
          await DatingInteraction.create({
            user: user._id,
            targetUser: targetUser._id,
            action: 'dislike',
            status: 'dismissed',
            createdAt: getRandomDate(30)
          });
          interactionMap.set(key, true);
          totalDislikes++;
        } catch (error) {
          // Skip duplicate interactions
          if (!error.message.includes('duplicate')) {
            console.error(`   ❌ Error creating dislike interaction:`, error.message);
          }
        }
      }
    }
    
    if ((i + 1) % 50 === 0) {
      console.log(`   ✅ Processed ${i + 1}/${users.length} users... (${totalLikes} likes, ${totalDislikes} dislikes)`);
    }
  }
  
  console.log(`\n✅ Created ${totalLikes} likes and ${totalDislikes} dislikes\n`);
  return { totalLikes, totalDislikes };
};

// Create matches from mutual likes
const createDatingMatches = async (users) => {
  console.log(`\n💑 Creating dating matches from mutual likes...\n`);
  
  let totalMatches = 0;
  
  // Get all like interactions
  const allLikes = await DatingInteraction.find({ action: 'like', status: 'pending' }).lean();
  
  // Group by user pairs
  const userPairs = new Map();
  
  for (const like of allLikes) {
    const user1 = like.user.toString();
    const user2 = like.targetUser.toString();
    
    // Create a consistent key (sorted)
    const pairKey = user1 < user2 ? `${user1}_${user2}` : `${user2}_${user1}`;
    
    if (!userPairs.has(pairKey)) {
      userPairs.set(pairKey, {
        userA: user1 < user2 ? like.user : like.targetUser,
        userB: user1 < user2 ? like.targetUser : like.user,
        likes: []
      });
    }
    
    const pair = userPairs.get(pairKey);
    pair.likes.push(like);
  }
  
  // Find mutual likes (both users liked each other)
  const mutualPairs = Array.from(userPairs.values()).filter(pair => {
    // Check if both users liked each other
    const userALikedB = pair.likes.some(l => 
      l.user.toString() === pair.userA.toString() && l.targetUser.toString() === pair.userB.toString()
    );
    const userBLikedA = pair.likes.some(l => 
      l.user.toString() === pair.userB.toString() && l.targetUser.toString() === pair.userA.toString()
    );
    return userALikedB && userBLikedA;
  });
  
  // Create matches (random percentage based on MATCH_PERCENTAGE)
  const matchesToCreate = Math.floor((mutualPairs.length * MATCH_PERCENTAGE) / 100);
  const selectedPairs = getRandomElements(mutualPairs, matchesToCreate);
  
  for (const pair of selectedPairs) {
    try {
      const match = await DatingMatch.createOrGetMatch(pair.userA, pair.userB);
      
      // Update interactions to matched status
      await DatingInteraction.updateMany(
        {
          $or: [
            { user: pair.userA, targetUser: pair.userB, action: 'like' },
            { user: pair.userB, targetUser: pair.userA, action: 'like' }
          ]
        },
        {
          $set: {
            status: 'matched',
            matchedAt: getRandomDate(30)
          }
        }
      );
      
      totalMatches++;
    } catch (error) {
      console.error(`   ❌ Error creating match:`, error.message);
    }
  }
  
  console.log(`\n✅ Created ${totalMatches} matches\n`);
  return totalMatches;
};

// Create dating profile comments
const createDatingProfileComments = async (users) => {
  console.log(`\n💬 Creating dating profile comments...\n`);
  
  let totalComments = 0;
  
  for (let i = 0; i < users.length; i++) {
    const targetUser = users[i];
    const otherUsers = users.filter(u => u._id.toString() !== targetUser._id.toString());
    
    // Select users who will comment on this profile
    const commentCount = Math.floor(Math.random() * DATING_COMMENTS_PER_PROFILE) + 10; // 10-60 comments
    const commenters = getRandomElements(otherUsers, Math.min(commentCount, otherUsers.length));
    
    for (const commenter of commenters) {
      try {
        const comment = await DatingProfileComment.create({
          user: commenter._id,
          targetUser: targetUser._id,
          text: getRandomElement(SAMPLE_DATING_COMMENTS),
          likes: [],
          likesCount: 0,
          isPinned: Math.random() > 0.95, // 5% pinned
          isDeleted: false,
          createdAt: getRandomDate(30)
        });
        
        totalComments++;
      } catch (error) {
        console.error(`   ❌ Error creating comment:`, error.message);
      }
    }
    
    if ((i + 1) % 50 === 0) {
      console.log(`   ✅ Processed ${i + 1}/${users.length} profiles... (${totalComments} comments)`);
    }
  }
  
  console.log(`\n✅ Created ${totalComments} profile comments\n`);
  return totalComments;
};

// Add likes to comments
const addLikesToComments = async () => {
  console.log(`\n👍 Adding likes to dating comments...\n`);
  
  const comments = await DatingProfileComment.find({ isDeleted: false }).lean();
  const users = await User.find({ isActive: true }).select('_id').lean();
  
  let totalLikesAdded = 0;
  
  for (let i = 0; i < comments.length; i++) {
    const comment = comments[i];
    const otherUsers = users.filter(u => 
      u._id.toString() !== comment.user.toString() && 
      u._id.toString() !== comment.targetUser.toString()
    );
    
    // Each comment gets 0-20 likes
    const likeCount = Math.floor(Math.random() * 21);
    const likers = getRandomElements(otherUsers, Math.min(likeCount, otherUsers.length));
    
    if (likers.length > 0) {
      try {
        await DatingProfileComment.findByIdAndUpdate(comment._id, {
          $set: {
            likes: likers.map(u => u._id),
            likesCount: likers.length
          }
        });
        totalLikesAdded += likers.length;
      } catch (error) {
        console.error(`   ❌ Error adding likes to comment:`, error.message);
      }
    }
    
    if ((i + 1) % 100 === 0) {
      console.log(`   ✅ Processed ${i + 1}/${comments.length} comments... (${totalLikesAdded} likes added)`);
    }
  }
  
  console.log(`\n✅ Added ${totalLikesAdded} likes to comments\n`);
  return totalLikesAdded;
};

// Main seeding function
const seedAll = async () => {
  try {
    console.log('\n🚀 Starting Comprehensive Seeding Script (Social + Dating)...\n');
    console.log('='.repeat(70));
    console.log(`📊 Configuration - SOCIAL:`);
    console.log(`   👥 Total users: ${TOTAL_USERS}`);
    console.log(`   📝 Posts per user: ${POSTS_PER_USER}`);
    console.log(`   📖 Stories per user: ${STORIES_PER_USER}`);
    console.log(`   👥 Followers per user: ${FOLLOWERS_PER_USER}`);
    console.log(`   👥 Following per user: ${FOLLOWING_PER_USER}`);
    console.log(`   ❤️  Likes per post: ${LIKES_PER_POST}`);
    console.log(`   💬 Comments per post: ${COMMENTS_PER_POST}`);
    console.log(`\n📊 Configuration - DATING:`);
    console.log(`   📸 Dating photos per user: 2-5 (random)`);
    console.log(`   🎥 Dating videos per user: 0-3 (random)`);
    console.log(`   ❤️  Dating likes per user: ${DATING_LIKES_PER_USER}`);
    console.log(`   👎 Dating dislikes per user: ${DISLIKES_PER_USER}`);
    console.log(`   💬 Dating comments per profile: 10-60 (random)`);
    console.log(`   💑 Match percentage: ${MATCH_PERCENTAGE}% of mutual likes`);
    console.log('='.repeat(70));
    
    // Step 1: Create users with both social and dating profiles
    const users = await createUsers();
    
    if (users.length === 0) {
      console.error('❌ No users created. Exiting...');
      return;
    }
    
    // Step 2: Create social follow relationships
    await createFollowRelationships(users);
    
    // Step 3: Create social posts and engagement for each user
    console.log(`\n📝 Creating social posts and engagement...\n`);
    let totalPosts = 0;
    let totalStories = 0;
    
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      
      if ((i + 1) % 50 === 0) {
        console.log(`\n👤 Processing user ${i + 1}/${users.length}: ${user.username}`);
      }
      
      // Create posts
      const posts = await createPostsForUser(user, users, i);
      totalPosts += posts.length;
      
      // Add engagement to each post
      for (let j = 0; j < posts.length; j++) {
        await addEngagementToPost(posts[j], users);
      }
      
      // Create stories
      const stories = await createStoriesForUser(user, i);
      totalStories += stories.length;
      
      if ((i + 1) % 50 === 0) {
        console.log(`   ✅ Created ${posts.length} posts and ${stories.length} stories`);
      }
    }
    
    console.log(`\n✅ Social data created: ${totalPosts} posts, ${totalStories} stories\n`);
    
    // Step 4: Create dating interactions (likes and dislikes)
    const { totalLikes: datingLikes, totalDislikes: datingDislikes } = await createDatingInteractions(users);
    
    // Step 5: Create dating matches from mutual likes
    const totalMatches = await createDatingMatches(users);
    
    // Step 6: Create dating profile comments
    const totalDatingComments = await createDatingProfileComments(users);
    
    // Step 7: Add likes to dating comments
    const totalCommentLikes = await addLikesToComments();
    
    // Final summary
    console.log('\n' + '='.repeat(70));
    console.log('\n🎉 Comprehensive Seeding completed successfully!\n');
    console.log('📊 Final Statistics - SOCIAL:\n');
    console.log(`   👥 Total users: ${users.length}`);
    console.log(`   📝 Total posts: ${totalPosts}`);
    console.log(`   📖 Total stories: ${totalStories}`);
    console.log(`   ❤️  Total post likes: ${totalPosts * LIKES_PER_POST}`);
    console.log(`   💬 Total post comments: ${totalPosts * COMMENTS_PER_POST}`);
    console.log(`   👥 Total follow relationships: ${users.length * FOLLOWING_PER_USER}`);
    console.log('\n📊 Final Statistics - DATING:\n');
    console.log(`   ❤️  Total dating likes: ${datingLikes}`);
    console.log(`   👎 Total dating dislikes: ${datingDislikes}`);
    console.log(`   💑 Total matches: ${totalMatches}`);
    console.log(`   💬 Total dating profile comments: ${totalDatingComments}`);
    console.log(`   👍 Total comment likes: ${totalCommentLikes}`);
    console.log('\n💡 Features:');
    console.log('   ✅ All users have both social and dating profiles');
    console.log('   ✅ Social: Posts, stories, followers, following, engagement');
    console.log('   ✅ Dating: Photos, videos, preferences, interactions, matches, comments');
    console.log('   ✅ Large dataset perfect for pagination and performance testing\n');
    
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    console.error('Error details:', error.message);
    console.error('Stack:', error.stack);
    throw error;
  }
};

// Main function
const main = async () => {
  try {
    await connectDB();
    await seedAll();
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed\n');
    process.exit(0);
  }
};

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { seedAll };
