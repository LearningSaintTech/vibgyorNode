const express = require('express');
const router = express.Router();
const { authorize, Roles } = require('../../../middleware/authMiddleware');
const {
	sendDatingMessage,
	getDatingMessages,
	getDatingConversations
} = require('../controllers/datingMessageController');

// All routes require user authentication
router.use(authorize([Roles.USER]));

// Get all conversations (matches with chats)
router.get('/conversations', getDatingConversations);

// Send message to a match
router.post('/', sendDatingMessage);

// Get messages for a match
router.get('/:matchId', getDatingMessages);

module.exports = router;

