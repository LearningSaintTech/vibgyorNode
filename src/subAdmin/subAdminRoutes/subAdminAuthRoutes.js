const express = require('express');
const router = express.Router();
const { sendOtp, verifyOtp, resendOtp } = require('../../admin/adminController/unifiedAdminAuthController');
const { updateProfile, getProfile } = require('../subAdminController/subAdminAuthController');
const { authorize, Roles } = require('../../middleware/authMiddleware');
const { uploadSingle } = require('../../middleware/uploadMiddleware');

// Unified Admin/SubAdmin OTP auth routes
// Phone numbers: 9999999999 (admin), 8888888888 (subadmin)
// OTP: 123456
// Note: These routes are kept for backward compatibility but use unified controller
router.post('/auth/send-otp', sendOtp);
router.post('/auth/verify-otp', verifyOtp);
router.post('/auth/resend-otp', resendOtp);

// Get current subadmin profile
router.get(
	'/getprofile',
	authorize([Roles.SUBADMIN]),
	getProfile
);

router.put(
	'/profile',
	authorize([Roles.SUBADMIN]),
	uploadSingle,// ✅ field name explicit
	updateProfile
);

module.exports = router;


