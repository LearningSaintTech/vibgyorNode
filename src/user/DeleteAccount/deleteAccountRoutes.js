const express = require('express');
const router = express.Router();
const { authorize, Roles } = require('../../middleware/authMiddleware');
const { deleteAccount } = require('./deleteAccount');

/**
 * DELETE /user/account
 * Delete user account and all associated data (social and dating)
 * Requires authentication
 */
router.delete('/account', authorize([Roles.USER]), deleteAccount);

module.exports = router;

