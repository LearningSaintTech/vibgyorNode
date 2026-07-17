const express = require('express');
const router = express.Router();
const { authorize, Roles } = require('../../../middleware/authMiddleware');
const { getSubadmins, createSubadmin, getAssignedUsersBySubadmin } = require('./adminAssociate.controller');

router.get('/gettsubadmins', authorize([Roles.ADMIN]), getSubadmins);
router.post('/createsubadmins', authorize([Roles.ADMIN]), createSubadmin);
router.get('/assigned-users-by-subadmin/:subadminId', authorize([Roles.ADMIN]), getAssignedUsersBySubadmin);

module.exports = router;
