const SubAdmin = require('../subAdminModel/subAdminAuthModel');
const ApiResponse = require('../../utils/apiResponse');
const { signAccessToken, signRefreshToken } = require('../../utils/Jwt');
const { uploadSingle } = require('../../middleware/uploadMiddleware');
const { uploadBuffer } = require('../../services/s3Service');

const HARD_CODED_OTP = '123456';
const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_RESEND_WINDOW_MS = 60 * 1000;

async function sendOtp(req, res) {
	try {
		const { phoneNumber, countryCode = '+91' } = req.body || {};
		if (!phoneNumber) return ApiResponse.badRequest(res, 'phoneNumber is required');
		let sub = await SubAdmin.findOne({ phoneNumber });
		if (!sub) sub = await SubAdmin.create({ phoneNumber, countryCode });
		const now = Date.now();
		if (sub.lastOtpSentAt && now - sub.lastOtpSentAt.getTime() < OTP_RESEND_WINDOW_MS) {
			const waitMs = OTP_RESEND_WINDOW_MS - (now - sub.lastOtpSentAt.getTime());
			return ApiResponse.tooMany(res, `Please wait ${Math.ceil(waitMs / 1000)}s before requesting a new OTP`, 'OTP_RATE_LIMIT');
		}
		sub.otpCode = HARD_CODED_OTP;
		sub.otpExpiresAt = new Date(now + OTP_TTL_MS);
		sub.lastOtpSentAt = new Date(now);
		await sub.save();
		return ApiResponse.success(res, { maskedPhone: sub.maskedPhone(), ttlSeconds: OTP_TTL_MS / 1000 }, 'OTP sent');
	} catch (err) {
		return ApiResponse.serverError(res, 'Failed to send OTP');
	}
}

async function verifyOtp(req, res) {
	try {
		const { phoneNumber, otp } = req.body || {};
		if (!phoneNumber || !otp) return ApiResponse.badRequest(res, 'phoneNumber and otp are required');
		const sub = await SubAdmin.findOne({ phoneNumber });
		if (!sub || !sub.otpCode || !sub.otpExpiresAt) return ApiResponse.unauthorized(res, 'OTP not requested');
		if (sub.otpCode !== otp) return ApiResponse.unauthorized(res, 'Invalid OTP');
		if (Date.now() > sub.otpExpiresAt.getTime()) return ApiResponse.unauthorized(res, 'OTP expired');
		sub.isVerified = true;
		sub.otpCode = null;
		sub.otpExpiresAt = null;
		sub.lastLoginAt = new Date();
		await sub.save();
		const payload = { userId: String(sub._id), role: 'subadmin' };
		const accessToken = signAccessToken(payload);
		const refreshToken = signRefreshToken(payload);
		return ApiResponse.success(res, { accessToken, refreshToken, isProfileCompleted: !!sub.isProfileCompleted }, 'OTP verified');
	} catch (err) {
		return ApiResponse.serverError(res, 'Failed to verify OTP');
	}
}

async function updateProfile(req, res) {
	try {
		// eslint-disable-next-line no-console
		console.log('[SUBADMIN] updateProfile request received');
		
		const { name, email } = req.body || {};
		const sub = await SubAdmin.findById(req.user?.userId);
		if (!sub) return ApiResponse.notFound(res, 'Subadmin not found');

		// Handle image upload if present
		let avatarUrl = sub.avatarUrl; // Keep existing if no new upload
		if (req.file) {
			// eslint-disable-next-line no-console
			console.log('[SUBADMIN] Uploading image to S3');
			const uploadResult = await uploadBuffer({
				buffer: req.file.buffer,
				contentType: req.file.mimetype,
				userId: String(sub._id),
				category: 'profile',
				type: 'images',
				filename: req.file.originalname,
				acl: 'public-read',
			});
			avatarUrl = uploadResult.url;
			// eslint-disable-next-line no-console
			console.log('[SUBADMIN] Image uploaded to S3:', avatarUrl);
		}

		// Update profile fields
		if (name !== undefined) sub.name = name;
		if (email !== undefined) sub.email = email;
		sub.avatarUrl = avatarUrl;
		sub.isProfileCompleted = true;
		
		// Only set approval status to pending if it's the first profile completion
		// This allows existing SubAdmins to update their profiles without affecting approval status
		if (!sub.approvalStatus || sub.approvalStatus === 'none') {
			sub.approvalStatus = 'pending';
			sub.isActive = false; // Ensure inactive until approved (only for new applications)
		}
		
		await sub.save();

		// eslint-disable-next-line no-console
		console.log('[SUBADMIN] Profile updated successfully');
		return ApiResponse.success(res, { 
			id: sub._id, 
			name: sub.name, 
			email: sub.email, 
			avatarUrl: sub.avatarUrl, 
			isProfileCompleted: sub.isProfileCompleted,
			approvalStatus: sub.approvalStatus,
			isActive: sub.isActive,
			message: sub.approvalStatus === 'pending' 
				? 'Profile completed successfully. Your application is pending admin approval.'
				: 'Profile updated successfully.'
		}, 'Profile updated successfully');
	} catch (err) {
		// eslint-disable-next-line no-console
		console.error('[SUBADMIN] updateProfile error:', err?.message || err);
		return ApiResponse.serverError(res, 'Failed to update profile');
	}
}

async function resendOtp(req, res) {
	try {
		const { phoneNumber } = req.body || {};
		if (!phoneNumber) return ApiResponse.badRequest(res, 'phoneNumber is required');
		const sub = await SubAdmin.findOne({ phoneNumber });
		if (!sub) return ApiResponse.notFound(res, 'SubAdmin not found');
		
		const now = Date.now();
		if (sub.lastOtpSentAt && now - sub.lastOtpSentAt.getTime() < OTP_RESEND_WINDOW_MS) {
			const waitMs = OTP_RESEND_WINDOW_MS - (now - sub.lastOtpSentAt.getTime());
			return ApiResponse.tooMany(res, `Please wait ${Math.ceil(waitMs / 1000)}s before requesting a new OTP`, 'OTP_RATE_LIMIT');
		}
		
		sub.otpCode = HARD_CODED_OTP;
		sub.otpExpiresAt = new Date(now + OTP_TTL_MS);
		sub.lastOtpSentAt = new Date(now);
		await sub.save();
		return ApiResponse.success(res, { maskedPhone: sub.maskedPhone(), ttlSeconds: OTP_TTL_MS / 1000 }, 'OTP resent');
	} catch (err) {
		return ApiResponse.serverError(res, 'Failed to resend OTP');
	}
}

module.exports = { sendOtp, verifyOtp, resendOtp, updateProfile };


