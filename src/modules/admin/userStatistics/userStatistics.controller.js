const ApiResponse = require('../../../utils/apiResponse');
const userStatisticsService = require('./userStatistics.service');

async function handleStatsRequest(res, logLabel, serviceFn) {
	try {
		console.log(`[ADMIN][USER_STATS] ${logLabel} request`);
		const result = await serviceFn();
		if (result.ok) console.log(`[ADMIN][USER_STATS] ${logLabel} fetched successfully`);
		return ApiResponse.success(res, result.data, result.message);
	} catch (e) {
		console.error(`[ADMIN][USER_STATS] ${logLabel} error:`, e?.message || e);
		return ApiResponse.serverError(res, `Failed to fetch ${logLabel.toLowerCase()}`);
	}
}

async function getWeeklyUserStatistics(req, res) {
	return handleStatsRequest(res, 'getWeeklyUserStatistics', userStatisticsService.getWeeklyUserStatistics);
}

async function getMonthlyUserStatistics(req, res) {
	return handleStatsRequest(res, 'getMonthlyUserStatistics', userStatisticsService.getMonthlyUserStatistics);
}

async function getSixMonthsUserStatistics(req, res) {
	return handleStatsRequest(res, 'getSixMonthsUserStatistics', userStatisticsService.getSixMonthsUserStatistics);
}

async function getYearlyUserStatistics(req, res) {
	return handleStatsRequest(res, 'getYearlyUserStatistics', userStatisticsService.getYearlyUserStatistics);
}

module.exports = {
	getWeeklyUserStatistics,
	getMonthlyUserStatistics,
	getSixMonthsUserStatistics,
	getYearlyUserStatistics,
};
