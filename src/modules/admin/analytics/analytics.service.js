const analyticsService = require('../../../services/analyticsService');

async function getPlatformOverview(period = '7d') {
	const data = await analyticsService.getPlatformOverview(period);
	return { ok: true, message: 'Platform overview analytics retrieved successfully', data };
}

async function getContentAnalytics(period = '7d') {
	const data = await analyticsService.getContentAnalytics(period);
	return { ok: true, message: 'Content analytics retrieved successfully', data };
}

async function getModerationStats(period = '7d') {
	const data = await analyticsService.getModerationStats(period);
	return { ok: true, message: 'Moderation analytics retrieved successfully', data };
}

async function getEngagementMetrics(period = '7d') {
	const data = await analyticsService.getEngagementMetrics(period);
	return { ok: true, message: 'Engagement analytics retrieved successfully', data };
}

async function getPerformanceMetrics(period = '7d') {
	const data = await analyticsService.getPerformanceMetrics(period);
	return { ok: true, message: 'Performance analytics retrieved successfully', data };
}

async function getUserAnalytics(userId, period = '30d') {
	const data = await analyticsService.getUserAnalytics(userId, period);
	return { ok: true, message: 'User analytics retrieved successfully', data };
}

module.exports = {
	getPlatformOverview,
	getContentAnalytics,
	getModerationStats,
	getEngagementMetrics,
	getPerformanceMetrics,
	getUserAnalytics,
};
