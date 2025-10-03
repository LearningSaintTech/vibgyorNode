const express = require('express');
const router = express.Router();
const { sendOtp, verifyOtp, resendOtp } = require('../adminController/adminAuthController');
const { authorize, Roles } = require('../../middleware/authMiddleware');

// Admin OTP auth routes
router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.post('/resend-otp', resendOtp);

// Additional admin routes merged here
router.get('/me', authorize([Roles.ADMIN]), (req, res) => { res.json({ success: true, user: req.user }); });

module.exports = router;


