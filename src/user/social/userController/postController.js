const Post = require('../userModel/postModel');
const User = require('../../auth/model/userAuthModel');
const ApiResponse = require('../../../utils/apiResponse');
const { uploadToS3, deleteFromS3 } = require('../../../services/s3Service');
const feedAlgorithmService = require('../../../services/feedAlgorithmService');
const notificationService = require('../../../notification/services/notificationService');
const contentModeration = require('../userModel/contentModerationModel');

// Helper function to normalize location with all fields visible
function normalizeLocation(location) {
  if (!location || typeof location !== 'object') {
    return {
      name: "",
      coordinates: {
        lat: "",
        lng: ""
      },
      address: "",
      placeId: "",
      placeType: "",
      accuracy: "",
      isVisible: true
    };
  }
  
  return {
    name: location.name || "",
    coordinates: {
      lat: location.coordinates?.lat || "",
      lng: location.coordinates?.lng || ""
    },
    address: location.address || "",
    placeId: location.placeId || "",
    placeType: location.placeType || "",
    accuracy: location.accuracy || "",
    isVisible: location.isVisible !== undefined ? location.isVisible : true
  };
}

// Helper function to transform post media into a cleaner structure
function transformPostMedia(post) {
  const postObj = typeof post.toObject === 'function' ? post.toObject() : post;
  
  // Separate images and videos
  const images = [];
  const videos = [];
  
  if (postObj.media && Array.isArray(postObj.media)) {
    postObj.media.forEach(mediaItem => {
      if (mediaItem.type === 'image') {
        images.push({
          url: mediaItem.url,
          thumbnail: mediaItem.thumbnail,
          dimensions: mediaItem.dimensions
        });
      } else if (mediaItem.type === 'video') {
        videos.push({
          url: mediaItem.url,
          thumbnail: mediaItem.thumbnail,
          duration: mediaItem.duration,
          dimensions: mediaItem.dimensions
        });
      }
    });
  }
  
  // Replace media with organized structure
  postObj.media = {
    images: images,
    videos: videos,
    totalCount: images.length + videos.length,
    hasImages: images.length > 0,
    hasVideos: videos.length > 0
  };
  
  // Normalize location to ensure all fields are visible
  postObj.location = normalizeLocation(postObj.location);
  
  return postObj;
}

// Create a new post
async function createPost(req, res) {
  try {
    const { content, caption, hashtags, mentions, location, visibility, commentVisibility } = req.body;
    const userId = req.user?.userId;

    if ((!req.files || req.files.length === 0)) {
      return ApiResponse.badRequest(res, 'Post media is required');
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

    // Extract hashtags from caption as well
    const captionHashtags = caption ? caption.match(/#\w+/g) || [] : [];
    captionHashtags.forEach(tag => {
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
      if (user && !processedMentions.includes(user._id.toString())) {
        processedMentions.push(user._id);
      }
    }

    // Extract mentions from caption as well
    const captionMentions = caption ? caption.match(/@\w+/g) || [] : [];
    for (const mention of captionMentions) {
      const username = mention.replace('@', '').trim();
      const user = await User.findOne({ username: username });
      if (user && !processedMentions.some(id => id.toString() === user._id.toString())) {
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
      status: 'published',
      visibility: visibility || 'public',
      commentVisibility: commentVisibility || 'everyone'
    };

    // Add location if provided (with validation)
    if (location) {
      // Parse location if it's a string (from form-data)
      const locationData = typeof location === 'string' ? JSON.parse(location) : location;
      
      // Validate that location has at least name or coordinates
      if (locationData && (locationData.name || (locationData.coordinates?.lat && locationData.coordinates?.lng))) {
        postData.location = locationData;
      }
    }

    const post = new Post(postData);
    await post.save();

    // Populate author information
    await post.populate('author', 'username fullName profilePictureUrl isVerified privacySettings');

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

    // Transform media into organized structure before returning
    const transformedPost = transformPostMedia(post);

    console.log('[POST] Post created successfully:', post._id);
    return ApiResponse.success(res, transformedPost, 'Post created successfully');
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
    } else {
      // If viewing another user's posts, filter by visibility
      // Check if current user is a follower
      const author = await User.findById(userId).select('followers');
      const isFollower = author?.followers?.some(f => f.toString() === currentUserId);
      
      if (isFollower) {
        // Followers can see public and followers-only posts
        query.visibility = { $in: ['public', 'followers'] };
      } else {
        // Non-followers can only see public posts
        query.visibility = 'public';
      }
    }

    const posts = await Post.find(query)
      .populate('author', 'username fullName profilePictureUrl isVerified privacySettings')
      .populate('comments.user', 'username fullName profilePictureUrl')
      .populate('likes.user', 'username fullName')
      .sort({ publishedAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const totalPosts = await Post.countDocuments(query);

    // Add lastComment field and transform media for each post
    const postsWithLastComment = posts.map(post => {
      const postObj = post.toObject();
      
      // Get the newest comment (comments are sorted by createdAt descending in the model)
      if (postObj.comments && postObj.comments.length > 0) {
        // Sort comments by createdAt descending to get the newest first
        const sortedComments = [...postObj.comments].sort((a, b) => 
          new Date(b.createdAt) - new Date(a.createdAt)
        );
        postObj.lastComment = sortedComments[0];
      } else {
        postObj.lastComment = null;
      }
      
      // Transform media into organized structure
      return transformPostMedia(postObj);
    });

    return ApiResponse.success(res, {
      posts: postsWithLastComment,
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

    // Transform media for all feed posts
    const transformedFeedPosts = feedPosts.map(post => transformPostMedia(post));

    // Get total count for pagination (excluding own posts and blocked users)
    const user = await User.findById(userId).select('following blockedUsers blockedBy');
    const followingIds = user?.following || [];
    const blockedUserIds = user?.blockedUsers || [];
    const blockedByIds = user?.blockedBy || [];
    
    // Combine blocked users and current user
    const excludedUserIds = [...new Set([
      ...blockedUserIds.map(id => id.toString()), 
      ...blockedByIds.map(id => id.toString()),
      userId // Exclude own posts
    ])];

    // Count total posts matching feed algorithm logic:
    // - All public posts (excluding blocked users and self)
    // - Followers-only posts from people you follow
    const totalPosts = await Post.countDocuments({
      status: 'published',
      author: { $nin: excludedUserIds },
      $or: [
        { visibility: 'public' },
        { visibility: 'followers', author: { $in: followingIds } }
      ]
    });

    return ApiResponse.success(res, {
      posts: transformedFeedPosts,
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
      .populate('author', 'username fullName profilePictureUrl isVerified privacySettings')
      .populate('comments.user', 'username fullName profilePictureUrl')
      .populate('likes.user', 'username fullName');

    if (!post) {
      return ApiResponse.notFound(res, 'Post not found');
    }

    // Enforce post visibility on single post fetch
    // Public: everyone can see | Followers: only followers (and author) can see
    if (post.visibility === 'followers' && post.author._id.toString() !== userId) {
      const author = await User.findById(post.author._id).select('followers');
      const isFollower = author?.followers?.some(f => f.toString() === userId);
      if (!isFollower) {
        return ApiResponse.forbidden(res, 'Only followers can view this post');
      }
    }

    // Add view if user is not the author
    if (post.author._id.toString() !== userId) {
      await post.addView(userId);
    }

    // Add lastComment field (showing only the newest comment)
    const postObj = post.toObject();
    if (postObj.comments && postObj.comments.length > 0) {
      // Sort comments by createdAt descending to get the newest first
      const sortedComments = [...postObj.comments].sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
      );
      postObj.lastComment = sortedComments[0];
    } else {
      postObj.lastComment = null;
    }

    // Transform media into organized structure
    const transformedPost = transformPostMedia(postObj);

    return ApiResponse.success(res, transformedPost, 'Post retrieved successfully');
  } catch (error) {
    console.error('[POST] Get post error:', error);
    return ApiResponse.serverError(res, 'Failed to get post');
  }
}

// Update post
async function updatePost(req, res) {
  try {
    const { postId } = req.params;
    const { content, caption, hashtags, mentions, location, visibility, commentVisibility } = req.body;
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
    if (location !== undefined) {
      // Validate location has essential data
      if (location && (location.name || (location.coordinates?.lat && location.coordinates?.lng))) {
        post.location = location;
      } else if (location === null) {
        // Allow removal of location by passing null
        post.location = undefined;
      }
    }
    if (visibility !== undefined) post.visibility = visibility;
    if (commentVisibility !== undefined) post.commentVisibility = commentVisibility;

    // Process hashtags - extract from both content and caption
    if (hashtags !== undefined || content !== undefined || caption !== undefined) {
      const processedHashtags = [];
      
      // Add explicit hashtags if provided
      if (hashtags && Array.isArray(hashtags)) {
        processedHashtags.push(...hashtags.map(tag => tag.toLowerCase().replace('#', '').trim()));
      }
      
      // Extract hashtags from content
      const contentHashtags = (content || post.content) ? (content || post.content).match(/#\w+/g) || [] : [];
      contentHashtags.forEach(tag => {
        const cleanTag = tag.toLowerCase().replace('#', '').trim();
        if (!processedHashtags.includes(cleanTag)) {
          processedHashtags.push(cleanTag);
        }
      });
      
      // Extract hashtags from caption as well
      const captionHashtags = (caption || post.caption) ? (caption || post.caption).match(/#\w+/g) || [] : [];
      captionHashtags.forEach(tag => {
        const cleanTag = tag.toLowerCase().replace('#', '').trim();
        if (!processedHashtags.includes(cleanTag)) {
          processedHashtags.push(cleanTag);
        }
      });
      
      post.hashtags = processedHashtags;
    }

    // Process mentions - extract from both content and caption
    if (mentions !== undefined || content !== undefined || caption !== undefined) {
      const processedMentions = [];
      
      // Add explicit mentions if provided
      if (mentions && Array.isArray(mentions)) {
        processedMentions.push(...mentions);
      }
      
      // Extract mentions from content
      const contentMentions = (content || post.content) ? (content || post.content).match(/@\w+/g) || [] : [];
      for (const mention of contentMentions) {
        const username = mention.replace('@', '').trim();
        const user = await User.findOne({ username: username });
        if (user && !processedMentions.some(id => id.toString() === user._id.toString())) {
          processedMentions.push(user._id);
        }
      }
      
      // Extract mentions from caption as well
      const captionMentions = (caption || post.caption) ? (caption || post.caption).match(/@\w+/g) || [] : [];
      for (const mention of captionMentions) {
        const username = mention.replace('@', '').trim();
        const user = await User.findOne({ username: username });
        if (user && !processedMentions.some(id => id.toString() === user._id.toString())) {
          processedMentions.push(user._id);
        }
      }
      
      post.mentions = processedMentions;
    }

    await post.save();
    await post.populate('author', 'username fullName profilePictureUrl isVerified privacySettings');

    // Transform media into organized structure before returning
    const transformedPost = transformPostMedia(post);

    console.log('[POST] Post updated successfully:', postId);
    return ApiResponse.success(res, transformedPost, 'Post updated successfully');
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
      
      // Create notification for post like
      try {
        const postAuthor = await User.findById(post.author);
        if (postAuthor && postAuthor._id.toString() !== userId) {
          await notificationService.create({
            context: 'social',
            type: 'post_like',
            recipientId: post.author.toString(),
            senderId: userId,
            data: {
              postId: post._id.toString(),
              contentType: 'post'
            }
          });
        }
      } catch (notificationError) {
        console.error('[POST] Error creating notification for post like:', notificationError);
        // Don't fail the request if notification fails
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

    const post = await Post.findById(postId).populate('author', 'followers');
    if (!post) {
      return ApiResponse.notFound(res, 'Post not found');
    }

    // Enforce comment visibility
    if (post.commentVisibility === 'none') {
      return ApiResponse.forbidden(res, 'Comments are disabled for this post');
    }
    if (post.commentVisibility === 'followers') {
      const authorFollowers = post.author?.followers?.map(f => f.toString()) || [];
      const isAuthor = post.author && post.author._id && post.author._id.toString() === userId;
      if (!isAuthor && !authorFollowers.includes(userId)) {
        return ApiResponse.forbidden(res, 'Only followers can comment on this post');
      }
    }

    await post.addComment(userId, content.trim(), parentCommentId);
    
    // Populate the new comment using the parent document
    // Mongoose doesn't support calling populate() on nested docs directly
    const commentIndex = post.comments.length - 1;
    await post.populate(`comments.${commentIndex}.user`, 'username fullName profilePictureUrl');
    const newComment = post.comments[commentIndex];

    // Create notification for post comment
    try {
      const postAuthor = await User.findById(post.author);
      if (postAuthor && postAuthor._id.toString() !== userId) {
        await notificationService.create({
          context: 'social',
          type: 'post_comment',
          recipientId: post.author.toString(),
          senderId: userId,
          data: {
            postId: post._id.toString(),
            commentId: newComment._id.toString(),
            contentType: 'post'
          }
        });
      }
    } catch (notificationError) {
      console.error('[POST] Error creating notification for post comment:', notificationError);
      // Don't fail the request if notification fails
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
    const userId = req.user?.userId;

    if (!q || q.trim().length === 0) {
      return ApiResponse.badRequest(res, 'Search query is required');
    }

    const query = q.trim();

    // Get blocked users
    let allBlockedIds = [];
    if (userId) {
      const user = await User.findById(userId).select('blockedUsers blockedBy');
      const blockedUserIds = user?.blockedUsers || [];
      const blockedByIds = user?.blockedBy || [];
      allBlockedIds = [...new Set([
        ...blockedUserIds.map(id => id.toString()), 
        ...blockedByIds.map(id => id.toString())
      ])];
    }

    const posts = await Post.searchPosts(query, parseInt(page), parseInt(limit), allBlockedIds);

    // Transform media for all search results
    const transformedPosts = posts.map(post => transformPostMedia(post));

    // Count total posts excluding blocked users
    const totalCountQuery = {
      status: 'published',
      $or: [
        { content: { $regex: query, $options: 'i' } },
        { caption: { $regex: query, $options: 'i' } },
        { hashtags: { $in: [new RegExp(query, 'i')] } }
      ]
    };

    if (allBlockedIds.length > 0) {
      totalCountQuery.author = { $nin: allBlockedIds };
    }

    const totalPosts = await Post.countDocuments(totalCountQuery);

    return ApiResponse.success(res, {
      posts: transformedPosts,
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
    const userId = req.user?.userId;

    const trendingPosts = await feedAlgorithmService.getTrendingPosts(
      parseInt(hours), 
      parseInt(limit),
      userId // Pass userId to exclude blocked users
    );

    // Transform media for all trending posts
    const transformedPosts = trendingPosts.map(post => transformPostMedia(post));

    return ApiResponse.success(res, {
      posts: transformedPosts,
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
    const userId = req.user?.userId;

    if (!hashtag) {
      return ApiResponse.badRequest(res, 'Hashtag is required');
    }

    const posts = await feedAlgorithmService.getPostsByHashtag(
      hashtag, 
      parseInt(page), 
      parseInt(limit),
      userId // Pass userId to exclude blocked users
    );

    // Transform media for all hashtag posts
    const transformedPosts = posts.map(post => transformPostMedia(post));

    // Get total count excluding blocked users
    let totalCountQuery = {
      status: 'published',
      visibility: 'public',
      hashtags: { $in: [hashtag.toLowerCase()] }
    };

    // Exclude blocked users from total count as well
    if (userId) {
      const user = await User.findById(userId).select('blockedUsers blockedBy');
      const blockedUserIds = user?.blockedUsers || [];
      const blockedByIds = user?.blockedBy || [];
      const allBlockedIds = [...new Set([
        ...blockedUserIds.map(id => id.toString()), 
        ...blockedByIds.map(id => id.toString())
      ])];
      if (allBlockedIds.length > 0) {
        totalCountQuery.author = { $nin: allBlockedIds };
      }
    }

    const totalPosts = await Post.countDocuments(totalCountQuery);

    return ApiResponse.success(res, {
      posts: transformedPosts,
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

// Helper function to calculate distance between two coordinates using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in kilometers
  return distance;
}

// Get nearby user suggestions based on location
async function getSuggestedUsers(req, res) {
  try {
    const userId = req.user?.userId;
    const { radius = 50, limit = 20, page = 1 } = req.query; // radius in km, default 50km

    // Get current user with location data
    const currentUser = await User.findById(userId).select('location following blockedUsers blockedBy');
    
    if (!currentUser) {
      return ApiResponse.forbidden(res, 'User not found');
    }

    // Check if user has location set
    if (!currentUser.location?.lat || !currentUser.location?.lng) {
      return ApiResponse.badRequest(res, 'User location not set. Please update your location in profile settings.');
    }

    const userLat = currentUser.location.lat;
    const userLng = currentUser.location.lng;

    // Get list of users to exclude
    const followingIds = currentUser.following?.map(id => id.toString()) || [];
    const blockedUserIds = currentUser.blockedUsers?.map(id => id.toString()) || [];
    const blockedByIds = currentUser.blockedBy?.map(id => id.toString()) || [];
    
    // Combine all excluded users (current user, following, blocked users)
    const excludedUserIds = [...new Set([
      userId,
      ...followingIds,
      ...blockedUserIds,
      ...blockedByIds
    ])];

    // Find all users with valid location data (excluding current user and blocked users)
    const potentialUsers = await User.find({
      _id: { $nin: excludedUserIds },
      isActive: true,
      'location.lat': { $ne: null, $exists: true },
      'location.lng': { $ne: null, $exists: true }
    }).select('username fullName profilePictureUrl location isVerified');

    // Calculate distance for each user and filter by radius
    const usersWithDistance = potentialUsers
      .map(user => {
        const distance = calculateDistance(
          userLat,
          userLng,
          user.location.lat,
          user.location.lng
        );

        return {
          _id: user._id,
          username: user.username,
          fullName: user.fullName,
          profilePictureUrl: user.profilePictureUrl,
          isVerified: user.isVerified || false,
          location: {
            city: user.location.city || '',
            country: user.location.country || ''
          },
          distance: Math.round(distance * 10) / 10 // Round to 1 decimal place
        };
      })
      .filter(user => user.distance <= parseFloat(radius)) // Filter by radius
      .sort((a, b) => a.distance - b.distance); // Sort by distance (nearest first)

    // Implement pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedUsers = usersWithDistance.slice(startIndex, endIndex);

    const totalUsers = usersWithDistance.length;

    console.log(`[USER] Found ${totalUsers} nearby users within ${radius}km`);
    return ApiResponse.success(res, {
      users: paginatedUsers,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalUsers / limit),
        totalUsers,
        hasNext: endIndex < totalUsers,
        hasPrev: page > 1
      },
      searchRadius: parseFloat(radius)
    }, 'Nearby users retrieved successfully');
  } catch (error) {
    console.error('[USER] Get suggested users error:', error);
    return ApiResponse.serverError(res, 'Failed to get suggested users');
  }
}

module.exports = {
  // Basic CRUD
  createPost,
  getUserPosts,
  getCurrentUserPosts: async function getCurrentUserPosts(req, res) {
    try {
      // Reuse getUserPosts by setting params.userId to the authenticated user
      req.params.userId = req.user?.userId;
      return await getUserPosts(req, res);
    } catch (error) {
      console.error('[POST] Get current user posts error:', error);
      return ApiResponse.serverError(res, 'Failed to get current user posts');
    }
  },
  getFeedPosts,
  getPost,
  updatePost,
  deletePost,
  // Save/Unsave
  async savePost(req, res) {
    try {
      const { postId } = req.params;
      const userId = req.user?.userId;

      const post = await Post.findById(postId).select('_id status');
      if (!post) return ApiResponse.notFound(res, 'Post not found');
      if (post.status === 'deleted') return ApiResponse.badRequest(res, 'Cannot save a deleted post');

      const user = await User.findById(userId).select('savedPosts');
      if (!user) return ApiResponse.forbidden(res, 'User not found');

      const alreadySaved = user.savedPosts?.some(p => p.toString() === postId);
      if (alreadySaved) {
        return ApiResponse.success(res, { saved: true }, 'Post already saved');
      }

      user.savedPosts = [...(user.savedPosts || []), postId];
      await user.save();

      return ApiResponse.success(res, { saved: true }, 'Post saved');
    } catch (error) {
      console.error('[POST] Save post error:', error);
      return ApiResponse.serverError(res, 'Failed to save post');
    }
  },
  async unsavePost(req, res) {
    try {
      const { postId } = req.params;
      const userId = req.user?.userId;

      const user = await User.findById(userId).select('savedPosts');
      if (!user) return ApiResponse.forbidden(res, 'User not found');

      user.savedPosts = (user.savedPosts || []).filter(p => p.toString() !== postId);
      await user.save();

      return ApiResponse.success(res, { saved: false }, 'Post unsaved');
    } catch (error) {
      console.error('[POST] Unsave post error:', error);
      return ApiResponse.serverError(res, 'Failed to unsave post');
    }
  },
  async getSavedPosts(req, res) {
    try {
      const userId = req.user?.userId;
      const { page = 1, limit = 20 } = req.query;

      const user = await User.findById(userId).select('savedPosts');
      if (!user) return ApiResponse.forbidden(res, 'User not found');

      const savedIds = user.savedPosts || [];
      const posts = await Post.find({ _id: { $in: savedIds }, status: { $ne: 'deleted' } })
        .populate('author', 'username fullName profilePictureUrl isVerified privacySettings')
        .sort({ publishedAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

      // Transform media for all saved posts
      const transformedPosts = posts.map(post => transformPostMedia(post));

      const totalPosts = await Post.countDocuments({ _id: { $in: savedIds }, status: { $ne: 'deleted' } });

      return ApiResponse.success(res, {
        posts: transformedPosts,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalPosts / limit),
          totalPosts,
          hasNext: page * limit < totalPosts,
          hasPrev: page > 1
        }
      }, 'Saved posts retrieved successfully');
    } catch (error) {
      console.error('[POST] Get saved posts error:', error);
      return ApiResponse.serverError(res, 'Failed to get saved posts');
    }
  },
  // Archive/Unarchive
  async archivePost(req, res) {
    try {
      const { postId } = req.params;
      const userId = req.user?.userId;

      const post = await Post.findById(postId);
      if (!post) return ApiResponse.notFound(res, 'Post not found');
      if (post.author.toString() !== userId) {
        return ApiResponse.forbidden(res, 'You can only archive your own posts');
      }

      post.status = 'archived';
      await post.save();
      
      const transformedPost = transformPostMedia(post);
      return ApiResponse.success(res, transformedPost, 'Post archived successfully');
    } catch (error) {
      console.error('[POST] Archive post error:', error);
      return ApiResponse.serverError(res, 'Failed to archive post');
    }
  },
  async unarchivePost(req, res) {
    try {
      const { postId } = req.params;
      const userId = req.user?.userId;

      const post = await Post.findById(postId);
      if (!post) return ApiResponse.notFound(res, 'Post not found');
      if (post.author.toString() !== userId) {
        return ApiResponse.forbidden(res, 'You can only unarchive your own posts');
      }

      post.status = 'published';
      await post.save();
      
      const transformedPost = transformPostMedia(post);
      return ApiResponse.success(res, transformedPost, 'Post unarchived successfully');
    } catch (error) {
      console.error('[POST] Unarchive post error:', error);
      return ApiResponse.serverError(res, 'Failed to unarchive post');
    }
  },
  async getArchivedPosts(req, res) {
    try {
      const userId = req.user?.userId;
      const { page = 1, limit = 20 } = req.query;

      // Only get archived posts from the current user
      const posts = await Post.find({
        author: userId,
        status: 'archived'
      })
        .populate('author', 'username fullName profilePictureUrl isVerified privacySettings')
        .populate('comments.user', 'username fullName profilePictureUrl')
        .populate('likes.user', 'username fullName')
        .sort({ publishedAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

      // Transform media for all archived posts
      const transformedPosts = posts.map(post => {
        const postObj = post.toObject();
        
        // Add lastComment field
        if (postObj.comments && postObj.comments.length > 0) {
          const sortedComments = [...postObj.comments].sort((a, b) => 
            new Date(b.createdAt) - new Date(a.createdAt)
          );
          postObj.lastComment = sortedComments[0];
        } else {
          postObj.lastComment = null;
        }
        
        return transformPostMedia(postObj);
      });

      const totalPosts = await Post.countDocuments({
        author: userId,
        status: 'archived'
      });

      return ApiResponse.success(res, {
        posts: transformedPosts,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalPosts / limit),
          totalPosts,
          hasNext: page * limit < totalPosts,
          hasPrev: page > 1
        }
      }, 'Archived posts retrieved successfully');
    } catch (error) {
      console.error('[POST] Get archived posts error:', error);
      return ApiResponse.serverError(res, 'Failed to get archived posts');
    }
  },
  
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
  addMention,
  
  // User Suggestions
  getSuggestedUsers
};
