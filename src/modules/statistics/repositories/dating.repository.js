const User = require('../../user/user.model');
const DatingInteraction = require('../../dating/interaction/datingInteraction.model');
const DatingMatch = require('../../dating/interaction/datingMatch.model');
const DatingChat = require('../../dating/chat/datingChat.model');
const DatingMessage = require('../../dating/message/datingMessage.model');
const DatingCall = require('../../dating/call/datingCall.model');
const DatingProfileComment = require('../../dating/profile/datingProfileComment.model');
const {
	EXCLUDED_ROLES,
	dateMatch,
	safeRatio,
	countMapFromAggregate,
	dateGroupId,
	formatTrendBucket,
} = require('../statistics.utils');

async function distribution(fieldPath) {
	const rows = await User.aggregate([
		{ $match: { ...EXCLUDED_ROLES, 'dating.isDatingProfileActive': true } },
		{
			$group: {
				_id: { $ifNull: [`$${fieldPath}`, 'unknown'] },
				count: { $sum: 1 },
			},
		},
		{ $sort: { count: -1 } },
		{ $limit: 20 },
	]);
	return countMapFromAggregate(rows);
}

async function getDatingStats({ start, end }) {
	const periodFilter = dateMatch('createdAt', start, end);
	const recentCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

	const [
		totalDatingProfiles,
		activeDatingProfiles,
		inactiveDatingProfiles,
		withPhotos,
		withVideos,
		mediaAgg,
		recentlyUpdated,
		hereTo,
		wantToMeet,
		orientation,
		likes,
		dislikes,
		likesWithComment,
		likesInPeriod,
		dislikesInPeriod,
		matchesTotal,
		matchesActive,
		matchesEnded,
		matchesBlocked,
		matchesInPeriod,
		chatsTotal,
		chatsInPeriod,
		messagesTotal,
		messagesInPeriod,
		messageTypeAgg,
		callsTotal,
		callsInPeriod,
		callTypeAgg,
		callStatusAgg,
		callDurationAgg,
		commentsTotal,
		commentsInPeriod,
		commentLikesAgg,
		deletedComments,
		preferenceLocation,
		likedUsersInPeriod,
	] = await Promise.all([
		User.countDocuments({
			...EXCLUDED_ROLES,
			$or: [
				{ 'dating.isDatingProfileActive': true },
				{ 'dating.photos.0': { $exists: true } },
				{ 'dating.preferences.hereTo': { $exists: true, $ne: '' } },
			],
		}),
		User.countDocuments({ ...EXCLUDED_ROLES, 'dating.isDatingProfileActive': true }),
		User.countDocuments({
			...EXCLUDED_ROLES,
			'dating.isDatingProfileActive': { $ne: true },
			$or: [
				{ 'dating.photos.0': { $exists: true } },
				{ 'dating.videos.0': { $exists: true } },
				{ 'dating.preferences.hereTo': { $exists: true, $ne: '' } },
			],
		}),
		User.countDocuments({
			...EXCLUDED_ROLES,
			'dating.isDatingProfileActive': true,
			'dating.photos.0': { $exists: true },
		}),
		User.countDocuments({
			...EXCLUDED_ROLES,
			'dating.isDatingProfileActive': true,
			'dating.videos.0': { $exists: true },
		}),
		User.aggregate([
			{ $match: { ...EXCLUDED_ROLES, 'dating.isDatingProfileActive': true } },
			{
				$project: {
					photoCount: { $size: { $ifNull: ['$dating.photos', []] } },
					videoCount: { $size: { $ifNull: ['$dating.videos', []] } },
				},
			},
			{
				$group: {
					_id: null,
					avgPhotos: { $avg: '$photoCount' },
					avgVideos: { $avg: '$videoCount' },
					totalPhotos: { $sum: '$photoCount' },
					totalVideos: { $sum: '$videoCount' },
				},
			},
		]),
		User.countDocuments({
			...EXCLUDED_ROLES,
			'dating.isDatingProfileActive': true,
			'dating.lastUpdatedAt': { $gte: recentCutoff },
		}),
		distribution('dating.preferences.hereTo'),
		distribution('dating.preferences.wantToMeet'),
		distribution('dating.preferences.orientation'),
		DatingInteraction.countDocuments({ action: 'like' }),
		DatingInteraction.countDocuments({ action: 'dislike' }),
		DatingInteraction.countDocuments({
			action: 'like',
			'comment.text': { $exists: true, $nin: [null, ''] },
		}),
		DatingInteraction.countDocuments({ action: 'like', ...periodFilter }),
		DatingInteraction.countDocuments({ action: 'dislike', ...periodFilter }),
		DatingMatch.countDocuments({}),
		DatingMatch.countDocuments({ status: 'active' }),
		DatingMatch.countDocuments({ status: 'ended' }),
		DatingMatch.countDocuments({ status: 'blocked' }),
		DatingMatch.countDocuments(periodFilter),
		DatingChat.countDocuments({}),
		DatingChat.countDocuments(periodFilter),
		DatingMessage.countDocuments({ isDeleted: { $ne: true } }),
		DatingMessage.countDocuments({ isDeleted: { $ne: true }, ...periodFilter }),
		DatingMessage.aggregate([
			{
				$match: {
					isDeleted: { $ne: true },
					...(start ? { createdAt: { $gte: start, $lte: end } } : {}),
				},
			},
			{ $group: { _id: '$type', count: { $sum: 1 } } },
		]),
		DatingCall.countDocuments({}),
		DatingCall.countDocuments(periodFilter),
		DatingCall.aggregate([
			...(start ? [{ $match: { createdAt: { $gte: start, $lte: end } } }] : []),
			{ $group: { _id: '$type', count: { $sum: 1 } } },
		]),
		DatingCall.aggregate([
			...(start ? [{ $match: { createdAt: { $gte: start, $lte: end } } }] : []),
			{ $group: { _id: '$status', count: { $sum: 1 } } },
		]),
		DatingCall.aggregate([
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
		DatingProfileComment.countDocuments({ isDeleted: { $ne: true } }),
		DatingProfileComment.countDocuments({ isDeleted: { $ne: true }, ...periodFilter }),
		DatingProfileComment.aggregate([
			{ $match: { isDeleted: { $ne: true } } },
			{ $group: { _id: null, totalLikes: { $sum: { $ifNull: ['$likesCount', 0] } } } },
		]),
		DatingProfileComment.countDocuments({ isDeleted: true }),
		User.aggregate([
			{ $match: { ...EXCLUDED_ROLES, 'dating.isDatingProfileActive': true } },
			{
				$group: {
					_id: {
						city: { $ifNull: ['$dating.preferences.location.city', 'unknown'] },
						country: { $ifNull: ['$dating.preferences.location.country', 'unknown'] },
					},
					count: { $sum: 1 },
				},
			},
			{ $sort: { count: -1 } },
			{ $limit: 15 },
		]),
		DatingInteraction.distinct('user', { action: 'like', ...periodFilter }).then(
			(ids) => ids.length
		),
	]);

	const matchedUsersInPeriod = await (async () => {
		const matches = await DatingMatch.find(periodFilter).select('userA userB').lean();
		const ids = new Set();
		for (const m of matches) {
			if (m.userA) ids.add(String(m.userA));
			if (m.userB) ids.add(String(m.userB));
		}
		return ids.size;
	})();

	const activeMatches = await DatingMatch.find({ status: 'active' }).select('_id').lean();
	let coldMatches = 0;
	let matchesWithMessages = 0;
	if (activeMatches.length) {
		const matchIds = activeMatches.map((m) => m._id);
		const chats = await DatingChat.find({ matchId: { $in: matchIds } })
			.select('_id')
			.lean();
		const chatIds = chats.map((c) => c._id);
		const chatsWithMsg = chatIds.length
			? await DatingMessage.distinct('chatId', {
					chatId: { $in: chatIds },
					isDeleted: { $ne: true },
				})
			: [];
		matchesWithMessages = chatsWithMsg.length;
		coldMatches = Math.max(0, activeMatches.length - matchesWithMessages);
	}

	const media = mediaAgg[0] || {};
	const unreadAgg = await DatingChat.aggregate([
		{
			$project: {
				unread: {
					$sum: {
						$map: {
							input: { $ifNull: ['$userSettings', []] },
							as: 's',
							in: { $ifNull: ['$$s.unreadCount', 0] },
						},
					},
				},
			},
		},
		{ $group: { _id: null, totalUnread: { $sum: '$unread' } } },
	]);

	return {
		profiles: {
			total: totalDatingProfiles,
			active: activeDatingProfiles,
			inactive: inactiveDatingProfiles,
			withPhotos,
			withVideos,
			avgPhotos: Math.round((media.avgPhotos || 0) * 100) / 100,
			avgVideos: Math.round((media.avgVideos || 0) * 100) / 100,
			totalPhotos: media.totalPhotos || 0,
			totalVideos: media.totalVideos || 0,
			updatedLast7Days: recentlyUpdated,
		},
		preferences: {
			hereTo,
			wantToMeet,
			orientation,
			topLocations: (preferenceLocation || []).map((r) => ({
				city: r._id?.city || 'unknown',
				country: r._id?.country || 'unknown',
				count: r.count,
			})),
		},
		swipes: {
			likes,
			dislikes,
			likeDislikeRatio: safeRatio(likes, dislikes),
			likesWithComment,
			likesInPeriod,
			dislikesInPeriod,
		},
		matches: {
			total: matchesTotal,
			active: matchesActive,
			ended: matchesEnded,
			blocked: matchesBlocked,
			createdInPeriod: matchesInPeriod,
			matchRateFromLikes: safeRatio(matchesTotal, likes),
			usersMatchedInPeriod: matchedUsersInPeriod,
			usersWhoLikedInPeriod: likedUsersInPeriod,
			activeWithMessages: matchesWithMessages,
			coldMatches,
		},
		chats: {
			total: chatsTotal,
			createdInPeriod: chatsInPeriod,
			messagesTotal,
			messagesInPeriod,
			messageTypes: countMapFromAggregate(messageTypeAgg),
			unreadBacklog: unreadAgg[0]?.totalUnread || 0,
			pctActiveMatchesWithMessages: safeRatio(matchesWithMessages, matchesActive),
		},
		calls: {
			total: callsTotal,
			inPeriod: callsInPeriod,
			byType: countMapFromAggregate(callTypeAgg),
			byStatus: countMapFromAggregate(callStatusAgg),
			avgDurationSec: Math.round((callDurationAgg[0]?.avgDuration || 0) * 100) / 100,
			totalDurationSec: callDurationAgg[0]?.totalDuration || 0,
		},
		socialProof: {
			comments: commentsTotal,
			commentsInPeriod,
			commentLikes: commentLikesAgg[0]?.totalLikes || 0,
			deletedComments,
		},
	};
}

async function getDatingTrends({ start, end, granularity }) {
	const match = start ? { createdAt: { $gte: start, $lte: end } } : {};
	const groupId = dateGroupId(granularity);

	const [likes, matches, messages, calls] = await Promise.all([
		DatingInteraction.aggregate([
			{ $match: { action: 'like', ...match } },
			{ $group: { _id: groupId, count: { $sum: 1 } } },
			{ $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.week': 1 } },
		]),
		DatingMatch.aggregate([
			{ $match: match },
			{ $group: { _id: groupId, count: { $sum: 1 } } },
			{ $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.week': 1 } },
		]),
		DatingMessage.aggregate([
			{ $match: { isDeleted: { $ne: true }, ...match } },
			{ $group: { _id: groupId, count: { $sum: 1 } } },
			{ $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.week': 1 } },
		]),
		DatingCall.aggregate([
			{ $match: match },
			{ $group: { _id: groupId, count: { $sum: 1 } } },
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
		likes: toSeries(likes),
		matches: toSeries(matches),
		messages: toSeries(messages),
		calls: toSeries(calls),
	};
}

module.exports = {
	getDatingStats,
	getDatingTrends,
};
