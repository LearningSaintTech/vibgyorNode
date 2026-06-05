const { OTP_TTL_MS, OTP_RESEND_WINDOW_MS } = require('./auth.constants');
const adminAuthRepository = require('./adminAuth.repository');
const { signAccessToken, signRefreshToken } = require('../../../utils/Jwt');
const { uploadBuffer } = require('../../../services/s3Service');
const {
	twofactorService,
	normalizePhoneForAPI,
	getBypassSessionId,
	isBypassOTP,
	isBypassPhone,
} = require('../../../services/twofactor');

function normalizePhoneInput(phoneNumber, countryCode = '+91') {
	const trimmed = String(phoneNumber || '').trim();
	if (!/^\d{10}$/.test(trimmed)) {
		return null;
	}
	return { phoneNumber: trimmed, countryCode, normalizedMobile: normalizePhoneForAPI(trimmed, countryCode) };
}

function buildOtpRateLimitResult(admin, now = Date.now()) {
	if (!admin.lastOtpSentAt || now - admin.lastOtpSentAt.getTime() >= OTP_RESEND_WINDOW_MS) {
		return null;
	}
	const waitMs = OTP_RESEND_WINDOW_MS - (now - admin.lastOtpSentAt.getTime());
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

function buildAuthSuccessData(admin, accessToken, refreshToken) {
	return {
		accessToken,
		refreshToken,
		role: 'admin',
		admin: {
			id: admin._id,
			phoneNumber: admin.phoneNumber,
			name: admin.firstName || admin.name || '',
			email: admin.email,
			avatarUrl: admin.avatarUrl,
			role: admin.role,
			isProfileCompleted: admin.isProfileCompleted,
		},
	};
}

function issueTokens(admin) {
	const payload = { userId: String(admin._id), role: 'admin' };
	return {
		accessToken: signAccessToken(payload),
		refreshToken: signRefreshToken(payload),
	};
}

async function clearVerifiedSession(admin) {
	admin.otpCode = null;
	admin.otpExpiresAt = null;
	admin.twoFactorSessionId = null;
	admin.isVerified = true;
	admin.lastLoginAt = new Date();
	await adminAuthRepository.saveAdmin(admin);
}

function otpSentPayload(admin, message = 'OTP sent') {
	return {
		ok: true,
		message,
		data: {
			maskedPhone: admin.maskedPhone(),
			ttlSeconds: OTP_TTL_MS / 1000,
			sessionId: admin.twoFactorSessionId,
		},
	};
}

async function dispatchOtp(admin, phoneNumber, countryCode) {
	const now = Date.now();
	const rateLimit = buildOtpRateLimitResult(admin, now);
	if (rateLimit) {
		return { ok: false, ...rateLimit };
	}

	const normalizedMobile = normalizePhoneForAPI(phoneNumber, countryCode);

	if (isBypassPhone(normalizedMobile) || isBypassPhone(phoneNumber)) {
		admin.otpCode = null;
		admin.otpExpiresAt = null;
		admin.twoFactorSessionId = getBypassSessionId(phoneNumber);
		admin.lastOtpSentAt = new Date(now);
		await adminAuthRepository.saveAdmin(admin);
		return otpSentPayload(admin, 'OTP sent (bypass mode)');
	}

	const otpResult = await twofactorService.sendOTP(normalizedMobile);
	if (!otpResult.success) {
		return {
			ok: false,
			statusCode: 500,
			message: otpResult.data?.message || 'Failed to send OTP',
		};
	}

	admin.twoFactorSessionId = otpResult.data.sessionId;
	admin.lastOtpSentAt = new Date(now);
	admin.otpCode = null;
	admin.otpExpiresAt = null;
	await adminAuthRepository.saveAdmin(admin);

	return otpSentPayload(admin, 'OTP sent');
}

async function verifyOtpForAdmin(admin, phoneNumber, otp) {
	const normalizedMobile = normalizePhoneForAPI(phoneNumber, admin.countryCode || '+91');

	if ((isBypassPhone(normalizedMobile) || isBypassPhone(phoneNumber)) && isBypassOTP(otp)) {
		await clearVerifiedSession(admin);
		const tokens = issueTokens(admin);
		return {
			ok: true,
			message: 'OTP verified (bypass mode)',
			data: buildAuthSuccessData(admin, tokens.accessToken, tokens.refreshToken),
		};
	}

	const hasOldOtp = admin.otpCode && admin.otpExpiresAt;
	const hasNewSession = admin.twoFactorSessionId;

	if (!hasOldOtp && !hasNewSession) {
		return { ok: false, statusCode: 401, code: 'OTP_MISSING', message: 'OTP not requested' };
	}

	if (hasOldOtp && !hasNewSession) {
		if (admin.otpCode !== otp) {
			return { ok: false, statusCode: 401, code: 'OTP_INVALID', message: 'Invalid OTP' };
		}
		if (Date.now() > admin.otpExpiresAt.getTime()) {
			return { ok: false, statusCode: 401, code: 'OTP_EXPIRED', message: 'OTP expired' };
		}

		await clearVerifiedSession(admin);
		const tokens = issueTokens(admin);
		return {
			ok: true,
			message: 'OTP verified',
			data: buildAuthSuccessData(admin, tokens.accessToken, tokens.refreshToken),
		};
	}

	if (!admin.twoFactorSessionId) {
		return {
			ok: false,
			statusCode: 401,
			code: 'SESSION_EXPIRED',
			message: 'Session expired. Please request a new OTP.',
		};
	}

	const verifyResult = await twofactorService.verifyOTP(normalizedMobile, otp, admin.twoFactorSessionId);
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
			admin.twoFactorSessionId = null;
			await adminAuthRepository.saveAdmin(admin);
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

	await clearVerifiedSession(admin);
	const tokens = issueTokens(admin);
	return {
		ok: true,
		message: 'OTP verified',
		data: buildAuthSuccessData(admin, tokens.accessToken, tokens.refreshToken),
	};
}

async function resendOtpForAdmin(admin, phoneNumber, countryCode) {
	const now = Date.now();
	const rateLimit = buildOtpRateLimitResult(admin, now);
	if (rateLimit) {
		return { ok: false, ...rateLimit };
	}

	const normalizedMobile = normalizePhoneForAPI(phoneNumber, admin.countryCode || countryCode);

	if (isBypassPhone(normalizedMobile) || isBypassPhone(phoneNumber)) {
		admin.twoFactorSessionId = getBypassSessionId(phoneNumber);
		admin.lastOtpSentAt = new Date(now);
		admin.otpCode = null;
		admin.otpExpiresAt = null;
		await adminAuthRepository.saveAdmin(admin);
		return otpSentPayload(admin, 'OTP resent (bypass mode)');
	}

	const otpResult = await twofactorService.resendOTP(normalizedMobile);
	if (!otpResult.success) {
		return {
			ok: false,
			statusCode: 500,
			message: otpResult.data?.message || 'Failed to resend OTP',
		};
	}

	admin.twoFactorSessionId = otpResult.data.sessionId;
	admin.lastOtpSentAt = new Date(now);
	admin.otpCode = null;
	admin.otpExpiresAt = null;
	await adminAuthRepository.saveAdmin(admin);

	return otpSentPayload(admin, 'OTP resent');
}

// --- Signup (new admin) ---

async function signupSendOtp({ phoneNumber, countryCode = '+91' }) {
	const phone = normalizePhoneInput(phoneNumber, countryCode);
	if (!phone) {
		return { ok: false, statusCode: 400, code: 'INVALID_PHONE', message: 'Valid 10-digit phoneNumber is required' };
	}

	const existing = await adminAuthRepository.findAdminByPhone(phone.phoneNumber);
	if (existing) {
		return {
			ok: false,
			statusCode: 409,
			code: 'ALREADY_REGISTERED',
			message: 'Phone already registered. Use login instead.',
		};
	}

	const admin = await adminAuthRepository.createAdmin({
		phoneNumber: phone.phoneNumber,
		countryCode: phone.countryCode,
	});

	return dispatchOtp(admin, phone.phoneNumber, phone.countryCode);
}

// --- Login (existing admin) ---

async function loginSendOtp({ phoneNumber, countryCode = '+91' }) {
	const phone = normalizePhoneInput(phoneNumber, countryCode);
	if (!phone) {
		return { ok: false, statusCode: 400, code: 'INVALID_PHONE', message: 'Valid 10-digit phoneNumber is required' };
	}

	const admin = await adminAuthRepository.findAdminByPhone(phone.phoneNumber);
	if (!admin) {
		return {
			ok: false,
			statusCode: 404,
			code: 'NOT_REGISTERED',
			message: 'Admin not found. Sign up first.',
		};
	}

	return dispatchOtp(admin, phone.phoneNumber, phone.countryCode);
}

/** Shared after signup or login send-otp */
async function verifyOtp({ phoneNumber, otp }) {
	if (!phoneNumber || !otp) {
		return {
			ok: false,
			statusCode: 400,
			code: 'OTP_REQUIRED',
			message: 'phoneNumber and otp are required',
		};
	}

	const phone = normalizePhoneInput(phoneNumber);
	if (!phone) {
		return { ok: false, statusCode: 400, code: 'INVALID_PHONE', message: 'Valid 10-digit phoneNumber is required' };
	}

	const admin = await adminAuthRepository.findAdminByPhone(phone.phoneNumber);
	if (!admin) {
		return {
			ok: false,
			statusCode: 404,
			code: 'NOT_FOUND',
			message: 'Request OTP first via signup or login.',
		};
	}

	return verifyOtpForAdmin(admin, phone.phoneNumber, otp);
}

/** Shared after signup or login send-otp */
async function resendOtp({ phoneNumber, countryCode = '+91' }) {
	const phone = normalizePhoneInput(phoneNumber, countryCode);
	if (!phone) {
		return { ok: false, statusCode: 400, code: 'INVALID_PHONE', message: 'Valid 10-digit phoneNumber is required' };
	}

	const admin = await adminAuthRepository.findAdminByPhone(phone.phoneNumber);
	if (!admin) {
		return {
			ok: false,
			statusCode: 404,
			code: 'NOT_FOUND',
			message: 'Request OTP first via signup or login.',
		};
	}

	return resendOtpForAdmin(admin, phone.phoneNumber, phone.countryCode);
}

async function getProfile(userId) {
	const admin = await adminAuthRepository.findAdminById(userId);
	if (!admin) {
		return { ok: false, statusCode: 404, message: 'Admin not found' };
	}

	return {
		ok: true,
		message: 'Profile retrieved successfully',
		data: {
			id: admin._id,
			phoneNumber: admin.phoneNumber,
			countryCode: admin.countryCode,
			firstName: admin.firstName || '',
			lastName: admin.lastName || '',
			email: admin.email || '',
			avatarUrl: admin.avatarUrl || '',
			gender: admin.gender,
			dateOfBirth: admin.dateOfBirth,
			address: admin.address || '',
			city: admin.city || '',
			state: admin.state || '',
			pinCode: admin.pinCode || '',
			role: admin.role,
			isProfileCompleted: admin.isProfileCompleted,
		},
	};
}

async function updateProfile(userId, body, file) {
	const {
		firstName,
		lastName,
		email,
		gender,
		dateOfBirth,
		address,
		city,
		state,
		pinCode,
	} = body || {};

	const admin = await adminAuthRepository.findAdminById(userId);
	if (!admin) {
		return { ok: false, statusCode: 404, message: 'Admin not found' };
	}

	let avatarUrl = admin.avatarUrl;

	if (file) {
		try {
			const uploadResult = await uploadBuffer({
				buffer: file.buffer,
				contentType: file.mimetype,
				userId: String(admin._id),
				category: 'profile',
				type: 'images',
				filename: file.originalname,
			});
			avatarUrl = uploadResult.url;
		} catch (uploadError) {
			console.error('❌ [ADMIN][AUTH] Avatar upload failed', {
				userId: admin._id,
				message: uploadError.message,
			});
		}
	}

	if (firstName !== undefined) admin.firstName = firstName;
	if (lastName !== undefined) admin.lastName = lastName;
	if (email !== undefined) admin.email = email;
	if (gender !== undefined) admin.gender = gender;
	if (dateOfBirth !== undefined) {
		admin.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
	}
	if (address !== undefined) admin.address = address;
	if (city !== undefined) admin.city = city;
	if (state !== undefined) admin.state = state;
	if (pinCode !== undefined) admin.pinCode = pinCode;

	if (avatarUrl !== admin.avatarUrl) {
		admin.avatarUrl = avatarUrl;
	}

	const hasBasicProfile =
		admin.firstName?.trim() &&
		admin.lastName?.trim() &&
		admin.email?.trim() &&
		admin.gender &&
		admin.dateOfBirth &&
		admin.address?.trim() &&
		admin.city?.trim() &&
		admin.state?.trim() &&
		admin.pinCode?.trim();

	admin.isProfileCompleted = !!hasBasicProfile;

	try {
		await adminAuthRepository.saveAdmin(admin);
	} catch (saveError) {
		console.error('❌ [ADMIN][AUTH] Failed to save profile', {
			userId: admin._id,
			message: saveError.message,
		});
		return { ok: false, statusCode: 500, message: 'Validation failed while saving profile' };
	}

	return {
		ok: true,
		message: 'Profile updated successfully',
		data: {
			id: admin._id,
			phoneNumber: admin.phoneNumber,
			countryCode: admin.countryCode,
			firstName: admin.firstName || '',
			lastName: admin.lastName || '',
			email: admin.email || '',
			avatarUrl: admin.avatarUrl || '',
			gender: admin.gender,
			dateOfBirth: admin.dateOfBirth,
			address: admin.address || '',
			city: admin.city || '',
			state: admin.state || '',
			pinCode: admin.pinCode || '',
			isProfileCompleted: admin.isProfileCompleted,
			role: admin.role,
			isVerified: admin.isVerified,
			lastLoginAt: admin.lastLoginAt,
		},
	};
}

module.exports = {
	signupSendOtp,
	loginSendOtp,
	verifyOtp,
	resendOtp,
	getProfile,
	updateProfile,
};
