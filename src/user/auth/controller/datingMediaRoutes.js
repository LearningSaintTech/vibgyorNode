const express = require('express');
const router = express.Router();
const { authorize, Roles } = require('../../../middleware/authMiddleware');
const {
	uploadDatingPhotos,
	uploadDatingVideos,
	removeDatingPhoto,
	removeDatingVideo,
	updatePhotoOrder,
	updateVideoOrder,
	getDatingProfile,
	toggleDatingProfile
} = require('./datingMediaController');

// All routes require user authentication
router.use(authorize([Roles.USER]));

// Get dating profile
router.get('/profile', getDatingProfile);

// Upload dating photos (1-5 photos)
router.post('/photos', uploadDatingPhotos);

// Upload dating videos (1-5 videos)
router.post('/videos', uploadDatingVideos);

// Remove a photo by index
router.delete('/photos/:photoIndex', removeDatingPhoto);

// Remove a video by index
router.delete('/videos/:videoIndex', removeDatingVideo);

// Update photo order
router.put('/photos/order', updatePhotoOrder);

// Update video order
router.put('/videos/order', updateVideoOrder);

// Toggle dating profile active status
router.put('/toggle', toggleDatingProfile);

module.exports = router;

