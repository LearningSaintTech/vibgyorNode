const express = require('express');
const router = express.Router();
const { sendOtp, verifyOtp, resendOtp, updateProfile } = require('../subAdminController/subAdminAuthController');
const { authorize, Roles } = require('../../middleware/authMiddleware');
const { uploadSingle } = require('../../middleware/uploadMiddleware');

// OTP auth
router.post('/auth/send-otp', sendOtp);
router.post('/auth/verify-otp', verifyOtp);
router.post('/auth/resend-otp', resendOtp);

// Get current subadmin profile
router.get('/me', authorize([Roles.SUBADMIN]), (req, res) => { 
	res.json({ success: true, user: req.user }); 
});

// Complete profile after login (with image upload)
router.put('/profile', authorize([Roles.SUBADMIN]), uploadSingle, updateProfile);

module.exports = router;


