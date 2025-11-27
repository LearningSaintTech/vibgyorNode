const express = require('express');
const router = express.Router();
const { authorize, Roles } = require('../../../middleware/authMiddleware');
const { 
	uploadProfilePicture, 
	uploadIdProof,
	uploadDatingPhotos,
	uploadDatingVideos,
	updateDatingPhoto,
	updateDatingVideo
} = require('../controller/userFileUploadController');

// File upload routes (requires authentication)
router.post('/profile-picture', authorize([Roles.USER]), uploadProfilePicture);
router.post('/id-proof', authorize([Roles.USER]), uploadIdProof);

// Dating media upload routes
router.post('/dating/photos', authorize([Roles.USER]), uploadDatingPhotos);
router.post('/dating/videos', authorize([Roles.USER]), uploadDatingVideos);

// Dating media update routes (replace existing photo/video by index)
router.put('/dating/photos/:photoIndex', authorize([Roles.USER]), updateDatingPhoto);
router.put('/dating/videos/:videoIndex', authorize([Roles.USER]), updateDatingVideo);

module.exports = router;
