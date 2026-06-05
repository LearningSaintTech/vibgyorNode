const express = require('express');
const router = express.Router();
const {
	signupSendOtp,
	loginSendOtp,
	verifyOtp,
	resendOtp,
	getProfile,
	updateProfile,
	getMe,
} = require('./adminAuth.controller');
const { authorize, Roles } = require('../../../middleware/authMiddleware');
const { uploadSingle } = require('../../../middleware/uploadMiddleware');
const { check2FactorStatus } = require('../../../services/twofactor/controllers/twoFactorStatusController');

router.post('/signup/send-otp', signupSendOtp);
router.post('/login/send-otp', loginSendOtp);

// Shared (after either signup or login send-otp)
router.post('/verify-otp', verifyOtp);
router.post('/resend-otp', resendOtp);

router.get('/me', authorize([Roles.ADMIN]), getMe);
router.get('/get-profile', authorize([Roles.ADMIN]), getProfile);
router.put('/update-profile', authorize([Roles.ADMIN]), uploadSingle, updateProfile);

router.get('/2factor-status', check2FactorStatus);

module.exports = router;
