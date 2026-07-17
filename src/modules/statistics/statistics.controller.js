const ApiResponse = require('../../utils/apiResponse');
const statisticsService = require('./statistics.service');

async function handle(res, label, fn) {
	try {
		console.log(`[ADMIN][STATISTICS] ${label} request`);
		const result = await fn();
		if (result.ok) {
			console.log(`[ADMIN][STATISTICS] ${label} fetched successfully`);
			return ApiResponse.success(res, result.data, result.message);
		}
		return ApiResponse.serverError(res, `Failed to fetch ${label}`);
	} catch (e) {
		console.error(`[ADMIN][STATISTICS] ${label} error:`, e?.message || e);
		return ApiResponse.serverError(res, `Failed to fetch ${label}`);
	}
}

async function getOverview(req, res) {
	return handle(res, 'overview', () => statisticsService.getOverview(req.query || {}));
}

async function getDating(req, res) {
	return handle(res, 'dating', () => statisticsService.getDating(req.query || {}));
}

async function getSocial(req, res) {
	return handle(res, 'social', () => statisticsService.getSocial(req.query || {}));
}

async function getDatingTrends(req, res) {
	return handle(res, 'dating-trends', () => statisticsService.getDatingTrends(req.query || {}));
}

async function getSocialTrends(req, res) {
	return handle(res, 'social-trends', () => statisticsService.getSocialTrends(req.query || {}));
}

module.exports = {
	getOverview,
	getDating,
	getSocial,
	getDatingTrends,
	getSocialTrends,
};
