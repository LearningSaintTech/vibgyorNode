const ApiResponse = require('../../../utils/apiResponse');
const userCountService = require('./userCount.service');

async function getUserCounts(req, res) {
	const userRole = req.user?.role || 'unknown';
	try {
		console.log(`[${userRole.toUpperCase()}][USER_COUNT] getUserCounts request`);
		const result = await userCountService.getUserCounts();
		console.log(`[${userRole.toUpperCase()}][USER_COUNT] User counts fetched successfully`, {
			...result.data,
			sampleVerifiedUsers: result.debug.sampleVerifiedUsers,
		});
		return ApiResponse.success(res, result.data, result.message);
	} catch (e) {
		console.error(`[${userRole.toUpperCase()}][USER_COUNT] getUserCounts error:`, e?.message || e);
		return ApiResponse.serverError(res, 'Failed to fetch user counts');
	}
}

module.exports = { getUserCounts };
