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
	getDatingProfileLikes
} = require('../controllers/datingInteractionController');

router.use(authorize([Roles.USER]));

router.post('/profiles/:profileId/like', likeProfile);
router.post('/profiles/:profileId/dislike', dislikeProfile);

// Get all likes on a dating profile (MUST come before other routes)
router.get('/profiles/:profileId/likes', getDatingProfileLikes);

router.post('/profiles/:profileId/comments', addProfileComment);
router.get('/profiles/:profileId/comments', getProfileComments);

router.get('/matches', getMatches);

router.post('/profiles/:profileId/report', reportProfile);

router.post('/profiles/:profileId/block', blockProfile);
router.delete('/profiles/:profileId/block', unblockProfile);

module.exports = router;

