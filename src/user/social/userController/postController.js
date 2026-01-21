const Post = require('../userModel/postModel');
const User = require('../../auth/model/userAuthModel');
const FollowRequest = require('../userModel/followRequestModel');
const ApiResponse = require('../../../utils/apiResponse');
const { uploadToS3, deleteFromS3 } = require('../../../services/s3Service');
const feedAlgorithmService = require('../../../services/feedAlgorithmService');
const notificationService = require('../../../notification/services/notificationService');
const contentModeration = require('../userModel/contentModerationModel');
const { getCachedUserData, cacheUserData, invalidateUserCache } = require('../../../middleware/cacheMiddleware');
const enhancedRealtimeService = require('../../../services/enhancedRealtimeService');

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

// Helper function to add isLiked field to a post
function addIsLiked(post, userId) {
  // If isLiked is already set (from aggregation pipeline), use it
  if (post.isLiked !== undefined) {
    return post;
  }

  if (!userId) {
    post.isLiked = false;
    return post;
  }

  // Check if likes exists and is an array
  if (!post.likes || !Array.isArray(post.likes)) {
    post.isLiked = false;
    return post;
  }

  // Check if user has liked this post
  const isLiked = post.likes.some(like => {
    const likeUserId = like.user?._id ? like.user._id.toString() : like.user?.toString();
    return likeUserId === userId.toString();
  });

  post.isLiked = !!isLiked;
  return post;
}

// Helper function to add isSaved field to a post
function addIsSaved(post, savedPostIds = []) {
  // If isSaved is already set, use it
  if (post.isSaved !== undefined) {
    return post;
  }

  if (!savedPostIds || savedPostIds.length === 0) {
    post.isSaved = false;
    return post;
  }

  // Get post ID
  const postId = post._id ? post._id.toString() : (post.id ? post.id.toString() : null);

  if (!postId) {
    post.isSaved = false;
    return post;
  }

  // Check if post ID is in savedPostIds array
  const isSaved = savedPostIds.some(savedId => {
    const savedIdStr = savedId ? savedId.toString() : null;
    return savedIdStr === postId;
  });

  post.isSaved = !!isSaved;
  return post;
}

// Helper function to add lastComment field (newest comment) to a post
function addLastComment(post) {
  // If lastComment is already set, use it
  if (post.lastComment !== undefined) {
    return post;
  }

  let commentsArray = null;

  // Handle different comment structures
  if (post.comments && Array.isArray(post.comments) && post.comments.length > 0) {
    // Normal array structure
    commentsArray = post.comments;
  } else if (post.comments && typeof post.comments === 'object' && !Array.isArray(post.comments)) {
    // Handle malformed structure from aggregation (comments.user)
    // This happens when aggregation uses as: 'comments.user' which overwrites the array
    // We can't get full comment data from this, so set to null
    post.lastComment = null;
    return post;
  }

  // Get the newest comment from the comments array
  if (commentsArray && commentsArray.length > 0) {
    // Filter out invalid comments
    const validComments = commentsArray.filter(comment => 
      comment && 
      typeof comment === 'object' && 
      comment.createdAt
    );

    if (validComments.length > 0) {
      // Sort comments by createdAt descending to get the newest first
      const sortedComments = [...validComments].sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
        const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
        return dateB - dateA; // Descending order (newest first)
      });
      
      // Get the newest comment (first in sorted array)
      post.lastComment = sortedComments[0];
    } else {
      post.lastComment = null;
    }
  } else {
    post.lastComment = null;
  }

  return post;
}

// Helper function to check if a post should be visible based on privacy settings
// Returns true if post should be visible, false if it should be hidden
function isPostVisible(post, currentUserId, followingIds = []) {
  // If no current user, only show public posts from non-private accounts
  if (!currentUserId) {
    const author = post.author || {};
    const isPrivate = author.privacySettings?.isPrivate === true;
    return !isPrivate;
  }

  // Get author ID
  const author = post.author || {};
  let authorId;
  if (author._id) {
    authorId = author._id.toString();
  } else if (typeof author === 'string') {
    authorId = author;
  } else if (post.author) {
    authorId = post.author.toString();
  } else {
    // Can't determine author, hide post for safety
    return false;
  }

  // If current user is the author, always show
  if (authorId === currentUserId.toString()) {
    return true;
  }

  // Check if author account is private
  const isPrivate = author.privacySettings?.isPrivate === true;

  // If account is not private, show the post (subject to other visibility rules)
  if (!isPrivate) {
    return true;
  }

  // If account is private, only show if current user is following the author
  const isFollowing = followingIds.some(id => id.toString() === authorId);
  return isFollowing;
}

// Helper function to transform post media into a cleaner structure
function transformPostMedia(post, userId = null, savedPostIds = []) {
  const postObj = typeof post.toObject === 'function' ? post.toObject() : post;

  // Add isLiked field
  addIsLiked(postObj, userId);

  // Add isSaved field
  addIsSaved(postObj, savedPostIds);

  // Add lastComment field (newest comment)
  addLastComment(postObj);

  // DEBUG: Log original post media structure
  const postId = postObj._id || postObj.id || 'unknown';
  console.log(`[POST][TRANSFORM] Post ID: ${postId}`);
  console.log(`[POST][TRANSFORM] Original media type:`, typeof postObj.media);
  console.log(`[POST][TRANSFORM] Is media array:`, Array.isArray(postObj.media));
  console.log(`[POST][TRANSFORM] Media length:`, postObj.media?.length || 0);

  // Check if media is already in transformed format (has images/videos arrays)
  const isAlreadyTransformed = postObj.media &&
    typeof postObj.media === 'object' &&
    !Array.isArray(postObj.media) &&
    (Array.isArray(postObj.media.images) || Array.isArray(postObj.media.videos));

  if (isAlreadyTransformed) {
    console.log(`[POST][TRANSFORM] ⚠️ Media is already transformed, preserving existing structure`);
    console.log(`[POST][TRANSFORM] Existing structure:`, {
      imagesCount: postObj.media.images?.length || 0,
      videosCount: postObj.media.videos?.length || 0,
      hasImages: postObj.media.hasImages,
      hasVideos: postObj.media.hasVideos,
      totalCount: postObj.media.totalCount
    });

    // Media is already transformed, just ensure structure is correct
    if (!postObj.media.images) postObj.media.images = [];
    if (!postObj.media.videos) postObj.media.videos = [];
    postObj.media.totalCount = (postObj.media.images?.length || 0) + (postObj.media.videos?.length || 0);
    postObj.media.hasImages = (postObj.media.images?.length || 0) > 0;
    postObj.media.hasVideos = (postObj.media.videos?.length || 0) > 0;

    // Add isSaved field (already added isLiked above)
    addIsSaved(postObj, savedPostIds);

    return postObj;
  }

  if (postObj.media && Array.isArray(postObj.media) && postObj.media.length > 0) {
    console.log(`[POST][TRANSFORM] First media item structure:`, JSON.stringify(postObj.media[0], null, 2));
    console.log(`[POST][TRANSFORM] All media items keys:`, postObj.media.map((item, idx) => ({
      index: idx,
      hasType: !!item.type,
      type: item.type,
      hasMimeType: !!item.mimeType,
      mimeType: item.mimeType,
      hasUrl: !!item.url,
      url: item.url?.substring(0, 100) || 'no url',
      keys: Object.keys(item)
    })));
  } else if (postObj.media) {
    console.log(`[POST][TRANSFORM] Media is not array, structure:`, JSON.stringify(postObj.media, null, 2));
  } else {
    console.log(`[POST][TRANSFORM] No media found in post`);
  }

  // Separate images and videos
  const images = [];
  const videos = [];

  if (postObj.media && Array.isArray(postObj.media)) {
    postObj.media.forEach((mediaItem, index) => {
      console.log(`[POST][TRANSFORM] Processing media item ${index}:`, {
        hasUrl: !!mediaItem?.url,
        url: mediaItem?.url?.substring(0, 100) || 'no url',
        hasType: !!mediaItem?.type,
        type: mediaItem?.type,
        hasMimeType: !!mediaItem?.mimeType,
        mimeType: mediaItem?.mimeType,
        allKeys: mediaItem ? Object.keys(mediaItem) : []
      });

      if (!mediaItem || !mediaItem.url) {
        console.log(`[POST][TRANSFORM] ⚠️ Skipping media item ${index} - no url or invalid item`);
        return; // Skip invalid media items
      }

      // Determine media type: check explicit type, then mimeType, then infer from URL
      let mediaType = mediaItem.type;
      let typeSource = 'explicit';

      if (!mediaType && mediaItem.mimeType) {
        // Infer from mimeType
        if (mediaItem.mimeType.startsWith('image/')) {
          mediaType = 'image';
          typeSource = 'mimeType';
        } else if (mediaItem.mimeType.startsWith('video/')) {
          mediaType = 'video';
          typeSource = 'mimeType';
        }
      }

      if (!mediaType && mediaItem.url) {
        // Infer from URL extension as fallback
        const url = mediaItem.url.toLowerCase();
        if (url.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?|$)/)) {
          mediaType = 'image';
          typeSource = 'url-extension';
        } else if (url.match(/\.(mp4|mov|avi|webm|mkv|flv|wmv)(\?|$)/)) {
          mediaType = 'video';
          typeSource = 'url-extension';
        }
      }

      console.log(`[POST][TRANSFORM] Media item ${index} determined type:`, {
        mediaType,
        typeSource,
        willProcess: !!mediaType
      });

      // Process based on determined type
      if (mediaType === 'image') {
        const imageData = {
          url: mediaItem.url,
          thumbnail: mediaItem.thumbnail,
          thumbnailUrl: mediaItem.thumbnailUrl || mediaItem.thumbnail,
          dimensions: mediaItem.dimensions,
          blurhash: mediaItem.blurhash || null, // BlurHash for instant placeholders
          responsiveUrls: mediaItem.responsiveUrls || null, // Multiple sizes for images
        };
        images.push(imageData);
        console.log(`[POST][TRANSFORM] ✅ Added image ${index}:`, {
          url: imageData.url?.substring(0, 100),
          hasThumbnail: !!imageData.thumbnail,
          hasBlurhash: !!imageData.blurhash
        });
      } else if (mediaType === 'video') {
        const videoData = {
          url: mediaItem.url,
          thumbnail: mediaItem.thumbnail,
          thumbnailUrl: mediaItem.thumbnailUrl || mediaItem.thumbnail,
          duration: mediaItem.duration,
          dimensions: mediaItem.dimensions
        };
        videos.push(videoData);
        console.log(`[POST][TRANSFORM] ✅ Added video ${index}:`, {
          url: videoData.url,
          urlLength: videoData.url?.length,
          urlIsVideo: videoData.url?.includes('.mp4') || videoData.url?.includes('video') || videoData.url?.includes('s3.amazonaws.com'),
          thumbnail: videoData.thumbnail,
          thumbnailLength: videoData.thumbnail?.length,
          thumbnailIsImage: videoData.thumbnail?.includes('unsplash') || videoData.thumbnail?.includes('placeholder'),
          hasThumbnail: !!videoData.thumbnail,
          duration: videoData.duration,
          originalMediaItem: {
            url: mediaItem.url,
            thumbnail: mediaItem.thumbnail,
            type: mediaItem.type,
            mimeType: mediaItem.mimeType
          }
        });
      } else {
        // If we still can't determine type but have a URL, default to image
        // This handles edge cases where media exists but type info is missing
        console.warn(`[POST][TRANSFORM] ⚠️ Media item ${index} has no type, defaulting to image:`, {
          url: mediaItem.url?.substring(0, 100),
          hasMimeType: !!mediaItem.mimeType,
          mimeType: mediaItem.mimeType,
          allKeys: Object.keys(mediaItem)
        });
        const imageData = {
          url: mediaItem.url,
          thumbnail: mediaItem.thumbnail,
          thumbnailUrl: mediaItem.thumbnailUrl || mediaItem.thumbnail,
          dimensions: mediaItem.dimensions,
          blurhash: mediaItem.blurhash || null,
          responsiveUrls: mediaItem.responsiveUrls || null,
        };
        images.push(imageData);
        console.log(`[POST][TRANSFORM] ✅ Added as image (fallback) ${index}`);
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

  // DEBUG: Log final transformed structure
  console.log(`[POST][TRANSFORM] Final transformed media for post ${postId}:`, {
    imagesCount: images.length,
    videosCount: videos.length,
    totalCount: postObj.media.totalCount,
    hasImages: postObj.media.hasImages,
    hasVideos: postObj.media.hasVideos,
    firstImageUrl: images[0]?.url?.substring(0, 100) || 'none',
    firstVideoUrl: videos[0]?.url?.substring(0, 100) || 'none'
  });

  // Normalize location to ensure all fields are visible
  postObj.location = normalizeLocation(postObj.location);

  return postObj;
}

// Create a new post
async function createPost(req, res) {
  try {
    const { content, caption, hashtags, mentions, location, visibility, likeVisibility, commentVisibility } = req.body;
    const userId = req.user?.userId;

    if ((!req.files || req.files.length === 0)) {
      return ApiResponse.badRequest(res, 'Post media is required');
    }

    // Process media files and thumbnails
    const media = [];

    // Handle both uploadMultiple (req.files array) and uploadWithThumbnails (req.files object)
    let mediaFiles = [];
    let thumbnailFiles = [];

    if (Array.isArray(req.files)) {
      // Old format: uploadMultiple - all files in array
      mediaFiles = req.files;
    } else if (req.files && typeof req.files === 'object') {
      // New format: uploadWithThumbnails - files organized by fieldname
      mediaFiles = req.files.files || [];
      thumbnailFiles = req.files.thumbnails || [];
    }

    // Create thumbnail map for quick lookup (match by index)
    const thumbnailMap = new Map();
    thumbnailFiles.forEach((thumbFile, index) => {
      thumbnailMap.set(index, thumbFile);
    });

    if (mediaFiles.length > 0) {
      let videoIndex = 0; // Track video index for thumbnail matching

      for (let i = 0; i < mediaFiles.length; i++) {
        const file = mediaFiles[i];

        // Validate media type - only images and videos allowed
        if (!file.mimetype.startsWith('image/') && !file.mimetype.startsWith('video/')) {
          return ApiResponse.badRequest(res, 'Only images and videos are allowed');
        }

        try {
          // Upload main media file to S3
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

          // Upload thumbnail for videos (if provided)
          let thumbnailUrl = null;
          if (file.mimetype.startsWith('video/')) {
            const thumbnailFile = thumbnailMap.get(videoIndex);
            if (thumbnailFile) {
              try {
                const thumbnailResult = await uploadToS3({
                  buffer: thumbnailFile.buffer,
                  contentType: thumbnailFile.mimetype,
                  userId: userId,
                  category: 'posts',
                  type: 'image',
                  filename: `thumbnail_${file.originalname.replace(/\.[^/.]+$/, '.jpg')}`,
                  metadata: {
                    originalName: thumbnailFile.originalname,
                    uploadedAt: new Date().toISOString(),
                    isThumbnail: 'true',
                    parentMedia: uploadResult.key
                  }
                });
                thumbnailUrl = thumbnailResult.url;
                console.log('[POST] Video thumbnail uploaded:', thumbnailResult.url);
              } catch (thumbError) {
                console.warn('[POST] Thumbnail upload failed, continuing without thumbnail:', thumbError);
              }
            }
            videoIndex++;
          }

          media.push({
            type: uploadResult.type,
            url: uploadResult.url,
            thumbnail: thumbnailUrl || uploadResult.thumbnail || null,
            filename: file.originalname,
            fileSize: file.size,
            mimeType: file.mimetype,
            duration: uploadResult.duration || null,
            dimensions: uploadResult.dimensions || null,
            s3Key: uploadResult.key,
            responsiveUrls: uploadResult.responsiveUrls || null, // Multiple sizes for images
            blurhash: uploadResult.blurhash || null, // BlurHash for instant placeholders
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
      likeVisibility: likeVisibility || 'everyone',
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

    // OPTIMIZED: Calculate engagement score on post creation (Phase 3)
    if (post.updateEngagementScore) {
      post.updateEngagementScore();
      await post.save();
    }

    // Send notifications for mentions
    if (processedMentions && processedMentions.length > 0) {
      processedMentions.forEach(async (mentionedUserId) => {
        if (mentionedUserId.toString() !== userId.toString()) {
          try {
            await notificationService.create({
              context: 'social',
              type: 'post_mention',
              recipientId: mentionedUserId.toString(),
              senderId: userId.toString(),
              data: {
                postId: post._id.toString(),
                contentType: 'post'
              }
            });
          } catch (notificationError) {
            console.error('[POST] Mention notification error:', notificationError);
            // Don't fail post creation if notification fails
          }
        }
      });
    }

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

    // Get user's saved posts for isSaved flag
    let savedPostIds = [];
    if (userId) {
      const user = await User.findById(userId).select('savedPosts').lean();
      savedPostIds = user?.savedPosts?.map(id => id.toString()) || [];
    }

    // Transform media into organized structure before returning (includes isLiked and isSaved)
    const transformedPost = transformPostMedia(post, userId, savedPostIds);

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

    // OPTIMIZED: Limit populate fields and use lean for better performance
    const posts = await Post.find(query)
      .populate('author', 'username fullName profilePictureUrl isVerified privacySettings')
      .populate({
        path: 'comments.user',
        select: 'username fullName profilePictureUrl',
        options: { limit: 5 } // Only populate first 5 comments for list view
      })
      .populate({
        path: 'likes.user',
        select: 'username fullName',
        options: { limit: 10 } // Only populate first 10 likes for list view
      })
      .sort({ publishedAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean(); // Use lean for better performance

    const totalPosts = await Post.countDocuments(query);

    // Get current user's following list for privacy check and saved posts for isSaved flag
    let followingIds = [];
    let savedPostIds = [];
    if (currentUserId) {
      const currentUser = await User.findById(currentUserId).select('following savedPosts').lean();
      if (userId !== currentUserId) {
        followingIds = currentUser?.following?.map(id => id.toString()) || [];
      }
      savedPostIds = currentUser?.savedPosts?.map(id => id.toString()) || [];
    }

    // Transform media for each post (includes isLiked, isSaved, and lastComment)
    console.log(`[POST][USER] Transforming ${posts.length} posts for user ${userId}`);
    const postsWithLastComment = posts.map(post => {
      // `posts` is already lean() (plain objects), so avoid calling toObject()
      const postObj = { ...post };

      // Transform media into organized structure (includes isLiked, isSaved, and lastComment)
      return transformPostMedia(postObj, currentUserId, savedPostIds);
    });

    // Filter out posts from private accounts (unless user is following them or is the author)
    const visiblePosts = postsWithLastComment.filter(post =>
      isPostVisible(post, currentUserId, followingIds)
    );

    // DEBUG: Log summary
    const postsWithMedia = visiblePosts.filter(p => p.media && (p.media.images?.length > 0 || p.media.videos?.length > 0));
    console.log(`[POST][USER] Transformation summary:`, {
      totalPosts: postsWithLastComment.length,
      visiblePosts: visiblePosts.length,
      filteredPrivatePosts: postsWithLastComment.length - visiblePosts.length,
      postsWithMedia: postsWithMedia.length,
      postsWithoutMedia: visiblePosts.length - postsWithMedia.length,
      totalImages: visiblePosts.reduce((sum, p) => sum + (p.media?.images?.length || 0), 0),
      totalVideos: visiblePosts.reduce((sum, p) => sum + (p.media?.videos?.length || 0), 0),
    });

    return ApiResponse.success(res, {
      posts: visiblePosts,
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

    // OPTIMIZED: Cache feed results for 2 minutes (feed changes frequently) - Phase 3
    let feedPosts = getCachedUserData(userId, `feed:posts:${page}:${limit}`);
    let isFromCache = !!feedPosts;

    // Check if cached posts are already transformed (shouldn't happen, but handle it)
    if (feedPosts && feedPosts.length > 0) {
      const firstPost = feedPosts[0];
      const isAlreadyTransformed = firstPost.media &&
        typeof firstPost.media === 'object' &&
        !Array.isArray(firstPost.media) &&
        (Array.isArray(firstPost.media.images) || Array.isArray(firstPost.media.videos));

      if (isAlreadyTransformed) {
        console.log(`[POST][FEED] ⚠️ Cached posts are already transformed, invalidating cache and fetching fresh`);
        // Invalidate the corrupted cache entry
        invalidateUserCache(userId, `feed:posts:${page}:${limit}`);
        // Clear cache and fetch fresh
        feedPosts = null;
        isFromCache = false;
      } else {
        // Validate all cached posts are raw (media should be array)
        const transformedCount = feedPosts.filter(post => {
          return post.media &&
            typeof post.media === 'object' &&
            !Array.isArray(post.media) &&
            (Array.isArray(post.media.images) || Array.isArray(post.media.videos));
        }).length;

        if (transformedCount > 0) {
          console.log(`[POST][FEED] ⚠️ Found ${transformedCount} transformed posts in cache, invalidating and fetching fresh`);
          invalidateUserCache(userId, `feed:posts:${page}:${limit}`);
          feedPosts = null;
          isFromCache = false;
        } else {
          console.log(`[POST][FEED] ✅ Cached posts are raw (media is array format)`);
        }
      }
    }

    if (!feedPosts) {
      // Use the smart feed algorithm service (now optimized with pre-calculated scores)
      feedPosts = await feedAlgorithmService.generatePersonalizedFeed(
        userId,
        parseInt(page),
        parseInt(limit)
      );

      // Validate that posts are raw (media should be array, not transformed object)
      const transformedPosts = feedPosts.filter(post => {
        return post.media &&
          typeof post.media === 'object' &&
          !Array.isArray(post.media) &&
          (Array.isArray(post.media.images) || Array.isArray(post.media.videos));
      });

      if (transformedPosts.length > 0) {
        console.log(`[POST][FEED] ⚠️ Feed algorithm returned ${transformedPosts.length} already-transformed posts, skipping cache`);
        console.log(`[POST][FEED] Sample transformed post media:`, JSON.stringify(transformedPosts[0].media).substring(0, 200));
        // Don't cache transformed posts - they should be raw from the database
      } else {
        // Validate media format before caching
        const postsWithArrayMedia = feedPosts.filter(post => Array.isArray(post.media)).length;
        const postsWithNoMedia = feedPosts.filter(post => !post.media).length;
        const postsWithObjectMedia = feedPosts.filter(post =>
          post.media && typeof post.media === 'object' && !Array.isArray(post.media) &&
          !Array.isArray(post.media.images) && !Array.isArray(post.media.videos)
        ).length;

        console.log(`[POST][FEED] ✅ Validating posts before cache:`, {
          total: feedPosts.length,
          withArrayMedia: postsWithArrayMedia,
          withNoMedia: postsWithNoMedia,
          withObjectMedia: postsWithObjectMedia
        });

        // Cache feed posts for 2 minutes (only cache raw posts, not transformed)
        cacheUserData(userId, `feed:posts:${page}:${limit}`, feedPosts, 120);
        console.log(`[POST][FEED] ✅ Cached ${feedPosts.length} raw posts`);
      }
    }

    // Get user's saved posts for isSaved flag (before transforming posts)
    let savedPostIds = [];
    if (userId) {
      const userWithSaved = await User.findById(userId).select('savedPosts').lean();
      savedPostIds = userWithSaved?.savedPosts?.map(id => id.toString()) || [];
    }

    // Transform media for all feed posts (includes isLiked and isSaved)
    console.log(`[POST][FEED] Transforming ${feedPosts.length} posts for feed (fromCache: ${isFromCache})`);

    // DEBUG: Log raw media structure BEFORE transformation (first 3 posts with videos)
    const postsWithRawVideos = feedPosts
      .filter(post => post.media && Array.isArray(post.media) && post.media.some(m => m.type === 'video'))
      .slice(0, 3);
    postsWithRawVideos.forEach((post, idx) => {
      const videoItems = post.media.filter(m => m.type === 'video');
      console.log(`[POST][FEED] Raw post ${idx} (${post._id || post.id}) BEFORE transformation:`, {
        mediaType: typeof post.media,
        isArray: Array.isArray(post.media),
        mediaLength: post.media?.length || 0,
        videoItemsCount: videoItems.length,
        firstVideoItem: videoItems[0] ? {
          url: videoItems[0].url,
          urlLength: videoItems[0].url?.length,
          urlIsVideo: videoItems[0].url ? (videoItems[0].url.includes('.mp4') || videoItems[0].url.includes('video') || videoItems[0].url.includes('s3.amazonaws.com')) : false,
          thumbnail: videoItems[0].thumbnail,
          thumbnailLength: videoItems[0].thumbnail?.length,
          thumbnailIsImage: videoItems[0].thumbnail ? (videoItems[0].thumbnail.includes('unsplash') || videoItems[0].thumbnail.includes('placeholder')) : false,
          type: videoItems[0].type,
          mimeType: videoItems[0].mimeType,
          allKeys: Object.keys(videoItems[0])
        } : null
      });
    });

    const transformedFeedPosts = feedPosts.map(post => transformPostMedia(post, userId, savedPostIds));

    // OPTIMIZED: Cache user data (blocked users, following) for 5 minutes
    const cacheKey = 'feed:userData';
    let user = getCachedUserData(userId, cacheKey);

    if (!user) {
      user = await User.findById(userId).select('following blockedUsers blockedBy').lean();
      if (user) {
        cacheUserData(userId, cacheKey, user, 300); // Cache for 5 minutes
      }
    }

    const followingIds = user?.following?.map(id => id.toString()) || [];

    // Filter out posts from private accounts (unless user is following them or is the author)
    const visibleFeedPosts = transformedFeedPosts.filter(post =>
      isPostVisible(post, userId, followingIds)
    );

    // DEBUG: Log summary of transformed posts
    const postsWithMedia = visibleFeedPosts.filter(p => p.media && (p.media.images?.length > 0 || p.media.videos?.length > 0));
    const postsWithoutMedia = visibleFeedPosts.filter(p => !p.media || (p.media.images?.length === 0 && p.media.videos?.length === 0));
    console.log(`[POST][FEED] Transformation summary:`, {
      totalPosts: transformedFeedPosts.length,
      visiblePosts: visibleFeedPosts.length,
      filteredPrivatePosts: transformedFeedPosts.length - visibleFeedPosts.length,
      postsWithMedia: postsWithMedia.length,
      postsWithoutMedia: postsWithoutMedia.length,
      totalImages: visibleFeedPosts.reduce((sum, p) => sum + (p.media?.images?.length || 0), 0),
      totalVideos: visibleFeedPosts.reduce((sum, p) => sum + (p.media?.videos?.length || 0), 0),
    });

    // DEBUG: Log first 3 posts' media structure with FULL video URLs
    visibleFeedPosts.slice(0, 3).forEach((post, idx) => {
      const firstVideo = post.media?.videos?.[0];
      const firstImage = post.media?.images?.[0];
      console.log(`[POST][FEED] Post ${idx} (${post._id || post.id}):`, {
        hasMedia: !!post.media,
        imagesCount: post.media?.images?.length || 0,
        videosCount: post.media?.videos?.length || 0,
        firstImageUrl: firstImage?.url || 'none',
        firstVideoUrl: firstVideo?.url || 'none',
        firstVideoThumbnail: firstVideo?.thumbnail || 'none',
        firstVideoUrlLength: firstVideo?.url?.length || 0,
        firstVideoThumbnailLength: firstVideo?.thumbnail?.length || 0,
        firstVideoIsVideoUrl: firstVideo?.url ? (firstVideo.url.includes('.mp4') || firstVideo.url.includes('video') || firstVideo.url.includes('s3.amazonaws.com')) : false,
        firstVideoThumbnailIsImage: firstVideo?.thumbnail ? (firstVideo.thumbnail.includes('unsplash') || firstVideo.thumbnail.includes('placeholder')) : false,
        firstVideoFull: firstVideo ? JSON.stringify(firstVideo) : 'none',
        mediaStructure: JSON.stringify(post.media).substring(0, 500)
      });
    });

    // DEBUG: Log ALL video URLs to check if they're correct
    const allVideos = visibleFeedPosts
      .flatMap(post => (post.media?.videos || []).map(v => ({ postId: post._id || post.id, video: v })))
      .slice(0, 5); // Log first 5 videos
    console.log(`[POST][FEED] Sample video URLs (first 5):`, allVideos.map(({ postId, video }) => ({
      postId,
      url: video.url,
      urlLength: video.url?.length,
      urlIsVideo: video.url ? (video.url.includes('.mp4') || video.url.includes('video') || video.url.includes('s3.amazonaws.com')) : false,
      thumbnail: video.thumbnail,
      thumbnailLength: video.thumbnail?.length,
      thumbnailIsImage: video.thumbnail ? (video.thumbnail.includes('unsplash') || video.thumbnail.includes('placeholder')) : false
    })));

    const blockedUserIds = user?.blockedUsers?.map(id => id.toString()) || [];
    const blockedByIds = user?.blockedBy?.map(id => id.toString()) || [];

    // Combine blocked users and current user
    const excludedUserIds = [...new Set([
      ...blockedUserIds,
      ...blockedByIds,
      userId // Exclude own posts
    ])];

    // OPTIMIZED: Use estimatedDocumentCount for faster approximate count, or cache count
    // For exact count, use countDocuments but consider caching the result
    const totalPosts = await Post.countDocuments({
      status: 'published',
      author: { $nin: excludedUserIds },
      $or: [
        { visibility: 'public' },
        { visibility: 'followers', author: { $in: followingIds } }
      ]
    });

    // DEBUG: Log final response structure with video URLs
    const finalVideos = visibleFeedPosts
      .flatMap(post => (post.media?.videos || []).map(v => ({ postId: post._id || post.id, video: v })))
      .slice(0, 3);
    console.log(`[POST][FEED] Final response video URLs (first 3):`, finalVideos.map(({ postId, video }) => ({
      postId,
      url: video.url,
      thumbnail: video.thumbnail,
      urlIsVideo: video.url ? (video.url.includes('.mp4') || video.url.includes('video') || video.url.includes('s3.amazonaws.com')) : false,
      thumbnailIsImage: video.thumbnail ? (video.thumbnail.includes('unsplash') || video.thumbnail.includes('placeholder')) : false
    })));

    console.log(`[POST][FEED] Sending response with:`, {
      postsCount: visibleFeedPosts.length,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalPosts / limit),
        totalPosts,
        hasNext: page * limit < totalPosts,
        hasPrev: page > 1
      }
    });

    return ApiResponse.success(res, {
      posts: visibleFeedPosts,
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

    // OPTIMIZED: Limit populate fields for single post view
    const post = await Post.findById(postId)
      .populate('author', 'username fullName profilePictureUrl isVerified privacySettings')
      .populate({
        path: 'comments.user',
        select: 'username fullName profilePictureUrl',
        options: { limit: 50 } // Limit comments for single post
      })
      .populate({
        path: 'likes.user',
        select: 'username fullName',
        options: { limit: 20 } // Limit likes for single post
      });

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

    // Check if author account is private
    const author = post.author;
    const isPrivate = author?.privacySettings?.isPrivate === true;
    const authorId = author?._id?.toString() || author?.toString();

    // If account is private and user is not the author, check if user is following
    if (isPrivate && authorId !== userId) {
      const currentUser = await User.findById(userId).select('following').lean();
      const followingIds = currentUser?.following?.map(id => id.toString()) || [];
      const isFollowing = followingIds.includes(authorId);

      if (!isFollowing) {
        return ApiResponse.forbidden(res, 'This account is private. You must follow to view posts.');
      }
    }

    // Add view if user is not the author
    if (post.author._id.toString() !== userId) {
      await post.addView(userId);
    }

    // Get user's saved posts for isSaved flag
    let savedPostIds = [];
    if (userId) {
      const user = await User.findById(userId).select('savedPosts').lean();
      savedPostIds = user?.savedPosts?.map(id => id.toString()) || [];
    }

    // Transform media into organized structure (includes isLiked and isSaved)
    const transformedPost = transformPostMedia(postObj, userId, savedPostIds);

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
    const { content, caption, hashtags, mentions, location, visibility, likeVisibility, commentVisibility } = req.body;
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
    if (likeVisibility !== undefined) post.likeVisibility = likeVisibility;
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

      // Send notifications for new mentions (only for newly added mentions)
      if (processedMentions && processedMentions.length > 0) {
        const existingMentions = post.mentions.map(m => m.user.toString());
        processedMentions.forEach(async (mentionedUserId) => {
          // Only notify if this is a new mention (not in existing mentions)
          if (!existingMentions.includes(mentionedUserId.toString()) &&
            mentionedUserId.toString() !== userId.toString()) {
            try {
              await notificationService.create({
                context: 'social',
                type: 'post_mention',
                recipientId: mentionedUserId.toString(),
                senderId: userId.toString(),
                data: {
                  postId: post._id.toString(),
                  contentType: 'post'
                }
              });
            } catch (notificationError) {
              console.error('[POST] Mention notification error:', notificationError);
              // Don't fail post update if notification fails
            }
          }
        });
      }
    }

    await post.save();
    await post.populate('author', 'username fullName profilePictureUrl isVerified privacySettings');
    await post.populate('likes.user', 'username fullName');

    // Get user's saved posts for isSaved flag
    let savedPostIds = [];
    if (userId) {
      const user = await User.findById(userId).select('savedPosts').lean();
      savedPostIds = user?.savedPosts?.map(id => id.toString()) || [];
    }

    // Transform media into organized structure before returning (includes isLiked and isSaved)
    const transformedPost = transformPostMedia(post, userId, savedPostIds);

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

    // Emit real-time event for post deletion
    try {
      enhancedRealtimeService.emitToPost(postId, 'post:deleted', {
        postId: postId,
        timestamp: new Date()
      });
      console.log('[POST] ✅ Real-time event emitted: post:deleted');
    } catch (realtimeError) {
      console.error('[POST] Error emitting real-time delete event:', realtimeError);
      // Don't fail the delete action if real-time event fails
    }

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

    // Get author ID - ensure we extract the actual ObjectId string
    // post.author can be either an ObjectId or a populated User object
    const mongoose = require('mongoose');
    let authorId;
    if (post.author instanceof mongoose.Types.ObjectId) {
      // Unpopulated: direct ObjectId
      authorId = post.author.toString();
    } else if (post.author && post.author._id) {
      // Populated: User object with _id
      authorId = post.author._id.toString();
    } else if (typeof post.author === 'string') {
      // Already a string
      authorId = post.author;
    } else {
      // Fallback: try to get ID from object
      authorId = post.author?.id || post.author?._id?.toString() || String(post.author);
    }

    // Validate it's a proper ObjectId string (24 hex characters)
    if (!/^[0-9a-fA-F]{24}$/.test(authorId)) {
      console.error('[POST] Invalid authorId extracted:', { authorId, authorType: typeof post.author, author: post.author });
      throw new Error('Invalid post author ID');
    }

    const existingLike = post.likes.find(like => like.user.toString() === userId);

    if (existingLike) {
      await post.removeLike(userId);
      // OPTIMIZED: Invalidate feed cache when post is unliked
      invalidateUserCache(userId, 'feed:*');
      
      // Emit real-time event for unlike
      try {
        const currentUser = await User.findById(userId).select('username fullName profilePictureUrl');
        // Use emitToPost to emit to post room (clients viewing this post will receive it)
        // Also emit globally so feed screens can update without joining rooms
        enhancedRealtimeService.emitToPost(postId, 'post:unliked', {
          postId: postId,
          userId: userId,
          user: {
            _id: currentUser._id,
            username: currentUser.username,
            fullName: currentUser.fullName,
            profilePictureUrl: currentUser.profilePictureUrl
          },
          likesCount: post.likesCount,
          timestamp: new Date()
        });
        // Also emit globally for feed screens that don't join post rooms
        if (enhancedRealtimeService.io) {
          enhancedRealtimeService.io.emit('post:unliked', {
            postId: postId,
            userId: userId,
            user: {
              _id: currentUser._id,
              username: currentUser.username,
              fullName: currentUser.fullName,
              profilePictureUrl: currentUser.profilePictureUrl
            },
            likesCount: post.likesCount,
            timestamp: new Date()
          });
        }
        console.log('[POST] ✅ Real-time event emitted: post:unliked (to post room and globally)');
      } catch (realtimeError) {
        console.error('[POST] Error emitting real-time unlike event:', realtimeError);
        // Don't fail the unlike action if real-time event fails
      }
      
      return ApiResponse.success(res, { liked: false, likesCount: post.likesCount }, 'Post unliked');
    } else {
      await post.addLike(userId);

      // Send notification for like (only if user is not liking their own post)
      if (authorId !== userId) {
        try {
          await notificationService.create({
            context: 'social',
            type: 'post_like',
            recipientId: authorId,
            senderId: userId,
            data: {
              postId: postId,
              contentType: 'post'
            }
          });
        } catch (notificationError) {
          console.error('[POST] Like notification error:', notificationError);
          // Don't fail the like action if notification fails
        }
      }

      // Emit real-time event for like
      try {
        const currentUser = await User.findById(userId).select('username fullName profilePictureUrl');
        // Use emitToPost to emit to post room (clients viewing this post will receive it)
        // Also emit globally so feed screens can update without joining rooms
        enhancedRealtimeService.emitToPost(postId, 'post:liked', {
          postId: postId,
          userId: userId,
          user: {
            _id: currentUser._id,
            username: currentUser.username,
            fullName: currentUser.fullName,
            profilePictureUrl: currentUser.profilePictureUrl
          },
          likesCount: post.likesCount,
          timestamp: new Date()
        });
        // Also emit globally for feed screens that don't join post rooms
        if (enhancedRealtimeService.io) {
          enhancedRealtimeService.io.emit('post:liked', {
            postId: postId,
            userId: userId,
            user: {
              _id: currentUser._id,
              username: currentUser.username,
              fullName: currentUser.fullName,
              profilePictureUrl: currentUser.profilePictureUrl
            },
            likesCount: post.likesCount,
            timestamp: new Date()
          });
        }
        console.log('[POST] ✅ Real-time event emitted: post:liked (to post room and globally)');
      } catch (realtimeError) {
        console.error('[POST] Error emitting real-time like event:', realtimeError);
        // Don't fail the like action if real-time event fails
      }

      // OPTIMIZED: Invalidate feed cache when post is liked
      invalidateUserCache(userId, 'feed:*');
      return ApiResponse.success(res, { liked: true, likesCount: post.likesCount }, 'Post liked');
    }
  } catch (error) {
    console.error('[POST] Toggle like error:', error);
    return ApiResponse.serverError(res, 'Failed to toggle like');
  }
}

// Helper function to format time ago
function formatTimeAgo(date) {
  console.log("33333333333", date)
  if (!date) return 'just now';

  const now = new Date();
  const likeDate = new Date(date);

  // Check if date is valid
  if (isNaN(likeDate.getTime())) {
    return 'just now';
  }

  const diffInSeconds = Math.floor((now - likeDate) / 1000);

  // Handle negative time differences (clock skew)
  if (diffInSeconds < 0) {
    return 'just now';
  }

  if (diffInSeconds < 60) {
    return `${diffInSeconds}s`;
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}h`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays}d`;
  }

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `${diffInWeeks}w`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths}mo`;
  }

  const diffInYears = Math.floor(diffInDays / 365);
  return `${diffInYears}y`;
}

// Get users who liked a post
async function getPostLikes(req, res) {
  try {
    const { postId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const currentUserId = req.user?.userId;

    // Find the post
    const post = await Post.findById(postId).select('likes');
    if (!post) {
      return ApiResponse.notFound(res, 'Post not found');
    }

    // Get current user's following list for follow status
    const currentUser = await User.findById(currentUserId).select('following followers');
    const currentUserFollowing = currentUser?.following?.map(id => id.toString()) || [];
    const currentUserFollowers = currentUser?.followers?.map(id => id.toString()) || [];

    // Sort likes by createdAt (most recent first) and paginate
    const sortedLikes = post.likes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedLikes = sortedLikes.slice(startIndex, endIndex);

    // Get user details for paginated likes
    const userIds = paginatedLikes.map(like => like.user);
    const users = await User.find({ _id: { $in: userIds } })
      .select('username fullName profilePictureUrl isVerified');

    // Get follow requests for these users
    const followRequests = await FollowRequest.find({
      $or: [
        { requester: currentUserId, recipient: { $in: userIds } },
        { requester: { $in: userIds }, recipient: currentUserId }
      ]
    }).lean();

    // Create maps for quick lookup
    const userMap = new Map();
    users.forEach(user => {
      userMap.set(user._id.toString(), user);
    });

    const followRequestMap = new Map();
    followRequests.forEach(request => {
      const key = `${request.requester.toString()}_${request.recipient.toString()}`;
      followRequestMap.set(key, request);
    });

    // Build response with user details, time ago, and follow status
    const likesWithDetails = paginatedLikes.map(like => {
      console.log("44444444444",like)
      const user = userMap.get(like.user.toString());
      if (!user) return null;

      const isCurrentUser = like.user.toString() === currentUserId;
      const isFollowing = currentUserFollowing.includes(like.user.toString());
      const isFollower = currentUserFollowers.includes(like.user.toString());

      // Check follow request status
      const outgoingRequestKey = `${currentUserId}_${like.user.toString()}`;
      const incomingRequestKey = `${like.user.toString()}_${currentUserId}`;

      const outgoingRequest = followRequestMap.get(outgoingRequestKey);
      const incomingRequest = followRequestMap.get(incomingRequestKey);

      let followRequestStatus = null;
      if (outgoingRequest) {
        followRequestStatus = outgoingRequest.status; // 'pending', 'accepted', 'rejected'
      } else if (incomingRequest) {
        followRequestStatus = `incoming_${incomingRequest.status}`; // 'incoming_pending', etc.
      }

      // Determine follow status
      let followStatus = 'not_following';
      if (isCurrentUser) {
        followStatus = 'self';
      } else if (isFollowing && isFollower) {
        followStatus = 'mutual';
      } else if (isFollowing) {
        followStatus = 'following';
      } else if (isFollower) {
        followStatus = 'follower';
      } else if (followRequestStatus === 'pending') {
        followStatus = 'requested';
      }

      return {
        userId: user._id,
        username: user.username,
        fullName: user.fullName,
        profilePictureUrl: user.profilePictureUrl,
        isVerified: user.isVerified || false,
        likedAt: like.createdAt,
        likedAgo: formatTimeAgo(like.likedAt),
        followStatus: followStatus,
        followRequestStatus: followRequestStatus,
        isFollowing: isFollowing,
        isFollower: isFollower
      };
    }).filter(item => item !== null);

    const totalLikes = post.likes.length;

    console.log('[POST] Post likes retrieved successfully');
    return ApiResponse.success(res, {
      likes: likesWithDetails,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalLikes / limit),
        totalLikes,
        hasNext: endIndex < totalLikes,
        hasPrev: page > 1
      }
    }, 'Post likes retrieved successfully');
  } catch (error) {
    console.error('[POST] Get post likes error:', error);
    return ApiResponse.serverError(res, 'Failed to get post likes');
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

    // Get author ID - ensure we extract the actual ObjectId string
    // post.author can be either an ObjectId or a populated User object
    const mongoose = require('mongoose');
    let authorId;
    if (post.author instanceof mongoose.Types.ObjectId) {
      // Unpopulated: direct ObjectId
      authorId = post.author.toString();
    } else if (post.author && post.author._id) {
      // Populated: User object with _id
      authorId = post.author._id.toString();
    } else if (typeof post.author === 'string') {
      // Already a string
      authorId = post.author;
    } else {
      // Fallback: try to get ID from object
      authorId = post.author?.id || post.author?._id?.toString() || String(post.author);
    }

    // Validate it's a proper ObjectId string (24 hex characters)
    if (!/^[0-9a-fA-F]{24}$/.test(authorId)) {
      console.error('[POST] Invalid authorId extracted:', { authorId, authorType: typeof post.author, author: post.author });
      throw new Error('Invalid post author ID');
    }

    // Send notification for comment (only if user is not commenting on their own post)
    if (authorId !== userId) {
      try {
        await notificationService.create({
          context: 'social',
          type: 'post_comment',
          recipientId: authorId,
          senderId: userId,
          data: {
            postId: postId,
            commentContent: content.trim(),
            contentType: 'post'
          }
        });
      } catch (notificationError) {
        console.error('[POST] Comment notification error:', notificationError);
        // Don't fail the comment action if notification fails
      }
    }

    // Emit real-time event for new comment
    try {
      const commentData = {
        _id: newComment._id,
        postId: postId,
        user: {
          _id: newComment.user._id,
          username: newComment.user.username,
          fullName: newComment.user.fullName,
          profilePictureUrl: newComment.user.profilePictureUrl
        },
        content: newComment.content,
        parentComment: newComment.parentComment,
        likesCount: 0,
        createdAt: newComment.createdAt,
        commentsCount: post.commentsCount
      };
      
      // Emit to post room and globally
      enhancedRealtimeService.emitToPost(postId, 'post:comment_added', commentData);
      // Also emit globally for feed screens that don't join post rooms
      if (enhancedRealtimeService.io) {
        enhancedRealtimeService.io.emit('post:comment_added', commentData);
      }
      console.log('[POST] ✅ Real-time event emitted: post:comment_added (to post room and globally)');
    } catch (realtimeError) {
      console.error('[POST] Error emitting real-time comment event:', realtimeError);
      // Don't fail the comment action if real-time event fails
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

// Get post comments with enhanced details
async function getPostComments(req, res) {
  try {
    const { postId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const currentUserId = req.user?.userId;

    const post = await Post.findById(postId)
      .populate({
        path: 'comments.user',
        select: 'username fullName profilePictureUrl isVerified'
      });

    if (!post) {
      return ApiResponse.notFound(res, 'Post no found');
    }

    // Sort comments: current user's comments first, then by createdAt (most recent first)
    const sortedComments = post.comments.sort((a, b) => {
      const aIsCurrentUser = a.user.toString() === currentUserId;
      const bIsCurrentUser = b.user.toString() === currentUserId;

      // Current user's comments first
      if (aIsCurrentUser && !bIsCurrentUser) return -1;
      if (!aIsCurrentUser && bIsCurrentUser) return 1;

      // Then sort by createdAt (most recent first)
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedComments = sortedComments.slice(startIndex, endIndex);

    // Enhance comments with additional info
    const enhancedComments = paginatedComments.map(comment => {
      const commentObj = comment.toObject ? comment.toObject() : comment;

      // Check if current user liked this comment
      const userLike = commentObj.likes?.find(like => like.user.toString() === currentUserId);
      const isLiked = !!userLike;

      return {
        _id: commentObj._id,
        user: commentObj.user,
        content: commentObj.content,
        parentComment: commentObj.parentComment,
        likes: commentObj.likes || [],
        likesCount: commentObj.likes?.length || 0,
        isLiked: isLiked,
        createdAt: commentObj.createdAt,
        commentedAgo: formatTimeAgo(commentObj.createdAt),
        updatedAt: commentObj.updatedAt
      };
    });

    const totalComments = post.comments.length;

    console.log('[POST] Comments retrieved successfully');
    return ApiResponse.success(res, {
      comments: enhancedComments,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalComments / limit),
        totalComments,
        hasNext: endIndex < totalComments,
        hasPrev: page > 1
      }
    }, 'Comments retrieved successfully');
  } catch (error) {
    console.error('[POST] Get comments error:', error);
    return ApiResponse.serverError(res, 'Failed to get comments');
  }
}

// Like/Unlike a comment
async function toggleCommentLike(req, res) {
  try {
    const { postId, commentId } = req.params;
    const userId = req.user?.userId;

    console.log('[POST] Toggle comment like - START:', { postId, commentId, userId });

    if (!postId || !commentId) {
      console.error('[POST] Toggle comment like - Missing parameters:', { postId, commentId });
      return ApiResponse.badRequest(res, 'Post ID and Comment ID are required');
    }

    if (!userId) {
      console.error('[POST] Toggle comment like - Missing userId');
      return ApiResponse.unauthorized(res, 'User authentication required');
    }

    const post = await Post.findById(postId);
    if (!post) {
      console.error('[POST] Toggle comment like - Post not found:', postId);
      return ApiResponse.notFound(res, 'Post not found');
    }

    // Find the comment
    const comment = post.comments.id(commentId);
    if (!comment) {
      console.error('[POST] Toggle comment like - Comment not found:', { postId, commentId });
      return ApiResponse.notFound(res, 'Comment not found');
    }

    console.log('[POST] Toggle comment like - Comment found:', {
      commentId,
      currentLikesCount: comment.likes?.length || 0,
      commentAuthor: comment.user?.toString()
    });

    // Check if user already liked this comment
    const existingLikeIndex = comment.likes.findIndex(like => like.user.toString() === userId);

    if (existingLikeIndex !== -1) {
      // Unlike: Remove the like
      comment.likes.splice(existingLikeIndex, 1);
      await post.save();

      // Emit real-time event for comment unlike
      try {
        const currentUser = await User.findById(userId).select('username fullName');
        const unlikeData = {
          postId: postId,
          commentId: commentId,
          userId: userId,
          user: {
            _id: currentUser._id,
            username: currentUser.username,
            fullName: currentUser.fullName
          },
          likesCount: comment.likes.length,
          timestamp: new Date()
        };
        // Emit to post room and globally
        enhancedRealtimeService.emitToPost(postId, 'post:comment_unliked', unlikeData);
        // Also emit globally for feed screens that don't join post rooms
        if (enhancedRealtimeService.io) {
          enhancedRealtimeService.io.emit('post:comment_unliked', unlikeData);
        }
        console.log('[POST] ✅ Real-time event emitted: post:comment_unliked (to post room and globally)');
      } catch (realtimeError) {
        console.error('[POST] Error emitting real-time comment unlike event:', realtimeError);
        // Don't fail the unlike action if real-time event fails
      }

      console.log('[POST] Comment unliked successfully:', {
        postId,
        commentId,
        userId,
        newLikesCount: comment.likes.length
      });

      return ApiResponse.success(res, {
        liked: false,
        likesCount: comment.likes.length
      }, 'Comment unliked');
    } else {
      // Like: Add the like
      comment.likes.push({
        user: userId,
        likedAt: new Date()
      });
      await post.save();

      // Emit real-time event for comment like
      try {
        const currentUser = await User.findById(userId).select('username fullName');
        const likeData = {
          postId: postId,
          commentId: commentId,
          userId: userId,
          user: {
            _id: currentUser._id,
            username: currentUser.username,
            fullName: currentUser.fullName
          },
          likesCount: comment.likes.length,
          timestamp: new Date()
        };
        // Emit to post room and globally
        enhancedRealtimeService.emitToPost(postId, 'post:comment_liked', likeData);
        // Also emit globally for feed screens that don't join post rooms
        if (enhancedRealtimeService.io) {
          enhancedRealtimeService.io.emit('post:comment_liked', likeData);
        }
        console.log('[POST] ✅ Real-time event emitted: post:comment_liked (to post room and globally)');
      } catch (realtimeError) {
        console.error('[POST] Error emitting real-time comment like event:', realtimeError);
        // Don't fail the like action if real-time event fails
      }

      console.log('[POST] Comment liked successfully:', {
        postId,
        commentId,
        userId,
        newLikesCount: comment.likes.length
      });

      return ApiResponse.success(res, {
        liked: true,
        likesCount: comment.likes.length
      }, 'Comment liked');
    }
  } catch (error) {
    console.error('[POST] Toggle comment like error:', error);
    return ApiResponse.serverError(res, 'Failed to toggle comment like');
  }
}

// Edit a comment
async function editComment(req, res) {
  try {
    const { postId, commentId } = req.params;
    const { content } = req.body;
    const userId = req.user?.userId;

    if (!content || content.trim().length === 0) {
      return ApiResponse.badRequest(res, 'Comment content is required');
    }

    if (content.length > 500) {
      return ApiResponse.badRequest(res, 'Comment cannot exceed 500 characters');
    }

    const post = await Post.findById(postId);
    if (!post) {
      return ApiResponse.notFound(res, 'Post not found');
    }

    // Find the comment
    const comment = post.comments.id(commentId);
    if (!comment) {
      return ApiResponse.notFound(res, 'Comment not found');
    }

    // Check if user is the comment author (only comment author can edit their own comment)
    const isCommentAuthor = comment.user.toString() === userId;

    if (!isCommentAuthor) {
      return ApiResponse.forbidden(res, 'You can only edit your own comments');
    }

    // Update the comment
    comment.content = content.trim();
    comment.isEdited = true;
    comment.editedAt = new Date();
    await post.save();

    // Populate the updated comment
    await post.populate({
      path: 'comments.user',
      select: 'username fullName profilePictureUrl isVerified'
    });

    const updatedComment = post.comments.id(commentId);
    const commentObj = updatedComment.toObject ? updatedComment.toObject() : updatedComment;

    // Check if current user liked this comment
    const userLike = commentObj.likes?.find(like => like.user.toString() === userId);
    const isLiked = !!userLike;

    // Emit real-time event for comment edit
    try {
      const editData = {
        postId: postId,
        commentId: commentId,
        comment: {
          _id: commentObj._id,
          user: commentObj.user,
          content: commentObj.content,
          isEdited: true,
          editedAt: commentObj.editedAt
        },
        timestamp: new Date()
      };
      // Emit to post room and globally
      enhancedRealtimeService.emitToPost(postId, 'post:comment_edited', editData);
      // Also emit globally for feed screens that don't join post rooms
      if (enhancedRealtimeService.io) {
        enhancedRealtimeService.io.emit('post:comment_edited', editData);
      }
      console.log('[POST] ✅ Real-time event emitted: post:comment_edited (to post room and globally)');
    } catch (realtimeError) {
      console.error('[POST] Error emitting real-time comment edit event:', realtimeError);
      // Don't fail the edit action if real-time event fails
    }

    console.log('[POST] Comment edited successfully');
    return ApiResponse.success(res, {
      comment: {
        _id: commentObj._id,
        user: commentObj.user,
        content: commentObj.content,
        parentComment: commentObj.parentComment,
        likes: commentObj.likes || [],
        likesCount: commentObj.likes?.length || 0,
        isLiked: isLiked,
        isEdited: true,
        createdAt: commentObj.createdAt,
        editedAt: commentObj.editedAt,
        commentedAgo: formatTimeAgo(commentObj.createdAt)
      },
      commentsCount: post.comments.length
    }, 'Comment edited successfully');
  } catch (error) {
    console.error('[POST] Edit comment error:', error);
    return ApiResponse.serverError(res, 'Failed to edit comment');
  }
}

// Delete a comment
async function deleteComment(req, res) {
  try {
    const { postId, commentId } = req.params;
    const userId = req.user?.userId;

    const post = await Post.findById(postId);
    if (!post) {
      return ApiResponse.notFound(res, 'Post not found');
    }

    // Find the comment
    const comment = post.comments.id(commentId);
    if (!comment) {
      return ApiResponse.notFound(res, 'Comment not found');
    }

    // Check if user is the post owner OR the comment author (both can delete)
    const isPostOwner = post.author.toString() === userId;
    const isCommentAuthor = comment.user.toString() === userId;

    if (!isPostOwner && !isCommentAuthor) {
      return ApiResponse.forbidden(res, 'Only the post owner or comment author can delete comments');
    }

    // Store comment ID before deletion for real-time event
    const commentIdToDelete = commentId;

    // Remove the comment
    comment.deleteOne();
    await post.save();

    // Emit real-time event for comment deletion
    try {
      const deleteData = {
        postId: postId,
        commentId: commentIdToDelete,
        commentsCount: post.comments.length,
        timestamp: new Date()
      };
      // Emit to post room and globally
      enhancedRealtimeService.emitToPost(postId, 'post:comment_deleted', deleteData);
      // Also emit globally for feed screens that don't join post rooms
      if (enhancedRealtimeService.io) {
        enhancedRealtimeService.io.emit('post:comment_deleted', deleteData);
      }
      console.log('[POST] ✅ Real-time event emitted: post:comment_deleted (to post room and globally)');
    } catch (realtimeError) {
      console.error('[POST] Error emitting real-time comment delete event:', realtimeError);
      // Don't fail the delete action if real-time event fails
    }

    const deletedBy = isPostOwner ? 'post owner' : 'comment author';
    console.log(`[POST] Comment deleted successfully by ${deletedBy}`);
    return ApiResponse.success(res, {
      commentsCount: post.comments.length
    }, 'Comment deleted successfully');
  } catch (error) {
    console.error('[POST] Delete comment error:', error);
    return ApiResponse.serverError(res, 'Failed to delete comment');
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

    // Emit real-time event for post share
    try {
      const currentUser = await User.findById(userId).select('username fullName profilePictureUrl');
      enhancedRealtimeService.broadcast(`post:${postId}`, 'post:shared', {
        postId: postId,
        userId: userId,
        user: {
          _id: currentUser._id,
          username: currentUser.username,
          fullName: currentUser.fullName,
          profilePictureUrl: currentUser.profilePictureUrl
        },
        shareType: shareType,
        sharesCount: post.sharesCount,
        timestamp: new Date()
      });
      console.log('[POST] ✅ Real-time event emitted: post:shared');
    } catch (realtimeError) {
      console.error('[POST] Error emitting real-time share event:', realtimeError);
      // Don't fail the share action if real-time event fails
    }

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

    // Get user's saved posts for isSaved flag
    let savedPostIds = [];
    let followingIds = [];
    if (userId) {
      const currentUser = await User.findById(userId).select('following savedPosts').lean();
      followingIds = currentUser?.following?.map(id => id.toString()) || [];
      savedPostIds = currentUser?.savedPosts?.map(id => id.toString()) || [];
    }

    // Transform media for all search results (includes isLiked and isSaved)
    const transformedPosts = posts.map(post => {
      const postObj = post.toObject ? post.toObject() : post;
      return transformPostMedia(postObj, userId, savedPostIds);
    });

    // Filter out posts from private accounts (unless user is following them or is the author)
    const visiblePosts = transformedPosts.filter(post =>
      isPostVisible(post, userId, followingIds)
    );

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
      posts: visiblePosts,
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

    // Get user's saved posts for isSaved flag
    let savedPostIds = [];
    let followingIds = [];
    if (userId) {
      const currentUser = await User.findById(userId).select('following savedPosts').lean();
      followingIds = currentUser?.following?.map(id => id.toString()) || [];
      savedPostIds = currentUser?.savedPosts?.map(id => id.toString()) || [];
    }

    // Transform media for all trending posts (includes isLiked and isSaved)
    const transformedPosts = trendingPosts.map(post => transformPostMedia(post, userId, savedPostIds));

    // Filter out posts from private accounts (unless user is following them or is the author)
    const visiblePosts = transformedPosts.filter(post =>
      isPostVisible(post, userId, followingIds)
    );

    return ApiResponse.success(res, {
      posts: visiblePosts,
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

    // Get user's saved posts for isSaved flag
    let savedPostIds = [];
    let followingIds = [];
    if (userId) {
      const currentUser = await User.findById(userId).select('following blockedUsers blockedBy savedPosts').lean();
      followingIds = currentUser?.following?.map(id => id.toString()) || [];
      savedPostIds = currentUser?.savedPosts?.map(id => id.toString()) || [];
    }

    // Transform media for all hashtag posts (includes isLiked and isSaved)
    const transformedPosts = posts.map(post => transformPostMedia(post, userId, savedPostIds));

    // Filter out posts from private accounts (unless user is following them or is the author)
    const visiblePosts = transformedPosts.filter(post =>
      isPostVisible(post, userId, followingIds)
    );

    // Get total count excluding blocked users
    let totalCountQuery = {
      status: 'published',
      visibility: 'public',
      hashtags: { $in: [hashtag.toLowerCase()] }
    };

    // Exclude blocked users from total count as well
    if (userId) {
      const user = await User.findById(userId).select('blockedUsers blockedBy').lean();
      const blockedUserIds = user?.blockedUsers?.map(id => id.toString()) || [];
      const blockedByIds = user?.blockedBy?.map(id => id.toString()) || [];
      const allBlockedIds = [...new Set([
        ...blockedUserIds,
        ...blockedByIds
      ])];
      if (allBlockedIds.length > 0) {
        totalCountQuery.author = { $nin: allBlockedIds };
      }
    }

    const totalPosts = await Post.countDocuments(totalCountQuery);

    return ApiResponse.success(res, {
      posts: visiblePosts,
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
  // Helper functions
  transformPostMedia,
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
        .populate({
          path: 'comments.user',
          select: 'username fullName profilePictureUrl',
          options: { limit: 5 } // Only populate first 5 comments for list view
        })
        .populate('likes.user', 'username fullName')
        .sort({ publishedAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

      // Transform media for all saved posts (includes isLiked and isSaved)
      // All posts here are saved by definition, but we still check for consistency
      const savedPostIds = savedIds.map(id => id.toString());
      const transformedPosts = posts.map(post => {
        const postObj = post.toObject();
        return transformPostMedia(postObj, userId, savedPostIds);
      });

      // Get current user's following list for privacy check
      const currentUser = await User.findById(userId).select('following').lean();
      const followingIds = currentUser?.following?.map(id => id.toString()) || [];

      // Filter out posts from private accounts (unless user is following them or is the author)
      // Note: Even though these are saved posts, we filter private accounts for consistency
      const visiblePosts = transformedPosts.filter(post =>
        isPostVisible(post, userId, followingIds)
      );

      const totalPosts = await Post.countDocuments({ _id: { $in: savedIds }, status: { $ne: 'deleted' } });

      return ApiResponse.success(res, {
        posts: visiblePosts,
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

      // Get user's saved posts for isSaved flag
      let savedPostIds = [];
      if (userId) {
        const user = await User.findById(userId).select('savedPosts').lean();
        savedPostIds = user?.savedPosts?.map(id => id.toString()) || [];
      }

      const transformedPost = transformPostMedia(post, userId, savedPostIds);
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

      // Get user's saved posts for isSaved flag
      let savedPostIds = [];
      if (userId) {
        const user = await User.findById(userId).select('savedPosts').lean();
        savedPostIds = user?.savedPosts?.map(id => id.toString()) || [];
      }

      const transformedPost = transformPostMedia(post, userId, savedPostIds);
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

      // Get user's saved posts for isSaved flag
      let savedPostIds = [];
      if (userId) {
        const user = await User.findById(userId).select('savedPosts').lean();
        savedPostIds = user?.savedPosts?.map(id => id.toString()) || [];
      }

      // Transform media for all archived posts (includes isLiked, isSaved, and lastComment)
      const transformedPosts = posts.map(post => {
        const postObj = post.toObject();
        return transformPostMedia(postObj, userId, savedPostIds);
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
  getPostLikes,
  addComment,
  getPostComments,
  toggleCommentLike,
  editComment,
  deleteComment,
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
