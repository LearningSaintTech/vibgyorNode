const User = require('../userModel/userAuthModel');
const ApiResponse = require('../../utils/apiResponse');
const { signAccessToken, signRefreshToken } = require('../../utils/Jwt');
const { sendEmail } = require('../../services/emailService');

const HARD_CODED_OTP = '123456';
const OTP_TTL_MS = 5 * 60 * 1000;
const RESEND_WINDOW_MS = 60 * 1000;

async function sendPhoneOtp(req, res) {
	try {
		// eslint-disable-next-line no-console
		console.log('[USER][AUTH] sendPhoneOtp');
		const { phoneNumber, countryCode = '+91' } = req.body || {};
		if (!phoneNumber) return ApiResponse.badRequest(res, 'phoneNumber is required');
		let user = await User.findOne({ phoneNumber });
		if (!user) user = await User.create({ phoneNumber, countryCode });
		const now = Date.now();
		if (user.lastOtpSentAt && now - user.lastOtpSentAt.getTime() < RESEND_WINDOW_MS) {
			const waitMs = RESEND_WINDOW_MS - (now - user.lastOtpSentAt.getTime());
			return ApiResponse.tooMany(res, `Please wait ${Math.ceil(waitMs / 1000)}s`, 'OTP_RATE_LIMIT');
		}
		user.otpCode = HARD_CODED_OTP;
		user.otpExpiresAt = new Date(now + OTP_TTL_MS);
		user.lastOtpSentAt = new Date(now);
		await user.save();
		return ApiResponse.success(res, { maskedPhone: user.maskedPhone(), ttlSeconds: OTP_TTL_MS / 1000 }, 'OTP sent');
	} catch (e) {
		// eslint-disable-next-line no-console
		console.error('[USER][AUTH] sendPhoneOtp error', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to send OTP');
	}
}

async function verifyPhoneOtp(req, res) {
	try {
		// eslint-disable-next-line no-console
		console.log('[USER][AUTH] verifyPhoneOtp');
		const { phoneNumber, otp } = req.body || {};
		if (!phoneNumber || !otp) return ApiResponse.badRequest(res, 'phoneNumber and otp are required');
		const user = await User.findOne({ phoneNumber });
		if (!user || !user.otpCode || !user.otpExpiresAt) return ApiResponse.unauthorized(res, 'OTP not requested');
		if (user.otpCode !== otp) return ApiResponse.unauthorized(res, 'Invalid OTP');
		if (Date.now() > user.otpExpiresAt.getTime()) return ApiResponse.unauthorized(res, 'OTP expired');
		user.otpCode = null;
		user.otpExpiresAt = null;
		user.lastLoginAt = new Date();
		await user.save();
		const payload = { userId: String(user._id), role: 'user' };
		const accessToken = signAccessToken(payload);
		const refreshToken = signRefreshToken(payload);
		// Create a simple user object for the response
		const userData = {
			id: user._id,
			phoneNumber: user.phoneNumber ? `******${user.phoneNumber.slice(-4)}` : '',
			countryCode: user.countryCode,
			email: user.email,
			emailVerified: user.emailVerified,
			username: user.username,
			fullName: user.fullName,
			role: user.role,
			isProfileCompleted: user.isProfileCompleted,
			isActive: user.isActive
		};
		return ApiResponse.success(res, { accessToken, refreshToken, user: userData, isProfileCompleted: !!user.isProfileCompleted }, 'OTP verified');
	} catch (e) {
		// eslint-disable-next-line no-console
		console.error('[USER][AUTH] verifyPhoneOtp error', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to verify OTP');
	}
}

async function sendEmailOtp(req, res) {
	try {
		// eslint-disable-next-line no-console
		console.log('[USER][AUTH] sendEmailOtp');
		const { email } = req.body || {};
		if (!email) return ApiResponse.badRequest(res, 'email is required');
		const user = await User.findById(req.user?.userId);
		if (!user) return ApiResponse.notFound(res, 'User not found');
		const now = Date.now();
		if (user.lastEmailOtpSentAt && now - user.lastEmailOtpSentAt.getTime() < RESEND_WINDOW_MS) {
			const waitMs = RESEND_WINDOW_MS - (now - user.lastEmailOtpSentAt.getTime());
			return ApiResponse.tooMany(res, `Please wait ${Math.ceil(waitMs / 1000)}s`, 'EMAIL_OTP_RATE_LIMIT');
		}
		user.email = email;
		user.emailOtpCode = HARD_CODED_OTP;
		user.emailOtpExpiresAt = new Date(now + OTP_TTL_MS);
		user.lastEmailOtpSentAt = new Date(now);
		await user.save();
		try {
			await sendEmail({ to: email, subject: 'Your verification code', html: `<p>Your verification code is <b>${HARD_CODED_OTP}</b></p>` });
			console.log('[USER][AUTH] Email sent successfully to:', email);
		} catch (e) {
			console.error('[USER][AUTH] Email sending failed:', e?.message || e);
		}
		return ApiResponse.success(res, { ttlSeconds: OTP_TTL_MS / 1000 }, 'Email OTP sent');
	} catch (e) {
		// eslint-disable-next-line no-console
		console.error('[USER][AUTH] sendEmailOtp error', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to send email OTP');
	}
}

async function verifyEmailOtp(req, res) {
	try {
		// eslint-disable-next-line no-console
		console.log('[USER][AUTH] verifyEmailOtp');
		const { otp } = req.body || {};
		const user = await User.findById(req.user?.userId);
		if (!user) return ApiResponse.notFound(res, 'User not found');
		if (!otp || !user.emailOtpCode || !user.emailOtpExpiresAt) return ApiResponse.badRequest(res, 'OTP not requested');
		if (user.emailOtpCode !== otp) return ApiResponse.unauthorized(res, 'Invalid OTP');
		if (Date.now() > user.emailOtpExpiresAt.getTime()) return ApiResponse.unauthorized(res, 'OTP expired');
		user.emailVerified = true;
		user.emailOtpCode = null;
		user.emailOtpExpiresAt = null;
		await user.save();
		return ApiResponse.success(res, null, 'Email verified');
	} catch (e) {
		// eslint-disable-next-line no-console
		console.error('[USER][AUTH] verifyEmailOtp error', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to verify email');
	}
}

function normalizeUsername(u) {
	if (!u) return '';
	return String(u).trim().toLowerCase();
}

async function getProfile(req, res) {
	try {
		// eslint-disable-next-line no-console
		console.log('[USER][AUTH] getProfile');
		const user = await User.findById(req.user?.userId).select('-otpCode -otpExpiresAt -emailOtpCode -emailOtpExpiresAt');
		if (!user) return ApiResponse.notFound(res, 'User not found');
		
		const profileData = {
			id: user._id,
			phoneNumber: user.maskedPhone(),
			countryCode: user.countryCode,
			email: user.email,
			emailVerified: user.emailVerified,
			username: user.username,
			fullName: user.fullName,
			dob: user.dob,
			bio: user.bio,
			gender: user.gender,
			pronouns: user.pronouns,
			likes: user.likes || [],
			interests: user.interests || [],
			profilePictureUrl: user.profilePictureUrl,
			idProofUrl: user.idProofUrl,
			location: user.location,
			role: user.role,
			isProfileCompleted: user.isProfileCompleted,
			isActive: user.isActive,
			verificationStatus: user.verificationStatus,
			verificationDocument: user.verificationDocument,
			following: user.following || [],
			followers: user.followers || [],
			blockedUsers: user.blockedUsers || [],
			privacySettings: user.privacySettings,
			lastLoginAt: user.lastLoginAt,
			createdAt: user.createdAt,
			updatedAt: user.updatedAt
		};
		
		return ApiResponse.success(res, profileData, 'Profile retrieved successfully');
	} catch (e) {
		// eslint-disable-next-line no-console
		console.error('[USER][AUTH] getProfile error', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to get profile');
	}
}

async function updateProfile(req, res) {
	try {
		// eslint-disable-next-line no-console
		console.log('[USER] updateProfile');
		const { fullName, username, email, dob, bio, gender, pronouns, likes, interests, idProofUrl, profilePictureUrl, location } = req.body || {};
		const user = await User.findById(req.user?.userId);
		if (!user) return ApiResponse.notFound(res, 'User not found');
		if (fullName !== undefined) user.fullName = fullName;
		if (username !== undefined) {
			user.username = username;
			user.usernameNorm = normalizeUsername(username);
		}
		if (email !== undefined) user.email = email;
		if (dob !== undefined) user.dob = dob ? new Date(dob) : null;
		if (bio !== undefined) user.bio = bio;
		if (gender !== undefined) user.gender = gender;
		if (pronouns !== undefined) user.pronouns = pronouns;
		if (Array.isArray(likes)) user.likes = likes;
		if (Array.isArray(interests)) user.interests = interests;
		if (idProofUrl !== undefined) user.idProofUrl = idProofUrl;
		if (profilePictureUrl !== undefined) user.profilePictureUrl = profilePictureUrl;
		if (location !== undefined) user.location = location;
		user.isProfileCompleted = true;
		try {
			await user.save();
		} catch (err) {
			if (err && err.code === 11000) {
				return ApiResponse.conflict(res, 'Username is taken', 'USERNAME_TAKEN');
			}
			throw err;
		}
		return ApiResponse.success(res, { isProfileCompleted: user.isProfileCompleted }, 'Profile updated');
	} catch (e) {
		// eslint-disable-next-line no-console
		console.error('[USER] updateProfile error', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to update profile');
	}
}

async function resendPhoneOtp(req, res) {
	try {
		const { phoneNumber } = req.body || {};
		if (!phoneNumber) return ApiResponse.badRequest(res, 'phoneNumber is required');
		const user = await User.findOne({ phoneNumber });
		if (!user) return ApiResponse.notFound(res, 'User not found');
		
		const now = Date.now();
		if (user.lastOtpSentAt && now - user.lastOtpSentAt.getTime() < RESEND_WINDOW_MS) {
			const waitMs = RESEND_WINDOW_MS - (now - user.lastOtpSentAt.getTime());
			return ApiResponse.tooMany(res, `Please wait ${Math.ceil(waitMs / 1000)}s before requesting a new OTP`, 'OTP_RATE_LIMIT');
		}
		
		user.otpCode = HARD_CODED_OTP;
		user.otpExpiresAt = new Date(now + OTP_TTL_MS);
		user.lastOtpSentAt = new Date(now);
		await user.save();
		return ApiResponse.success(res, { maskedPhone: user.maskedPhone(), ttlSeconds: OTP_TTL_MS / 1000 }, 'OTP resent');
	} catch (err) {
		return ApiResponse.serverError(res, 'Failed to resend OTP');
	}
}

async function resendEmailOtp(req, res) {
	try {
		const { email } = req.body || {};
		if (!email) return ApiResponse.badRequest(res, 'email is required');
		const user = await User.findById(req.user?.userId);
		if (!user) return ApiResponse.notFound(res, 'User not found');
		
		const now = Date.now();
		if (user.lastEmailOtpSentAt && now - user.lastEmailOtpSentAt.getTime() < RESEND_WINDOW_MS) {
			const waitMs = RESEND_WINDOW_MS - (now - user.lastEmailOtpSentAt.getTime());
			return ApiResponse.tooMany(res, `Please wait ${Math.ceil(waitMs / 1000)}s before requesting a new OTP`, 'OTP_RATE_LIMIT');
		}
		
		user.emailOtpCode = HARD_CODED_OTP;
		user.emailOtpExpiresAt = new Date(now + OTP_TTL_MS);
		user.lastEmailOtpSentAt = new Date(now);
		await user.save();
		return ApiResponse.success(res, { email: user.email, ttlSeconds: OTP_TTL_MS / 1000 }, 'Email OTP resent');
	} catch (err) {
		return ApiResponse.serverError(res, 'Failed to resend email OTP');
	}
}

module.exports = {
	sendPhoneOtp,
	verifyPhoneOtp,
	resendPhoneOtp,
	sendEmailOtp,
	verifyEmailOtp,
	resendEmailOtp,
	getProfile,
	updateProfile,
};


