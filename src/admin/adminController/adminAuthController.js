const Admin = require('../adminModel/adminModel');
const ApiResponse = require('../../utils/apiResponse');
const { signAccessToken, signRefreshToken } = require('../../utils/Jwt');

const HARD_CODED_OTP = '123456';
const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const OTP_RESEND_WINDOW_MS = 60 * 1000; // 60 seconds between sends

async function sendOtp(req, res) {
	try {
		// eslint-disable-next-line no-console
		console.log('[ADMIN][AUTH] sendOtp request received');
		const { phoneNumber, countryCode = '+91' } = req.body || {};
		if (!phoneNumber) return ApiResponse.badRequest(res, 'phoneNumber is required', 'PHONE_REQUIRED');

		let admin = await Admin.findOne({ phoneNumber });
		if (!admin) {
			admin = await Admin.create({ phoneNumber, countryCode });
		}

		const now = Date.now();
		if (admin.lastOtpSentAt && now - admin.lastOtpSentAt.getTime() < OTP_RESEND_WINDOW_MS) {
			const waitMs = OTP_RESEND_WINDOW_MS - (now - admin.lastOtpSentAt.getTime());
			return ApiResponse.tooMany(res, `Please wait ${Math.ceil(waitMs / 1000)}s before requesting a new OTP`, 'OTP_RATE_LIMIT');
		}

		admin.otpCode = HARD_CODED_OTP;
		admin.otpExpiresAt = new Date(now + OTP_TTL_MS);
		admin.lastOtpSentAt = new Date(now);
		await admin.save();

		// TODO: integrate SMS provider
		// eslint-disable-next-line no-console
		console.log('[ADMIN][AUTH] OTP generated and saved');
		return ApiResponse.success(res, { maskedPhone: admin.maskedPhone(), ttlSeconds: OTP_TTL_MS / 1000 }, 'OTP sent');
	} catch (err) {
		// eslint-disable-next-line no-console
		console.error('[ADMIN][AUTH] sendOtp error', err?.message || err);
		return ApiResponse.serverError(res, 'Failed to send OTP');
	}
}

async function verifyOtp(req, res) {
	try {
		// eslint-disable-next-line no-console
		console.log('[ADMIN][AUTH] verifyOtp request received');
		const { phoneNumber, otp } = req.body || {};
		if (!phoneNumber || !otp) return ApiResponse.badRequest(res, 'phoneNumber and otp are required', 'OTP_REQUIRED');

		const admin = await Admin.findOne({ phoneNumber });
		if (!admin || !admin.otpCode || !admin.otpExpiresAt) return ApiResponse.unauthorized(res, 'OTP not requested', 'OTP_MISSING');
		if (admin.otpCode !== otp) return ApiResponse.unauthorized(res, 'Invalid OTP', 'OTP_INVALID');
		if (Date.now() > admin.otpExpiresAt.getTime()) return ApiResponse.unauthorized(res, 'OTP expired', 'OTP_EXPIRED');

		admin.isVerified = true;
		admin.otpCode = null;
		admin.otpExpiresAt = null;
		admin.lastLoginAt = new Date();
		await admin.save();

		const payload = { userId: String(admin._id), role: 'admin' };
		const accessToken = signAccessToken(payload);
		const refreshToken = signRefreshToken(payload);

		// eslint-disable-next-line no-console
		console.log('[ADMIN][AUTH] OTP verified, tokens issued');
		return ApiResponse.success(res, { accessToken, refreshToken, admin: { id: admin._id, phoneNumber: admin.phoneNumber, name: admin.name, email: admin.email, avatarUrl: admin.avatarUrl, role: admin.role } }, 'OTP verified');
	} catch (err) {
		// eslint-disable-next-line no-console
		console.error('[ADMIN][AUTH] verifyOtp error', err?.message || err);
		return ApiResponse.serverError(res, 'Failed to verify OTP');
	}
}

async function resendOtp(req, res) {
	// eslint-disable-next-line no-console
	console.log('[ADMIN][AUTH] resendOtp request received');
	return sendOtp(req, res);
}

module.exports = {
	sendOtp,
	verifyOtp,
	resendOtp,
};


