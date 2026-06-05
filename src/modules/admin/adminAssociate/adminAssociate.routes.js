const express = require('express');
const router = express.Router();
const { authorize, Roles } = require('../../../middleware/authMiddleware');
const { getSubadmins, createSubadmin } = require('./adminAssociate.controller');

router.get('/gettsubadmins', authorize([Roles.ADMIN]), getSubadmins);
router.post('/createsubadmins', authorize([Roles.ADMIN]), createSubadmin);

module.exports = router;
