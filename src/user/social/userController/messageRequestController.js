const MessageRequest = require('../userModel/messageRequestModel');
const Chat = require('../userModel/chatModel');
const User = require('../../auth/model/userAuthModel');
const ApiResponse = require('../../../utils/apiResponse');
const mongoose = require('mongoose');
const notificationService = require('../../../notification/services/notificationService');
const MessageService = require('../services/messageService');
const enhancedRealtimeService = require('../../../services/enhancedRealtimeService');

// Send message request
async function sendMessageRequest(req, res) {
	try {
		const { userId } = req.params || {};
		const { message = '' } = req.body || {};
		const currentUserId = req.user?.userId;

		if (!userId || userId === currentUserId) {
			return ApiResponse.badRequest(res, 'Invalid user ID or cannot send request to yourself');
		}

		// Check if both users exist and are active
		const [currentUser, targetUser] = await Promise.all([
			User.findById(currentUserId).select('isActive').lean(),
			User.findById(userId).select('isActive').lean()
		]);

		if (!currentUser || !targetUser) {
			return ApiResponse.notFound(res, 'User not found');
		}

		if (!currentUser.isActive || !targetUser.isActive) {
			return ApiResponse.badRequest(res, 'Cannot send request to inactive users');
		}

		// Check if users can already chat (any reason - existing chat, mutual follow, etc.)
		// This already checks for existing chats, so no need for separate check
		const canChatResult = await Chat.canUsersChat(currentUserId, userId);
		if (canChatResult.canChat) {
			return ApiResponse.badRequest(res, 'You can already chat with this user');
		}

		// Create message request with message (ensure message is always passed)
		const messageText = message || '';
		const request = await MessageRequest.createRequest(currentUserId, userId, messageText);

		// Send notification to target user
		try {
			await notificationService.create({
				context: 'social',
				type: 'message_request',
				recipientId: userId, // Target user
				senderId: currentUserId,
				data: {
					requestId: request._id.toString(),
					message: message || '',
					contentType: 'message_request'
				}
			});
		} catch (notificationError) {
			console.error('[MESSAGE_REQUEST] Notification error:', notificationError);
			// Don't fail request creation if notification fails
		}

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
		const { page = 1, limit = 20 } = req.query || {};
		const currentUserId = req.user?.userId;

		const requests = await MessageRequest.getPendingRequests(currentUserId, parseInt(page), parseInt(limit));

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
		const { page = 1, limit = 20 } = req.query || {};
		const currentUserId = req.user?.userId;

		const requests = await MessageRequest.getSentRequests(currentUserId, parseInt(page), parseInt(limit));

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

		// Accept the request (this will create the chat and send initial message if present)
		const chat = await request.accept(responseMessage);

		// If there was an initial message, broadcast it via realtime service
		// Note: The accept method already creates and saves the message, but we need to broadcast it
		const requestMessage = request.message ? request.message.trim() : '';
		if (requestMessage !== '') {
			try {
				// Get the last message from the chat (should be the initial message we just created)
				const Message = mongoose.model('Message');
				const initialMessage = await Message.findOne({ 
					chatId: chat._id,
					senderId: request.fromUserId
				})
				.sort({ createdAt: -1 })
				.limit(1)
				.populate('senderId', 'username fullName profilePictureUrl')
				.lean();
				
				if (initialMessage && enhancedRealtimeService.io) {
					// Broadcast message via realtime service
					enhancedRealtimeService.emitToChat(chat._id.toString(), 'message_received', {
						message: initialMessage
					});
				}
			} catch (broadcastError) {
				console.error('[MESSAGE_REQUEST] Error broadcasting initial message:', broadcastError?.message || broadcastError);
				// Don't fail acceptance if broadcast fails
			}
		}

		// Notify original requester that request was accepted
		try {
			await notificationService.create({
				context: 'social',
				type: 'message_request',
				recipientId: request.fromUserId.toString(),
				senderId: request.toUserId.toString(),
				data: {
					requestId: request._id.toString(),
					chatId: chat._id.toString(),
					status: 'accepted',
					contentType: 'message_request'
				}
			});
		} catch (notificationError) {
			console.error('[MESSAGE_REQUEST] Notification error:', notificationError?.message || notificationError);
			// Don't fail acceptance if notification fails
		}

		const initialMessageSent = requestMessage !== '';
		
		return ApiResponse.success(res, {
			requestId: request._id,
			chatId: chat._id,
			status: request.status,
			respondedAt: request.respondedAt,
			initialMessageSent,
			initialMessage: initialMessageSent ? requestMessage : null,
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
		const { requestId } = req.params || {};
		const currentUserId = req.user?.userId;

		const request = await MessageRequest.findById(requestId).select('fromUserId status');

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
		const { requestId } = req.params || {};
		const currentUserId = req.user?.userId;

		const request = await MessageRequest.findById(requestId)
			.populate('fromUserId', 'username fullName profilePictureUrl verificationStatus')
			.populate('toUserId', 'username fullName profilePictureUrl verificationStatus')
			.lean();

		if (!request) {
			return ApiResponse.notFound(res, 'Message request not found');
		}

		// Check if current user is either sender or recipient
		const isSender = request.fromUserId._id.toString() === currentUserId.toString();
		const isRecipient = request.toUserId._id.toString() === currentUserId.toString();

		if (!isSender && !isRecipient) {
			return ApiResponse.forbidden(res, 'Access denied to this request');
		}

		// Convert to plain object and add virtuals
		return ApiResponse.success(res, {
			...request,
			isExpired: request.expiresAt ? Date.now() > new Date(request.expiresAt).getTime() : false,
			timeUntilExpiry: request.expiresAt ? Math.floor((new Date(request.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60)) : null
		});
	} catch (e) {
		console.error('[USER][MESSAGE_REQUEST] getMessageRequestDetails error:', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to fetch message request details');
	}
}

// Get message request statistics
async function getMessageRequestStats(req, res) {
	try {
		const currentUserId = req.user?.userId;

		const stats = await MessageRequest.getRequestStats(currentUserId);

		return ApiResponse.success(res, stats);
	} catch (e) {
		console.error('[USER][MESSAGE_REQUEST] getMessageRequestStats error:', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to fetch message request statistics');
	}
}

// Get request between two users
async function getRequestBetweenUsers(req, res) {
	try {
		const { userId } = req.params || {};
		const currentUserId = req.user?.userId;

		if (!userId || userId === currentUserId) {
			return ApiResponse.badRequest(res, 'Invalid user ID');
		}

		const request = await MessageRequest.getRequestBetweenUsers(currentUserId, userId);

		if (!request) {
			return ApiResponse.notFound(res, 'No request found between these users');
		}

		// Convert to plain object and add virtuals
		const requestObj = request.toObject ? request.toObject() : request;
		return ApiResponse.success(res, {
			...requestObj,
			isExpired: requestObj.expiresAt ? Date.now() > new Date(requestObj.expiresAt).getTime() : false,
			timeUntilExpiry: requestObj.expiresAt ? Math.floor((new Date(requestObj.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60)) : null
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
