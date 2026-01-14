const express = require('express');
const router = express.Router();
const { sendOtp, verifyOtp, resendOtp } = require('../adminController/unifiedAdminAuthController');
const { authorize, Roles } = require('../../middleware/authMiddleware');
const { check2FactorStatus } = require('../../services/twofactor/controllers/twoFactorStatusController');

/**
 * Unified Admin/SubAdmin Authentication Routes
 * 
 * Fixed Phone Numbers:
 * - 9999999999 → Admin
 * - 8888888888 → SubAdmin
 * 
 * OTP: 123456
 * 
 * These endpoints work for both admin and subadmin.
 * Role is automatically determined from phone number.
 */

// Send OTP (works for both admin and subadmin)
router.post('/send-otp', sendOtp);

// Verify OTP (works for both admin and subadmin)
router.post('/verify-otp', verifyOtp);

// Resend OTP (works for both admin and subadmin)
router.post('/resend-otp', resendOtp);

// Get current admin/subadmin profile (works for both)
router.get('/me', authorize([Roles.ADMIN, Roles.SUBADMIN]), (req, res) => { 
	res.json({ 
		success: true, 
		user: req.user,
		role: req.user.role
	}); 
});

// Check 2Factor service status
router.get('/2factor-status', check2FactorStatus);

module.exports = router;

