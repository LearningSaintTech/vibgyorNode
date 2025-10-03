const User = require('../userModel/userAuthModel');
const Report = require('../userModel/userReportModel');
const FollowRequest = require('../userModel/followRequestModel');
const ApiResponse = require('../../utils/apiResponse');

// Send follow request to a user
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
			targetUser: targetUser ? { id: targetUser._id, isActive: targetUser.isActive } : null
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

		console.log('[USER][SOCIAL] Checking for existing follow requests...');
		// Check if there's already a pending request
		const existingRequest = await FollowRequest.findOne({
			requester: currentUserId,
			recipient: userId,
			status: 'pending'
		});

		console.log('[USER][SOCIAL] Existing request check result:', existingRequest ? { id: existingRequest._id, status: existingRequest.status } : 'No existing request');

		if (existingRequest) {
			console.log('[USER][SOCIAL] Follow request already sent');
			return ApiResponse.badRequest(res, 'Follow request already sent');
		}

		console.log('[USER][SOCIAL] Creating follow request...');
		// Create follow request
		const followRequest = await FollowRequest.create({
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
			expiresAt: followRequest.expiresAt,
			createdAt: followRequest.createdAt
		};

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
		console.log('[USER][SOCIAL] Checking if currently following:', {
			currentUserFollowing: currentUser.following,
			targetUserId: userId,
			isFollowing: currentUser.following.includes(userId)
		});
		
		if (!currentUser.following.includes(userId)) {
			console.log('[USER][SOCIAL] Not currently following this user');
			return ApiResponse.badRequest(res, 'Not following this user');
		}

		console.log('[USER][SOCIAL] Updating following/followers arrays...');
		// Update both users' following/followers arrays
		await Promise.all([
			User.findByIdAndUpdate(currentUserId, { $pull: { following: userId } }),
			User.findByIdAndUpdate(userId, { $pull: { followers: currentUserId } })
		]);

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

// Get followers list
async function getFollowers(req, res) {
	try {
		console.log('[USER][SOCIAL] getFollowers request');
		const { page = 1, limit = 20 } = req.query || {};
		const currentUserId = req.user?.userId;

		const user = await User.findById(currentUserId)
			.populate({
				path: 'followers',
				select: 'username fullName profilePictureUrl verificationStatus isActive',
				options: {
					limit: parseInt(limit),
					skip: (parseInt(page) - 1) * parseInt(limit),
					sort: { createdAt: -1 }
				}
			});

		if (!user) {
			return ApiResponse.notFound(res, 'User not found');
		}

		const total = user.followers.length;
		const followers = user.followers;

		console.log('[USER][SOCIAL] Followers fetched successfully');
		return ApiResponse.success(res, {
			followers,
			pagination: {
				page: parseInt(page),
				limit: parseInt(limit),
				total,
				pages: Math.ceil(total / parseInt(limit))
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
		const { page = 1, limit = 20 } = req.query || {};
		const currentUserId = req.user?.userId;

		const user = await User.findById(currentUserId)
			.populate({
				path: 'following',
				select: 'username fullName profilePictureUrl verificationStatus isActive',
				options: {
					limit: parseInt(limit),
					skip: (parseInt(page) - 1) * parseInt(limit),
					sort: { createdAt: -1 }
				}
			});

		if (!user) {
			return ApiResponse.notFound(res, 'User not found');
		}

		const total = user.following.length;
		const following = user.following;

		console.log('[USER][SOCIAL] Following fetched successfully');
		return ApiResponse.success(res, {
			following,
			pagination: {
				page: parseInt(page),
				limit: parseInt(limit),
				total,
				pages: Math.ceil(total / parseInt(limit))
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

		// Remove from following/followers if exists, then add to blocked
		await Promise.all([
			User.findByIdAndUpdate(currentUserId, {
				$pull: { following: userId, followers: userId },
				$addToSet: { blockedUsers: userId }
			}),
			User.findByIdAndUpdate(userId, {
				$pull: { following: currentUserId, followers: currentUserId },
				$addToSet: { blockedBy: currentUserId }
			})
		]);

		console.log('[USER][SOCIAL] User blocked successfully');
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

		if (!reportType || !description) {
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
			reportType,
			description: description.trim(),
			reportedContent: {
				contentType,
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

		console.log('[USER][SOCIAL] Finding and deleting follow request...');
		// Find and delete the follow request
		const followRequest = await FollowRequest.findOneAndDelete({
			_id: requestId,
			requester: currentUserId,
			status: 'pending'
		}).populate('recipient', 'username fullName');

		console.log('[USER][SOCIAL] Follow request deletion result:', followRequest ? {
			id: followRequest._id,
			recipient: followRequest.recipient ? { id: followRequest.recipient._id, username: followRequest.recipient.username } : null,
			status: followRequest.status
		} : 'No follow request found');

		if (!followRequest) {
			console.log('[USER][SOCIAL] Follow request not found or already processed');
			return ApiResponse.notFound(res, 'Follow request not found or already processed');
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
