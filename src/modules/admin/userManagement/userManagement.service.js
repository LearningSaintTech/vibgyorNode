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
		const socialChat = await userManagementRepository.findDirectChatBetweenUsers(
			reporterId,
			reportedUserId
		);
		if (socialChat) {
			const messages = await userManagementRepository.findChatMessagesForModeration(
				socialChat._id,
				100
			);
			return {
				chatId: socialChat._id,
				source: 'reporter_chat',
				messages: messages.reverse().map(formatModerationMessage),
				highlightedMessageId,
			};
		}

		const datingChat = await userManagementRepository.findDatingChatBetweenUsers(
			reporterId,
			reportedUserId
		);
		if (datingChat) {
			const messages = await userManagementRepository.findDatingMessagesForModeration(
				datingChat._id,
				100
			);
			return {
				chatId: datingChat._id,
				source: 'dating_chat',
				messages: messages.reverse().map(formatModerationMessage),
				highlightedMessageId,
			};
		}
	}

	const senderIds = [reportedUserId, reporterId].filter(Boolean);
	const recentSocial = await userManagementRepository.findRecentMessagesBySenders(senderIds, 100);
	if (recentSocial.length) {
		return {
			chatId: null,
			source: 'recent_messages',
			messages: recentSocial.reverse().map(formatModerationMessage),
			highlightedMessageId,
		};
	}

	const recentDating = await userManagementRepository.findRecentDatingMessagesBySenders(
		senderIds,
		100
	);
	return {
		chatId: null,
		source: recentDating.length ? 'recent_dating_messages' : 'none',
		messages: recentDating.reverse().map(formatModerationMessage),
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

async function getReports(query = {}) {
	const { page, limit, skip } = userManagementRepository.parsePagination(query);
	const filter = userManagementRepository.buildReportListFilter(query);
	const { reports, total } = await userManagementRepository.findReports(filter, {
		skip,
		limit,
	});

	return {
		ok: true,
		data: {
			reports,
			pagination: userManagementRepository.buildPaginationMeta(page, limit, total),
		},
	};
}

async function getPendingReports(query = {}) {
	const { page, limit, skip } = userManagementRepository.parsePagination(query);
	const filter = userManagementRepository.buildReportListFilter(query, 'pending');
	const { reports, total } = await userManagementRepository.findReports(filter, {
		skip,
		limit,
	});

	return {
		ok: true,
		data: {
			pendingReports: reports,
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
	const allowedActions = [
		'none',
		'warning',
		'temporary_ban',
		'permanent_ban',
		'content_removed',
		'account_suspended',
	];
	const allowedPriorities = ['low', 'medium', 'high', 'urgent'];
	const suspendActions = ['temporary_ban', 'permanent_ban', 'account_suspended'];

	if (!mongoose.Types.ObjectId.isValid(reportId)) {
		return { ok: false, statusCode: 400, message: 'Invalid report ID', code: 'INVALID_REPORT_ID' };
	}

	if (!status || !['under_review', 'resolved', 'dismissed'].includes(status)) {
		return { ok: false, statusCode: 400, message: 'Valid status is required' };
	}

	if (actionTaken && !allowedActions.includes(actionTaken)) {
		return { ok: false, statusCode: 400, message: 'Valid actionTaken is required' };
	}

	if (priority && !allowedPriorities.includes(priority)) {
		return { ok: false, statusCode: 400, message: 'Valid priority is required' };
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
	if (typeof reviewNotes === 'string') report.reviewNotes = reviewNotes.trim();
	if (priority) report.priority = priority;
	await userManagementRepository.saveReport(report);

	if (suspendActions.includes(report.actionTaken) && report.reportedUser) {
		const reportedUser = await userManagementRepository.findUserById(report.reportedUser);
		if (reportedUser && reportedUser.isActive !== false) {
			reportedUser.isActive = false;
			await userManagementRepository.saveUser(reportedUser);
		}
	}

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
			accountSuspended: suspendActions.includes(report.actionTaken),
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
	getReports,
	getPendingReports,
	getReportDetails,
	updateReportStatus,
	getReportStats,
};
