const express = require('express');
const router = express.Router();
const { authorize } = require('../../../middleware/authMiddleware');
const contentModerationController = require('./contentModeration.controller');

router.use(authorize());

router.get('/flagged', contentModerationController.getFlaggedContent);
router.get('/pending', contentModerationController.getPendingReviews);
router.get('/queue-stats', contentModerationController.getModerationQueueStats);
router.get('/analytics', contentModerationController.getModerationAnalytics);
router.get('/:moderationId/details', contentModerationController.getContentDetails);
router.put('/:moderationId/review', contentModerationController.reviewContent);
router.put('/bulk-review', contentModerationController.bulkReviewContent);
router.put('/policies', contentModerationController.updateContentPolicies);

module.exports = router;
