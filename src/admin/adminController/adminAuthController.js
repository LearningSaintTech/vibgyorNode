const Admin = require('../adminModel/adminModel');
const ApiResponse = require('../../utils/apiResponse');
const { signAccessToken, signRefreshToken } = require('../../utils/Jwt');
const { uploadBuffer } = require('../../services/s3Service'); // adjust path to match your S3 file
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
		return ApiResponse.success(res, { accessToken, refreshToken, admin: { id: admin._id, phoneNumber: admin.phoneNumber, firstName: admin.firstName, lastName: admin.lastName, email: admin.email, avatarUrl: admin.avatarUrl, role: admin.role } }, 'OTP verified');
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

async function getProfile(req, res) {
	try {
		const admin = await Admin.findById(req.user.userId);

		if (!admin) {
			return ApiResponse.notFound(res, 'Admin not found');
		}

		const profileData = {
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
			// isProfileCompleted: admin.isProfileCompleted,
			role: admin.role,
			// isVerified: admin.isVerified,
			// lastLoginAt: admin.lastLoginAt,
			// createdAt: admin.createdAt,
		};

		return ApiResponse.success(res, profileData, 'Profile retrieved successfully');
	} catch (err) {
		return ApiResponse.serverError(res, 'Failed to fetch profile');
	}
}

/**
 * UPDATE PROFILE - Update admin profile (text fields + optional avatar)
 */
async function updateProfile(req, res) {

	try {
		if (!req.is('multipart/form-data')) {
			return ApiResponse.badRequest(
				res,
				'Content-Type must be multipart/form-data'
			);
		}

		console.log('[ADMIN] updateProfile request received');


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
		} = req.body || {};

		// Log incoming data — crucial for debugging!
		console.log('[ADMIN] Incoming profile data', {
			firstName: firstName ?? null,
			lastName: lastName ?? null,
			email: email ?? null,
			gender: gender ?? null,
			dateOfBirth: dateOfBirth ?? null,
			address: address ?? null,
			city: city ?? null,
			state: state ?? null,
			pinCode: pinCode ?? null,
		});

		const admin = await Admin.findById(req.user.userId);
		if (!admin) {
			console.warn('[ADMIN] Admin not found', { userId: req.user.userId });
			return ApiResponse.notFound(res, 'Admin not found');
		}

		console.log('[ADMIN] Admin found', {
			id: admin._id,
			firstName: admin.firstName,
			lastName: admin.lastName,
			currentEmail: admin.email,
			currentAvatar: !!admin.avatarUrl,
			isProfileCompleted: admin.isProfileCompleted,
		});

		/* ---------- AVATAR UPLOAD ---------- */
		let avatarUrl = admin.avatarUrl;

		if (req.file) {
			console.log('[ADMIN] Avatar file received', {
				originalname: req.file.originalname,
				mimetype: req.file.mimetype,
				size: req.file.size,
				fieldname: req.file.fieldname,
			});

			try {
				console.log('[S3] Starting avatar upload for admin', { userId: admin._id });

				const uploadResult = await uploadBuffer({
					buffer: req.file.buffer,
					contentType: req.file.mimetype,
					userId: String(admin._id),
					category: 'profile',
					type: 'images',
					filename: req.file.originalname,
				});

				avatarUrl = uploadResult.url;

				console.log('✅ [S3] Avatar uploaded successfully', {
					key: uploadResult.key,
					url: avatarUrl,
					bucket: uploadResult.bucket,
				});
			} catch (uploadError) {
				console.error('❌ [S3] Avatar upload failed - continuing without new avatar', {
					userId: admin._id,
					filename: req.file.originalname,
					error: uploadError.name,
					message: uploadError.message,
				});
				// Non-critical — keep old avatar
			}
		} else {
			console.log('[ADMIN] No avatar uploaded - keeping existing', { currentAvatarUrl: avatarUrl });
		}

		/* ---------- APPLY PROFILE UPDATES ---------- */
		const updates = {};

		if (firstName !== undefined) { admin.firstName = firstName; updates.firstName = firstName; }
		if (lastName !== undefined) { admin.lastName = lastName; updates.lastName = lastName; }
		if (email !== undefined) { admin.email = email; updates.email = email; }
		if (gender !== undefined) { admin.gender = gender; updates.gender = gender; }
		if (dateOfBirth !== undefined) {
			admin.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
			updates.dateOfBirth = admin.dateOfBirth;
		}
		if (address !== undefined) { admin.address = address; updates.address = address; }
		if (city !== undefined) { admin.city = city; updates.city = city; }
		if (state !== undefined) { admin.state = state; updates.state = state; }
		if (pinCode !== undefined) { admin.pinCode = pinCode; updates.pinCode = pinCode; }

		// Update avatar if changed
		if (avatarUrl !== admin.avatarUrl) {
			admin.avatarUrl = avatarUrl;
			updates.avatarUrl = avatarUrl;
		}

		// Auto-calculate isProfileCompleted (same as SubAdmin logic)
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

		console.log('[ADMIN] Applying profile updates', {
			updatedFields: Object.keys(updates),
			avatarChanged: avatarUrl !== admin.avatarUrl,
			isProfileCompleted: admin.isProfileCompleted,
		});

		/* ---------- SAVE TO DATABASE ---------- */
		try {
			await admin.save();
			console.log('✅ [ADMIN] Profile updated and saved successfully', { userId: admin._id });
		} catch (saveError) {
			console.error('❌ [ADMIN] Failed to save profile', {
				userId: admin._id,
				error: saveError.name,
				message: saveError.message,
				validationErrors: saveError.errors ? Object.keys(saveError.errors) : null,
			});
			return ApiResponse.serverError(res, 'Validation failed while saving profile');
		}

		/* ---------- SUCCESS RESPONSE ---------- */
		const responseData = {
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
		};

		console.log('🎉 [ADMIN] Profile update completed successfully', { userId: admin._id });

		return ApiResponse.success(res, responseData, 'Profile updated successfully');
	} catch (err) {
		console.error('💥 [ADMIN] updateProfile UNHANDLED ERROR', {
			userId: req.user?.userId,
			error: err.name,
			message: err.message,
			stack: err.stack?.split('\n').slice(0, 5).join('\n'),
		});

		return ApiResponse.serverError(res, 'Failed to update profile');
	}
}
/**
 * GET PROFILE - Fetch current admin's profile with all profile fields
 */

module.exports = {
	sendOtp,
	verifyOtp,
	resendOtp,
	getProfile,
	updateProfile,
};
