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
async function getProfile(req, res) {
	try {
		console.log('[SUBADMIN] getProfile request received');

		const sub = await SubAdmin.findById(req.user.userId)
			.select('-otpCode -otpExpiresAt -lastOtpSentAt');

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
			updatedAt: sub.updatedAt
		}, 'Profile fetched successfully');

	} catch (err) {
		console.error('[SUBADMIN] getProfile error:', err);
		return ApiResponse.serverError(res, 'Failed to fetch profile');
	}
}


async function updateProfile(req, res) {
	try {
		console.log('[SUBADMIN] updateProfile request received', {
			userId: req.user?.userId,
			ip: req.ip,
			hasFile: !!req.file,
			bodyKeys: Object.keys(req.body || {})
		});

		const {
			name,
			email,
			gender,
			dateOfBirth,
			address,
			city,
			state,
			pinCode
		} = req.body || {};

		// Log incoming data for debugging
		console.log('[SUBADMIN] Incoming profile data', {
			name: name ?? null,
			email: email ?? null,
			gender: gender ?? null,
			dateOfBirth: dateOfBirth ?? null,
			address: address ?? null,
			city: city ?? null,
			state: state ?? null,
			pinCode: pinCode ?? null
		});

		const sub = await SubAdmin.findById(req.user.userId);
		if (!sub) {
			console.warn('[SUBADMIN] Subadmin not found', { userId: req.user.userId });
			return ApiResponse.notFound(res, 'Subadmin not found');
		}

		console.log('[SUBADMIN] Subadmin found', {
			id: sub._id,
			currentName: sub.name,
			currentEmail: sub.email,
			currentAvatar: !!sub.avatarUrl,
			isProfileCompleted: sub.isProfileCompleted,
			approvalStatus: sub.approvalStatus
		});

		/* ---------- IMAGE UPLOAD ---------- */
		let avatarUrl = sub.avatarUrl;

		if (req.file) {
			console.log('[SUBADMIN] Avatar file received', {
				originalname: req.file.originalname,
				mimetype: req.file.mimetype,
				size: req.file.size,
				fieldname: req.file.fieldname
			});

			try {
				console.log('[S3] Starting avatar upload for subadmin', { userId: sub._id });

				const uploadResult = await uploadBuffer({
					buffer: req.file.buffer,
					contentType: req.file.mimetype,
					userId: String(sub._id),
					category: 'profile',
					type: 'images',
					filename: req.file.originalname,
				});

				avatarUrl = uploadResult.url;

				console.log('✅ [S3] Avatar uploaded successfully', {
					key: uploadResult.key,
					url: avatarUrl,
					bucket: uploadResult.bucket
				});
			} catch (uploadError) {
				console.error('❌ [S3] Avatar upload failed - continuing without new avatar', {
					userId: sub._id,
					filename: req.file.originalname,
					error: uploadError.name,
					message: uploadError.message,
					stack: uploadError.stack?.split('\n')[0]
				});
				// Non-critical: profile update continues even if image upload fails
			}
		} else {
			console.log('[SUBADMIN] No avatar file uploaded - keeping existing', { currentAvatarUrl: avatarUrl });
		}

		/* ---------- UPDATE PROFILE FIELDS ---------- */
		const updates = {};

		if (name !== undefined) { sub.name = name; updates.name = name; }
		if (email !== undefined) { sub.email = email; updates.email = email; }
		if (gender !== undefined) { sub.gender = gender; updates.gender = gender; }
		if (dateOfBirth !== undefined) {
			sub.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
			updates.dateOfBirth = sub.dateOfBirth;
		}
		if (address !== undefined) { sub.address = address; updates.address = address; }
		if (city !== undefined) { sub.city = city; updates.city = city; }
		if (state !== undefined) { sub.state = state; updates.state = state; }
		if (pinCode !== undefined) { sub.pinCode = pinCode; updates.pinCode = pinCode; }

		// Always update avatar and completion status
		sub.avatarUrl = avatarUrl;
		sub.isProfileCompleted = true;

		// Handle approval status logic
		if (sub.approvalStatus === 'pending') {
			sub.isActive = false;
			updates.isActive = false;
		}

		console.log('[SUBADMIN] Applying profile updates', {
			updatedFields: Object.keys(updates),
			newAvatarUrl: avatarUrl !== sub.avatarUrl ? avatarUrl : '(unchanged)',
			isProfileCompleted: true,
			approvalStatus: sub.approvalStatus,
			isActive: sub.isActive
		});

		/* ---------- SAVE TO DATABASE ---------- */
		try {
			await sub.save();
			console.log('✅ [SUBADMIN] Profile updated and saved successfully', { userId: sub._id });
		} catch (saveError) {
			console.error('❌ [SUBADMIN] Failed to save profile', {
				userId: sub._id,
				error: saveError.name,
				message: saveError.message,
				validationErrors: saveError.errors ? Object.keys(saveError.errors) : null
			});
			throw saveError; // Let outer catch handle response
		}

		/* ---------- SUCCESS RESPONSE ---------- */
		const responseData = {
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
			isActive: sub.isActive
		};

		console.log('🎉 [SUBADMIN] Profile update completed successfully', { userId: sub._id });

		return ApiResponse.success(res, responseData, 'Profile updated successfully');

	} catch (err) {
		console.error('💥 [SUBADMIN] updateProfile UNHANDLED ERROR', {
			userId: req.user?.userId,
			error: err.name,
			message: err.message,
			stack: err.stack?.split('\n').slice(0, 5).join('\n')
		});

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

module.exports = { sendOtp, verifyOtp, resendOtp, getProfile, updateProfile };


