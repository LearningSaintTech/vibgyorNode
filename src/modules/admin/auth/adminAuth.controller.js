const ApiResponse = require('../../../utils/apiResponse');
const adminAuthService = require('./adminAuth.service');

function mapServiceResult(res, result) {
	if (result.ok) {
		return ApiResponse.success(res, result.data, result.message);
	}

	if (result.statusCode === 429 && result.code === 'OTP_RATE_LIMIT') {
		return ApiResponse.custom(res, 429, {
			success: false,
			message: result.message,
			code: result.code,
			data: result.data,
		});
	}

	if (result.statusCode === 400) {
		return ApiResponse.badRequest(res, result.message, result.code);
	}
	if (result.statusCode === 401) {
		return ApiResponse.unauthorized(res, result.message, result.code);
	}
	if (result.statusCode === 404) {
		return ApiResponse.notFound(res, result.message, result.code);
	}
	if (result.statusCode === 409) {
		return ApiResponse.conflict(res, result.message, result.code);
	}
	if (result.statusCode === 429) {
		return ApiResponse.tooMany(res, result.message, result.code);
	}

	return ApiResponse.serverError(res, result.message || 'Request failed');
}

async function signupSendOtp(req, res) {
	try {
		const result = await adminAuthService.signupSendOtp(req.body || {});
		return mapServiceResult(res, result);
	} catch (err) {
		console.error('[ADMIN][AUTH] signupSendOtp error', err?.message || err);
		return ApiResponse.serverError(res, 'Failed to send OTP');
	}
}

async function loginSendOtp(req, res) {
	try {
		const result = await adminAuthService.loginSendOtp(req.body || {});
		return mapServiceResult(res, result);
	} catch (err) {
		console.error('[ADMIN][AUTH] loginSendOtp error', err?.message || err);
		return ApiResponse.serverError(res, 'Failed to send OTP');
	}
}

async function verifyOtp(req, res) {
	try {
		const result = await adminAuthService.verifyOtp(req.body || {});
		return mapServiceResult(res, result);
	} catch (err) {
		console.error('[ADMIN][AUTH] verifyOtp error', err?.message || err);
		return ApiResponse.serverError(res, 'Failed to verify OTP');
	}
}

async function resendOtp(req, res) {
	try {
		const result = await adminAuthService.resendOtp(req.body || {});
		return mapServiceResult(res, result);
	} catch (err) {
		console.error('[ADMIN][AUTH] resendOtp error', err?.message || err);
		return ApiResponse.serverError(res, 'Failed to resend OTP');
	}
}

async function getProfile(req, res) {
	try {
		const result = await adminAuthService.getProfile(req.user.userId);
		return mapServiceResult(res, result);
	} catch (err) {
		return ApiResponse.serverError(res, 'Failed to fetch profile');
	}
}

async function updateProfile(req, res) {
	try {
		if (!req.is('multipart/form-data')) {
			return ApiResponse.badRequest(res, 'Content-Type must be multipart/form-data');
		}

		const result = await adminAuthService.updateProfile(req.user.userId, req.body, req.file);
		return mapServiceResult(res, result);
	} catch (err) {
		console.error('[ADMIN][AUTH] updateProfile error', err?.message || err);
		return ApiResponse.serverError(res, 'Failed to update profile');
	}
}

async function getMe(req, res) {
	return ApiResponse.success(res, { user: req.user, role: req.user.role }, 'Authenticated');
}

module.exports = {
	signupSendOtp,
	loginSendOtp,
	verifyOtp,
	resendOtp,
	getProfile,
	updateProfile,
	getMe,
};
