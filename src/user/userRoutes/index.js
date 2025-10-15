const express = require('express');
const router = express.Router();

// Import enhanced routes
const enhancedChatRoutes = require('./enhancedChatRoutes');
const enhancedMessageRoutes = require('./enhancedMessageRoutes');
const enhancedCallRoutes = require('./enhancedCallRoutes');
const userSearchRoutes = require('./userSearchRoutes');

// Mount routes with prefixes
router.use('/chats', enhancedChatRoutes);
router.use('/messages', enhancedMessageRoutes);
router.use('/calls', enhancedCallRoutes);
router.use('/search', userSearchRoutes);

module.exports = router;
