const express = require('express');
const router = express.Router();
const { getUsers, updateUserStatus } = require('./userSearch.controller');
const { authorize, Roles } = require('../../../middleware/authMiddleware');

router.get('/users', authorize([Roles.ADMIN, Roles.SUBADMIN]), getUsers);
router.patch('/users/:userId/status', authorize([Roles.ADMIN, Roles.SUBADMIN]), updateUserStatus);

module.exports = router;
