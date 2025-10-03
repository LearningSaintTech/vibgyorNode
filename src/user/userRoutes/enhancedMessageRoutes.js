const express = require('express');
const router = express.Router();
const MessageController = require('../userController/enhancedMessageController');
const { authorize } = require('../../middleware/authMiddleware');
const { validateRequest } = require('../../middleware/validationMiddleware');
const { uploadSingle, uploadMultiple } = require('../../middleware/uploadMiddleware');

/**
 * Enhanced Message Routes with comprehensive middleware and validation
 */

// Apply authentication middleware to all routes
router.use(authorize());

/**
 * @route   POST /api/user/messages
 * @desc    Send a message
 * @access  Private
 * @body    { chatId: string, type: string, content: string, replyTo?: string, forwardedFrom?: string }
 * @files   Optional file upload for media messages
 */
router.post('/',
  uploadSingle,
  validateRequest({
    body: {
      chatId: { type: 'string', required: true, minLength: 24, maxLength: 24 },
      type: { 
        type: 'string', 
        required: true, 
        enum: ['text', 'audio', 'video', 'image', 'document', 'system', 'forwarded']
      },
      content: { type: 'string', optional: true, maxLength: 4096 },
      replyTo: { type: 'string', optional: true, minLength: 24, maxLength: 24 },
      forwardedFrom: { type: 'string', optional: true, minLength: 24, maxLength: 24 }
    }
  }),
  MessageController.sendMessage
);

/**
 * @route   GET /api/user/messages/chat/:chatId
 * @desc    Get messages in a chat with pagination
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
  MessageController.getChatMessages
);

/**
 * @route   PUT /api/user/messages/chat/:chatId/read
 * @desc    Mark messages as read in a chat
 * @access  Private
 * @params  { chatId: string }
 */
router.put('/chat/:chatId/read',
  validateRequest({
    params: {
      chatId: { type: 'string', required: true, minLength: 24, maxLength: 24 }
    }
  }),
  MessageController.markMessagesAsRead
);

/**
 * @route   GET /api/user/messages/chat/:chatId/media
 * @desc    Get media messages in a chat
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
      type: { type: 'string', optional: true, enum: ['audio', 'video', 'image', 'document'] },
      page: { type: 'number', min: 1, default: 1 },
      limit: { type: 'number', min: 1, max: 100, default: 20 }
    }
  }),
  MessageController.getChatMedia
);

/**
 * @route   GET /api/user/messages/chat/:chatId/search
 * @desc    Search messages in a chat
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
  MessageController.searchMessages
);

/**
 * @route   GET /api/user/messages/:messageId
 * @desc    Get message details
 * @access  Private
 * @params  { messageId: string }
 */
router.get('/:messageId',
  validateRequest({
    params: {
      messageId: { type: 'string', required: true, minLength: 24, maxLength: 24 }
    }
  }),
  MessageController.getMessageDetails
);

/**
 * @route   PUT /api/user/messages/:messageId
 * @desc    Edit a message
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
  MessageController.editMessage
);

/**
 * @route   DELETE /api/user/messages/:messageId
 * @desc    Delete a message
 * @access  Private
 * @params  { messageId: string }
 */
router.delete('/:messageId',
  validateRequest({
    params: {
      messageId: { type: 'string', required: true, minLength: 24, maxLength: 24 }
    }
  }),
  MessageController.deleteMessage
);

/**
 * @route   POST /api/user/messages/:messageId/reactions
 * @desc    Add reaction to a message
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
  MessageController.reactToMessage
);

/**
 * @route   DELETE /api/user/messages/:messageId/reactions
 * @desc    Remove reaction from a message
 * @access  Private
 * @params  { messageId: string }
 */
router.delete('/:messageId/reactions',
  validateRequest({
    params: {
      messageId: { type: 'string', required: true, minLength: 24, maxLength: 24 }
    }
  }),
  MessageController.removeReaction
);

/**
 * @route   POST /api/user/messages/:messageId/forward
 * @desc    Forward a message to another chat
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
  MessageController.forwardMessage
);

module.exports = router;
