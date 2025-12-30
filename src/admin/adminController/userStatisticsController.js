const User = require('../../user/auth/model/userAuthModel');
const Post = require('../../user/social/userModel/postModel');
const Story = require('../../user/social/userModel/storyModel');
const ApiResponse = require('../../utils/apiResponse');

// Helper function to format date
function formatDate(date) {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

// Helper function to get day name
function getDayName(date) {
	const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
	return days[date.getDay()];
}

// Helper function to get month name
function getMonthName(date) {
	const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
	return months[date.getMonth()];
}

// Helper function to get user type breakdown
async function getUserTypeBreakdown(userIds, dateRange) {
	if (!userIds || userIds.length === 0) {
		return {
			dating: 0,
			social: 0,
			both: 0
		};
	}

	// Get users with active dating profiles
	const datingUsers = await User.find({
		_id: { $in: userIds },
		'dating.isDatingProfileActive': true
	}).select('_id').lean();

	const datingUserIds = new Set(datingUsers.map(u => u._id.toString()));

	// Get users who have created posts or stories (social users)
	// Note: We check if they have ANY posts/stories, not just in the date range
	// because we want to know if they're social users based on their profile activity
	const socialUserIdsFromPosts = await Post.distinct('author', {
		author: { $in: userIds }
	});

	const socialUserIdsFromStories = await Story.distinct('author', {
		author: { $in: userIds }
	});

	// Combine post and story authors (unique)
	const allSocialUserIds = new Set([
		...socialUserIdsFromPosts.map(id => id.toString()),
		...socialUserIdsFromStories.map(id => id.toString())
	]);

	// Find users who are both dating and social
	const bothCount = Array.from(datingUserIds).filter(id => allSocialUserIds.has(id)).length;

	// Total dating users (all users with active dating profile)
	const datingTotal = datingUserIds.size;

	// Total social users (all users who have created posts or stories)
	const socialTotal = allSocialUserIds.size;

	return {
		dating: datingTotal, // Total dating users (includes both)
		social: socialTotal, // Total social users (includes both)
		both: bothCount // Users who are both dating and social
	};
}

// Get weekly user statistics (daily breakdown for current week)
async function getWeeklyUserStatistics(req, res) {
	try {
		// eslint-disable-next-line no-console
		console.log('[ADMIN][USER_STATS] getWeeklyUserStatistics request');

		const now = new Date();
		const currentDay = now.getDay(); // 0 = Sunday, 6 = Saturday
		
		// Get start of week (Sunday)
		const startOfWeek = new Date(now);
		startOfWeek.setDate(now.getDate() - currentDay);
		startOfWeek.setHours(0, 0, 0, 0);
		
		// Get end of week (Saturday)
		const endOfWeek = new Date(startOfWeek);
		endOfWeek.setDate(startOfWeek.getDate() + 6);
		endOfWeek.setHours(23, 59, 59, 999);

		// Aggregate users by day with user IDs
		const dailyStats = await User.aggregate([
			{
				$match: {
					role: { $nin: ['admin', 'subadmin'] },
					createdAt: {
						$gte: startOfWeek,
						$lte: endOfWeek
					}
				}
			},
			{
				$group: {
					_id: {
						year: { $year: '$createdAt' },
						month: { $month: '$createdAt' },
						day: { $dayOfMonth: '$createdAt' }
					},
					count: { $sum: 1 },
					userIds: { $push: '$_id' }
				}
			},
			{
				$sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
			}
		]);

		// Generate data for all 7 days of the week
		const weekData = [];
		for (let i = 0; i < 7; i++) {
			const date = new Date(startOfWeek);
			date.setDate(startOfWeek.getDate() + i);
			const key = formatDate(date);
			
			// Find stats for this day
			const dayStat = dailyStats.find(stat => {
				const statDate = new Date(stat._id.year, stat._id.month - 1, stat._id.day);
				return formatDate(statDate) === key;
			});

			const userIds = dayStat?.userIds || [];
			const totalCount = dayStat?.count || 0;

			// Get user type breakdown for this day
			const breakdown = await getUserTypeBreakdown(userIds, {
				start: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0),
				end: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)
			});

			weekData.push({
				date: key,
				day: getDayName(date),
				count: totalCount,
				breakdown: {
					dating: breakdown.dating,
					social: breakdown.social,
					both: breakdown.both
				}
			});
		}

		// Calculate totals
		const total = weekData.reduce((sum, day) => sum + day.count, 0);
		const totalDating = weekData.reduce((sum, day) => sum + day.breakdown.dating, 0);
		const totalSocial = weekData.reduce((sum, day) => sum + day.breakdown.social, 0);
		const totalBoth = weekData.reduce((sum, day) => sum + day.breakdown.both, 0);

		// eslint-disable-next-line no-console
		console.log('[ADMIN][USER_STATS] Weekly statistics fetched successfully');

		return ApiResponse.success(res, {
			period: 'weekly',
			startDate: formatDate(startOfWeek),
			endDate: formatDate(endOfWeek),
			total,
			totals: {
				dating: totalDating,
				social: totalSocial,
				both: totalBoth
			},
			data: weekData
		}, 'Weekly user statistics fetched successfully');
	} catch (e) {
		// eslint-disable-next-line no-console
		console.error('[ADMIN][USER_STATS] getWeeklyUserStatistics error:', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to fetch weekly user statistics');
	}
}

// Get monthly user statistics (daily breakdown for current month)
async function getMonthlyUserStatistics(req, res) {
	try {
		// eslint-disable-next-line no-console
		console.log('[ADMIN][USER_STATS] getMonthlyUserStatistics request');

		const now = new Date();
		
		// Get start of month
		const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
		startOfMonth.setHours(0, 0, 0, 0);
		
		// Get end of month
		const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
		endOfMonth.setHours(23, 59, 59, 999);

		// Aggregate users by day with user IDs
		const dailyStats = await User.aggregate([
			{
				$match: {
					role: { $nin: ['admin', 'subadmin'] },
					createdAt: {
						$gte: startOfMonth,
						$lte: endOfMonth
					}
				}
			},
			{
				$group: {
					_id: {
						year: { $year: '$createdAt' },
						month: { $month: '$createdAt' },
						day: { $dayOfMonth: '$createdAt' }
					},
					count: { $sum: 1 },
					userIds: { $push: '$_id' }
				}
			},
			{
				$sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
			}
		]);

		// Create a map for quick lookup
		const statsMap = new Map();
		dailyStats.forEach(stat => {
			const date = new Date(stat._id.year, stat._id.month - 1, stat._id.day);
			const key = formatDate(date);
			statsMap.set(key, { count: stat.count, userIds: stat.userIds });
		});

		// Generate data for all days of the month
		const monthData = [];
		const daysInMonth = endOfMonth.getDate();
		
		for (let i = 1; i <= daysInMonth; i++) {
			const date = new Date(now.getFullYear(), now.getMonth(), i);
			const key = formatDate(date);
			const dayStat = statsMap.get(key);
			const userIds = dayStat?.userIds || [];
			const totalCount = dayStat?.count || 0;

			// Get user type breakdown for this day
			const breakdown = await getUserTypeBreakdown(userIds, {
				start: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0),
				end: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)
			});

			monthData.push({
				date: key,
				day: i,
				dayName: getDayName(date),
				count: totalCount,
				breakdown: {
					dating: breakdown.dating,
					social: breakdown.social,
					both: breakdown.both
				}
			});
		}

		// Calculate totals
		const total = monthData.reduce((sum, day) => sum + day.count, 0);
		const totalDating = monthData.reduce((sum, day) => sum + day.breakdown.dating, 0);
		const totalSocial = monthData.reduce((sum, day) => sum + day.breakdown.social, 0);
		const totalBoth = monthData.reduce((sum, day) => sum + day.breakdown.both, 0);

		// eslint-disable-next-line no-console
		console.log('[ADMIN][USER_STATS] Monthly statistics fetched successfully');

		return ApiResponse.success(res, {
			period: 'monthly',
			startDate: formatDate(startOfMonth),
			endDate: formatDate(endOfMonth),
			total,
			totals: {
				dating: totalDating,
				social: totalSocial,
				both: totalBoth
			},
			data: monthData
		}, 'Monthly user statistics fetched successfully');
	} catch (e) {
		// eslint-disable-next-line no-console
		console.error('[ADMIN][USER_STATS] getMonthlyUserStatistics error:', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to fetch monthly user statistics');
	}
}

// Get 6 months user statistics (monthly breakdown for last 6 months)
async function getSixMonthsUserStatistics(req, res) {
	try {
		// eslint-disable-next-line no-console
		console.log('[ADMIN][USER_STATS] getSixMonthsUserStatistics request');

		const now = new Date();
		
		// Get start date (6 months ago)
		const startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1); // Last 6 months including current
		startDate.setHours(0, 0, 0, 0);
		
		// Get end date (end of current month)
		const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
		endDate.setHours(23, 59, 59, 999);

		// Aggregate users by month with user IDs
		const monthlyStats = await User.aggregate([
			{
				$match: {
					role: { $nin: ['admin', 'subadmin'] },
					createdAt: {
						$gte: startDate,
						$lte: endDate
					}
				}
			},
			{
				$group: {
					_id: {
						year: { $year: '$createdAt' },
						month: { $month: '$createdAt' }
					},
					count: { $sum: 1 },
					userIds: { $push: '$_id' }
				}
			},
			{
				$sort: { '_id.year': 1, '_id.month': 1 }
			}
		]);

		// Create a map for quick lookup
		const statsMap = new Map();
		monthlyStats.forEach(stat => {
			const key = `${stat._id.year}-${String(stat._id.month).padStart(2, '0')}`;
			statsMap.set(key, { count: stat.count, userIds: stat.userIds });
		});

		// Generate data for all 6 months
		const sixMonthsData = [];
		for (let i = 0; i < 6; i++) {
			const date = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
			const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
			const monthStat = statsMap.get(key);
			const userIds = monthStat?.userIds || [];
			const totalCount = monthStat?.count || 0;

			// Get start and end of month for breakdown
			const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
			const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
			monthEnd.setHours(23, 59, 59, 999);

			// Get user type breakdown for this month
			const breakdown = await getUserTypeBreakdown(userIds, {
				start: monthStart,
				end: monthEnd
			});

			sixMonthsData.push({
				month: `${getMonthName(date)} ${date.getFullYear()}`,
				monthKey: key,
				count: totalCount,
				breakdown: {
					dating: breakdown.dating,
					social: breakdown.social,
					both: breakdown.both
				}
			});
		}

		// Calculate totals
		const total = sixMonthsData.reduce((sum, month) => sum + month.count, 0);
		const totalDating = sixMonthsData.reduce((sum, month) => sum + month.breakdown.dating, 0);
		const totalSocial = sixMonthsData.reduce((sum, month) => sum + month.breakdown.social, 0);
		const totalBoth = sixMonthsData.reduce((sum, month) => sum + month.breakdown.both, 0);

		// eslint-disable-next-line no-console
		console.log('[ADMIN][USER_STATS] 6 months statistics fetched successfully');

		return ApiResponse.success(res, {
			period: '6months',
			startDate: formatDate(startDate),
			endDate: formatDate(endDate),
			total,
			totals: {
				dating: totalDating,
				social: totalSocial,
				both: totalBoth
			},
			data: sixMonthsData
		}, '6 months user statistics fetched successfully');
	} catch (e) {
		// eslint-disable-next-line no-console
		console.error('[ADMIN][USER_STATS] getSixMonthsUserStatistics error:', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to fetch 6 months user statistics');
	}
}

// Get yearly user statistics (monthly breakdown for current year)
async function getYearlyUserStatistics(req, res) {
	try {
		// eslint-disable-next-line no-console
		console.log('[ADMIN][USER_STATS] getYearlyUserStatistics request');

		const now = new Date();
		
		// Get start of year
		const startOfYear = new Date(now.getFullYear(), 0, 1);
		startOfYear.setHours(0, 0, 0, 0);
		
		// Get end of year
		const endOfYear = new Date(now.getFullYear(), 11, 31);
		endOfYear.setHours(23, 59, 59, 999);

		// Aggregate users by month with user IDs
		const monthlyStats = await User.aggregate([
			{
				$match: {
					role: { $nin: ['admin', 'subadmin'] },
					createdAt: {
						$gte: startOfYear,
						$lte: endOfYear
					}
				}
			},
			{
				$group: {
					_id: {
						year: { $year: '$createdAt' },
						month: { $month: '$createdAt' }
					},
					count: { $sum: 1 },
					userIds: { $push: '$_id' }
				}
			},
			{
				$sort: { '_id.year': 1, '_id.month': 1 }
			}
		]);

		// Create a map for quick lookup
		const statsMap = new Map();
		monthlyStats.forEach(stat => {
			const key = `${stat._id.year}-${String(stat._id.month).padStart(2, '0')}`;
			statsMap.set(key, { count: stat.count, userIds: stat.userIds });
		});

		// Generate data for all 12 months
		const yearData = [];
		for (let i = 0; i < 12; i++) {
			const date = new Date(now.getFullYear(), i, 1);
			const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
			const monthStat = statsMap.get(key);
			const userIds = monthStat?.userIds || [];
			const totalCount = monthStat?.count || 0;

			// Get start and end of month for breakdown
			const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
			const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
			monthEnd.setHours(23, 59, 59, 999);

			// Get user type breakdown for this month
			const breakdown = await getUserTypeBreakdown(userIds, {
				start: monthStart,
				end: monthEnd
			});

			yearData.push({
				month: getMonthName(date),
				monthKey: key,
				monthNumber: i + 1,
				count: totalCount,
				breakdown: {
					dating: breakdown.dating,
					social: breakdown.social,
					both: breakdown.both
				}
			});
		}

		// Calculate totals
		const total = yearData.reduce((sum, month) => sum + month.count, 0);
		const totalDating = yearData.reduce((sum, month) => sum + month.breakdown.dating, 0);
		const totalSocial = yearData.reduce((sum, month) => sum + month.breakdown.social, 0);
		const totalBoth = yearData.reduce((sum, month) => sum + month.breakdown.both, 0);

		// eslint-disable-next-line no-console
		console.log('[ADMIN][USER_STATS] Yearly statistics fetched successfully');

		return ApiResponse.success(res, {
			period: 'yearly',
			year: now.getFullYear(),
			startDate: formatDate(startOfYear),
			endDate: formatDate(endOfYear),
			total,
			totals: {
				dating: totalDating,
				social: totalSocial,
				both: totalBoth
			},
			data: yearData
		}, 'Yearly user statistics fetched successfully');
	} catch (e) {
		// eslint-disable-next-line no-console
		console.error('[ADMIN][USER_STATS] getYearlyUserStatistics error:', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to fetch yearly user statistics');
	}
}

module.exports = {
	getWeeklyUserStatistics,
	getMonthlyUserStatistics,
	getSixMonthsUserStatistics,
	getYearlyUserStatistics
};
