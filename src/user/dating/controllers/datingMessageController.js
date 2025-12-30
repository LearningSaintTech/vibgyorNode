const ApiResponse = require('../../../utils/apiResponse');
const DatingChatService = require('../services/datingChatService');
const DatingMessageService = require('../services/datingMessageService');
const DatingMatch = require('../models/datingMatchModel');

/**
 * Send a message to a dating match
 * POST /user/dating/messages
 */
async function sendDatingMessage(req, res) {
	try {
		console.log('[DATING][MESSAGE][SEND] payload', { body: req.body, userId: req.user?.userId });
		
		const { matchId, message, type = 'text', replyTo, forwardedFrom } = req.body || {};
		const currentUserId = req.user?.userId;
		const file = req.file || null;

		if (!matchId) {
			return ApiResponse.badRequest(res, 'Match ID is required');
		}

		if (type === 'text' && (!message || typeof message !== 'string' || !message.trim())) {
			return ApiResponse.badRequest(res, 'Message content is required');
		}

		// Validate file requirement for media messages (except location)
		if (['audio', 'video', 'image', 'document', 'gif', 'voice'].includes(type) && !file) {
			return ApiResponse.badRequest(res, 'File is required for media messages');
		}

		// Validate location data for location messages
		if (type === 'location') {
			if (!req.body.location || typeof req.body.location.latitude !== 'number' || typeof req.body.location.longitude !== 'number') {
				return ApiResponse.badRequest(res, 'Valid location data (latitude, longitude) is required for location messages');
			}
		}

		// Verify match exists and is active
		const match = await DatingMatch.findById(matchId);
		if (!match) {
			return ApiResponse.notFound(res, 'Match not found');
		}

		// Check if user is part of this match
		const userAId = match.userA.toString();
		const userBId = match.userB.toString();
		const currentUserIdStr = currentUserId.toString();

		if (userAId !== currentUserIdStr && userBId !== currentUserIdStr) {
			return ApiResponse.forbidden(res, 'You are not part of this match');
		}

		if (match.status !== 'active') {
			return ApiResponse.badRequest(res, 'Match is not active');
		}

		// Get or create chat for this match
		const chat = await DatingChatService.getOrCreateMatchChat(matchId, currentUserId);

		// Send message using DatingMessageService
		const messageData = {
			chatId: chat._id,
			senderId: currentUserId,
			type: type,
			content: message ? message.trim().slice(0, 4096) : '',
			replyTo: replyTo || null,
			forwardedFrom: forwardedFrom || null,
			// One-view fields
			isOneView: req.body.isOneView === true || req.body.isOneView === 'true',
			oneViewExpirationHours: req.body.oneViewExpirationHours || null,
			// Location data
			location: req.body.location || null,
			// GIF fields
			gifSource: req.body.gifSource || null,
			gifId: req.body.gifId || null,
			// Music metadata
			musicMetadata: req.body.musicMetadata || null,
			// Duration for video/audio/voice (from FormData)
			duration: req.body.duration || null,
			// Dimensions for images/videos (from FormData)
			width: req.body.width || null,
			height: req.body.height || null
		};

		const newMessage = await DatingMessageService.sendMessage(messageData, file);

		console.log('[DATING][MESSAGE][SEND] success', { messageId: newMessage._id, chatId: chat._id });

		return ApiResponse.created(res, {
			message: newMessage
		}, 'Message sent successfully');

	} catch (error) {
		console.error('[DATING][MESSAGE][SEND] Error:', error);
		return ApiResponse.serverError(res, `Failed to send message: ${error.message}`);
	}
}

/**
 * Get messages for a dating match or chat
 * GET /user/dating/messages/chat/:chatId or GET /user/dating/messages/:matchId
 */
async function getDatingMessages(req, res) {
	try {
		console.log('[DATING][MESSAGE][GET] payload', { params: req.params, query: req.query, userId: req.user?.userId });
		
		const { chatId, matchId } = req.params;
		const { page = 1, limit = 50 } = req.query;
		const currentUserId = req.user?.userId;

		let finalChatId = chatId;

		// If matchId is provided (legacy route), get or create chat
		if (matchId && !chatId) {
			// Verify match exists and user is part of it
			const match = await DatingMatch.findById(matchId);
			if (!match) {
				return ApiResponse.notFound(res, 'Match not found');
			}

			const userAId = match.userA.toString();
			const userBId = match.userB.toString();
			const currentUserIdStr = currentUserId.toString();

			if (userAId !== currentUserIdStr && userBId !== currentUserIdStr) {
				return ApiResponse.forbidden(res, 'You are not part of this match');
			}

			// Get or create chat for this match
			const chat = await DatingChatService.getOrCreateMatchChat(matchId, currentUserId);
			finalChatId = chat._id.toString();
		} else if (!chatId) {
			return ApiResponse.badRequest(res, 'Chat ID or Match ID is required');
		}

		// Get messages using DatingMessageService
		const result = await DatingMessageService.getChatMessages(
			finalChatId, 
			currentUserId, 
			parseInt(page, 10), 
			parseInt(limit, 10)
		);

		// Mark messages as read when user fetches them
		await DatingMessageService.markMessagesAsRead(finalChatId, currentUserId);

		console.log('[DATING][MESSAGE][GET] success', { chatId: finalChatId, messageCount: result.messages.length });

		return ApiResponse.success(res, {
			messages: result.messages,
			pagination: result.pagination
		}, 'Messages retrieved successfully');

	} catch (error) {
		console.error('[DATING][MESSAGE][GET] Error:', error);
		return ApiResponse.serverError(res, `Failed to get messages: ${error.message}`);
	}
}

/**
 * Get conversations (chats) for all dating matches
 * GET /user/dating/messages/conversations
 */
async function getDatingConversations(req, res) {
	try {
		console.log('[DATING][CONVERSATIONS] payload', { query: req.query, userId: req.user?.userId });
		
		const currentUserId = req.user?.userId;
		const { page = 1, limit = 20 } = req.query;
		const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

		// Get all active matches for current user
		const matches = await DatingMatch.find({
			status: 'active',
			$or: [
				{ userA: currentUserId },
				{ userB: currentUserId }
			]
		})
			.sort({ lastInteractionAt: -1 })
			.skip(skip)
			.limit(parseInt(limit, 10))
			.lean();

		// Get chats for each match
		const conversations = await Promise.all(
			matches.map(async (match) => {
				try {
					const chat = await DatingChatService.getOrCreateMatchChat(match._id.toString(), currentUserId);
					
					// Get other user info
					const otherUserId = match.userA.toString() === currentUserId.toString() 
						? match.userB 
						: match.userA;

					// Get user info
					const User = require('../../auth/model/userAuthModel');
					const otherUser = await User.findById(otherUserId)
						.select('username fullName profilePictureUrl')
						.lean();

					// Get chat details with unread count
					const chatDetails = await DatingChatService.getChatDetails(chat._id, currentUserId);

					// Get last message
					const DatingMessage = require('../models/datingMessageModel');
					let lastMessage = null;
					if (chat.lastMessage) {
						const lastMsg = await DatingMessage.findById(chat.lastMessage)
							.select('content type createdAt senderId')
							.populate('senderId', 'username fullName')
							.lean();
						lastMessage = lastMsg;
					}

					return {
						matchId: match._id,
						chatId: chat._id,
						user: {
							_id: otherUser._id,
							username: otherUser.username,
							fullName: otherUser.fullName,
							profilePictureUrl: otherUser.profilePictureUrl
						},
						lastMessage: lastMessage ? {
							content: lastMessage.content,
							type: lastMessage.type,
							createdAt: lastMessage.createdAt,
							senderId: lastMessage.senderId
						} : null,
						lastMessageAt: chat.lastMessageAt || match.lastInteractionAt,
						unreadCount: chatDetails.unreadCount || 0,
						matchedAt: match.createdAt
					};
				} catch (error) {
					console.error('[DATING][CONVERSATIONS] Error processing match:', match._id, error);
					return null;
				}
			})
		);

		// Filter out null results (errors)
		const validConversations = conversations.filter(conv => conv !== null);

		// Sort by lastMessageAt
		validConversations.sort((a, b) => {
			const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
			const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
			return timeB - timeA;
		});

		console.log('[DATING][CONVERSATIONS] success', { count: validConversations.length });

		return ApiResponse.success(res, {
			conversations: validConversations,
			pagination: {
				page: parseInt(page, 10),
				limit: parseInt(limit, 10),
				total: validConversations.length
			}
		}, 'Conversations retrieved successfully');

	} catch (error) {
		console.error('[DATING][CONVERSATIONS] Error:', error);
		return ApiResponse.serverError(res, `Failed to get conversations: ${error.message}`);
	}
}

/**
 * Edit a dating message
 * PUT /user/dating/messages/:messageId
 */
async function editDatingMessage(req, res) {
	try {
		const { messageId } = req.params;
		const { content } = req.body;
		const userId = req.user?.userId;

		if (!content || content.trim() === '') {
			return ApiResponse.badRequest(res, 'Message content is required');
		}

		const DatingMessageService = require('../services/datingMessageService');
		const result = await DatingMessageService.editMessage(messageId, userId, content);

		return ApiResponse.success(res, result, 'Dating message edited successfully');

	} catch (error) {
		console.error('[DATING][MESSAGE][EDIT] Error:', error);
		return ApiResponse.serverError(res, `Failed to edit message: ${error.message}`);
	}
}

/**
 * Delete a dating message
 * DELETE /user/dating/messages/:messageId
 */
async function deleteDatingMessage(req, res) {
	try {
		const { messageId } = req.params;
		const userId = req.user?.userId;

		const DatingMessageService = require('../services/datingMessageService');
		const result = await DatingMessageService.deleteMessage(messageId, userId);

		return ApiResponse.success(res, result, 'Dating message deleted successfully');

	} catch (error) {
		console.error('[DATING][MESSAGE][DELETE] Error:', error);
		return ApiResponse.serverError(res, `Failed to delete message: ${error.message}`);
	}
}

/**
 * Add reaction to a dating message
 * POST /user/dating/messages/:messageId/reactions
 */
async function reactToDatingMessage(req, res) {
	try {
		const { messageId } = req.params;
		const { emoji } = req.body;
		const userId = req.user?.userId;

		if (!emoji) {
			return ApiResponse.badRequest(res, 'Emoji is required');
		}

		const DatingMessageService = require('../services/datingMessageService');
		const result = await DatingMessageService.reactToMessage(messageId, userId, emoji);

		return ApiResponse.success(res, result, 'Reaction added successfully');

	} catch (error) {
		console.error('[DATING][MESSAGE][REACT] Error:', error);
		return ApiResponse.serverError(res, `Failed to add reaction: ${error.message}`);
	}
}

/**
 * Remove reaction from a dating message
 * DELETE /user/dating/messages/:messageId/reactions
 */
async function removeDatingReaction(req, res) {
	try {
		const { messageId } = req.params;
		const userId = req.user?.userId;

		const DatingMessageService = require('../services/datingMessageService');
		const result = await DatingMessageService.removeReaction(messageId, userId);

		return ApiResponse.success(res, result, 'Reaction removed successfully');

	} catch (error) {
		console.error('[DATING][MESSAGE][REMOVE_REACT] Error:', error);
		return ApiResponse.serverError(res, `Failed to remove reaction: ${error.message}`);
	}
}

/**
 * Forward a dating message
 * POST /user/dating/messages/:messageId/forward
 */
async function forwardDatingMessage(req, res) {
	try {
		const { messageId } = req.params;
		const { targetChatId } = req.body;
		const userId = req.user?.userId;

		if (!targetChatId) {
			return ApiResponse.badRequest(res, 'Target chat ID is required');
		}

		const DatingMessageService = require('../services/datingMessageService');
		const result = await DatingMessageService.forwardMessage(messageId, targetChatId, userId);

		return ApiResponse.success(res, result, 'Message forwarded successfully');

	} catch (error) {
		console.error('[DATING][MESSAGE][FORWARD] Error:', error);
		return ApiResponse.serverError(res, `Failed to forward message: ${error.message}`);
	}
}

/**
 * Search messages in a dating chat
 * GET /user/dating/messages/chat/:chatId/search
 */
async function searchDatingMessages(req, res) {
	try {
		const { chatId } = req.params;
		const { q: query, page = 1, limit = 20 } = req.query;
		const userId = req.user?.userId;

		if (!query || query.trim() === '') {
			return ApiResponse.badRequest(res, 'Search query is required');
		}

		const DatingMessageService = require('../services/datingMessageService');
		const result = await DatingMessageService.searchMessages(chatId, userId, query, parseInt(page), parseInt(limit));

		return ApiResponse.success(res, result, 'Messages search completed successfully');

	} catch (error) {
		console.error('[DATING][MESSAGE][SEARCH] Error:', error);
		return ApiResponse.serverError(res, `Failed to search messages: ${error.message}`);
	}
}

/**
 * Get media messages in a dating chat
 * GET /user/dating/messages/chat/:chatId/media
 */
async function getDatingChatMedia(req, res) {
	try {
		const { chatId } = req.params;
		const { type, page = 1, limit = 20 } = req.query;
		const userId = req.user?.userId;

		const DatingMessageService = require('../services/datingMessageService');
		const result = await DatingMessageService.getChatMedia(chatId, userId, type, parseInt(page), parseInt(limit));

		return ApiResponse.success(res, result, 'Chat media retrieved successfully');

	} catch (error) {
		console.error('[DATING][MESSAGE][MEDIA] Error:', error);
		return ApiResponse.serverError(res, `Failed to get chat media: ${error.message}`);
	}
}

/**
 * Get dating message details
 * GET /user/dating/messages/:messageId
 */
async function getDatingMessageDetails(req, res) {
	try {
		const { messageId } = req.params;
		const userId = req.user?.userId;

		const DatingMessageService = require('../services/datingMessageService');
		const message = await DatingMessageService.getMessageDetails(messageId, userId);

		return ApiResponse.success(res, { message }, 'Message details retrieved successfully');

	} catch (error) {
		console.error('[DATING][MESSAGE][DETAILS] Error:', error);
		return ApiResponse.serverError(res, `Failed to get message details: ${error.message}`);
	}
}

/**
 * Mark a one-view message as viewed
 * PUT /user/dating/messages/:messageId/view
 */
async function markOneViewAsViewed(req, res) {
	try {
		const { messageId } = req.params;
		const userId = req.user?.userId;

		const DatingMessageService = require('../services/datingMessageService');
		const message = await DatingMessageService.markOneViewAsViewed(messageId, userId);

		return ApiResponse.success(res, { message }, 'One-view message marked as viewed');

	} catch (error) {
		console.error('[DATING][MESSAGE][ONE_VIEW] Error:', error);
		return ApiResponse.serverError(res, `Failed to mark one-view: ${error.message}`);
	}
}

/**
 * Mark messages as read in a dating chat
 * PUT /user/dating/messages/chat/:chatId/read
 */
async function markDatingMessagesAsRead(req, res) {
	try {
		const { chatId } = req.params;
		const userId = req.user?.userId;

		if (!chatId) {
			return ApiResponse.badRequest(res, 'Chat ID is required');
		}

		const DatingMessageService = require('../services/datingMessageService');
		const result = await DatingMessageService.markMessagesAsRead(chatId, userId);

		return ApiResponse.success(res, result, 'Messages marked as read successfully');

	} catch (error) {
		console.error('[DATING][MESSAGE][MARK_READ] Error:', error);
		
		let statusCode = 500;
		if (error.message.includes('not found') || error.message.includes('Access denied')) {
			statusCode = 404;
		} else if (error.message.includes('required')) {
			statusCode = 400;
		}
		
		return ApiResponse.error(res, statusCode, `Failed to mark messages as read: ${error.message}`);
	}
}

module.exports = {
	sendDatingMessage,
	getDatingMessages,
	getDatingConversations,
	editDatingMessage,
	deleteDatingMessage,
	reactToDatingMessage,
	removeDatingReaction,
	forwardDatingMessage,
	searchDatingMessages,
	getDatingChatMedia,
	getDatingMessageDetails,
	markOneViewAsViewed,
	markDatingMessagesAsRead
};
