const ApiResponse = require('../../../utils/apiResponse');
const { getOrCreateMatchChat, getChatIdFromMatch } = require('../services/datingChatService');
const Message = require('../../social/userModel/messageModel');
const Chat = require('../../social/userModel/chatModel');
const DatingMatch = require('../models/datingMatchModel');
const enhancedRealtimeService = require('../../../services/enhancedRealtimeService');

/**
 * Send a message to a dating match
 * POST /user/dating/messages
 */
async function sendDatingMessage(req, res) {
	try {
		console.log('[DATING][MESSAGE][SEND] payload', { body: req.body, userId: req.user?.userId });
		
		const { matchId, message } = req.body || {};
		const currentUserId = req.user?.userId;

		if (!matchId) {
			return ApiResponse.badRequest(res, 'Match ID is required');
		}

		if (!message || typeof message !== 'string' || !message.trim()) {
			return ApiResponse.badRequest(res, 'Message content is required');
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
		const chat = await getOrCreateMatchChat(matchId, currentUserId);

		// Create message
		const newMessage = await Message.create({
			chatId: chat._id,
			senderId: currentUserId,
			type: 'text',
			content: message.trim().slice(0, 4096), // Respect max length
			status: 'sent'
		});

		// Populate sender info
		await newMessage.populate('senderId', 'username fullName profilePictureUrl');

		// Update chat's last message
		chat.lastMessage = newMessage._id;
		chat.lastMessageAt = new Date();
		
		// Update unread count for the other participant
		const otherUserId = userAId === currentUserIdStr ? match.userB : match.userA;
		const otherUserSettings = chat.userSettings.find(us => us.userId.toString() === otherUserId.toString());
		if (otherUserSettings) {
			otherUserSettings.unreadCount = (otherUserSettings.unreadCount || 0) + 1;
		}

		await chat.save();

		// Emit real-time message event
		enhancedRealtimeService.emitNewMessage(chat._id.toString(), {
			_id: newMessage._id,
			chatId: chat._id,
			senderId: newMessage.senderId,
			type: newMessage.type,
			content: newMessage.content,
			createdAt: newMessage.createdAt,
			status: newMessage.status,
			sender: {
				_id: newMessage.senderId._id,
				username: newMessage.senderId.username,
				fullName: newMessage.senderId.fullName,
				profilePictureUrl: newMessage.senderId.profilePictureUrl
			}
		});

		console.log('[DATING][MESSAGE][SEND] success', { messageId: newMessage._id, chatId: chat._id });

		return ApiResponse.created(res, {
			message: {
				_id: newMessage._id,
				chatId: chat._id,
				senderId: newMessage.senderId,
				type: newMessage.type,
				content: newMessage.content,
				createdAt: newMessage.createdAt,
				status: newMessage.status,
				sender: {
					_id: newMessage.senderId._id,
					username: newMessage.senderId.username,
					fullName: newMessage.senderId.fullName,
					profilePictureUrl: newMessage.senderId.profilePictureUrl
				}
			}
		}, 'Message sent successfully');

	} catch (error) {
		console.error('[DATING][MESSAGE][SEND] Error:', error);
		return ApiResponse.serverError(res, `Failed to send message: ${error.message}`);
	}
}

/**
 * Get messages for a dating match
 * GET /user/dating/messages/:matchId
 */
async function getDatingMessages(req, res) {
	try {
		console.log('[DATING][MESSAGE][GET] payload', { params: req.params, query: req.query, userId: req.user?.userId });
		
		const { matchId } = req.params;
		const { page = 1, limit = 50 } = req.query;
		const currentUserId = req.user?.userId;

		if (!matchId) {
			return ApiResponse.badRequest(res, 'Match ID is required');
		}

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
		const chat = await getOrCreateMatchChat(matchId, currentUserId);

		// Get messages using existing Message model method
		const messages = await Message.getChatMessages(chat._id, parseInt(page, 10), parseInt(limit, 10), currentUserId);

		// Mark messages as read when user fetches them
		await Message.markChatAsRead(chat._id, currentUserId);

		// Update user's lastReadAt in chat settings
		const userSettings = chat.userSettings.find(us => us.userId.toString() === currentUserIdStr);
		if (userSettings) {
			userSettings.lastReadAt = new Date();
			userSettings.unreadCount = 0;
			await chat.save();
		}

		console.log('[DATING][MESSAGE][GET] success', { matchId, messageCount: messages.length });

		return ApiResponse.success(res, {
			messages: messages,
			pagination: {
				page: parseInt(page, 10),
				limit: parseInt(limit, 10),
				total: messages.length
			}
		}, 'Messages retrieved successfully');

	} catch (error) {
		console.error('[DATING][MESSAGE][GET] Error:', error);
		return ApiResponse.serverError(res, `Failed to get messages: ${error.message}`);
	}
}

/**
 * Get conversations (chats) for all dating matches
 * GET /user/dating/conversations
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
					const chat = await getOrCreateMatchChat(match._id.toString(), currentUserId);
					
					// Get other user info
					const otherUserId = match.userA.toString() === currentUserId.toString() 
						? match.userB 
						: match.userA;

					// Get user info (we'll populate this from User model)
					const User = require('../../auth/model/userAuthModel');
					const otherUser = await User.findById(otherUserId)
						.select('username fullName profilePictureUrl')
						.lean();

					// Get unread count
					const userSettings = chat.userSettings?.find(
						us => us.userId.toString() === currentUserId.toString()
					);
					const unreadCount = userSettings?.unreadCount || 0;

					// Get last message
					let lastMessage = null;
					if (chat.lastMessage) {
						const lastMsg = await Message.findById(chat.lastMessage)
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
						unreadCount: unreadCount,
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

module.exports = {
	sendDatingMessage,
	getDatingMessages,
	getDatingConversations
};

