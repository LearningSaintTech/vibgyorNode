const UserStatus = require('../userModel/userStatusModel');
const User = require('../../auth/model/userAuthModel');
const ApiResponse = require('../../../utils/apiResponse');

// Update user online status
async function updateUserStatus(req, res) {
	try {
		// console.log('[USER][USER_STATUS] updateUserStatus request');
		const { isOnline, status, privacySettings } = req.body || {};
		const currentUserId = req.user?.userId;

		const userStatus = await UserStatus.getOrCreateUserStatus(currentUserId);

		// Update online status
		if (typeof isOnline === 'boolean') {
			const wasOnline = userStatus.isOnline;
			if (isOnline) {
				await userStatus.setOnline();
				// Broadcast online status if user came online
				if (!wasOnline) {
					const user = await User.findById(currentUserId);
					const enhancedRealtimeService = require('../../../services/enhancedRealtimeService');
					enhancedRealtimeService.broadcast('user_online', {
						userId: currentUserId,
						username: user?.username,
						fullName: user?.fullName,
						profilePictureUrl: user?.profilePictureUrl,
						timestamp: new Date()
					});
					console.log(`[STATUS_CONTROLLER] ✅ User ${currentUserId} online status broadcasted to all users`);
				}
			} else {
				await userStatus.setOffline();
				// Broadcast offline status if user went offline
				if (wasOnline) {
					const user = await User.findById(currentUserId);
					const enhancedRealtimeService = require('../../../services/enhancedRealtimeService');
					enhancedRealtimeService.broadcastUserOffline(currentUserId, user);
				}
			}
		}

		// Update status message
		if (typeof status === 'string') {
			// console.log('[USER_STATUS] Updating status message:', { userId: currentUserId, oldStatus: userStatus.status, newStatus: status });
			await userStatus.updateStatus(status);
		}

		// Update privacy settings
		if (privacySettings && typeof privacySettings === 'object') {
			await userStatus.updatePrivacySettings(privacySettings);
		}

		// Update last activity
		await userStatus.updateActivity();

		// console.log('[USER][USER_STATUS] User status updated successfully');
		const responseData = {
			userId: userStatus.userId,
			isOnline: userStatus.isOnline,
			lastSeen: userStatus.lastSeen,
			status: userStatus.status,
			privacySettings: userStatus.privacySettings,
			lastActivity: userStatus.lastActivity
		};
		// console.log('[USER_STATUS] Final response data:', responseData);
		return ApiResponse.success(res, responseData, 'User status updated successfully');
	} catch (e) {
		// console.error('[USER][USER_STATUS] updateUserStatus error:', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to update user status');
	}
}

// Get user status
async function getUserStatus(req, res) {
	try {
		// console.log('[USER][USER_STATUS] getUserStatus request');
		const { userId } = req.params || {};
		const currentUserId = req.user?.userId;

		// Check if user exists
		const user = await User.findById(userId);
		if (!user) {
			return ApiResponse.notFound(res, 'User not found');
		}

		const userStatus = await UserStatus.findOne({ userId })
			.populate('userId', 'username fullName profilePictureUrl')
			.lean();

		if (!userStatus) {
			// Return default status if not found
			return ApiResponse.success(res, {
				userId,
				isOnline: false,
				lastSeen: new Date(),
				status: '',
				privacySettings: {
					showOnlineStatus: true,
					showLastSeen: true,
					showTypingStatus: true
				}
			});
		}

		// Check privacy settings
		const canSeeOnlineStatus = userStatus.privacySettings.showOnlineStatus;
		const canSeeLastSeen = userStatus.privacySettings.showLastSeen;

		// If current user is not the same user, respect privacy settings
		if (currentUserId !== userId) {
			const response = {
				userId: userStatus.userId,
				status: userStatus.status
			};

			// Always include isOnline field, but set to undefined if privacy doesn't allow
			response.isOnline = canSeeOnlineStatus ? userStatus.isOnline : undefined;

			if (canSeeLastSeen) {
				response.lastSeen = userStatus.lastSeen;
				response.timeSinceLastSeen = userStatus.timeSinceLastSeen;
			}

			// console.log('[USER][USER_STATUS] User status fetched successfully');
			return ApiResponse.success(res, response);
		}

		// Return full status for own profile
		// console.log('[USER][USER_STATUS] User status fetched successfully');
		return ApiResponse.success(res, {
			...userStatus,
			timeSinceLastSeen: userStatus.timeSinceLastSeen
		});
	} catch (e) {
		// console.error('[USER][USER_STATUS] getUserStatus error:', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to fetch user status');
	}
}

// Get online users
async function getOnlineUsers(req, res) {
	console.log('[USER][USER_STATUS] getOnlineUsers function called');
	try {
		console.log('[USER][USER_STATUS] getOnlineUsers request');
		const { limit = 50 } = req.query || {};
		const currentUserId = req.user?.userId;

		console.log('[USER][USER_STATUS] Current user ID:', currentUserId);
		console.log('[USER][USER_STATUS] Limit:', limit);

		// Get chat participants for the current user
		const Chat = require('../userModel/chatModel');
		const userChats = await Chat.find({
			participants: currentUserId,
			isActive: true
		}).select('participants').lean();

		// Extract all unique user IDs from chats (excluding current user)
		const chatParticipantIds = new Set();
		userChats.forEach(chat => {
			chat.participants.forEach(participantId => {
				if (participantId.toString() !== currentUserId) {
					chatParticipantIds.add(participantId.toString());
				}
			});
		});

		console.log('[USER][USER_STATUS] Chat participant IDs:', Array.from(chatParticipantIds));

		// Get online users who are participants in chats with the current user
		console.log('[USER][USER_STATUS] About to call UserStatus.getOnlineUsers');
		const onlineUsers = await UserStatus.getOnlineUsers(Array.from(chatParticipantIds), parseInt(limit));
		console.log('[USER][USER_STATUS] Raw online users:', onlineUsers.length);
		console.log('[USER][USER_STATUS] Raw online users data:', onlineUsers);

		// Filter based on privacy settings and exclude current user
		const filteredUsers = onlineUsers.filter(userStatus => {
			// Check if userStatus and userId exist
			if (!userStatus || !userStatus.userId) {
				console.log('[USER][USER_STATUS] Skipping user with missing data:', userStatus);
				return false;
			}
			
			// Check privacy settings
			const showOnline = userStatus.privacySettings?.showOnlineStatus !== false;
			const isNotCurrentUser = userStatus.userId._id.toString() !== currentUserId;
			
			console.log('[USER][USER_STATUS] User check:', {
				userId: userStatus.userId._id,
				showOnline,
				isNotCurrentUser,
				privacySettings: userStatus.privacySettings
			});
			
			return showOnline && isNotCurrentUser;
		}).map(userStatus => ({
			_id: userStatus.userId._id,
			userId: userStatus.userId._id,
			username: userStatus.userId.username,
			fullName: userStatus.userId.fullName,
			profilePictureUrl: userStatus.userId.profilePictureUrl,
			isOnline: userStatus.isOnline,
			lastSeen: userStatus.lastSeen,
			status: userStatus.status,
			lastActivity: userStatus.lastActivity
		}));

		console.log('[USER][USER_STATUS] Online users fetched successfully:', filteredUsers.length);
		return ApiResponse.success(res, filteredUsers, 'Online users fetched successfully');
	} catch (e) {
		console.error('[USER][USER_STATUS] getOnlineUsers error:', e?.message || e);
		console.error('[USER][USER_STATUS] Full error:', e);
		return ApiResponse.serverError(res, 'Failed to fetch online users');
	}
}

// Get recently active users
async function getRecentlyActiveUsers(req, res) {
	try {
		// console.log('[USER][USER_STATUS] getRecentlyActiveUsers request');
		const { hours = 24, limit = 100 } = req.query || {};
		const currentUserId = req.user?.userId;

		// Get user's following list
		const currentUser = await User.findById(currentUserId).select('following');
		const followingIds = currentUser?.following || [];

		const activeUsers = await UserStatus.getRecentlyActiveUsers(parseInt(hours), parseInt(limit));

		// Filter to only show followed users and respect privacy settings
		const filteredUsers = activeUsers
			.filter(userStatus => 
				followingIds.includes(userStatus.userId._id.toString()) &&
				userStatus.privacySettings.showLastSeen
			)
			.map(userStatus => ({
				userId: userStatus.userId,
				lastSeen: userStatus.lastSeen,
				lastActivity: userStatus.lastActivity,
				timeSinceLastSeen: userStatus.timeSinceLastSeen
			}));

		// console.log('[USER][USER_STATUS] Recently active users fetched successfully');
		return ApiResponse.success(res, {
			activeUsers: filteredUsers,
			count: filteredUsers.length,
			hours: parseInt(hours)
		});
	} catch (e) {
		// console.error('[USER][USER_STATUS] getRecentlyActiveUsers error:', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to fetch recently active users');
	}
}

// Get user statuses for multiple users
async function getUserStatuses(req, res) {
	try {
		// console.log('[USER][USER_STATUS] getUserStatuses request');
		const { userIds } = req.body || {};
		const currentUserId = req.user?.userId;

		if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
			return ApiResponse.badRequest(res, 'User IDs array is required');
		}

		// Limit to 50 users at a time
		if (userIds.length > 50) {
			return ApiResponse.badRequest(res, 'Maximum 50 users allowed per request');
		}

		const statuses = await UserStatus.getUserStatuses(userIds);
		
		// console.log('[USER_STATUS] Raw statuses from database:', statuses.map(s => ({
		// 	userId: s.userId._id,
		// 	isOnline: s.isOnline,
		// 	privacySettings: s.privacySettings
		// })));

		// Filter based on privacy settings
		const filteredStatuses = statuses.map(userStatus => {
			const canSeeOnlineStatus = userStatus.privacySettings.showOnlineStatus;
			const canSeeLastSeen = userStatus.privacySettings.showLastSeen;
			
			// console.log(`[USER_STATUS] Processing user ${userStatus.userId._id}:`, {
			// 	canSeeOnlineStatus,
			// 	canSeeLastSeen,
			// 	actualIsOnline: userStatus.isOnline,
			// 	privacySettings: userStatus.privacySettings
			// });

			const response = {
				userId: userStatus.userId,
				status: userStatus.status
			};

			// If current user is not the same user, respect privacy settings
			if (currentUserId !== userStatus.userId._id.toString()) {
				// Always include isOnline field, but set to undefined if privacy doesn't allow
				response.isOnline = canSeeOnlineStatus ? userStatus.isOnline : undefined;
				
				if (canSeeLastSeen) {
					response.lastSeen = userStatus.lastSeen;
					response.timeSinceLastSeen = userStatus.timeSinceLastSeen;
				}
			} else {
				// Return full status for own profile
				response.isOnline = userStatus.isOnline;
				response.lastSeen = userStatus.lastSeen;
				response.timeSinceLastSeen = userStatus.timeSinceLastSeen;
				response.privacySettings = userStatus.privacySettings;
			}

			return response;
		});

		// console.log('[USER_STATUS] Final filtered statuses:', filteredStatuses.map(s => ({
		// 	userId: s.userId._id,
		// 	isOnline: s.isOnline,
		// 	status: s.status
		// })));
		
		// console.log('[USER][USER_STATUS] User statuses fetched successfully');
		return ApiResponse.success(res, {
			statuses: filteredStatuses,
			count: filteredStatuses.length
		});
	} catch (e) {
		// console.error('[USER][USER_STATUS] getUserStatuses error:', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to fetch user statuses');
	}
}

// Update privacy settings
async function updatePrivacySettings(req, res) {
	try {
		// console.log('[USER][USER_STATUS] updatePrivacySettings request');
		const { showOnlineStatus, showLastSeen, showTypingStatus } = req.body || {};
		const currentUserId = req.user?.userId;

		const userStatus = await UserStatus.getOrCreateUserStatus(currentUserId);

		const privacySettings = {};
		if (typeof showOnlineStatus === 'boolean') {
			privacySettings.showOnlineStatus = showOnlineStatus;
		}
		if (typeof showLastSeen === 'boolean') {
			privacySettings.showLastSeen = showLastSeen;
		}
		if (typeof showTypingStatus === 'boolean') {
			privacySettings.showTypingStatus = showTypingStatus;
		}

		await userStatus.updatePrivacySettings(privacySettings);

		// console.log('[USER][USER_STATUS] Privacy settings updated successfully');
		return ApiResponse.success(res, {
			privacySettings: userStatus.privacySettings
		}, 'Privacy settings updated successfully');
	} catch (e) {
		// console.error('[USER][USER_STATUS] updatePrivacySettings error:', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to update privacy settings');
	}
}

// Get typing users in chat
async function getTypingUsers(req, res) {
	try {
		// console.log('[USER][USER_STATUS] getTypingUsers request');
		const { chatId } = req.params || {};
		const currentUserId = req.user?.userId;

		// Validate chat exists and user is participant
		const Chat = require('../userModel/chatModel');
		const chat = await Chat.findById(chatId);
		if (!chat) {
			return ApiResponse.notFound(res, 'Chat not found');
		}

		const isParticipant = chat.participants.some(p => p.toString() === currentUserId.toString());
		if (!isParticipant) {
			return ApiResponse.forbidden(res, 'Access denied to this chat');
		}

		const typingUsers = await UserStatus.getTypingUsersInChat(chatId);

		// Filter out current user and respect privacy settings
		const filteredTypingUsers = typingUsers
			.filter(typing => typing.userId._id.toString() !== currentUserId.toString())
			.map(typing => ({
				userId: typing.userId,
				startedTyping: typing.startedTyping
			}));

		// console.log('[USER][USER_STATUS] Typing users fetched successfully');
		return ApiResponse.success(res, {
			typingUsers: filteredTypingUsers,
			count: filteredTypingUsers.length
		});
	} catch (e) {
		// console.error('[USER][USER_STATUS] getTypingUsers error:', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to fetch typing users');
	}
}

// Get status statistics
async function getStatusStats(req, res) {
	try {
		// console.log('[USER][USER_STATUS] getStatusStats request');
		const currentUserId = req.user?.userId;

		const stats = await UserStatus.getStatusStats();

		// Get user's own status
		const userStatus = await UserStatus.findOne({ userId: currentUserId });
		const userStats = {
			...stats,
			userStatus: userStatus ? {
				isOnline: userStatus.isOnline,
				lastSeen: userStatus.lastSeen,
				status: userStatus.status,
				privacySettings: userStatus.privacySettings
			} : null
		};

		// console.log('[USER][USER_STATUS] Status stats fetched successfully');
		return ApiResponse.success(res, userStats);
	} catch (e) {
		// console.error('[USER][USER_STATUS] getStatusStats error:', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to fetch status statistics');
	}
}

module.exports = {
	updateUserStatus,
	getUserStatus,
	getOnlineUsers,
	getRecentlyActiveUsers,
	getUserStatuses,
	updatePrivacySettings,
	getTypingUsers,
	getStatusStats
};