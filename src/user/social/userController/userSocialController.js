const User = require('../../auth/model/userAuthModel');
const Report = require('../userModel/userReportModel');
const FollowRequest = require('../userModel/followRequestModel');
const Post = require('../userModel/postModel');
const ApiResponse = require('../../../utils/apiResponse');
const notificationService = require('../../../notification/services/notificationService');
const enhancedRealtimeService = require('../../../services/enhancedRealtimeService');

// Send follow request to a user (or directly follow if public account)
async function sendFollowRequest(req, res) {
	try {
		console.log('[USER][SOCIAL] sendFollowRequest request started');
		console.log('[USER][SOCIAL] Request params:', req.params);
		console.log('[USER][SOCIAL] Request body:', req.body);
		console.log('[USER][SOCIAL] Current user info:', req.user);

		const { userId } = req.params || {};
		const { message = '' } = req.body || {};
		const currentUserId = req.user?.userId;

		console.log('[USER][SOCIAL] Extracted data:', { userId, message, currentUserId });

		if (!userId || userId === currentUserId) {
			console.log('[USER][SOCIAL] Invalid request: userId or self-follow attempt');
			return ApiResponse.badRequest(res, 'Invalid user ID or cannot follow yourself');
		}

		console.log('[USER][SOCIAL] Fetching users from database...');
		// Check if both users exist and are active
		const [currentUser, targetUser] = await Promise.all([
			User.findById(currentUserId),
			User.findById(userId)
		]);

		console.log('[USER][SOCIAL] Database query results:', {
			currentUser: currentUser ? { id: currentUser._id, isActive: currentUser.isActive } : null,
			targetUser: targetUser ? { id: targetUser._id, isActive: targetUser.isActive, isPrivate: targetUser.privacySettings?.isPrivate } : null
		});

		if (!currentUser || !targetUser) {
			console.log('[USER][SOCIAL] User not found in database');
			return ApiResponse.notFound(res, 'User not found');
		}

		if (!currentUser.isActive || !targetUser.isActive) {
			console.log('[USER][SOCIAL] Inactive user detected:', {
				currentUserActive: currentUser.isActive,
				targetUserActive: targetUser.isActive
			});
			return ApiResponse.badRequest(res, 'Cannot follow inactive users');
		}

		// Check if already following
		console.log('[USER][SOCIAL] Checking if already following:', {
			currentUserFollowing: currentUser.following,
			targetUserId: userId,
			isFollowing: currentUser.following.includes(userId)
		});

		if (currentUser.following.includes(userId)) {
			console.log('[USER][SOCIAL] Already following this user');
			return ApiResponse.badRequest(res, 'Already following this user');
		}

		// Check if blocked
		console.log('[USER][SOCIAL] Checking block status:', {
			currentUserBlockedUsers: currentUser.blockedUsers,
			targetUserBlockedUsers: targetUser.blockedUsers,
			isBlocked: currentUser.blockedUsers.includes(userId) || targetUser.blockedUsers.includes(currentUserId)
		});

		if (currentUser.blockedUsers.includes(userId) || targetUser.blockedUsers.includes(currentUserId)) {
			console.log('[USER][SOCIAL] Blocked user detected');
			return ApiResponse.forbidden(res, 'Cannot follow blocked users');
		}

		// Check if target user has a public account
		const isPublicAccount = !targetUser.privacySettings?.isPrivate;
		console.log('[USER][SOCIAL] Target account type:', isPublicAccount ? 'PUBLIC' : 'PRIVATE');

		// PUBLIC ACCOUNT - Direct follow (Instagram style)
		if (isPublicAccount) {
			console.log('[USER][SOCIAL] Public account detected - adding to following/followers directly...');
			
			// Update both users' following/followers arrays
			await Promise.all([
				User.findByIdAndUpdate(currentUserId, { $addToSet: { following: userId } }),
				User.findByIdAndUpdate(userId, { $addToSet: { followers: currentUserId } })
			]);

			// Check if there's an existing follow request and update it to accepted
			const existingRequest = await FollowRequest.findOne({
				requester: currentUserId,
				recipient: userId
			});

			if (existingRequest) {
				existingRequest.status = 'accepted';
				existingRequest.respondedAt = new Date();
				await existingRequest.save();
			} else {
				// Create a follow request record with accepted status
				await FollowRequest.create({
					requester: currentUserId,
					recipient: userId,
					message: message.trim(),
					status: 'accepted',
					respondedAt: new Date()
				});
			}

			// Create notification for new follower
			try {
				await notificationService.create({
					context: 'social',
					type: 'follow',
					recipientId: userId,
					senderId: currentUserId,
					data: {
						userId: currentUserId,
						contentType: 'user'
					}
				});
			} catch (notificationError) {
				console.error('[USER][SOCIAL] Error creating notification for follow:', notificationError);
				// Don't fail the request if notification fails
			}

			// Emit real-time follow status update for public account (direct follow)
			try {
				const [updatedCurrentUser, updatedTargetUser] = await Promise.all([
					User.findById(currentUserId).select('following followers'),
					User.findById(userId).select('following followers')
				]);

				// Emit to both users
				enhancedRealtimeService.emitToUser(
					currentUserId,
					'follow_status:updated',
					{
						userId: userId,
						followerId: currentUserId,
						status: 'following',
						followerCount: updatedTargetUser.followers.length,
						followingCount: updatedCurrentUser.following.length,
						timestamp: new Date()
					}
				);

				enhancedRealtimeService.emitToUser(
					userId,
					'follow_status:updated',
					{
						userId: userId,
						followerId: currentUserId,
						status: 'following',
						followerCount: updatedTargetUser.followers.length,
						followingCount: updatedCurrentUser.following.length,
						timestamp: new Date()
					}
				);
				console.log('[USER][SOCIAL] ✅ Real-time events emitted: follow_status:updated to both users');
			} catch (realtimeError) {
				console.error('[USER][SOCIAL] Error emitting real-time follow status update:', realtimeError);
				// Don't fail the request if real-time event fails
			}

			console.log('[USER][SOCIAL] User followed successfully (public account)');
			return ApiResponse.success(res, {
				userId: targetUser._id,
				username: targetUser.username,
				fullName: targetUser.fullName,
				accountType: 'public',
				following: true
			}, 'User followed successfully');
		}

		// PRIVATE ACCOUNT - Follow request flow (Instagram style)
		console.log('[USER][SOCIAL] Private account detected - creating follow request...');

		// Check if there's already a pending request
		const existingPendingRequest = await FollowRequest.findOne({
			requester: currentUserId,
			recipient: userId,
			status: 'pending'
		});

		console.log('[USER][SOCIAL] Existing pending request check result:', existingPendingRequest ? { id: existingPendingRequest._id, status: existingPendingRequest.status } : 'No existing pending request');

		if (existingPendingRequest) {
			console.log('[USER][SOCIAL] Follow request already sent');
			// Return followStatus in error response to help frontend handle it correctly
			return ApiResponse.badRequest(res, 'Follow request already sent', 'BAD_REQUEST', {
				followStatus: 'pending',
				status: 'pending',
				isFollowing: false
			});
		}

		// Check if there's an existing request (rejected or cancelled) that can be reused
		// Priority: cancelled > rejected (use most recent cancelled, then most recent rejected)
		const existingCancelledRequest = await FollowRequest.findOne({
			requester: currentUserId,
			recipient: userId,
			status: 'cancelled'
		}).sort({ updatedAt: -1 }); // Get the most recent one

		const existingRejectedRequest = await FollowRequest.findOne({
			requester: currentUserId,
			recipient: userId,
			status: 'rejected'
		}).sort({ respondedAt: -1 }); // Get the most recent one

		console.log('[USER][SOCIAL] Existing cancelled request check result:', existingCancelledRequest ? { id: existingCancelledRequest._id, status: existingCancelledRequest.status } : 'No existing cancelled request');
		console.log('[USER][SOCIAL] Existing rejected request check result:', existingRejectedRequest ? { id: existingRejectedRequest._id, status: existingRejectedRequest.status } : 'No existing rejected request');

		let followRequest;

		// Reuse cancelled request first (most recent), then rejected request
		const existingRequest = existingCancelledRequest || existingRejectedRequest;

		if (existingRequest) {
			const requestType = existingRequest.status === 'cancelled' ? 'cancelled' : 'rejected';
			console.log(`[USER][SOCIAL] Reusing ${requestType} follow request, updating to pending...`);
			// Reuse the existing request by updating it to pending
			existingRequest.status = 'pending';
			existingRequest.message = message.trim();
			existingRequest.respondedAt = null;
			existingRequest.createdAt = new Date(); // Update to current time
			existingRequest.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Reset expiration to 7 days from now
			await existingRequest.save();
			followRequest = existingRequest;

			console.log(`[USER][SOCIAL] ${requestType.charAt(0).toUpperCase() + requestType.slice(1)} follow request updated to pending:`, {
				id: followRequest._id,
				requester: followRequest.requester,
				recipient: followRequest.recipient,
				message: followRequest.message,
				status: followRequest.status,
				expiresAt: followRequest.expiresAt
			});
		} else {
			console.log('[USER][SOCIAL] Creating new follow request...');
			// Create new follow request
			followRequest = await FollowRequest.create({
				requester: currentUserId,
				recipient: userId,
				message: message.trim()
			});

			console.log('[USER][SOCIAL] Follow request created:', {
				id: followRequest._id,
				requester: followRequest.requester,
				recipient: followRequest.recipient,
				message: followRequest.message,
				status: followRequest.status,
				expiresAt: followRequest.expiresAt
			});
		}

		// Create notification for follow request
		try {
			await notificationService.create({
				context: 'social',
				type: 'follow_request',
				recipientId: userId,
				senderId: currentUserId,
				data: {
					requestId: followRequest._id.toString(),
					userId: currentUserId,
					contentType: 'user'
				}
			});
		} catch (notificationError) {
			console.error('[USER][SOCIAL] Error creating notification for follow request:', notificationError);
			// Don't fail the request if notification fails
		}

		console.log('[USER][SOCIAL] Populating follow request data...');
		// Populate the request for response
		await followRequest.populate([
			{ path: 'requester', select: 'username fullName profilePictureUrl' },
			{ path: 'recipient', select: 'username fullName profilePictureUrl' }
		]);

		console.log('[USER][SOCIAL] Populated follow request:', {
			requester: followRequest.requester ? {
				id: followRequest.requester._id,
				username: followRequest.requester.username,
				fullName: followRequest.requester.fullName
			} : null,
			recipient: followRequest.recipient ? {
				id: followRequest.recipient._id,
				username: followRequest.recipient.username,
				fullName: followRequest.recipient.fullName
			} : null
		});

		const responseData = {
			requestId: followRequest._id,
			recipient: {
				id: followRequest.recipient._id,
				username: followRequest.recipient.username,
				fullName: followRequest.recipient.fullName
			},
			message: followRequest.message,
			status: followRequest.status,
			accountType: 'private',
			expiresAt: followRequest.expiresAt,
			createdAt: followRequest.createdAt
		};

		// Emit real-time event to recipient
		try {
			enhancedRealtimeService.emitToUser(
				userId, // recipient
				'follow_request:received',
				{
					requestId: followRequest._id.toString(),
					requester: {
						_id: currentUser._id,
						username: currentUser.username,
						fullName: currentUser.fullName,
						profilePictureUrl: currentUser.profilePictureUrl,
						verificationStatus: currentUser.verificationStatus
					},
					message: followRequest.message,
					createdAt: followRequest.createdAt,
					timestamp: new Date()
				}
			);
			console.log('[USER][SOCIAL] ✅ Real-time event emitted: follow_request:received to user', userId);
		} catch (realtimeError) {
			console.error('[USER][SOCIAL] Error emitting real-time event:', realtimeError);
			// Don't fail the request if real-time event fails
		}

		console.log('[USER][SOCIAL] Follow request sent successfully, returning response:', responseData);
		return ApiResponse.created(res, responseData, 'Follow request sent successfully');
	} catch (e) {
		console.error('[USER][SOCIAL] sendFollowRequest error:', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to send follow request');
	}
}

// Unfollow a user
async function unfollowUser(req, res) {
	try {
		console.log('[USER][SOCIAL] unfollowUser request started');
		console.log('[USER][SOCIAL] Request params:', req.params);
		console.log('[USER][SOCIAL] Current user info:', req.user);

		const { userId } = req.params || {};
		const currentUserId = req.user?.userId;

		console.log('[USER][SOCIAL] Extracted data:', { userId, currentUserId });

		if (!userId || userId === currentUserId) {
			console.log('[USER][SOCIAL] Invalid request: userId or self-unfollow attempt');
			return ApiResponse.badRequest(res, 'Invalid user ID or cannot unfollow yourself');
		}

		console.log('[USER][SOCIAL] Fetching users from database...');
		// Check if both users exist
		const [currentUser, targetUser] = await Promise.all([
			User.findById(currentUserId),
			User.findById(userId)
		]);

		console.log('[USER][SOCIAL] Database query results:', {
			currentUser: currentUser ? { id: currentUser._id, following: currentUser.following } : null,
			targetUser: targetUser ? { id: targetUser._id, followers: targetUser.followers } : null
		});

		if (!currentUser || !targetUser) {
			console.log('[USER][SOCIAL] User not found in database');
			return ApiResponse.notFound(res, 'User not found');
		}

		// Check if currently following
		const isFollowing = currentUser.following.some(f => f.toString() === userId);
		console.log('[USER][SOCIAL] Checking if currently following:', {
			currentUserFollowing: currentUser.following,
			targetUserId: userId,
			isFollowing: isFollowing
		});

		// Check for pending follow request (if not already following)
		let hasPendingRequest = false;
		if (!isFollowing) {
			const pendingRequest = await FollowRequest.findOne({
				requester: currentUserId,
				recipient: userId,
				status: 'pending'
			});
			
			if (pendingRequest) {
				hasPendingRequest = true;
				console.log('[USER][SOCIAL] Found pending follow request, will cancel it');
			} else {
				console.log('[USER][SOCIAL] Not currently following this user and no pending request');
				return ApiResponse.badRequest(res, 'Not following this user');
			}
		}

		if (hasPendingRequest) {
			// Cancel pending follow request (update status instead of deleting)
			console.log('[USER][SOCIAL] Cancelling pending follow request...');
			const deletedRequest = await FollowRequest.findOneAndUpdate(
				{
					requester: currentUserId,
					recipient: userId,
					status: 'pending'
				},
				{
					$set: {
						status: 'cancelled',
						respondedAt: new Date()
					}
				},
				{ new: true }
			);

			console.log('[USER][SOCIAL] Pending follow request cancelled successfully');

			// Delete the notification for the recipient (the person who received the follow request notification)
			if (deletedRequest) {
				try {
					const recipientId = userId.toString();
					const senderId = currentUserId.toString(); // The person who cancelled (sent) the request
					const requestId = deletedRequest._id.toString();
					
					console.log('[USER][SOCIAL] Deleting follow request notification for recipient:', recipientId, 'sender:', senderId, 'requestId:', requestId);
					
					const deleteResult = await notificationService.deleteByTypeAndData({
						type: 'follow_request',
						recipientId: recipientId,
						senderId: senderId, // Match by sender to ensure we delete the correct notification
						data: {
							requestId: requestId
						},
						context: 'social'
					});

					console.log('[USER][SOCIAL] Notification deletion result:', {
						deletedCount: deleteResult.deletedCount,
						matchedCount: deleteResult.matchedCount
					});

					if (deleteResult.deletedCount > 0) {
						console.log('[USER][SOCIAL] ✅ Successfully deleted follow request notification');
					} else {
						console.log('[USER][SOCIAL] ⚠️ No notification found to delete (may have been already deleted)');
					}
				} catch (notificationError) {
					// Log error but don't fail the request - follow request is already deleted
					console.error('[USER][SOCIAL] Error deleting follow request notification:', notificationError);
					console.error('[USER][SOCIAL] Follow request was cancelled but notification deletion failed');
				}
			}

			// Emit real-time event for cancelled follow request
			try {
				const currentUserInfo = await User.findById(currentUserId).select('username fullName');
				enhancedRealtimeService.emitToUser(
					userId, // recipient
					'follow_request:cancelled',
					{
						requestId: deletedRequest._id.toString(),
						requester: {
							_id: currentUserId,
							username: currentUserInfo.username,
							fullName: currentUserInfo.fullName
						},
						timestamp: new Date()
					}
				);
				console.log('[USER][SOCIAL] ✅ Real-time event emitted: follow_request:cancelled to recipient');
			} catch (realtimeError) {
				console.error('[USER][SOCIAL] Error emitting real-time event:', realtimeError);
				// Don't fail the request if real-time event fails
			}

			const responseData = {
				following: currentUser.following.length,
				followers: targetUser.followers.length,
				message: `Follow request cancelled`
			};

			console.log('[USER][SOCIAL] Follow request cancelled, returning response:', responseData);
			return ApiResponse.success(res, responseData, 'Follow request cancelled');
		}

		// User is following - proceed with unfollow
		console.log('[USER][SOCIAL] Updating following/followers arrays and cancelling follow request...');
		// Update both users' following/followers arrays and update follow request status to cancelled (reuse later)
		await Promise.all([
			User.findByIdAndUpdate(currentUserId, { $pull: { following: userId } }),
			User.findByIdAndUpdate(userId, { $pull: { followers: currentUserId } }),
			FollowRequest.findOneAndUpdate(
				{
					requester: currentUserId,
					recipient: userId
				},
				{
					$set: {
						status: 'cancelled',
						respondedAt: new Date()
					}
				}
			)
		]);

		console.log('[USER][SOCIAL] User unfollowed and follow request status updated to cancelled');

		// Emit real-time events for unfollow
		try {
			// Get updated counts
			const [updatedCurrentUser, updatedTargetUser] = await Promise.all([
				User.findById(currentUserId).select('following followers'),
				User.findById(userId).select('following followers')
			]);

			// Check if there was a pending request that was cancelled
			const pendingRequest = await FollowRequest.findOne({
				requester: currentUserId,
				recipient: userId,
				status: 'pending'
			});

			if (pendingRequest) {
				// Emit cancelled event if there was a pending request
				const currentUserInfo = await User.findById(currentUserId).select('username fullName');
				enhancedRealtimeService.emitToUser(
					userId, // recipient
					'follow_request:cancelled',
					{
						requestId: pendingRequest._id.toString(),
						requester: {
							_id: currentUserId,
							username: currentUserInfo.username,
							fullName: currentUserInfo.fullName
						},
						timestamp: new Date()
					}
				);
				console.log('[USER][SOCIAL] ✅ Real-time event emitted: follow_request:cancelled');
			}

			// Emit follow status update to both users
			enhancedRealtimeService.emitToUser(
				userId,
				'follow_status:updated',
				{
					userId: userId,
					followerId: currentUserId,
					status: 'not_following',
					followerCount: updatedTargetUser.followers.length,
					followingCount: updatedCurrentUser.following.length,
					timestamp: new Date()
				}
			);

			enhancedRealtimeService.emitToUser(
				currentUserId,
				'follow_status:updated',
				{
					userId: userId,
					followerId: currentUserId,
					status: 'not_following',
					followerCount: updatedTargetUser.followers.length,
					followingCount: updatedCurrentUser.following.length,
					timestamp: new Date()
				}
			);
			console.log('[USER][SOCIAL] ✅ Real-time events emitted: follow_status:updated to both users');
		} catch (realtimeError) {
			console.error('[USER][SOCIAL] Error emitting real-time events:', realtimeError);
			// Don't fail the request if real-time event fails
		}

		const responseData = {
			following: currentUser.following.length - 1,
			followers: targetUser.followers.length - 1,
			message: `Unfollowed ${targetUser.username || targetUser.fullName}`
		};

		console.log('[USER][SOCIAL] User unfollowed successfully, returning response:', responseData);
		return ApiResponse.success(res, responseData, 'User unfollowed successfully');
	} catch (e) {
		console.error('[USER][SOCIAL] unfollowUser error:', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to unfollow user');
	}
}

// Remove a follower (kick them out from following you)
async function removeFollower(req, res) {
	try {
		console.log('[USER][SOCIAL] removeFollower request started');
		console.log('[USER][SOCIAL] Request params:', req.params);
		console.log('[USER][SOCIAL] Current user info:', req.user);

		const { userId } = req.params || {};
		const currentUserId = req.user?.userId;

		console.log('[USER][SOCIAL] Extracted data:', { userId, currentUserId });

		if (!userId || userId === currentUserId) {
			console.log('[USER][SOCIAL] Invalid request: userId or self-remove attempt');
			return ApiResponse.badRequest(res, 'Invalid user ID or cannot remove yourself');
		}

		console.log('[USER][SOCIAL] Fetching users from database...');
		// Check if both users exist
		const [currentUser, followerUser] = await Promise.all([
			User.findById(currentUserId),
			User.findById(userId)
		]);

		console.log('[USER][SOCIAL] Database query results:', {
			currentUser: currentUser ? { id: currentUser._id, followers: currentUser.followers } : null,
			followerUser: followerUser ? { id: followerUser._id, following: followerUser.following } : null
		});

		if (!currentUser || !followerUser) {
			console.log('[USER][SOCIAL] User not found in database');
			return ApiResponse.notFound(res, 'User not found');
		}

		// Check if the user is actually a follower
		console.log('[USER][SOCIAL] Checking if user is a follower:', {
			currentUserFollowers: currentUser.followers,
			followerUserId: userId,
			isFollower: currentUser.followers.some(f => f.toString() === userId)
		});

		if (!currentUser.followers.some(f => f.toString() === userId)) {
			console.log('[USER][SOCIAL] User is not a follower');
			return ApiResponse.badRequest(res, 'This user is not following you');
		}

		console.log('[USER][SOCIAL] Removing follower and setting follow request to pending...');
		// Remove from current user's followers and from the follower's following list
		// Set follow request status to pending so they can easily request again
		await Promise.all([
			User.findByIdAndUpdate(currentUserId, { $pull: { followers: userId } }),
			User.findByIdAndUpdate(userId, { $pull: { following: currentUserId } }),
			FollowRequest.findOneAndUpdate(
				{
					requester: userId,
					recipient: currentUserId,
					status: 'accepted'
				},
				{
					status: 'none',
					respondedAt: null
				}
			)
		]);

		console.log('[USER][SOCIAL] Follower removed and follow request set to pending');

		// Emit real-time events
		try {
			// Get updated counts
			const updatedCurrentUser = await User.findById(currentUserId).select('followers');
			const followerUser = await User.findById(userId).select('following');

			// Emit to removed follower
			const currentUserInfo = await User.findById(currentUserId).select('username fullName');
			enhancedRealtimeService.emitToUser(
				userId, // removed follower
				'follower:removed',
				{
					userId: currentUserId,
					removedBy: {
						_id: currentUser._id,
						username: currentUserInfo.username,
						fullName: currentUserInfo.fullName
					},
					followerCount: updatedCurrentUser.followers.length,
					timestamp: new Date()
				}
			);

			// Also emit follow status update
			enhancedRealtimeService.emitToUser(
				userId,
				'follow_status:updated',
				{
					userId: currentUserId,
					followerId: userId,
					status: 'not_following',
					followerCount: updatedCurrentUser.followers.length,
					followingCount: followerUser.following.length,
					timestamp: new Date()
				}
			);

			enhancedRealtimeService.emitToUser(
				currentUserId,
				'follow_status:updated',
				{
					userId: currentUserId,
					followerId: userId,
					status: 'not_following',
					followerCount: updatedCurrentUser.followers.length,
					followingCount: followerUser.following.length,
					timestamp: new Date()
				}
			);
			console.log('[USER][SOCIAL] ✅ Real-time events emitted: follower:removed and follow_status:updated');
		} catch (realtimeError) {
			console.error('[USER][SOCIAL] Error emitting real-time events:', realtimeError);
			// Don't fail the request if real-time event fails
		}

		const responseData = {
			removedUser: {
				id: followerUser._id,
				username: followerUser.username,
				fullName: followerUser.fullName
			},
			followers: currentUser.followers.length - 1,
			message: `Removed ${followerUser.username || followerUser.fullName} from followers`
		};

		console.log('[USER][SOCIAL] Follower removed successfully, returning response:', responseData);
		return ApiResponse.success(res, responseData, 'Follower removed successfully');
	} catch (e) {
		console.error('[USER][SOCIAL] removeFollower error:', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to remove follower');
	}
}

// Get followers list (search + accurate pagination, optional includeFollowing)
async function getFollowers(req, res) {
	try {
		console.log('[USER][SOCIAL] getFollowers request');
		let { page = 1, limit = 20, search = '', includeFollowing = false, userId } = req.query || {};
		
		// Use provided userId or default to current logged-in user
		const targetUserId = userId || req.user?.userId;
		const currentUserId = req.user?.userId; // Current logged-in user (for blocking filter)
		
		// IMPORTANT: Only allow includeFollowing for current user's own followers (not when viewing other users)
		// This prevents showing following users in other users' followers lists
		// Check if viewing another user's followers (userId is provided and different from current user)
		// Convert to strings for reliable comparison
		const userIdProvided = !!userId;
		const isViewingOtherUser = userIdProvided && String(userId) !== String(currentUserId);
		
		// Convert string 'true'/'false' to boolean first
		if (includeFollowing === 'true' || includeFollowing === true) includeFollowing = true;
		else if (includeFollowing === 'false' || includeFollowing === false) includeFollowing = false;
		else includeFollowing = false;
		
		// Force disable includeFollowing when viewing other users' followers
		if (isViewingOtherUser) {
			includeFollowing = false;
			console.log('[USER][SOCIAL] Disabling includeFollowing - viewing other user\'s followers');
		}
		
		console.log('[USER][SOCIAL] getFollowers params:', {
			targetUserId,
			currentUserId,
			page,
			limit,
			search,
			includeFollowing,
			isViewingOtherUser: Boolean(isViewingOtherUser),
			userIdProvided,
			userIdFromQuery: userId
		});

		const user = await User.findById(targetUserId).select('followers following');

		if (!user) {
			return ApiResponse.notFound(res, 'User not found');
		}

		// Get current user's blocked users list (if viewing another user's followers)
		let blockedUserIds = [];
		if (currentUserId && currentUserId !== targetUserId) {
			const currentUser = await User.findById(currentUserId).select('blockedUsers blockedBy');
			if (currentUser) {
				// Exclude users that current user has blocked or who have blocked current user
				blockedUserIds = [
					...(currentUser.blockedUsers || []).map(id => id.toString()),
					...(currentUser.blockedBy || []).map(id => id.toString())
				];
			}
		}

		const followerIds = user.followers || [];
		const followingIds = user.following || [];

		// Build base match for followers - exclude blocked users
		const matchStage = {
			_id: { $in: followerIds }
		};

		// Exclude blocked users if current user is viewing
		if (blockedUserIds.length > 0) {
			matchStage._id = {
				$in: followerIds.filter(id => !blockedUserIds.includes(id.toString()))
			};
		}

		// Add search filter if provided
		if (search && search.trim()) {
			const searchRegex = new RegExp(search.trim(), 'i');
			matchStage.$or = [
				{ username: searchRegex },
				{ fullName: searchRegex }
			];
		}

		const itemsPerPage = parseInt(limit);
		const currentPage = parseInt(page);

		// Aggregate followers with accurate total (after search) and pagination
		const followersAgg = await User.aggregate([
			{ $match: matchStage },
			{ $sort: { createdAt: -1 } },
			{
				$facet: {
					data: [
						{ $skip: (currentPage - 1) * itemsPerPage },
						{ $limit: itemsPerPage },
						{ $project: { username: 1, fullName: 1, profilePictureUrl: 1, verificationStatus: 1, isActive: 1 } }
					],
					totalCount: [
						{ $count: 'count' }
					]
				}
			}
		]);

		const followersData = followersAgg?.[0]?.data || [];
		const totalFiltered = followersAgg?.[0]?.totalCount?.[0]?.count || 0;

		// Optional: include up to 500 following users (deduped) in the followers response
		// DOUBLE CHECK: Ensure includeFollowing is false when viewing other users (safety check)
		if (isViewingOtherUser) {
			includeFollowing = false;
		}
		
		let includedFollowing = [];
		if (includeFollowing === 'true' || includeFollowing === true) {
			let followingIdsFiltered = followingIds;
			// Exclude blocked users from following list
			if (blockedUserIds.length > 0) {
				followingIdsFiltered = followingIds.filter(id => !blockedUserIds.includes(id.toString()));
			}

			const followingMatch = {
				_id: { $in: followingIdsFiltered }
			};
			if (search && search.trim()) {
				const searchRegex = new RegExp(search.trim(), 'i');
				followingMatch.$or = [
					{ username: searchRegex },
					{ fullName: searchRegex }
				];
			}

			includedFollowing = await User.find(followingMatch)
				.select('username fullName profilePictureUrl verificationStatus isActive')
				.limit(500)
				.lean();

			// Dedupe against existing followers
			const followerIdSet = new Set(followersData.map(f => String(f._id)));
			includedFollowing = includedFollowing.filter(f => !followerIdSet.has(String(f._id)));
		}

		// Combine followers + includedFollowing (not re-paginated)
		const combinedFollowers = [...followersData, ...includedFollowing];

		// Get follow status for each user (if current user is viewing)
		let followersWithStatus = combinedFollowers;
		if (currentUserId && currentUserId !== targetUserId) {
			// Get current user's following/followers and follow requests
			const currentUser = await User.findById(currentUserId).select('following followers');
			const currentUserFollowing = currentUser?.following?.map(id => id.toString()) || [];
			const currentUserFollowers = currentUser?.followers?.map(id => id.toString()) || [];

			// Get follow requests
			const followerUserIds = combinedFollowers.map(f => f._id || f.id);
			const followRequests = await FollowRequest.find({
				$or: [
					{ requester: currentUserId, recipient: { $in: followerUserIds } },
					{ requester: { $in: followerUserIds }, recipient: currentUserId }
				]
			}).lean();

			// Create map for follow requests
			const followRequestMap = new Map();
			followRequests.forEach(request => {
				const key = `${request.requester.toString()}_${request.recipient.toString()}`;
				followRequestMap.set(key, request);
			});

			// Add follow status to each follower
			followersWithStatus = combinedFollowers.map(follower => {
				const followerId = (follower._id || follower.id).toString();
				const isCurrentUser = followerId === currentUserId;
				const isFollowing = currentUserFollowing.includes(followerId);
				const isFollower = currentUserFollowers.includes(followerId);

				// Check follow request status
				const outgoingRequestKey = `${currentUserId}_${followerId}`;
				const incomingRequestKey = `${followerId}_${currentUserId}`;
				
				const outgoingRequest = followRequestMap.get(outgoingRequestKey);
				const incomingRequest = followRequestMap.get(incomingRequestKey);
				
				let followRequestStatus = null;
				if (outgoingRequest) {
					followRequestStatus = outgoingRequest.status; // 'pending', 'accepted', 'rejected'
				} else if (incomingRequest) {
					followRequestStatus = `incoming_${incomingRequest.status}`;
				}

				// Determine follow status
				let followStatus = 'not_following';
				if (isCurrentUser) {
					followStatus = 'self';
				} else if (isFollowing && isFollower) {
					followStatus = 'mutual';
				} else if (isFollowing) {
					followStatus = 'following';
				} else if (isFollower) {
					followStatus = 'follower';
				} else if (followRequestStatus === 'pending') {
					followStatus = 'requested';
				}

				return {
					...follower,
					isFollowing: isFollowing,
					isFollower: isFollower,
					followStatus: followStatus,
					followRequestStatus: followRequestStatus
				};
			});
		}
		const appendedCount = includedFollowing.length;
		const combinedTotal = totalFiltered + appendedCount;
		const totalPages = Math.ceil(totalFiltered / itemsPerPage);
		const hasMore = currentPage < totalPages;
		const hasPrev = currentPage > 1;

		console.log('[USER][SOCIAL] Followers fetched successfully', {
			targetUserId,
			currentUserId,
			totalFiltered,
			appendedCount,
			includeFollowing,
			actualFollowersCount: followersData.length,
			includedFollowingCount: includedFollowing.length,
			combinedCount: combinedFollowers.length,
			finalCount: followersWithStatus.length,
			currentPage,
			totalPages,
			hasMore
		});

		return ApiResponse.success(res, {
			followers: followersWithStatus,
			pagination: {
				page: currentPage,
				currentPage,
				limit: itemsPerPage,
				total: combinedTotal,
				totalFollowers: totalFiltered,
				appendedFollowingCount: appendedCount,
				pages: totalPages,
				totalPages,
				hasMore,
				hasNext: hasMore,
				hasPrev
			}
		});
	} catch (e) {
		console.error('[USER][SOCIAL] getFollowers error:', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to fetch followers');
	}
}

// Get following list
async function getFollowing(req, res) {
	try {
		console.log('[USER][SOCIAL] getFollowing request');
		const { page = 1, limit = 20, search = '', userId } = req.query || {};
		
		// Use provided userId or default to current logged-in user
		const targetUserId = userId || req.user?.userId;
		const currentUserId = req.user?.userId; // Current logged-in user (for blocking filter)
		
		// Check if viewing another user's following (userId is provided and different from current user)
		const userIdProvided = !!userId;
		const isViewingOtherUser = userIdProvided && String(userId) !== String(currentUserId);
		
		console.log('[USER][SOCIAL] getFollowing params:', {
			targetUserId,
			currentUserId,
			page,
			limit,
			search,
			isViewingOtherUser: Boolean(isViewingOtherUser),
			userIdProvided,
			userIdFromQuery: userId
		});

		// Get user with following IDs (not populated yet)
		const user = await User.findById(targetUserId).select('following');
		
		if (!user) {
			return ApiResponse.notFound(res, 'User not found');
		}

		// Get current user's blocked users list (if viewing another user's following)
		let blockedUserIds = [];
		if (currentUserId && currentUserId !== targetUserId) {
			const currentUser = await User.findById(currentUserId).select('blockedUsers blockedBy');
			if (currentUser) {
				// Exclude users that current user has blocked or who have blocked current user
				blockedUserIds = [
					...(currentUser.blockedUsers || []).map(id => id.toString()),
					...(currentUser.blockedBy || []).map(id => id.toString())
				];
			}
		}

		// Filter out blocked users from following IDs before populating
		let totalFollowingIds = user.following || [];
		if (blockedUserIds.length > 0) {
			totalFollowingIds = totalFollowingIds.filter(id => !blockedUserIds.includes(id.toString()));
		}
		const total = totalFollowingIds.length;

		// Temporarily update user's following array to filtered list for population
		user.following = totalFollowingIds;

		// Build query for populating following with optional search
		let populateQuery = {
			path: 'following',
			select: 'username fullName profilePictureUrl verificationStatus isActive',
			options: {
				sort: { createdAt: -1 }
			}
		};

		// Add search filter if provided
		if (search && search.trim()) {
			const searchRegex = new RegExp(search.trim(), 'i');
			populateQuery.match = {
				$or: [
					{ username: searchRegex },
					{ fullName: searchRegex }
				]
			};
		}

		// Apply pagination
		const itemsPerPage = parseInt(limit);
		const currentPage = parseInt(page);
		populateQuery.options.limit = itemsPerPage;
		populateQuery.options.skip = (currentPage - 1) * itemsPerPage;

		// Populate following with search and pagination
		await user.populate(populateQuery);

		let following = user.following || [];

		// Get follow status for each user (if current user is viewing)
		let followingWithStatus = following;
		if (currentUserId && currentUserId !== targetUserId) {
			// Get current user's following/followers and follow requests
			const currentUser = await User.findById(currentUserId).select('following followers');
			const currentUserFollowing = currentUser?.following?.map(id => id.toString()) || [];
			const currentUserFollowers = currentUser?.followers?.map(id => id.toString()) || [];

			// Get follow requests
			const followingUserIds = following.map(f => (f._id || f.id).toString());
			const followRequests = await FollowRequest.find({
				$or: [
					{ requester: currentUserId, recipient: { $in: followingUserIds } },
					{ requester: { $in: followingUserIds }, recipient: currentUserId }
				]
			}).lean();

			// Create map for follow requests
			const followRequestMap = new Map();
			followRequests.forEach(request => {
				const key = `${request.requester.toString()}_${request.recipient.toString()}`;
				followRequestMap.set(key, request);
			});

			// Add follow status to each following user
			followingWithStatus = following.map(followingUser => {
				const followingUserId = (followingUser._id || followingUser.id).toString();
				const isCurrentUser = followingUserId === currentUserId;
				const isFollowing = currentUserFollowing.includes(followingUserId);
				const isFollower = currentUserFollowers.includes(followingUserId);

				// Check follow request status
				const outgoingRequestKey = `${currentUserId}_${followingUserId}`;
				const incomingRequestKey = `${followingUserId}_${currentUserId}`;
				
				const outgoingRequest = followRequestMap.get(outgoingRequestKey);
				const incomingRequest = followRequestMap.get(incomingRequestKey);
				
				let followRequestStatus = null;
				if (outgoingRequest) {
					followRequestStatus = outgoingRequest.status; // 'pending', 'accepted', 'rejected'
				} else if (incomingRequest) {
					followRequestStatus = `incoming_${incomingRequest.status}`;
				}

				// Determine follow status
				let followStatus = 'not_following';
				if (isCurrentUser) {
					followStatus = 'self';
				} else if (isFollowing && isFollower) {
					followStatus = 'mutual';
				} else if (isFollowing) {
					followStatus = 'following';
				} else if (isFollower) {
					followStatus = 'follower';
				} else if (followRequestStatus === 'pending') {
					followStatus = 'requested';
				}

				// Convert Mongoose document to plain object if needed
				const userObj = followingUser.toObject ? followingUser.toObject() : (followingUser._doc || followingUser);
				
				return {
					...userObj,
					isFollowing: isFollowing,
					isFollower: isFollower,
					followStatus: followStatus,
					followRequestStatus: followRequestStatus
				};
			});
		}

		// Calculate pagination metadata
		const totalPages = Math.ceil(total / itemsPerPage);
		const hasMore = currentPage < totalPages;
		const hasPrev = currentPage > 1;

		console.log('[USER][SOCIAL] Following fetched successfully', {
			total,
			currentPage,
			totalPages,
			returned: followingWithStatus.length,
			hasMore
		});

		return ApiResponse.success(res, {
			following: followingWithStatus,
			pagination: {
				page: currentPage,
				currentPage: currentPage,
				limit: itemsPerPage,
				total,
				totalPages,
				pages: totalPages,
				hasMore,
				hasNext: hasMore,
				hasPrev
			}
		});
	} catch (e) {
		console.error('[USER][SOCIAL] getFollowing error:', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to fetch following');
	}
}

// Block a user
async function blockUser(req, res) {
	try {
		console.log('[USER][SOCIAL] blockUser request');
		const { userId } = req.params || {};
		const currentUserId = req.user?.userId;

		if (!userId || userId === currentUserId) {
			return ApiResponse.badRequest(res, 'Invalid user ID or cannot block yourself');
		}

		// Check if both users exist and are active
		const [currentUser, targetUser] = await Promise.all([
			User.findById(currentUserId),
			User.findById(userId)
		]);

		if (!currentUser || !targetUser) {
			return ApiResponse.notFound(res, 'User not found');
		}

		// Check if already blocked
		if (currentUser.blockedUsers.includes(userId)) {
			return ApiResponse.badRequest(res, 'User is already blocked');
		}

		// Remove from following/followers if exists, add to blocked, and delete all follow requests
		await Promise.all([
			User.findByIdAndUpdate(currentUserId, {
				$pull: { following: userId, followers: userId },
				$addToSet: { blockedUsers: userId }
			}),
			User.findByIdAndUpdate(userId, {
				$pull: { following: currentUserId, followers: currentUserId },
				$addToSet: { blockedBy: currentUserId }
			}),
			// Delete all follow requests between these users (both directions)
			FollowRequest.deleteMany({
				$or: [
					{ requester: currentUserId, recipient: userId },
					{ requester: userId, recipient: currentUserId }
				]
			})
		]);

		// Remove likes from both users' posts and decrement likesCount
		// Remove likes by currentUser on targetUser's posts
		await Post.updateMany(
			{ author: userId, 'likes.user': currentUserId },
			{ 
				$pull: { likes: { user: currentUserId } },
				$inc: { likesCount: -1 }
			}
		);

		// Remove likes by targetUser on currentUser's posts
		await Post.updateMany(
			{ author: currentUserId, 'likes.user': userId },
			{ 
				$pull: { likes: { user: userId } },
				$inc: { likesCount: -1 }
			}
		);

		// Remove comments from both users' posts and decrement commentsCount
		// First, get count of comments to remove, then update
		// Remove comments by currentUser on targetUser's posts
		const postsWithCurrentUserComments = await Post.find(
			{ author: userId, 'comments.user': currentUserId },
			{ _id: 1, comments: 1 }
		);
		
		for (const post of postsWithCurrentUserComments) {
			const commentsCount = post.comments.filter(c => String(c.user) === String(currentUserId)).length;
			if (commentsCount > 0) {
				await Post.findByIdAndUpdate(post._id, {
					$pull: { comments: { user: currentUserId } },
					$inc: { commentsCount: -commentsCount }
				});
			}
		}

		// Remove comments by targetUser on currentUser's posts
		const postsWithTargetUserComments = await Post.find(
			{ author: currentUserId, 'comments.user': userId },
			{ _id: 1, comments: 1 }
		);
		
		for (const post of postsWithTargetUserComments) {
			const commentsCount = post.comments.filter(c => String(c.user) === String(userId)).length;
			if (commentsCount > 0) {
				await Post.findByIdAndUpdate(post._id, {
					$pull: { comments: { user: userId } },
					$inc: { commentsCount: -commentsCount }
				});
			}
		}

		// Remove likes on comments (nested likes)
		// Remove likes by currentUser on comments in targetUser's posts (using arrayFilters)
		await Post.updateMany(
			{ author: userId },
			{ $pull: { 'comments.$[elem].likes': { user: currentUserId } } },
			{ arrayFilters: [{ 'elem.likes.user': currentUserId }] }
		);

		// Remove likes by targetUser on comments in currentUser's posts (using arrayFilters)
		await Post.updateMany(
			{ author: currentUserId },
			{ $pull: { 'comments.$[elem].likes': { user: userId } } },
			{ arrayFilters: [{ 'elem.likes.user': userId }] }
		);

		console.log('[USER][SOCIAL] User blocked successfully, follow requests deleted, and all interactions removed');
		return ApiResponse.success(res, {
			message: `${targetUser.username || targetUser.fullName} has been blocked`
		}, 'User blocked successfully');
	} catch (e) {
		console.error('[USER][SOCIAL] blockUser error:', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to block user');
	}
}

// Unblock a user
async function unblockUser(req, res) {
	try {
		console.log('[USER][SOCIAL] unblockUser request');
		const { userId } = req.params || {};
		const currentUserId = req.user?.userId;

		if (!userId || userId === currentUserId) {
			return ApiResponse.badRequest(res, 'Invalid user ID or cannot unblock yourself');
		}

		// Check if both users exist
		const [currentUser, targetUser] = await Promise.all([
			User.findById(currentUserId),
			User.findById(userId)
		]);

		if (!currentUser || !targetUser) {
			return ApiResponse.notFound(res, 'User not found');
		}

		// Check if currently blocked
		if (!currentUser.blockedUsers.includes(userId)) {
			return ApiResponse.badRequest(res, 'User is not blocked');
		}

		// Remove from blocked lists
		await Promise.all([
			User.findByIdAndUpdate(currentUserId, { $pull: { blockedUsers: userId } }),
			User.findByIdAndUpdate(userId, { $pull: { blockedBy: currentUserId } })
		]);

		console.log('[USER][SOCIAL] User unblocked successfully');
		return ApiResponse.success(res, {
			message: `${targetUser.username || targetUser.fullName} has been unblocked`
		}, 'User unblocked successfully');
	} catch (e) {
		console.error('[USER][SOCIAL] unblockUser error:', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to unblock user');
	}
}

// Get blocked users list
async function getBlockedUsers(req, res) {
	try {
		console.log('[USER][SOCIAL] getBlockedUsers request');
		const { page = 1, limit = 20 } = req.query || {};
		const currentUserId = req.user?.userId;

		const user = await User.findById(currentUserId)
			.populate({
				path: 'blockedUsers',
				select: 'username fullName profilePictureUrl',
				options: {
					limit: parseInt(limit),
					skip: (parseInt(page) - 1) * parseInt(limit),
					sort: { createdAt: -1 }
				}
			});

		if (!user) {
			return ApiResponse.notFound(res, 'User not found');
		}

		const total = user.blockedUsers.length;
		const blockedUsers = user.blockedUsers;

		console.log('[USER][SOCIAL] Blocked users fetched successfully');
		return ApiResponse.success(res, {
			blockedUsers,
			pagination: {
				page: parseInt(page),
				limit: parseInt(limit),
				total,
				pages: Math.ceil(total / parseInt(limit))
			}
		});
	} catch (e) {
		console.error('[USER][SOCIAL] getBlockedUsers error:', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to fetch blocked users');
	}
}

// Report a user
async function reportUser(req, res) {
	try {
		console.log('[USER][SOCIAL] reportUser request');
		const { userId } = req.params || {};
		const { reportType, description, contentType = 'profile', contentId = '', contentUrl = '' } = req.body || {};
		const currentUserId = req.user?.userId;

		if (!userId || userId === currentUserId) {
			return ApiResponse.badRequest(res, 'Invalid user ID or cannot report yourself');
		}

		if (!description) {
			return ApiResponse.badRequest(res, 'Report type and description are required');
		}

		// Check if both users exist and are active
		const [currentUser, reportedUser] = await Promise.all([
			User.findById(currentUserId),
			User.findById(userId)
		]);

		if (!currentUser || !reportedUser) {
			return ApiResponse.notFound(res, 'User not found');
		}

		// Check if already reported
		const existingReport = await Report.findOne({
			reporter: currentUserId,
			reportedUser: userId
		});

		if (existingReport) {
			return ApiResponse.badRequest(res, 'You have already reported this user');
		}

		// Create new report
		const report = await Report.create({
			reporter: currentUserId,
			reportedUser: userId,
			reportType:"spam",
			description: description.trim(),
			reportedContent: {
				contentType:"profile",
				contentId,
				contentUrl
			}
		});

		// Populate the report for response
		await report.populate([
			{ path: 'reporter', select: 'username fullName' },
			{ path: 'reportedUser', select: 'username fullName' }
		]);

		console.log('[USER][SOCIAL] User reported successfully');
		return ApiResponse.created(res, {
			reportId: report._id,
			reportedUser: report.reportedUser.username || report.reportedUser.fullName,
			reportType: report.reportType,
			status: report.status,
			createdAt: report.createdAt
		}, 'User reported successfully');
	} catch (e) {
		console.error('[USER][SOCIAL] reportUser error:', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to report user');
	}
}

// Get user's reports
async function getUserReports(req, res) {
	try {
		console.log('[USER][SOCIAL] getUserReports request');
		const { page = 1, limit = 10 } = req.query || {};
		const currentUserId = req.user?.userId;

		const skip = (parseInt(page) - 1) * parseInt(limit);

		const reports = await Report.find({ reporter: currentUserId })
			.populate('reportedUser', 'username fullName profilePictureUrl')
			.sort({ createdAt: -1 })
			.skip(skip)
			.limit(parseInt(limit))
			.lean();

		const total = await Report.countDocuments({ reporter: currentUserId });

		console.log('[USER][SOCIAL] User reports fetched successfully');
		return ApiResponse.success(res, {
			reports,
			pagination: {
				page: parseInt(page),
				limit: parseInt(limit),
				total,
				pages: Math.ceil(total / parseInt(limit))
			}
		});
	} catch (e) {
		console.error('[USER][SOCIAL] getUserReports error:', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to fetch user reports');
	}
}

// Get user's social stats
async function getSocialStats(req, res) {
	try {
		console.log('[USER][SOCIAL] getSocialStats request');
		const currentUserId = req.user?.userId;

		const user = await User.findById(currentUserId)
			.select('following followers blockedUsers blockedBy');

		if (!user) {
			return ApiResponse.notFound(res, 'User not found');
		}

		console.log('[USER][SOCIAL] Social stats fetched successfully');
		return ApiResponse.success(res, {
			followingCount: user.following.length,
			followersCount: user.followers.length,
			blockedCount: user.blockedUsers.length,
			blockedByCount: user.blockedBy.length
		});
	} catch (e) {
		console.error('[USER][SOCIAL] getSocialStats error:', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to fetch social stats');
	}
}

// Accept follow request
async function acceptFollowRequest(req, res) {
	try {
		console.log('[USER][SOCIAL] acceptFollowRequest request started');
		console.log('[USER][SOCIAL] Request params:', req.params);
		console.log('[USER][SOCIAL] Current user info:', req.user);

		const { requestId } = req.params || {};
		const currentUserId = req.user?.userId;

		console.log('[USER][SOCIAL] Extracted data:', { requestId, currentUserId });

		if (!requestId) {
			console.log('[USER][SOCIAL] Request ID is missing');
			return ApiResponse.badRequest(res, 'Request ID is required');
		}

		console.log('[USER][SOCIAL] Finding follow request in database...');
		// Find the follow request
		const followRequest = await FollowRequest.findOne({
			_id: requestId,
			recipient: currentUserId,
			status: 'pending'
		}).populate(['requester', 'recipient']);

		console.log('[USER][SOCIAL] Follow request query result:', followRequest ? {
			id: followRequest._id,
			requester: followRequest.requester ? { id: followRequest.requester._id, username: followRequest.requester.username } : null,
			recipient: followRequest.recipient ? { id: followRequest.recipient._id, username: followRequest.recipient.username } : null,
			status: followRequest.status
		} : 'No follow request found');

		if (!followRequest) {
			console.log('[USER][SOCIAL] Follow request not found or already processed');
			return ApiResponse.notFound(res, 'Follow request not found or already processed');
		}

		console.log('[USER][SOCIAL] Checking if users still exist and are active...');
		// Check if users still exist and are active
		const [requester, recipient] = await Promise.all([
			User.findById(followRequest.requester._id),
			User.findById(followRequest.recipient._id)
		]);

		console.log('[USER][SOCIAL] User existence and activity check:', {
			requester: requester ? { id: requester._id, isActive: requester.isActive, following: requester.following } : null,
			recipient: recipient ? { id: recipient._id, isActive: recipient.isActive } : null
		});

		if (!requester || !recipient || !requester.isActive || !recipient.isActive) {
			console.log('[USER][SOCIAL] Cannot process request - user not found or inactive');
			return ApiResponse.badRequest(res, 'Cannot process request - user not found or inactive');
		}

		// Check if already following (race condition protection)
		console.log('[USER][SOCIAL] Checking if already following (race condition protection):', {
			requesterFollowing: requester.following,
			recipientId: recipient._id,
			isAlreadyFollowing: requester.following.includes(recipient._id)
		});

		if (requester.following.includes(recipient._id)) {
			console.log('[USER][SOCIAL] Already following this user, updating request status');
			// Update request status to accepted and return
			followRequest.status = 'accepted';
			followRequest.respondedAt = new Date();
			await followRequest.save();
			return ApiResponse.badRequest(res, 'Already following this user');
		}

		console.log('[USER][SOCIAL] Updating follow request status to accepted...');
		// Update follow request status
		followRequest.status = 'accepted';
		followRequest.respondedAt = new Date();
		await followRequest.save();

		console.log('[USER][SOCIAL] Updating both users following/followers arrays...');
		// Update both users' following/followers arrays
		await Promise.all([
			User.findByIdAndUpdate(requester._id, { $addToSet: { following: recipient._id } }),
			User.findByIdAndUpdate(recipient._id, { $addToSet: { followers: requester._id } })
		]);

		// Update the original follow_request notification to reflect accepted status
		try {
			const recipientId = currentUserId.toString(); // The person who received the follow request notification
			const senderId = followRequest.requester._id.toString(); // The person who sent the request
			const requestId = followRequest._id.toString();
			
			console.log('[USER][SOCIAL] Updating follow_request notification status to accepted:', {
				recipientId,
				senderId,
				requestId
			});
			
			const updateResult = await notificationService.updateByTypeAndData({
				type: 'follow_request',
				recipientId: recipientId,
				senderId: senderId,
				data: {
					requestId: requestId
				},
				updateData: {
					status: 'accepted',
					requestId: requestId // Keep requestId in data
				},
				context: 'social'
			});

			console.log('[USER][SOCIAL] Notification update result:', {
				matchedCount: updateResult.matchedCount,
				modifiedCount: updateResult.modifiedCount
			});

			if (updateResult.modifiedCount > 0) {
				console.log('[USER][SOCIAL] ✅ Successfully updated follow_request notification status to accepted');
			} else {
				console.log('[USER][SOCIAL] ⚠️ No notification found to update (may have been already updated or deleted)');
			}
		} catch (notificationUpdateError) {
			// Log error but don't fail the request
			console.error('[USER][SOCIAL] Error updating follow_request notification status:', notificationUpdateError);
			console.error('[USER][SOCIAL] Follow request was accepted but notification update failed');
		}

		// Create notification for follow request accepted (to notify the requester)
		try {
			await notificationService.create({
				context: 'social',
				type: 'follow_accepted',
				recipientId: followRequest.requester.toString(),
				senderId: currentUserId,
				data: {
					requestId: followRequest._id.toString(),
					userId: currentUserId,
					contentType: 'user'
				}
			});
		} catch (notificationError) {
			console.error('[USER][SOCIAL] Error creating notification for follow request accepted:', notificationError);
			// Don't fail the request if notification fails
		}

		// Emit real-time events
		try {
			// Get updated counts
			const [updatedRequester, updatedRecipient] = await Promise.all([
				User.findById(followRequest.requester._id).select('following followers username fullName profilePictureUrl'),
				User.findById(followRequest.recipient._id).select('following followers username fullName profilePictureUrl')
			]);

			// Emit to requester - follow request accepted
			enhancedRealtimeService.emitToUser(
				followRequest.requester._id.toString(),
				'follow_request:accepted',
				{
					requestId: followRequest._id.toString(),
					recipient: {
						_id: recipient._id,
						username: recipient.username,
						fullName: recipient.fullName,
						profilePictureUrl: updatedRecipient.profilePictureUrl
					},
					timestamp: new Date()
				}
			);

			// Emit follow status update to both users
			enhancedRealtimeService.emitToUser(
				followRequest.requester._id.toString(),
				'follow_status:updated',
				{
					userId: recipient._id.toString(),
					followerId: followRequest.requester._id.toString(),
					status: 'following',
					followerCount: updatedRecipient.followers.length,
					followingCount: updatedRequester.following.length,
					timestamp: new Date()
				}
			);

			enhancedRealtimeService.emitToUser(
				recipient._id.toString(),
				'follow_status:updated',
				{
					userId: recipient._id.toString(),
					followerId: followRequest.requester._id.toString(),
					status: 'following',
					followerCount: updatedRecipient.followers.length,
					followingCount: updatedRequester.following.length,
					timestamp: new Date()
				}
			);
			console.log('[USER][SOCIAL] ✅ Real-time events emitted: follow_request:accepted and follow_status:updated');
		} catch (realtimeError) {
			console.error('[USER][SOCIAL] Error emitting real-time events:', realtimeError);
			// Don't fail the request if real-time event fails
		}

		const responseData = {
			requestId: followRequest._id,
			requester: {
				id: requester._id,
				username: requester.username,
				fullName: requester.fullName
			},
			status: 'accepted',
			respondedAt: followRequest.respondedAt
		};

		console.log('[USER][SOCIAL] Follow request accepted successfully, returning response:', responseData);
		return ApiResponse.success(res, responseData, 'Follow request accepted successfully');
	} catch (e) {
		console.error('[USER][SOCIAL] acceptFollowRequest error:', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to accept follow request');
	}
}

// Reject follow request
async function rejectFollowRequest(req, res) {
	try {
		console.log('[USER][SOCIAL] rejectFollowRequest request started');
		console.log('[USER][SOCIAL] Request params:', req.params);
		console.log('[USER][SOCIAL] Current user info:', req.user);

		const { requestId } = req.params || {};
		const currentUserId = req.user?.userId;

		console.log('[USER][SOCIAL] Extracted data:', { requestId, currentUserId });

		if (!requestId) {
			console.log('[USER][SOCIAL] Request ID is missing');
			return ApiResponse.badRequest(res, 'Request ID is required');
		}

		console.log('[USER][SOCIAL] Finding and updating follow request...');
		// Find and update the follow request
		const followRequest = await FollowRequest.findOneAndUpdate(
			{
				_id: requestId,
				recipient: currentUserId,
				status: 'pending'
			},
			{
				status: 'rejected',
				respondedAt: new Date()
			},
			{ new: true }
		).populate('requester', 'username fullName');

		console.log('[USER][SOCIAL] Follow request update result:', followRequest ? {
			id: followRequest._id,
			requester: followRequest.requester ? { id: followRequest.requester._id, username: followRequest.requester.username } : null,
			status: followRequest.status,
			respondedAt: followRequest.respondedAt
		} : 'No follow request found');

		if (!followRequest) {
			console.log('[USER][SOCIAL] Follow request not found or already processed');
			return ApiResponse.notFound(res, 'Follow request not found or already processed');
		}

		// Update the original follow_request notification to reflect rejected status
		try {
			const recipientId = currentUserId.toString(); // The person who received the follow request notification
			const senderId = followRequest.requester._id.toString(); // The person who sent the request
			const requestId = followRequest._id.toString();
			
			console.log('[USER][SOCIAL] Updating follow_request notification status to rejected:', {
				recipientId,
				senderId,
				requestId
			});
			
			const updateResult = await notificationService.updateByTypeAndData({
				type: 'follow_request',
				recipientId: recipientId,
				senderId: senderId,
				data: {
					requestId: requestId
				},
				updateData: {
					status: 'rejected',
					requestId: requestId // Keep requestId in data
				},
				context: 'social'
			});

			console.log('[USER][SOCIAL] Notification update result:', {
				matchedCount: updateResult.matchedCount,
				modifiedCount: updateResult.modifiedCount
			});

			if (updateResult.modifiedCount > 0) {
				console.log('[USER][SOCIAL] ✅ Successfully updated follow_request notification status to rejected');
			} else {
				console.log('[USER][SOCIAL] ⚠️ No notification found to update (may have been already updated or deleted)');
			}
		} catch (notificationUpdateError) {
			// Log error but don't fail the request
			console.error('[USER][SOCIAL] Error updating follow_request notification status:', notificationUpdateError);
			console.error('[USER][SOCIAL] Follow request was rejected but notification update failed');
		}

		// Emit real-time event to requester
		try {
			const currentUser = await User.findById(currentUserId).select('username fullName');
			enhancedRealtimeService.emitToUser(
				followRequest.requester._id.toString(),
				'follow_request:rejected',
				{
					requestId: followRequest._id.toString(),
					recipient: {
						_id: currentUserId,
						username: currentUser.username,
						fullName: currentUser.fullName
					},
					timestamp: new Date()
				}
			);
			console.log('[USER][SOCIAL] ✅ Real-time event emitted: follow_request:rejected to requester');
		} catch (realtimeError) {
			console.error('[USER][SOCIAL] Error emitting real-time event:', realtimeError);
			// Don't fail the request if real-time event fails
		}

		const responseData = {
			requestId: followRequest._id,
			requester: {
				id: followRequest.requester._id,
				username: followRequest.requester.username,
				fullName: followRequest.requester.fullName
			},
			status: 'rejected',
			respondedAt: followRequest.respondedAt
		};

		console.log('[USER][SOCIAL] Follow request rejected successfully, returning response:', responseData);
		return ApiResponse.success(res, responseData, 'Follow request rejected successfully');
	} catch (e) {
		console.error('[USER][SOCIAL] rejectFollowRequest error:', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to reject follow request');
	}
}

// Get pending follow requests (received)
async function getPendingFollowRequests(req, res) {
	try {
		console.log('[USER][SOCIAL] getPendingFollowRequests request started');
		console.log('[USER][SOCIAL] Request query:', req.query);
		console.log('[USER][SOCIAL] Current user info:', req.user);

		const { page = 1, limit = 20 } = req.query || {};
		const currentUserId = req.user?.userId;

		console.log('[USER][SOCIAL] Extracted data:', { page, limit, currentUserId });

		const skip = (parseInt(page) - 1) * parseInt(limit);

		console.log('[USER][SOCIAL] Database query parameters:', {
			recipient: currentUserId,
			status: 'pending',
			skip: skip,
			limit: parseInt(limit)
		});

		const requests = await FollowRequest.find({
			recipient: currentUserId,
			status: 'pending'
		})
			.populate('requester', 'username fullName profilePictureUrl verificationStatus')
			.sort({ createdAt: -1 })
			.skip(skip)
			.limit(parseInt(limit))
			.lean();

		console.log('[USER][SOCIAL] Follow requests query result:', {
			count: requests.length,
			requests: requests.map(req => ({
				id: req._id,
				requester: req.requester ? { id: req.requester._id, username: req.requester.username } : null,
				status: req.status,
				createdAt: req.createdAt
			}))
		});

		const total = await FollowRequest.countDocuments({
			recipient: currentUserId,
			status: 'pending'
		});

		console.log('[USER][SOCIAL] Total pending requests count:', total);

		const responseData = {
			requests,
			pagination: {
				page: parseInt(page),
				limit: parseInt(limit),
				total,
				pages: Math.ceil(total / parseInt(limit))
			}
		};

		console.log('[USER][SOCIAL] Pending follow requests fetched successfully, returning response:', {
			requestsCount: requests.length,
			pagination: responseData.pagination
		});
		return ApiResponse.success(res, responseData);
	} catch (e) {
		console.error('[USER][SOCIAL] getPendingFollowRequests error:', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to fetch pending follow requests');
	}
}

// Get sent follow requests
async function getSentFollowRequests(req, res) {
	try {
		console.log('[USER][SOCIAL] getSentFollowRequests request started');
		console.log('[USER][SOCIAL] Request query:', req.query);
		console.log('[USER][SOCIAL] Current user info:', req.user);

		const { page = 1, limit = 20, status = 'all' } = req.query || {};
		const currentUserId = req.user?.userId;

		console.log('[USER][SOCIAL] Extracted data:', { page, limit, status, currentUserId });

		const skip = (parseInt(page) - 1) * parseInt(limit);

		// Build query based on status filter
		let query = { requester: currentUserId };
		if (status !== 'all') {
			query.status = status;
		}

		console.log('[USER][SOCIAL] Database query parameters:', {
			query: query,
			skip: skip,
			limit: parseInt(limit)
		});

		const requests = await FollowRequest.find(query)
			.populate('recipient', 'username fullName profilePictureUrl verificationStatus')
			.sort({ createdAt: -1 })
			.skip(skip)
			.limit(parseInt(limit))
			.lean();

		console.log('[USER][SOCIAL] Follow requests query result:', {
			count: requests.length,
			requests: requests.map(req => ({
				id: req._id,
				recipient: req.recipient ? { id: req.recipient._id, username: req.recipient.username } : null,
				status: req.status,
				createdAt: req.createdAt
			}))
		});

		const total = await FollowRequest.countDocuments(query);

		console.log('[USER][SOCIAL] Total sent requests count:', total);

		const responseData = {
			requests,
			pagination: {
				page: parseInt(page),
				limit: parseInt(limit),
				total,
				pages: Math.ceil(total / parseInt(limit))
			}
		};

		console.log('[USER][SOCIAL] Sent follow requests fetched successfully, returning response:', {
			requestsCount: requests.length,
			pagination: responseData.pagination
		});
		return ApiResponse.success(res, responseData);
	} catch (e) {
		console.error('[USER][SOCIAL] getSentFollowRequests error:', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to fetch sent follow requests');
	}
}

// Cancel follow request (by requester)
async function cancelFollowRequest(req, res) {
	try {
		console.log('[USER][SOCIAL] cancelFollowRequest request started');
		console.log('[USER][SOCIAL] Request params:', req.params);
		console.log('[USER][SOCIAL] Current user info:', req.user);

		const { requestId } = req.params || {};
		const currentUserId = req.user?.userId;

		console.log('[USER][SOCIAL] Extracted data:', { requestId, currentUserId });

		if (!requestId) {
			console.log('[USER][SOCIAL] Request ID is missing');
			return ApiResponse.badRequest(res, 'Request ID is required');
		}

		console.log('[USER][SOCIAL] Finding and cancelling follow request...');
		// Find and update the pending follow request to cancelled (don't delete - reuse later)
		const followRequest = await FollowRequest.findOneAndUpdate(
			{
				_id: requestId,
				requester: currentUserId,
				status: 'pending'
			},
			{
				$set: {
					status: 'cancelled',
					respondedAt: new Date()
				}
			},
			{ new: true }
		).populate('recipient', 'username fullName');

		console.log('[USER][SOCIAL] Follow request cancellation result:', followRequest ? {
			id: followRequest._id,
			recipient: followRequest.recipient ? { id: followRequest.recipient._id, username: followRequest.recipient.username } : null,
			status: followRequest.status
		} : 'No follow request found');

		if (!followRequest) {
			console.log('[USER][SOCIAL] Follow request not found or already processed');
			return ApiResponse.notFound(res, 'Follow request not found or already processed');
		}

		console.log('[USER][SOCIAL] Follow request status updated to cancelled:', {
			id: followRequest._id,
			status: followRequest.status
		});

		// Delete the notification for the recipient (the person who received the follow request notification)
		try {
			const recipientId = followRequest.recipient._id.toString();
			const senderId = currentUserId.toString(); // The person who cancelled (sent) the request
			console.log('[USER][SOCIAL] Deleting follow request notification for recipient:', recipientId, 'sender:', senderId);
			
			const deleteResult = await notificationService.deleteByTypeAndData({
				type: 'follow_request',
				recipientId: recipientId,
				senderId: senderId, // Match by sender to ensure we delete the correct notification
				data: {
					requestId: requestId.toString()
				},
				context: 'social'
			});

			console.log('[USER][SOCIAL] Notification deletion result:', {
				deletedCount: deleteResult.deletedCount,
				matchedCount: deleteResult.matchedCount
			});

			if (deleteResult.deletedCount > 0) {
				console.log('[USER][SOCIAL] ✅ Successfully deleted follow request notification');
			} else {
				console.log('[USER][SOCIAL] ⚠️ No notification found to delete (may have been already deleted)');
			}
		} catch (notificationError) {
			// Log error but don't fail the request - follow request is already deleted
			console.error('[USER][SOCIAL] Error deleting follow request notification:', notificationError);
			console.error('[USER][SOCIAL] Follow request was cancelled but notification deletion failed');
		}

		const responseData = {
			requestId: followRequest._id,
			recipient: {
				id: followRequest.recipient._id,
				username: followRequest.recipient.username,
				fullName: followRequest.recipient.fullName
			}
		};

		console.log('[USER][SOCIAL] Follow request cancelled successfully, returning response:', responseData);
		return ApiResponse.success(res, responseData, 'Follow request cancelled successfully');
	} catch (e) {
		console.error('[USER][SOCIAL] cancelFollowRequest error:', e?.message || e);
		return ApiResponse.serverError(res, 'Failed to cancel follow request');
	}
}

module.exports = {
	sendFollowRequest,
	unfollowUser,
	removeFollower,
	getFollowers,
	getFollowing,
	blockUser,
	unblockUser,
	getBlockedUsers,
	reportUser,
	getUserReports,
	getSocialStats,
	acceptFollowRequest,
	rejectFollowRequest,
	getPendingFollowRequests,
	getSentFollowRequests,
	cancelFollowRequest
};
