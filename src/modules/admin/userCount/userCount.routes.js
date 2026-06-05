const express = require('express');
const router = express.Router();
const { authorize, Roles } = require('../../../middleware/authMiddleware');
const { getUserCounts } = require('./userCount.controller');

router.get('/counts', authorize([Roles.ADMIN, Roles.SUBADMIN]), getUserCounts);

module.exports = router;
