const Post = require('../userModel/postModel');
const User = require('../userModel/userAuthModel');
const ApiResponse = require('../../utils/apiResponse');
const { uploadToS3, deleteFromS3 } = require('../../services/s3Service');
const feedAlgorithmService = require('../../services/feedAlgorithmService');
const notificationService = require('../../services/notificationService');
const contentModeration = require('../userModel/contentModerationModel');

// Create a new post
async function createPost(req, res) {
  try {
    const { content, caption, hashtags, mentions, location, privacy } = req.body;
    const userId = req.user?.userId;

    if (!content && (!req.files || req.files.length === 0)) {
      return ApiResponse.badRequest(res, 'Post content or media is required');
    }

    // Process media files
    const media = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        // Validate media type - only images and videos allowed
        if (!file.mimetype.startsWith('image/') && !file.mimetype.startsWith('video/')) {
          return ApiResponse.badRequest(res, 'Only images and videos are allowed');
        }

        try {
          // Upload to S3
          const uploadResult = await uploadToS3({
            buffer: file.buffer,
            contentType: file.mimetype,
            userId: userId,
            category: 'posts',
            type: file.mimetype.startsWith('image/') ? 'image' : 'video',
            filename: file.originalname,
            metadata: {
              originalName: file.originalname,
              uploadedAt: new Date().toISOString()
            }
          });

          media.push({
            type: uploadResult.type,
            url: uploadResult.url,
            thumbnail: uploadResult.thumbnail || null,
            filename: file.originalname,
            fileSize: file.size,
            mimeType: file.mimetype,
            duration: uploadResult.duration || null,
            dimensions: uploadResult.dimensions || null,
            s3Key: uploadResult.key
          });
        } catch (uploadError) {
          console.error('[POST] Media upload error:', uploadError);
          return ApiResponse.serverError(res, 'Failed to upload media');
        }
      }
    }

    // Process hashtags
    const processedHashtags = [];
    if (hashtags && Array.isArray(hashtags)) {
      processedHashtags.push(...hashtags.map(tag => tag.toLowerCase().replace('#', '').trim()));
    }

    // Extract hashtags from content
    const contentHashtags = content ? content.match(/#\w+/g) || [] : [];
    contentHashtags.forEach(tag => {
      const cleanTag = tag.toLowerCase().replace('#', '').trim();
      if (!processedHashtags.includes(cleanTag)) {
        processedHashtags.push(cleanTag);
      }
    });

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
      if (user && !processedMentions.includes(user._id)) {
        processedMentions.push(user._id);
      }
    }

    // Create post
    const postData = {
      author: userId,
      content: content || '',
      caption: caption || '',
      media: media,
      hashtags: processedHashtags,
      mentions: processedMentions,
      privacy: privacy || 'public',
      status: 'published'
    };

    // Add location if provided
    if (location) {
      postData.location = location;
    }

    const post = new Post(postData);
    await post.save();

    // Populate author information
    await post.populate('author', 'username fullName profilePictureUrl isVerified');

    // Create content moderation record
    try {
      await contentModeration.createModerationRecord('post', post._id, {
        author: userId,
        text: content || '',
        media: media,
        hashtags: processedHashtags,
        mentions: processedMentions
      });
    } catch (moderationError) {
      console.error('[POST] Content moderation error:', moderationError);
      // Don't fail the post creation if moderation fails
    }

    console.log('[POST] Post created successfully:', post._id);
    return ApiResponse.success(res, post, 'Post created successfully');
  } catch (error) {
    console.error('[POST] Create post error:', error);
    return ApiResponse.serverError(res, 'Failed to create post');
  }
}

// Get user's posts
async function getUserPosts(req, res) {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20, status = 'published' } = req.query;
    const currentUserId = req.user?.userId;

    const query = { author: userId, status };
    
    // If viewing own posts, show all statuses except deleted
    if (userId === currentUserId) {
      query.status = { $ne: 'deleted' };
    }

    const posts = await Post.find(query)
      .populate('author', 'username fullName profilePictureUrl isVerified')
      .populate('comments.user', 'username fullName profilePictureUrl')
      .populate('likes.user', 'username fullName')
      .sort({ publishedAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const totalPosts = await Post.countDocuments(query);

    return ApiResponse.success(res, {
      posts,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalPosts / limit),
        totalPosts,
        hasNext: page * limit < totalPosts,
        hasPrev: page > 1
      }
    }, 'Posts retrieved successfully');
  } catch (error) {
    console.error('[POST] Get user posts error:', error);
    return ApiResponse.serverError(res, 'Failed to get posts');
  }
}

// Get feed posts with smart algorithm
async function getFeedPosts(req, res) {
  try {
    const { page = 1, limit = 20 } = req.query;
    const userId = req.user?.userId;

    // Use the smart feed algorithm service
    const feedPosts = await feedAlgorithmService.generatePersonalizedFeed(
      userId, 
      parseInt(page), 
      parseInt(limit)
    );

    // Get total count for pagination
    const user = await User.findById(userId).select('following closeFriends');
    const followingIds = user?.following || [];
    const closeFriendsIds = user?.closeFriends || [];

    const totalPosts = await Post.countDocuments({
      status: 'published',
      $or: [
        { privacy: 'public' },
        { privacy: 'followers', author: { $in: followingIds } },
        { privacy: 'close_friends', author: { $in: closeFriendsIds } }
      ]
    });

    return ApiResponse.success(res, {
      posts: feedPosts,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalPosts / limit),
        totalPosts,
        hasNext: page * limit < totalPosts,
        hasPrev: page > 1
      }
    }, 'Feed posts retrieved successfully');
  } catch (error) {
    console.error('[POST] Get feed posts error:', error);
    return ApiResponse.serverError(res, 'Failed to get feed posts');
  }
}

// Get single post
async function getPost(req, res) {
  try {
    const { postId } = req.params;
    const userId = req.user?.userId;

    const post = await Post.findById(postId)
      .populate('author', 'username fullName profilePictureUrl isVerified')
      .populate('comments.user', 'username fullName profilePictureUrl')
      .populate('likes.user', 'username fullName');

    if (!post) {
      return ApiResponse.notFound(res, 'Post not found');
    }

    // Check if user can view this post
    if (post.privacy === 'private' && post.author._id.toString() !== userId) {
      return ApiResponse.forbidden(res, 'You cannot view this post');
    }

    // Add view if user is not the author
    if (post.author._id.toString() !== userId) {
      await post.addView(userId);
    }

    return ApiResponse.success(res, post, 'Post retrieved successfully');
  } catch (error) {
    console.error('[POST] Get post error:', error);
    return ApiResponse.serverError(res, 'Failed to get post');
  }
}

// Update post
async function updatePost(req, res) {
  try {
    const { postId } = req.params;
    const { content, caption, hashtags, mentions, location, privacy } = req.body;
    const userId = req.user?.userId;

    const post = await Post.findById(postId);
    if (!post) {
      return ApiResponse.notFound(res, 'Post not found');
    }

    // Check if user is the author
    if (post.author.toString() !== userId) {
      return ApiResponse.forbidden(res, 'You can only edit your own posts');
    }

    // Update post fields
    if (content !== undefined) post.content = content;
    if (caption !== undefined) post.caption = caption;
    if (privacy !== undefined) post.privacy = privacy;
    if (location !== undefined) post.location = location;

    // Process hashtags
    if (hashtags !== undefined) {
      const processedHashtags = [];
      if (Array.isArray(hashtags)) {
        processedHashtags.push(...hashtags.map(tag => tag.toLowerCase().replace('#', '').trim()));
      }
      
      // Extract hashtags from content
      const contentHashtags = content ? content.match(/#\w+/g) || [] : [];
      contentHashtags.forEach(tag => {
        const cleanTag = tag.toLowerCase().replace('#', '').trim();
        if (!processedHashtags.includes(cleanTag)) {
          processedHashtags.push(cleanTag);
        }
      });
      
      post.hashtags = processedHashtags;
    }

    // Process mentions
    if (mentions !== undefined) {
      const processedMentions = [];
      if (Array.isArray(mentions)) {
        processedMentions.push(...mentions);
      }
      
      // Extract mentions from content
      const contentMentions = content ? content.match(/@\w+/g) || [] : [];
      for (const mention of contentMentions) {
        const username = mention.replace('@', '').trim();
        const user = await User.findOne({ username: username });
        if (user && !processedMentions.includes(user._id)) {
          processedMentions.push(user._id);
        }
      }
      
      post.mentions = processedMentions;
    }

    await post.save();
    await post.populate('author', 'username fullName profilePictureUrl isVerified');

    console.log('[POST] Post updated successfully:', postId);
    return ApiResponse.success(res, post, 'Post updated successfully');
  } catch (error) {
    console.error('[POST] Update post error:', error);
    return ApiResponse.serverError(res, 'Failed to update post');
  }
}

// Delete post
async function deletePost(req, res) {
  try {
    const { postId } = req.params;
    const userId = req.user?.userId;

    const post = await Post.findById(postId);
    if (!post) {
      return ApiResponse.notFound(res, 'Post not found');
    }

    // Check if user is the author
    if (post.author.toString() !== userId) {
      return ApiResponse.forbidden(res, 'You can only delete your own posts');
    }

    // Delete media files from S3
    if (post.media && post.media.length > 0) {
      for (const mediaItem of post.media) {
        try {
          await deleteFromS3(mediaItem.s3Key);
        } catch (deleteError) {
          console.error('[POST] Error deleting media from S3:', deleteError);
        }
      }
    }

    // Soft delete the post
    post.status = 'deleted';
    await post.save();

    console.log('[POST] Post deleted successfully:', postId);
    return ApiResponse.success(res, null, 'Post deleted successfully');
  } catch (error) {
    console.error('[POST] Delete post error:', error);
    return ApiResponse.serverError(res, 'Failed to delete post');
  }
}

// Like/Unlike post
async function toggleLike(req, res) {
  try {
    const { postId } = req.params;
    const userId = req.user?.userId;

    const post = await Post.findById(postId);
    if (!post) {
      return ApiResponse.notFound(res, 'Post not found');
    }

    const existingLike = post.likes.find(like => like.user.toString() === userId);
    
    if (existingLike) {
      await post.removeLike(userId);
      return ApiResponse.success(res, { liked: false, likesCount: post.likesCount }, 'Post unliked');
    } else {
      await post.addLike(userId);
      
      // Send notification for like
      try {
        await notificationService.notifyPostEngagement(postId, userId, 'like');
      } catch (notificationError) {
        console.error('[POST] Like notification error:', notificationError);
        // Don't fail the like action if notification fails
      }
      
      return ApiResponse.success(res, { liked: true, likesCount: post.likesCount }, 'Post liked');
    }
  } catch (error) {
    console.error('[POST] Toggle like error:', error);
    return ApiResponse.serverError(res, 'Failed to toggle like');
  }
}

// Add comment to post
async function addComment(req, res) {
  try {
    const { postId } = req.params;
    const { content, parentCommentId } = req.body;
    const userId = req.user?.userId;

    if (!content || content.trim().length === 0) {
      return ApiResponse.badRequest(res, 'Comment content is required');
    }

    const post = await Post.findById(postId);
    if (!post) {
      return ApiResponse.notFound(res, 'Post not found');
    }

    await post.addComment(userId, content.trim(), parentCommentId);
    
    // Populate the new comment
    const newComment = post.comments[post.comments.length - 1];
    await newComment.populate('user', 'username fullName profilePictureUrl');

    // Send notification for comment
    try {
      await notificationService.notifyPostEngagement(postId, userId, 'comment', {
        commentContent: content.trim()
      });
    } catch (notificationError) {
      console.error('[POST] Comment notification error:', notificationError);
      // Don't fail the comment action if notification fails
    }

    console.log('[POST] Comment added successfully');
    return ApiResponse.success(res, {
      comment: newComment,
      commentsCount: post.commentsCount
    }, 'Comment added successfully');
  } catch (error) {
    console.error('[POST] Add comment error:', error);
    return ApiResponse.serverError(res, 'Failed to add comment');
  }
}

// Get post comments
async function getPostComments(req, res) {
  try {
    const { postId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const post = await Post.findById(postId)
      .populate({
        path: 'comments',
        populate: {
          path: 'user',
          select: 'username fullName profilePictureUrl'
        },
        options: {
          sort: { createdAt: -1 },
          skip: (page - 1) * limit,
          limit: parseInt(limit)
        }
      });

    if (!post) {
      return ApiResponse.notFound(res, 'Post not found');
    }

    return ApiResponse.success(res, {
      comments: post.comments,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(post.commentsCount / limit),
        totalComments: post.commentsCount,
        hasNext: page * limit < post.commentsCount,
        hasPrev: page > 1
      }
    }, 'Comments retrieved successfully');
  } catch (error) {
    console.error('[POST] Get comments error:', error);
    return ApiResponse.serverError(res, 'Failed to get comments');
  }
}

// Share post
async function sharePost(req, res) {
  try {
    const { postId } = req.params;
    const { shareType = 'repost', shareMessage = '' } = req.body;
    const userId = req.user?.userId;

    const post = await Post.findById(postId);
    if (!post) {
      return ApiResponse.notFound(res, 'Post not found');
    }

    await post.addShare(userId, shareType, shareMessage);

    console.log('[POST] Post shared successfully');
    return ApiResponse.success(res, {
      sharesCount: post.sharesCount
    }, 'Post shared successfully');
  } catch (error) {
    console.error('[POST] Share post error:', error);
    return ApiResponse.serverError(res, 'Failed to share post');
  }
}

// Search posts
async function searchPosts(req, res) {
  try {
    const { q, page = 1, limit = 20 } = req.query;

    if (!q || q.trim().length === 0) {
      return ApiResponse.badRequest(res, 'Search query is required');
    }

    const query = q.trim();
    const posts = await Post.searchPosts(query, parseInt(page), parseInt(limit));

    const totalPosts = await Post.countDocuments({
      status: 'published',
      privacy: 'public',
      $or: [
        { content: { $regex: query, $options: 'i' } },
        { caption: { $regex: query, $options: 'i' } },
        { hashtags: { $in: [new RegExp(query, 'i')] } }
      ]
    });

    return ApiResponse.success(res, {
      posts,
      query,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalPosts / limit),
        totalPosts,
        hasNext: page * limit < totalPosts,
        hasPrev: page > 1
      }
    }, 'Search results retrieved successfully');
  } catch (error) {
    console.error('[POST] Search posts error:', error);
    return ApiResponse.serverError(res, 'Failed to search posts');
  }
}

// Report post
async function reportPost(req, res) {
  try {
    const { postId } = req.params;
    const { reason, description = '' } = req.body;
    const userId = req.user?.userId;

    if (!reason) {
      return ApiResponse.badRequest(res, 'Report reason is required');
    }

    const post = await Post.findById(postId);
    if (!post) {
      return ApiResponse.notFound(res, 'Post not found');
    }

    // Check if user already reported this post
    const existingReport = post.reports.find(report => report.user.toString() === userId);
    if (existingReport) {
      return ApiResponse.badRequest(res, 'You have already reported this post');
    }

    await post.reportPost(userId, reason, description);

    console.log('[POST] Post reported successfully');
    return ApiResponse.success(res, null, 'Post reported successfully');
  } catch (error) {
    console.error('[POST] Report post error:', error);
    return ApiResponse.serverError(res, 'Failed to report post');
  }
}

// Get post analytics
async function getPostAnalytics(req, res) {
  try {
    const { postId } = req.params;
    const userId = req.user?.userId;

    const post = await Post.findById(postId);
    if (!post) {
      return ApiResponse.notFound(res, 'Post not found');
    }

    // Check if user is the author
    if (post.author.toString() !== userId) {
      return ApiResponse.forbidden(res, 'You can only view analytics for your own posts');
    }

    const analytics = {
      likes: post.likesCount,
      comments: post.commentsCount,
      shares: post.sharesCount,
      views: post.viewsCount,
      engagementRate: post.engagementRate,
      reach: post.analytics.reach,
      impressions: post.analytics.impressions,
      publishedAt: post.publishedAt,
      lastEngagementAt: post.lastEngagementAt
    };

    return ApiResponse.success(res, analytics, 'Post analytics retrieved successfully');
  } catch (error) {
    console.error('[POST] Get analytics error:', error);
    return ApiResponse.serverError(res, 'Failed to get post analytics');
  }
}

// Get trending posts
async function getTrendingPosts(req, res) {
  try {
    const { hours = 24, limit = 20 } = req.query;

    const trendingPosts = await feedAlgorithmService.getTrendingPosts(
      parseInt(hours), 
      parseInt(limit)
    );

    return ApiResponse.success(res, {
      posts: trendingPosts,
      timeWindow: `${hours} hours`
    }, 'Trending posts retrieved successfully');
  } catch (error) {
    console.error('[POST] Get trending posts error:', error);
    return ApiResponse.serverError(res, 'Failed to get trending posts');
  }
}

// Get posts by hashtag
async function getPostsByHashtag(req, res) {
  try {
    const { hashtag } = req.params;
    const { page = 1, limit = 20 } = req.query;

    if (!hashtag) {
      return ApiResponse.badRequest(res, 'Hashtag is required');
    }

    const posts = await feedAlgorithmService.getPostsByHashtag(
      hashtag, 
      parseInt(page), 
      parseInt(limit)
    );

    const totalPosts = await Post.countDocuments({
      status: 'published',
      privacy: 'public',
      hashtags: { $in: [hashtag.toLowerCase()] }
    });

    return ApiResponse.success(res, {
      posts,
      hashtag,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalPosts / limit),
        totalPosts,
        hasNext: page * limit < totalPosts,
        hasPrev: page > 1
      }
    }, 'Hashtag posts retrieved successfully');
  } catch (error) {
    console.error('[POST] Get posts by hashtag error:', error);
    return ApiResponse.serverError(res, 'Failed to get posts by hashtag');
  }
}

// Location Tagging
async function updateLocation(req, res) {
  try {
    const { postId } = req.params;
    const { location } = req.body;
    const userId = req.user?.userId;

    const post = await Post.findById(postId);
    if (!post) {
      return ApiResponse.notFound(res, 'Post not found');
    }

    // Check if user is the author
    if (post.author.toString() !== userId) {
      return ApiResponse.forbidden(res, 'You can only update location for your own posts');
    }

    post.location = location;
    await post.save();

    console.log('[POST] Location updated successfully');
    return ApiResponse.success(res, {
      location: post.location
    }, 'Location updated successfully');
  } catch (error) {
    console.error('[POST] Update location error:', error);
    return ApiResponse.serverError(res, 'Failed to update location');
  }
}

// Advanced Mentions
async function addMention(req, res) {
  try {
    const { postId } = req.params;
    const { userId: mentionedUserId, start, end, context = 'content' } = req.body;
    const userId = req.user?.userId;

    const post = await Post.findById(postId);
    if (!post) {
      return ApiResponse.notFound(res, 'Post not found');
    }

    await post.addMention(mentionedUserId, start, end, context);

    console.log('[POST] Mention added successfully');
    return ApiResponse.success(res, {
      mentions: post.mentions
    }, 'Mention added successfully');
  } catch (error) {
    console.error('[POST] Add mention error:', error);
    return ApiResponse.serverError(res, 'Failed to add mention');
  }
}

module.exports = {
  // Basic CRUD
  createPost,
  getUserPosts,
  getFeedPosts,
  getPost,
  updatePost,
  deletePost,
  
  // Engagement
  toggleLike,
  addComment,
  getPostComments,
  sharePost,
  
  // Discovery
  searchPosts,
  getTrendingPosts,
  getPostsByHashtag,
  
  // Analytics & Moderation
  reportPost,
  getPostAnalytics,
  
  // Advanced Features
  updateLocation,
  addMention
};
