const express = require('express');
const router = express.Router();
const { authorize, Roles } = require('../../middleware/authMiddleware');
const {
	getAllUsers,
	toggleUserStatus,
	getUserDetails,
	getPendingVerifications,
	approveUserVerification,
	rejectUserVerification,
	getPendingReports,
	getReportDetails,
	updateReportStatus,
	getReportStats
} = require('../adminController/userManagementController');

// User management routes (Admin only)
router.get('/users', authorize([Roles.ADMIN]), getAllUsers);
router.get('/users/:userId', authorize([Roles.ADMIN]), getUserDetails);
router.patch('/users/:userId/status', authorize([Roles.ADMIN]), toggleUserStatus);

// User verification management routes (Admin only)
router.get('/users/verifications/pending', authorize([Roles.ADMIN]), getPendingVerifications);
router.patch('/users/:userId/verification/approve', authorize([Roles.ADMIN]), approveUserVerification);
router.patch('/users/:userId/verification/reject', authorize([Roles.ADMIN]), rejectUserVerification);

// Report management routes (Admin only)
router.get('/reports/pending', authorize([Roles.ADMIN]), getPendingReports);
router.get('/reports/stats', authorize([Roles.ADMIN]), getReportStats);
router.get('/reports/:reportId', authorize([Roles.ADMIN]), getReportDetails);
router.patch('/reports/:reportId/status', authorize([Roles.ADMIN]), updateReportStatus);

module.exports = router;
