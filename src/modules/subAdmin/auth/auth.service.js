const {
	SUBADMIN_PHONE,
	HARD_CODED_OTP,
	OTP_TTL_MS,
	OTP_RESEND_WINDOW_MS,
	isSubAdminPhone,
} = require('../../admin/auth/auth.constants');
const subAdminAuthRepository = require('./auth.repository');
const { signAccessToken, signRefreshToken } = require('../../../utils/Jwt');
const {
	twofactorService,
	normalizePhoneForAPI,
	getBypassSessionId,
	isBypassOTP,
} = require('../../../services/twofactor');

function buildOtpRateLimitResult(subadmin, now = Date.now()) {
	if (!subadmin.lastOtpSentAt || now - subadmin.lastOtpSentAt.getTime() >= OTP_RESEND_WINDOW_MS) {
		return null;
	}
	const waitMs = OTP_RESEND_WINDOW_MS - (now - subadmin.lastOtpSentAt.getTime());
	const waitSeconds = Math.ceil(waitMs / 1000);
	return {
		statusCode: 429,
		code: 'OTP_RATE_LIMIT',
		message: `Please wait ${waitSeconds}s before requesting a new OTP`,
		data: {
			retryAfter: waitSeconds,
			retryAfterMs: waitMs,
			message: `Please wait ${waitSeconds}s before requesting a new OTP`,
		},
	};
}

function buildAuthSuccessData(subadmin, accessToken, refreshToken) {
	return {
		accessToken,
		refreshToken,
		role: 'subadmin',
		subadmin: {
			id: subadmin._id,
			phoneNumber: subadmin.phoneNumber,
			name: subadmin.name,
			email: subadmin.email,
			avatarUrl: subadmin.avatarUrl,
			role: subadmin.role,
			isProfileCompleted: subadmin.isProfileCompleted,
			approvalStatus: subadmin.approvalStatus,
			isActive: subadmin.isActive,
		},
	};
}

function issueTokens(subadmin) {
	const payload = { userId: String(subadmin._id), role: 'subadmin' };
	return {
		accessToken: signAccessToken(payload),
		refreshToken: signRefreshToken(payload),
	};
}

async function clearVerifiedSession(subadmin) {
	subadmin.otpCode = null;
	subadmin.otpExpiresAt = null;
	subadmin.twoFactorSessionId = null;
	subadmin.isVerified = true;
	subadmin.lastLoginAt = new Date();
	await subAdminAuthRepository.saveSubAdmin(subadmin);
}

function isDevBypassPhone(phoneNumber) {
	return phoneNumber === SUBADMIN_PHONE;
}

async function sendOtp({ phoneNumber, countryCode = '+91' }) {
	if (!phoneNumber) {
		return { ok: false, statusCode: 400, code: 'PHONE_REQUIRED', message: 'phoneNumber is required' };
	}

	if (!isSubAdminPhone(phoneNumber)) {
		return {
			ok: false,
			statusCode: 401,
			code: 'INVALID_PHONE',
			message: 'Invalid phone number for subadmin access',
		};
	}

	const subadmin = await subAdminAuthRepository.findOrCreateSubAdmin(phoneNumber, countryCode);
	const now = Date.now();
	const rateLimit = buildOtpRateLimitResult(subadmin, now);
	if (rateLimit) {
		return { ok: false, ...rateLimit };
	}

	const normalizedMobile = normalizePhoneForAPI(phoneNumber, countryCode);

	if (isDevBypassPhone(phoneNumber)) {
		subadmin.otpCode = HARD_CODED_OTP;
		subadmin.otpExpiresAt = new Date(now + OTP_TTL_MS);
		subadmin.twoFactorSessionId = getBypassSessionId(phoneNumber);
		subadmin.lastOtpSentAt = new Date(now);
		await subAdminAuthRepository.saveSubAdmin(subadmin);

		return {
			ok: true,
			message: 'OTP sent (bypass mode)',
			data: {
				maskedPhone: subadmin.maskedPhone(),
				ttlSeconds: OTP_TTL_MS / 1000,
				sessionId: subadmin.twoFactorSessionId,
			},
		};
	}

	const otpResult = await twofactorService.sendOTP(normalizedMobile);
	if (!otpResult.success) {
		return {
			ok: false,
			statusCode: 500,
			message: otpResult.data?.message || 'Failed to send OTP',
		};
	}

	subadmin.twoFactorSessionId = otpResult.data.sessionId;
	subadmin.lastOtpSentAt = new Date(now);
	subadmin.otpCode = null;
	subadmin.otpExpiresAt = null;
	await subAdminAuthRepository.saveSubAdmin(subadmin);

	return {
		ok: true,
		message: 'OTP sent',
		data: {
			maskedPhone: subadmin.maskedPhone(),
			ttlSeconds: OTP_TTL_MS / 1000,
			sessionId: subadmin.twoFactorSessionId,
		},
	};
}

async function verifyOtp({ phoneNumber, otp }) {
	if (!phoneNumber || !otp) {
		return {
			ok: false,
			statusCode: 400,
			code: 'OTP_REQUIRED',
			message: 'phoneNumber and otp are required',
		};
	}

	if (!isSubAdminPhone(phoneNumber)) {
		return {
			ok: false,
			statusCode: 401,
			code: 'INVALID_PHONE',
			message: 'Invalid phone number for subadmin access',
		};
	}

	const subadmin = await subAdminAuthRepository.findSubAdminByPhone(phoneNumber);
	if (!subadmin) {
		return { ok: false, statusCode: 401, code: 'NOT_FOUND', message: 'SubAdmin not found. Request OTP first.' };
	}

	const normalizedMobile = normalizePhoneForAPI(phoneNumber, subadmin.countryCode || '+91');

	if (isDevBypassPhone(phoneNumber) && isBypassOTP(otp)) {
		await clearVerifiedSession(subadmin);
		const tokens = issueTokens(subadmin);
		return {
			ok: true,
			message: 'OTP verified (bypass mode)',
			data: buildAuthSuccessData(subadmin, tokens.accessToken, tokens.refreshToken),
		};
	}

	const hasOldOtp = subadmin.otpCode && subadmin.otpExpiresAt;
	const hasNewSession = subadmin.twoFactorSessionId;

	if (!hasOldOtp && !hasNewSession) {
		return { ok: false, statusCode: 401, code: 'OTP_MISSING', message: 'OTP not requested' };
	}

	if (hasOldOtp && !hasNewSession) {
		if (subadmin.otpCode !== otp) {
			return { ok: false, statusCode: 401, code: 'OTP_INVALID', message: 'Invalid OTP' };
		}
		if (Date.now() > subadmin.otpExpiresAt.getTime()) {
			return { ok: false, statusCode: 401, code: 'OTP_EXPIRED', message: 'OTP expired' };
		}

		await clearVerifiedSession(subadmin);
		const tokens = issueTokens(subadmin);
		return {
			ok: true,
			message: 'OTP verified',
			data: buildAuthSuccessData(subadmin, tokens.accessToken, tokens.refreshToken),
		};
	}

	if (!subadmin.twoFactorSessionId) {
		return {
			ok: false,
			statusCode: 401,
			code: 'SESSION_EXPIRED',
			message: 'Session expired. Please request a new OTP.',
		};
	}

	const verifyResult = await twofactorService.verifyOTP(normalizedMobile, otp, subadmin.twoFactorSessionId);
	if (!verifyResult.success) {
		const errorType = verifyResult.data?.error;
		if (errorType === 'INVALID_OTP') {
			return {
				ok: false,
				statusCode: 401,
				code: 'INVALID_OTP',
				message: verifyResult.data?.message || 'Invalid OTP',
			};
		}
		if (errorType === 'OTP_EXPIRED') {
			return {
				ok: false,
				statusCode: 401,
				code: 'OTP_EXPIRED',
				message: verifyResult.data?.message || 'OTP expired',
			};
		}
		if (errorType === 'SESSION_EXPIRED') {
			subadmin.twoFactorSessionId = null;
			await subAdminAuthRepository.saveSubAdmin(subadmin);
			return {
				ok: false,
				statusCode: 401,
				code: 'SESSION_EXPIRED',
				message: verifyResult.data?.message || 'Session expired',
			};
		}

		return {
			ok: false,
			statusCode: 401,
			message: verifyResult.data?.message || 'OTP verification failed',
		};
	}

	await clearVerifiedSession(subadmin);
	const tokens = issueTokens(subadmin);
	return {
		ok: true,
		message: 'OTP verified',
		data: buildAuthSuccessData(subadmin, tokens.accessToken, tokens.refreshToken),
	};
}

async function resendOtp({ phoneNumber, countryCode = '+91' }) {
	if (!phoneNumber) {
		return { ok: false, statusCode: 400, code: 'PHONE_REQUIRED', message: 'phoneNumber is required' };
	}

	if (!isSubAdminPhone(phoneNumber)) {
		return {
			ok: false,
			statusCode: 401,
			code: 'INVALID_PHONE',
			message: 'Invalid phone number for subadmin access',
		};
	}

	const subadmin = await subAdminAuthRepository.findSubAdminByPhone(phoneNumber);
	if (!subadmin) {
		return { ok: false, statusCode: 404, message: 'SubAdmin not found' };
	}

	const now = Date.now();
	const rateLimit = buildOtpRateLimitResult(subadmin, now);
	if (rateLimit) {
		return { ok: false, ...rateLimit };
	}

	const normalizedMobile = normalizePhoneForAPI(phoneNumber, subadmin.countryCode || countryCode);

	if (isDevBypassPhone(phoneNumber)) {
		subadmin.otpCode = HARD_CODED_OTP;
		subadmin.otpExpiresAt = new Date(now + OTP_TTL_MS);
		subadmin.twoFactorSessionId = getBypassSessionId(phoneNumber);
		subadmin.lastOtpSentAt = new Date(now);
		await subAdminAuthRepository.saveSubAdmin(subadmin);

		return {
			ok: true,
			message: 'OTP resent (bypass mode)',
			data: {
				maskedPhone: subadmin.maskedPhone(),
				ttlSeconds: OTP_TTL_MS / 1000,
				sessionId: subadmin.twoFactorSessionId,
			},
		};
	}

	const otpResult = await twofactorService.resendOTP(normalizedMobile);
	if (!otpResult.success) {
		return {
			ok: false,
			statusCode: 500,
			message: otpResult.data?.message || 'Failed to resend OTP',
		};
	}

	subadmin.twoFactorSessionId = otpResult.data.sessionId;
	subadmin.lastOtpSentAt = new Date(now);
	subadmin.otpCode = null;
	subadmin.otpExpiresAt = null;
	await subAdminAuthRepository.saveSubAdmin(subadmin);

	return {
		ok: true,
		message: 'OTP resent',
		data: {
			maskedPhone: subadmin.maskedPhone(),
			ttlSeconds: OTP_TTL_MS / 1000,
			sessionId: subadmin.twoFactorSessionId,
		},
	};
}

module.exports = {
	sendOtp,
	verifyOtp,
	resendOtp,
};
