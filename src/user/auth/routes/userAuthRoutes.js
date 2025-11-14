const express = require('express');
const router = express.Router();
const { authorize, Roles } = require('../../../middleware/authMiddleware');
const { sendPhoneOtp, verifyPhoneOtp, resendPhoneOtp, sendEmailOtp, verifyEmailOtp, resendEmailOtp, getMe, getProfile, getUserProfile, updateProfile, getProfileStep, getEmailVerificationStatus, refreshToken, getPrivacySettings, updatePrivacySettings } = require('../controller/userAuthController');

// Phone OTP auth
router.post('/send-otp', sendPhoneOtp);
router.post('/verify-otp', verifyPhoneOtp);
router.post('/resend-otp', resendPhoneOtp);

// Email OTP verification (requires logged-in user)
router.post('/email/send-otp', authorize([Roles.USER]), sendEmailOtp);
router.post('/email/verify-otp', authorize([Roles.USER]), verifyEmailOtp);
router.post('/email/resend-otp', authorize([Roles.USER]), resendEmailOtp);

// Get current user profile
router.get('/me', authorize([Roles.USER]), getMe);

// Get detailed user profile
router.get('/profile', authorize([Roles.USER]), getProfile);

// Get profile completion step (must be before /:userId)
router.get('/profile/step', authorize([Roles.USER]), getProfileStep);

// Get other user's profile
router.get('/profile/:userId', authorize([Roles.USER]), getUserProfile);

// Profile update
router.put('/profile', authorize([Roles.USER]), updateProfile);

// Get email verification status
router.get('/email/status', authorize([Roles.USER]), getEmailVerificationStatus);

// Privacy Settings
router.get('/privacy-settings', authorize([Roles.USER]), getPrivacySettings);
router.put('/privacy-settings', authorize([Roles.USER]), updatePrivacySettings);

router.post('/update-access-token',refreshToken)

module.exports = router;


