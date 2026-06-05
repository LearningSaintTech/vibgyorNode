const contentModerationRepository = require('./contentModeration.repository');

async function getFlaggedContent(query = {}) {
	const page = parseInt(query.page || 1, 10);
	const limit = parseInt(query.limit || 20, 10);
	const dbQuery = contentModerationRepository.buildFlaggedContentQuery(query);
	const { content, totalContent } = await contentModerationRepository.findFlaggedContent(dbQuery, {
		page,
		limit,
	});

	return {
		ok: true,
		message: 'Flagged content retrieved successfully',
		data: {
			content,
			pagination: {
				currentPage: page,
				totalPages: Math.ceil(totalContent / limit),
				totalContent,
				hasNext: page * limit < totalContent,
				hasPrev: page > 1,
			},
		},
	};
}

async function getPendingReviews(query = {}) {
	const page = parseInt(query.page || 1, 10);
	const limit = parseInt(query.limit || 20, 10);
	const { content, totalPending } = await contentModerationRepository.getPendingReviewsPage(page, limit);

	return {
		ok: true,
		message: 'Pending reviews retrieved successfully',
		data: {
			content,
			pagination: {
				currentPage: page,
				totalPages: Math.ceil(totalPending / limit),
				totalPending,
				hasNext: page * limit < totalPending,
				hasPrev: page > 1,
			},
		},
	};
}

async function reviewContent(moderationId, body, adminId) {
	const { decision, reason, notes, actionTaken } = body || {};
	if (!decision || !['approved', 'rejected', 'escalated'].includes(decision)) {
		return { ok: false, statusCode: 400, message: 'Valid decision is required' };
	}

	const moderation = await contentModerationRepository.findModerationById(moderationId);
	if (!moderation) {
		return { ok: false, statusCode: 404, message: 'Content moderation record not found' };
	}

	await moderation.reviewByAdmin(adminId, decision, reason, notes, actionTaken);
	return { ok: true, message: 'Content reviewed successfully', data: moderation };
}

async function getModerationAnalytics(query = {}) {
	const period = query.period || '7d';
	const raw = await contentModerationRepository.getModerationAnalyticsData(period);

	const analytics = {
		period: raw.period,
		summary: {
			totalContent: raw.totalContent,
			flaggedContent: raw.flaggedContent,
			reviewedContent: raw.reviewedContent,
			approvedContent: raw.approvedContent,
			rejectedContent: raw.rejectedContent,
			pendingReviews: raw.pendingReviews,
			flagRate: raw.totalContent > 0 ? ((raw.flaggedContent / raw.totalContent) * 100).toFixed(2) : 0,
			approvalRate:
				raw.reviewedContent > 0 ? ((raw.approvedContent / raw.reviewedContent) * 100).toFixed(2) : 0,
		},
		breakdown: {
			contentByType: raw.contentByType.reduce((acc, item) => {
				acc[item._id] = item.count;
				return acc;
			}, {}),
			reportsByReason: raw.reportsByReason.reduce((acc, item) => {
				acc[item._id] = item.count;
				return acc;
			}, {}),
		},
	};

	return { ok: true, message: 'Moderation analytics retrieved successfully', data: analytics };
}

async function getContentDetails(moderationId) {
	const moderation = await contentModerationRepository.findModerationDetailsById(moderationId);
	if (!moderation) {
		return { ok: false, statusCode: 404, message: 'Content moderation record not found' };
	}

	const actualContent = await contentModerationRepository.getActualContent(moderation);
	return {
		ok: true,
		message: 'Content details retrieved successfully',
		data: { moderation, actualContent },
	};
}

async function bulkReviewContent(body, adminId) {
	const { moderationIds, decision, reason, notes, actionTaken } = body || {};
	if (!moderationIds || !Array.isArray(moderationIds) || moderationIds.length === 0) {
		return { ok: false, statusCode: 400, message: 'Valid moderation IDs array is required' };
	}
	if (!decision || !['approved', 'rejected', 'escalated'].includes(decision)) {
		return { ok: false, statusCode: 400, message: 'Valid decision is required' };
	}

	const results = [];
	const errors = [];

	for (const id of moderationIds) {
		try {
			const moderation = await contentModerationRepository.findModerationById(id);
			if (moderation) {
				await moderation.reviewByAdmin(adminId, decision, reason, notes, actionTaken);
				results.push({ id, status: 'success' });
			} else {
				errors.push({ id, error: 'Not found' });
			}
		} catch (error) {
			errors.push({ id, error: error.message });
		}
	}

	return {
		ok: true,
		message: 'Bulk review completed',
		data: {
			successful: results,
			errors,
			summary: {
				total: moderationIds.length,
				successful: results.length,
				failed: errors.length,
			},
		},
	};
}

async function updateContentPolicies(body) {
	const { policies } = body || {};
	console.log('[ADMIN][MODERATION] Content policies updated:', policies);
	return {
		ok: true,
		message: 'Content policies updated successfully',
		data: { policies, updatedAt: new Date() },
	};
}

async function getModerationQueueStats() {
	const stats = await contentModerationRepository.getModerationQueueStatsData();
	return {
		ok: true,
		message: 'Moderation queue statistics retrieved successfully',
		data: {
			pendingReviews: stats[0],
			aiFlagged: stats[1],
			userReported: stats[2],
			activeFlagged: stats[3],
			totalQueue: stats[0] + stats[1] + stats[2],
		},
	};
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
