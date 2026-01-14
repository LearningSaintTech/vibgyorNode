const Admin = require('../adminModel/adminModel');
const SubAdmin = require('../../subAdmin/subAdminModel/subAdminAuthModel');
const ApiResponse = require('../../utils/apiResponse');
const { signAccessToken, signRefreshToken } = require('../../utils/Jwt');
<<<<<<< HEAD
// 2Factor API integration
const { 
	twofactorService, 
	normalizePhoneForAPI, 
	isBypassPhone, 
	getBypassSessionId, 
	isBypassOTP 
} = require('../../services/twofactor');
=======
>>>>>>> 143b7e2ca5cd001fbb94698c65125589df5db541

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
<<<<<<< HEAD
			const waitSeconds = Math.ceil(waitMs / 1000);
			return ApiResponse.custom(res, 429, {
				success: false,
				message: `Please wait ${waitSeconds}s before requesting a new OTP`,
				code: 'OTP_RATE_LIMIT',
				data: {
					retryAfter: waitSeconds,
					retryAfterMs: waitMs,
					message: `Please wait ${waitSeconds}s before requesting a new OTP`
				}
			});
		}

		// Normalize phone number for 2Factor API (add +91 prefix)
		const normalizedMobile = normalizePhoneForAPI(phoneNumber, countryCode);
		console.log('[UNIFIED_ADMIN_AUTH] Normalized phone', { original: phoneNumber, normalized: normalizedMobile });

		// Check for development bypass (admin/subadmin fixed numbers)
		if (phoneNumber === ADMIN_PHONE || phoneNumber === SUBADMIN_PHONE) {
			console.log('[UNIFIED_ADMIN_AUTH] 🔓 Development bypass detected:', phoneNumber);
			adminOrSub.otpCode = HARD_CODED_OTP;
			adminOrSub.otpExpiresAt = new Date(now + OTP_TTL_MS);
			adminOrSub.twoFactorSessionId = getBypassSessionId(phoneNumber);
			adminOrSub.lastOtpSentAt = new Date(now);
			await adminOrSub.save();
			return ApiResponse.success(res, { 
				maskedPhone: adminOrSub.maskedPhone(), 
				ttlSeconds: OTP_TTL_MS / 1000,
				role: role,
				sessionId: adminOrSub.twoFactorSessionId
			}, 'OTP sent (bypass mode)');
		}

		// Call 2Factor API
		console.log('[UNIFIED_ADMIN_AUTH] 📱 Calling 2Factor API for:', normalizedMobile);
		const otpResult = await twofactorService.sendOTP(normalizedMobile);
		
		if (otpResult.success) {
			// Store session ID instead of OTP code
			adminOrSub.twoFactorSessionId = otpResult.data.sessionId;
			adminOrSub.lastOtpSentAt = new Date(now);
			// Keep old fields for backward compatibility during migration
			adminOrSub.otpCode = null; // Clear old OTP
			adminOrSub.otpExpiresAt = null;
			
			await adminOrSub.save();
			console.log(`[UNIFIED_ADMIN_AUTH] ✅ OTP sent via 2Factor API for ${role}, session ID stored`);
			
			return ApiResponse.success(res, { 
				maskedPhone: adminOrSub.maskedPhone(), 
				ttlSeconds: OTP_TTL_MS / 1000,
				role: role,
				sessionId: adminOrSub.twoFactorSessionId
			}, 'OTP sent');
		} else {
			console.error('[UNIFIED_ADMIN_AUTH] ❌ 2Factor API error:', otpResult.data);
			return ApiResponse.serverError(res, otpResult.data.message || 'Failed to send OTP');
		}
=======
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
>>>>>>> 143b7e2ca5cd001fbb94698c65125589df5db541
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

<<<<<<< HEAD
		if (!adminOrSub) {
			return ApiResponse.unauthorized(res, 'Admin/SubAdmin not found', 'NOT_FOUND');
		}

		// Normalize phone number
		const normalizedMobile = normalizePhoneForAPI(phoneNumber, adminOrSub.countryCode || '+91');

		// Check for development bypass
		if ((phoneNumber === ADMIN_PHONE || phoneNumber === SUBADMIN_PHONE) && isBypassOTP(otp)) {
			console.log('[UNIFIED_ADMIN_AUTH] 🔓 Development bypass verification:', phoneNumber);
			
			// Clear OTP fields
			adminOrSub.otpCode = null;
			adminOrSub.otpExpiresAt = null;
			adminOrSub.twoFactorSessionId = null;
			adminOrSub.isVerified = true;
			adminOrSub.lastLoginAt = new Date();
			await adminOrSub.save();

			// Generate tokens
			const payload = { userId: String(adminOrSub._id), role: role };
			const accessToken = signAccessToken(payload);
			const refreshToken = signRefreshToken(payload);

			console.log(`[UNIFIED_ADMIN_AUTH] OTP verified (bypass mode), tokens issued for ${role}`);

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
					name: adminOrSub.firstName || adminOrSub.name || '',
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

			return ApiResponse.success(res, responseData, 'OTP verified (bypass mode)');
		}

		// Check if OTP was requested (either old method or new method)
		const hasOldOtp = adminOrSub.otpCode && adminOrSub.otpExpiresAt;
		const hasNewSession = adminOrSub.twoFactorSessionId;

		if (!hasOldOtp && !hasNewSession) {
			return ApiResponse.unauthorized(res, 'OTP not requested', 'OTP_MISSING');
		}

		// Handle old OTP method (backward compatibility)
		if (hasOldOtp && !hasNewSession) {
			console.log('[UNIFIED_ADMIN_AUTH] Using legacy OTP verification');
			if (adminOrSub.otpCode !== otp) {
				return ApiResponse.unauthorized(res, 'Invalid OTP', 'OTP_INVALID');
			}
			if (Date.now() > adminOrSub.otpExpiresAt.getTime()) {
				return ApiResponse.unauthorized(res, 'OTP expired', 'OTP_EXPIRED');
			}

			adminOrSub.isVerified = true;
			adminOrSub.otpCode = null;
			adminOrSub.otpExpiresAt = null;
			adminOrSub.lastLoginAt = new Date();
			await adminOrSub.save();

			const payload = { userId: String(adminOrSub._id), role: role };
			const accessToken = signAccessToken(payload);
			const refreshToken = signRefreshToken(payload);

			let responseData = {
				accessToken,
				refreshToken,
				role: role
			};

			if (role === 'admin') {
				responseData.admin = {
					id: adminOrSub._id,
					phoneNumber: adminOrSub.phoneNumber,
					name: adminOrSub.firstName || adminOrSub.name || '',
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
		}

		// Use 2Factor API verification
		if (!adminOrSub.twoFactorSessionId) {
			return ApiResponse.unauthorized(res, 'Session expired. Please request a new OTP.', 'SESSION_EXPIRED');
		}

		console.log('[UNIFIED_ADMIN_AUTH] 📱 Verifying OTP via 2Factor API');
		const verifyResult = await twofactorService.verifyOTP(normalizedMobile, otp, adminOrSub.twoFactorSessionId);

		if (!verifyResult.success) {
			console.error('[UNIFIED_ADMIN_AUTH] ❌ 2Factor verification failed:', verifyResult.data);

			// Handle specific error types
			const errorType = verifyResult.data.error;
			if (errorType === 'INVALID_OTP') {
				return ApiResponse.unauthorized(res, verifyResult.data.message || 'Invalid OTP', 'INVALID_OTP');
			} else if (errorType === 'OTP_EXPIRED') {
				return ApiResponse.unauthorized(res, verifyResult.data.message || 'OTP expired', 'OTP_EXPIRED');
			} else if (errorType === 'SESSION_EXPIRED') {
				// Clear session ID on session expiry
				adminOrSub.twoFactorSessionId = null;
				await adminOrSub.save();
				return ApiResponse.unauthorized(res, verifyResult.data.message || 'Session expired', 'SESSION_EXPIRED');
			}

			return ApiResponse.unauthorized(res, verifyResult.data.message || 'OTP verification failed');
		}

		// OTP verified successfully
		console.log('[UNIFIED_ADMIN_AUTH] ✅ OTP verified via 2Factor API');
		adminOrSub.isVerified = true;
		adminOrSub.twoFactorSessionId = null;
=======
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
>>>>>>> 143b7e2ca5cd001fbb94698c65125589df5db541
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
<<<<<<< HEAD
				name: adminOrSub.firstName || adminOrSub.name || '',
=======
				name: adminOrSub.name,
>>>>>>> 143b7e2ca5cd001fbb94698c65125589df5db541
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
<<<<<<< HEAD
	try {
		console.log('[UNIFIED_ADMIN_AUTH] resendOtp request received');
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
		} else if (role === 'subadmin') {
			adminOrSub = await SubAdmin.findOne({ phoneNumber });
		}

		if (!adminOrSub) {
			return ApiResponse.notFound(res, `${role} not found`);
		}

		const now = Date.now();
		if (adminOrSub.lastOtpSentAt && now - adminOrSub.lastOtpSentAt.getTime() < OTP_RESEND_WINDOW_MS) {
			const waitMs = OTP_RESEND_WINDOW_MS - (now - adminOrSub.lastOtpSentAt.getTime());
			const waitSeconds = Math.ceil(waitMs / 1000);
			return ApiResponse.custom(res, 429, {
				success: false,
				message: `Please wait ${waitSeconds}s before requesting a new OTP`,
				code: 'OTP_RATE_LIMIT',
				data: {
					retryAfter: waitSeconds,
					retryAfterMs: waitMs,
					message: `Please wait ${waitSeconds}s before requesting a new OTP`
				}
			});
		}

		// Normalize phone number for 2Factor API
		const normalizedMobile = normalizePhoneForAPI(phoneNumber, adminOrSub.countryCode || countryCode);

		// Check for development bypass
		if (phoneNumber === ADMIN_PHONE || phoneNumber === SUBADMIN_PHONE) {
			console.log('[UNIFIED_ADMIN_AUTH] 🔓 Development bypass resend:', phoneNumber);
			adminOrSub.otpCode = HARD_CODED_OTP;
			adminOrSub.otpExpiresAt = new Date(now + OTP_TTL_MS);
			adminOrSub.twoFactorSessionId = getBypassSessionId(phoneNumber);
			adminOrSub.lastOtpSentAt = new Date(now);
			await adminOrSub.save();
			return ApiResponse.success(res, { 
				maskedPhone: adminOrSub.maskedPhone(), 
				ttlSeconds: OTP_TTL_MS / 1000,
				role: role,
				sessionId: adminOrSub.twoFactorSessionId
			}, 'OTP resent (bypass mode)');
		}

		// Call 2Factor API to resend OTP
		console.log('[UNIFIED_ADMIN_AUTH] 📱 Resending OTP via 2Factor API');
		const otpResult = await twofactorService.resendOTP(normalizedMobile);

		if (otpResult.success) {
			adminOrSub.twoFactorSessionId = otpResult.data.sessionId;
			adminOrSub.lastOtpSentAt = new Date(now);
			adminOrSub.otpCode = null; // Clear old OTP
			adminOrSub.otpExpiresAt = null;
			await adminOrSub.save();
			console.log('[UNIFIED_ADMIN_AUTH] ✅ OTP resent via 2Factor API');
			return ApiResponse.success(res, { 
				maskedPhone: adminOrSub.maskedPhone(), 
				ttlSeconds: OTP_TTL_MS / 1000,
				role: role,
				sessionId: adminOrSub.twoFactorSessionId
			}, 'OTP resent');
		} else {
			console.error('[UNIFIED_ADMIN_AUTH] ❌ 2Factor API error:', otpResult.data);
			return ApiResponse.serverError(res, otpResult.data.message || 'Failed to resend OTP');
		}
	} catch (err) {
		console.error('[UNIFIED_ADMIN_AUTH] resendOtp error', err?.message || err);
		return ApiResponse.serverError(res, 'Failed to resend OTP');
	}
=======
	console.log('[UNIFIED_ADMIN_AUTH] resendOtp request received');
	return sendOtp(req, res);
>>>>>>> 143b7e2ca5cd001fbb94698c65125589df5db541
}

module.exports = {
	sendOtp,
	verifyOtp,
	resendOtp,
	getRoleFromPhoneNumber,
	ADMIN_PHONE,
	SUBADMIN_PHONE
};

