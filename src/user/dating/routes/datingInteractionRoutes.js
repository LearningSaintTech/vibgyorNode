const express = require('express');
const router = express.Router();
const { authorize, Roles } = require('../../../middleware/authMiddleware');
const {
	likeProfile,
	dislikeProfile,
	addProfileComment,
	getProfileComments,
	getMatches,
	reportProfile,
	blockProfile,
	unblockProfile,
	unmatchUser,
	getDatingProfileLikes,
	getMatchProfilePictures
} = require('../controllers/datingInteractionController');

router.use(authorize([Roles.USER]));

router.post('/profiles/:userId/like', likeProfile);
router.post('/profiles/:userId/dislike', dislikeProfile);

// Get all likes on a dating profile (MUST come before other routes)
router.get('/profiles/:userId/likes', getDatingProfileLikes);

// Get profile pictures for match (current user and matched user)
router.get('/profiles/:userId/match-pictures', getMatchProfilePictures);

router.post('/profiles/:userId/comments', addProfileComment);
router.get('/profiles/:userId/comments', getProfileComments);

router.get('/matches', getMatches);

// Unmatch with a user (end a match)
router.delete('/matches/:matchId', unmatchUser);

router.post('/profiles/:userId/report', reportProfile);

router.post('/profiles/:userId/block', blockProfile);
router.delete('/profiles/:userId/block', unblockProfile);

module.exports = router;

