const express = require('express');
const router = express.Router();
const { authorize } = require('../../middleware/authMiddleware');
const contentModerationController = require('../adminController/contentModerationController');

// Apply admin authentication middleware to all routes
router.use(authorize());

// ===== CONTENT MODERATION MANAGEMENT =====

/**
 * @route GET /admin/content-moderation/flagged
 * @desc Get flagged content for review
 * @access Admin
 */
router.get('/flagged', contentModerationController.getFlaggedContent);

/**
 * @route GET /admin/content-moderation/pending
 * @desc Get pending reviews
 * @access Admin
 */
router.get('/pending', contentModerationController.getPendingReviews);

/**
 * @route GET /admin/content-moderation/queue-stats
 * @desc Get moderation queue statistics
 * @access Admin
 */
router.get('/queue-stats', contentModerationController.getModerationQueueStats);

/**
 * @route GET /admin/content-moderation/analytics
 * @desc Get moderation analytics
 * @access Admin
 */
router.get('/analytics', contentModerationController.getModerationAnalytics);

/**
 * @route GET /admin/content-moderation/:moderationId/details
 * @desc Get detailed content information for review
 * @access Admin
 */
router.get('/:moderationId/details', contentModerationController.getContentDetails);

/**
 * @route PUT /admin/content-moderation/:moderationId/review
 * @desc Review content (approve/reject/escalate)
 * @access Admin
 */
router.put('/:moderationId/review', contentModerationController.reviewContent);

/**
 * @route PUT /admin/content-moderation/bulk-review
 * @desc Bulk review multiple content items
 * @access Admin
 */
router.put('/bulk-review', contentModerationController.bulkReviewContent);

/**
 * @route PUT /admin/content-moderation/policies
 * @desc Update content moderation policies
 * @access Admin
 */
router.put('/policies', contentModerationController.updateContentPolicies);

module.exports = router;
