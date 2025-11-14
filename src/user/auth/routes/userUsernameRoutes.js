const express = require('express');
const router = express.Router();
const { checkAvailability, suggest } = require('../controller/userUsernameController');

// Username availability and suggestions
router.get('/available', checkAvailability);
router.get('/suggest', suggest);

module.exports = router;
