const ApiResponse = require('../../../utils/apiResponse');
const usernameService = require('./username.service');

function mapServiceResult(res, result) {
	if (result.ok) {
		return ApiResponse.success(res, result.data, result.message);
	}
	if (result.statusCode === 400) {
		return ApiResponse.badRequest(res, result.message);
	}
	return ApiResponse.serverError(res, result.message || 'Request failed');
}

async function checkAvailability(req, res) {
	try {
		const result = await usernameService.checkAvailability(req.query);
		return mapServiceResult(res, result);
	} catch (e) {
		return ApiResponse.serverError(res, 'Failed to check username');
	}
}

async function suggest(req, res) {
	try {
		const result = await usernameService.suggest(req.query);
		return mapServiceResult(res, result);
	} catch (e) {
		return ApiResponse.serverError(res, 'Failed to suggest usernames');
	}
}

module.exports = {
	checkAvailability,
	suggest,
};
