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

// Get user's stories (Instagram-like: Account privacy only)
async function getUserStories(req, res) {
  try {
    const { userId } = req.params;
    const { includeExpired = false } = req.query;
    const currentUserId = req.user?.userId;

    console.log('[STORY] Get user stories - START:', { 
      targetUserId: userId, 
      currentUserId,
      includeExpired 
    });

    // Get the story author's profile to check privacy settings
    const author = await User.findById(userId).select('privacySettings followers username fullName');
    if (!author) {
      console.log('[STORY] Target user not found:', userId);
      return ApiResponse.notFound(res, 'User not found');
    }

    console.log('[STORY] Target user found:', {
      userId: author._id,
      username: author.username,
      fullName: author.fullName,
      hasPrivacySettings: !!author.privacySettings,
      followersCount: author.followers?.length || 0
    });

    // Check privacy permissions
    const isOwnStories = userId === currentUserId;
    const isPrivateAccount = author.privacySettings?.isPrivate || false;
    const isFollowing = author.followers?.some(followerId => followerId.toString() === currentUserId);

    console.log('[STORY] Privacy check:', {
      targetUser: author.username || author.fullName || 'Unknown',
      isOwnStories,
      isPrivateAccount,
      isFollowing,
      followersCount: author.followers?.length || 0
    });

    // Instagram-like account privacy check:
    // - If own stories → always allow
    // - If PUBLIC account → allow everyone
    // - If PRIVATE account → only allow followers
    if (!isOwnStories && isPrivateAccount && !isFollowing) {
      console.log('[STORY] Private account - access denied');
      return ApiResponse.forbidden(res, 'This account is private. Follow to see their stories.');
    }

    // If viewing own stories, include expired ones
    let includeExpiredStories = includeExpired;
    if (isOwnStories) {
      includeExpiredStories = true;
    }

    console.log('[STORY] Fetching stories with includeExpired:', includeExpiredStories);

    // Debug: Check what stories exist for this user
    const allStoriesForUser = await Story.find({ author: userId });
    console.log('[STORY] DEBUG - Total stories for user (any status):', allStoriesForUser.length);
    if (allStoriesForUser.length > 0) {
      console.log('[STORY] DEBUG - Sample story:', {
        status: allStoriesForUser[0].status,
        expiresAt: allStoriesForUser[0].expiresAt,
        now: new Date(),
        isExpired: allStoriesForUser[0].expiresAt < new Date()
      });
    }

    const stories = await Story.getUserStories(userId, includeExpiredStories);

    console.log('[STORY] Stories fetched from model:', stories.length);

    // Add hasViewed flag to each story
    const storiesWithViewedFlag = stories.map(story => {
      const storyObj = story.toObject();
      const hasViewed = story.views.some(view => view.user.toString() === currentUserId);
      storyObj.hasViewed = hasViewed;
      return storyObj;
    });

    console.log('[STORY] User stories retrieved successfully:', { 
      targetUser: author.username,
      totalStories: storiesWithViewedFlag.length,
      isPrivateAccount,
      isFollowing,
      hasAccess: true 
    });

    return ApiResponse.success(res, {
      stories: storiesWithViewedFlag,
      totalStories: storiesWithViewedFlag.length,
      isPrivateAccount: isPrivateAccount
    }, 'User stories retrieved successfully');
  } catch (error) {
    console.error('[STORY] Get user stories error:', error);
    return ApiResponse.serverError(res, 'Failed to get user stories');
  }
}

// Get stories feed (Instagram-like: ONLY from followed users)
async function getStoriesFeed(req, res) {
  try {
    const { page = 1, limit = 20 } = req.query;
    const userId = req.user?.userId;

    console.log('[STORY] Get stories feed - START:', { userId });

    // Get user's following list
    const user = await User.findById(userId).select('following');
    if (!user) {
      console.log('[STORY] User not found');
      return ApiResponse.notFound(res, 'User not found');
    }

    const followingIds = user.following || [];
    console.log('[STORY] Following count:', followingIds.length);

    // If not following anyone, return empty feed
    if (followingIds.length === 0) {
      console.log('[STORY] User is not following anyone');
      return ApiResponse.success(res, {
        storiesFeed: [],
        totalAuthors: 0
      }, 'No stories available - not following anyone');
    }

    // Debug: Check what stories exist for followed users
    const allStoriesFromFollowedUsers = await Story.find({
      author: { $in: followingIds }
    });
    console.log('[STORY] DEBUG - Total stories from followed users (any status):', allStoriesFromFollowedUsers.length);
    if (allStoriesFromFollowedUsers.length > 0) {
      const sampleStory = allStoriesFromFollowedUsers[0];
      console.log('[STORY] DEBUG - Sample story from followed user:', {
        author: sampleStory.author,
        status: sampleStory.status,
        expiresAt: sampleStory.expiresAt,
        now: new Date(),
        isExpired: sampleStory.expiresAt < new Date()
      });
    }

    // Instagram-like behavior: Get ONLY stories from people the user is following
    // Account privacy is checked when viewing individual stories, not in feed query
    const stories = await Story.find({
      status: 'active',
      expiresAt: { $gt: new Date() },
      author: { $in: followingIds }  // Simple: Only from followed users
    })
    .populate('author', 'username fullName profilePictureUrl isVerified privacySettings')
    .populate('mentions.user', 'username fullName profilePictureUrl isVerified')
    .populate('views.user', 'username fullName profilePictureUrl isVerified')
    .populate('replies.user', 'username fullName profilePictureUrl isVerified')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

    console.log('[STORY] Stories found from followed users:', stories.length);

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

    console.log('[STORY] Stories feed ready:', {
      totalAuthors: Object.keys(groupedStories).length,
      authors: Object.keys(groupedStories).map(id => groupedStories[id].author.username)
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

// Get single story (Instagram-like: Account privacy only)
async function getStory(req, res) {
  try {
    const { storyId } = req.params;
    const userId = req.user?.userId;

    console.log('[STORY] Get story - START:', { storyId, userId });

    const story = await Story.findById(storyId)
      .populate('author', 'username fullName profilePictureUrl isVerified privacySettings followers')
      .populate('mentions.user', 'username fullName profilePictureUrl isVerified')
      .populate('views.user', 'username fullName profilePictureUrl isVerified')
      .populate('replies.user', 'username fullName profilePictureUrl isVerified');

    if (!story) {
      return ApiResponse.notFound(res, 'Story not found');
    }

    // Check if story is expired
    if (story.expiresAt < new Date()) {
      return ApiResponse.badRequest(res, 'Story has expired');
    }

    const isOwnStory = story.author._id.toString() === userId;
    const isPrivateAccount = story.author.privacySettings?.isPrivate || false;
    const isFollowing = story.author.followers?.some(followerId => followerId.toString() === userId);

    console.log('[STORY] Privacy check:', {
      isOwnStory,
      isPrivateAccount,
      isFollowing
    });

    // Instagram-like account privacy check:
    // - If own story → always allow
    // - If PUBLIC account → allow everyone
    // - If PRIVATE account → only allow followers
    if (!isOwnStory && isPrivateAccount && !isFollowing) {
      console.log('[STORY] Private account - access denied');
      return ApiResponse.forbidden(res, 'This account is private. Follow to see their stories.');
    }

    // Add hasViewed flag
    const storyObj = story.toObject();
    const hasViewed = story.views.some(view => view.user.toString() === userId);
    storyObj.hasViewed = hasViewed;

    console.log('[STORY] Story retrieved successfully:', {
      storyId: story._id,
      author: story.author.username,
      isPrivateAccount,
      isFollowing,
      hasAccess: true
    });

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

    // Fetch story again with populated replies
    const updatedStory = await Story.findById(storyId)
      .populate('replies.user', 'username fullName profilePictureUrl isVerified');

    console.log('[STORY] Reply added successfully');
    return ApiResponse.success(res, {
      replies: updatedStory.replies,
      repliesCount: updatedStory.analytics.repliesCount
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

// Track story view (Instagram-like: Account privacy only)
async function trackStoryView(req, res) {
  try {
    const { storyId } = req.params;
    const userId = req.user?.userId;

    console.log('[STORY] Track story view - START:', { storyId, userId });

    const story = await Story.findById(storyId)
      .populate('author', 'privacySettings followers username');
      
    if (!story) {
      return ApiResponse.notFound(res, 'Story not found');
    }

    // Check if story is expired
    if (story.expiresAt < new Date()) {
      return ApiResponse.badRequest(res, 'Story has expired');
    }

    const isOwnStory = story.author._id.toString() === userId;
    const isPrivateAccount = story.author.privacySettings?.isPrivate || false;
    const isFollowing = story.author.followers?.some(followerId => followerId.toString() === userId);

    console.log('[STORY] View tracking privacy check:', {
      storyAuthor: story.author.username,
      isOwnStory,
      isPrivateAccount,
      isFollowing
    });

    // Instagram-like account privacy check:
    // - If own story → can't track own views
    // - If PUBLIC account → anyone can view and track
    // - If PRIVATE account → only followers can view and track
    if (!isOwnStory && isPrivateAccount && !isFollowing) {
      console.log('[STORY] Private account - cannot track view');
      return ApiResponse.forbidden(res, 'This account is private. Follow to view their stories.');
    }

    // Check if user is the author (don't track views for author)
    if (isOwnStory) {
      return ApiResponse.badRequest(res, 'Cannot track view for your own story');
    }

    // Check if user already viewed this story
    const hasAlreadyViewed = story.views.some(view => view.user.toString() === userId);

    if (hasAlreadyViewed) {
      console.log('[STORY] User already viewed this story');
      return ApiResponse.success(res, {
        viewsCount: story.analytics.viewsCount,
        hasViewed: true,
        message: 'You have already viewed this story'
      }, 'Story view already recorded');
    }

    // Add view (this automatically checks for duplicates and updates count)
    await story.addView(userId);

    console.log('[STORY] Story view tracked successfully:', {
      storyId: story._id,
      storyAuthor: story.author.username,
      viewsCount: story.analytics.viewsCount,
      isPrivateAccount,
      isFollowing
    });

    return ApiResponse.success(res, {
      viewsCount: story.analytics.viewsCount,
      hasViewed: true
    }, 'Story view tracked successfully');
  } catch (error) {
    console.error('[STORY] Track story view error:', error);
    return ApiResponse.serverError(res, 'Failed to track story view');
  }
}

// Get story views (who viewed the story)
async function getStoryViews(req, res) {
  try {
    const { storyId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const userId = req.user?.userId;

    console.log('[STORY] Get story views:', { storyId, userId });

    const story = await Story.findById(storyId)
      .populate('views.user', 'username fullName profilePictureUrl isVerified')
      .populate('author', 'username fullName');

    if (!story) {
      return ApiResponse.notFound(res, 'Story not found');
    }

    // Check if user is the author (only author can see who viewed)
    if (story.author._id.toString() !== userId) {
      return ApiResponse.forbidden(res, 'Only the story author can view who viewed the story');
    }

    // Paginate views
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const totalViews = story.views.length;
    const paginatedViews = story.views.slice(skip, skip + parseInt(limit));

    // Format views data
    const viewsData = paginatedViews.map(view => ({
      user: {
        id: view.user._id,
        username: view.user.username,
        fullName: view.user.fullName,
        profilePictureUrl: view.user.profilePictureUrl,
        isVerified: view.user.isVerified
      },
      viewedAt: view.viewedAt,
      viewDuration: view.viewDuration
    }));

    console.log('[STORY] Story views retrieved:', {
      storyId: story._id,
      totalViews: totalViews
    });

    return ApiResponse.success(res, {
      views: viewsData,
      totalViews: totalViews,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalViews / parseInt(limit)),
        hasNext: (page * limit) < totalViews,
        hasPrev: page > 1
      }
    }, 'Story views retrieved successfully');
  } catch (error) {
    console.error('[STORY] Get story views error:', error);
    return ApiResponse.serverError(res, 'Failed to get story views');
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
  trackStoryView,
  getStoryViews,
  
  // Discovery & Analytics
  reportStory,
  getStoryAnalytics,
  getStoriesByHashtag
};
