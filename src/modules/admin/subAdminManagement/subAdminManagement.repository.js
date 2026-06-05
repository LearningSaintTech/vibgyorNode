const SubAdmin = require('../../subAdmin/auth/subAdmin.model');

const SUBADMIN_SAFE_SELECT = '-otpCode -otpExpiresAt';

function buildSubAdminListFilter({ status, search } = {}) {
	const filter = {};
	if (status && ['active', 'inactive'].includes(status)) {
		filter.isActive = status === 'active';
	}
	if (search) {
		filter.$or = [
			{ name: { $regex: search, $options: 'i' } },
			{ email: { $regex: search, $options: 'i' } },
			{ phoneNumber: { $regex: search, $options: 'i' } },
		];
	}
	return filter;
}

function parsePagination({ page = 1, limit = 10 } = {}) {
	const pageNum = parseInt(page, 10);
	const limitNum = parseInt(limit, 10);
	return { page: pageNum, limit: limitNum, skip: (pageNum - 1) * limitNum };
}

function buildPaginationMeta(page, limit, total) {
	return { page, limit, total, pages: Math.ceil(total / limit) };
}

async function findSubAdmins(filter, { skip, limit }) {
	return SubAdmin.find(filter)
		.select(SUBADMIN_SAFE_SELECT)
		.sort({ createdAt: -1 })
		.skip(skip)
		.limit(limit)
		.lean();
}

async function countSubAdmins(filter) {
	return SubAdmin.countDocuments(filter);
}

async function findSubAdminById(subAdminId) {
	return SubAdmin.findById(subAdminId);
}

async function findSubAdminDetailsById(subAdminId) {
	return SubAdmin.findById(subAdminId).select(SUBADMIN_SAFE_SELECT).lean();
}

async function saveSubAdmin(subAdmin) {
	return subAdmin.save();
}

async function deleteSubAdminById(subAdminId) {
	return SubAdmin.findByIdAndDelete(subAdminId);
}

async function findPendingSubAdmins({ skip, limit }) {
	const filter = { approvalStatus: 'pending' };
	const pendingSubAdmins = await SubAdmin.find(filter)
		.select(SUBADMIN_SAFE_SELECT)
		.sort({ createdAt: -1 })
		.skip(skip)
		.limit(limit)
		.lean();
	const total = await SubAdmin.countDocuments(filter);
	return { pendingSubAdmins, total };
}

module.exports = {
	buildSubAdminListFilter,
	parsePagination,
	buildPaginationMeta,
	findSubAdmins,
	countSubAdmins,
	findSubAdminById,
	findSubAdminDetailsById,
	saveSubAdmin,
	deleteSubAdminById,
	findPendingSubAdmins,
};
