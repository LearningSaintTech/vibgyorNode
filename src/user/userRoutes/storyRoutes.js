const express = require('express');
const router = express.Router();
const { uploadMultiple } = require('../../middleware/uploadMiddleware');
const { authorize } = require('../../middleware/authMiddleware');
const storyController = require('../userController/storyController');

// Apply authentication middleware to all routes
router.use(authorize());

// ===== BASIC STORY OPERATIONS =====

/**
 * @route POST /user/stories
 * @desc Create a new story
 * @access Private
 */
router.post('/', uploadMultiple, storyController.createStory);

/**
 * @route GET /user/stories/feed
 * @desc Get stories feed
 * @access Private
 */
router.get('/feed', storyController.getStoriesFeed);

/**
 * @route GET /user/stories/user/:userId
 * @desc Get user's stories
 * @access Private
 */
router.get('/user/:userId', storyController.getUserStories);

/**
 * @route GET /user/stories/:storyId
 * @desc Get single story
 * @access Private
 */
router.get('/:storyId', storyController.getStory);

/**
 * @route DELETE /user/stories/:storyId
 * @desc Delete story
 * @access Private
 */
router.delete('/:storyId', storyController.deleteStory);

// ===== STORY ENGAGEMENT =====

/**
 * @route POST /user/stories/:storyId/replies
 * @desc Reply to story
 * @access Private
 */
router.post('/:storyId/replies', storyController.replyToStory);

// ===== DISCOVERY & ANALYTICS =====

/**
 * @route GET /user/stories/hashtag/:hashtag
 * @desc Get stories by hashtag
 * @access Private
 */
router.get('/hashtag/:hashtag', storyController.getStoriesByHashtag);

/**
 * @route GET /user/stories/:storyId/analytics
 * @desc Get story analytics
 * @access Private
 */
router.get('/:storyId/analytics', storyController.getStoryAnalytics);

/**
 * @route POST /user/stories/:storyId/report
 * @desc Report story
 * @access Private
 */
router.post('/:storyId/report', storyController.reportStory);

module.exports = router;
