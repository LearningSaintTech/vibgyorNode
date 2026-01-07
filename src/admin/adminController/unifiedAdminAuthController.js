const Admin = require('../adminModel/adminModel');
const SubAdmin = require('../../subAdmin/subAdminModel/subAdminAuthModel');
const ApiResponse = require('../../utils/apiResponse');
const { signAccessToken, signRefreshToken } = require('../../utils/Jwt');

// Fixed phone numbers for admin and subadmin
const ADMIN_PHONE = '9999999999';
const SUBADMIN_PHONE = '8888888888';
const HARD_CODED_OTP = '123456';
const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const OTP_RESEND_WINDOW_MS = 60 * 1000; // 60 seconds between sends

/**
 * Determine role based on phone number
 * @param {string} phoneNumber 
 * @returns {string|null} 'admin', 'subadmin', or null if invalid
 */
function getRoleFromPhoneNumber(phoneNumber) {
	if (phoneNumber === ADMIN_PHONE) {
		return 'admin';
	} else if (phoneNumber === SUBADMIN_PHONE) {
		return 'subadmin';
	}
	return null;
}

/**
 * Unified send OTP for both admin and subadmin
 */
async function sendOtp(req, res) {
	try {
		console.log('[UNIFIED_ADMIN_AUTH] sendOtp request received');
		const { phoneNumber, countryCode = '+91' } = req.body || {};
		
		if (!phoneNumber) {
			return ApiResponse.badRequest(res, 'phoneNumber is required', 'PHONE_REQUIRED');
		}

		// Check if phone number is valid for admin/subadmin
		const role = getRoleFromPhoneNumber(phoneNumber);
		if (!role) {
			return ApiResponse.unauthorized(res, 'Invalid phone number for admin/subadmin access', 'INVALID_PHONE');
		}

		let adminOrSub = null;
		
		if (role === 'admin') {
			adminOrSub = await Admin.findOne({ phoneNumber });
			if (!adminOrSub) {
				adminOrSub = await Admin.create({ phoneNumber, countryCode });
			}
		} else if (role === 'subadmin') {
			adminOrSub = await SubAdmin.findOne({ phoneNumber });
			if (!adminOrSub) {
				adminOrSub = await SubAdmin.create({ phoneNumber, countryCode });
			}
		}

		const now = Date.now();
		if (adminOrSub.lastOtpSentAt && now - adminOrSub.lastOtpSentAt.getTime() < OTP_RESEND_WINDOW_MS) {
			const waitMs = OTP_RESEND_WINDOW_MS - (now - adminOrSub.lastOtpSentAt.getTime());
			return ApiResponse.tooMany(res, `Please wait ${Math.ceil(waitMs / 1000)}s before requesting a new OTP`, 'OTP_RATE_LIMIT');
		}

		adminOrSub.otpCode = HARD_CODED_OTP;
		adminOrSub.otpExpiresAt = new Date(now + OTP_TTL_MS);
		adminOrSub.lastOtpSentAt = new Date(now);
		await adminOrSub.save();

		console.log(`[UNIFIED_ADMIN_AUTH] OTP generated and saved for ${role}`);
		return ApiResponse.success(res, { 
			maskedPhone: adminOrSub.maskedPhone(), 
			ttlSeconds: OTP_TTL_MS / 1000,
			role: role 
		}, 'OTP sent');
	} catch (err) {
		console.error('[UNIFIED_ADMIN_AUTH] sendOtp error', err?.message || err);
		return ApiResponse.serverError(res, 'Failed to send OTP');
	}
}

/**
 * Unified verify OTP for both admin and subadmin
 */
async function verifyOtp(req, res) {
	try {
		console.log('[UNIFIED_ADMIN_AUTH] verifyOtp request received');
		const { phoneNumber, otp } = req.body || {};
		
		if (!phoneNumber || !otp) {
			return ApiResponse.badRequest(res, 'phoneNumber and otp are required', 'OTP_REQUIRED');
		}

		// Check if phone number is valid for admin/subadmin
		const role = getRoleFromPhoneNumber(phoneNumber);
		if (!role) {
			return ApiResponse.unauthorized(res, 'Invalid phone number for admin/subadmin access', 'INVALID_PHONE');
		}

		let adminOrSub = null;
		
		if (role === 'admin') {
			adminOrSub = await Admin.findOne({ phoneNumber });
		} else if (role === 'subadmin') {
			adminOrSub = await SubAdmin.findOne({ phoneNumber });
		}

		if (!adminOrSub || !adminOrSub.otpCode || !adminOrSub.otpExpiresAt) {
			return ApiResponse.unauthorized(res, 'OTP not requested', 'OTP_MISSING');
		}

		if (adminOrSub.otpCode !== otp) {
			return ApiResponse.unauthorized(res, 'Invalid OTP', 'OTP_INVALID');
		}

		if (Date.now() > adminOrSub.otpExpiresAt.getTime()) {
			return ApiResponse.unauthorized(res, 'OTP expired', 'OTP_EXPIRED');
		}

		// Clear OTP and update login info
		adminOrSub.isVerified = true;
		adminOrSub.otpCode = null;
		adminOrSub.otpExpiresAt = null;
		adminOrSub.lastLoginAt = new Date();
		await adminOrSub.save();

		// Generate tokens
		const payload = { userId: String(adminOrSub._id), role: role };
		const accessToken = signAccessToken(payload);
		const refreshToken = signRefreshToken(payload);

		console.log(`[UNIFIED_ADMIN_AUTH] OTP verified, tokens issued for ${role}`);

		// Prepare response data based on role
		let responseData = {
			accessToken,
			refreshToken,
			role: role
		};

		if (role === 'admin') {
			responseData.admin = {
				id: adminOrSub._id,
				phoneNumber: adminOrSub.phoneNumber,
				name: adminOrSub.name,
				email: adminOrSub.email,
				avatarUrl: adminOrSub.avatarUrl,
				role: adminOrSub.role
			};
		} else if (role === 'subadmin') {
			responseData.subadmin = {
				id: adminOrSub._id,
				phoneNumber: adminOrSub.phoneNumber,
				name: adminOrSub.name,
				email: adminOrSub.email,
				avatarUrl: adminOrSub.avatarUrl,
				role: adminOrSub.role,
				isProfileCompleted: adminOrSub.isProfileCompleted,
				approvalStatus: adminOrSub.approvalStatus,
				isActive: adminOrSub.isActive
			};
		}

		return ApiResponse.success(res, responseData, 'OTP verified');
	} catch (err) {
		console.error('[UNIFIED_ADMIN_AUTH] verifyOtp error', err?.message || err);
		return ApiResponse.serverError(res, 'Failed to verify OTP');
	}
}

/**
 * Unified resend OTP for both admin and subadmin
 */
async function resendOtp(req, res) {
	console.log('[UNIFIED_ADMIN_AUTH] resendOtp request received');
	return sendOtp(req, res);
}

module.exports = {
	sendOtp,
	verifyOtp,
	resendOtp,
	getRoleFromPhoneNumber,
	ADMIN_PHONE,
	SUBADMIN_PHONE
};

