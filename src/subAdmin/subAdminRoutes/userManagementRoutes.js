const express = require('express');
const router = express.Router();
const { authorize, Roles } = require('../../middleware/authMiddleware');
const {
	getAllUsers,
	toggleUserStatus,
	getUserDetails,
	getUserStats,
	getPendingVerifications,
	approveUserVerification,
	rejectUserVerification,
	getPendingReports,
	getReportDetails,
	updateReportStatus,
	getReportStats
} = require('../subAdminController/userManagementController');

// User management routes (SubAdmin can only manage users)
router.get('/users', authorize([Roles.SUBADMIN]), getAllUsers);
router.get('/users/stats', authorize([Roles.SUBADMIN]), getUserStats);
router.get('/users/:userId', authorize([Roles.SUBADMIN]), getUserDetails);
router.patch('/users/:userId/status', authorize([Roles.SUBADMIN]), toggleUserStatus);

// User verification management routes (SubAdmin can manage user verifications)
router.get('/users/verifications/pending', authorize([Roles.SUBADMIN]), getPendingVerifications);
router.patch('/users/:userId/verification/approve', authorize([Roles.SUBADMIN]), approveUserVerification);
router.patch('/users/:userId/verification/reject', authorize([Roles.SUBADMIN]), rejectUserVerification);

// Report management routes (SubAdmin can manage reports)
router.get('/reports/pending', authorize([Roles.SUBADMIN]), getPendingReports);
router.get('/reports/stats', authorize([Roles.SUBADMIN]), getReportStats);
router.get('/reports/:reportId', authorize([Roles.SUBADMIN]), getReportDetails);
router.patch('/reports/:reportId/status', authorize([Roles.SUBADMIN]), updateReportStatus);

module.exports = router;
