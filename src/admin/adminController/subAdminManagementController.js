const Admin = require('../adminModel/adminModel');
const ApiResponse = require('../../utils/apiResponse');
const { signAccessToken, signRefreshToken } = require('../../utils/Jwt');

const HARD_CODED_OTP = '123456';
const SubAdmin = require('../../subAdmin/subAdminModel/subAdminAuthModel');
const { sendEmail } = require('../../services/emailService');
const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const OTP_RESEND_WINDOW_MS = 60 * 1000; // 60 seconds between sends

async function sendOtp(req, res) {
	try {
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
		return ApiResponse.success(res, { maskedPhone: admin.maskedPhone(), ttlSeconds: OTP_TTL_MS / 1000 }, 'OTP sent');
	} catch (err) {
		return ApiResponse.serverError(res, 'Failed to send OTP');
	}
}

async function verifyOtp(req, res) {
	try {
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

		return ApiResponse.success(res, { accessToken, refreshToken, admin: { id: admin._id, phoneNumber: admin.phoneNumber, name: admin.name, email: admin.email, avatarUrl: admin.avatarUrl, role: admin.role } }, 'OTP verified');
	} catch (err) {
		return ApiResponse.serverError(res, 'Failed to verify OTP');
	}
}

async function resendOtp(req, res) {
	// simply reuse sendOtp logic for now
	return sendOtp(req, res);
}

// Get all subadmins with pagination and filters
async function getAllSubAdmins(req, res) {
	try {
		// eslint-disable-next-line no-console
		console.log('[ADMIN][SUBADMIN_MGMT] getAllSubAdmins request');
		const { page = 1, limit = 10, status, search } = req.query || {};
		
		const filter = {};
		if (status && ['active', 'inactive'].includes(status)) {
			filter.isActive = status === 'active';
		}
		if (search) {
			filter.$or = [
				{ name: { $regex: search, $options: 'i' } },
				{ email: { $regex: search, $options: 'i' } },
				{ phoneNumber: { $regex: search, $options: 'i' } }
			];
		}

		const skip = (parseInt(page) - 1) * parseInt(limit);
		const subAdmins = await SubAdmin.find(filter)
			.select('-otpCode -otpExpiresAt')
			.sort({ createdAt: -1 })
			.skip(skip)
			.limit(parseInt(limit))
			.lean();

		const total = await SubAdmin.countDocuments(filter);

		// eslint-disable-next-line no-console
		console.log('[ADMIN][SUBADMIN_MGMT] SubAdmins fetched successfully');
		return ApiResponse.success(res, {
			subAdmins,
			pagination: {
				page: parseInt(page),
				limit: parseInt(limit),
				total,
				pages: Math.ceil(total / parseInt(limit))
			}
		});
	} catch (e) {
		// eslint-disable-next-line no-console
		console.error('[ADMIN][SUBADMIN_MGMT] getAllSubAdmins error:', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to fetch subadmins');
	}
}

// Activate/Deactivate subadmin
async function toggleSubAdminStatus(req, res) {
	try {
		// eslint-disable-next-line no-console
		console.log('[ADMIN][SUBADMIN_MGMT] toggleSubAdminStatus request');
		const { subAdminId } = req.params || {};
		const { isActive } = req.body || {};
		
		if (typeof isActive !== 'boolean') {
			return ApiResponse.badRequest(res, 'isActive must be a boolean value');
		}

		const subAdmin = await SubAdmin.findById(subAdminId);
		if (!subAdmin) {
			return ApiResponse.notFound(res, 'SubAdmin not found');
		}

		subAdmin.isActive = isActive;
		await subAdmin.save();

		// eslint-disable-next-line no-console
		console.log('[ADMIN][SUBADMIN_MGMT] SubAdmin status updated successfully');
		return ApiResponse.success(res, {
			subAdminId: subAdmin._id,
			name: subAdmin.name,
			email: subAdmin.email,
			isActive: subAdmin.isActive
		}, `SubAdmin ${isActive ? 'activated' : 'deactivated'} successfully`);
	} catch (e) {
		// eslint-disable-next-line no-console
		console.error('[ADMIN][SUBADMIN_MGMT] toggleSubAdminStatus error:', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to update subadmin status');
	}
}

// Get subadmin details
async function getSubAdminDetails(req, res) {
	try {
		// eslint-disable-next-line no-console
		console.log('[ADMIN][SUBADMIN_MGMT] getSubAdminDetails request');
		const { subAdminId } = req.params || {};
		
		const subAdmin = await SubAdmin.findById(subAdminId)
			.select('-otpCode -otpExpiresAt')
			.lean();
		
		if (!subAdmin) {
			return ApiResponse.notFound(res, 'SubAdmin not found');
		}

		// eslint-disable-next-line no-console
		console.log('[ADMIN][SUBADMIN_MGMT] SubAdmin details fetched successfully');
		return ApiResponse.success(res, subAdmin);
	} catch (e) {
		// eslint-disable-next-line no-console
		console.error('[ADMIN][SUBADMIN_MGMT] getSubAdminDetails error:', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to fetch subadmin details');
	}
}

// Unified SubAdmin approval management endpoint
async function manageSubAdminApproval(req, res) {
	try {
		// eslint-disable-next-line no-console
		console.log('[ADMIN][SUBADMIN_MGMT] manageSubAdminApproval request', { 
			method: req.method, 
			params: req.params, 
			body: req.body 
		});
		
		const { subAdminId } = req.params || {};
		const { action, rejectionReason = 'Application rejected by admin' } = req.body || {};
		const adminId = req.user?.userId;

		// GET request - Get pending SubAdmins
		if (req.method === 'GET') {
			const { page = 1, limit = 10 } = req.query || {};
			
			const filter = { approvalStatus: 'pending' };
			const skip = (parseInt(page) - 1) * parseInt(limit);
			
			const pendingSubAdmins = await SubAdmin.find(filter)
				.select('-otpCode -otpExpiresAt')
				.sort({ createdAt: -1 })
				.skip(skip)
				.limit(parseInt(limit))
				.lean();

			const total = await SubAdmin.countDocuments(filter);

			// eslint-disable-next-line no-console
			console.log('[ADMIN][SUBADMIN_MGMT] Pending SubAdmins fetched successfully');
			return ApiResponse.success(res, {
				pendingSubAdmins,
				pagination: {
					page: parseInt(page),
					limit: parseInt(limit),
					total,
					pages: Math.ceil(total / parseInt(limit))
				}
			});
		}

		// PATCH request - Approve or Reject SubAdmin
		if (req.method === 'PATCH') {
			if (!subAdminId) {
				return ApiResponse.badRequest(res, 'SubAdmin ID is required');
			}

			const subAdmin = await SubAdmin.findById(subAdminId);
			if (!subAdmin) {
				return ApiResponse.notFound(res, 'SubAdmin not found');
			}

			if (subAdmin.approvalStatus !== 'pending') {
				return ApiResponse.badRequest(res, 'SubAdmin application is not pending approval');
			}

			// Approve SubAdmin
			if (action === 'approve') {
				subAdmin.approvalStatus = 'approved';
				subAdmin.isActive = true;
				subAdmin.approvedBy = adminId;
				subAdmin.approvedAt = new Date();
				await subAdmin.save();

				// eslint-disable-next-line no-console
				console.log('[ADMIN][SUBADMIN_MGMT] SubAdmin approved successfully');
				return ApiResponse.success(res, {
					subAdminId: subAdmin._id,
					name: subAdmin.name,
					email: subAdmin.email,
					approvalStatus: subAdmin.approvalStatus,
					isActive: subAdmin.isActive,
					approvedAt: subAdmin.approvedAt
				}, 'SubAdmin approved successfully');
			}

			// Reject SubAdmin
			if (action === 'reject') {
				// Reject the SubAdmin and delete the record
				subAdmin.approvalStatus = 'rejected';
				subAdmin.rejectedAt = new Date();
				subAdmin.rejectionReason = rejectionReason;
				await subAdmin.save();

				// Delete the SubAdmin record after rejection
				await SubAdmin.findByIdAndDelete(subAdminId);

				// eslint-disable-next-line no-console
				console.log('[ADMIN][SUBADMIN_MGMT] SubAdmin rejected and deleted successfully');
				return ApiResponse.success(res, {
					subAdminId,
					rejectionReason,
					rejectedAt: new Date()
				}, 'SubAdmin application rejected and data deleted');
			}

			return ApiResponse.badRequest(res, 'Invalid action. Use "approve" or "reject"');
		}

		return ApiResponse.methodNotAllowed(res, 'Method not allowed');
	} catch (e) {
		// eslint-disable-next-line no-console
		console.error('[ADMIN][SUBADMIN_MGMT] manageSubAdminApproval error:', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to manage SubAdmin approval');
	}
}


module.exports = {
	sendOtp,
	verifyOtp,
	resendOtp,
	manageSubAdminApproval,
	getSubAdminDetails,
	getAllSubAdmins,
	toggleSubAdminStatus
};


