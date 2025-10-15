const express = require('express');
const router = express.Router();
const { authorize } = require('../../middleware/authMiddleware');
const analyticsService = require('../../services/analyticsService');
const ApiResponse = require('../../utils/apiResponse');

// Apply admin authentication middleware to all routes
router.use(authorize());

// ===== PLATFORM ANALYTICS =====

/**
 * @route GET /admin/analytics/platform-overview
 * @desc Get platform overview analytics
 * @access Admin
 */
router.get('/platform-overview', async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    const analytics = await analyticsService.getPlatformOverview(period);

    return ApiResponse.success(res, analytics, 'Platform overview analytics retrieved successfully');
  } catch (error) {
    console.error('[ADMIN][ANALYTICS] Platform overview error:', error);
    return ApiResponse.serverError(res, 'Failed to get platform overview analytics');
  }
});

/**
 * @route GET /admin/analytics/content
 * @desc Get content analytics
 * @access Admin
 */
router.get('/content', async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    const analytics = await analyticsService.getContentAnalytics(period);

    return ApiResponse.success(res, analytics, 'Content analytics retrieved successfully');
  } catch (error) {
    console.error('[ADMIN][ANALYTICS] Content analytics error:', error);
    return ApiResponse.serverError(res, 'Failed to get content analytics');
  }
});

/**
 * @route GET /admin/analytics/moderation
 * @desc Get moderation analytics
 * @access Admin
 */
router.get('/moderation', async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    const analytics = await analyticsService.getModerationStats(period);

    return ApiResponse.success(res, analytics, 'Moderation analytics retrieved successfully');
  } catch (error) {
    console.error('[ADMIN][ANALYTICS] Moderation analytics error:', error);
    return ApiResponse.serverError(res, 'Failed to get moderation analytics');
  }
});

/**
 * @route GET /admin/analytics/engagement
 * @desc Get engagement analytics
 * @access Admin
 */
router.get('/engagement', async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    const analytics = await analyticsService.getEngagementMetrics(period);

    return ApiResponse.success(res, analytics, 'Engagement analytics retrieved successfully');
  } catch (error) {
    console.error('[ADMIN][ANALYTICS] Engagement analytics error:', error);
    return ApiResponse.serverError(res, 'Failed to get engagement analytics');
  }
});

/**
 * @route GET /admin/analytics/performance
 * @desc Get performance analytics
 * @access Admin
 */
router.get('/performance', async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    const analytics = await analyticsService.getPerformanceMetrics(period);

    return ApiResponse.success(res, analytics, 'Performance analytics retrieved successfully');
  } catch (error) {
    console.error('[ADMIN][ANALYTICS] Performance analytics error:', error);
    return ApiResponse.serverError(res, 'Failed to get performance analytics');
  }
});

// ===== USER ANALYTICS =====

/**
 * @route GET /admin/analytics/users/:userId
 * @desc Get user analytics
 * @access Admin
 */
router.get('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { period = '30d' } = req.query;
    const analytics = await analyticsService.getUserAnalytics(userId, period);

    return ApiResponse.success(res, analytics, 'User analytics retrieved successfully');
  } catch (error) {
    console.error('[ADMIN][ANALYTICS] User analytics error:', error);
    return ApiResponse.serverError(res, 'Failed to get user analytics');
  }
});

module.exports = router;
