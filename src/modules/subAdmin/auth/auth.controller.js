const ApiResponse = require('../../../utils/apiResponse');
const subAdminAuthService = require('./auth.service');
const SubAdmin = require('./subAdmin.model');
const { uploadBuffer } = require('../../../services/s3Service');

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
		return ApiResponse.notFound(res, result.message);
	}
	if (result.statusCode === 429) {
		return ApiResponse.tooMany(res, result.message, result.code);
	}

	return ApiResponse.serverError(res, result.message || 'Request failed');
}

async function sendOtp(req, res) {
	try {
		const result = await subAdminAuthService.sendOtp(req.body || {});
		return mapServiceResult(res, result);
	} catch (err) {
		return ApiResponse.serverError(res, 'Failed to send OTP');
	}
}

async function verifyOtp(req, res) {
	try {
		const result = await subAdminAuthService.verifyOtp(req.body || {});
		return mapServiceResult(res, result);
	} catch (err) {
		return ApiResponse.serverError(res, 'Failed to verify OTP');
	}
}

async function resendOtp(req, res) {
	try {
		const result = await subAdminAuthService.resendOtp(req.body || {});
		return mapServiceResult(res, result);
	} catch (err) {
		return ApiResponse.serverError(res, 'Failed to resend OTP');
	}
}

async function getProfile(req, res) {
	try {
		const sub = await SubAdmin.findById(req.user.userId)
			.select('-otpCode -otpExpiresAt -lastOtpSentAt -twoFactorSessionId');

		if (!sub) return ApiResponse.notFound(res, 'Subadmin not found');

		return ApiResponse.success(res, {
			id: sub._id,
			phoneNumber: sub.phoneNumber,
			countryCode: sub.countryCode,
			name: sub.name,
			email: sub.email,
			avatarUrl: sub.avatarUrl,
			gender: sub.gender,
			dateOfBirth: sub.dateOfBirth,
			address: sub.address,
			city: sub.city,
			state: sub.state,
			pinCode: sub.pinCode,
			isVerified: sub.isVerified,
			isProfileCompleted: sub.isProfileCompleted,
			approvalStatus: sub.approvalStatus,
			isActive: sub.isActive,
			createdAt: sub.createdAt,
			updatedAt: sub.updatedAt,
		}, 'Profile fetched successfully');
	} catch (err) {
		console.error('[SUBADMIN][AUTH] getProfile error:', err);
		return ApiResponse.serverError(res, 'Failed to fetch profile');
	}
}

async function updateProfile(req, res) {
	try {
		const {
			name,
			email,
			gender,
			dateOfBirth,
			address,
			city,
			state,
			pinCode,
		} = req.body || {};

		const sub = await SubAdmin.findById(req.user.userId);
		if (!sub) {
			return ApiResponse.notFound(res, 'Subadmin not found');
		}

		let avatarUrl = sub.avatarUrl;

		if (req.file) {
			try {
				const uploadResult = await uploadBuffer({
					buffer: req.file.buffer,
					contentType: req.file.mimetype,
					userId: String(sub._id),
					category: 'profile',
					type: 'images',
					filename: req.file.originalname,
				});
				avatarUrl = uploadResult.url;
			} catch (uploadError) {
				console.error('[SUBADMIN][AUTH] Avatar upload failed', uploadError?.message);
			}
		}

		if (name !== undefined) sub.name = name;
		if (email !== undefined) sub.email = email;
		if (gender !== undefined) sub.gender = gender;
		if (dateOfBirth !== undefined) {
			sub.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
		}
		if (address !== undefined) sub.address = address;
		if (city !== undefined) sub.city = city;
		if (state !== undefined) sub.state = state;
		if (pinCode !== undefined) sub.pinCode = pinCode;

		sub.avatarUrl = avatarUrl;
		sub.isProfileCompleted = true;

		if (sub.approvalStatus === 'pending') {
			sub.isActive = false;
		}

		await sub.save();

		return ApiResponse.success(res, {
			id: sub._id,
			phoneNumber: sub.phoneNumber,
			name: sub.name,
			email: sub.email,
			avatarUrl: sub.avatarUrl,
			gender: sub.gender,
			dateOfBirth: sub.dateOfBirth,
			address: sub.address,
			city: sub.city,
			state: sub.state,
			pinCode: sub.pinCode,
			isProfileCompleted: sub.isProfileCompleted,
			approvalStatus: sub.approvalStatus,
			isActive: sub.isActive,
		}, 'Profile updated successfully');
	} catch (err) {
		console.error('[SUBADMIN][AUTH] updateProfile error:', err);
		return ApiResponse.serverError(res, 'Failed to update profile');
	}
}

module.exports = { sendOtp, verifyOtp, resendOtp, getProfile, updateProfile };
