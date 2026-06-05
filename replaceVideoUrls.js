const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Post = require('./src/modules/social/post/post.model');
const Story = require('./src/modules/social/story/story.model');

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

// 40-second video URLs (shorter videos)
const SHORT_VIDEO_URLS = [
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreet.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/VolkswagenGTIReview.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WhatCarCanYouGetForAGrand.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4'
];

const VIDEO_THUMBNAILS = [
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1080&h=1920&fit=crop',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=1080&h=1920&fit=crop',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=1080&h=1920&fit=crop',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=1080&h=1920&fit=crop',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=1080&h=1920&fit=crop',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=1080&h=1920&fit=crop',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=1080&h=1920&fit=crop',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=1080&h=1920&fit=crop',
  'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=1080&h=1920&fit=crop',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=1080&h=1920&fit=crop'
];

// Utility functions
const getRandomElement = (array) => array[Math.floor(Math.random() * array.length)];

// Replace video URLs in posts
const replacePostVideoUrls = async () => {
  console.log('\n📝 Replacing video URLs in posts...\n');
  
  try {
    // Find all posts with videos
    const posts = await Post.find({
      'media.type': 'video',
      status: 'published'
    });
    
    console.log(`✅ Found ${posts.length} posts with videos\n`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    
    for (let i = 0; i < posts.length; i++) {
      const post = posts[i];
      let hasChanges = false;
      
      try {
        // Update media array
        if (post.media && Array.isArray(post.media)) {
          for (let j = 0; j < post.media.length; j++) {
            const mediaItem = post.media[j];
            
            if (mediaItem.type === 'video' && mediaItem.url) {
              // Replace with random short video URL
              const newVideoUrl = getRandomElement(SHORT_VIDEO_URLS);
              const newThumbnail = getRandomElement(VIDEO_THUMBNAILS);
              
              // Only update if URL is different
              if (mediaItem.url !== newVideoUrl) {
                mediaItem.url = newVideoUrl;
                mediaItem.thumbnail = mediaItem.thumbnail || newThumbnail;
                mediaItem.duration = 40; // Set duration to 40 seconds
                hasChanges = true;
              }
            }
          }
        }
        
        if (hasChanges) {
          await post.save();
          updatedCount++;
          
          if ((i + 1) % 10 === 0) {
            console.log(`   ✅ Updated ${i + 1}/${posts.length} posts...`);
          }
        } else {
          skippedCount++;
        }
      } catch (error) {
        console.error(`   ❌ Error updating post ${post._id}:`, error.message);
        skippedCount++;
      }
    }
    
    console.log(`\n📊 Post Update Summary:`);
    console.log(`   ✅ Updated: ${updatedCount} posts`);
    console.log(`   ⏭️  Skipped: ${skippedCount} posts`);
    console.log(`   📝 Total: ${posts.length} posts processed\n`);
    
    return { updated: updatedCount, skipped: skippedCount, total: posts.length };
    
  } catch (error) {
    console.error('❌ Error replacing post video URLs:', error);
    throw error;
  }
};

// Replace video URLs in stories
const replaceStoryVideoUrls = async () => {
  console.log('\n📖 Replacing video URLs in stories...\n');
  
  try {
    // Find all stories with videos
    const stories = await Story.find({
      'media.type': 'video',
      status: 'active'
    });
    
    console.log(`✅ Found ${stories.length} stories with videos\n`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    
    for (let i = 0; i < stories.length; i++) {
      const story = stories[i];
      let hasChanges = false;
      
      try {
        // Update media object
        if (story.media && story.media.type === 'video' && story.media.url) {
          // Replace with random short video URL
          const newVideoUrl = getRandomElement(SHORT_VIDEO_URLS);
          const newThumbnail = getRandomElement(VIDEO_THUMBNAILS);
          
          // Only update if URL is different
          if (story.media.url !== newVideoUrl) {
            story.media.url = newVideoUrl;
            story.media.thumbnail = story.media.thumbnail || newThumbnail;
            story.media.duration = 40; // Set duration to 40 seconds
            hasChanges = true;
          }
        }
        
        if (hasChanges) {
          await story.save();
          updatedCount++;
          
          if ((i + 1) % 10 === 0) {
            console.log(`   ✅ Updated ${i + 1}/${stories.length} stories...`);
          }
        } else {
          skippedCount++;
        }
      } catch (error) {
        console.error(`   ❌ Error updating story ${story._id}:`, error.message);
        skippedCount++;
      }
    }
    
    console.log(`\n📊 Story Update Summary:`);
    console.log(`   ✅ Updated: ${updatedCount} stories`);
    console.log(`   ⏭️  Skipped: ${skippedCount} stories`);
    console.log(`   📖 Total: ${stories.length} stories processed\n`);
    
    return { updated: updatedCount, skipped: skippedCount, total: stories.length };
    
  } catch (error) {
    console.error('❌ Error replacing story video URLs:', error);
    throw error;
  }
};

// Main function
const replaceAllVideoUrls = async () => {
  try {
    console.log('\n🚀 Starting Video URL Replacement Script...\n');
    console.log('='.repeat(70));
    console.log('📋 This script will replace all video URLs with 40-second videos');
    console.log('='.repeat(70));
    
    // Replace in posts
    const postResults = await replacePostVideoUrls();
    
    // Replace in stories
    const storyResults = await replaceStoryVideoUrls();
    
    // Final summary
    console.log('='.repeat(70));
    console.log('\n🎉 Video URL replacement completed!\n');
    console.log('📊 Final Statistics:\n');
    console.log(`   📝 Posts:`);
    console.log(`      ✅ Updated: ${postResults.updated}`);
    console.log(`      ⏭️  Skipped: ${postResults.skipped}`);
    console.log(`      📊 Total: ${postResults.total}`);
    console.log(`   📖 Stories:`);
    console.log(`      ✅ Updated: ${storyResults.updated}`);
    console.log(`      ⏭️  Skipped: ${storyResults.skipped}`);
    console.log(`      📊 Total: ${storyResults.total}`);
    console.log(`\n   🎬 All videos set to 40 seconds duration`);
    console.log(`   🔗 Using shorter video URLs for better performance\n`);
    
  } catch (error) {
    console.error('\n❌ Replacement failed:', error);
    console.error('Error details:', error.message);
    console.error('Stack:', error.stack);
    throw error;
  }
};

// Main execution
const main = async () => {
  try {
    await connectDB();
    await replaceAllVideoUrls();
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

module.exports = { replaceAllVideoUrls, replacePostVideoUrls, replaceStoryVideoUrls };




