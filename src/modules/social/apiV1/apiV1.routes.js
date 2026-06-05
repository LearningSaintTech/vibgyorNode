const express = require('express');
const router = express.Router();
const { chatRoutes: enhancedChatRoutes } = require('../chat');
const { messageRoutes: enhancedMessageRoutes } = require('../message');
const { callRoutes: enhancedCallRoutes } = require('../call');
const { searchRoutes: userSearchRoutes } = require('../search');

router.use('/chats', enhancedChatRoutes);
router.use('/messages', enhancedMessageRoutes);
router.use('/calls', enhancedCallRoutes);
router.use('/search', userSearchRoutes);

module.exports = router;
