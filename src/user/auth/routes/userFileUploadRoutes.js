const express = require('express');
const router = express.Router();
const { authorize, Roles } = require('../../../middleware/authMiddleware');
const { uploadProfilePicture, uploadIdProof } = require('../controller/userFileUploadController');

// File upload routes (requires authentication)
router.post('/profile-picture', authorize([Roles.USER]), uploadProfilePicture);
router.post('/id-proof', authorize([Roles.USER]), uploadIdProof);

module.exports = router;
