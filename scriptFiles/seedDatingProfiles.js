/**
 * Seed Dating Profiles for Testing
 * Usage: node scriptFiles/seedDatingProfiles.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { connectToDatabase, disconnectFromDatabase } = require('../src/dbConfig/db');
const User = require('../src/modules/user/user.model');

// Mock image assets (diverse profile picture URLs from Unsplash)
const MOCK_MALE_IMAGES = [
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=400',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=400',
  'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=400',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&q=80&w=400',
  'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?auto=format&fit=crop&q=80&w=400',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=400',
  'https://images.unsplash.com/photo-1489980508314-941910ded1f4?auto=format&fit=crop&q=80&w=400'
];

const MOCK_FEMALE_IMAGES = [
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=400',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=400',
  'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&q=80&w=400',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=400',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=400',
  'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&q=80&w=400',
  'https://images.unsplash.com/photo-1513956589380-bad6acb9b9d4?auto=format&fit=crop&q=80&w=400'
];

const MOCK_NON_BINARY_IMAGES = [
  'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?auto=format&fit=crop&q=80&w=400',
  'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&q=80&w=400',
  'https://images.unsplash.com/photo-1513956589380-bad6acb9b9d4?auto=format&fit=crop&q=80&w=400',
  'https://images.unsplash.com/photo-1520155707862-5b32817385d3?auto=format&fit=crop&q=80&w=400',
  'https://images.unsplash.com/photo-1515041218647-c0580a82b881?auto=format&fit=crop&q=80&w=400',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=400',
  'https://images.unsplash.com/photo-1512484776495-a09d92e87c3b?auto=format&fit=crop&q=80&w=400',
  'https://images.unsplash.com/photo-1504257404291-170c89597e51?auto=format&fit=crop&q=80&w=400'
];

// Profile structured data representing all permutations of filters
const SEED_PROFILES = [
  // --- RAMpur (Local Matches) ---
  {
    fullName: "Aarav Mehta",
    username: "aarav_mehta",
    gender: "man",
    pronouns: "he/him",
    age: 24,
    identificationText: "Men",
    orientation: "Straight",
    hereToText: "Dating",
    likes: ["Music", "Fitness", "Travel"],
    languages: ["English", "Hindi"],
    city: "Rampur",
    lat: 28.8154,
    lng: 79.0250,
    bio: "Love playing guitar, going on weekend hikes, and listening to rock music. Let's connect!",
    imageUrl: MOCK_MALE_IMAGES[0]
  },
  {
    fullName: "Ananya Iyer",
    username: "ananya_iyer",
    gender: "woman",
    pronouns: "she/her",
    age: 22,
    identificationText: "Women",
    orientation: "Straight",
    hereToText: "Dating",
    likes: ["Art", "Food", "Outdoors"],
    languages: ["English", "Hindi", "Spanish"],
    city: "Rampur",
    lat: 28.8160,
    lng: 79.0270,
    bio: "Passionate about painting, sketching, and testing new recipes. Always up for an outdoor coffee chat.",
    imageUrl: MOCK_FEMALE_IMAGES[0]
  },
  {
    fullName: "Sam Gill",
    username: "sam_nonbinary",
    gender: "non-binary",
    pronouns: "they/them",
    age: 26,
    identificationText: "Non Binary",
    orientation: "Queer",
    hereToText: "Friendship",
    likes: ["Art", "Gaming", "Film"],
    languages: ["English", "Spanish"],
    city: "Rampur",
    lat: 28.8140,
    lng: 79.0220,
    bio: "Indie filmmaker and amateur artist. Let's chat about movies, games, or grab a tea.",
    imageUrl: MOCK_NON_BINARY_IMAGES[0]
  },
  {
    fullName: "Rohan Das",
    username: "rohan_das",
    gender: "man",
    pronouns: "he/him",
    age: 29,
    identificationText: "Men",
    orientation: "Gay",
    hereToText: "Dating",
    likes: ["Fitness", "Outdoors", "Travel"],
    languages: ["English", "Hindi"],
    city: "Rampur",
    lat: 28.8120,
    lng: 79.0310,
    bio: "Fitness trainer, marathon runner, and travel lover. Looking for someone honest to share adventures with.",
    imageUrl: MOCK_MALE_IMAGES[1]
  },
  {
    fullName: "Priya Sen",
    username: "priya_sen",
    gender: "woman",
    pronouns: "she/her",
    age: 20,
    identificationText: "Women",
    orientation: "Lesbian",
    hereToText: "Dating",
    likes: ["Music", "Books", "Dance"],
    languages: ["English", "Hindi"],
    city: "Rampur",
    lat: 28.8180,
    lng: 79.0290,
    bio: "Literature student, classical dancer, and lover of old vinyl records. Let's explore local book cafes.",
    imageUrl: MOCK_FEMALE_IMAGES[1]
  },
  {
    fullName: "Kai Nair",
    username: "kai_fluid",
    gender: "non-binary",
    pronouns: "they/them",
    age: 31,
    identificationText: "Non Binary",
    orientation: "Pansexual",
    hereToText: "Community",
    likes: ["Travel", "Photography", "Food"],
    languages: ["English", "French"],
    city: "Rampur",
    lat: 28.8195,
    lng: 79.0210,
    bio: "Freelance travel photographer exploring community spaces. Let's exchange stories and good food.",
    imageUrl: MOCK_NON_BINARY_IMAGES[1]
  },
  {
    fullName: "Karan Johar",
    username: "karan_j",
    gender: "man",
    pronouns: "he/him",
    age: 35,
    identificationText: "Men",
    orientation: "Straight",
    hereToText: "Networking",
    likes: ["Gaming", "Fashion", "Film"],
    languages: ["English", "Hindi", "German"],
    city: "Rampur",
    lat: 28.8105,
    lng: 79.0350,
    bio: "Fashion enthusiast and game designer. Let's network and build cool concepts together.",
    imageUrl: MOCK_MALE_IMAGES[2]
  },
  {
    fullName: "Meera Nair",
    username: "meera_nair",
    gender: "woman",
    pronouns: "she/her",
    age: 42,
    identificationText: "Women",
    orientation: "Straight",
    hereToText: "Exploration",
    likes: ["Travel", "Photography", "Books"],
    languages: ["English", "Hindi", "Mandarin"],
    city: "Rampur",
    lat: 28.8135,
    lng: 79.0180,
    bio: "Novelist and travel enthusiast. Always looking for new stories, conversations, and sights.",
    imageUrl: MOCK_FEMALE_IMAGES[2]
  },
  {
    fullName: "Dev Malhotra",
    username: "dev_m",
    gender: "man",
    pronouns: "he/him",
    age: 19,
    identificationText: "Men",
    orientation: "Bisexual",
    hereToText: "Dating",
    likes: ["Music", "Gaming", "Outdoors"],
    languages: ["English", "Hindi"],
    city: "Rampur",
    lat: 28.8115,
    lng: 79.0280,
    bio: "College fresher, music enthusiast, and esports competitor. Looking for a date to go to music gigs.",
    imageUrl: MOCK_MALE_IMAGES[3]
  },
  {
    fullName: "Kriti Sharma",
    username: "kriti_sharma",
    gender: "woman",
    pronouns: "she/her",
    age: 27,
    identificationText: "Women",
    orientation: "Bisexual",
    hereToText: "Dating",
    likes: ["Fitness", "Art", "Dance"],
    languages: ["English", "Hindi"],
    city: "Rampur",
    lat: 28.8170,
    lng: 79.0320,
    bio: "Yoga practitioner and kathak dancer. Let's connect over fitness, art, and positive vibes.",
    imageUrl: MOCK_FEMALE_IMAGES[3]
  },
  {
    fullName: "Alex Rivera",
    username: "alex_bi",
    gender: "non-binary",
    pronouns: "they/them",
    age: 23,
    identificationText: "Non Binary",
    orientation: "Bisexual",
    hereToText: "Exploration",
    likes: ["Art", "Photography", "Film"],
    languages: ["English", "Spanish", "Portuguese"],
    city: "Rampur",
    lat: 28.8148,
    lng: 79.0265,
    bio: "Visual arts student and bilingual photographer. Looking to explore creative circles in Rampur.",
    imageUrl: MOCK_NON_BINARY_IMAGES[2]
  },
  {
    fullName: "Aditi Rao",
    username: "aditi_rao",
    gender: "woman",
    pronouns: "she/her",
    age: 34,
    identificationText: "Women",
    orientation: "Straight",
    hereToText: "Support",
    likes: ["Books", "Outdoors", "Art"],
    languages: ["English", "Hindi"],
    city: "Rampur",
    lat: 28.8162,
    lng: 79.0234,
    bio: "Clinical psychologist. Love talking about mental health, reading novels, and spending time in nature.",
    imageUrl: MOCK_FEMALE_IMAGES[4]
  },

  // --- DELHI ---
  {
    fullName: "Kabir Roy",
    username: "kabir_roy",
    gender: "man",
    pronouns: "he/him",
    age: 28,
    identificationText: "Men",
    orientation: "Straight",
    hereToText: "Dating",
    likes: ["Food", "Travel", "Outdoors"],
    languages: ["English", "Hindi", "Japanese"],
    city: "Delhi",
    lat: 28.6139,
    lng: 77.2090,
    bio: "Food blogger based in Delhi. Let's explore the street food and escape to the hills.",
    imageUrl: MOCK_MALE_IMAGES[4]
  },
  {
    fullName: "Nisha Singhal",
    username: "nisha_singhal",
    gender: "woman",
    pronouns: "she/her",
    age: 25,
    identificationText: "Women",
    orientation: "Straight",
    hereToText: "Dating",
    likes: ["Dance", "Fashion", "Music"],
    languages: ["English", "Hindi"],
    city: "Delhi",
    lat: 28.6150,
    lng: 77.2150,
    bio: "Choreographer and fashion enthusiast. If you love dancing to upbeat music, we will vibe!",
    imageUrl: MOCK_FEMALE_IMAGES[5]
  },
  {
    fullName: "Robin Sen",
    username: "robin_queer",
    gender: "non-binary",
    pronouns: "they/them",
    age: 28,
    identificationText: "Non Binary",
    orientation: "Queer",
    hereToText: "Friendship",
    likes: ["Art", "Gaming", "Photography"],
    languages: ["English", "Hindi"],
    city: "Delhi",
    lat: 28.6200,
    lng: 77.2200,
    bio: "UI designer and photography enthusiast. Love checking out art exhibitions and gaming tournaments.",
    imageUrl: MOCK_NON_BINARY_IMAGES[3]
  },
  {
    fullName: "Vikram Seth",
    username: "vikram_seth",
    gender: "man",
    pronouns: "he/him",
    age: 48,
    identificationText: "Men",
    orientation: "Straight",
    hereToText: "Friendship",
    likes: ["Books", "Travel", "Art"],
    languages: ["English", "Hindi", "French"],
    city: "Delhi",
    lat: 28.6080,
    lng: 77.2010,
    bio: "Art gallery owner and literature lover. Seeking genuine friends for talks over tea.",
    imageUrl: MOCK_MALE_IMAGES[5]
  },

  // --- MUMBAI ---
  {
    fullName: "Rahul Khanna",
    username: "rahul_khanna",
    gender: "man",
    pronouns: "he/him",
    age: 32,
    identificationText: "Men",
    orientation: "Straight",
    hereToText: "Dating",
    likes: ["Film", "Outdoors", "Fitness"],
    languages: ["English", "Hindi"],
    city: "Mumbai",
    lat: 19.0760,
    lng: 72.8777,
    bio: "Assistant director in Bollywood. Fitness enthusiast who loves trekking and coastal drives.",
    imageUrl: MOCK_MALE_IMAGES[6]
  },
  {
    fullName: "Zara Ali",
    username: "zara_ali",
    gender: "woman",
    pronouns: "she/her",
    age: 29,
    identificationText: "Women",
    orientation: "Straight",
    hereToText: "Dating",
    likes: ["Fashion", "Photography", "Travel"],
    languages: ["English", "Hindi", "Spanish"],
    city: "Mumbai",
    lat: 19.0780,
    lng: 72.8820,
    bio: "Fashion model and traveler. Exploring cozy cafes, local beaches, and shooting creative portraits.",
    imageUrl: MOCK_FEMALE_IMAGES[6]
  },
  {
    fullName: "Morgan Taylor",
    username: "morgan_fluid",
    gender: "non-binary",
    pronouns: "they/them",
    age: 25,
    identificationText: "Non Binary",
    orientation: "Fluid",
    hereToText: "Community",
    likes: ["Books", "Art", "Film"],
    languages: ["English", "German"],
    city: "Mumbai",
    lat: 19.0820,
    lng: 72.8900,
    bio: "Literature researcher, cinephile, and local community volunteer. Let's share stories.",
    imageUrl: MOCK_NON_BINARY_IMAGES[4]
  },
  {
    fullName: "Tina Fernandes",
    username: "tina_f",
    gender: "woman",
    pronouns: "she/her",
    age: 26,
    identificationText: "Women",
    orientation: "Bisexual",
    hereToText: "Dating",
    likes: ["Music", "Dance", "Food"],
    languages: ["English", "Portuguese"],
    city: "Mumbai",
    lat: 19.0700,
    lng: 72.8600,
    bio: "Vocalist in a jazz band. Let's grab sushi and talk about music, gigs, and life.",
    imageUrl: MOCK_FEMALE_IMAGES[7]
  },

  // --- BANGALORE ---
  {
    fullName: "Siddharth Rao",
    username: "sid_tech",
    gender: "man",
    pronouns: "he/him",
    age: 27,
    identificationText: "Men",
    orientation: "Straight",
    hereToText: "Dating",
    likes: ["Gaming", "Fitness", "Travel"],
    languages: ["English", "Hindi", "Japanese"],
    city: "Bangalore",
    lat: 12.9716,
    lng: 77.5946,
    bio: "Software developer at a startup. Gaming stream viewer, gym goer, and road tripper. Let's code-meet!",
    imageUrl: MOCK_MALE_IMAGES[7]
  },
  {
    fullName: "Divya Hegde",
    username: "divya_hegde",
    gender: "woman",
    pronouns: "she/her",
    age: 24,
    identificationText: "Women",
    orientation: "Straight",
    hereToText: "Dating",
    likes: ["Art", "Food", "Books"],
    languages: ["English", "Hindi"],
    city: "Bangalore",
    lat: 12.9730,
    lng: 77.6010,
    bio: "UX designer who loves doodling in sketchbooks, coffee tasting, and checking out local bookstores.",
    imageUrl: MOCK_FEMALE_IMAGES[0]
  },
  {
    fullName: "Charlie Rose",
    username: "charlie_rose",
    gender: "non-binary",
    pronouns: "they/them",
    age: 29,
    identificationText: "Non Binary",
    orientation: "Asexual",
    hereToText: "Friendship",
    likes: ["Gaming", "Outdoors", "Books"],
    languages: ["English", "Spanish"],
    city: "Bangalore",
    lat: 12.9800,
    lng: 77.6100,
    bio: "Tabletop RPG game master, avid book reader, and weekend hiker. Looking for boardgame buddies.",
    imageUrl: MOCK_NON_BINARY_IMAGES[5]
  },
  {
    fullName: "Sanya Roy",
    username: "sanya_roy",
    gender: "woman",
    pronouns: "she/her",
    age: 52,
    identificationText: "Women",
    orientation: "Straight",
    hereToText: "Community",
    likes: ["Art", "Outdoors", "Photography"],
    languages: ["English", "Hindi"],
    city: "Bangalore",
    lat: 12.9650,
    lng: 77.5800,
    bio: "Florist and landscape photographer. Love outdoor gardens, local community events, and morning walks.",
    imageUrl: MOCK_FEMALE_IMAGES[1]
  },

  // --- NOIDA (Matches for logged-in user) ---
  {
    fullName: "Kavya Sharma",
    username: "kavya_sharma",
    gender: "woman",
    pronouns: "she/her",
    age: 24,
    identificationText: "Women",
    orientation: "Straight",
    hereToText: "Dating",
    likes: ["Music", "Food", "Travel"],
    languages: ["English", "Hindi"],
    city: "Noida",
    lat: 28.5708,
    lng: 77.3272,
    bio: "Living in Noida, exploring local coffee spots, and loving acoustic cover tracks.",
    imageUrl: MOCK_FEMALE_IMAGES[4]
  },
  {
    fullName: "Ishita Sen",
    username: "ishita_sen",
    gender: "woman",
    pronouns: "she/her",
    age: 26,
    identificationText: "Women",
    orientation: "Straight",
    hereToText: "Dating",
    likes: ["Art", "Fitness", "Outdoors"],
    languages: ["English", "Hindi"],
    city: "Noida",
    lat: 28.5800,
    lng: 77.3300,
    bio: "UX Researcher in Noida. Weekend runner, watercolor enthusiast, and chai lover.",
    imageUrl: MOCK_FEMALE_IMAGES[5]
  },
  {
    fullName: "Nisha Malhotra",
    username: "nisha_m",
    gender: "woman",
    pronouns: "she/her",
    age: 22,
    identificationText: "Women",
    orientation: "Bisexual",
    hereToText: "Dating",
    likes: ["Dance", "Fashion", "Music"],
    languages: ["English", "Hindi"],
    city: "Noida",
    lat: 28.5600,
    lng: 77.3200,
    bio: "Let's explore sector 18 cafes! Love dancing, styling outfits, and listening to indie pop.",
    imageUrl: MOCK_FEMALE_IMAGES[6]
  },
  {
    fullName: "Aman Verma",
    username: "aman_verma",
    gender: "man",
    pronouns: "he/him",
    age: 25,
    identificationText: "Men",
    orientation: "Straight",
    hereToText: "Dating",
    likes: ["Fitness", "Gaming", "Travel"],
    languages: ["English", "Hindi"],
    city: "Noida",
    lat: 28.5750,
    lng: 77.3400,
    bio: "Software developer in Noida. Gym goer and casual gamer. Let's hang out!",
    imageUrl: MOCK_MALE_IMAGES[0]
  },
  {
    fullName: "Rohan Kapoor",
    username: "rohan_kapoor",
    gender: "man",
    pronouns: "he/him",
    age: 29,
    identificationText: "Men",
    orientation: "Straight",
    hereToText: "Dating",
    likes: ["Travel", "Outdoors", "Photography"],
    languages: ["English", "Hindi"],
    city: "Noida",
    lat: 28.5900,
    lng: 77.3100,
    bio: "Travel guide and wildlife photographer. Looking for someone to travel with.",
    imageUrl: MOCK_MALE_IMAGES[1]
  },
  {
    fullName: "Sam Rose",
    username: "sam_rose",
    gender: "non-binary",
    pronouns: "they/them",
    age: 27,
    identificationText: "Non Binary",
    orientation: "Queer",
    hereToText: "Friendship",
    likes: ["Art", "Gaming", "Film"],
    languages: ["English", "Spanish"],
    city: "Noida",
    lat: 28.5500,
    lng: 77.3000,
    bio: "Let's grab a coffee and talk about game design or films. Based in Noida.",
    imageUrl: MOCK_NON_BINARY_IMAGES[6]
  }
];

// Helper to calculate DOB from age
function getDobFromAge(age) {
  const currentYear = new Date().getFullYear();
  const birthYear = currentYear - age;
  // Set date to June 1st of the birth year
  return new Date(`${birthYear}-06-01`);
}

async function seedDatingProfiles() {
  console.log('🚀 Starting seed process for Dating profiles...');
  try {
    await connectToDatabase();

    // 1. Clear existing seed users (we use +919000000XXX phone numbers)
    console.log('🧹 Clearing previous seed user profiles...');
    const deleteResult = await User.deleteMany({
      phoneNumber: { $regex: /^\+919000000\d{3}$/ }
    });
    console.log(`✅ Deleted ${deleteResult.deletedCount} old seed profiles.`);

    // 2. Generate and Insert new users
    console.log('🌱 Inserting 30 catalog-aligned seed profiles...');
    const usersToInsert = SEED_PROFILES.map((profile, index) => {
      const indexStr = String(index + 1).padStart(3, '0'); // e.g. "001", "002"
      
      const likesArray = profile.likes.map(like => ({
        icon: '',
        text: like
      }));

      const lookingForArray = [{
        icon: '',
        text: profile.hereToText
      }];

      const whatBringsArray = [{
        icon: '',
        text: profile.hereToText
      }];

      const identificationArray = [{
        icon: '',
        text: profile.identificationText
      }];

      return {
        phoneNumber: `+919000000${indexStr}`,
        countryCode: '+91',
        email: `${profile.username}@example.com`,
        username: profile.username,
        usernameNorm: profile.username.toLowerCase(),
        fullName: profile.fullName,
        dob: getDobFromAge(profile.age),
        bio: profile.bio,
        gender: profile.gender,
        pronouns: profile.pronouns,
        identification: identificationArray,
        orientation: profile.orientation,
        lookingFor: lookingForArray,
        whatBringsYouToVibgyor: whatBringsArray,
        likes: likesArray,
        preferences: profile.languages, // aligned with languages matching
        profilePictureUrl: profile.imageUrl,
        location: {
          city: profile.city,
          country: 'India',
          lat: profile.lat,
          lng: profile.lng
        },
        role: 'user',
        isProfileCompleted: true,
        profileCompletionStep: 'completed',
        isActive: true,
        verificationStatus: 'approved', // instantly show verified badge
        dating: {
          isDatingProfileActive: true,
          photos: [{
            url: profile.imageUrl,
            thumbnailUrl: profile.imageUrl,
            order: 0,
            uploadedAt: new Date()
          }],
          videos: [],
          preferences: {
            hereTo: profile.hereToText.toLowerCase(),
            wantToMeet: profile.gender === 'man' ? 'woman' : profile.gender === 'woman' ? 'man' : 'everyone',
            orientation: profile.orientation,
            interests: profile.likes[0],
            ageRange: {
              min: 18,
              max: 60
            },
            languages: profile.languages,
            location: {
              city: profile.city,
              country: 'India'
            },
            distanceRange: {
              min: 0,
              max: 100
            }
          }
        }
      };
    });

    const createdUsers = await User.insertMany(usersToInsert);
    console.log(`🎉 Successfully seeded ${createdUsers.length} dating profiles into database!`);

    // 3. Print out summaries of profiles by city
    const stats = {};
    createdUsers.forEach(u => {
      stats[u.location.city] = (stats[u.location.city] || 0) + 1;
    });
    console.log('\n📊 Seeding summary by city:');
    Object.entries(stats).forEach(([city, count]) => {
      console.log(`   📍 ${city}: ${count} profiles`);
    });

    console.log('\n🌟 Ready for filter testing:');
    console.log('   - 12 profiles located in Rampur (matching local feed queries)');
    console.log('   - Diverse genders: Men, Women, Non Binary');
    console.log('   - Diverse orientations: Straight, Gay, Lesbian, Bisexual, Pansexual, Queer, Fluid, Asexual');
    console.log('   - Diverse hereTo options matching catalogs: Dating, Friendship, Community, Networking, Exploration, Support');
    console.log('   - Clean placeholder image assets attached to all cards');
    
  } catch (error) {
    console.error('❌ Error during seeding:', error);
  } finally {
    await disconnectFromDatabase();
  }
}

// Run if called directly
if (require.main === module) {
  seedDatingProfiles()
    .then(() => {
      console.log('\n✅ Seeding script finished successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Seeding script failed:', error);
      process.exit(1);
    });
}

module.exports = seedDatingProfiles;
