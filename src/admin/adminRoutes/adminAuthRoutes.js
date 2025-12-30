const express = require('express');
const router = express.Router();
const { sendOtp, verifyOtp, resendOtp, } = require('../adminController/unifiedAdminAuthController');
const { getProfile, updateProfile } = require('../adminController/adminAuthController');
const { authorize, Roles } = require('../../middleware/authMiddleware');
const { uploadSingle } = require('../../middleware/uploadMiddleware');

// Unified Admin/SubAdmin OTP auth routes
// Phone numbers: 9999999999 (admin), 8888888888 (subadmin)
// OTP: 123456
router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.post('/resend-otp', resendOtp);

// Additional admin routes merged here
router.put('/update-profile', authorize([Roles.ADMIN]), uploadSingle, updateProfile);
// Protected routes

router.get('/get-profile', authorize([Roles.ADMIN]), getProfile);

module.exports = router;


