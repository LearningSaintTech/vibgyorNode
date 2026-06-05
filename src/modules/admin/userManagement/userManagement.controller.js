const ApiResponse = require('../../../utils/apiResponse');
const userManagementService = require('./userManagement.service');

function mapServiceResult(res, result) {
	if (result.ok) {
		if (result.message) {
			return ApiResponse.success(res, result.data, result.message);
		}
		return ApiResponse.success(res, result.data);
	}

	if (result.statusCode === 400) {
		return ApiResponse.badRequest(res, result.message, result.code);
	}
	if (result.statusCode === 404) {
		return ApiResponse.notFound(res, result.message);
	}

	return ApiResponse.serverError(res, result.message || 'Request failed');
}

async function getAllUsers(req, res) {
	try {
		console.log('[ADMIN][USER_MGMT] getAllUsers request');
		const result = await userManagementService.getAllUsers(req.query || {});
		if (result.ok) {
			console.log('[ADMIN][USER_MGMT] Users fetched successfully');
		}
		return mapServiceResult(res, result);
	} catch (e) {
		console.error('[ADMIN][USER_MGMT] getAllUsers error:', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to fetch users');
	}
}

async function toggleUserStatus(req, res) {
	try {
		console.log('[ADMIN][USER_MGMT] toggleUserStatus request');
		const { userId } = req.params || {};
		const { isActive } = req.body || {};
		const result = await userManagementService.toggleUserStatus(userId, isActive);
		if (result.ok) {
			console.log('[ADMIN][USER_MGMT] User status updated successfully');
		}
		return mapServiceResult(res, result);
	} catch (e) {
		console.error('[ADMIN][USER_MGMT] toggleUserStatus error:', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to update user status');
	}
}

async function getUserDetails(req, res) {
	try {
		console.log('[ADMIN][USER_MGMT] getUserDetails request');
		const { userId } = req.params || {};
		const result = await userManagementService.getUserDetails(userId);
		if (result.ok) {
			console.log('[ADMIN][USER_MGMT] User details fetched successfully');
		}
		return mapServiceResult(res, result);
	} catch (e) {
		console.error('[ADMIN][USER_MGMT] getUserDetails error:', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to fetch user details');
	}
}

async function getPendingVerifications(req, res) {
	try {
		console.log('[ADMIN][USER_MGMT] getPendingVerifications request');
		const result = await userManagementService.getPendingVerifications(req.query || {});
		if (result.ok) {
			console.log('[ADMIN][USER_MGMT] Pending verifications fetched successfully');
		}
		return mapServiceResult(res, result);
	} catch (e) {
		console.error('[ADMIN][USER_MGMT] getPendingVerifications error:', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to fetch pending verifications');
	}
}

async function approveUserVerification(req, res) {
	try {
		console.log('[ADMIN][USER_MGMT] approveUserVerification request');
		const { userId } = req.params || {};
		const result = await userManagementService.approveUserVerification(userId, req.user);
		if (result.ok) {
			console.log('[ADMIN][USER_MGMT] User verification approved successfully');
		}
		return mapServiceResult(res, result);
	} catch (e) {
		console.error('[ADMIN][USER_MGMT] approveUserVerification error:', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to approve user verification');
	}
}

async function rejectUserVerification(req, res) {
	try {
		console.log('[ADMIN][USER_MGMT] rejectUserVerification request');
		const { userId } = req.params || {};
		const result = await userManagementService.rejectUserVerification(
			userId,
			req.body || {},
			req.user
		);
		if (result.ok) {
			console.log('[ADMIN][USER_MGMT] User verification rejected successfully');
		}
		return mapServiceResult(res, result);
	} catch (e) {
		console.error('[ADMIN][USER_MGMT] rejectUserVerification error:', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to reject user verification');
	}
}

async function getPendingReports(req, res) {
	try {
		console.log('[ADMIN][USER_MGMT] getPendingReports request');
		const result = await userManagementService.getPendingReports(req.query || {});
		if (result.ok) {
			console.log('[ADMIN][USER_MGMT] Pending reports fetched successfully');
		}
		return mapServiceResult(res, result);
	} catch (e) {
		console.error('[ADMIN][USER_MGMT] getPendingReports error:', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to fetch pending reports');
	}
}

async function getReportDetails(req, res) {
	try {
		console.log('[ADMIN][USER_MGMT] getReportDetails request');
		const { reportId } = req.params || {};
		const result = await userManagementService.getReportDetails(reportId);
		if (result.ok) {
			console.log('[ADMIN][USER_MGMT] Report details fetched successfully');
		}
		return mapServiceResult(res, result);
	} catch (e) {
		console.error('[ADMIN][USER_MGMT] getReportDetails error:', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to fetch report details');
	}
}

async function updateReportStatus(req, res) {
	try {
		console.log('[ADMIN][USER_MGMT] updateReportStatus request');
		const { reportId } = req.params || {};
		const result = await userManagementService.updateReportStatus(
			reportId,
			req.body || {},
			req.user
		);
		if (result.ok) {
			console.log('[ADMIN][USER_MGMT] Report status updated successfully');
		}
		return mapServiceResult(res, result);
	} catch (e) {
		console.error('[ADMIN][USER_MGMT] updateReportStatus error:', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to update report status');
	}
}

async function getReportStats(req, res) {
	try {
		console.log('[ADMIN][USER_MGMT] getReportStats request');
		const result = await userManagementService.getReportStats();
		if (result.ok) {
			console.log('[ADMIN][USER_MGMT] Report stats fetched successfully');
		}
		return mapServiceResult(res, result);
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
	getReportStats,
};
