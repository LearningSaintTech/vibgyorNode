const User = require('../../user/user.model');
const Post = require('../../social/post/post.model');
const Story = require('../../social/story/story.model');

const EXCLUDED_ROLES_MATCH = { role: { $nin: ['admin', 'subadmin'] } };

async function getUserTypeBreakdown(userIds) {
	if (!userIds || userIds.length === 0) {
		return { dating: 0, social: 0, both: 0 };
	}

	const datingUsers = await User.find({
		_id: { $in: userIds },
		'dating.isDatingProfileActive': true,
	})
		.select('_id')
		.lean();

	const datingUserIds = new Set(datingUsers.map((u) => u._id.toString()));

	const socialUserIdsFromPosts = await Post.distinct('author', { author: { $in: userIds } });
	const socialUserIdsFromStories = await Story.distinct('author', { author: { $in: userIds } });

	const allSocialUserIds = new Set([
		...socialUserIdsFromPosts.map((id) => id.toString()),
		...socialUserIdsFromStories.map((id) => id.toString()),
	]);

	const bothCount = Array.from(datingUserIds).filter((id) => allSocialUserIds.has(id)).length;

	return {
		dating: datingUserIds.size,
		social: allSocialUserIds.size,
		both: bothCount,
	};
}

async function aggregateUsersByDay(startDate, endDate) {
	return User.aggregate([
		{
			$match: {
				...EXCLUDED_ROLES_MATCH,
				createdAt: { $gte: startDate, $lte: endDate },
			},
		},
		{
			$group: {
				_id: {
					year: { $year: '$createdAt' },
					month: { $month: '$createdAt' },
					day: { $dayOfMonth: '$createdAt' },
				},
				count: { $sum: 1 },
				userIds: { $push: '$_id' },
			},
		},
		{ $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
	]);
}

async function aggregateUsersByMonth(startDate, endDate) {
	return User.aggregate([
		{
			$match: {
				...EXCLUDED_ROLES_MATCH,
				createdAt: { $gte: startDate, $lte: endDate },
			},
		},
		{
			$group: {
				_id: {
					year: { $year: '$createdAt' },
					month: { $month: '$createdAt' },
				},
				count: { $sum: 1 },
				userIds: { $push: '$_id' },
			},
		},
		{ $sort: { '_id.year': 1, '_id.month': 1 } },
	]);
}

module.exports = {
	getUserTypeBreakdown,
	aggregateUsersByDay,
	aggregateUsersByMonth,
};
