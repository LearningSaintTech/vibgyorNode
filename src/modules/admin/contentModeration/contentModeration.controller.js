const ApiResponse = require('../../../utils/apiResponse');
const contentModerationService = require('./contentModeration.service');

function mapServiceResult(res, result) {
	if (result.ok) return ApiResponse.success(res, result.data, result.message);
	if (result.statusCode === 400) return ApiResponse.badRequest(res, result.message);
	if (result.statusCode === 404) return ApiResponse.notFound(res, result.message);
	return ApiResponse.serverError(res, result.message || 'Request failed');
}

async function getFlaggedContent(req, res) {
	try {
		return mapServiceResult(res, await contentModerationService.getFlaggedContent(req.query));
	} catch (error) {
		console.error('[ADMIN][MODERATION] Get flagged content error:', error);
		return ApiResponse.serverError(res, 'Failed to get flagged content');
	}
}

async function getPendingReviews(req, res) {
	try {
		return mapServiceResult(res, await contentModerationService.getPendingReviews(req.query));
	} catch (error) {
		console.error('[ADMIN][MODERATION] Get pending reviews error:', error);
		return ApiResponse.serverError(res, 'Failed to get pending reviews');
	}
}

async function reviewContent(req, res) {
	try {
		const result = await contentModerationService.reviewContent(
			req.params.moderationId,
			req.body,
			req.admin?.adminId
		);
		if (result.ok) console.log('[ADMIN][MODERATION] Content reviewed successfully:', req.params.moderationId);
		return mapServiceResult(res, result);
	} catch (error) {
		console.error('[ADMIN][MODERATION] Review content error:', error);
		return ApiResponse.serverError(res, 'Failed to review content');
	}
}

async function getModerationAnalytics(req, res) {
	try {
		return mapServiceResult(res, await contentModerationService.getModerationAnalytics(req.query));
	} catch (error) {
		console.error('[ADMIN][MODERATION] Get analytics error:', error);
		return ApiResponse.serverError(res, 'Failed to get moderation analytics');
	}
}

async function getContentDetails(req, res) {
	try {
		return mapServiceResult(res, await contentModerationService.getContentDetails(req.params.moderationId));
	} catch (error) {
		console.error('[ADMIN][MODERATION] Get content details error:', error);
		return ApiResponse.serverError(res, 'Failed to get content details');
	}
}

async function bulkReviewContent(req, res) {
	try {
		const result = await contentModerationService.bulkReviewContent(req.body, req.admin?.adminId);
		if (result.ok) {
			console.log('[ADMIN][MODERATION] Bulk review completed:', result.data.summary);
		}
		return mapServiceResult(res, result);
	} catch (error) {
		console.error('[ADMIN][MODERATION] Bulk review error:', error);
		return ApiResponse.serverError(res, 'Failed to perform bulk review');
	}
}

async function updateContentPolicies(req, res) {
	try {
		return mapServiceResult(res, await contentModerationService.updateContentPolicies(req.body));
	} catch (error) {
		console.error('[ADMIN][MODERATION] Update policies error:', error);
		return ApiResponse.serverError(res, 'Failed to update content policies');
	}
}

async function getModerationQueueStats(req, res) {
	try {
		return mapServiceResult(res, await contentModerationService.getModerationQueueStats());
	} catch (error) {
		console.error('[ADMIN][MODERATION] Get queue stats error:', error);
		return ApiResponse.serverError(res, 'Failed to get moderation queue statistics');
	}
}

module.exports = {
	getFlaggedContent,
	getPendingReviews,
	reviewContent,
	getModerationAnalytics,
	getContentDetails,
	bulkReviewContent,
	updateContentPolicies,
	getModerationQueueStats,
};
