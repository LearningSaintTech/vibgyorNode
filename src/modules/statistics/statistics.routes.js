const express = require('express');
const router = express.Router();
const { authorize, Roles } = require('../../middleware/authMiddleware');
const {
	getOverview,
	getDating,
	getSocial,
	getDatingTrends,
	getSocialTrends,
} = require('./statistics.controller');

const adminAuth = authorize([Roles.ADMIN, Roles.SUBADMIN]);

// Mounted at /admin/statistics
// Existing signup charts remain on userStatistics: /admin/statistics/weekly|monthly|…
router.get('/dating/trends', adminAuth, getDatingTrends);
router.get('/social/trends', adminAuth, getSocialTrends);
router.get('/overview', adminAuth, getOverview);
router.get('/dating', adminAuth, getDating);
router.get('/social', adminAuth, getSocial);

module.exports = router;
