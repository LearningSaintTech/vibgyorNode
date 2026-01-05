const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const DatingMatch = require('./src/user/dating/models/datingMatchModel');
const DatingChat = require('./src/user/dating/models/datingChatModel');

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

// Create chats for existing matches
const createChatsForMatches = async () => {
  try {
    console.log('🔍 Finding all active dating matches...');
    
    // Find all active matches
    const matches = await DatingMatch.find({ status: 'active' }).lean();
    console.log(`📊 Found ${matches.length} active matches`);
    
    if (matches.length === 0) {
      console.log('⚠️ No active matches found. You need to create matches first.');
      console.log('💡 Tip: Run the seed script (node socialSeed.js) to create matches and chats.');
      return;
    }
    
    console.log('💬 Creating chats for matches...');
    let chatsCreated = 0;
    let chatsSkipped = 0;
    
    for (const match of matches) {
      try {
        // Check if chat already exists
        const existingChat = await DatingChat.findOne({ matchId: match._id });
        
        if (existingChat) {
          console.log(`   ⏭️  Chat already exists for match ${match._id}`);
          chatsSkipped++;
          continue;
        }
        
        // Create chat using the model's static method
        const chat = await DatingChat.findOrCreateByMatch(match._id, match.userA);
        chatsCreated++;
        
        if (chatsCreated % 10 === 0) {
          console.log(`   ✅ Created ${chatsCreated} chats...`);
        }
      } catch (error) {
        console.error(`   ❌ Error creating chat for match ${match._id}:`, error.message);
        chatsSkipped++;
        continue;
      }
    }
    
    console.log(`\n✅ Successfully created ${chatsCreated} dating chats`);
    console.log(`⏭️  Skipped ${chatsSkipped} matches (chats already exist or errors)`);
    console.log(`📊 Total matches processed: ${matches.length}`);
    
  } catch (error) {
    console.error('❌ Error creating chats:', error);
    throw error;
  }
};

// Run script
const run = async () => {
  try {
    await connectDB();
    await createChatsForMatches();
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Script failed:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Execute
if (require.main === module) {
  run();
}

module.exports = { createChatsForMatches, run };



