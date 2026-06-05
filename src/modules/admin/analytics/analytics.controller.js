const ApiResponse = require('../../../utils/apiResponse');
const analyticsService = require('./analytics.service');

async function getPlatformOverview(req, res) {
	try {
		const result = await analyticsService.getPlatformOverview(req.query.period || '7d');
		return ApiResponse.success(res, result.data, result.message);
	} catch (error) {
		console.error('[ADMIN][ANALYTICS] Platform overview error:', error);
		return ApiResponse.serverError(res, 'Failed to get platform overview analytics');
	}
}

async function getContentAnalytics(req, res) {
	try {
		const result = await analyticsService.getContentAnalytics(req.query.period || '7d');
		return ApiResponse.success(res, result.data, result.message);
	} catch (error) {
		console.error('[ADMIN][ANALYTICS] Content analytics error:', error);
		return ApiResponse.serverError(res, 'Failed to get content analytics');
	}
}

async function getModerationAnalytics(req, res) {
	try {
		const result = await analyticsService.getModerationStats(req.query.period || '7d');
		return ApiResponse.success(res, result.data, result.message);
	} catch (error) {
		console.error('[ADMIN][ANALYTICS] Moderation analytics error:', error);
		return ApiResponse.serverError(res, 'Failed to get moderation analytics');
	}
}

async function getEngagementAnalytics(req, res) {
	try {
		const result = await analyticsService.getEngagementMetrics(req.query.period || '7d');
		return ApiResponse.success(res, result.data, result.message);
	} catch (error) {
		console.error('[ADMIN][ANALYTICS] Engagement analytics error:', error);
		return ApiResponse.serverError(res, 'Failed to get engagement analytics');
	}
}

async function getPerformanceAnalytics(req, res) {
	try {
		const result = await analyticsService.getPerformanceMetrics(req.query.period || '7d');
		return ApiResponse.success(res, result.data, result.message);
	} catch (error) {
		console.error('[ADMIN][ANALYTICS] Performance analytics error:', error);
		return ApiResponse.serverError(res, 'Failed to get performance analytics');
	}
}

async function getUserAnalytics(req, res) {
	try {
		const result = await analyticsService.getUserAnalytics(req.params.userId, req.query.period || '30d');
		return ApiResponse.success(res, result.data, result.message);
	} catch (error) {
		console.error('[ADMIN][ANALYTICS] User analytics error:', error);
		return ApiResponse.serverError(res, 'Failed to get user analytics');
	}
}

module.exports = {
	getPlatformOverview,
	getContentAnalytics,
	getModerationAnalytics,
	getEngagementAnalytics,
	getPerformanceAnalytics,
	getUserAnalytics,
};
