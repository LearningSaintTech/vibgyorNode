const MessageRequest = require('../userModel/messageRequestModel');
const Chat = require('../userModel/chatModel');
const User = require('../../auth/model/userAuthModel');
const ApiResponse = require('../../../utils/apiResponse');
const mongoose = require('mongoose');
const notificationService = require('../../../notification/services/notificationService');
const MessageService = require('../services/messageService');
const enhancedRealtimeService = require('../../../services/enhancedRealtimeService');
const { invalidateUserCache, cacheService } = require('../../../middleware/cacheMiddleware');

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
			
			// Invalidate notification cache for recipient (new notification added)
			try {
				invalidateUserCache(userId, 'notifications:*');
				cacheService.deletePattern(`cache:GET:/api/v1/notifications*:${userId}*`);
				cacheService.deletePattern(`cache:GET:/notifications*:${userId}*`);
				console.log('[MESSAGE_REQUEST] ✅ Notification cache invalidated for recipient (new notification)');
			} catch (cacheError) {
				console.error('[MESSAGE_REQUEST] Error invalidating notification cache:', cacheError);
			}
		} catch (notificationError) {
			console.error('[MESSAGE_REQUEST] Notification error:', notificationError);
			// Don't fail request creation if notification fails
		}

		// Invalidate cache for recipient (new request added to their pending list)
		try {
			invalidateUserCache(userId, 'message-requests:*');
			cacheService.deletePattern(`cache:GET:/user/message-requests/pending:*:${userId}*`);
			console.log('[MESSAGE_REQUEST] ✅ Cache invalidated for recipient (new request)');
		} catch (cacheError) {
			console.error('[MESSAGE_REQUEST] Error invalidating cache:', cacheError);
			// Don't fail request creation if cache invalidation fails
		}

		// Emit real-time event to recipient
		try {
			const currentUser = await User.findById(currentUserId).select('username fullName profilePictureUrl').lean();
			if (!currentUser) {
				console.error('[MESSAGE_REQUEST] ⚠️ Current user not found for real-time event:', currentUserId);
			} else {
				enhancedRealtimeService.emitToUser(
					userId, // recipient
					'message_request:received',
					{
						requestId: request._id.toString(),
						fromUser: {
							_id: currentUser._id?.toString() || currentUserId.toString(),
							id: currentUser._id?.toString() || currentUserId.toString(),
							username: currentUser.username || '',
							fullName: currentUser.fullName || '',
							profilePictureUrl: currentUser.profilePictureUrl || '',
							verificationStatus: currentUser.verificationStatus || 'none'
						},
						message: request.message || '',
						createdAt: request.requestedAt || request.createdAt,
						timestamp: new Date()
					}
				);
				console.log('[MESSAGE_REQUEST] ✅ Real-time event emitted: message_request:received to user', userId);
			}
		} catch (realtimeError) {
			console.error('[MESSAGE_REQUEST] Error emitting real-time event:', realtimeError);
			// Don't fail the request if real-time event fails
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

		// Invalidate any stale cache before fetching fresh data
		// This ensures we don't return cached data with rejected/deleted requests
		try {
			invalidateUserCache(currentUserId, 'message-requests:*');
			cacheService.deletePattern(`cache:GET:/user/message-requests/pending:*:${currentUserId}*`);
		} catch (cacheError) {
			console.error('[MESSAGE_REQUEST] Error invalidating cache in getPendingRequests:', cacheError);
			// Continue even if cache invalidation fails
		}

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

		// Invalidate any stale cache before fetching fresh data
		// This ensures we don't return cached data with rejected/deleted requests
		try {
			invalidateUserCache(currentUserId, 'message-requests:*');
			cacheService.deletePattern(`cache:GET:/user/message-requests/sent:*:${currentUserId}*`);
		} catch (cacheError) {
			console.error('[MESSAGE_REQUEST] Error invalidating cache in getSentRequests:', cacheError);
			// Continue even if cache invalidation fails
		}

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

		// Extract user IDs as strings (handle both populated objects and direct IDs)
		const requesterId = (request.fromUserId._id || request.fromUserId.id || request.fromUserId).toString();
		const recipientId = (request.toUserId._id || request.toUserId.id || request.toUserId).toString();
		
		console.log('[MESSAGE_REQUEST] Extracted IDs - requesterId:', requesterId, 'recipientId:', recipientId);

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
		let chat;
		try {
			chat = await request.accept(responseMessage);
			if (!chat) {
				console.error('[MESSAGE_REQUEST] ❌ Chat is null after accept - transaction may have failed');
				return ApiResponse.serverError(res, 'Failed to create chat after accepting request');
			}
			console.log('[MESSAGE_REQUEST] ✅ Chat created successfully:', chat._id);
		} catch (acceptError) {
			console.error('[MESSAGE_REQUEST] ❌ Error in request.accept():', acceptError);
			console.error('[MESSAGE_REQUEST] ❌ Error stack:', acceptError.stack);
			console.error('[MESSAGE_REQUEST] ❌ Request details:', {
				requestId: request._id,
				fromUserId: request.fromUserId,
				toUserId: request.toUserId,
				status: request.status,
				message: request.message
			});
			return ApiResponse.serverError(res, `Failed to accept message request: ${acceptError.message || 'Unknown error'}`);
		}

		// If there was an initial message, broadcast it via realtime service
		// Note: The accept method already creates and saves the message, but we need to broadcast it
		const requestMessage = request.message ? request.message.trim() : '';
		if (requestMessage !== '') {
			try {
				// Get the last message from the chat (should be the initial message we just created)
				const Message = mongoose.model('Message');
				const initialMessage = await Message.findOne({ 
					chatId: chat._id,
					senderId: requesterId
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

		// Delete the notification for the recipient (current user who accepted)
		try {
			await notificationService.deleteByTypeAndData({
				type: 'message_request',
				recipientId: currentUserId, // The recipient (who accepted)
				senderId: requesterId, // The requester (sender of the notification)
				data: {
					requestId: request._id.toString()
				}
			});
			console.log('[MESSAGE_REQUEST] ✅ Notification deleted for recipient after acceptance:', currentUserId);
			
			// Invalidate notification cache for recipient
			try {
				invalidateUserCache(currentUserId, 'notifications:*');
				cacheService.deletePattern(`cache:GET:/api/v1/notifications*:${currentUserId}*`);
				cacheService.deletePattern(`cache:GET:/notifications*:${currentUserId}*`);
			} catch (cacheError) {
				console.error('[MESSAGE_REQUEST] Error invalidating notification cache:', cacheError);
			}
		} catch (notificationError) {
			console.error('[MESSAGE_REQUEST] Error deleting notification:', notificationError);
			// Don't fail acceptance if notification deletion fails
		}

		// Notify original requester that request was accepted
		try {
			await notificationService.create({
				context: 'social',
				type: 'message_request',
				recipientId: requesterId,
				senderId: recipientId,
				data: {
					requestId: request._id.toString(),
					chatId: chat._id.toString(),
					status: 'accepted',
					contentType: 'message_request'
				}
			});
			
			// Invalidate notification cache for requester (new notification added)
			try {
				invalidateUserCache(requesterId, 'notifications:*');
				cacheService.deletePattern(`cache:GET:/api/v1/notifications*:${requesterId}*`);
				cacheService.deletePattern(`cache:GET:/notifications*:${requesterId}*`);
				console.log('[MESSAGE_REQUEST] ✅ Notification cache invalidated for requester (acceptance notification)');
			} catch (cacheError) {
				console.error('[MESSAGE_REQUEST] Error invalidating notification cache:', cacheError);
			}
		} catch (notificationError) {
			console.error('[MESSAGE_REQUEST] Notification error:', notificationError?.message || notificationError);
			// Don't fail acceptance if notification fails
		}

		// Invalidate cache for both recipient and requester
		try {
			// Invalidate cache for recipient (who accepted) - pending requests list
			invalidateUserCache(currentUserId, 'message-requests:*');
			cacheService.deletePattern(`cache:GET:/user/message-requests/pending:*:${currentUserId}*`);
			
			// Invalidate cache for requester (who sent the request) - sent requests list
			invalidateUserCache(requesterId, 'message-requests:*');
			cacheService.deletePattern(`cache:GET:/user/message-requests/sent:*:${requesterId}*`);
			
			console.log('[MESSAGE_REQUEST] ✅ Cache invalidated for recipient and requester after acceptance');
		} catch (cacheError) {
			console.error('[MESSAGE_REQUEST] Error invalidating cache:', cacheError);
			// Don't fail acceptance if cache invalidation fails
		}

		// Emit real-time events
		try {
			const recipient = await User.findById(currentUserId).select('username fullName');
			
			// Emit to requester - message request accepted
			enhancedRealtimeService.emitToUser(
				requesterId,
				'message_request:accepted',
				{
					requestId: request._id.toString(),
					chatId: chat._id.toString(),
					recipient: {
						_id: currentUserId,
						username: recipient.username,
						fullName: recipient.fullName
					},
					timestamp: new Date()
				}
			);

			// Also emit chat:created event to both users
			enhancedRealtimeService.emitToUser(
				requesterId,
				'chat:created',
				{
					chatId: chat._id.toString(),
					participants: [requesterId, currentUserId],
					createdAt: chat.createdAt,
					timestamp: new Date()
				}
			);

			enhancedRealtimeService.emitToUser(
				currentUserId,
				'chat:created',
				{
					chatId: chat._id.toString(),
					participants: [requesterId, currentUserId],
					createdAt: chat.createdAt,
					timestamp: new Date()
				}
			);
			console.log('[MESSAGE_REQUEST] ✅ Real-time events emitted: message_request:accepted and chat:created');
		} catch (realtimeError) {
			console.error('[MESSAGE_REQUEST] Error emitting real-time events:', realtimeError);
			// Don't fail acceptance if real-time event fails
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

		// Get requester ID and request ID string before deleting
		// Handle both populated object and direct ID
		const requesterId = (request.fromUserId._id || request.fromUserId.id || request.fromUserId).toString();
		const requestIdStr = request._id.toString();
		
		console.log('[MESSAGE_REQUEST] Extracted requesterId for notification deletion:', requesterId);

		// Delete the notification for the recipient (current user who rejected)
		try {
			await notificationService.deleteByTypeAndData({
				type: 'message_request',
				recipientId: currentUserId, // The recipient (who rejected)
				senderId: requesterId, // The requester (sender of the notification)
				data: {
					requestId: requestIdStr
				}
			});
			console.log('[MESSAGE_REQUEST] ✅ Notification deleted for recipient after rejection:', currentUserId);
			
			// Invalidate notification cache for recipient
			try {
				invalidateUserCache(currentUserId, 'notifications:*');
				cacheService.deletePattern(`cache:GET:/api/v1/notifications*:${currentUserId}*`);
				cacheService.deletePattern(`cache:GET:/notifications*:${currentUserId}*`);
			} catch (cacheError) {
				console.error('[MESSAGE_REQUEST] Error invalidating notification cache:', cacheError);
			}
		} catch (notificationError) {
			console.error('[MESSAGE_REQUEST] Error deleting notification:', notificationError);
			// Don't fail deletion if notification deletion fails
		}

		// Delete the message request from database instead of just marking as rejected
		await MessageRequest.findByIdAndDelete(request._id);

		// Invalidate cache for both recipient and requester
		try {
			// Invalidate cache for recipient (who rejected) - pending requests list
			invalidateUserCache(currentUserId, 'message-requests:*');
			// Also invalidate general cache pattern for pending requests endpoint
			cacheService.deletePattern(`cache:GET:/user/message-requests/pending:*:${currentUserId}*`);
			
			// Invalidate cache for requester (who sent the request) - sent requests list
			invalidateUserCache(requesterId, 'message-requests:*');
			cacheService.deletePattern(`cache:GET:/user/message-requests/sent:*:${requesterId}*`);
			
			console.log('[MESSAGE_REQUEST] ✅ Cache invalidated for recipient and requester');
		} catch (cacheError) {
			console.error('[MESSAGE_REQUEST] Error invalidating cache:', cacheError);
			// Don't fail rejection if cache invalidation fails
		}

		// Emit real-time event to requester
		try {
			const recipient = await User.findById(currentUserId).select('username fullName');
			enhancedRealtimeService.emitToUser(
				requesterId,
				'message_request:rejected',
				{
					requestId: requestIdStr,
					recipient: {
						_id: currentUserId,
						username: recipient.username,
						fullName: recipient.fullName
					},
					timestamp: new Date()
				}
			);
			console.log('[MESSAGE_REQUEST] ✅ Real-time event emitted: message_request:rejected to requester');
		} catch (realtimeError) {
			console.error('[MESSAGE_REQUEST] Error emitting real-time event:', realtimeError);
			// Don't fail deletion if real-time event fails
		}

		return ApiResponse.success(res, {
			requestId: request._id,
			message: 'Message request deleted successfully'
		}, 'Message request rejected and deleted successfully');
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

		// Get recipient before deleting
		const requestWithRecipient = await MessageRequest.findById(requestId).populate('toUserId', '_id');
		const recipientId = requestWithRecipient?.toUserId?._id?.toString();

		// Delete the message request from database
		await MessageRequest.findByIdAndDelete(requestId);

		// Delete the notification for the recipient
		if (recipientId) {
			try {
				await notificationService.deleteByTypeAndData({
					type: 'message_request',
					recipientId: recipientId,
					senderId: currentUserId, // The requester (sender of the notification)
					data: {
						requestId: requestId
					}
				});
				console.log('[MESSAGE_REQUEST] ✅ Notification deleted for recipient:', recipientId);
				
				// Invalidate notification cache for recipient
				try {
					invalidateUserCache(recipientId, 'notifications:*');
					cacheService.deletePattern(`cache:GET:/api/v1/notifications*:${recipientId}*`);
					cacheService.deletePattern(`cache:GET:/notifications*:${recipientId}*`);
				} catch (cacheError) {
					console.error('[MESSAGE_REQUEST] Error invalidating notification cache:', cacheError);
				}
			} catch (notificationError) {
				console.error('[MESSAGE_REQUEST] Error deleting notification:', notificationError);
				// Don't fail deletion if notification deletion fails
			}
		}

		// Invalidate cache for both requester and recipient
		try {
			// Invalidate cache for requester (who deleted) - sent requests list
			invalidateUserCache(currentUserId, 'message-requests:*');
			cacheService.deletePattern(`cache:GET:/user/message-requests/sent:*:${currentUserId}*`);
			
			// Invalidate cache for recipient - pending requests list
			if (recipientId) {
				invalidateUserCache(recipientId, 'message-requests:*');
				cacheService.deletePattern(`cache:GET:/user/message-requests/pending:*:${recipientId}*`);
			}
			
			console.log('[MESSAGE_REQUEST] ✅ Cache invalidated for requester and recipient after deletion');
		} catch (cacheError) {
			console.error('[MESSAGE_REQUEST] Error invalidating cache:', cacheError);
			// Don't fail deletion if cache invalidation fails
		}

		// Emit real-time event to recipient (if requester is deleting)
		if (recipientId) {
			try {
				const currentUser = await User.findById(currentUserId).select('username fullName');
				enhancedRealtimeService.emitToUser(
					recipientId,
					'message_request:deleted',
					{
						requestId: requestId,
						fromUser: {
							_id: currentUserId,
							username: currentUser.username,
							fullName: currentUser.fullName
						},
						timestamp: new Date()
					}
				);
				console.log('[MESSAGE_REQUEST] ✅ Real-time event emitted: message_request:deleted to recipient');
			} catch (realtimeError) {
				console.error('[MESSAGE_REQUEST] Error emitting real-time event:', realtimeError);
				// Don't fail deletion if real-time event fails
			}
		}

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
			// Invalidate cache if request not found (might be deleted)
			try {
				invalidateUserCache(currentUserId, 'message-requests:*');
				cacheService.deletePattern(`cache:GET:/user/message-requests/*:${currentUserId}*`);
			} catch (cacheError) {
				console.error('[MESSAGE_REQUEST] Error invalidating cache:', cacheError);
			}
			return ApiResponse.notFound(res, 'Message request not found');
		}

		// Check if current user is either sender or recipient
		const isSender = request.fromUserId._id.toString() === currentUserId.toString();
		const isRecipient = request.toUserId._id.toString() === currentUserId.toString();

		if (!isSender && !isRecipient) {
			return ApiResponse.forbidden(res, 'Access denied to this request');
		}

		// If request is rejected or expired, invalidate cache to ensure fresh data
		if (request.status === 'rejected' || request.status === 'expired') {
			try {
				invalidateUserCache(currentUserId, 'message-requests:*');
				cacheService.deletePattern(`cache:GET:/user/message-requests/*:${currentUserId}*`);
			} catch (cacheError) {
				console.error('[MESSAGE_REQUEST] Error invalidating cache for rejected/expired request:', cacheError);
			}
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

// Cleanup old rejected message requests
async function cleanupRejectedRequests(req, res) {
	try {
		const { daysOld = 30 } = req.query || {};
		const days = parseInt(daysOld, 10) || 30;

		if (days < 1) {
			return ApiResponse.badRequest(res, 'Days must be at least 1');
		}

		const deletedCount = await MessageRequest.cleanupRejectedRequests(days);

		return ApiResponse.success(res, {
			deletedCount,
			daysOld: days,
			message: `Cleaned up ${deletedCount} rejected message requests older than ${days} days`
		}, 'Cleanup completed successfully');
	} catch (e) {
		console.error('[USER][MESSAGE_REQUEST] cleanupRejectedRequests error:', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to cleanup rejected requests');
	}
}

// Cleanup all old non-pending requests (rejected, expired)
async function cleanupOldRequests(req, res) {
	try {
		const { daysOld = 30 } = req.query || {};
		const days = parseInt(daysOld, 10) || 30;

		if (days < 1) {
			return ApiResponse.badRequest(res, 'Days must be at least 1');
		}

		const deletedCount = await MessageRequest.cleanupOldRequests(days);

		return ApiResponse.success(res, {
			deletedCount,
			daysOld: days,
			message: `Cleaned up ${deletedCount} old message requests (rejected/expired) older than ${days} days`
		}, 'Cleanup completed successfully');
	} catch (e) {
		console.error('[USER][MESSAGE_REQUEST] cleanupOldRequests error:', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to cleanup old requests');
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
	getRequestBetweenUsers,
	cleanupRejectedRequests,
	cleanupOldRequests
};
