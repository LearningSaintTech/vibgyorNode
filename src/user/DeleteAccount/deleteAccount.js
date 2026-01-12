const User = require('../auth/model/userAuthModel');
const Post = require('../social/userModel/postModel');
const Story = require('../social/userModel/storyModel');
const Chat = require('../social/userModel/chatModel');
const Message = require('../social/userModel/messageModel');
const FollowRequest = require('../social/userModel/followRequestModel');
const MessageRequest = require('../social/userModel/messageRequestModel');
const UserStatus = require('../social/userModel/userStatusModel');
const Report = require('../social/userModel/userReportModel');
const RefreshToken = require('../social/userModel/refreshTokenModel');
const Call = require('../social/userModel/callModel');
const ContentModeration = require('../social/userModel/contentModerationModel');
const DatingInteraction = require('../dating/models/datingInteractionModel');
const DatingMatch = require('../dating/models/datingMatchModel');
const DatingChat = require('../dating/models/datingChatModel');
const DatingMessage = require('../dating/models/datingMessageModel');
const DatingCall = require('../dating/models/datingCallModel');
const DatingProfileComment = require('../dating/models/datingProfileCommentModel');
const Notification = require('../../notification/models/notificationModel');
const ApiResponse = require('../../utils/apiResponse');
const { deleteFromS3 } = require('../../services/s3Service');

/**
 * Extract S3 key from URL
 */
function extractS3Key(url) {
	if (!url) return null;
	try {
		const urlObj = new URL(url);
		const pathParts = urlObj.pathname.split('/').filter(part => part);
		return pathParts.join('/');
	} catch (error) {
		console.error('[DELETE_ACCOUNT] Error extracting S3 key:', error.message);
		return null;
	}
}

/**
 * Delete files from S3
 */
async function deleteS3Files(urls) {
	if (!Array.isArray(urls)) urls = [urls];
	const deletePromises = urls
		.filter(url => url)
		.map(url => {
			const key = extractS3Key(url);
			if (key) {
				return deleteFromS3(key).catch(err => {
					console.error('[DELETE_ACCOUNT] Failed to delete S3 file:', key, err.message);
				});
			}
			return Promise.resolve();
		});
	await Promise.all(deletePromises);
}

/**
 * Delete user account and all associated data
 * Note: Transactions removed for compatibility with standalone MongoDB instances
 */
async function deleteAccount(req, res) {
	try {
		const userId = req.user?.userId;
		if (!userId) {
			return ApiResponse.unauthorized(res, 'User not authenticated');
		}

		console.log('[DELETE_ACCOUNT] Starting account deletion for user:', userId);

		// Get user data before deletion
		const user = await User.findById(userId);
		if (!user) {
			return ApiResponse.notFound(res, 'User not found');
		}

		const deletionStats = {
			posts: 0,
			stories: 0,
			socialChats: 0,
			socialMessages: 0,
			datingInteractions: 0,
			datingMatches: 0,
			datingChats: 0,
			datingMessages: 0,
			followRequests: 0,
			messageRequests: 0,
			reports: 0,
			calls: 0,
			datingCalls: 0,
			userStatus: 0,
			refreshTokens: 0,
			contentModerations: 0,
			profileComments: 0,
			notifications: 0,
			postInteractions: 'removed', // likes, comments, shares, views on other users' posts
			storyInteractions: 'removed' // views, replies, mentions on other users' stories
		};

		// ========== SOCIAL DATA DELETION ==========

		// 1. Remove user's interactions from ALL posts (likes, comments, shares, views)
		// Remove user's likes from all posts
		await Post.updateMany(
			{ 'likes.user': userId },
			{ 
				$pull: { likes: { user: userId } },
				$inc: { likesCount: -1 }
			}
		);

		// Remove user's comments from all posts (including nested comment likes)
		await Post.updateMany(
			{ 'comments.user': userId },
			{ 
				$pull: { 
					comments: { user: userId }
				},
				$inc: { commentsCount: -1 }
			}
		);

		// Remove user's likes on comments within posts
		await Post.updateMany(
			{ 'comments.likes.user': userId },
			{ 
				$pull: { 
					'comments.$[].likes': { user: userId }
				}
			}
		);

		// Remove user's shares from all posts
		await Post.updateMany(
			{ 'shares.user': userId },
			{ 
				$pull: { shares: { user: userId } },
				$inc: { sharesCount: -1 }
			}
		);

		// Remove user's views from all posts
		await Post.updateMany(
			{ 'views.user': userId },
			{ 
				$pull: { views: { user: userId } },
				$inc: { viewsCount: -1 }
			}
		);

		// 2. Delete user's own Posts and their S3 media
		const posts = await Post.find({ author: userId });
		const userPostIds = posts.map(p => p._id);
		
		for (const post of posts) {
			// Delete media files from S3
			if (post.media && Array.isArray(post.media)) {
				const mediaUrls = post.media.map(m => m.url).filter(Boolean);
				await deleteS3Files(mediaUrls);
			}
		}
		const postResult = await Post.deleteMany({ author: userId });
		deletionStats.posts = postResult.deletedCount;

		// 3. Remove user's interactions from ALL stories (views, replies, mentions)
		// Remove user's views from all stories
		await Story.updateMany(
			{ 'views.user': userId },
			{ 
				$pull: { views: { user: userId } }
			}
		);

		// Remove user's replies from all stories
		await Story.updateMany(
			{ 'replies.user': userId },
			{ 
				$pull: { replies: { user: userId } }
			}
		);

		// Remove user's mentions from all stories
		await Story.updateMany(
			{ 'mentions.user': userId },
			{ 
				$pull: { mentions: { user: userId } }
			}
		);

		// 4. Delete user's own Stories and their S3 media
		const stories = await Story.find({ author: userId });
		for (const story of stories) {
			// Delete media files from S3
			if (story.media && story.media.url && story.media.type !== 'text') {
				await deleteS3Files([story.media.url]);
				if (story.media.thumbnail) {
					await deleteS3Files([story.media.thumbnail]);
				}
			}
		}
		const storyResult = await Story.deleteMany({ author: userId });
		deletionStats.stories = storyResult.deletedCount;

		// 5. Delete Social Messages
		const messageResult = await Message.deleteMany({ senderId: userId });
		deletionStats.socialMessages = messageResult.deletedCount;

		// 6. Delete Social Chats (where user is participant)
		const chatResult = await Chat.deleteMany({ participants: userId });
		deletionStats.socialChats = chatResult.deletedCount;

		// 7. Delete Follow Requests
		const followRequestResult = await FollowRequest.deleteMany({
			$or: [{ requester: userId }, { recipient: userId }]
		});
		deletionStats.followRequests = followRequestResult.deletedCount;

		// 8. Delete Message Requests
		const messageRequestResult = await MessageRequest.deleteMany({
			$or: [{ requester: userId }, { recipient: userId }]
		});
		deletionStats.messageRequests = messageRequestResult.deletedCount;

		// 9. Delete User Status
		const userStatusResult = await UserStatus.deleteMany({ user: userId });
		deletionStats.userStatus = userStatusResult.deletedCount;

		// 10. Delete Reports (where user reported or was reported)
		const reportResult = await Report.deleteMany({
			$or: [{ reporter: userId }, { reportedUser: userId }]
		});
		deletionStats.reports = reportResult.deletedCount;

		// 14. Delete Notifications (where user is sender or recipient)
		const notificationResult = await Notification.deleteMany({
			$or: [{ sender: userId }, { recipient: userId }]
		});
		deletionStats.notifications = notificationResult.deletedCount || 0;

		// 11. Delete Social Calls
		const callResult = await Call.deleteMany({ participants: userId });
		deletionStats.calls = callResult.deletedCount;

		// 12. Delete Refresh Tokens
		const refreshTokenResult = await RefreshToken.deleteMany({ userId: userId });
		deletionStats.refreshTokens = refreshTokenResult.deletedCount;

		// 13. Delete Content Moderation records
		const contentModerationResult = await ContentModeration.deleteMany({ userId: userId });
		deletionStats.contentModerations = contentModerationResult.deletedCount;

		// ========== DATING DATA DELETION ==========

		// 12. Delete Dating Interactions
		const datingInteractionResult = await DatingInteraction.deleteMany({
			$or: [{ user: userId }, { targetUser: userId }]
		});
		deletionStats.datingInteractions = datingInteractionResult.deletedCount;

		// 13. Delete Dating Matches
		const datingMatchResult = await DatingMatch.deleteMany({
			$or: [{ userA: userId }, { userB: userId }]
		});
		deletionStats.datingMatches = datingMatchResult.deletedCount;

		// 14. Delete Dating Chats
		const datingChatResult = await DatingChat.deleteMany({ participants: userId });
		deletionStats.datingChats = datingChatResult.deletedCount;

		// 15. Delete Dating Messages
		const datingMessageResult = await DatingMessage.deleteMany({ senderId: userId });
		deletionStats.datingMessages = datingMessageResult.deletedCount;

		// 16. Delete Dating Calls
		const datingCallResult = await DatingCall.deleteMany({ participants: userId });
		deletionStats.datingCalls = datingCallResult.deletedCount;

		// 17. Delete Dating Profile Comments
		const profileCommentResult = await DatingProfileComment.deleteMany({
			$or: [{ user: userId }, { targetUser: userId }]
		});
		deletionStats.profileComments = profileCommentResult.deletedCount;

		// ========== CLEAN UP USER REFERENCES ==========

		// Remove user from other users' following arrays
		await User.updateMany(
			{ following: userId },
			{ $pull: { following: userId } }
		);

		// Remove user from other users' followers arrays
		await User.updateMany(
			{ followers: userId },
			{ $pull: { followers: userId } }
		);

		// Remove user from other users' blockedUsers arrays
		await User.updateMany(
			{ blockedUsers: userId },
			{ $pull: { blockedUsers: userId } }
		);

		// Remove user from other users' blockedBy arrays
		await User.updateMany(
			{ blockedBy: userId },
			{ $pull: { blockedBy: userId } }
		);

		// Remove user from other users' closeFriends arrays
		await User.updateMany(
			{ closeFriends: userId },
			{ $pull: { closeFriends: userId } }
		);

		// Remove user's posts from other users' savedPosts arrays
		if (userPostIds.length > 0) {
			await User.updateMany(
				{ savedPosts: { $in: userPostIds } },
				{ $pullAll: { savedPosts: userPostIds } }
			);
		}

		// ========== DELETE S3 FILES ==========

		// Delete profile picture
		if (user.profilePictureUrl) {
			await deleteS3Files([user.profilePictureUrl]);
		}

		// Delete verification documents
		if (user.verificationDocument?.documentUrls) {
			await deleteS3Files(user.verificationDocument.documentUrls);
		}

		// Delete dating photos
		if (user.dating?.photos) {
			const photoUrls = user.dating.photos
				.map(photo => [photo.url, photo.thumbnailUrl])
				.flat()
				.filter(Boolean);
			await deleteS3Files(photoUrls);
		}

		// Delete dating videos
		if (user.dating?.videos) {
			const videoUrls = user.dating.videos
				.map(video => [video.url, video.thumbnailUrl])
				.flat()
				.filter(Boolean);
			await deleteS3Files(videoUrls);
		}

		// ========== DELETE USER ACCOUNT ==========

		await User.findByIdAndDelete(userId);

		console.log('[DELETE_ACCOUNT] Account deletion completed successfully:', {
			userId,
			deletionStats
		});

		return ApiResponse.success(
			res,
			{
				message: 'Account and all associated data deleted successfully',
				deletionStats
			},
			'Account deleted successfully'
		);

	} catch (error) {
		console.error('[DELETE_ACCOUNT] Error deleting account:', error);
		console.error('[DELETE_ACCOUNT] Error stack:', error.stack);
		return ApiResponse.serverError(res, 'Failed to delete account. Please try again later.');
	}
}

module.exports = {
	deleteAccount
};

