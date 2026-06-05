const express = require('express');
const router = express.Router();
const { authorize } = require('../../../middleware/authMiddleware');
const analyticsController = require('./analytics.controller');

router.use(authorize());

router.get('/platform-overview', analyticsController.getPlatformOverview);
router.get('/content', analyticsController.getContentAnalytics);
router.get('/moderation', analyticsController.getModerationAnalytics);
router.get('/engagement', analyticsController.getEngagementAnalytics);
router.get('/performance', analyticsController.getPerformanceAnalytics);
router.get('/users/:userId', analyticsController.getUserAnalytics);

module.exports = router;
