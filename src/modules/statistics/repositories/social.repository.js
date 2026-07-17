const User = require('../../user/user.model');
const Post = require('../../social/post/post.model');
const Story = require('../../social/story/story.model');
const FollowRequest = require('../../social/graph/followRequest.model');
const MessageRequest = require('../../social/messageRequest/messageRequest.model');
const Chat = require('../../social/chat/chat.model');
const Message = require('../../social/message/message.model');
const Call = require('../../social/call/call.model');
const ContentModeration = require('../../social/contentModeration/contentModeration.model');
const Report = require('../../social/graph/userReport.model');
const {
	EXCLUDED_ROLES,
	dateMatch,
	safeRatio,
	countMapFromAggregate,
	dateGroupId,
	formatTrendBucket,
} = require('../statistics.utils');

async function getSocialStats({ start, end }) {
	const periodFilter = dateMatch('createdAt', start, end);

	const [
		postsTotal,
		postsPublished,
		postsArchived,
		postsDeleted,
		postsInPeriod,
		postStatusAgg,
		postVisibilityAgg,
		postMediaAgg,
		engagementAgg,
		storiesTotal,
		storiesActive,
		storiesInPeriod,
		storyPrivacyAgg,
		storyMediaAgg,
		storyViewsAgg,
		followPending,
		followAccepted,
		followRejected,
		followCancelled,
		followAcceptedInPeriod,
		msgReqPending,
		msgReqAccepted,
		msgReqRejected,
		msgReqExpired,
		chatsTotal,
		chatsDirect,
		chatsGroup,
		chatsInPeriod,
		messagesTotal,
		messagesInPeriod,
		messageTypeAgg,
		callsTotal,
		callsInPeriod,
		callTypeAgg,
		callStatusAgg,
		callDurationAgg,
		moderationStatusAgg,
		moderationContentAgg,
		reportsInPeriod,
		reportTypeAgg,
		hashtagAgg,
		postsWithLocation,
		savedAgg,
		privateAccounts,
		followerAgg,
	] = await Promise.all([
		Post.countDocuments({}),
		Post.countDocuments({ status: 'published' }),
		Post.countDocuments({ status: 'archived' }),
		Post.countDocuments({ status: 'deleted' }),
		Post.countDocuments(periodFilter),
		Post.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
		Post.aggregate([
			{ $match: { status: 'published' } },
			{ $group: { _id: '$visibility', count: { $sum: 1 } } },
		]),
		Post.aggregate([
			{ $match: { status: 'published' } },
			{ $unwind: { path: '$media', preserveNullAndEmptyArrays: true } },
			{ $group: { _id: { $ifNull: ['$media.type', 'none'] }, count: { $sum: 1 } } },
		]),
		Post.aggregate([
			{ $match: { status: 'published' } },
			{
				$group: {
					_id: null,
					likes: { $sum: { $ifNull: ['$likesCount', 0] } },
					comments: { $sum: { $ifNull: ['$commentsCount', 0] } },
					shares: { $sum: { $ifNull: ['$sharesCount', 0] } },
					views: { $sum: { $ifNull: ['$viewsCount', 0] } },
					avgLikes: { $avg: { $ifNull: ['$likesCount', 0] } },
					avgComments: { $avg: { $ifNull: ['$commentsCount', 0] } },
					avgShares: { $avg: { $ifNull: ['$sharesCount', 0] } },
					avgViews: { $avg: { $ifNull: ['$viewsCount', 0] } },
				},
			},
		]),
		Story.countDocuments({}),
		Story.countDocuments({ status: 'active', expiresAt: { $gt: new Date() } }),
		Story.countDocuments(periodFilter),
		Story.aggregate([{ $group: { _id: '$privacy', count: { $sum: 1 } } }]),
		Story.aggregate([
			{ $group: { _id: { $ifNull: ['$media.type', 'none'] }, count: { $sum: 1 } } },
		]),
		Story.aggregate([
			{
				$group: {
					_id: null,
					totalViews: {
						$sum: {
							$ifNull: [
								'$analytics.viewsCount',
								{ $size: { $ifNull: ['$views', []] } },
							],
						},
					},
					totalReplies: { $sum: { $ifNull: ['$analytics.repliesCount', 0] } },
					totalLikes: { $sum: { $ifNull: ['$analytics.likesCount', 0] } },
				},
			},
		]),
		FollowRequest.countDocuments({ status: 'pending' }),
		FollowRequest.countDocuments({ status: 'accepted' }),
		FollowRequest.countDocuments({ status: 'rejected' }),
		FollowRequest.countDocuments({ status: 'cancelled' }),
		FollowRequest.countDocuments({
			status: 'accepted',
			...(start ? { respondedAt: { $gte: start, $lte: end } } : {}),
		}),
		MessageRequest.countDocuments({ status: 'pending' }),
		MessageRequest.countDocuments({ status: 'accepted' }),
		MessageRequest.countDocuments({ status: 'rejected' }),
		MessageRequest.countDocuments({ status: 'expired' }),
		Chat.countDocuments({}),
		Chat.countDocuments({ chatType: 'direct' }),
		Chat.countDocuments({ chatType: 'group' }),
		Chat.countDocuments(periodFilter),
		Message.countDocuments({ isDeleted: { $ne: true } }),
		Message.countDocuments({ isDeleted: { $ne: true }, ...periodFilter }),
		Message.aggregate([
			{
				$match: {
					isDeleted: { $ne: true },
					...(start ? { createdAt: { $gte: start, $lte: end } } : {}),
				},
			},
			{ $group: { _id: '$type', count: { $sum: 1 } } },
		]),
		Call.countDocuments({}),
		Call.countDocuments(periodFilter),
		Call.aggregate([
			...(start ? [{ $match: { createdAt: { $gte: start, $lte: end } } }] : []),
			{ $group: { _id: '$type', count: { $sum: 1 } } },
		]),
		Call.aggregate([
			...(start ? [{ $match: { createdAt: { $gte: start, $lte: end } } }] : []),
			{ $group: { _id: '$status', count: { $sum: 1 } } },
		]),
		Call.aggregate([
			{
				$match: {
					status: 'ended',
					duration: { $gt: 0 },
					...(start ? { createdAt: { $gte: start, $lte: end } } : {}),
				},
			},
			{
				$group: {
					_id: null,
					avgDuration: { $avg: { $ifNull: ['$duration', 0] } },
					totalDuration: { $sum: { $ifNull: ['$duration', 0] } },
				},
			},
		]),
		ContentModeration.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
		ContentModeration.aggregate([{ $group: { _id: '$contentType', count: { $sum: 1 } } }]),
		Report.countDocuments(periodFilter),
		Report.aggregate([
			...(start ? [{ $match: { createdAt: { $gte: start, $lte: end } } }] : []),
			{ $group: { _id: '$reportType', count: { $sum: 1 } } },
		]),
		Post.aggregate([
			{ $match: { status: 'published', hashtags: { $exists: true, $ne: [] } } },
			{ $unwind: '$hashtags' },
			{ $group: { _id: '$hashtags', count: { $sum: 1 } } },
			{ $sort: { count: -1 } },
			{ $limit: 15 },
		]),
		Post.countDocuments({
			status: 'published',
			$or: [
				{ 'location.name': { $exists: true, $nin: [null, ''] } },
				{ 'location.address': { $exists: true, $nin: [null, ''] } },
				{ 'location.coordinates.lat': { $ne: null } },
				{ 'location.coordinates.lng': { $ne: null } },
			],
		}),
		User.aggregate([
			{ $match: EXCLUDED_ROLES },
			{
				$project: {
					savedCount: { $size: { $ifNull: ['$savedPosts', []] } },
					hasSaves: {
						$cond: [{ $gt: [{ $size: { $ifNull: ['$savedPosts', []] } }, 0] }, 1, 0],
					},
				},
			},
			{
				$group: {
					_id: null,
					totalSavedRefs: { $sum: '$savedCount' },
					usersWithSaves: { $sum: '$hasSaves' },
				},
			},
		]),
		User.countDocuments({ ...EXCLUDED_ROLES, 'privacySettings.isPrivate': true }),
		User.aggregate([
			{ $match: EXCLUDED_ROLES },
			{
				$project: {
					followers: { $size: { $ifNull: ['$followers', []] } },
					following: { $size: { $ifNull: ['$following', []] } },
				},
			},
			{
				$group: {
					_id: null,
					totalFollowersRefs: { $sum: '$followers' },
					totalFollowingRefs: { $sum: '$following' },
					avgFollowers: { $avg: '$followers' },
					avgFollowing: { $avg: '$following' },
				},
			},
		]),
	]);

	const eng = engagementAgg[0] || {};
	const storyViews = storyViewsAgg[0] || {};
	const saved = savedAgg[0] || {};
	const followers = followerAgg[0] || {};

	const topPosts = await Post.find({ status: 'published' })
		.select('caption likesCount commentsCount sharesCount viewsCount author createdAt')
		.sort({ likesCount: -1 })
		.limit(10)
		.lean();

	const followAcceptedTotal = followAccepted || 0;
	const followDecided = followAccepted + followRejected;

	return {
		content: {
			posts: {
				total: postsTotal,
				published: postsPublished,
				archived: postsArchived,
				deleted: postsDeleted,
				createdInPeriod: postsInPeriod,
				byStatus: countMapFromAggregate(postStatusAgg),
				byVisibility: countMapFromAggregate(postVisibilityAgg),
				byMediaType: countMapFromAggregate(postMediaAgg),
				withLocation: postsWithLocation,
			},
			stories: {
				total: storiesTotal,
				active: storiesActive,
				createdInPeriod: storiesInPeriod,
				byPrivacy: countMapFromAggregate(storyPrivacyAgg),
				byMediaType: countMapFromAggregate(storyMediaAgg),
				views: storyViews.totalViews || 0,
				replies: storyViews.totalReplies || 0,
				likes: storyViews.totalLikes || 0,
			},
			meta: {
				notes: [
					'Expired stories may be TTL-deleted, so historical story totals can undercount.',
				],
			},
		},
		engagement: {
			likes: eng.likes || 0,
			comments: eng.comments || 0,
			shares: eng.shares || 0,
			views: eng.views || 0,
			avgLikesPerPost: Math.round((eng.avgLikes || 0) * 100) / 100,
			avgCommentsPerPost: Math.round((eng.avgComments || 0) * 100) / 100,
			avgSharesPerPost: Math.round((eng.avgShares || 0) * 100) / 100,
			avgViewsPerPost: Math.round((eng.avgViews || 0) * 100) / 100,
			topPosts: topPosts.map((p) => ({
				id: p._id,
				author: p.author,
				likes: p.likesCount || 0,
				comments: p.commentsCount || 0,
				shares: p.sharesCount || 0,
				views: p.viewsCount || 0,
				createdAt: p.createdAt,
			})),
			topHashtags: (hashtagAgg || []).map((h) => ({ tag: h._id, count: h.count })),
		},
		graph: {
			followRequests: {
				pending: followPending,
				accepted: followAccepted,
				rejected: followRejected,
				cancelled: followCancelled,
				acceptedInPeriod: followAcceptedInPeriod,
				acceptanceRate: safeRatio(followAcceptedTotal, followDecided),
			},
			privateAccounts,
			followers: {
				totalRefs: followers.totalFollowersRefs || 0,
				totalFollowingRefs: followers.totalFollowingRefs || 0,
				avgFollowers: Math.round((followers.avgFollowers || 0) * 100) / 100,
				avgFollowing: Math.round((followers.avgFollowing || 0) * 100) / 100,
			},
		},
		messaging: {
			messageRequests: {
				pending: msgReqPending,
				accepted: msgReqAccepted,
				rejected: msgReqRejected,
				expired: msgReqExpired,
				acceptanceRate: safeRatio(
					msgReqAccepted,
					msgReqAccepted + msgReqRejected + msgReqExpired
				),
			},
			chats: {
				total: chatsTotal,
				direct: chatsDirect,
				group: chatsGroup,
				createdInPeriod: chatsInPeriod,
			},
			messages: {
				total: messagesTotal,
				inPeriod: messagesInPeriod,
				byType: countMapFromAggregate(messageTypeAgg),
			},
		},
		calls: {
			total: callsTotal,
			inPeriod: callsInPeriod,
			byType: countMapFromAggregate(callTypeAgg),
			byStatus: countMapFromAggregate(callStatusAgg),
			avgDurationSec: Math.round((callDurationAgg[0]?.avgDuration || 0) * 100) / 100,
			totalDurationSec: callDurationAgg[0]?.totalDuration || 0,
		},
		saves: {
			totalSavedRefs: saved.totalSavedRefs || 0,
			usersWithSaves: saved.usersWithSaves || 0,
		},
		moderation: {
			byStatus: countMapFromAggregate(moderationStatusAgg),
			byContentType: countMapFromAggregate(moderationContentAgg),
			reportsInPeriod,
			reportsByType: countMapFromAggregate(reportTypeAgg),
		},
	};
}

async function getSocialTrends({ start, end, granularity }) {
	const match = start ? { createdAt: { $gte: start, $lte: end } } : {};
	const groupId = dateGroupId(granularity);

	const [posts, stories, messages, calls, followAccepts] = await Promise.all([
		Post.aggregate([
			{ $match: match },
			{ $group: { _id: groupId, count: { $sum: 1 } } },
			{ $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.week': 1 } },
		]),
		Story.aggregate([
			{ $match: match },
			{ $group: { _id: groupId, count: { $sum: 1 } } },
			{ $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.week': 1 } },
		]),
		Message.aggregate([
			{ $match: { isDeleted: { $ne: true }, ...match } },
			{ $group: { _id: groupId, count: { $sum: 1 } } },
			{ $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.week': 1 } },
		]),
		Call.aggregate([
			{ $match: match },
			{ $group: { _id: groupId, count: { $sum: 1 } } },
			{ $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.week': 1 } },
		]),
		FollowRequest.aggregate([
			{
				$match: {
					status: 'accepted',
					...(start
						? { respondedAt: { $gte: start, $lte: end } }
						: { respondedAt: { $exists: true, $ne: null } }),
				},
			},
			{
				$group: {
					_id:
						granularity === 'month'
							? { year: { $year: '$respondedAt' }, month: { $month: '$respondedAt' } }
							: granularity === 'week'
								? {
										year: { $isoWeekYear: '$respondedAt' },
										week: { $isoWeek: '$respondedAt' },
									}
								: {
										year: { $year: '$respondedAt' },
										month: { $month: '$respondedAt' },
										day: { $dayOfMonth: '$respondedAt' },
									},
					count: { $sum: 1 },
				},
			},
			{ $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.week': 1 } },
		]),
	]);

	const toSeries = (rows) =>
		(rows || []).map((r) => ({
			bucket: formatTrendBucket(r._id, granularity),
			count: r.count,
		}));

	return {
		granularity,
		posts: toSeries(posts),
		stories: toSeries(stories),
		messages: toSeries(messages),
		calls: toSeries(calls),
		followAccepts: toSeries(followAccepts),
	};
}

module.exports = {
	getSocialStats,
	getSocialTrends,
};
