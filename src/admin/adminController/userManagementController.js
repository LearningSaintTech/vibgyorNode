const User = require('../../user/auth/model/userAuthModel');
const SubAdmin = require('../../subAdmin/subAdminModel/subAdminAuthModel');
const Report = require('../../user/social/userModel/userReportModel');
const ApiResponse = require('../../utils/apiResponse');

// Get all users with pagination and filters
async function getAllUsers(req, res) {
	try {
		// eslint-disable-next-line no-console
		console.log('[ADMIN][USER_MGMT] getAllUsers request');
		const { page = 1, limit = 10, status, search } = req.query || {};
		
		const filter = {};
		if (status && ['active', 'inactive'].includes(status)) {
			filter.isActive = status === 'active';
		}
		if (search) {
			filter.$or = [
				{ fullName: { $regex: search, $options: 'i' } },
				{ username: { $regex: search, $options: 'i' } },
				{ email: { $regex: search, $options: 'i' } },
				{ phoneNumber: { $regex: search, $options: 'i' } }
			];
		}

		const skip = (parseInt(page) - 1) * parseInt(limit);
		const users = await User.find(filter)
			.select('-otpCode -emailOtpCode -otpExpiresAt -emailOtpExpiresAt')
			.sort({ createdAt: -1 })
			.skip(skip)
			.limit(parseInt(limit))
			.lean();

		const total = await User.countDocuments(filter);

		// eslint-disable-next-line no-console
		console.log('[ADMIN][USER_MGMT] Users fetched successfully');
		return ApiResponse.success(res, {
			users,
			pagination: {
				page: parseInt(page),
				limit: parseInt(limit),
				total,
				pages: Math.ceil(total / parseInt(limit))
			}
		});
	} catch (e) {
		// eslint-disable-next-line no-console
		console.error('[ADMIN][USER_MGMT] getAllUsers error:', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to fetch users');
	}
}


// Activate/Deactivate user
async function toggleUserStatus(req, res) {
	try {
		// eslint-disable-next-line no-console
		console.log('[ADMIN][USER_MGMT] toggleUserStatus request');
		const { userId } = req.params || {};
		const { isActive } = req.body || {};
		
		if (typeof isActive !== 'boolean') {
			return ApiResponse.badRequest(res, 'isActive must be a boolean value');
		}

		const user = await User.findById(userId);
		if (!user) {
			return ApiResponse.notFound(res, 'User not found');
		}

		user.isActive = isActive;
		await user.save();

		// eslint-disable-next-line no-console
		console.log('[ADMIN][USER_MGMT] User status updated successfully');
		return ApiResponse.success(res, {
			userId: user._id,
			username: user.username,
			fullName: user.fullName,
			isActive: user.isActive
		}, `User ${isActive ? 'activated' : 'deactivated'} successfully`);
	} catch (e) {
		// eslint-disable-next-line no-console
		console.error('[ADMIN][USER_MGMT] toggleUserStatus error:', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to update user status');
	}
}


// Get user details
async function getUserDetails(req, res) {
	try {
		// eslint-disable-next-line no-console
		console.log('[ADMIN][USER_MGMT] getUserDetails request');
		const { userId } = req.params || {};
		
		const user = await User.findById(userId)
			.select('-otpCode -emailOtpCode -otpExpiresAt -emailOtpExpiresAt')
			.lean();
		
		if (!user) {
			return ApiResponse.notFound(res, 'User not found');
		}

		// eslint-disable-next-line no-console
		console.log('[ADMIN][USER_MGMT] User details fetched successfully');
		return ApiResponse.success(res, user);
	} catch (e) {
		// eslint-disable-next-line no-console
		console.error('[ADMIN][USER_MGMT] getUserDetails error:', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to fetch user details');
	}
}

// Get all pending verification requests
async function getPendingVerifications(req, res) {
	try {
		// eslint-disable-next-line no-console
		console.log('[ADMIN][USER_MGMT] getPendingVerifications request');
		const { page = 1, limit = 10 } = req.query || {};
  		
		const filter = { verificationStatus: 'pending' };
		const skip = (parseInt(page) - 1) * parseInt(limit);
		
		const pendingVerifications = await User.find(filter)
			.select('-otpCode -emailOtpCode -otpExpiresAt -emailOtpExpiresAt')
			.sort({ 'verificationDocument.uploadedAt': -1 })
			.skip(skip)
			.limit(parseInt(limit))
			.lean();

		const total = await User.countDocuments(filter);

		// eslint-disable-next-line no-console
		console.log('[ADMIN][USER_MGMT] Pending verifications fetched successfully');
		return ApiResponse.success(res, {
			pendingVerifications,
			pagination: {
				page: parseInt(page),
				limit: parseInt(limit),
				total,
				pages: Math.ceil(total / parseInt(limit))
			}
		});
	} catch (e) {
		// eslint-disable-next-line no-console
		console.error('[ADMIN][USER_MGMT] getPendingVerifications error:', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to fetch pending verifications');
	}
}

// Approve user verification
async function approveUserVerification(req, res) {
	try {
		// eslint-disable-next-line no-console
		console.log('[ADMIN][USER_MGMT] approveUserVerification request');
		const { userId } = req.params || {};
		const reviewerId = req.user?.userId;
		const reviewerRole = req.user?.role === 'admin' ? 'admin' : 'subadmin';
		
		const user = await User.findById(userId);
		if (!user) {
			return ApiResponse.notFound(res, 'User not found');
		}

		if (user.verificationStatus !== 'pending') {
			return ApiResponse.badRequest(res, 'User verification is not pending');
		}

		// Update verification status
		user.verificationStatus = 'approved';
		user.verificationDocument.reviewedBy = reviewerId;
		user.verificationDocument.reviewedAt = new Date();
		user.verificationDocument.reviewerRole = reviewerRole;
		user.verificationDocument.rejectionReason = ''; // Clear any previous rejection reason
		await user.save();

		// eslint-disable-next-line no-console
		console.log('[ADMIN][USER_MGMT] User verification approved successfully');
		return ApiResponse.success(res, {
			userId: user._id,
			username: user.username,
			fullName: user.fullName,
			verificationStatus: user.verificationStatus,
			reviewedAt: user.verificationDocument.reviewedAt,
			reviewerRole: user.verificationDocument.reviewerRole
		}, 'User verification approved successfully');
	} catch (e) {
		// eslint-disable-next-line no-console
		console.error('[ADMIN][USER_MGMT] approveUserVerification error:', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to approve user verification');
	}
}

// Reject user verification
async function rejectUserVerification(req, res) {
	try {
		// eslint-disable-next-line no-console
		console.log('[ADMIN][USER_MGMT] rejectUserVerification request');
		const { userId } = req.params || {};
		const { rejectionReason } = req.body || {};
		const reviewerId = req.user?.userId;
		const reviewerRole = req.user?.role === 'admin' ? 'admin' : 'subadmin';
		
		if (!rejectionReason || rejectionReason.trim() === '') {
			return ApiResponse.badRequest(res, 'Rejection reason is required');
		}

		const user = await User.findById(userId);
		if (!user) {
			return ApiResponse.notFound(res, 'User not found');
		}

		if (user.verificationStatus !== 'pending') {
			return ApiResponse.badRequest(res, 'User verification is not pending');
		}

		// Update verification status
		user.verificationStatus = 'rejected';
		user.verificationDocument.reviewedBy = reviewerId;
		user.verificationDocument.reviewedAt = new Date();
		user.verificationDocument.reviewerRole = reviewerRole;
		user.verificationDocument.rejectionReason = rejectionReason.trim();
		await user.save();

		// eslint-disable-next-line no-console
		console.log('[ADMIN][USER_MGMT] User verification rejected successfully');
		return ApiResponse.success(res, {
			userId: user._id,
			username: user.username,
			fullName: user.fullName,
			verificationStatus: user.verificationStatus,
			rejectionReason: user.verificationDocument.rejectionReason,
			reviewedAt: user.verificationDocument.reviewedAt,
			reviewerRole: user.verificationDocument.reviewerRole
		}, 'User verification rejected successfully');
	} catch (e) {
		// eslint-disable-next-line no-console
		console.error('[ADMIN][USER_MGMT] rejectUserVerification error:', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to reject user verification');
	}
}

// Get all pending reports
async function getPendingReports(req, res) {
	try {
		console.log('[ADMIN][USER_MGMT] getPendingReports request');
		const { page = 1, limit = 10, reportType, priority } = req.query || {};
		
		const filter = { status: 'pending' };
		if (reportType) filter.reportType = reportType;
		if (priority) filter.priority = priority;
		
		const skip = (parseInt(page) - 1) * parseInt(limit);
		
		const pendingReports = await Report.find(filter)
			.populate('reporter', 'username fullName email phoneNumber')
			.populate('reportedUser', 'username fullName email phoneNumber')
			.sort({ createdAt: -1 })
			.skip(skip)
			.limit(parseInt(limit))
			.lean();

		const total = await Report.countDocuments(filter);

		console.log('[ADMIN][USER_MGMT] Pending reports fetched successfully');
		return ApiResponse.success(res, {
			pendingReports,
			pagination: {
				page: parseInt(page),
				limit: parseInt(limit),
				total,
				pages: Math.ceil(total / parseInt(limit))
			}
		});
	} catch (e) {
		console.error('[ADMIN][USER_MGMT] getPendingReports error:', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to fetch pending reports');
	}
}

// Get report details
async function getReportDetails(req, res) {
	try {
		console.log('[ADMIN][USER_MGMT] getReportDetails request');
		const { reportId } = req.params || {};
		
		const report = await Report.findById(reportId)
			.populate('reporter', 'username fullName email phoneNumber')
			.populate('reportedUser', 'username fullName email phoneNumber')
			.populate('reviewedBy', 'name email')
			.lean();
		
		if (!report) {
			return ApiResponse.notFound(res, 'Report not found');
		}

		console.log('[ADMIN][USER_MGMT] Report details fetched successfully');
		return ApiResponse.success(res, report);
	} catch (e) {
		console.error('[ADMIN][USER_MGMT] getReportDetails error:', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to fetch report details');
	}
}

// Update report status
async function updateReportStatus(req, res) {
	try {
		console.log('[ADMIN][USER_MGMT] updateReportStatus request');
		const { reportId } = req.params || {};
		const { status, actionTaken, reviewNotes, priority } = req.body || {};
		const reviewerId = req.user?.userId;
		const reviewerRole = req.user?.role === 'admin' ? 'admin' : 'subadmin';
		
		if (!status || !['under_review', 'resolved', 'dismissed'].includes(status)) {
			return ApiResponse.badRequest(res, 'Valid status is required');
		}

		const report = await Report.findById(reportId);
		if (!report) {
			return ApiResponse.notFound(res, 'Report not found');
		}

		// Update report
		report.status = status;
		report.reviewedBy = reviewerId;
		report.reviewedAt = new Date();
		report.reviewerRole = reviewerRole;
		if (actionTaken) report.actionTaken = actionTaken;
		if (reviewNotes) report.reviewNotes = reviewNotes;
		if (priority) report.priority = priority;
		await report.save();

		// Populate for response
		await report.populate([
			{ path: 'reporter', select: 'username fullName' },
			{ path: 'reportedUser', select: 'username fullName' }
		]);

		console.log('[ADMIN][USER_MGMT] Report status updated successfully');
		return ApiResponse.success(res, {
			reportId: report._id,
			status: report.status,
			actionTaken: report.actionTaken,
			reviewedAt: report.reviewedAt,
			reviewerRole: report.reviewerRole,
			reporter: report.reporter.username || report.reporter.fullName,
			reportedUser: report.reportedUser.username || report.reportedUser.fullName
		}, 'Report status updated successfully');
	} catch (e) {
		console.error('[ADMIN][USER_MGMT] updateReportStatus error:', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to update report status');
	}
}

// Get report statistics
async function getReportStats(req, res) {
	try {
		console.log('[ADMIN][USER_MGMT] getReportStats request');
		
		const stats = await Report.getStats();
		const totalReports = await Report.countDocuments();
		const recentReports = await Report.countDocuments({
			createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
		});

		console.log('[ADMIN][USER_MGMT] Report stats fetched successfully');
		return ApiResponse.success(res, {
			totalReports,
			recentReports,
			...stats
		});
	} catch (e) {
		console.error('[ADMIN][USER_MGMT] getReportStats error:', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to fetch report statistics');
	}
}

module.exports = {
	getAllUsers,
	toggleUserStatus,
	getUserDetails,
	getPendingVerifications,
	approveUserVerification,
	rejectUserVerification,
	getPendingReports,
	getReportDetails,
	updateReportStatus,
	getReportStats
};
