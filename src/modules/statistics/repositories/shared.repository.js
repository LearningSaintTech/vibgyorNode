const User = require('../../user/user.model');
const Post = require('../../social/post/post.model');
const Story = require('../../social/story/story.model');
const UserStatus = require('../../social/status/status.model');
const Report = require('../../social/graph/userReport.model');
const {
	EXCLUDED_ROLES,
	dateMatch,
	countMapFromAggregate,
	ageFromDob,
	ageBand,
} = require('../statistics.utils');

async function getUserTypeBreakdown() {
	const [datingIds, postAuthors, storyAuthors] = await Promise.all([
		User.find({ ...EXCLUDED_ROLES, 'dating.isDatingProfileActive': true })
			.select('_id')
			.lean(),
		Post.distinct('author'),
		Story.distinct('author'),
	]);

	const authorIds = [
		...new Set([
			...postAuthors.map((id) => String(id)),
			...storyAuthors.map((id) => String(id)),
		]),
	];

	const socialUsers =
		authorIds.length === 0
			? []
			: await User.find({
					...EXCLUDED_ROLES,
					_id: { $in: authorIds },
				})
					.select('_id')
					.lean();

	const datingSet = new Set(datingIds.map((u) => String(u._id)));
	const socialSet = new Set(socialUsers.map((u) => String(u._id)));

	let both = 0;
	for (const id of datingSet) {
		if (socialSet.has(id)) both += 1;
	}

	return {
		dating: datingSet.size,
		social: socialSet.size,
		both,
	};
}

async function getDemographics() {
	const users = await User.find(EXCLUDED_ROLES)
		.select('gender dob location.country location.city')
		.lean();

	const gender = {};
	const ageBands = {};
	const countries = {};
	const cities = {};

	for (const u of users) {
		const g = (u.gender || 'unknown').trim() || 'unknown';
		gender[g] = (gender[g] || 0) + 1;

		const band = ageBand(ageFromDob(u.dob));
		ageBands[band] = (ageBands[band] || 0) + 1;

		const country = (u.location?.country || 'unknown').trim() || 'unknown';
		const city = (u.location?.city || 'unknown').trim() || 'unknown';
		countries[country] = (countries[country] || 0) + 1;
		cities[city] = (cities[city] || 0) + 1;
	}

	const topN = (map, n = 10) =>
		Object.entries(map)
			.sort((a, b) => b[1] - a[1])
			.slice(0, n)
			.map(([name, count]) => ({ name, count }));

	return {
		gender,
		ageBands,
		topCountries: topN(countries),
		topCities: topN(cities),
	};
}

async function getSharedOverview({ start, end }) {
	const createdInPeriod = dateMatch('createdAt', start, end);
	const recentlyActiveCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

	const [
		totalUsers,
		activeUsers,
		deactivatedUsers,
		profileCompleted,
		profileIncomplete,
		verified,
		pending,
		rejected,
		noneVerification,
		privateAccounts,
		publicAccounts,
		newSignupsInPeriod,
		onlineNow,
		recentlyActive,
		reportedUsers,
		blockedAgg,
		userTypes,
		demographics,
		verificationStatusAgg,
	] = await Promise.all([
		User.countDocuments(EXCLUDED_ROLES),
		User.countDocuments({ ...EXCLUDED_ROLES, isActive: true }),
		User.countDocuments({ ...EXCLUDED_ROLES, isActive: false }),
		User.countDocuments({ ...EXCLUDED_ROLES, isProfileCompleted: true }),
		User.countDocuments({ ...EXCLUDED_ROLES, isProfileCompleted: false }),
		User.countDocuments({ ...EXCLUDED_ROLES, verificationStatus: 'approved' }),
		User.countDocuments({ ...EXCLUDED_ROLES, verificationStatus: 'pending' }),
		User.countDocuments({ ...EXCLUDED_ROLES, verificationStatus: 'rejected' }),
		User.countDocuments({
			...EXCLUDED_ROLES,
			$or: [{ verificationStatus: 'none' }, { verificationStatus: { $exists: false } }],
		}),
		User.countDocuments({ ...EXCLUDED_ROLES, 'privacySettings.isPrivate': true }),
		User.countDocuments({ ...EXCLUDED_ROLES, 'privacySettings.isPrivate': { $ne: true } }),
		User.countDocuments({ ...EXCLUDED_ROLES, ...createdInPeriod }),
		UserStatus.countDocuments({ isOnline: true }),
		UserStatus.countDocuments({ lastActivity: { $gte: recentlyActiveCutoff } }),
		Report.distinct('reportedUser', {
			...(start ? { createdAt: { $gte: start, $lte: end } } : {}),
		}).then((ids) => ids.length),
		User.aggregate([
			{ $match: EXCLUDED_ROLES },
			{
				$project: {
					blockedCount: { $size: { $ifNull: ['$blockedUsers', []] } },
				},
			},
			{ $group: { _id: null, totalBlockedRefs: { $sum: '$blockedCount' } } },
		]),
		getUserTypeBreakdown(),
		getDemographics(),
		User.aggregate([
			{ $match: EXCLUDED_ROLES },
			{ $group: { _id: '$verificationStatus', count: { $sum: 1 } } },
		]),
	]);

	const reportStatusAgg = await Report.aggregate([
		...(start ? [{ $match: { createdAt: { $gte: start, $lte: end } } }] : []),
		{ $group: { _id: '$status', count: { $sum: 1 } } },
	]);

	return {
		users: {
			total: totalUsers,
			active: activeUsers,
			deactivated: deactivatedUsers,
			profileCompleted,
			profileIncomplete,
			newSignupsInPeriod,
			privateAccounts,
			publicAccounts,
		},
		verification: {
			none: noneVerification,
			approved: verified,
			pending,
			rejected,
			byStatus: countMapFromAggregate(verificationStatusAgg),
		},
		activity: {
			onlineNow,
			recentlyActive24h: recentlyActive,
		},
		trust: {
			reportedUsers,
			blockedUserRefs: blockedAgg[0]?.totalBlockedRefs || 0,
			reportsByStatus: countMapFromAggregate(reportStatusAgg),
		},
		userTypes,
		demographics,
	};
}

module.exports = {
	getSharedOverview,
	getUserTypeBreakdown,
};
