const express = require('express');
const router = express.Router();
const { checkAvailability, suggest } = require('./username.controller');

router.get('/available', checkAvailability);
router.get('/suggest', suggest);

module.exports = router;
