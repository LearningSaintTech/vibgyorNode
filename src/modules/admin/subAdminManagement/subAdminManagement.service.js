const subAdminManagementRepository = require('./subAdminManagement.repository');

async function getAllSubAdmins(query = {}) {
	const { page, limit, skip } = subAdminManagementRepository.parsePagination(query);
	const filter = subAdminManagementRepository.buildSubAdminListFilter(query);
	const subAdmins = await subAdminManagementRepository.findSubAdmins(filter, { skip, limit });
	const total = await subAdminManagementRepository.countSubAdmins(filter);

	return {
		ok: true,
		data: {
			subAdmins,
			pagination: subAdminManagementRepository.buildPaginationMeta(page, limit, total),
		},
	};
}

async function toggleSubAdminStatus(subAdminId, isActive) {
	if (typeof isActive !== 'boolean') {
		return { ok: false, statusCode: 400, message: 'isActive must be a boolean value' };
	}

	const subAdmin = await subAdminManagementRepository.findSubAdminById(subAdminId);
	if (!subAdmin) {
		return { ok: false, statusCode: 404, message: 'SubAdmin not found' };
	}

	subAdmin.isActive = isActive;
	await subAdminManagementRepository.saveSubAdmin(subAdmin);

	return {
		ok: true,
		message: `SubAdmin ${isActive ? 'activated' : 'deactivated'} successfully`,
		data: {
			subAdminId: subAdmin._id,
			name: subAdmin.name,
			email: subAdmin.email,
			isActive: subAdmin.isActive,
		},
	};
}

async function getSubAdminDetails(subAdminId) {
	const subAdmin = await subAdminManagementRepository.findSubAdminDetailsById(subAdminId);
	if (!subAdmin) {
		return { ok: false, statusCode: 404, message: 'SubAdmin not found' };
	}
	return { ok: true, data: subAdmin };
}

async function manageSubAdminApproval({ method, subAdminId, query, body, adminId }) {
	if (method === 'GET') {
		const { page, limit, skip } = subAdminManagementRepository.parsePagination(query);
		const { pendingSubAdmins, total } = await subAdminManagementRepository.findPendingSubAdmins({
			skip,
			limit,
		});

		return {
			ok: true,
			data: {
				pendingSubAdmins,
				pagination: subAdminManagementRepository.buildPaginationMeta(page, limit, total),
			},
		};
	}

	if (method === 'PATCH') {
		const { action, rejectionReason = 'Application rejected by admin' } = body || {};

		if (!subAdminId) {
			return { ok: false, statusCode: 400, message: 'SubAdmin ID is required' };
		}

		const subAdmin = await subAdminManagementRepository.findSubAdminById(subAdminId);
		if (!subAdmin) {
			return { ok: false, statusCode: 404, message: 'SubAdmin not found' };
		}

		if (subAdmin.approvalStatus !== 'pending') {
			return { ok: false, statusCode: 400, message: 'SubAdmin application is not pending approval' };
		}

		if (action === 'approve') {
			subAdmin.approvalStatus = 'approved';
			subAdmin.isActive = true;
			subAdmin.approvedBy = adminId;
			subAdmin.approvedAt = new Date();
			await subAdminManagementRepository.saveSubAdmin(subAdmin);

			return {
				ok: true,
				message: 'SubAdmin approved successfully',
				data: {
					subAdminId: subAdmin._id,
					name: subAdmin.name,
					email: subAdmin.email,
					approvalStatus: subAdmin.approvalStatus,
					isActive: subAdmin.isActive,
					approvedAt: subAdmin.approvedAt,
				},
			};
		}

		if (action === 'reject') {
			subAdmin.approvalStatus = 'rejected';
			subAdmin.rejectedAt = new Date();
			subAdmin.rejectionReason = rejectionReason;
			await subAdminManagementRepository.saveSubAdmin(subAdmin);
			await subAdminManagementRepository.deleteSubAdminById(subAdminId);

			return {
				ok: true,
				message: 'SubAdmin application rejected and data deleted',
				data: {
					subAdminId,
					rejectionReason,
					rejectedAt: new Date(),
				},
			};
		}

		return { ok: false, statusCode: 400, message: 'Invalid action. Use "approve" or "reject"' };
	}

	return { ok: false, statusCode: 405, message: 'Method not allowed' };
}

module.exports = {
	getAllSubAdmins,
	toggleSubAdminStatus,
	getSubAdminDetails,
	manageSubAdminApproval,
};
