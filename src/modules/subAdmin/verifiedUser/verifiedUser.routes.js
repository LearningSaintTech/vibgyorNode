const express = require('express');
const router = express.Router();
const { authorize, Roles } = require('../../../middleware/authMiddleware');
const { getAllUsers } = require('./verifiedUser.controller');

router.get('/users', authorize([Roles.SUBADMIN]), getAllUsers);

module.exports = router;
