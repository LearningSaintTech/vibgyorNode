const express = require('express');
const router = express.Router();
const { sendOtp, verifyOtp, resendOtp, updateProfile, getProfile } = require('./auth.controller');
const { authorize, Roles } = require('../../../middleware/authMiddleware');
const { uploadSingle } = require('../../../middleware/uploadMiddleware');

router.post('/auth/send-otp', sendOtp);
router.post('/auth/verify-otp', verifyOtp);
router.post('/auth/resend-otp', resendOtp);

router.get('/getprofile', authorize([Roles.SUBADMIN]), getProfile);
router.put('/profile', authorize([Roles.SUBADMIN]), uploadSingle, updateProfile);

module.exports = router;
