const ContentModeration = require('../../social/contentModeration/contentModeration.model');

function buildFlaggedContentQuery({ contentType, status } = {}) {
	const query = {};
	if (contentType) query.contentType = contentType;
	if (status) query.status = status;
	query.$or = [
		{ 'moderationResults.aiAnalysis.flagged': true },
		{ 'moderationResults.userReports.0': { $exists: true } },
		{ status: 'under_review' },
	];
	return query;
}

async function findFlaggedContent(query, { page, limit }) {
	const content = await ContentModeration.find(query)
		.populate('contentAuthor', 'username fullName profilePictureUrl email')
		.populate('moderationResults.manualReview.reviewedBy', 'username fullName')
		.sort({ createdAt: -1 })
		.skip((page - 1) * limit)
		.limit(parseInt(limit, 10));
	const totalContent = await ContentModeration.countDocuments(query);
	return { content, totalContent };
}

async function getPendingReviewsPage(page, limit) {
	const content = await ContentModeration.getPendingReviews(parseInt(page, 10), parseInt(limit, 10));
	const totalPending = await ContentModeration.countDocuments({
		status: 'under_review',
		'moderationResults.manualReview.isReviewed': false,
	});
	return { content, totalPending };
}

async function findModerationById(moderationId) {
	return ContentModeration.findById(moderationId);
}

async function findModerationDetailsById(moderationId) {
	return ContentModeration.findById(moderationId)
		.populate('contentAuthor', 'username fullName profilePictureUrl email phoneNumber')
		.populate('moderationResults.manualReview.reviewedBy', 'username fullName')
		.populate('moderationResults.userReports.reportedBy', 'username fullName');
}

async function getActualContent(moderation) {
	try {
		const ContentModel = moderation.getContentModel();
		if (ContentModel) {
			return ContentModel.findById(moderation.contentId);
		}
	} catch (error) {
		console.error('[ADMIN][MODERATION] Error fetching actual content:', error);
	}
	return null;
}

function getPeriodMs(period) {
	return (
		{
			'7d': 7 * 24 * 60 * 60 * 1000,
			'30d': 30 * 24 * 60 * 60 * 1000,
			'90d': 90 * 24 * 60 * 60 * 1000,
		}[period] || 7 * 24 * 60 * 60 * 1000
	);
}

async function getModerationAnalyticsData(period) {
	const startDate = new Date(Date.now() - getPeriodMs(period));

	const [
		totalContent,
		flaggedContent,
		reviewedContent,
		approvedContent,
		rejectedContent,
		pendingReviews,
		contentByType,
		reportsByReason,
	] = await Promise.all([
		ContentModeration.countDocuments({ createdAt: { $gte: startDate } }),
		ContentModeration.countDocuments({
			createdAt: { $gte: startDate },
			'moderationResults.aiAnalysis.flagged': true,
		}),
		ContentModeration.countDocuments({
			createdAt: { $gte: startDate },
			'moderationResults.manualReview.isReviewed': true,
		}),
		ContentModeration.countDocuments({
			createdAt: { $gte: startDate },
			'moderationResults.manualReview.decision': 'approved',
		}),
		ContentModeration.countDocuments({
			createdAt: { $gte: startDate },
			'moderationResults.manualReview.decision': 'rejected',
		}),
		ContentModeration.countDocuments({
			status: 'under_review',
			'moderationResults.manualReview.isReviewed': false,
		}),
		ContentModeration.aggregate([
			{ $match: { createdAt: { $gte: startDate } } },
			{ $group: { _id: '$contentType', count: { $sum: 1 } } },
		]),
		ContentModeration.aggregate([
			{ $match: { createdAt: { $gte: startDate } } },
			{ $unwind: '$moderationResults.userReports' },
			{ $group: { _id: '$moderationResults.userReports.reason', count: { $sum: 1 } } },
		]),
	]);

	return {
		period,
		totalContent,
		flaggedContent,
		reviewedContent,
		approvedContent,
		rejectedContent,
		pendingReviews,
		contentByType,
		reportsByReason,
	};
}

async function getModerationQueueStatsData() {
	const stats = await Promise.all([
		ContentModeration.countDocuments({ status: 'under_review' }),
		ContentModeration.countDocuments({
			'moderationResults.aiAnalysis.flagged': true,
			'moderationResults.manualReview.isReviewed': false,
		}),
		ContentModeration.countDocuments({
			'moderationResults.userReports.0': { $exists: true },
			'moderationResults.manualReview.isReviewed': false,
		}),
		ContentModeration.countDocuments({
			status: 'active',
			'moderationResults.aiAnalysis.flagged': true,
		}),
	]);
	return stats;
}

module.exports = {
	buildFlaggedContentQuery,
	findFlaggedContent,
	getPendingReviewsPage,
	findModerationById,
	findModerationDetailsById,
	getActualContent,
	getModerationAnalyticsData,
	getModerationQueueStatsData,
};
