const express = require('express');
const router = express.Router();
const { authorize, Roles } = require('../../../middleware/authMiddleware');
const {
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
} = require('../userController/userSocialController');

// Social Features Routes (User only)
// Follow Requests
router.post('/follow-request/:userId', authorize([Roles.USER]), sendFollowRequest);
router.post('/follow-request/:requestId/accept', authorize([Roles.USER]), acceptFollowRequest);
router.post('/follow-request/:requestId/reject', authorize([Roles.USER]), rejectFollowRequest);
router.delete('/follow-request/:requestId/cancel', authorize([Roles.USER]), cancelFollowRequest);
router.get('/follow-requests/pending', authorize([Roles.USER]), getPendingFollowRequests);
router.get('/follow-requests/sent', authorize([Roles.USER]), getSentFollowRequests);

// Follow/Unfollow (after request is accepted)
router.delete('/follow/:userId', authorize([Roles.USER]), unfollowUser);
router.delete('/follower/:userId', authorize([Roles.USER]), removeFollower);
router.get('/followers', authorize([Roles.USER]), getFollowers);
router.get('/following', authorize([Roles.USER]), getFollowing);

// Block/Unblock
router.post('/block/:userId', authorize([Roles.USER]), blockUser);
router.delete('/block/:userId', authorize([Roles.USER]), unblockUser);
router.get('/blocked', authorize([Roles.USER]), getBlockedUsers);

// Report
router.post('/report/:userId', authorize([Roles.USER]), reportUser);
router.get('/reports', authorize([Roles.USER]), getUserReports);

// Social Stats
router.get('/social-stats', authorize([Roles.USER]), getSocialStats);

module.exports = router;
