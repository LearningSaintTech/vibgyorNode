const Story = require('../userModel/storyModel');
const User = require('../userModel/userAuthModel');
const ApiResponse = require('../../utils/apiResponse');
const { uploadToS3, deleteFromS3 } = require('../../services/s3Service');
const contentModeration = require('../userModel/contentModerationModel');

// Create a new story
async function createStory(req, res) {
  try {
    const { 
      content, 
      privacy = 'public',
      closeFriends = [],
      mentions = []
    } = req.body;
    
    const userId = req.user?.userId;

    if (!content && (!req.files || req.files.length === 0)) {
      return ApiResponse.badRequest(res, 'Story content or media is required');
    }

    // Process media files
    let media = null;
    if (req.files && req.files.length > 0) {
      const file = req.files[0]; // Stories typically have single media
      try {
        // Upload to S3
        const uploadResult = await uploadToS3({
          buffer: file.buffer,
          contentType: file.mimetype,
          userId: userId,
          category: 'stories',
          type: file.mimetype.startsWith('image/') ? 'image' : 'video',
          filename: file.originalname,
          metadata: {
            originalName: file.originalname,
            uploadedAt: new Date().toISOString()
          }
        });

        media = {
          type: uploadResult.type,
          url: uploadResult.url,
          thumbnail: uploadResult.thumbnail || null,
          filename: file.originalname,
          fileSize: file.size,
          mimeType: file.mimetype,
          duration: uploadResult.duration || null,
          dimensions: uploadResult.dimensions || null,
          s3Key: uploadResult.key
        };
      } catch (uploadError) {
        console.error('[STORY] Media upload error:', uploadError);
        return ApiResponse.serverError(res, 'Failed to upload media');
      }
    } else if (content) {
      // Text-only story
      media = {
        type: 'text',
        url: '', // No URL for text stories
        thumbnail: null,
        filename: 'text-story',
        fileSize: content.length,
        mimeType: 'text/plain',
        duration: null,
        dimensions: null,
        s3Key: 'text-story'
      };
    }

    // Process mentions
    const processedMentions = [];
    if (mentions && Array.isArray(mentions)) {
      processedMentions.push(...mentions);
    }

    // Extract mentions from content
    const contentMentions = content ? content.match(/@\w+/g) || [] : [];
    for (const mention of contentMentions) {
      const username = mention.replace('@', '').trim();
      const user = await User.findOne({ username: username });
      if (user && !processedMentions.find(m => m.user.toString() === user._id.toString())) {
        processedMentions.push({
          user: user._id,
          position: {
            start: content.indexOf(mention),
            end: content.indexOf(mention) + mention.length
          },
          notified: false
        });
      }
    }

    // Create story data
    const storyData = {
      author: userId,
      content: content || '',
      media: media,
      privacy,
      mentions: processedMentions
    };

    if (closeFriends && closeFriends.length > 0) {
      storyData.closeFriends = closeFriends;
    }

    const story = new Story(storyData);
    await story.save();

    // Populate author information
    await story.populate('author', 'username fullName profilePictureUrl isVerified');

    // Create content moderation record
    try {
      await contentModeration.createModerationRecord('story', story._id, {
        author: userId,
        text: content || '',
        media: [media],
        hashtags: [],
        mentions: processedMentions.map(m => m.user.toString())
      });
    } catch (moderationError) {
      console.error('[STORY] Content moderation error:', moderationError);
      // Don't fail the story creation if moderation fails
    }

    console.log('[STORY] Story created successfully:', story._id);
    return ApiResponse.success(res, story, 'Story created successfully');
  } catch (error) {
    console.error('[STORY] Create story error:', error);
    return ApiResponse.serverError(res, 'Failed to create story');
  }
}

// Get user's stories
async function getUserStories(req, res) {
  try {
    const { userId } = req.params;
    const { includeExpired = false } = req.query;
    const currentUserId = req.user?.userId;

    // If viewing own stories, include expired ones
    let includeExpiredStories = includeExpired;
    if (userId === currentUserId) {
      includeExpiredStories = true;
    }

    const stories = await Story.getUserStories(userId, includeExpiredStories);

    // Add hasViewed flag to each story
    const storiesWithViewedFlag = stories.map(story => {
      const storyObj = story.toObject();
      const hasViewed = story.views.some(view => view.user.toString() === currentUserId);
      storyObj.hasViewed = hasViewed;
      return storyObj;
    });

    return ApiResponse.success(res, {
      stories: storiesWithViewedFlag,
      totalStories: storiesWithViewedFlag.length
    }, 'User stories retrieved successfully');
  } catch (error) {
    console.error('[STORY] Get user stories error:', error);
    return ApiResponse.serverError(res, 'Failed to get user stories');
  }
}

// Get stories feed
async function getStoriesFeed(req, res) {
  try {
    const { page = 1, limit = 20 } = req.query;
    const userId = req.user?.userId;

    // Get user's following and close friends
    const user = await User.findById(userId).select('following closeFriends');
    const followingIds = user?.following || [];
    const closeFriendsIds = user?.closeFriends || [];

    const stories = await Story.find({
      status: 'active',
      expiresAt: { $gt: new Date() },
      $or: [
        { privacy: 'public' },
        { privacy: 'followers', author: { $in: followingIds } },
        { privacy: 'close_friends', author: { $in: closeFriendsIds } }
      ]
    })
    .populate('author', 'username fullName profilePictureUrl isVerified')
    .populate('mentions.user', 'username fullName profilePictureUrl')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

    // Add hasViewed flag to each story and group by author
    const groupedStories = {};
    stories.forEach(story => {
      const storyObj = story.toObject();
      
      // Check if current user has viewed this story
      const hasViewed = story.views.some(view => view.user.toString() === userId);
      storyObj.hasViewed = hasViewed;
      
      const authorId = story.author._id.toString();
      if (!groupedStories[authorId]) {
        groupedStories[authorId] = {
          author: story.author,
          stories: [],
          hasUnviewedStories: false
        };
      }
      
      groupedStories[authorId].stories.push(storyObj);
      
      // Track if this author has any unviewed stories
      if (!hasViewed) {
        groupedStories[authorId].hasUnviewedStories = true;
      }
    });

    return ApiResponse.success(res, {
      storiesFeed: Object.values(groupedStories),
      totalAuthors: Object.keys(groupedStories).length
    }, 'Stories feed retrieved successfully');
  } catch (error) {
    console.error('[STORY] Get stories feed error:', error);
    return ApiResponse.serverError(res, 'Failed to get stories feed');
  }
}

// Get single story
async function getStory(req, res) {
  try {
    const { storyId } = req.params;
    const userId = req.user?.userId;

    const story = await Story.findById(storyId)
      .populate('author', 'username fullName profilePictureUrl isVerified')
      .populate('mentions.user', 'username fullName profilePictureUrl');

    if (!story) {
      return ApiResponse.notFound(res, 'Story not found');
    }

    // Check if story is expired
    if (story.expiresAt < new Date()) {
      return ApiResponse.badRequest(res, 'Story has expired');
    }

    // Check privacy
    if (story.privacy === 'private' && story.author._id.toString() !== userId) {
      return ApiResponse.forbidden(res, 'You cannot view this story');
    }

    // Add view if user is not the author
    if (story.author._id.toString() !== userId) {
      await story.addView(userId);
    }

    // Add hasViewed flag
    const storyObj = story.toObject();
    const hasViewed = story.views.some(view => view.user.toString() === userId);
    storyObj.hasViewed = hasViewed;

    return ApiResponse.success(res, storyObj, 'Story retrieved successfully');
  } catch (error) {
    console.error('[STORY] Get story error:', error);
    return ApiResponse.serverError(res, 'Failed to get story');
  }
}

// Delete story
async function deleteStory(req, res) {
  try {
    const { storyId } = req.params;
    const userId = req.user?.userId;

    const story = await Story.findById(storyId);
    if (!story) {
      return ApiResponse.notFound(res, 'Story not found');
    }

    // Check if user is the author
    if (story.author.toString() !== userId) {
      return ApiResponse.forbidden(res, 'You can only delete your own stories');
    }

    // Delete media files from S3 if not text story
    if (story.media.s3Key !== 'text-story') {
      try {
        await deleteFromS3(story.media.s3Key);
      } catch (deleteError) {
        console.error('[STORY] Error deleting media from S3:', deleteError);
      }
    }

    // Soft delete the story
    story.status = 'deleted';
    await story.save();

    console.log('[STORY] Story deleted successfully:', storyId);
    return ApiResponse.success(res, null, 'Story deleted successfully');
  } catch (error) {
    console.error('[STORY] Delete story error:', error);
    return ApiResponse.serverError(res, 'Failed to delete story');
  }
}

// Reply to story
async function replyToStory(req, res) {
  try {
    const { storyId } = req.params;
    const { content, isDirectMessage = true } = req.body;
    const userId = req.user?.userId;

    if (!content || content.trim().length === 0) {
      return ApiResponse.badRequest(res, 'Reply content is required');
    }

    const story = await Story.findById(storyId);
    if (!story) {
      return ApiResponse.notFound(res, 'Story not found');
    }

    if (story.expiresAt < new Date()) {
      return ApiResponse.badRequest(res, 'Story has expired');
    }

    await story.addReply(userId, content.trim(), isDirectMessage);

    console.log('[STORY] Reply added successfully');
    return ApiResponse.success(res, {
      replies: story.replies,
      repliesCount: story.analytics.repliesCount
    }, 'Reply added successfully');
  } catch (error) {
    console.error('[STORY] Reply to story error:', error);
    return ApiResponse.serverError(res, 'Failed to reply to story');
  }
}

// Report story
async function reportStory(req, res) {
  try {
    const { storyId } = req.params;
    const { reason, description = '' } = req.body;
    const userId = req.user?.userId;

    if (!reason) {
      return ApiResponse.badRequest(res, 'Report reason is required');
    }

    const story = await Story.findById(storyId);
    if (!story) {
      return ApiResponse.notFound(res, 'Story not found');
    }

    // Check if user already reported this story
    const existingReport = story.reports.find(report => report.user.toString() === userId);
    if (existingReport) {
      return ApiResponse.badRequest(res, 'You have already reported this story');
    }

    await story.reportStory(userId, reason, description);

    console.log('[STORY] Story reported successfully');
    return ApiResponse.success(res, null, 'Story reported successfully');
  } catch (error) {
    console.error('[STORY] Report story error:', error);
    return ApiResponse.serverError(res, 'Failed to report story');
  }
}

// Get story analytics
async function getStoryAnalytics(req, res) {
  try {
    const { storyId } = req.params;
    const userId = req.user?.userId;

    const story = await Story.findById(storyId);
    if (!story) {
      return ApiResponse.notFound(res, 'Story not found');
    }

    // Check if user is the author
    if (story.author.toString() !== userId) {
      return ApiResponse.forbidden(res, 'You can only view analytics for your own stories');
    }

    const analytics = {
      views: story.analytics.viewsCount,
      replies: story.analytics.repliesCount,
      shares: story.analytics.sharesCount,
      engagementRate: story.engagementRate,
      timeRemaining: story.timeRemaining,
      createdAt: story.createdAt,
      expiresAt: story.expiresAt
    };

    return ApiResponse.success(res, analytics, 'Story analytics retrieved successfully');
  } catch (error) {
    console.error('[STORY] Get analytics error:', error);
    return ApiResponse.serverError(res, 'Failed to get story analytics');
  }
}

// Search stories by hashtag
async function getStoriesByHashtag(req, res) {
  try {
    const { hashtag } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const userId = req.user?.userId;

    if (!hashtag) {
      return ApiResponse.badRequest(res, 'Hashtag is required');
    }

    const stories = await Story.getStoriesByHashtag(hashtag, parseInt(page), parseInt(limit));

    // Add hasViewed flag to each story
    const storiesWithViewedFlag = stories.map(story => {
      const storyObj = story.toObject();
      const hasViewed = story.views.some(view => view.user.toString() === userId);
      storyObj.hasViewed = hasViewed;
      return storyObj;
    });

    const totalStories = await Story.countDocuments({
      status: 'active',
      expiresAt: { $gt: new Date() },
      privacy: 'public',
      content: { $regex: `#${hashtag}`, $options: 'i' }
    });

    return ApiResponse.success(res, {
      stories: storiesWithViewedFlag,
      hashtag,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalStories / limit),
        totalStories,
        hasNext: page * limit < totalStories,
        hasPrev: page > 1
      }
    }, 'Hashtag stories retrieved successfully');
  } catch (error) {
    console.error('[STORY] Get stories by hashtag error:', error);
    return ApiResponse.serverError(res, 'Failed to get stories by hashtag');
  }
}

module.exports = {
  // Basic CRUD
  createStory,
  getUserStories,
  getStoriesFeed,
  getStory,
  deleteStory,
  
  // Engagement
  replyToStory,
  
  // Discovery & Analytics
  reportStory,
  getStoryAnalytics,
  getStoriesByHashtag
};
