const MessageRequest = require('../userModel/messageRequestModel');
const Chat = require('../userModel/chatModel');
const User = require('../../auth/model/userAuthModel');
const ApiResponse = require('../../../utils/apiResponse');
const mongoose = require('mongoose');

// Send message request
async function sendMessageRequest(req, res) {
	try {
		console.log('[USER][MESSAGE_REQUEST] sendMessageRequest request');
		const { userId } = req.params || {};
		const { message = '' } = req.body || {};
		const currentUserId = req.user?.userId;

		if (!userId || userId === currentUserId) {
			return ApiResponse.badRequest(res, 'Invalid user ID or cannot send request to yourself');
		}

		// Check if both users exist and are active
		const [currentUser, targetUser] = await Promise.all([
			User.findById(currentUserId),
			User.findById(userId)
		]);

		if (!currentUser || !targetUser) {
			return ApiResponse.notFound(res, 'User not found');
		}

		if (!currentUser.isActive || !targetUser.isActive) {
			return ApiResponse.badRequest(res, 'Cannot send request to inactive users');
		}

		// Check if users can already chat (mutual followers)
		const canChatResult = await Chat.canUsersChat(currentUserId, userId);
		if (canChatResult.canChat && canChatResult.reason === 'mutual_follow') {
			return ApiResponse.badRequest(res, 'You can already chat with this user');
		}

		// Check if there's already an accepted chat
		const existingChat = await Chat.findOne({
			participants: { $all: [currentUserId, userId] },
			requestStatus: 'accepted'
		});

		if (existingChat) {
			return ApiResponse.badRequest(res, 'Chat already exists with this user');
		}

		// Create message request
		const request = await MessageRequest.createRequest(currentUserId, userId, message);

		console.log('[USER][MESSAGE_REQUEST] Message request sent successfully');
		return ApiResponse.created(res, {
			requestId: request._id,
			fromUserId: request.fromUserId,
			toUserId: request.toUserId,
			message: request.message,
			status: request.status,
			requestedAt: request.requestedAt,
			expiresAt: request.expiresAt
		}, 'Message request sent successfully');
	} catch (e) {
		console.error('[USER][MESSAGE_REQUEST] sendMessageRequest error:', e?.message || e);
		
		if (e.message.includes('already sent') || e.message.includes('already exists')) {
			return ApiResponse.conflict(res, e.message);
		}
		
		return ApiResponse.serverError(res, 'Failed to send message request');
	}
}

// Get pending message requests
async function getPendingRequests(req, res) {
	try {
		console.log('[USER][MESSAGE_REQUEST] getPendingRequests request');
		const { page = 1, limit = 20 } = req.query || {};
		const currentUserId = req.user?.userId;

		const requests = await MessageRequest.getPendingRequests(currentUserId, parseInt(page), parseInt(limit));

		console.log('[USER][MESSAGE_REQUEST] Pending requests fetched successfully');
		return ApiResponse.success(res, {
			requests,
			pagination: {
				page: parseInt(page),
				limit: parseInt(limit),
				total: requests.length
			}
		});
	} catch (e) {
		console.error('[USER][MESSAGE_REQUEST] getPendingRequests error:', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to fetch pending requests');
	}
}

// Get sent message requests
async function getSentRequests(req, res) {
	try {
		console.log('[USER][MESSAGE_REQUEST] getSentRequests request');
		const { page = 1, limit = 20 } = req.query || {};
		const currentUserId = req.user?.userId;

		const requests = await MessageRequest.getSentRequests(currentUserId, parseInt(page), parseInt(limit));

		console.log('[USER][MESSAGE_REQUEST] Sent requests fetched successfully');
		return ApiResponse.success(res, {
			requests,
			pagination: {
				page: parseInt(page),
				limit: parseInt(limit),
				total: requests.length
			}
		});
	} catch (e) {
		console.error('[USER][MESSAGE_REQUEST] getSentRequests error:', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to fetch sent requests');
	}
}

// Accept message request
async function acceptMessageRequest(req, res) {
	try {
		console.log('[USER][MESSAGE_REQUEST] acceptMessageRequest request');
		const { requestId } = req.params || {};
		const { responseMessage = '' } = req.body || {};
		const currentUserId = req.user?.userId;

		const request = await MessageRequest.findById(requestId)
			.populate('fromUserId', 'username fullName profilePictureUrl')
			.populate('toUserId', 'username fullName profilePictureUrl');

		if (!request) {
			return ApiResponse.notFound(res, 'Message request not found');
		}

		// Check if current user is the recipient
		if (request.toUserId._id.toString() !== currentUserId.toString()) {
			return ApiResponse.forbidden(res, 'You can only accept requests sent to you');
		}

		// Check if request is still pending
		if (request.status !== 'pending') {
			return ApiResponse.badRequest(res, 'Request is no longer pending');
		}

		// Check if request is expired
		if (request.isExpired()) {
			await request.expire();
			return ApiResponse.badRequest(res, 'Request has expired');
		}

		// Accept the request
		const chat = await request.accept(responseMessage);

		console.log('[USER][MESSAGE_REQUEST] Message request accepted successfully');
		return ApiResponse.success(res, {
			requestId: request._id,
			chatId: chat._id,
			status: request.status,
			respondedAt: request.respondedAt,
			chat: {
				chatId: chat._id,
				participants: chat.participants
			}
		}, 'Message request accepted successfully');
	} catch (e) {
		console.error('[USER][MESSAGE_REQUEST] acceptMessageRequest error:', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to accept message request');
	}
}

// Reject message request
async function rejectMessageRequest(req, res) {
	try {
		console.log('[USER][MESSAGE_REQUEST] rejectMessageRequest request');
		const { requestId } = req.params || {};
		const { responseMessage = '' } = req.body || {};
		const currentUserId = req.user?.userId;

		const request = await MessageRequest.findById(requestId)
			.populate('fromUserId', 'username fullName profilePictureUrl')
			.populate('toUserId', 'username fullName profilePictureUrl');

		if (!request) {
			return ApiResponse.notFound(res, 'Message request not found');
		}

		// Check if current user is the recipient
		if (request.toUserId._id.toString() !== currentUserId.toString()) {
			return ApiResponse.forbidden(res, 'You can only reject requests sent to you');
		}

		// Check if request is still pending
		if (request.status !== 'pending') {
			return ApiResponse.badRequest(res, 'Request is no longer pending');
		}

		// Reject the request
		await request.reject(responseMessage);

		console.log('[USER][MESSAGE_REQUEST] Message request rejected successfully');
		return ApiResponse.success(res, {
			requestId: request._id,
			status: request.status,
			respondedAt: request.respondedAt
		}, 'Message request rejected successfully');
	} catch (e) {
		console.error('[USER][MESSAGE_REQUEST] rejectMessageRequest error:', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to reject message request');
	}
}

// Delete message request
async function deleteMessageRequest(req, res) {
	try {
		console.log('[USER][MESSAGE_REQUEST] deleteMessageRequest request');
		const { requestId } = req.params || {};
		const currentUserId = req.user?.userId;

		const request = await MessageRequest.findById(requestId);

		if (!request) {
			return ApiResponse.notFound(res, 'Message request not found');
		}

		// Check if current user is the sender
		if (request.fromUserId.toString() !== currentUserId.toString()) {
			return ApiResponse.forbidden(res, 'You can only delete requests sent by you');
		}

		// Check if request is still pending
		if (request.status !== 'pending') {
			return ApiResponse.badRequest(res, 'Cannot delete non-pending requests');
		}

		await MessageRequest.findByIdAndDelete(requestId);

		console.log('[USER][MESSAGE_REQUEST] Message request deleted successfully');
		return ApiResponse.success(res, {
			requestId: request._id,
			message: 'Message request deleted successfully'
		}, 'Message request deleted successfully');
	} catch (e) {
		console.error('[USER][MESSAGE_REQUEST] deleteMessageRequest error:', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to delete message request');
	}
}

// Get message request details
async function getMessageRequestDetails(req, res) {
	try {
		console.log('[USER][MESSAGE_REQUEST] getMessageRequestDetails request');
		const { requestId } = req.params || {};
		const currentUserId = req.user?.userId;

		const request = await MessageRequest.findById(requestId)
			.populate('fromUserId', 'username fullName profilePictureUrl verificationStatus')
			.populate('toUserId', 'username fullName profilePictureUrl verificationStatus');

		if (!request) {
			return ApiResponse.notFound(res, 'Message request not found');
		}

		// Check if current user is either sender or recipient
		const isSender = request.fromUserId._id.toString() === currentUserId.toString();
		const isRecipient = request.toUserId._id.toString() === currentUserId.toString();

		if (!isSender && !isRecipient) {
			return ApiResponse.forbidden(res, 'Access denied to this request');
		}

		console.log('[USER][MESSAGE_REQUEST] Message request details fetched successfully');
		return ApiResponse.success(res, {
			...request.toObject(),
			isExpired: request.isExpired(),
			timeUntilExpiry: request.timeUntilExpiry
		});
	} catch (e) {
		console.error('[USER][MESSAGE_REQUEST] getMessageRequestDetails error:', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to fetch message request details');
	}
}

// Get message request statistics
async function getMessageRequestStats(req, res) {
	try {
		console.log('[USER][MESSAGE_REQUEST] getMessageRequestStats request');
		const currentUserId = req.user?.userId;

		const stats = await MessageRequest.getRequestStats(currentUserId);

		console.log('[USER][MESSAGE_REQUEST] Message request stats fetched successfully');
		return ApiResponse.success(res, stats);
	} catch (e) {
		console.error('[USER][MESSAGE_REQUEST] getMessageRequestStats error:', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to fetch message request statistics');
	}
}

// Get request between two users
async function getRequestBetweenUsers(req, res) {
	try {
		console.log('[USER][MESSAGE_REQUEST] getRequestBetweenUsers request');
		const { userId } = req.params || {};
		const currentUserId = req.user?.userId;

		if (!userId || userId === currentUserId) {
			return ApiResponse.badRequest(res, 'Invalid user ID');
		}

		const request = await MessageRequest.getRequestBetweenUsers(currentUserId, userId);

		if (!request) {
			return ApiResponse.notFound(res, 'No request found between these users');
		}

		console.log('[USER][MESSAGE_REQUEST] Request between users fetched successfully');
		return ApiResponse.success(res, {
			...request.toObject(),
			isExpired: request.isExpired(),
			timeUntilExpiry: request.timeUntilExpiry
		});
	} catch (e) {
		console.error('[USER][MESSAGE_REQUEST] getRequestBetweenUsers error:', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to fetch request between users');
	}
}

module.exports = {
	sendMessageRequest,
	getPendingRequests,
	getSentRequests,
	acceptMessageRequest,
	rejectMessageRequest,
	deleteMessageRequest,
	getMessageRequestDetails,
	getMessageRequestStats,
	getRequestBetweenUsers
};
