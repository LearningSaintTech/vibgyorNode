const ApiResponse = require('../../../utils/apiResponse');
const User = require('../../auth/model/userAuthModel');
const DatingInteraction = require('../models/datingInteractionModel');
const DatingMatch = require('../models/datingMatchModel');
const DatingProfileComment = require('../models/datingProfileCommentModel');
const FollowRequest = require('../../social/userModel/followRequestModel');
const Report = require('../../social/userModel/userReportModel');

async function loadUsers(currentUserId, targetUserId) {
	const [currentUser, targetUser] = await Promise.all([
		User.findById(currentUserId),
		User.findById(targetUserId)
	]);

	if (!currentUser) {
		throw new Error('CURRENT_USER_NOT_FOUND');
	}
	if (!targetUser) {
		throw new Error('TARGET_USER_NOT_FOUND');
	}
	if (!targetUser.isActive) {
		throw new Error('TARGET_USER_INACTIVE');
	}
	return { currentUser, targetUser };
}

function isBlocked(currentUser, targetUser) {
	const currentBlocked = currentUser.blockedUsers?.some(id => id.toString() === targetUser._id.toString());
	const targetBlocked = targetUser.blockedUsers?.some(id => id.toString() === currentUser._id.toString());
	const blockedByTarget = currentUser.blockedBy?.some(id => id.toString() === targetUser._id.toString());
	const blockedCurrent = targetUser.blockedBy?.some(id => id.toString() === currentUser._id.toString());
	return currentBlocked || targetBlocked || blockedByTarget || blockedCurrent;
}

async function likeProfile(req, res) {
	try {
		const { profileId } = req.params;
		const { comment = '' } = req.body || {};
		const currentUserId = req.user?.userId;

		if (!profileId || profileId === currentUserId) {
			return ApiResponse.badRequest(res, 'Invalid profile');
		}

		const { currentUser, targetUser } = await loadUsers(currentUserId, profileId);
		if (isBlocked(currentUser, targetUser)) {
			return ApiResponse.forbidden(res, 'You cannot interact with this profile');
		}
		if (!targetUser.dating?.isDatingProfileActive) {
			return ApiResponse.badRequest(res, 'This user has not enabled their dating profile');
		}

		const updatePayload = {
			action: 'like',
			status: 'pending'
		};

		if (comment && typeof comment === 'string') {
			updatePayload.comment = { text: comment.trim().slice(0, 280), createdAt: new Date() };
		}

		const interaction = await DatingInteraction.findOneAndUpdate(
			{ user: currentUserId, targetUser: profileId },
			{ $set: updatePayload },
			{ upsert: true, new: true, setDefaultsOnInsert: true }
		);

		let isMatch = false;
		let match = null;

		const reciprocal = await DatingInteraction.findOne({
			user: profileId,
			targetUser: currentUserId,
			action: 'like'
		});

		if (reciprocal) {
			isMatch = true;
			match = await DatingMatch.createOrGetMatch(currentUserId, profileId);

			interaction.status = 'matched';
			interaction.matchedAt = new Date();
			await interaction.save();

			if (reciprocal.status !== 'matched') {
				reciprocal.status = 'matched';
				reciprocal.matchedAt = new Date();
				await reciprocal.save();
			}
		}

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
		const { profileId } = req.params;
		const currentUserId = req.user?.userId;

		if (!profileId || profileId === currentUserId) {
			return ApiResponse.badRequest(res, 'Invalid profile');
		}

		await DatingInteraction.findOneAndUpdate(
			{ user: currentUserId, targetUser: profileId },
			{
				$set: {
					action: 'dislike',
					status: 'dismissed',
					matchedAt: null
				}
			},
			{ upsert: true }
		);

		await DatingMatch.endMatch(currentUserId, profileId, 'ended');

		return ApiResponse.success(res, { liked: false }, 'Profile disliked');
	} catch (error) {
		console.error('[DATING][DISLIKE] Error:', error);
		return ApiResponse.serverError(res, 'Failed to dislike profile');
	}
}

async function addProfileComment(req, res) {
	try {
		const { profileId } = req.params;
		const { text } = req.body || {};
		const currentUserId = req.user?.userId;

		if (!text || typeof text !== 'string') {
			return ApiResponse.badRequest(res, 'Comment text is required');
		}

		const comment = await DatingProfileComment.create({
			user: currentUserId,
			targetUser: profileId,
			text: text.trim().slice(0, 500)
		});

		await comment.populate([
			{ path: 'user', select: 'username fullName profilePictureUrl' }
		]);

		return ApiResponse.created(res, comment, 'Comment added successfully');
	} catch (error) {
		console.error('[DATING][COMMENT] Error:', error);
		return ApiResponse.serverError(res, 'Failed to add comment');
	}
}

async function getProfileComments(req, res) {
	try {
		const { profileId } = req.params;
		const { page = 1, limit = 20 } = req.query;

		const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

		const [comments, total] = await Promise.all([
			DatingProfileComment.find({
				targetUser: profileId,
				isDeleted: false
			})
				.sort({ createdAt: -1 })
				.skip(skip)
				.limit(parseInt(limit, 10))
				.populate('user', 'username fullName profilePictureUrl')
				.lean(),
			DatingProfileComment.countDocuments({
				targetUser: profileId,
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
		const currentUserId = req.user?.userId;
		const { status = 'active', page = 1, limit = 20 } = req.query;
		const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

		const filter = {
			status,
			$or: [{ userA: currentUserId }, { userB: currentUserId }]
		};

		const [matches, total] = await Promise.all([
			DatingMatch.find(filter)
				.sort({ updatedAt: -1 })
				.skip(skip)
				.limit(parseInt(limit, 10))
				.populate('userA', 'username fullName profilePictureUrl')
				.populate('userB', 'username fullName profilePictureUrl')
				.lean(),
			DatingMatch.countDocuments(filter)
		]);

		const formatted = matches.map(match => {
			const otherUser =
				match.userA._id.toString() === currentUserId
					? match.userB
					: match.userA;
			return {
				matchId: match._id,
				user: {
					_id: otherUser._id,
					username: otherUser.username,
					fullName: otherUser.fullName,
					profilePictureUrl: otherUser.profilePictureUrl
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
		const { profileId } = req.params;
		const { description } = req.body || {};
		const currentUserId = req.user?.userId;

		if (!description) {
			return ApiResponse.badRequest(res, 'Description is required');
		}

		const report = await Report.create({
			reporter: currentUserId,
			reportedUser: profileId,
			reportType: 'inappropriate_content',
			description: description.trim().slice(0, 1000),
			reportedContent: {
				contentType: 'profile',
				contentId: profileId
			}
		});

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
		const { profileId } = req.params;
		const currentUserId = req.user?.userId;

		if (!profileId || profileId === currentUserId) {
			return ApiResponse.badRequest(res, 'Invalid user ID');
		}

		const [currentUser, targetUser] = await Promise.all([
			User.findById(currentUserId),
			User.findById(profileId)
		]);

		if (!currentUser || !targetUser) {
			return ApiResponse.notFound(res, 'User not found');
		}

		if (currentUser.blockedUsers.includes(profileId)) {
			return ApiResponse.badRequest(res, 'User already blocked');
		}

		await Promise.all([
			User.findByIdAndUpdate(currentUserId, {
				$pull: { following: profileId, followers: profileId },
				$addToSet: { blockedUsers: profileId }
			}),
			User.findByIdAndUpdate(profileId, {
				$pull: { following: currentUserId, followers: currentUserId },
				$addToSet: { blockedBy: currentUserId }
			}),
			FollowRequest.deleteMany({
				$or: [
					{ requester: currentUserId, recipient: profileId },
					{ requester: profileId, recipient: currentUserId }
				]
			}),
			DatingMatch.endMatch(currentUserId, profileId, 'blocked')
		]);

		return ApiResponse.success(res, {}, 'User blocked successfully');
	} catch (error) {
		console.error('[DATING][BLOCK] Error:', error);
		return ApiResponse.serverError(res, 'Failed to block user');
	}
}

async function unblockProfile(req, res) {
	try {
		const { profileId } = req.params;
		const currentUserId = req.user?.userId;

		if (!profileId || profileId === currentUserId) {
			return ApiResponse.badRequest(res, 'Invalid user ID');
		}

		const [currentUser, targetUser] = await Promise.all([
			User.findById(currentUserId),
			User.findById(profileId)
		]);

		if (!currentUser || !targetUser) {
			return ApiResponse.notFound(res, 'User not found');
		}

		if (!currentUser.blockedUsers.includes(profileId)) {
			return ApiResponse.badRequest(res, 'User is not blocked');
		}

		await Promise.all([
			User.findByIdAndUpdate(currentUserId, { $pull: { blockedUsers: profileId } }),
			User.findByIdAndUpdate(profileId, { $pull: { blockedBy: currentUserId } })
		]);

		return ApiResponse.success(res, {}, 'User unblocked successfully');
	} catch (error) {
		console.error('[DATING][UNBLOCK] Error:', error);
		return ApiResponse.serverError(res, 'Failed to unblock user');
	}
}

async function getDatingProfileLikes(req, res) {
	try {
		const { profileId } = req.params;
		const { page = 1, limit = 20 } = req.query;
		const currentUserId = req.user?.userId;

		if (!profileId) {
			return ApiResponse.badRequest(res, 'Profile ID is required');
		}

		// Check if profile exists and is active
		const targetUser = await User.findById(profileId).select('dating.isDatingProfileActive');
		if (!targetUser) {
			return ApiResponse.notFound(res, 'Profile not found');
		}

		if (!targetUser.dating?.isDatingProfileActive) {
			return ApiResponse.badRequest(res, 'This dating profile is not active');
		}

		// Get all likes for this profile
		const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

		const [interactions, total] = await Promise.all([
			DatingInteraction.find({
				targetUser: profileId,
				action: 'like'
			})
				.sort({ createdAt: -1 })
				.skip(skip)
				.limit(parseInt(limit, 10))
				.populate('user', 'username fullName profilePictureUrl gender location verificationStatus')
				.lean(),
			DatingInteraction.countDocuments({
				targetUser: profileId,
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
	getDatingProfileLikes
};

