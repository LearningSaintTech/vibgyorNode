const express = require('express');
const router = express.Router();
const { authorize, Roles } = require('../../middleware/authMiddleware');
const {
	getAllSubAdmins,
	toggleSubAdminStatus,
	getSubAdminDetails,
	manageSubAdminApproval
} = require('../adminController/subAdminManagementController');

// SubAdmin management routes (Admin only)
router.get('/subadmins', authorize([Roles.ADMIN]), getAllSubAdmins);
router.get('/subadmins/pending', authorize([Roles.ADMIN]), manageSubAdminApproval);
router.get('/subadmins/:subAdminId', authorize([Roles.ADMIN]), getSubAdminDetails);
router.patch('/subadmins/:subAdminId/status', authorize([Roles.ADMIN]), toggleSubAdminStatus);
router.patch('/subadmins/:subAdminId/approval', authorize([Roles.ADMIN]), manageSubAdminApproval);

module.exports = router;
