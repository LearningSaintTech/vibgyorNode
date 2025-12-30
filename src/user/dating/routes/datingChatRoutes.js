const express = require('express');
const router = express.Router();
const DatingChatController = require('../controllers/datingChatController');
const { authorize } = require('../../../middleware/authMiddleware');
const { validateRequest } = require('../../../middleware/validationMiddleware');

/**
 * Dating Chat Routes with comprehensive middleware and validation
 */

// Apply authentication middleware to all routes
router.use(authorize());

/**
 * @route   POST /api/user/dating/chats
 * @desc    Create or get chat for a dating match
 * @access  Private
 * @body    { matchId: string }
 */
router.post('/', 
  validateRequest({
    body: {
      matchId: { type: 'string', required: true, minLength: 24, maxLength: 24 }
    }
  }),
  DatingChatController.createOrGetChat
);

/**
 * @route   GET /api/user/dating/chats
 * @desc    Get user's dating chats with pagination and optional search
 * @access  Private
 * @query   { page: number, limit: number, q?: string, search?: string }
 */
router.get('/', 
  validateRequest({
    query: {
      page: { type: 'number', min: 1, default: 1 },
      limit: { type: 'number', min: 1, max: 100, default: 20 },
      q: { type: 'string', optional: true, maxLength: 100 },
      search: { type: 'string', optional: true, maxLength: 100 }
    }
  }),
  DatingChatController.getUserChats
);

/**
 * @route   GET /api/user/dating/chats/search
 * @desc    Search dating chats by participant name
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
  DatingChatController.searchChats
);

/**
 * @route   GET /api/user/dating/chats/stats
 * @desc    Get dating chat statistics for user
 * @access  Private
 */
router.get('/stats', DatingChatController.getChatStats);

/**
 * @route   GET /api/user/dating/chats/:chatId
 * @desc    Get dating chat details
 * @access  Private
 * @params  { chatId: string }
 */
router.get('/:chatId',
  validateRequest({
    params: {
      chatId: { type: 'string', required: true, minLength: 24, maxLength: 24 }
    }
  }),
  DatingChatController.getChatDetails
);

/**
 * @route   PUT /api/user/dating/chats/:chatId/settings
 * @desc    Update dating chat settings (archive, pin, mute)
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
  DatingChatController.updateChatSettings
);

/**
 * @route   DELETE /api/user/dating/chats/:chatId
 * @desc    Delete dating chat (archive for user)
 * @access  Private
 * @params  { chatId: string }
 */
router.delete('/:chatId',
  validateRequest({
    params: {
      chatId: { type: 'string', required: true, minLength: 24, maxLength: 24 }
    }
  }),
  DatingChatController.deleteChat
);

/**
 * @route   POST /api/user/dating/chats/:chatId/join
 * @desc    Join dating chat room for real-time updates
 * @access  Private
 * @params  { chatId: string }
 */
router.post('/:chatId/join',
  validateRequest({
    params: {
      chatId: { type: 'string', required: true, minLength: 24, maxLength: 24 }
    }
  }),
  DatingChatController.joinChat
);

/**
 * @route   POST /api/user/dating/chats/:chatId/leave
 * @desc    Leave dating chat room
 * @access  Private
 * @params  { chatId: string }
 */
router.post('/:chatId/leave',
  validateRequest({
    params: {
      chatId: { type: 'string', required: true, minLength: 24, maxLength: 24 }
    }
  }),
  DatingChatController.leaveChat
);

module.exports = router;

