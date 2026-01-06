const ApiResponse = require('../../../utils/apiResponse');
const User = require('../../auth/model/userAuthModel');
const DatingInteraction = require('../models/datingInteractionModel');
const DatingMatch = require('../models/datingMatchModel');
const DatingProfileComment = require('../models/datingProfileCommentModel');
const FollowRequest = require('../../social/userModel/followRequestModel');
const Report = require('../../social/userModel/userReportModel');
const { invalidateUserCache } = require('../../../middleware/cacheMiddleware');
const notificationService = require('../../../notification/services/notificationService');

async function loadUsers(currentUserId, targetUserId) {
	console.log('[DATING][INTERACTION] loadUsers payload', { currentUserId, targetUserId });
	const [currentUser, targetUser] = await Promise.all([
		User.findById(currentUserId),
		User.findById(targetUserId)
	]);

	console.log('[DATING][INTERACTION] loadUsers result', {
		currentUserFound: !!currentUser,
		targetUserFound: !!targetUser,
		targetUserActive: targetUser?.isActive
	});

	if (!currentUser) {
		console.warn('[DATING][INTERACTION] CURRENT_USER_NOT_FOUND', { currentUserId });
		throw new Error('CURRENT_USER_NOT_FOUND');
	}
	if (!targetUser) {
		console.warn('[DATING][INTERACTION] TARGET_USER_NOT_FOUND', { targetUserId });
		throw new Error('TARGET_USER_NOT_FOUND');
	}
	if (!targetUser.isActive) {
		console.warn('[DATING][INTERACTION] TARGET_USER_INACTIVE', { targetUserId });
		throw new Error('TARGET_USER_INACTIVE');
	}
	return { currentUser, targetUser };
}

function isBlocked(currentUser, targetUser) {
	console.log('[DATING][INTERACTION] isBlocked check', {
		currentUser: currentUser._id,
		targetUser: targetUser._id,
		currentBlocked: currentUser.blockedUsers?.length || 0,
		targetBlocked: targetUser.blockedUsers?.length || 0
	});
	const currentBlocked = currentUser.blockedUsers?.some(id => id.toString() === targetUser._id.toString());
	const targetBlocked = targetUser.blockedUsers?.some(id => id.toString() === currentUser._id.toString());
	const blockedByTarget = currentUser.blockedBy?.some(id => id.toString() === targetUser._id.toString());
	const blockedCurrent = targetUser.blockedBy?.some(id => id.toString() === currentUser._id.toString());
	const result = currentBlocked || targetBlocked || blockedByTarget || blockedCurrent;
	console.log('[DATING][INTERACTION] isBlocked result', { result });
	return result;
}

function resolveRequestedUserId(paramUserId, currentUserId) {
	if (!paramUserId) {
		return currentUserId;
	}
	const normalized = String(paramUserId).toLowerCase();
	if (['me', 'self', 'current'].includes(normalized)) {
		return currentUserId;
	}
	return paramUserId;
}

async function likeProfile(req, res) {
	try {
		console.log('[DATING][LIKE] payload', { params: req.params, body: req.body, userId: req.user?.userId });
		const { userId: targetUserId } = req.params;
		const { comment = '' } = req.body || {};
		const currentUserId = req.user?.userId;

		if (!targetUserId || targetUserId === currentUserId) {
			return ApiResponse.badRequest(res, 'Invalid user');
		}

		const { currentUser, targetUser } = await loadUsers(currentUserId, targetUserId);
		if (isBlocked(currentUser, targetUser)) {
			return ApiResponse.forbidden(res, 'You cannot interact with this profile');
		}
		if (!targetUser.dating?.isDatingProfileActive) {
			return ApiResponse.badRequest(res, 'This user has not enabled their dating profile');
		}

		// Check if already liked
		const existingInteraction = await DatingInteraction.findOne({
			user: currentUserId,
			targetUser: targetUserId
		});

		if (existingInteraction) {
			if (existingInteraction.action === 'like') {
				console.log('[DATING][LIKE] already liked', { interactionId: existingInteraction._id });
				return ApiResponse.badRequest(res, 'You have already liked this profile');
			}
			// If previously disliked, we can allow changing to like
			console.log('[DATING][LIKE] changing from dislike to like', { interactionId: existingInteraction._id });
		}

		console.log('[DATING][LIKE] interaction payload', { currentUserId, targetUserId, comment });
		const updatePayload = {
			action: 'like',
			status: 'pending'
		};

		if (comment && typeof comment === 'string' && comment.trim()) {
			updatePayload.comment = { text: comment.trim().slice(0, 280), createdAt: new Date() };
		}

		const interaction = await DatingInteraction.findOneAndUpdate(
			{ user: currentUserId, targetUser: targetUserId },
			{ $set: updatePayload },
			{ upsert: true, new: true, setDefaultsOnInsert: true }
		);

		let isMatch = false;
		let match = null;

		console.log('[DATING][LIKE] searching reciprocal like', { currentUserId, targetUserId });
		// OPTIMIZED: Use index-optimized query (Phase 2 Optimization)
		const reciprocal = await DatingInteraction.findOne({
			user: targetUserId,
			targetUser: currentUserId,
			action: 'like'
		}).lean(); // Use lean() for better performance since we only need the existence check

		// Send like notification if not a match (matches get match notification instead)
		if (!reciprocal) {
			try {
				await notificationService.create({
					context: 'dating',
					type: 'like',
					recipientId: targetUserId.toString(),
					senderId: currentUserId.toString(),
					data: {
						interactionId: interaction._id.toString(),
						contentType: 'dating_profile'
					}
				});
			} catch (notificationError) {
				console.error('[DATING][LIKE] Notification error:', notificationError);
				// Don't fail like action if notification fails
			}
		}

		if (reciprocal) {
			console.log('[DATING][LIKE] reciprocal like found', { reciprocalId: reciprocal._id });
			isMatch = true;
			
			// OPTIMIZED: Update both interactions in parallel (Phase 2 Optimization)
			const [createdMatch, updatedInteraction, updatedReciprocal] = await Promise.all([
				DatingMatch.createOrGetMatch(currentUserId, targetUserId),
				DatingInteraction.findByIdAndUpdate(
					interaction._id,
					{ 
						status: 'matched',
						matchedAt: new Date()
					},
					{ new: true }
				),
				DatingInteraction.findByIdAndUpdate(
					reciprocal._id,
					{ 
						status: 'matched',
						matchedAt: new Date()
					},
					{ new: true }
				)
			]);
			
			match = createdMatch;
			interaction = updatedInteraction || interaction;
			console.log('[DATING][LIKE] match created and interactions updated', { matchId: match?._id });

			// Notify both users about the match
			try {
				await Promise.all([
					notificationService.create({
						context: 'dating',
						type: 'match',
						recipientId: currentUserId.toString(),
						senderId: targetUserId.toString(),
						data: {
							matchId: match._id.toString(),
							contentType: 'match'
						}
					}),
					notificationService.create({
						context: 'dating',
						type: 'match',
						recipientId: targetUserId.toString(),
						senderId: currentUserId.toString(),
						data: {
							matchId: match._id.toString(),
							contentType: 'match'
						}
					})
				]);
			} catch (notificationError) {
				console.error('[DATING][MATCH] Notification error:', notificationError);
				// Don't fail match creation if notification fails
			}
		}

		console.log('[DATING][LIKE] response', { isMatch, matchId: match?._id });
		
		// OPTIMIZED: Invalidate dating cache when interaction occurs
		invalidateUserCache(currentUserId, 'dating:*');
		
		return ApiResponse.success(res, {
			liked: true,
			isMatch,
			matchId: match?._id || null
		}, isMatch ? 'It\'s a match!' : 'Profile liked successfully');
	} catch (error) {
		console.error('[DATING][LIKE] Error:', error);
		if (error.message === 'CURRENT_USER_NOT_FOUND') {
			return ApiResponse.notFound(res, 'User not found');
		}
		if (error.message === 'TARGET_USER_NOT_FOUND') {
			return ApiResponse.notFound(res, 'Profile not found');
		}
		if (error.message === 'TARGET_USER_INACTIVE') {
			return ApiResponse.badRequest(res, 'Profile is inactive');
		}
		return ApiResponse.serverError(res, 'Failed to like profile');
	}
}

async function dislikeProfile(req, res) {
	try {
		console.log('[DATING][DISLIKE] payload', { params: req.params, userId: req.user?.userId });
		const { userId: targetUserId } = req.params;
		const currentUserId = req.user?.userId;

		if (!targetUserId || targetUserId === currentUserId) {
			return ApiResponse.badRequest(res, 'Invalid user');
		}

		// Check if already disliked
		const existingInteraction = await DatingInteraction.findOne({
			user: currentUserId,
			targetUser: targetUserId
		});

		if (existingInteraction && existingInteraction.action === 'dislike') {
			console.log('[DATING][DISLIKE] already disliked', { interactionId: existingInteraction._id });
			return ApiResponse.badRequest(res, 'You have already disliked this profile');
		}

		// If previously liked, allow changing to dislike
		if (existingInteraction && existingInteraction.action === 'like') {
			console.log('[DATING][DISLIKE] changing from like to dislike', { interactionId: existingInteraction._id });
		}

		await DatingInteraction.findOneAndUpdate(
			{ user: currentUserId, targetUser: targetUserId },
			{
				$set: {
					action: 'dislike',
					status: 'dismissed',
					matchedAt: null
				}
			},
			{ upsert: true }
		);

		await DatingMatch.endMatch(currentUserId, targetUserId, 'ended');

		console.log('[DATING][DISLIKE] success', { currentUserId, targetUserId });
		
		// OPTIMIZED: Invalidate dating cache when interaction occurs
		invalidateUserCache(currentUserId, 'dating:*');
		
		return ApiResponse.success(res, { liked: false }, 'Profile disliked');
	} catch (error) {
		console.error('[DATING][DISLIKE] Error:', error);
		return ApiResponse.serverError(res, 'Failed to dislike profile');
	}
}

async function addProfileComment(req, res) {
	try {
		console.log('[DATING][COMMENT][ADD] payload', { params: req.params, body: req.body, userId: req.user?.userId });
		const { userId: targetUserId } = req.params;
		const { text } = req.body || {};
		const currentUserId = req.user?.userId;

		if (!text || typeof text !== 'string') {
			return ApiResponse.badRequest(res, 'Comment text is required');
		}

		const comment = await DatingProfileComment.create({
			user: currentUserId,
			targetUser: targetUserId,
			text: text.trim().slice(0, 500)
		});

		await comment.populate([
			{ path: 'user', select: 'username fullName profilePictureUrl' }
		]);

		console.log('[DATING][COMMENT][ADD] success', { commentId: comment._id });
		return ApiResponse.created(res, comment, 'Comment added successfully');
	} catch (error) {
		console.error('[DATING][COMMENT] Error:', error);
		return ApiResponse.serverError(res, 'Failed to add comment');
	}
}

async function getProfileComments(req, res) {
	try {
		console.log('[DATING][COMMENT][LIST] payload', { params: req.params, query: req.query });
		const { userId: targetUserIdParam } = req.params;
		const { page = 1, limit = 20 } = req.query;
		const currentUserId = req.user?.userId;

		const targetUserId = resolveRequestedUserId(targetUserIdParam, currentUserId);

		const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

		const [comments, total] = await Promise.all([
			DatingProfileComment.find({
				targetUser: targetUserId,
				isDeleted: false
			})
				.sort({ createdAt: -1 })
				.skip(skip)
				.limit(parseInt(limit, 10))
				.populate('user', 'username fullName profilePictureUrl')
				.lean(),
			DatingProfileComment.countDocuments({
				targetUser: targetUserId,
				isDeleted: false
			})
		]);

		return ApiResponse.success(res, {
			comments,
			pagination: {
				page: parseInt(page, 10),
				limit: parseInt(limit, 10),
				total,
				pages: Math.ceil(total / parseInt(limit, 10))
			}
		}, 'Comments fetched successfully');
	} catch (error) {
		console.error('[DATING][COMMENT][LIST] Error:', error);
		return ApiResponse.serverError(res, 'Failed to fetch comments');
	}
}

async function getMatches(req, res) {
	try {
		console.log('[DATING][MATCHES] payload', { query: req.query, userId: req.user?.userId });
		const currentUserId = req.user?.userId;
		const { status = 'active', page = 1, limit = 20 } = req.query;
		const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

		// OPTIMIZED: Use aggregation pipeline for better performance (Phase 2 Optimization)
		// This uses the compound indexes we added and avoids populating both users
		const matches = await DatingMatch.aggregate([
			{
				$match: {
					status,
					$or: [{ userA: require('mongoose').Types.ObjectId(currentUserId) }, { userB: require('mongoose').Types.ObjectId(currentUserId) }]
				}
			},
			{
				$sort: { updatedAt: -1 }
			},
			{
				$skip: skip
			},
			{
				$limit: parseInt(limit, 10)
			},
			{
				$lookup: {
					from: 'users',
					localField: 'userA',
					foreignField: '_id',
					as: 'userA'
				}
			},
			{
				$lookup: {
					from: 'users',
					localField: 'userB',
					foreignField: '_id',
					as: 'userB'
				}
			},
			{
				$project: {
					'userA.username': 1,
					'userA.fullName': 1,
					'userA.profilePictureUrl': 1,
					'userA._id': 1,
					'userB.username': 1,
					'userB.fullName': 1,
					'userB.profilePictureUrl': 1,
					'userB._id': 1,
					status: 1,
					createdAt: 1,
					lastInteractionAt: 1,
					updatedAt: 1
				}
			},
			{
				$addFields: {
					userA: { $arrayElemAt: ['$userA', 0] },
					userB: { $arrayElemAt: ['$userB', 0] }
				}
			}
		]);

		// Get total count (can be optimized further with $facet if needed)
		const total = await DatingMatch.countDocuments({
			status,
			$or: [{ userA: currentUserId }, { userB: currentUserId }]
		});

		// OPTIMIZED: Format matches (userA and userB are already populated from aggregation)
		const formatted = matches.map(match => {
			const currentUserIdStr = currentUserId.toString();
			const userAIdStr = match.userA?._id?.toString() || match.userA?.toString();
			const otherUser =
				userAIdStr === currentUserIdStr
					? match.userB
					: match.userA;
			return {
				matchId: match._id,
				user: {
					_id: otherUser?._id || otherUser,
					username: otherUser?.username || '',
					fullName: otherUser?.fullName || '',
					profilePictureUrl: otherUser?.profilePictureUrl || ''
				},
				status: match.status,
				matchedAt: match.createdAt,
				lastInteractionAt: match.lastInteractionAt
			};
		});

		return ApiResponse.success(res, {
			matches: formatted,
			pagination: {
				page: parseInt(page, 10),
				limit: parseInt(limit, 10),
				total,
				pages: Math.ceil(total / parseInt(limit, 10))
			}
		}, 'Matches fetched successfully');
	} catch (error) {
		console.error('[DATING][MATCHES] Error:', error);
		return ApiResponse.serverError(res, 'Failed to fetch matches');
	}
}

async function reportProfile(req, res) {
	try {
		console.log('[DATING][REPORT] payload', { params: req.params, body: req.body, userId: req.user?.userId });
		const { userId: targetUserId } = req.params;
		const { description } = req.body || {};
		const currentUserId = req.user?.userId;

		if (!description) {
			return ApiResponse.badRequest(res, 'Description is required');
		}

		const report = await Report.create({
			reporter: currentUserId,
			reportedUser: targetUserId,
			reportType: 'inappropriate_content',
			description: description.trim().slice(0, 1000),
			reportedContent: {
				contentType: 'profile',
				contentId: targetUserId
			}
		});

		console.log('[DATING][REPORT] success', { reportId: report._id });
		return ApiResponse.created(res, {
			reportId: report._id
		}, 'Profile reported successfully');
	} catch (error) {
		console.error('[DATING][REPORT] Error:', error);
		if (error.code === 11000) {
			return ApiResponse.badRequest(res, 'You have already reported this profile');
		}
		return ApiResponse.serverError(res, 'Failed to report profile');
	}
}

async function blockProfile(req, res) {
	try {
		console.log('[DATING][BLOCK] payload', { params: req.params, userId: req.user?.userId });
		const { userId: targetUserId } = req.params;
		const currentUserId = req.user?.userId;

		if (!targetUserId || targetUserId === currentUserId) {
			return ApiResponse.badRequest(res, 'Invalid user ID');
		}

		const [currentUser, targetUser] = await Promise.all([
			User.findById(currentUserId),
			User.findById(targetUserId)
		]);

		if (!currentUser || !targetUser) {
			return ApiResponse.notFound(res, 'User not found');
		}

		if (currentUser.blockedUsers.includes(targetUserId)) {
			return ApiResponse.badRequest(res, 'User already blocked');
		}

		await Promise.all([
			User.findByIdAndUpdate(currentUserId, {
				$pull: { following: targetUserId, followers: targetUserId },
				$addToSet: { blockedUsers: targetUserId }
			}),
			User.findByIdAndUpdate(targetUserId, {
				$pull: { following: currentUserId, followers: currentUserId },
				$addToSet: { blockedBy: currentUserId }
			}),
			FollowRequest.deleteMany({
				$or: [
					{ requester: currentUserId, recipient: targetUserId },
					{ requester: targetUserId, recipient: currentUserId }
				]
			}),
			DatingMatch.endMatch(currentUserId, targetUserId, 'blocked')
		]);

		console.log('[DATING][BLOCK] success', { currentUserId, targetUserId });
		return ApiResponse.success(res, {}, 'User blocked successfully');
	} catch (error) {
		console.error('[DATING][BLOCK] Error:', error);
		return ApiResponse.serverError(res, 'Failed to block user');
	}
}

async function unblockProfile(req, res) {
	try {
		console.log('[DATING][UNBLOCK] payload', { params: req.params, userId: req.user?.userId });
		const { userId: targetUserId } = req.params;
		const currentUserId = req.user?.userId;

		if (!targetUserId || targetUserId === currentUserId) {
			return ApiResponse.badRequest(res, 'Invalid user ID');
		}

		const [currentUser, targetUser] = await Promise.all([
			User.findById(currentUserId),
			User.findById(targetUserId)
		]);

		if (!currentUser || !targetUser) {
			return ApiResponse.notFound(res, 'User not found');
		}

		if (!currentUser.blockedUsers.includes(targetUserId)) {
			return ApiResponse.badRequest(res, 'User is not blocked');
		}

		await Promise.all([
			User.findByIdAndUpdate(currentUserId, { $pull: { blockedUsers: targetUserId } }),
			User.findByIdAndUpdate(targetUserId, { $pull: { blockedBy: currentUserId } })
		]);

		console.log('[DATING][UNBLOCK] success', { currentUserId, targetUserId });
		return ApiResponse.success(res, {}, 'User unblocked successfully');
	} catch (error) {
		console.error('[DATING][UNBLOCK] Error:', error);
		return ApiResponse.serverError(res, 'Failed to unblock user');
	}
}

async function unmatchUser(req, res) {
	try {
		console.log('[DATING][UNMATCH] payload', { params: req.params, userId: req.user?.userId });
		const { matchId } = req.params;
		const currentUserId = req.user?.userId;

		if (!matchId) {
			return ApiResponse.badRequest(res, 'Match ID is required');
		}

		// Find the match
		const match = await DatingMatch.findById(matchId);
		if (!match) {
			return ApiResponse.notFound(res, 'Match not found');
		}

		// Verify user is part of this match
		const userAId = match.userA.toString();
		const userBId = match.userB.toString();
		const currentUserIdStr = currentUserId.toString();

		if (userAId !== currentUserIdStr && userBId !== currentUserIdStr) {
			return ApiResponse.forbidden(res, 'You are not part of this match');
		}

		// Get the other user ID
		const otherUserId = userAId === currentUserIdStr ? match.userB : match.userA;

		// End the match (set status to 'ended')
		await DatingMatch.endMatch(currentUserId, otherUserId, 'ended');

		console.log('[DATING][UNMATCH] success', { matchId, currentUserId, otherUserId });
		return ApiResponse.success(res, {}, 'Match ended successfully');
	} catch (error) {
		console.error('[DATING][UNMATCH] Error:', error);
		return ApiResponse.serverError(res, 'Failed to unmatch user');
	}
}

async function getDatingProfileLikes(req, res) {
	try {
		console.log('[DATING][LIKES] payload', { params: req.params, query: req.query, userId: req.user?.userId });
		const { userId: targetUserIdParam } = req.params;
		const { page = 1, limit = 20 } = req.query;
		const currentUserId = req.user?.userId;

		const targetUserId = resolveRequestedUserId(targetUserIdParam, currentUserId);

		// Check if profile exists and is active
		const targetUser = await User.findById(targetUserId).select('dating.isDatingProfileActive');
		if (!targetUser) {
			return ApiResponse.notFound(res, 'User not found');
		}

		if (!targetUser.dating?.isDatingProfileActive) {
			return ApiResponse.badRequest(res, 'This dating profile is not active');
		}

		// Get all likes for this profile
		const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

		const [interactions, total] = await Promise.all([
			DatingInteraction.find({
				targetUser: targetUserId,
				action: 'like'
			})
				.sort({ createdAt: -1 })
				.skip(skip)
				.limit(parseInt(limit, 10))
				.populate('user', 'username fullName profilePictureUrl gender location verificationStatus')
				.lean(),
			DatingInteraction.countDocuments({
				targetUser: targetUserId,
				action: 'like'
			})
		]);

		// Format the response with additional details
		const likesWithDetails = interactions.map(interaction => {
			const liker = interaction.user;
			
			// Calculate time ago
			const likedAt = interaction.createdAt;
			const now = new Date();
			const diffInSeconds = Math.floor((now - likedAt) / 1000);
			
			let likedAgo = 'just now';
			if (diffInSeconds >= 60) {
				const diffInMinutes = Math.floor(diffInSeconds / 60);
				if (diffInMinutes >= 60) {
					const diffInHours = Math.floor(diffInMinutes / 60);
					if (diffInHours >= 24) {
						const diffInDays = Math.floor(diffInHours / 24);
						if (diffInDays >= 7) {
							const diffInWeeks = Math.floor(diffInDays / 7);
							if (diffInWeeks >= 4) {
								const diffInMonths = Math.floor(diffInDays / 30);
								if (diffInMonths >= 12) {
									const diffInYears = Math.floor(diffInDays / 365);
									likedAgo = `${diffInYears}y`;
								} else {
									likedAgo = `${diffInMonths}mo`;
								}
							} else {
								likedAgo = `${diffInWeeks}w`;
							}
						} else {
							likedAgo = `${diffInDays}d`;
						}
					} else {
						likedAgo = `${diffInHours}h`;
					}
				} else {
					likedAgo = `${diffInMinutes}m`;
				}
			} else {
				likedAgo = `${diffInSeconds}s`;
			}

			return {
				userId: liker._id,
				username: liker.username,
				fullName: liker.fullName,
				profilePictureUrl: liker.profilePictureUrl,
				gender: liker.gender,
				location: {
					city: liker.location?.city || '',
					country: liker.location?.country || ''
				},
				isVerified: liker.verificationStatus === 'approved',
				likedAt: likedAt,
				likedAgo: likedAgo,
				isMatch: interaction.status === 'matched',
				comment: interaction.comment?.text || null
			};
		});

		return ApiResponse.success(res, {
			likes: likesWithDetails,
			pagination: {
				currentPage: parseInt(page, 10),
				totalPages: Math.ceil(total / parseInt(limit, 10)),
				totalLikes: total,
				hasNext: skip + interactions.length < total,
				hasPrev: parseInt(page, 10) > 1
			}
		}, 'Dating profile likes retrieved successfully');

	} catch (error) {
		console.error('[DATING][LIKES] Error:', error);
		return ApiResponse.serverError(res, 'Failed to get dating profile likes');
	}
}

module.exports = {
	likeProfile,
	dislikeProfile,
	addProfileComment,
	getProfileComments,
	getMatches,
	reportProfile,
	blockProfile,
	unblockProfile,
	unmatchUser,
	getDatingProfileLikes
};

