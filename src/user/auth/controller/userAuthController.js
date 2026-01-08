const User = require('../model/userAuthModel');
const ApiResponse = require('../../../utils/apiResponse');
const { signAccessToken, signRefreshToken } = require('../../../utils/Jwt');
const { sendEmail, sendVerificationEmail, sendOtpVerificationEmail } = require('../../../services/emailService');
const RefreshToken = require("../../social/userModel/refreshTokenModel");
const DatingInteraction = require('../../dating/models/datingInteractionModel');
const DatingProfileComment = require('../../dating/models/datingProfileCommentModel');
const FollowRequest = require('../../social/userModel/followRequestModel');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const HARD_CODED_OTP = '123456';
const OTP_TTL_MS = 5 * 60 * 1000;
const RESEND_WINDOW_MS = 60 * 1000;
const jwt = require('jsonwebtoken');
// 2Factor API integration
const { 
	twofactorService, 
	normalizePhoneForAPI, 
	isBypassPhone, 
	getBypassSessionId, 
	isBypassOTP,
	BYPASS_PHONES 
} = require('../../../services/twofactor');


async function sendPhoneOtp(req, res) {
	try {
		console.log('[sendPhoneOtp] Starting OTP process', { body: req.body });
		const { phoneNumber, countryCode = '+91' } = req.body || {};
		console.log('[sendPhoneOtp] Extracted inputs', { phoneNumber, countryCode });

		if (!phoneNumber) {
			console.log('[sendPhoneOtp] Missing phoneNumber');
			return ApiResponse.badRequest(res, 'phoneNumber is required');
		}

		let user = await User.findOne({ phoneNumber });
		console.log('[sendPhoneOtp] User lookup result', { userExists: !!user, phoneNumber });

		if (!user) {
			console.log('[sendPhoneOtp] Creating new user', { phoneNumber, countryCode });
			user = await User.create({ phoneNumber, countryCode });
			console.log('[sendPhoneOtp] New user created', { userId: user._id });
		}

		const now = Date.now();
		console.log('[sendPhoneOtp] Current timestamp', { now });

		if (user.lastOtpSentAt && now - user.lastOtpSentAt.getTime() < RESEND_WINDOW_MS) {
			const waitMs = RESEND_WINDOW_MS - (now - user.lastOtpSentAt.getTime());
			const waitSeconds = Math.ceil(waitMs / 1000);
			console.log('[sendPhoneOtp] Rate limit hit', { waitMs, waitSeconds, lastOtpSentAt: user.lastOtpSentAt });
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
		const normalizedMobile = normalizePhoneForAPI(phoneNumber, countryCode);
		console.log('[sendPhoneOtp] Normalized phone', { original: phoneNumber, normalized: normalizedMobile });

		// Check for development bypass
		if (isBypassPhone(normalizedMobile)) {
			console.log('[sendPhoneOtp] 🔓 Development bypass detected:', normalizedMobile);
			user.otpCode = HARD_CODED_OTP;
			user.otpExpiresAt = new Date(now + OTP_TTL_MS);
			user.twoFactorSessionId = getBypassSessionId(phoneNumber);
			user.lastOtpSentAt = new Date(now);
			await user.save();
			return ApiResponse.success(res, { 
				maskedPhone: user.maskedPhone(), 
				ttlSeconds: OTP_TTL_MS / 1000,
				sessionId: user.twoFactorSessionId 
			}, 'OTP sent (bypass mode)');
		}

		// Call 2Factor API
		console.log('[sendPhoneOtp] 📱 Calling 2Factor API for:', normalizedMobile);
		const otpResult = await twofactorService.sendOTP(normalizedMobile);
		
		if (otpResult.success) {
			// Store session ID instead of OTP code
			user.twoFactorSessionId = otpResult.data.sessionId;
			user.lastOtpSentAt = new Date(now);
			// Keep old fields for backward compatibility during migration
			user.otpCode = null; // Clear old OTP
			user.otpExpiresAt = null;
			
			await user.save();
			console.log('[sendPhoneOtp] ✅ OTP sent via 2Factor API, session ID stored');
			
			return ApiResponse.success(res, { 
				maskedPhone: user.maskedPhone(), 
				ttlSeconds: OTP_TTL_MS / 1000,
				sessionId: user.twoFactorSessionId 
			}, 'OTP sent');
		} else {
			console.error('[sendPhoneOtp] ❌ 2Factor API error:', otpResult.data);
			return ApiResponse.serverError(res, otpResult.data.message || 'Failed to send OTP');
		}
	} catch (e) {
		console.error('[sendPhoneOtp] Error occurred', { error: e?.message || e, stack: e?.stack });
		return ApiResponse.serverError(res, 'Failed to send OTP');
	}
}
async function verifyPhoneOtp(req, res) {
	try {
		const { phoneNumber, otp } = req.body || {};
		if (!phoneNumber || !otp) return ApiResponse.badRequest(res, 'phoneNumber and otp are required');
		
		const user = await User.findOne({ phoneNumber });
		if (!user) return ApiResponse.unauthorized(res, 'User not found');
		
		// Normalize phone number
		const normalizedMobile = normalizePhoneForAPI(phoneNumber, user.countryCode || '+91');
		
		// Check for development bypass
		if (isBypassPhone(normalizedMobile) && isBypassOTP(otp)) {
			console.log('[verifyPhoneOtp] 🔓 Development bypass verification:', normalizedMobile);
			
			// Clear OTP fields
			user.otpCode = null;
			user.otpExpiresAt = null;
			user.twoFactorSessionId = null;
			user.lastLoginAt = new Date();
			await user.save();
			
			// Generate tokens
			const payload = { userId: String(user._id), role: 'user' };
			const accessToken = signAccessToken(payload);
			const refreshToken = signRefreshToken(payload);
			
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

			await RefreshToken.create({
				userId: user._id,
				token: refreshToken,
				issuedAt: new Date(),
				expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
				isValid: true,
				ipAddress: req.ip
			});

			res.cookie('jwt', refreshToken, {
				httpOnly: true,
				sameSite: 'Lax',
				secure: true,
				maxAge: 24 * 60 * 60 * 1000
			});

			return ApiResponse.success(res, { accessToken, refreshToken, user: userData, isProfileCompleted: !!user.isProfileCompleted }, 'OTP verified (bypass mode)');
		}
		
		// Check if OTP was requested (either old method or new method)
		const hasOldOtp = user.otpCode && user.otpExpiresAt;
		const hasNewSession = user.twoFactorSessionId;
		
		if (!hasOldOtp && !hasNewSession) {
			return ApiResponse.unauthorized(res, 'OTP not requested');
		}
		
		// Handle old OTP method (backward compatibility)
		if (hasOldOtp && !hasNewSession) {
			console.log('[verifyPhoneOtp] Using legacy OTP verification');
			if (user.otpCode !== otp) return ApiResponse.unauthorized(res, 'Invalid OTP');
			if (Date.now() > user.otpExpiresAt.getTime()) return ApiResponse.unauthorized(res, 'OTP expired');
			
			user.otpCode = null;
			user.otpExpiresAt = null;
			user.lastLoginAt = new Date();
			await user.save();
			
			const payload = { userId: String(user._id), role: 'user' };
			const accessToken = signAccessToken(payload);
			const refreshToken = signRefreshToken(payload);
			
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

			await RefreshToken.create({
				userId: user._id,
				token: refreshToken,
				issuedAt: new Date(),
				expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
				isValid: true,
				ipAddress: req.ip
			});

			res.cookie('jwt', refreshToken, {
				httpOnly: true,
				sameSite: 'Lax',
				secure: true,
				maxAge: 24 * 60 * 60 * 1000
			});

			return ApiResponse.success(res, { accessToken, refreshToken, user: userData, isProfileCompleted: !!user.isProfileCompleted }, 'OTP verified');
		}
		
		// Use 2Factor API verification
		if (!user.twoFactorSessionId) {
			return ApiResponse.unauthorized(res, 'Session expired. Please request a new OTP.');
		}
		
		console.log('[verifyPhoneOtp] 📱 Verifying OTP via 2Factor API');
		const verifyResult = await twofactorService.verifyOTP(normalizedMobile, otp, user.twoFactorSessionId);
		
		if (!verifyResult.success) {
			console.error('[verifyPhoneOtp] ❌ 2Factor verification failed:', verifyResult.data);
			
			// Handle specific error types
			const errorType = verifyResult.data.error;
			if (errorType === 'INVALID_OTP') {
				return ApiResponse.unauthorized(res, verifyResult.data.message || 'Invalid OTP', 'INVALID_OTP');
			} else if (errorType === 'OTP_EXPIRED') {
				return ApiResponse.unauthorized(res, verifyResult.data.message || 'OTP expired', 'OTP_EXPIRED');
			} else if (errorType === 'SESSION_EXPIRED') {
				// Clear session ID on session expiry
				user.twoFactorSessionId = null;
				await user.save();
				return ApiResponse.unauthorized(res, verifyResult.data.message || 'Session expired', 'SESSION_EXPIRED');
			}
			
			return ApiResponse.unauthorized(res, verifyResult.data.message || 'OTP verification failed');
		}
		
		// OTP verified successfully
		console.log('[verifyPhoneOtp] ✅ OTP verified via 2Factor API');
		user.twoFactorSessionId = null;
		user.otpCode = null;
		user.otpExpiresAt = null;
		user.lastLoginAt = new Date();
		await user.save();
		
		const payload = { userId: String(user._id), role: 'user' };
		const accessToken = signAccessToken(payload);
		const refreshToken = signRefreshToken(payload);
		
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

		await RefreshToken.create({
			userId: user._id,
			token: refreshToken,
			issuedAt: new Date(),
			expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
			isValid: true,
			ipAddress: req.ip
		});

		res.cookie('jwt', refreshToken, {
			httpOnly: true,
			sameSite: 'Lax',
			secure: true,
			maxAge: 24 * 60 * 60 * 1000
		});

		return ApiResponse.success(res, { accessToken, refreshToken, user: userData, isProfileCompleted: !!user.isProfileCompleted }, 'OTP verified');
	} catch (e) {
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
			// Use the OTP verification email template
			await sendOtpVerificationEmail({
				to: email,
				username: user.fullName || user.username || 'User',
				otp: HARD_CODED_OTP
			});
			console.log('[USER][AUTH] Email sent successfully to:', email);
		} catch (e) {
			console.error('[USER][AUTH] Email sending failed:', e?.message || e);
			// Don't fail the request if email sending fails, just log it
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

async function getMe(req, res) {
	try {
		console.log('[USER][AUTH][GET_ME] Request received');
		console.log('[USER][AUTH][GET_ME] User ID:', req.user?.userId);
		
		const user = await User.findById(req.user?.userId).select('-otpCode -otpExpiresAt -emailOtpCode -emailOtpExpiresAt');
		if (!user) {
			console.log('[USER][AUTH][GET_ME] ❌ User not found');
			return ApiResponse.notFound(res, 'User not found');
		}

		console.log('[USER][AUTH][GET_ME] ✅ User found:', { userId: user._id, username: user.username });
		console.log('[USER][AUTH][GET_ME] Fetching dating statistics...');

		// Get dating statistics
		const [datingLikesReceived, datingCommentsReceived] = await Promise.all([
			DatingInteraction.countDocuments({
				targetUser: req.user.userId,
				action: 'like'
			}),
			DatingProfileComment.countDocuments({
				targetUser: req.user.userId,
				isDeleted: false
			})
		]);
		
		console.log('[USER][AUTH][GET_ME] Dating stats:', { likesReceived: datingLikesReceived, commentsReceived: datingCommentsReceived });

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
			preferences: user.preferences || {
				hereFor: '',
				primaryLanguage: '',
				secondaryLanguage: ''
			},
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
			updatedAt: user.updatedAt,
			// Dating data added
			dating: {
				photos: user.dating?.photos || [],
				videos: user.dating?.videos || [],
				isDatingProfileActive: user.dating?.isDatingProfileActive || false,
				likesReceived: datingLikesReceived,
				commentsReceived: datingCommentsReceived
			}
		};

		console.log('[USER][AUTH][GET_ME] ✅ Profile data prepared:', {
			hasDatingData: !!profileData.dating,
			datingPhotosCount: profileData.dating?.photos?.length || 0,
			datingVideosCount: profileData.dating?.videos?.length || 0,
			isDatingProfileActive: profileData.dating?.isDatingProfileActive,
		});
		
		// Return in format expected by frontend: { success: true, data: { user: profileData } }
		console.log('[USER][AUTH][GET_ME] 📤 Sending response to frontend');
		return ApiResponse.success(res, { user: profileData }, 'User data retrieved successfully');
	} catch (e) {
		console.error('[USER][AUTH][GET_ME] ❌ Error:', e?.message || e);
		console.error('[USER][AUTH][GET_ME] Stack:', e?.stack);
		return ApiResponse.serverError(res, 'Failed to get user data');
	}
}

async function getProfile(req, res) {
	try {
		// eslint-disable-next-line no-console
		console.log('[USER][AUTH] getProfile');
		const user = await User.findById(req.user?.userId).select('-otpCode -otpExpiresAt -emailOtpCode -emailOtpExpiresAt');
		if (!user) return ApiResponse.notFound(res, 'User not found');

		// Get dating statistics
		const [datingLikesReceived, datingCommentsReceived] = await Promise.all([
			DatingInteraction.countDocuments({
				targetUser: req.user.userId,
				action: 'like'
			}),
			DatingProfileComment.countDocuments({
				targetUser: req.user.userId,
				isDeleted: false
			})
		]);

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
		preferences: user.preferences || {
			hereFor: '',
			primaryLanguage: '',
			secondaryLanguage: ''
		},
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
		updatedAt: user.updatedAt,
		// Dating data added
		dating: {
			photos: user.dating?.photos || [],
			videos: user.dating?.videos || [],
			isDatingProfileActive: user.dating?.isDatingProfileActive || false,
			likesReceived: datingLikesReceived,
			commentsReceived: datingCommentsReceived
		}
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
	const { fullName, username, email, dob, bio, gender, pronouns, likes, interests, preferences, idProofUrl, profilePictureUrl, location, step } = req.body || {};
	const user = await User.findById(req.user?.userId);
	if (!user) return ApiResponse.notFound(res, 'User not found');

	// Update fields based on what's provided
	if (fullName !== undefined) user.fullName = fullName;
	if (username !== undefined) {
		user.username = username;
		user.usernameNorm = normalizeUsername(username);
	}
	if (email !== undefined && user.emailVerified == false) user.email = email;
	if (dob !== undefined) {
		if (dob) {
			const birthDate = new Date(dob);
			const today = new Date();

			// Calculate age
			let age = today.getFullYear() - birthDate.getFullYear();
			const monthDiff = today.getMonth() - birthDate.getMonth();

			// Adjust age if birthday hasn't occurred yet this year
			if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
				age--;
			}

			// Check if user is at least 18 years old
			if (age < 18) {
				console.log('[USER] updateProfile - Age validation failed:', age);
				return ApiResponse.badRequest(res, 'You must be at least 18 years old to use this platform');
			}

			user.dob = birthDate;
		} else {
			user.dob = null;
		}
	}
	if (bio !== undefined) user.bio = bio;
	if (gender !== undefined) user.gender = gender;
	if (pronouns !== undefined) user.pronouns = pronouns;
	if (Array.isArray(likes)) user.likes = likes;
	if (Array.isArray(interests)) user.interests = interests;
	if (preferences !== undefined) {
		if (!user.preferences) user.preferences = {};
		if (preferences.hereFor !== undefined) user.preferences.hereFor = preferences.hereFor;
		if (preferences.primaryLanguage !== undefined) user.preferences.primaryLanguage = preferences.primaryLanguage;
		if (preferences.secondaryLanguage !== undefined) user.preferences.secondaryLanguage = preferences.secondaryLanguage;
	}
	if (idProofUrl !== undefined) user.idProofUrl = idProofUrl;
	if (profilePictureUrl !== undefined) user.profilePictureUrl = profilePictureUrl;
	if (location !== undefined) user.location = location;

		// Update profile completion step
		let nextStep;
		if (user.isProfileCompleted == false) {


			if (step) {
				user.profileCompletionStep = step;
			}

			// Update profile step and check completion
			nextStep = user.updateProfileStep();


		}
		try {
			await user.save();
		} catch (err) {
			if (err && err.code === 11000) {
				return ApiResponse.conflict(res, 'Username is taken', 'USERNAME_TAKEN');
			}
			throw err;
		}

		return ApiResponse.success(res, {
			isProfileCompleted: user.isProfileCompleted,
			profileCompletionStep: user.profileCompletionStep,
			nextStep: nextStep
		}, 'Profile updated');
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
		const normalizedMobile = normalizePhoneForAPI(phoneNumber, user.countryCode || '+91');
		
		// Check for development bypass
		if (isBypassPhone(normalizedMobile)) {
			console.log('[resendPhoneOtp] 🔓 Development bypass detected:', normalizedMobile);
			user.otpCode = HARD_CODED_OTP;
			user.otpExpiresAt = new Date(now + OTP_TTL_MS);
			user.twoFactorSessionId = getBypassSessionId(phoneNumber);
			user.lastOtpSentAt = new Date(now);
			await user.save();
			return ApiResponse.success(res, { 
				maskedPhone: user.maskedPhone(), 
				ttlSeconds: OTP_TTL_MS / 1000,
				sessionId: user.twoFactorSessionId 
			}, 'OTP resent (bypass mode)');
		}

		// Call 2Factor API to resend OTP
		console.log('[resendPhoneOtp] 📱 Resending OTP via 2Factor API');
		const otpResult = await twofactorService.resendOTP(normalizedMobile);
		
		if (otpResult.success) {
			user.twoFactorSessionId = otpResult.data.sessionId;
			user.lastOtpSentAt = new Date(now);
			user.otpCode = null; // Clear old OTP
			user.otpExpiresAt = null;
			await user.save();
			console.log('[resendPhoneOtp] ✅ OTP resent via 2Factor API');
			return ApiResponse.success(res, { 
				maskedPhone: user.maskedPhone(), 
				ttlSeconds: OTP_TTL_MS / 1000,
				sessionId: user.twoFactorSessionId 
			}, 'OTP resent');
		} else {
			console.error('[resendPhoneOtp] ❌ 2Factor API error:', otpResult.data);
			return ApiResponse.serverError(res, otpResult.data.message || 'Failed to resend OTP');
		}
	} catch (err) {
		console.error('[resendPhoneOtp] Error:', err?.message || err);
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

		// Send the email
		try {
			await sendOtpVerificationEmail({
				to: email,
				username: user.fullName || user.username || 'User',
				otp: HARD_CODED_OTP
			});
			console.log('[USER][AUTH] Resend email sent successfully to:', email);
		} catch (e) {
			console.error('[USER][AUTH] Resend email sending failed:', e?.message || e);
			// Don't fail the request if email sending fails, just log it
		}

		return ApiResponse.success(res, { email: user.email, ttlSeconds: OTP_TTL_MS / 1000 }, 'Email OTP resent');
	} catch (err) {
		return ApiResponse.serverError(res, 'Failed to resend email OTP');
	}
}

async function getProfileStep(req, res) {
	try {
		console.log('[DEBUG] Entering getProfileStep for user ID:', req.user?.userId);
		
		const user = await User.findById(req.user?.userId);
		console.log('[DEBUG] User fetched:', user ? user._id : 'null');
		
		if (!user) {
			console.warn('[DEBUG] User not found for ID:', req.user?.userId);
			return ApiResponse.notFound(res, 'User not found');
		}

		const currentStep = user.profileCompletionStep;
		console.log('[DEBUG] Current step:', currentStep);
		
		const nextStep = user.getNextProfileStep();
		console.log('[DEBUG] Next step:', nextStep);
		
		const isCurrentStepCompleted = user.isStepCompleted(currentStep);
		console.log('[DEBUG] Is current step completed:', isCurrentStepCompleted);
		
		const steps = ['basic_info', 'gender', 'pronouns', 'likes_interests', 'preferences', 'location', 'completed'];
		const currentStepIndex = steps.indexOf(currentStep);
		console.log('[DEBUG] Current step index:', currentStepIndex);
		
		const stepProgress = currentStepIndex;
		console.log('[DEBUG] Step progress:', stepProgress + '%');

		console.log('[DEBUG] Preparing success response');
		return ApiResponse.success(res, {
			currentStep,
			nextStep,
			isCurrentStepCompleted,
			isProfileCompleted: user.isProfileCompleted,
			stepProgress: stepProgress
		}, 'Profile step retrieved');
	} catch (e) {
		console.error('[USER] getProfileStep error', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to get profile step');
	}
}

async function getEmailVerificationStatus(req, res) {
	try {
		const user = await User.findById(req.user?.userId);
		if (!user) return ApiResponse.notFound(res, 'User not found');

		return ApiResponse.success(res, {
			email: user.email,
			emailVerified: user.emailVerified,
			hasPendingOtp: !!(user.emailOtpCode && user.emailOtpExpiresAt && Date.now() < user.emailOtpExpiresAt.getTime()),
			otpExpiresAt: user.emailOtpExpiresAt
		}, 'Email verification status retrieved');
	} catch (e) {
		// eslint-disable-next-line no-console
		console.error('[USER][AUTH] getEmailVerificationStatus error', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to get email verification status');
	}
}

async function getUserProfile(req, res) {
	try {
		console.log('[USER][AUTH] getUserProfile');
		const { userId } = req.params;
		const currentUserId = req.user?.userId;

		if (!userId) {
			return ApiResponse.badRequest(res, 'User ID is required');
		}

		// Fetch the target user
		const user = await User.findById(userId)
			.select('-otpCode -otpExpiresAt -emailOtpCode -emailOtpExpiresAt -lastOtpSentAt -lastEmailOtpSentAt -phoneNumber');

		if (!user) {
			return ApiResponse.notFound(res, 'User not found');
		}

		// Check if user is inactive
		if (!user.isActive) {
			return ApiResponse.notFound(res, 'User not found');
		}

		// Fetch current user to check relationships
		const currentUser = await User.findById(currentUserId).select('following followers blockedUsers blockedBy');
		if (!currentUser) {
			return ApiResponse.unauthorized(res, 'Current user not found');
		}

		// Calculate relationship flags
		const isFollowing = currentUser.following.some(f => f.toString() === userId);
		const isFollower = currentUser.followers.some(f => f.toString() === userId);
		const isBlocked = currentUser.blockedUsers.some(b => b.toString() === userId);
		const hasBlockedYou = user.blockedUsers.some(b => b.toString() === currentUserId);
		
		// Check for pending follow request (only if not already following)
		let followRequestStatus = 'none';
		if (!isFollowing && currentUserId !== userId) {
			const followRequest = await FollowRequest.findOne({
				requester: currentUserId,
				recipient: userId,
				status: 'pending'
			});
			
			if (followRequest) {
				followRequestStatus = 'pending';
			} else {
				// Check for accepted/rejected requests
				const anyRequest = await FollowRequest.findOne({
					requester: currentUserId,
					recipient: userId
				}).sort({ createdAt: -1 });
				
				if (anyRequest) {
					if (anyRequest.status === 'accepted' || anyRequest.status === 'accept') {
						followRequestStatus = 'accepted';
					} else if (anyRequest.status === 'rejected') {
						followRequestStatus = 'rejected';
					}
				}
			}
		} else if (isFollowing) {
			followRequestStatus = 'accepted';
		}

		// Calculate mutual followers
		const mutualFollowers = user.followers.filter(f => 
			currentUser.following.some(cf => cf.toString() === f.toString())
		).length;

		// Filter out blocked users from followers/following counts (if viewing another user's profile)
		let followersCount = user.followers?.length || 0;
		let followingCount = user.following?.length || 0;
		
		if (currentUserId && currentUserId !== userId) {
			// Get current user's blocked users list (same logic as getFollowers/getFollowing)
			const blockedUserIds = [
				...(currentUser.blockedUsers || []).map(id => id.toString()),
				...(currentUser.blockedBy || []).map(id => id.toString())
			];
			
			// Filter followers count - exclude users that current user has blocked or who have blocked current user
			if (blockedUserIds.length > 0) {
				followersCount = user.followers?.filter(f => {
					const followerId = f.toString();
					return !blockedUserIds.includes(followerId);
				}).length || 0;
			}
			
			// Filter following count - exclude users that current user has blocked or who have blocked current user
			if (blockedUserIds.length > 0) {
				followingCount = user.following?.filter(f => {
					const followingId = f.toString();
					return !blockedUserIds.includes(followingId);
				}).length || 0;
			}
		}

	// Get dating statistics for other user
	const [datingCommentsReceived, datingLikesReceived, currentUserInteraction, reciprocalInteraction, targetUserDislikedMe] = await Promise.all([
		DatingProfileComment.countDocuments({
			targetUser: userId,
			isDeleted: false
		}),
		DatingInteraction.countDocuments({
			targetUser: userId,
			action: 'like'
		}),
		// Check if current user has liked/disliked this profile (only if viewing another user's profile)
		currentUserId && currentUserId !== userId ? DatingInteraction.findOne({
			user: currentUserId,
			targetUser: userId
		}) : Promise.resolve(null),
		// Check if target user has liked current user (for isMatch flag)
		currentUserId && currentUserId !== userId ? DatingInteraction.findOne({
			user: userId,
			targetUser: currentUserId,
			action: 'like'
		}).lean() : Promise.resolve(null),
		// Check if target user has disliked current user (for disliked flag)
		currentUserId && currentUserId !== userId ? DatingInteraction.findOne({
			user: userId,
			targetUser: currentUserId,
			action: 'dislike'
		}).lean() : Promise.resolve(null)
	]);

	// Set liked/disliked flags based on interaction
	let liked = false;
	let disliked = false;
	let isMatch = false;
	let isLiked = false; // Whether current user has liked this profile
	let dislikedByOther = false; // Whether the other user has disliked current user's profile
	
	if (currentUserInteraction) {
		if (currentUserInteraction.action === 'like') {
			liked = true;
			isLiked = true;
			// Check if it's a match (both users have liked each other)
			if (reciprocalInteraction && reciprocalInteraction.action === 'like') {
				isMatch = true;
			}
		} else if (currentUserInteraction.action === 'dislike') {
			disliked = true;
		}
	}
	
	// Check if target user has disliked current user
	if (targetUserDislikedMe && targetUserDislikedMe.action === 'dislike') {
		dislikedByOther = true;
	}

	// Calculate distance between current user and target user
	let distance = null;
	let distanceAway = null;
	if (currentUser.location?.lat && currentUser.location?.lng) {
		let targetLat = user.location?.lat;
		let targetLng = user.location?.lng;

		// Check dating preferences location if main location not available
		if (!targetLat && user.dating?.preferences?.location?.coordinates?.lat) {
			targetLat = user.dating.preferences.location.coordinates.lat;
			targetLng = user.dating.preferences.location.coordinates.lng;
		}

		if (targetLat && targetLng) {
			// Haversine formula for distance calculation
			const toRadians = (deg) => deg * (Math.PI / 180);
			const R = 6371; // Earth's radius in km
			const dLat = toRadians(targetLat - currentUser.location.lat);
			const dLon = toRadians(targetLng - currentUser.location.lng);
			const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
					  Math.cos(toRadians(currentUser.location.lat)) * 
					  Math.cos(toRadians(targetLat)) *
					  Math.sin(dLon / 2) * Math.sin(dLon / 2);
			const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
			distance = R * c;

			// Format distance
			if (distance >= 1) {
				distanceAway = `${Math.round(distance * 10) / 10} km away`;
			} else {
				const distanceMeters = Math.round(distance * 1000);
				distanceAway = `${distanceMeters} m away`;
			}
		}
	}

	// Full profile data (visible to everyone)
	const profileData = {
		id: user._id,
		username: user.username,
		fullName: user.fullName,
		profilePictureUrl: user.profilePictureUrl,
		bio: user.bio,
		gender: user.gender,
		pronouns: user.pronouns,
		likes: user.likes || [],
		interests: user.interests || [],
		preferences: {
			hereFor: user.preferences?.hereFor || '',
			primaryLanguage: user.preferences?.primaryLanguage || '',
			secondaryLanguage: user.preferences?.secondaryLanguage || ''
		},
		location: user.location ? {
			city: user.location.city,
			country: user.location.country,
			lat: user.location.lat,
			lng: user.location.lng,
			distance: distance,
			distanceAway: distanceAway
		} : null,
		isVerified: user.verificationStatus === 'approved',
		isPrivate: user.privacySettings?.isPrivate || false,
		privacySettings: user.privacySettings || {
			isPrivate: false,
			allowFollowRequests: true,
			showOnlineStatus: true,
			allowMessages: 'followers',
			allowCommenting: true,
			allowTagging: true,
			allowStoriesSharing: true
		},
		followersCount: followersCount,
		followingCount: followingCount,
		createdAt: user.createdAt,
		// Relationship flags
		isFollowing: isFollowing,
		isFollower: isFollower,
		isBlocked: isBlocked,
		hasBlockedYou: hasBlockedYou,
		mutualFollowers: mutualFollowers,
		followStatus: followRequestStatus, // 'none', 'pending', 'accepted', 'rejected'
		followRequestStatus: followRequestStatus, // Alias for compatibility
		// Dating data added (only show if dating profile is active)
		dating: user.dating?.isDatingProfileActive ? {
			photos: user.dating?.photos || [],
			videos: user.dating?.videos || [],
			isDatingProfileActive: true,
			likesReceived: datingLikesReceived,
			commentsReceived: datingCommentsReceived
		} : {
			photos: [],
			videos: [],
			isDatingProfileActive: false,
			likesReceived: 0,
			commentsReceived: 0
		},
		// Dating interaction flags (only for other users, not own profile)
		liked: currentUserId && currentUserId !== userId ? liked : false,
		disliked: currentUserId && currentUserId !== userId ? disliked : false,
		isMatch: currentUserId && currentUserId !== userId ? isMatch : false,
		isLiked: currentUserId && currentUserId !== userId ? isLiked : false, // Whether current user has liked this profile
		dislikedByOther: currentUserId && currentUserId !== userId ? dislikedByOther : false // Whether the other user has disliked current user's profile
	};

	console.log('[USER][AUTH] Profile returned for user:', userId);
	return ApiResponse.success(res, profileData, 'User profile retrieved');

	} catch (e) {
		console.error('[USER][AUTH] getUserProfile error', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to get user profile');
	}
}


async function refreshToken(req, res) {
	try {
	  console.log('Starting refreshToken function', { timestamp: new Date().toISOString() });
	  
	  const refreshToken = req.cookies?.jwt;
	  console.log('Extracted refresh token from cookies:', { refreshToken });
  
	  const deviceInfo = req.headers['user-agent']; // Fixed typo: 'user-agaent' → 'user-agent'
	  console.log('Device info from headers:', { deviceInfo });
  
	  if (!refreshToken) {
		console.log('No refresh token found in request cookies');
		return ApiResponse.unauthorized(res, 'Unauthorized: No refresh token');
	  }
  
	  const tokenRecord = await RefreshToken.findOne({ token: refreshToken, isValid: true });
	  console.log('Token record from database:', { tokenRecord });
  
	  if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
		console.log('Invalid or expired token:', { tokenRecord, currentTime: new Date() });
		return ApiResponse.unauthorized(res, 'Unauthorized: Invalid or expired refresh token');
	  }
  
	  // Verify JWT and handle the result
	  console.log('Verifying refresh token with JWT');
	  jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, async (err, decoded) => {
		if (err) {
		  console.log('JWT verification failed:', { error: err.message });
		  return ApiResponse.unauthorized(res, 'Unauthorized: Invalid refresh token');
		}
		console.log('JWT verification successful, decoded payload:', { decoded });
  
		// Note: 'user' is undefined in the original code; assuming tokenRecord contains user info
		const user = tokenRecord.userId; // Adjust based on your schema
		console.log('User data for token generation:', { userId: user?._id, role: 'user' });
  
		const payload = { userId: String(user._id), role: 'user' };
		const accessToken = jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1d' });
		console.log('Generated new access token:', { accessToken });
  
		const newRefreshToken = jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '1d' }); // Fixed: Used JWT_REFRESH_SECRET
		console.log('Generated new refresh token:', { newRefreshToken });
  
		// Update or insert new refresh token in the database
		console.log('Updating refresh token in database:', { newRefreshToken });
		await RefreshToken.updateOne(
		  { token: refreshToken }, // Changed to update existing token
		  {
			token: newRefreshToken,
			issuedAt: new Date(),
			expiresAt: new Date(Date.now() + (24 * 60 * 60 * 1000)), // Fixed: 1 day instead of 30s
			isValid: true,
			ipAddress: req.ip,
			deviceInfo, // Added deviceInfo for better tracking
		  },
		  { upsert: true } // Added upsert to handle new token creation if needed
		);
		console.log('Refresh token updated in database');
  
		// Set new refresh token in cookies
		console.log('Setting new refresh token in cookies');
		res.cookie('jwt', newRefreshToken, {
		  httpOnly: true,
		  sameSite: 'Lax',
		  secure: true,
		  maxAge: 24 * 60 * 60 * 1000,
		});
  
		console.log('Sending success response with access token');
		return ApiResponse.success(res, { accessToken });
	  });
	} catch (error) {
	  console.error('Error in refreshToken function:', { error: error.message, stack: error.stack });
	  return ApiResponse.serverError(res, 'Server error');
	}
  }

// Get Privacy Settings
async function getPrivacySettings(req, res) {
	try {
		console.log('[USER][AUTH] getPrivacySettings');
		const userId = req.user?.userId;

		const user = await User.findById(userId).select('privacySettings');
		if (!user) {
			return ApiResponse.notFound(res, 'User not found');
		}

		const privacySettings = {
			isPrivate: user.privacySettings?.isPrivate || false,
			allowFollowRequests: user.privacySettings?.allowFollowRequests !== undefined ? user.privacySettings.allowFollowRequests : true,
			showOnlineStatus: user.privacySettings?.showOnlineStatus !== undefined ? user.privacySettings.showOnlineStatus : true,
			allowMessages: user.privacySettings?.allowMessages || 'followers',
			allowCommenting: user.privacySettings?.allowCommenting !== undefined ? user.privacySettings.allowCommenting : true,
			allowTagging: user.privacySettings?.allowTagging !== undefined ? user.privacySettings.allowTagging : true,
			allowStoriesSharing: user.privacySettings?.allowStoriesSharing !== undefined ? user.privacySettings.allowStoriesSharing : true
		};

		console.log('[USER][AUTH] Privacy settings retrieved successfully');
		return ApiResponse.success(res, privacySettings, 'Privacy settings retrieved successfully');
	} catch (e) {
		console.error('[USER][AUTH] getPrivacySettings error', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to get privacy settings');
	}
}

// Update Privacy Settings
async function updatePrivacySettings(req, res) {
	try {
		console.log('[USER][AUTH] updatePrivacySettings');
		const userId = req.user?.userId;
		const { 
			isPrivate, 
			allowFollowRequests, 
			showOnlineStatus, 
			allowMessages,
			allowCommenting,
			allowTagging,
			allowStoriesSharing
		} = req.body || {};

		const user = await User.findById(userId);
		if (!user) {
			return ApiResponse.notFound(res, 'User not found');
		}

		// Initialize privacySettings if it doesn't exist
		if (!user.privacySettings) {
			user.privacySettings = {};
		}

		// Update only provided fields
		if (isPrivate !== undefined) {
			user.privacySettings.isPrivate = isPrivate;
		}
		if (allowFollowRequests !== undefined) {
			user.privacySettings.allowFollowRequests = allowFollowRequests;
		}
		if (showOnlineStatus !== undefined) {
			user.privacySettings.showOnlineStatus = showOnlineStatus;
		}
		if (allowMessages !== undefined) {
			// Validate allowMessages value
			if (!['everyone', 'followers', 'none'].includes(allowMessages)) {
				return ApiResponse.badRequest(res, 'allowMessages must be one of: everyone, followers, none');
			}
			user.privacySettings.allowMessages = allowMessages;
		}
		if (allowCommenting !== undefined) {
			user.privacySettings.allowCommenting = allowCommenting;
		}
		if (allowTagging !== undefined) {
			user.privacySettings.allowTagging = allowTagging;
		}
		if (allowStoriesSharing !== undefined) {
			user.privacySettings.allowStoriesSharing = allowStoriesSharing;
		}

		await user.save();

		const updatedSettings = {
			isPrivate: user.privacySettings.isPrivate,
			allowFollowRequests: user.privacySettings.allowFollowRequests,
			showOnlineStatus: user.privacySettings.showOnlineStatus,
			allowMessages: user.privacySettings.allowMessages,
			allowCommenting: user.privacySettings.allowCommenting,
			allowTagging: user.privacySettings.allowTagging,
			allowStoriesSharing: user.privacySettings.allowStoriesSharing
		};

		console.log('[USER][AUTH] Privacy settings updated successfully');
		return ApiResponse.success(res, updatedSettings, 'Privacy settings updated successfully');
	} catch (e) {
		console.error('[USER][AUTH] updatePrivacySettings error', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to update privacy settings');
	}
}

module.exports = {
	sendPhoneOtp,
	verifyPhoneOtp,
	resendPhoneOtp,
	sendEmailOtp,
	verifyEmailOtp,
	resendEmailOtp,
	getMe,
	getProfile,
	getUserProfile,
	updateProfile,
	getProfileStep,
	getEmailVerificationStatus,
	refreshToken,
	getPrivacySettings,
	updatePrivacySettings
};


