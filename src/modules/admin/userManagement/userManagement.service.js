const mongoose = require('mongoose');
const userManagementRepository = require('./userManagement.repository');

function formatReportUser(user) {
	if (!user) return null;
	return {
		_id: user._id,
		username: user.username || '',
		fullName: user.fullName || '',
		email: user.email || '',
		phoneNumber: user.phoneNumber || '',
		countryCode: user.countryCode || '',
		profilePictureUrl: user.profilePictureUrl || '',
		verificationStatus: user.verificationStatus || 'none',
		isActive: user.isActive !== false,
		role: user.role || 'user',
		gender: user.gender || '',
		location: user.location || null,
		createdAt: user.createdAt || null,
	};
}

function formatModerationMessage(message) {
	const sender = message.senderId;
	return {
		_id: message._id,
		chatId: message.chatId,
		content: message.isDeleted ? '[Message deleted]' : message.content || '',
		type: message.type,
		createdAt: message.createdAt,
		isDeleted: Boolean(message.isDeleted),
		deletedForEveryone: Boolean(message.deletedForEveryone),
		media: message.media?.url
			? { url: message.media.url, mimeType: message.media.mimeType || '' }
			: null,
		sender: {
			_id: sender?._id || null,
			username: sender?.username || '',
			fullName: sender?.fullName || '',
			profilePictureUrl: sender?.profilePictureUrl || '',
		},
	};
}

async function getReportMessages(report) {
	const reporterId = report.reporter?._id;
	const reportedUserId = report.reportedUser?._id;
	const highlightedMessageId = report.reportedContent?.contentId || null;

	if (!reportedUserId) {
		return { chatId: null, source: 'none', messages: [], highlightedMessageId };
	}

	if (reporterId) {
		const chat = await userManagementRepository.findDirectChatBetweenUsers(
			reporterId,
			reportedUserId
		);
		if (chat) {
			const messages = await userManagementRepository.findChatMessagesForModeration(chat._id, 100);
			return {
				chatId: chat._id,
				source: 'reporter_chat',
				messages: messages.reverse().map(formatModerationMessage),
				highlightedMessageId,
			};
		}
	}

	// No direct chat found: fall back to recent messages from both users
	const senderIds = [reportedUserId, reporterId].filter(Boolean);
	const recentMessages = await userManagementRepository.findRecentMessagesBySenders(
		senderIds,
		100
	);
	return {
		chatId: null,
		source: 'recent_messages',
		messages: recentMessages.reverse().map(formatModerationMessage),
		highlightedMessageId,
	};
}

function formatReportDetails(report, messageReview = null) {
	return {
		...report,
		reporter: formatReportUser(report.reporter),
		reportedUser: formatReportUser(report.reportedUser),
		report: {
			_id: report._id,
			reportType: report.reportType,
			description: report.description,
			status: report.status,
			priority: report.priority,
			actionTaken: report.actionTaken,
			reviewNotes: report.reviewNotes || '',
			reportedContent: report.reportedContent || null,
			reviewerRole: report.reviewerRole || null,
			reviewedBy: report.reviewedBy || null,
			reviewedAt: report.reviewedAt || null,
			createdAt: report.createdAt,
			updatedAt: report.updatedAt,
		},
		messageReview: messageReview || { chatId: null, source: 'none', messages: [], highlightedMessageId: null },
	};
}

async function getAllUsers(query = {}) {
	const { page, limit, skip } = userManagementRepository.parsePagination(query);
	const filter = userManagementRepository.buildUserListFilter(query);

	const users = await userManagementRepository.findUsers(filter, { skip, limit });
	const total = await userManagementRepository.countUsers(filter);

	return {
		ok: true,
		data: {
			users,
			pagination: userManagementRepository.buildPaginationMeta(page, limit, total),
		},
	};
}

async function toggleUserStatus(userId, isActive) {
	if (typeof isActive !== 'boolean') {
		return { ok: false, statusCode: 400, message: 'isActive must be a boolean value' };
	}

	const user = await userManagementRepository.findUserById(userId);
	if (!user) {
		return { ok: false, statusCode: 404, message: 'User not found' };
	}

	user.isActive = isActive;
	await userManagementRepository.saveUser(user);

	return {
		ok: true,
		message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
		data: {
			userId: user._id,
			username: user.username,
			fullName: user.fullName,
			isActive: user.isActive,
		},
	};
}

async function getUserDetails(userId) {
	const user = await userManagementRepository.findUserDetailsById(userId);
	if (!user) {
		return { ok: false, statusCode: 404, message: 'User not found' };
	}

	return { ok: true, data: user };
}

async function getPendingVerifications(query = {}) {
	const { page, limit, skip } = userManagementRepository.parsePagination(query);
	const { pendingVerifications, total } = await userManagementRepository.findPendingVerifications({
		skip,
		limit,
	});

	return {
		ok: true,
		data: {
			pendingVerifications,
			pagination: userManagementRepository.buildPaginationMeta(page, limit, total),
		},
	};
}

async function approveUserVerification(userId, reviewer) {
	const reviewerId = reviewer?.userId;
	const reviewerRole = reviewer?.role === 'admin' ? 'admin' : 'subadmin';

	const user = await userManagementRepository.findUserById(userId);
	if (!user) {
		return { ok: false, statusCode: 404, message: 'User not found' };
	}

	if (user.verificationStatus !== 'pending') {
		return { ok: false, statusCode: 400, message: 'User verification is not pending' };
	}

	user.verificationStatus = 'approved';
	user.verificationDocument.reviewedBy = reviewerId;
	user.verificationDocument.reviewedAt = new Date();
	user.verificationDocument.reviewerRole = reviewerRole;
	user.verificationDocument.rejectionReason = '';
	await userManagementRepository.saveUser(user);

	return {
		ok: true,
		message: 'User verification approved successfully',
		data: {
			userId: user._id,
			username: user.username,
			fullName: user.fullName,
			verificationStatus: user.verificationStatus,
			reviewedAt: user.verificationDocument.reviewedAt,
			reviewerRole: user.verificationDocument.reviewerRole,
		},
	};
}

async function rejectUserVerification(userId, { rejectionReason }, reviewer) {
	const reviewerId = reviewer?.userId;
	const reviewerRole = reviewer?.role === 'admin' ? 'admin' : 'subadmin';

	if (!rejectionReason || rejectionReason.trim() === '') {
		return { ok: false, statusCode: 400, message: 'Rejection reason is required' };
	}

	const user = await userManagementRepository.findUserById(userId);
	if (!user) {
		return { ok: false, statusCode: 404, message: 'User not found' };
	}

	if (user.verificationStatus !== 'pending') {
		return { ok: false, statusCode: 400, message: 'User verification is not pending' };
	}

	user.verificationStatus = 'rejected';
	user.verificationDocument.reviewedBy = reviewerId;
	user.verificationDocument.reviewedAt = new Date();
	user.verificationDocument.reviewerRole = reviewerRole;
	user.verificationDocument.rejectionReason = rejectionReason.trim();
	await userManagementRepository.saveUser(user);

	return {
		ok: true,
		message: 'User verification rejected successfully',
		data: {
			userId: user._id,
			username: user.username,
			fullName: user.fullName,
			verificationStatus: user.verificationStatus,
			rejectionReason: user.verificationDocument.rejectionReason,
			reviewedAt: user.verificationDocument.reviewedAt,
			reviewerRole: user.verificationDocument.reviewerRole,
		},
	};
}

async function getPendingReports(query = {}) {
	const { page, limit, skip } = userManagementRepository.parsePagination(query);
	const filter = userManagementRepository.buildReportListFilter(query);
	const { pendingReports, total } = await userManagementRepository.findPendingReports(filter, {
		skip,
		limit,
	});

	return {
		ok: true,
		data: {
			pendingReports,
			pagination: userManagementRepository.buildPaginationMeta(page, limit, total),
		},
	};
}

async function getReportDetails(reportId) {
	if (!mongoose.Types.ObjectId.isValid(reportId)) {
		return { ok: false, statusCode: 400, message: 'Invalid report ID', code: 'INVALID_REPORT_ID' };
	}

	const report = await userManagementRepository.findReportDetailsById(reportId);
	if (!report) {
		return { ok: false, statusCode: 404, message: 'Report not found' };
	}

	const messageReview = await getReportMessages(report);
	return { ok: true, data: formatReportDetails(report, messageReview) };
}

async function updateReportStatus(reportId, body, reviewer) {
	const { status, actionTaken, reviewNotes, priority } = body || {};
	const reviewerId = reviewer?.userId;
	const reviewerRole = reviewer?.role === 'admin' ? 'admin' : 'subadmin';

	if (!status || !['under_review', 'resolved', 'dismissed'].includes(status)) {
		return { ok: false, statusCode: 400, message: 'Valid status is required' };
	}

	const report = await userManagementRepository.findReportById(reportId);
	if (!report) {
		return { ok: false, statusCode: 404, message: 'Report not found' };
	}

	report.status = status;
	report.reviewedBy = reviewerId;
	report.reviewedAt = new Date();
	report.reviewerRole = reviewerRole;
	if (actionTaken) report.actionTaken = actionTaken;
	if (reviewNotes) report.reviewNotes = reviewNotes;
	if (priority) report.priority = priority;
	await userManagementRepository.saveReport(report);

	await userManagementRepository.populateReportSummary(report);

	return {
		ok: true,
		message: 'Report status updated successfully',
		data: {
			reportId: report._id,
			status: report.status,
			actionTaken: report.actionTaken,
			reviewedAt: report.reviewedAt,
			reviewerRole: report.reviewerRole,
			reporter: report.reporter.username || report.reporter.fullName,
			reportedUser: report.reportedUser.username || report.reportedUser.fullName,
		},
	};
}

async function getReportStats() {
	const data = await userManagementRepository.getReportStatsSummary();
	return { ok: true, data };
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
