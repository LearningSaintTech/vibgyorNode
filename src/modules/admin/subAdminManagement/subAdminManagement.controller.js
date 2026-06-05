const ApiResponse = require('../../../utils/apiResponse');
const subAdminManagementService = require('./subAdminManagement.service');

function mapServiceResult(res, result) {
	if (result.ok) {
		if (result.message) return ApiResponse.success(res, result.data, result.message);
		return ApiResponse.success(res, result.data);
	}
	if (result.statusCode === 400) return ApiResponse.badRequest(res, result.message);
	if (result.statusCode === 404) return ApiResponse.notFound(res, result.message);
	if (result.statusCode === 405) return ApiResponse.methodNotAllowed(res, result.message);
	return ApiResponse.serverError(res, result.message || 'Request failed');
}

async function getAllSubAdmins(req, res) {
	try {
		console.log('[ADMIN][SUBADMIN_MGMT] getAllSubAdmins request');
		const result = await subAdminManagementService.getAllSubAdmins(req.query || {});
		if (result.ok) console.log('[ADMIN][SUBADMIN_MGMT] SubAdmins fetched successfully');
		return mapServiceResult(res, result);
	} catch (e) {
		console.error('[ADMIN][SUBADMIN_MGMT] getAllSubAdmins error:', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to fetch subadmins');
	}
}

async function toggleSubAdminStatus(req, res) {
	try {
		console.log('[ADMIN][SUBADMIN_MGMT] toggleSubAdminStatus request');
		const result = await subAdminManagementService.toggleSubAdminStatus(
			req.params?.subAdminId,
			req.body?.isActive
		);
		if (result.ok) console.log('[ADMIN][SUBADMIN_MGMT] SubAdmin status updated successfully');
		return mapServiceResult(res, result);
	} catch (e) {
		console.error('[ADMIN][SUBADMIN_MGMT] toggleSubAdminStatus error:', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to update subadmin status');
	}
}

async function getSubAdminDetails(req, res) {
	try {
		console.log('[ADMIN][SUBADMIN_MGMT] getSubAdminDetails request');
		const result = await subAdminManagementService.getSubAdminDetails(req.params?.subAdminId);
		if (result.ok) console.log('[ADMIN][SUBADMIN_MGMT] SubAdmin details fetched successfully');
		return mapServiceResult(res, result);
	} catch (e) {
		console.error('[ADMIN][SUBADMIN_MGMT] getSubAdminDetails error:', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to fetch subadmin details');
	}
}

async function manageSubAdminApproval(req, res) {
	try {
		console.log('[ADMIN][SUBADMIN_MGMT] manageSubAdminApproval request', {
			method: req.method,
			params: req.params,
			body: req.body,
		});
		const result = await subAdminManagementService.manageSubAdminApproval({
			method: req.method,
			subAdminId: req.params?.subAdminId,
			query: req.query || {},
			body: req.body || {},
			adminId: req.user?.userId,
		});
		if (result.ok) {
			console.log('[ADMIN][SUBADMIN_MGMT] manageSubAdminApproval completed successfully');
		}
		return mapServiceResult(res, result);
	} catch (e) {
		console.error('[ADMIN][SUBADMIN_MGMT] manageSubAdminApproval error:', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to manage SubAdmin approval');
	}
}

module.exports = {
	getAllSubAdmins,
	toggleSubAdminStatus,
	getSubAdminDetails,
	manageSubAdminApproval,
};
