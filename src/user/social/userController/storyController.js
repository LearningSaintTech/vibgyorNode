const mongoose = require('mongoose');
const Story = require('../userModel/storyModel');
const User = require('../../auth/model/userAuthModel');
const ApiResponse = require('../../../utils/apiResponse');
const { uploadToS3, deleteFromS3 } = require('../../../services/s3Service');
const contentModeration = require('../userModel/contentModerationModel');
const { getCachedUserData, cacheUserData, invalidateUserCache } = require('../../../middleware/cacheMiddleware');

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
          s3Key: uploadResult.key,
          // OPTIMIZED: Add BlurHash and responsive URLs for better frontend performance
          blurhash: uploadResult.blurhash || null, // BlurHash for instant placeholders
          responsiveUrls: uploadResult.responsiveUrls || null // Multiple sizes for images
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

    // OPTIMIZED: Invalidate feed cache when new story is created
    // Invalidate cache for the story author
    invalidateUserCache(userId, 'feed:stories:*');
    
    // CRITICAL: Invalidate cache for all followers so they see the new story immediately
    try {
      const author = await User.findById(userId).select('followers').lean();
      if (author && author.followers && author.followers.length > 0) {
        console.log('[STORY] Invalidating cache for', author.followers.length, 'followers');
        // Invalidate cache for each follower
        author.followers.forEach(followerId => {
          invalidateUserCache(followerId.toString(), 'feed:stories:*');
        });
        console.log('[STORY] Cache invalidated for all followers');
      }
    } catch (cacheError) {
      console.error('[STORY] Error invalidating follower caches:', cacheError);
      // Don't fail story creation if cache invalidation fails
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

    const stories = await Story.getUserStories(userId, includeExpiredStories);

    console.log('[STORY] Stories fetched from model:', stories.length);

    // Add hasViewed flag to each story
    const storiesWithViewedFlag = stories.map(story => {
      const storyObj = story.toObject();
      // Handle both populated and unpopulated view.user cases
      const hasViewed = story.views.some(view => {
        const viewUserId = (view.user._id || view.user).toString();
        return viewUserId === currentUserId.toString();
      });
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

    // OPTIMIZED: Cache feed results for 2 minutes (feed changes frequently)
    let storiesFeedResult = getCachedUserData(userId, `feed:stories:${page}:${limit}`);
    
    if (!storiesFeedResult) {
      // OPTIMIZED: Cache user data (following list) for 5 minutes
      const cacheKey = 'feed:userData';
      let user = getCachedUserData(userId, cacheKey);
      
      if (!user) {
        user = await User.findById(userId).select('following blockedUsers blockedBy').lean();
        if (user) {
          cacheUserData(userId, cacheKey, user, 300); // Cache for 5 minutes
        }
      }

      if (!user) {
        console.log('[STORY] User not found');
        return ApiResponse.notFound(res, 'User not found');
      }

      const followingIds = user.following || [];
      console.log('[STORY] Following count:', followingIds.length);

      // If not following anyone, return empty feed
      if (followingIds.length === 0) {
        console.log('[STORY] User is not following anyone');
        const emptyResult = {
          storiesFeed: [],
          totalAuthors: 0,
          pagination: {
            currentPage: parseInt(page),
            totalPages: 0,
            totalStories: 0,
            hasNext: false,
            hasPrev: false
          }
        };
        // Cache empty result for shorter time (30 seconds)
        cacheUserData(userId, `feed:stories:${page}:${limit}`, emptyResult, 30);
        return ApiResponse.success(res, emptyResult, 'No stories available - not following anyone');
      }

      // Exclude blocked users
      const blockedUserIds = user?.blockedUsers || [];
      const blockedByIds = user?.blockedBy || [];
      const excludedUserIds = [...new Set([
        ...blockedUserIds.map(id => id.toString()),
        ...blockedByIds.map(id => id.toString())
      ])];

      // Get total count for pagination (before pagination)
      const totalStoriesCount = await Story.countDocuments({
        status: 'active',
        expiresAt: { $gt: new Date() },
        author: { 
          $in: followingIds,
          $nin: excludedUserIds.length > 0 ? excludedUserIds : []
        }
      });

      // Instagram-like behavior: Get ONLY stories from people the user is following
      // Account privacy is checked when viewing individual stories, not in feed query
      // OPTIMIZED: Use aggregation instead of multiple populates for better performance
      const stories = await Story.aggregate([
        {
          $match: {
            status: 'active',
            expiresAt: { $gt: new Date() },
            author: { 
              $in: followingIds,
              $nin: excludedUserIds.length > 0 ? excludedUserIds : []
            }
          }
        },
      {
        $lookup: {
          from: 'users',
          localField: 'author',
          foreignField: '_id',
          as: 'author',
          pipeline: [
            {
              $project: {
                username: 1,
                fullName: 1,
                profilePictureUrl: 1,
                isVerified: 1,
                privacySettings: 1
              }
            }
          ]
        }
      },
      {
        $unwind: '$author'
      },
      {
        $lookup: {
          from: 'users',
          localField: 'mentions.user',
          foreignField: '_id',
          as: 'mentions.user',
          pipeline: [
            {
              $project: {
                username: 1,
                fullName: 1,
                profilePictureUrl: 1,
                isVerified: 1
              }
            }
          ]
        }
      },
      // CRITICAL: Add hasViewed flag BEFORE lookup (check original ObjectIds)
      // This checks if current userId is in the views.user array (before population)
      // Convert userId to ObjectId for comparison
      {
        $addFields: {
          hasViewed: {
            $gt: [
              {
                $size: {
                  $filter: {
                    input: { $ifNull: ['$views', []] },
                    as: 'view',
                    cond: {
                      $eq: [
                        { $toString: '$$view.user' },
                        userId.toString()
                      ]
                    }
                  }
                }
              },
              0
            ]
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'views.user',
          foreignField: '_id',
          as: 'views.user',
          pipeline: [
            {
              $project: {
                username: 1,
                fullName: 1,
                profilePictureUrl: 1,
                isVerified: 1
              }
            },
            {
              $limit: 20 // OPTIMIZED: Limit views to 20 for feed performance
            }
          ]
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'replies.user',
          foreignField: '_id',
          as: 'replies.user',
          pipeline: [
            {
              $project: {
                username: 1,
                fullName: 1,
                profilePictureUrl: 1,
                isVerified: 1
              }
            }
          ]
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $skip: (parseInt(page) - 1) * parseInt(limit)
      },
      {
        $limit: parseInt(limit)
      }
    ]);

    console.log('[STORY] Stories found from followed users:', stories.length);

    // Add hasViewed flag to each story and group by author
    // CRITICAL: hasViewed is now calculated in aggregation pipeline (more reliable)
    const groupedStories = {};
    stories.forEach(story => {
      // Aggregation results are already plain objects, not Mongoose documents
      // So we don't need toObject(), just create a copy
      const storyObj = { ...story };
      
      // Use hasViewed from aggregation (already calculated correctly)
      // Fallback to false if not set (shouldn't happen, but safety check)
      const hasViewed = storyObj.hasViewed === true;
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

      // Sort stories feed: unviewed stories first (Instagram-like behavior)
      // Priority: 1. Authors with unviewed stories (hasUnviewedStories = true)
      //           2. Authors with only viewed stories (hasUnviewedStories = false)
      // Within each group, maintain original order (newest first from aggregation)
      const sortedStoriesFeed = Object.values(groupedStories).sort((a, b) => {
        // Authors with unviewed stories come first
        if (a.hasUnviewedStories && !b.hasUnviewedStories) return -1;
        if (!a.hasUnviewedStories && b.hasUnviewedStories) return 1;
        // If both have same unviewed status, maintain original order (newest first)
        return 0;
      });

      storiesFeedResult = {
        storiesFeed: sortedStoriesFeed,
        totalAuthors: Object.keys(groupedStories).length,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalStoriesCount / limit),
          totalStories: totalStoriesCount,
          hasNext: page * limit < totalStoriesCount,
          hasPrev: page > 1
        }
      };

      // Cache feed results for 2 minutes
      cacheUserData(userId, `feed:stories:${page}:${limit}`, storiesFeedResult, 120);
    }

    return ApiResponse.success(res, storiesFeedResult, 'Stories feed retrieved successfully');
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
    // Handle both populated and unpopulated view.user cases
    const hasViewed = story.views.some(view => {
      const viewUserId = (view.user._id || view.user).toString();
      return viewUserId === userId.toString();
    });
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
        // Continue with DB deletion even if S3 deletion fails
      }
    }

    // Store author ID before deletion for cache invalidation
    const authorId = story.author.toString();

    // Hard delete from database
    await Story.findByIdAndDelete(storyId);

    // OPTIMIZED: Invalidate feed cache when story is deleted
    invalidateUserCache(userId, 'feed:stories:*');
    
    // CRITICAL: Invalidate cache for all followers so they see the story removed immediately
    try {
      const author = await User.findById(authorId).select('followers').lean();
      if (author && author.followers && author.followers.length > 0) {
        console.log('[STORY] Invalidating cache for', author.followers.length, 'followers (story deleted)');
        // Invalidate cache for each follower
        author.followers.forEach(followerId => {
          invalidateUserCache(followerId.toString(), 'feed:stories:*');
        });
        console.log('[STORY] Cache invalidated for all followers (story deleted)');
      }
    } catch (cacheError) {
      console.error('[STORY] Error invalidating follower caches on delete:', cacheError);
      // Don't fail story deletion if cache invalidation fails
    }

    console.log('[STORY] Story deleted from database successfully:', storyId);
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

    // OPTIMIZED: Invalidate feed cache when story is replied to
    invalidateUserCache(userId, 'feed:stories:*');

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
      likes: story.analytics.likesCount,
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
      // Handle both populated and unpopulated view.user cases
      const hasViewed = story.views.some(view => {
        const viewUserId = (view.user._id || view.user).toString();
        return viewUserId === userId.toString();
      });
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

    // Check if user already viewed this story (robust check)
    // Handle both populated and unpopulated view.user cases
    // Also check by ObjectId comparison for reliability
    const userIdStr = userId.toString();
    const hasAlreadyViewed = story.views.some(view => {
      if (!view || !view.user) return false;
      const viewUserId = (view.user._id || view.user).toString();
      return viewUserId === userIdStr;
    });

    if (hasAlreadyViewed) {
      console.log('[STORY] User already viewed this story - returning existing view count');
      // Reload story to get latest view count
      const freshStory = await Story.findById(storyId);
      const currentViewsCount = freshStory?.analytics?.viewsCount || story.analytics.viewsCount;
      
      return ApiResponse.success(res, {
        viewsCount: currentViewsCount,
        hasViewed: true,
        message: 'You have already viewed this story'
      }, 'Story view already recorded');
    }

    // Add view (this automatically checks for duplicates and updates count using atomic operations)
    // The addView method uses atomic MongoDB operations to prevent race conditions
    await story.addView(userId);
    
    // Check if view was actually added (from atomic operation result)
    const wasViewAdded = story._wasViewAdded === true;
    
    // Reload story to get updated view count
    const updatedStory = await Story.findById(storyId);
    const finalViewsCount = updatedStory?.analytics?.viewsCount || story.analytics.viewsCount;
    
    if (!wasViewAdded) {
      console.log('[STORY] View was not added - user already viewed this story (duplicate request prevented)');
      // Return success but indicate it was already viewed
      return ApiResponse.success(res, {
        viewsCount: finalViewsCount,
        hasViewed: true,
        message: 'Story view already recorded'
      }, 'Story view already recorded');
    }

    // OPTIMIZED: Invalidate feed cache when story is viewed (hasViewed changes)
    invalidateUserCache(userId, 'feed:stories:*');
    
    // CRITICAL: Invalidate cache for story author so they see updated view count immediately
    const authorId = story.author._id.toString();
    invalidateUserCache(authorId, 'feed:stories:*');
    // Also invalidate their own stories cache
    invalidateUserCache(authorId, 'my-stories:*');

    console.log('[STORY] Story view tracked successfully:', {
      storyId: story._id,
      storyAuthor: story.author.username,
      viewsCount: finalViewsCount,
      isPrivateAccount,
      isFollowing,
      wasNewView: wasViewAdded
    });

    return ApiResponse.success(res, {
      viewsCount: finalViewsCount,
      hasViewed: true
    }, 'Story view tracked successfully');
  } catch (error) {
    console.error('[STORY] Track story view error:', error);
    return ApiResponse.serverError(res, 'Failed to track story view');
  }
}

// Like/Unlike story (toggle)
async function toggleLikeStory(req, res) {
  try {
    const { storyId } = req.params;
    const userId = req.user?.userId;

    console.log('[STORY] Toggle like story - START:', { storyId, userId });

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

    console.log('[STORY] Like privacy check:', {
      storyAuthor: story.author.username,
      isOwnStory,
      isPrivateAccount,
      isFollowing
    });

    // Cannot like own story
    if (isOwnStory) {
      console.log('[STORY] Cannot like own story');
      return ApiResponse.badRequest(res, 'Cannot like your own story');
    }

    // Instagram-like account privacy check:
    // - If PUBLIC account → anyone can like
    // - If PRIVATE account → only followers can like
    if (isPrivateAccount && !isFollowing) {
      console.log('[STORY] Private account - cannot like');
      return ApiResponse.forbidden(res, 'This account is private. Follow to like their stories.');
    }

    // Toggle like status
    await story.toggleLike(userId);
    
    // OPTIMIZED: Invalidate feed cache when story is liked/unliked
    invalidateUserCache(userId, 'feed:stories:*');

    // Find the updated view to check isLiked status
    // Handle both populated and unpopulated view.user cases
    const userView = story.views.find(view => {
      const viewUserId = (view.user._id || view.user).toString();
      return viewUserId === userId.toString();
    });
    const isLiked = userView ? userView.isLiked : false;

    console.log('[STORY] Story like toggled successfully:', {
      storyId: story._id,
      storyAuthor: story.author.username,
      isLiked: isLiked,
      likesCount: story.analytics.likesCount
    });

    return ApiResponse.success(res, {
      isLiked: isLiked,
      likesCount: story.analytics.likesCount
    }, isLiked ? 'Story liked successfully' : 'Story unliked successfully');
  } catch (error) {
    console.error('[STORY] Toggle like story error:', error);
    return ApiResponse.serverError(res, 'Failed to toggle like story');
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

    // Format views data including isLiked flag
    const viewsData = paginatedViews.map(view => ({
      user: {
        id: view.user._id,
        username: view.user.username,
        fullName: view.user.fullName,
        profilePictureUrl: view.user.profilePictureUrl,
        isVerified: view.user.isVerified
      },
      viewedAt: view.viewedAt,
      viewDuration: view.viewDuration,
      isLiked: view.isLiked || false
    }));

    console.log('[STORY] Story views retrieved:', {
      storyId: story._id,
      totalViews: totalViews,
      totalLikes: story.analytics.likesCount
    });

    return ApiResponse.success(res, {
      views: viewsData,
      totalViews: totalViews,
      totalLikes: story.analytics.likesCount,
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

// Get user's own stories with complete analytics (view count, who viewed, likes, etc.)
async function getMyStories(req, res) {
  try {
    const userId = req.user?.userId;
    const { includeExpired = true } = req.query;

    console.log('[STORY] Get my stories - START:', { userId, includeExpired });

    // Fetch all user's stories with full details (including expired ones by default)
    const stories = await Story.getUserStories(userId, includeExpired === 'true' || includeExpired === true);

    console.log('[STORY] Stories fetched:', stories.length);

    // Format stories with complete information including analytics, views, likes, and replies
    const formattedStories = stories.map(story => {
      const storyObj = story.toObject();
      
      // Add comprehensive analytics information
      storyObj.analytics = {
        viewsCount: story.analytics.viewsCount || 0,
        likesCount: story.analytics.likesCount || 0,
        repliesCount: story.analytics.repliesCount || 0,
        sharesCount: story.analytics.sharesCount || 0,
        engagementRate: story.engagementRate || 0
      };
      
      // Add time remaining (in seconds)
      storyObj.timeRemaining = story.timeRemaining || 0;
      
      // Add detailed view information (who viewed, when, duration, and if they liked)
      storyObj.views = story.views.map(view => ({
        user: {
          id: view.user._id,
          username: view.user.username,
          fullName: view.user.fullName,
          profilePictureUrl: view.user.profilePictureUrl,
          isVerified: view.user.isVerified || false
        },
        viewedAt: view.viewedAt,
        viewDuration: view.viewDuration || 0,
        isLiked: view.isLiked || false
      }));
      
      // Get users who liked (filter views where isLiked is true)
      storyObj.likedBy = story.views
        .filter(view => view.isLiked)
        .map(view => ({
          user: {
            id: view.user._id,
            username: view.user.username,
            fullName: view.user.fullName,
            profilePictureUrl: view.user.profilePictureUrl,
            isVerified: view.user.isVerified || false
          },
          likedAt: view.viewedAt // Using viewedAt as likedAt since like happens during view
        }));
      
      // Add reply details
      storyObj.replies = story.replies.map(reply => ({
        user: {
          id: reply.user._id,
          username: reply.user.username,
          fullName: reply.user.fullName,
          profilePictureUrl: reply.user.profilePictureUrl,
          isVerified: reply.user.isVerified || false
        },
        content: reply.content,
        repliedAt: reply.repliedAt,
        isDirectMessage: reply.isDirectMessage || false
      }));
      
      // Add mention details
      storyObj.mentions = story.mentions.map(mention => ({
        user: {
          id: mention.user._id,
          username: mention.user.username,
          fullName: mention.user.fullName,
          profilePictureUrl: mention.user.profilePictureUrl,
          isVerified: mention.user.isVerified || false
        },
        position: mention.position,
        notified: mention.notified || false
      }));
      
      // Story status information
      storyObj.isExpired = story.expiresAt < new Date();
      storyObj.isActive = story.status === 'active' && !storyObj.isExpired;
      
      return storyObj;
    });

    console.log('[STORY] My stories retrieved successfully:', {
      userId,
      totalStories: formattedStories.length,
      activeStories: formattedStories.filter(s => s.isActive).length,
      expiredStories: formattedStories.filter(s => s.isExpired).length
    });

    return ApiResponse.success(res, {
      stories: formattedStories,
      totalStories: formattedStories.length,
      activeStories: formattedStories.filter(s => s.isActive).length,
      expiredStories: formattedStories.filter(s => s.isExpired).length,
      summary: {
        totalViews: formattedStories.reduce((sum, s) => sum + s.analytics.viewsCount, 0),
        totalLikes: formattedStories.reduce((sum, s) => sum + s.analytics.likesCount, 0),
        totalReplies: formattedStories.reduce((sum, s) => sum + s.analytics.repliesCount, 0)
      }
    }, 'My stories retrieved successfully');
  } catch (error) {
    console.error('[STORY] Get my stories error:', error);
    return ApiResponse.serverError(res, 'Failed to get my stories');
  }
}

module.exports = {
  // Basic CRUD
  createStory,
  getUserStories,
  getMyStories,
  getStoriesFeed,
  getStory,
  deleteStory,
  
  // Engagement
  replyToStory,
  trackStoryView,
  toggleLikeStory,
  getStoryViews,
  
  // Discovery & Analytics
  reportStory,
  getStoryAnalytics,
  getStoriesByHashtag
};
