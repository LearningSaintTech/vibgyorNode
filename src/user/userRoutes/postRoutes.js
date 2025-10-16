const express = require('express');
const router = express.Router();
const { authorize, Roles } = require('../../middleware/authMiddleware');
const { uploadMultiple } = require('../../middleware/uploadMiddleware');
const {
  createPost,
  getUserPosts,
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
  addMention
} = require('../userController/postController');

// Validation middleware
const validateCreatePost = (req, res, next) => {
  const { content, caption, privacy } = req.body;
  
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
  
  // Validate privacy setting
  if (privacy && !['public', 'followers', 'close_friends', 'private'].includes(privacy)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid privacy setting'
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

// User Posts Routes
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
