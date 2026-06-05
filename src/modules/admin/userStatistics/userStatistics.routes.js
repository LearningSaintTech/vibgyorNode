const express = require('express');
const router = express.Router();
const { authorize, Roles } = require('../../../middleware/authMiddleware');
const {
	getWeeklyUserStatistics,
	getMonthlyUserStatistics,
	getSixMonthsUserStatistics,
	getYearlyUserStatistics,
} = require('./userStatistics.controller');

router.get('/statistics/weekly', authorize([Roles.ADMIN, Roles.SUBADMIN]), getWeeklyUserStatistics);
router.get('/statistics/monthly', authorize([Roles.ADMIN, Roles.SUBADMIN]), getMonthlyUserStatistics);
router.get('/statistics/6months', authorize([Roles.ADMIN, Roles.SUBADMIN]), getSixMonthsUserStatistics);
router.get('/statistics/yearly', authorize([Roles.ADMIN, Roles.SUBADMIN]), getYearlyUserStatistics);

module.exports = router;
