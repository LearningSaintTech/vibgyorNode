const express = require('express');
const router = express.Router();
const { authorize, Roles } = require('../../middleware/authMiddleware');
const { getAllUsers } = require('../subAdminController/subAdminVerifiedUserController');

router.post(
   '/users',
   authorize([Roles.SUBADMIN]),
   getAllUsers
);

module.exports = router;
