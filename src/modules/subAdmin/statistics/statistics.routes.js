const express = require('express');
const router = express.Router();
const { authorize, Roles } = require('../../../middleware/authMiddleware');
const { getVerificationStats } = require('./statistics.controller');

router.get('/dashboard/user-verification-stats', authorize([Roles.SUBADMIN]), getVerificationStats);

module.exports = router;
