const User = require('../../user/user.model');
const Report = require('../../social/graph/userReport.model');

const USER_SAFE_SELECT = '-otpCode -emailOtpCode -otpExpiresAt -emailOtpExpiresAt';

function buildUserListFilter({ status, search } = {}) {
	const filter = {};
	if (status && ['active', 'inactive'].includes(status)) {
		filter.isActive = status === 'active';
	}
	if (search) {
		filter.$or = [
			{ fullName: { $regex: search, $options: 'i' } },
			{ username: { $regex: search, $options: 'i' } },
			{ email: { $regex: search, $options: 'i' } },
			{ phoneNumber: { $regex: search, $options: 'i' } },
		];
	}
	return filter;
}

function parsePagination({ page = 1, limit = 10 } = {}) {
	const pageNum = parseInt(page, 10);
	const limitNum = parseInt(limit, 10);
	return {
		page: pageNum,
		limit: limitNum,
		skip: (pageNum - 1) * limitNum,
	};
}

function buildPaginationMeta(page, limit, total) {
	return {
		page,
		limit,
		total,
		pages: Math.ceil(total / limit),
	};
}

async function findUsers(filter, { skip, limit }) {
	return User.find(filter)
		.select(USER_SAFE_SELECT)
		.sort({ createdAt: -1 })
		.skip(skip)
		.limit(limit)
		.lean();
}

async function countUsers(filter) {
	return User.countDocuments(filter);
}

async function findUserById(userId) {
	return User.findById(userId);
}

async function findUserDetailsById(userId) {
	return User.findById(userId).select(USER_SAFE_SELECT).lean();
}

async function saveUser(user) {
	return user.save();
}

async function findPendingVerifications({ skip, limit }) {
	const filter = { verificationStatus: 'pending' };
	const pendingVerifications = await User.find(filter)
		.select(USER_SAFE_SELECT)
		.sort({ 'verificationDocument.uploadedAt': -1 })
		.skip(skip)
		.limit(limit)
		.lean();
	const total = await User.countDocuments(filter);
	return { pendingVerifications, total, filter };
}

function buildReportListFilter({ reportType, priority } = {}) {
	const filter = { status: 'pending' };
	if (reportType) filter.reportType = reportType;
	if (priority) filter.priority = priority;
	return filter;
}

async function findPendingReports(filter, { skip, limit }) {
	const pendingReports = await Report.find(filter)
		.populate('reporter', 'username fullName email phoneNumber')
		.populate('reportedUser', 'username fullName email phoneNumber')
		.sort({ createdAt: -1 })
		.skip(skip)
		.limit(limit)
		.lean();
	const total = await Report.countDocuments(filter);
	return { pendingReports, total };
}

async function findReportDetailsById(reportId) {
	return Report.findById(reportId)
		.populate('reporter', 'username fullName email phoneNumber')
		.populate('reportedUser', 'username fullName email phoneNumber')
		.populate('reviewedBy', 'name email')
		.lean();
}

async function findReportById(reportId) {
	return Report.findById(reportId);
}

async function saveReport(report) {
	return report.save();
}

async function populateReportSummary(report) {
	return report.populate([
		{ path: 'reporter', select: 'username fullName' },
		{ path: 'reportedUser', select: 'username fullName' },
	]);
}

async function getReportStatsSummary() {
	const stats = await Report.getStats();
	const totalReports = await Report.countDocuments();
	const recentReports = await Report.countDocuments({
		createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
	});
	return { totalReports, recentReports, ...stats };
}

module.exports = {
	buildUserListFilter,
	parsePagination,
	buildPaginationMeta,
	findUsers,
	countUsers,
	findUserById,
	findUserDetailsById,
	saveUser,
	findPendingVerifications,
	buildReportListFilter,
	findPendingReports,
	findReportDetailsById,
	findReportById,
	saveReport,
	populateReportSummary,
	getReportStatsSummary,
};
