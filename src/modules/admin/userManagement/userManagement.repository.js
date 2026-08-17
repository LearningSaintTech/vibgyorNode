const User = require('../../user/user.model');
const Report = require('../../social/graph/userReport.model');
const Chat = require('../../social/chat/chat.model');
const Message = require('../../social/message/message.model');
const DatingChat = require('../../dating/chat/datingChat.model');
const DatingMessage = require('../../dating/message/datingMessage.model');

const USER_SAFE_SELECT = '-otpCode -emailOtpCode -otpExpiresAt -emailOtpExpiresAt';
const BASE_USER_FILTER = { role: { $nin: ['admin', 'subadmin'] } };
const REPORT_USER_SELECT =
	'_id username fullName email phoneNumber countryCode profilePictureUrl verificationStatus isActive role gender location createdAt';
const REPORT_REVIEWER_SELECT = '_id firstName lastName email';

function buildUserListFilter({ status, search, type } = {}) {
	const filter = { ...BASE_USER_FILTER };

	// Frontend admin panels send type=verified|pending|rejected|deactivated|all
	const normalizedType = String(type || '').trim().toLowerCase();
	if (normalizedType && normalizedType !== 'all') {
		if (normalizedType === 'verified') {
			filter.verificationStatus = 'approved';
		} else if (normalizedType === 'pending') {
			filter.verificationStatus = 'pending';
		} else if (normalizedType === 'rejected') {
			filter.verificationStatus = 'rejected';
		} else if (normalizedType === 'deactivated') {
			filter.isActive = false;
		}
	}

	// Preserve legacy status=active|inactive (does not override explicit deactivated type)
	if (status && ['active', 'inactive'].includes(status) && normalizedType !== 'deactivated') {
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
	const filter = { ...BASE_USER_FILTER, verificationStatus: 'pending' };
	const pendingVerifications = await User.find(filter)
		.select(USER_SAFE_SELECT)
		.sort({ 'verificationDocument.uploadedAt': -1 })
		.skip(skip)
		.limit(limit)
		.lean();
	const total = await User.countDocuments(filter);
	return { pendingVerifications, total, filter };
}

function buildReportListFilter({ status, reportType, priority } = {}, defaultStatus = null) {
	const filter = {};
	const requested = String(status || '').trim().toLowerCase();
	const fallback = String(defaultStatus || '').trim().toLowerCase();
	const normalizedStatus = fallback || requested;
	if (['pending', 'under_review', 'resolved', 'dismissed'].includes(normalizedStatus)) {
		filter.status = normalizedStatus;
	}
	if (reportType) filter.reportType = reportType;
	if (priority) filter.priority = priority;
	return filter;
}

async function findReports(filter, { skip, limit }) {
	const reports = await Report.find(filter)
		.populate('reporter', REPORT_USER_SELECT)
		.populate('reportedUser', REPORT_USER_SELECT)
		.sort({ createdAt: -1 })
		.skip(skip)
		.limit(limit)
		.lean();
	const total = await Report.countDocuments(filter);
	return { reports, total };
}

async function findReportDetailsById(reportId) {
	return Report.findById(reportId)
		.populate('reporter', REPORT_USER_SELECT)
		.populate('reportedUser', REPORT_USER_SELECT)
		.populate('reviewedBy', REPORT_REVIEWER_SELECT)
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

async function findDirectChatBetweenUsers(userId1, userId2) {
	return Chat.findOne({
		participants: { $all: [userId1, userId2] },
		chatType: 'direct',
	}).lean();
}

async function findChatMessagesForModeration(chatId, limit = 100) {
	return Message.find({ chatId })
		.sort({ createdAt: -1 })
		.limit(limit)
		.populate('senderId', 'username fullName profilePictureUrl')
		.lean();
}

async function findRecentMessagesBySenders(senderIds, limit = 50) {
	return Message.find({ senderId: { $in: senderIds } })
		.sort({ createdAt: -1 })
		.limit(limit)
		.populate('senderId', 'username fullName profilePictureUrl')
		.lean();
}

async function findDatingChatBetweenUsers(userId1, userId2) {
	return DatingChat.findOne({
		participants: { $all: [userId1, userId2] },
		chatType: 'direct',
	}).lean();
}

async function findDatingMessagesForModeration(chatId, limit = 100) {
	return DatingMessage.find({ chatId })
		.sort({ createdAt: -1 })
		.limit(limit)
		.populate('senderId', 'username fullName profilePictureUrl')
		.lean();
}

async function findRecentDatingMessagesBySenders(senderIds, limit = 50) {
	return DatingMessage.find({ senderId: { $in: senderIds } })
		.sort({ createdAt: -1 })
		.limit(limit)
		.populate('senderId', 'username fullName profilePictureUrl')
		.lean();
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
	findReports,
	findReportDetailsById,
	findReportById,
	saveReport,
	populateReportSummary,
	getReportStatsSummary,
	findDirectChatBetweenUsers,
	findChatMessagesForModeration,
	findRecentMessagesBySenders,
	findDatingChatBetweenUsers,
	findDatingMessagesForModeration,
	findRecentDatingMessagesBySenders,
};
