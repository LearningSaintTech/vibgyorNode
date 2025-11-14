const express = require('express');
const router = express.Router();
const ChatController = require('../userController/enhancedChatController');
const { authorize } = require('../../../middleware/authMiddleware');
const { validateRequest } = require('../../../middleware/validationMiddleware');

/**
 * Enhanced Chat Routes with comprehensive middleware and validation
 */

// Apply authentication middleware to all routes
router.use(authorize());

/**
 * @route   POST /api/user/chats
 * @desc    Create or get chat between users
 * @access  Private
 * @body    { otherUserId: string }
 */
router.post('/', 
  validateRequest({
    body: {
      otherUserId: { type: 'string', required: true, minLength: 24, maxLength: 24 }
    }
  }),
  ChatController.createOrGetChat
);

/**
 * @route   GET /api/user/chats
 * @desc    Get user's chats with pagination
 * @access  Private
 * @query   { page: number, limit: number }
 */
router.get('/', 
  validateRequest({
    query: {
      page: { type: 'number', min: 1, default: 1 },
      limit: { type: 'number', min: 1, max: 100, default: 20 }
    }
  }),
  ChatController.getUserChats
);

/**
 * @route   GET /api/user/chats/search
 * @desc    Search chats by participant name
 * @access  Private
 * @query   { q: string, page: number, limit: number }
 */
router.get('/search',
  validateRequest({
    query: {
      q: { type: 'string', required: true, minLength: 1, maxLength: 100 },
      page: { type: 'number', min: 1, default: 1 },
      limit: { type: 'number', min: 1, max: 100, default: 20 }
    }
  }),
  ChatController.searchChats
);

/**
 * @route   GET /api/user/chats/stats
 * @desc    Get chat statistics for user
 * @access  Private
 */
router.get('/stats', ChatController.getChatStats);

/**
 * @route   GET /api/user/chats/:chatId
 * @desc    Get chat details
 * @access  Private
 * @params  { chatId: string }
 */
router.get('/:chatId',
  validateRequest({
    params: {
      chatId: { type: 'string', required: true, minLength: 24, maxLength: 24 }
    }
  }),
  ChatController.getChatDetails
);

/**
 * @route   PUT /api/user/chats/:chatId/settings
 * @desc    Update chat settings (archive, pin, mute)
 * @access  Private
 * @params  { chatId: string }
 * @body    { isArchived?: boolean, isPinned?: boolean, isMuted?: boolean }
 */
router.put('/:chatId/settings',
  validateRequest({
    params: {
      chatId: { type: 'string', required: true, minLength: 24, maxLength: 24 }
    },
    body: {
      isArchived: { type: 'boolean', optional: true },
      isPinned: { type: 'boolean', optional: true },
      isMuted: { type: 'boolean', optional: true }
    }
  }),
  ChatController.updateChatSettings
);

/**
 * @route   DELETE /api/user/chats/:chatId
 * @desc    Delete chat (archive for user)
 * @access  Private
 * @params  { chatId: string }
 */
router.delete('/:chatId',
  validateRequest({
    params: {
      chatId: { type: 'string', required: true, minLength: 24, maxLength: 24 }
    }
  }),
  ChatController.deleteChat
);

/**
 * @route   POST /api/user/chats/:chatId/join
 * @desc    Join chat room for real-time updates
 * @access  Private
 * @params  { chatId: string }
 */
router.post('/:chatId/join',
  validateRequest({
    params: {
      chatId: { type: 'string', required: true, minLength: 24, maxLength: 24 }
    }
  }),
  ChatController.joinChat
);

/**
 * @route   POST /api/user/chats/:chatId/leave
 * @desc    Leave chat room
 * @access  Private
 * @params  { chatId: string }
 */
router.post('/:chatId/leave',
  validateRequest({
    params: {
      chatId: { type: 'string', required: true, minLength: 24, maxLength: 24 }
    }
  }),
  ChatController.leaveChat
);

module.exports = router;
