const userStatisticsRepository = require('./userStatistics.repository');
const { formatDate, getDayName, getMonthName } = require('./userStatistics.utils');

function sumTotals(data, key = 'count') {
	return data.reduce((sum, item) => sum + item[key], 0);
}

function sumBreakdownTotals(data) {
	return {
		dating: data.reduce((sum, item) => sum + item.breakdown.dating, 0),
		social: data.reduce((sum, item) => sum + item.breakdown.social, 0),
		both: data.reduce((sum, item) => sum + item.breakdown.both, 0),
	};
}

async function getWeeklyUserStatistics() {
	const now = new Date();
	const currentDay = now.getDay();

	const startOfWeek = new Date(now);
	startOfWeek.setDate(now.getDate() - currentDay);
	startOfWeek.setHours(0, 0, 0, 0);

	const endOfWeek = new Date(startOfWeek);
	endOfWeek.setDate(startOfWeek.getDate() + 6);
	endOfWeek.setHours(23, 59, 59, 999);

	const dailyStats = await userStatisticsRepository.aggregateUsersByDay(startOfWeek, endOfWeek);
	const weekData = [];

	for (let i = 0; i < 7; i++) {
		const date = new Date(startOfWeek);
		date.setDate(startOfWeek.getDate() + i);
		const key = formatDate(date);

		const dayStat = dailyStats.find((stat) => {
			const statDate = new Date(stat._id.year, stat._id.month - 1, stat._id.day);
			return formatDate(statDate) === key;
		});

		const userIds = dayStat?.userIds || [];
		const breakdown = await userStatisticsRepository.getUserTypeBreakdown(userIds);

		weekData.push({
			date: key,
			day: getDayName(date),
			count: dayStat?.count || 0,
			breakdown,
		});
	}

	return {
		ok: true,
		message: 'Weekly user statistics fetched successfully',
		data: {
			period: 'weekly',
			startDate: formatDate(startOfWeek),
			endDate: formatDate(endOfWeek),
			total: sumTotals(weekData),
			totals: sumBreakdownTotals(weekData),
			data: weekData,
		},
	};
}

async function getMonthlyUserStatistics() {
	const now = new Date();
	const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
	startOfMonth.setHours(0, 0, 0, 0);
	const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
	endOfMonth.setHours(23, 59, 59, 999);

	const dailyStats = await userStatisticsRepository.aggregateUsersByDay(startOfMonth, endOfMonth);
	const statsMap = new Map();
	dailyStats.forEach((stat) => {
		const date = new Date(stat._id.year, stat._id.month - 1, stat._id.day);
		statsMap.set(formatDate(date), { count: stat.count, userIds: stat.userIds });
	});

	const monthData = [];
	const daysInMonth = endOfMonth.getDate();

	for (let i = 1; i <= daysInMonth; i++) {
		const date = new Date(now.getFullYear(), now.getMonth(), i);
		const key = formatDate(date);
		const dayStat = statsMap.get(key);
		const userIds = dayStat?.userIds || [];
		const breakdown = await userStatisticsRepository.getUserTypeBreakdown(userIds);

		monthData.push({
			date: key,
			day: i,
			dayName: getDayName(date),
			count: dayStat?.count || 0,
			breakdown,
		});
	}

	return {
		ok: true,
		message: 'Monthly user statistics fetched successfully',
		data: {
			period: 'monthly',
			startDate: formatDate(startOfMonth),
			endDate: formatDate(endOfMonth),
			total: sumTotals(monthData),
			totals: sumBreakdownTotals(monthData),
			data: monthData,
		},
	};
}

async function getSixMonthsUserStatistics() {
	const now = new Date();
	const startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
	startDate.setHours(0, 0, 0, 0);
	const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
	endDate.setHours(23, 59, 59, 999);

	const monthlyStats = await userStatisticsRepository.aggregateUsersByMonth(startDate, endDate);
	const statsMap = new Map();
	monthlyStats.forEach((stat) => {
		const key = `${stat._id.year}-${String(stat._id.month).padStart(2, '0')}`;
		statsMap.set(key, { count: stat.count, userIds: stat.userIds });
	});

	const sixMonthsData = [];
	for (let i = 0; i < 6; i++) {
		const date = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
		const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
		const monthStat = statsMap.get(key);
		const userIds = monthStat?.userIds || [];
		const breakdown = await userStatisticsRepository.getUserTypeBreakdown(userIds);

		sixMonthsData.push({
			month: `${getMonthName(date)} ${date.getFullYear()}`,
			monthKey: key,
			count: monthStat?.count || 0,
			breakdown,
		});
	}

	return {
		ok: true,
		message: '6 months user statistics fetched successfully',
		data: {
			period: '6months',
			startDate: formatDate(startDate),
			endDate: formatDate(endDate),
			total: sumTotals(sixMonthsData),
			totals: sumBreakdownTotals(sixMonthsData),
			data: sixMonthsData,
		},
	};
}

async function getYearlyUserStatistics() {
	const now = new Date();
	const startOfYear = new Date(now.getFullYear(), 0, 1);
	startOfYear.setHours(0, 0, 0, 0);
	const endOfYear = new Date(now.getFullYear(), 11, 31);
	endOfYear.setHours(23, 59, 59, 999);

	const monthlyStats = await userStatisticsRepository.aggregateUsersByMonth(startOfYear, endOfYear);
	const statsMap = new Map();
	monthlyStats.forEach((stat) => {
		const key = `${stat._id.year}-${String(stat._id.month).padStart(2, '0')}`;
		statsMap.set(key, { count: stat.count, userIds: stat.userIds });
	});

	const yearData = [];
	for (let i = 0; i < 12; i++) {
		const date = new Date(now.getFullYear(), i, 1);
		const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
		const monthStat = statsMap.get(key);
		const userIds = monthStat?.userIds || [];
		const breakdown = await userStatisticsRepository.getUserTypeBreakdown(userIds);

		yearData.push({
			month: getMonthName(date),
			monthKey: key,
			monthNumber: i + 1,
			count: monthStat?.count || 0,
			breakdown,
		});
	}

	return {
		ok: true,
		message: 'Yearly user statistics fetched successfully',
		data: {
			period: 'yearly',
			year: now.getFullYear(),
			startDate: formatDate(startOfYear),
			endDate: formatDate(endOfYear),
			total: sumTotals(yearData),
			totals: sumBreakdownTotals(yearData),
			data: yearData,
		},
	};
}

module.exports = {
	getWeeklyUserStatistics,
	getMonthlyUserStatistics,
	getSixMonthsUserStatistics,
	getYearlyUserStatistics,
};
