const express = require('express');
const router = express.Router();
const { authorize, Roles } = require('../../../middleware/authMiddleware');
const { validateRequest } = require('../../../middleware/validationMiddleware');
const { uploadSingle } = require('../../../middleware/uploadMiddleware');
const {
	sendDatingMessage,
	getDatingMessages,
	getDatingConversations,
	editDatingMessage,
	deleteDatingMessage,
	reactToDatingMessage,
	removeDatingReaction,
	forwardDatingMessage,
	searchDatingMessages,
	getDatingChatMedia,
	getDatingMessageDetails,
	markOneViewAsViewed
} = require('../controllers/datingMessageController');

// All routes require user authentication
router.use(authorize([Roles.USER]));

/**
 * @route   GET /api/user/dating/messages/conversations
 * @desc    Get all conversations (matches with chats)
 * @access  Private
 */
router.get('/conversations', getDatingConversations);

/**
 * @route   POST /api/user/dating/messages
 * @desc    Send a message to a dating match
 * @access  Private
 * @body    { matchId: string, message: string, type: string, replyTo?: string, forwardedFrom?: string }
 * @files   Optional file upload for media messages
 */
router.post('/',
  uploadSingle,
  validateRequest({
    body: {
      matchId: { type: 'string', required: true, minLength: 24, maxLength: 24 },
      type: { 
        type: 'string', 
        required: true, 
        enum: ['text', 'audio', 'video', 'image', 'document', 'gif', 'location', 'voice', 'system', 'forwarded']
      },
      message: { type: 'string', optional: true, maxLength: 4096 },
      replyTo: { type: 'string', optional: true, minLength: 24, maxLength: 24 },
      forwardedFrom: { type: 'string', optional: true, minLength: 24, maxLength: 24 },
      // One-view message fields
      isOneView: { type: 'boolean', optional: true },
      oneViewExpirationHours: { type: 'number', optional: true, min: 1, max: 168 },
      // Location fields
      location: {
        type: 'object',
        optional: true,
        properties: {
          latitude: { type: 'number', required: true, min: -90, max: 90 },
          longitude: { type: 'number', required: true, min: -180, max: 180 },
          address: { type: 'string', optional: true },
          name: { type: 'string', optional: true },
          placeType: { type: 'string', optional: true }
        }
      },
      // GIF fields
      gifSource: { type: 'string', optional: true, enum: ['upload', 'giphy', 'tenor'] },
      gifId: { type: 'string', optional: true },
      // Music metadata
      musicMetadata: {
        type: 'object',
        optional: true,
        properties: {
          title: { type: 'string', optional: true },
          artist: { type: 'string', optional: true },
          album: { type: 'string', optional: true },
          duration: { type: 'number', optional: true },
          genre: { type: 'string', optional: true }
        }
      }
    }
  }),
  sendDatingMessage
);

/**
 * @route   GET /api/user/dating/messages/chat/:chatId
 * @desc    Get messages in a dating chat with pagination
 * @access  Private
 * @params  { chatId: string }
 * @query   { page: number, limit: number }
 */
router.get('/chat/:chatId',
  validateRequest({
    params: {
      chatId: { type: 'string', required: true, minLength: 24, maxLength: 24 }
    },
    query: {
      page: { type: 'number', min: 1, default: 1 },
      limit: { type: 'number', min: 1, max: 100, default: 50 }
    }
  }),
  getDatingMessages
);

/**
 * @route   PUT /api/user/dating/messages/chat/:chatId/read
 * @desc    Mark messages as read in a dating chat
 * @access  Private
 * @params  { chatId: string }
 */
router.put('/chat/:chatId/read',
  validateRequest({
    params: {
      chatId: { type: 'string', required: true, minLength: 24, maxLength: 24 }
    }
  }),
  require('../controllers/datingMessageController').markDatingMessagesAsRead
);

/**
 * @route   GET /api/user/dating/messages/chat/:chatId/media
 * @desc    Get media messages in a dating chat
 * @access  Private
 * @params  { chatId: string }
 * @query   { type?: string, page: number, limit: number }
 */
router.get('/chat/:chatId/media',
  validateRequest({
    params: {
      chatId: { type: 'string', required: true, minLength: 24, maxLength: 24 }
    },
    query: {
      type: { type: 'string', optional: true, enum: ['audio', 'video', 'image', 'document', 'gif', 'voice'] },
      page: { type: 'number', min: 1, default: 1 },
      limit: { type: 'number', min: 1, max: 100, default: 20 }
    }
  }),
  getDatingChatMedia
);

/**
 * @route   GET /api/user/dating/messages/chat/:chatId/search
 * @desc    Search messages in a dating chat
 * @access  Private
 * @params  { chatId: string }
 * @query   { q: string, page: number, limit: number }
 */
router.get('/chat/:chatId/search',
  validateRequest({
    params: {
      chatId: { type: 'string', required: true, minLength: 24, maxLength: 24 }
    },
    query: {
      q: { type: 'string', required: true, minLength: 1, maxLength: 100 },
      page: { type: 'number', min: 1, default: 1 },
      limit: { type: 'number', min: 1, max: 100, default: 20 }
    }
  }),
  searchDatingMessages
);

/**
 * @route   PUT /api/user/dating/messages/:messageId/view
 * @desc    Mark a one-view message as viewed
 * @access  Private
 * @params  { messageId: string }
 */
router.put('/:messageId/view',
  validateRequest({
    params: {
      messageId: { type: 'string', required: true, minLength: 24, maxLength: 24 }
    }
  }),
  markOneViewAsViewed
);

/**
 * @route   GET /api/user/dating/messages/:messageId
 * @desc    Get dating message details
 * @access  Private
 * @params  { messageId: string }
 */
router.get('/:messageId',
  validateRequest({
    params: {
      messageId: { type: 'string', required: true, minLength: 24, maxLength: 24 }
    }
  }),
  getDatingMessageDetails
);

/**
 * @route   PUT /api/user/dating/messages/:messageId
 * @desc    Edit a dating message
 * @access  Private
 * @params  { messageId: string }
 * @body    { content: string }
 */
router.put('/:messageId',
  validateRequest({
    params: {
      messageId: { type: 'string', required: true, minLength: 24, maxLength: 24 }
    },
    body: {
      content: { type: 'string', required: true, minLength: 1, maxLength: 4096 }
    }
  }),
  editDatingMessage
);

/**
 * @route   DELETE /api/user/dating/messages/:messageId
 * @desc    Delete a dating message
 * @access  Private
 * @params  { messageId: string }
 */
router.delete('/:messageId',
  validateRequest({
    params: {
      messageId: { type: 'string', required: true, minLength: 24, maxLength: 24 }
    }
  }),
  deleteDatingMessage
);

/**
 * @route   POST /api/user/dating/messages/:messageId/reactions
 * @desc    Add reaction to a dating message
 * @access  Private
 * @params  { messageId: string }
 * @body    { emoji: string }
 */
router.post('/:messageId/reactions',
  validateRequest({
    params: {
      messageId: { type: 'string', required: true, minLength: 24, maxLength: 24 }
    },
    body: {
      emoji: { type: 'string', required: true, minLength: 1, maxLength: 10 }
    }
  }),
  reactToDatingMessage
);

/**
 * @route   DELETE /api/user/dating/messages/:messageId/reactions
 * @desc    Remove reaction from a dating message
 * @access  Private
 * @params  { messageId: string }
 */
router.delete('/:messageId/reactions',
  validateRequest({
    params: {
      messageId: { type: 'string', required: true, minLength: 24, maxLength: 24 }
    }
  }),
  removeDatingReaction
);

/**
 * @route   POST /api/user/dating/messages/:messageId/forward
 * @desc    Forward a dating message to another chat
 * @access  Private
 * @params  { messageId: string }
 * @body    { targetChatId: string }
 */
router.post('/:messageId/forward',
  validateRequest({
    params: {
      messageId: { type: 'string', required: true, minLength: 24, maxLength: 24 }
    },
    body: {
      targetChatId: { type: 'string', required: true, minLength: 24, maxLength: 24 }
    }
  }),
  forwardDatingMessage
);

// Get messages for a match (legacy route - keep for backward compatibility)
router.get('/:matchId', getDatingMessages);

module.exports = router;

