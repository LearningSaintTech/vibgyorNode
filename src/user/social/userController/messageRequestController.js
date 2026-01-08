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

		// Create message request with message (ensure message is always passed)
		const messageText = message || '';
		console.log('[USER][MESSAGE_REQUEST] Creating request with message:', {
			fromUserId: currentUserId,
			toUserId: userId,
			messageLength: messageText.length,
			hasMessage: messageText.trim().length > 0
		});
		
		const request = await MessageRequest.createRequest(currentUserId, userId, messageText);
		
		console.log('[USER][MESSAGE_REQUEST] Request created successfully:', {
			requestId: request._id,
			savedMessage: request.message,
			messageLength: request.message?.length || 0
		});

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

		// Log the request message before accepting
		console.log('[USER][MESSAGE_REQUEST] Accepting request with initial message:', {
			requestId: request._id,
			hasMessage: !!(request.message && request.message.trim()),
			messageLength: request.message?.length || 0,
			messagePreview: request.message ? request.message.substring(0, 50) + (request.message.length > 50 ? '...' : '') : 'no message'
		});

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
				.populate('senderId', 'username fullName profilePictureUrl');
				
				if (initialMessage) {
					console.log('[MESSAGE_REQUEST] Broadcasting initial message:', {
						messageId: initialMessage._id,
						chatId: chat._id
					});
					
					// Broadcast message via realtime service
					if (enhancedRealtimeService.io) {
						enhancedRealtimeService.emitToChat(chat._id.toString(), 'message_received', {
							message: initialMessage
						});
					}
				}
			} catch (broadcastError) {
				console.error('[MESSAGE_REQUEST] Error broadcasting initial message:', broadcastError);
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
			console.error('[MESSAGE_REQUEST] Notification error:', notificationError);
			// Don't fail acceptance if notification fails
		}

		const initialMessageSent = requestMessage !== '';
		
		console.log('[USER][MESSAGE_REQUEST] Message request accepted successfully:', {
			requestId: request._id,
			chatId: chat._id,
			initialMessageSent,
			messageLength: requestMessage.length
		});
		
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
