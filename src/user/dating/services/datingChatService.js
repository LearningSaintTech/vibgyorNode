const Chat = require('../../social/userModel/chatModel');
const Message = require('../../social/userModel/messageModel');
const DatingMatch = require('../models/datingMatchModel');

/**
 * Get or create a chat for a dating match
 * @param {string} matchId - Dating match ID
 * @param {string} currentUserId - Current user ID
 * @returns {Promise<Object>} Chat object
 */
async function getOrCreateMatchChat(matchId, currentUserId) {
	try {
		// Verify match exists and user is part of it
		const match = await DatingMatch.findById(matchId);
		if (!match) {
			throw new Error('Match not found');
		}

		// Check if user is part of this match
		const userAId = match.userA.toString();
		const userBId = match.userB.toString();
		const currentUserIdStr = currentUserId.toString();

		if (userAId !== currentUserIdStr && userBId !== currentUserIdStr) {
			throw new Error('User is not part of this match');
		}

		// Check if match is active
		if (match.status !== 'active') {
			throw new Error('Match is not active');
		}

		// Try to find existing chat for this match
		// Find chat by participants (both users in the match)
		const participants = [match.userA, match.userB];
		
		let chat = await Chat.findOne({
			participants: { $all: participants, $size: 2 },
			chatType: 'direct',
			isActive: true
		});

		// If no chat exists, create one
		if (!chat) {
			chat = new Chat({
				participants: participants,
				chatType: 'direct',
				isActive: true
			});

			// Initialize user settings for both participants
			chat.userSettings = participants.map(userId => ({
				userId: userId,
				isArchived: false,
				isPinned: false,
				isMuted: false,
				unreadCount: 0
			}));

			await chat.save();
		}

		return chat;
	} catch (error) {
		console.error('[DATING CHAT SERVICE] Error getting/creating match chat:', error);
		throw error;
	}
}

/**
 * Get chat ID from match ID
 * @param {string} matchId - Dating match ID
 * @param {string} currentUserId - Current user ID
 * @returns {Promise<string>} Chat ID
 */
async function getChatIdFromMatch(matchId, currentUserId) {
	const chat = await getOrCreateMatchChat(matchId, currentUserId);
	return chat._id.toString();
}

module.exports = {
	getOrCreateMatchChat,
	getChatIdFromMatch
};

