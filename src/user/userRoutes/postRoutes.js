const express = require('express');
const router = express.Router();
const { authorize, Roles } = require('../../middleware/authMiddleware');
const { uploadMultiple } = require('../../middleware/uploadMiddleware');
const {
  createPost,
  getUserPosts,
  getCurrentUserPosts,
  getFeedPosts,
  getPost,
  updatePost,
  deletePost,
  toggleLike,
  addComment,
  getPostComments,
  sharePost,
  searchPosts,
  reportPost,
  getPostAnalytics,
  getTrendingPosts,
  getPostsByHashtag,
  updateLocation,
  addMention,
  archivePost,
  unarchivePost,
  savePost,
  unsavePost,
  getSavedPosts
} = require('../userController/postController');

// Validation middleware
const validateCreatePost = (req, res, next) => {
  const { content, caption, visibility, commentVisibility } = req.body;
  
  // Check if at least content or media is provided
  if (!content && (!req.files || req.files.length === 0)) {
    return res.status(400).json({
      success: false,
      message: 'Post content or media is required'
    });
  }
  
  // Validate content length
  if (content && content.length > 2200) {
    return res.status(400).json({
      success: false,
      message: 'Post content cannot exceed 2200 characters'
    });
  }
  
  // Validate caption length
  if (caption && caption.length > 500) {
    return res.status(400).json({
      success: false,
      message: 'Caption cannot exceed 500 characters'
    });
  }
  
  // Validate visibility controls
  const validVisibility = ['public', 'followers', 'private'];
  if (visibility && !validVisibility.includes(visibility)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid visibility. Use public, followers, or private'
    });
  }

  const validCommentVisibility = ['everyone', 'followers', 'none'];
  if (commentVisibility && !validCommentVisibility.includes(commentVisibility)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid commentVisibility. Use everyone, followers, or none'
    });
  }
  
  next();
};

const validateComment = (req, res, next) => {
  const { content } = req.body;
  
  if (!content || content.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Comment content is required'
    });
  }
  
  if (content.length > 500) {
    return res.status(400).json({
      success: false,
      message: 'Comment cannot exceed 500 characters'
    });
  }
  
  next();
};

const validateReport = (req, res, next) => {
  const { reason } = req.body;
  const validReasons = ['spam', 'inappropriate', 'harassment', 'fake_news', 'violence', 'other'];
  
  if (!reason || !validReasons.includes(reason)) {
    return res.status(400).json({
      success: false,
      message: 'Valid report reason is required'
    });
  }
  
  next();
};

// Post CRUD Routes
router.post('/', 
  authorize([Roles.USER]), 
  uploadMultiple, 
  validateCreatePost, 
  createPost
);

router.get('/feed', 
  authorize([Roles.USER]), 
  getFeedPosts
);

router.get('/search', 
  authorize([Roles.USER]), 
  searchPosts
);

router.get('/trending', 
  authorize([Roles.USER]), 
  getTrendingPosts
);

router.get('/hashtag/:hashtag', 
  authorize([Roles.USER]), 
  getPostsByHashtag
);

router.get('/:postId', 
  authorize([Roles.USER]), 
  getPost
);

router.put('/:postId', 
  authorize([Roles.USER]), 
  validateCreatePost, 
  updatePost
);

router.delete('/:postId', 
  authorize([Roles.USER]), 
  deletePost
);

// Archive / Unarchive
router.put('/:postId/archive', 
  authorize([Roles.USER]), 
  archivePost
);

router.put('/:postId/unarchive', 
  authorize([Roles.USER]), 
  unarchivePost
);

// User Posts Routes
router.get('/me', 
  authorize([Roles.USER]), 
  getCurrentUserPosts
);

router.get('/user/:userId', 
  authorize([Roles.USER]), 
  getUserPosts
);

// Engagement Routes
router.post('/:postId/like', 
  authorize([Roles.USER]), 
  toggleLike
);

router.post('/:postId/comment', 
  authorize([Roles.USER]), 
  validateComment, 
  addComment
);

router.get('/:postId/comments', 
  authorize([Roles.USER]), 
  getPostComments
);

router.post('/:postId/share', 
  authorize([Roles.USER]), 
  sharePost
);

// Save / Unsave / Get Saved
router.post('/:postId/save', 
  authorize([Roles.USER]), 
  savePost
);

router.delete('/:postId/save', 
  authorize([Roles.USER]), 
  unsavePost
);

router.get('/saved', 
  authorize([Roles.USER]), 
  getSavedPosts
);

// Analytics and Reporting Routes
router.get('/:postId/analytics', 
  authorize([Roles.USER]), 
  getPostAnalytics
);

router.post('/:postId/report', 
  authorize([Roles.USER]), 
  validateReport, 
  reportPost
);

// ===== ADVANCED FEATURES ROUTES =====

// Location Tagging
router.put('/:postId/location', 
  authorize([Roles.USER]), 
  updateLocation
);

// Advanced Mentions
router.post('/:postId/mentions', 
  authorize([Roles.USER]), 
  addMention
);

module.exports = router;
