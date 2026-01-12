const MessageService = require('../services/messageService');
const { createResponse, createErrorResponse } = require('../../../utils/apiResponse');

/**
 * Enhanced Message Controller with comprehensive error handling
 */
class MessageController {
  
  /**
   * Send a message
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async sendMessage(req, res) {
    console.log('🔵 [BACKEND_MSG_CTRL] sendMessage called:', { 
      userId: req.user?.userId,
      chatId: req.body?.chatId,
      type: req.body?.type,
      hasContent: !!req.body?.content,
      hasFile: !!req.file,
      timestamp: new Date().toISOString()
    });
    try {
      const { chatId, type = 'text', content = '', replyTo = null, forwardedFrom = null } = req.body;
      const userId = req.user.userId;
      const file = req.file || null;
      
      console.log('🔵 [BACKEND_MSG_CTRL] Processing message:', { chatId, type, contentLength: content?.length, hasFile: !!file, replyTo, forwardedFrom });
      
      // Input validation
      if (!chatId) {
        console.warn('⚠️ [BACKEND_MSG_CTRL] Chat ID missing');
        return res.status(400).json(createErrorResponse('Chat ID is required'));
      }
      
      if (type === 'text' && (!content || content.trim() === '')) {
        console.warn('⚠️ [BACKEND_MSG_CTRL] Content missing for text message');
        return res.status(400).json(createErrorResponse('Message content is required for text messages'));
      }
      
      // Validate file requirement for media messages (except location)
      if (['audio', 'video', 'image', 'document', 'gif', 'voice'].includes(type) && !file) {
        console.warn('⚠️ [BACKEND_MSG_CTRL] File missing for media message');
        return res.status(400).json(createErrorResponse('File is required for media messages'));
      }
      
      // Validate location data for location messages
      if (type === 'location') {
        if (!req.body.location || typeof req.body.location.latitude !== 'number' || typeof req.body.location.longitude !== 'number') {
          console.warn('⚠️ [BACKEND_MSG_CTRL] Invalid location data');
          return res.status(400).json(createErrorResponse('Valid location data (latitude, longitude) is required for location messages'));
        }
      }
      
      const messageData = {
        chatId,
        senderId: userId,
        type,
        content: content.trim(),
        replyTo,
        forwardedFrom,
        // One-view fields
        isOneView: req.body.isOneView === true || req.body.isOneView === 'true',
        oneViewExpirationHours: req.body.oneViewExpirationHours || null,
        // Location data
        location: req.body.location || null,
        // GIF fields
        gifSource: req.body.gifSource || null,
        gifId: req.body.gifId || null,
        // Music metadata
        musicMetadata: req.body.musicMetadata || null,
        // Duration for video/audio/voice (from FormData)
        duration: req.body.duration || null,
        // Dimensions for images/videos (from FormData)
        width: req.body.width || null,
        height: req.body.height || null
      };
      
      // Debug: Log duration for voice/audio/video messages
      if (['voice', 'audio', 'video'].includes(type)) {
        console.log('🔵 [BACKEND_MSG_CTRL] Duration received for', type, 'message:', {
          duration: req.body.duration,
          durationType: typeof req.body.duration,
          durationValue: req.body.duration,
          hasDuration: !!req.body.duration,
          messageDataDuration: messageData.duration,
          allBodyKeys: Object.keys(req.body),
          bodyDuration: req.body.duration
        });
      }
      
      console.log('🔵 [BACKEND_MSG_CTRL] Calling MessageService.sendMessage...');
      const message = await MessageService.sendMessage(messageData, file);
      console.log('✅ [BACKEND_MSG_CTRL] MessageService.sendMessage success:', { messageId: message._id || message.messageId, chatId });
      
      res.status(201).json(createResponse(
        'Message sent successfully',
        { message },
        { messageId: message.messageId, chatId }
      ));
      console.log('✅ [BACKEND_MSG_CTRL] Response sent to client');
      
    } catch (error) {
      console.error('❌ [BACKEND_MSG_CTRL] sendMessage error:', { 
        error: error.message, 
        stack: error.stack,
        chatId: req.body?.chatId,
        userId: req.user?.userId
      });
      
      let statusCode = 500;
      if (error.message.includes('not found') || error.message.includes('Access denied')) {
        statusCode = 404;
      } else if (error.message.includes('required') || error.message.includes('Invalid') || error.message.includes('too large')) {
        statusCode = 400;
      } else if (error.message.includes('permission')) {
        statusCode = 403;
      }
      
      res.status(statusCode).json(createErrorResponse(error.message));
    }
  }
  
  /**
   * Get messages in a chat with pagination
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getChatMessages(req, res) {
    console.log('🔵 [BACKEND_MSG_CTRL] getChatMessages called:', { 
      chatId: req.params?.chatId,
      userId: req.user?.userId,
      page: req.query?.page,
      limit: req.query?.limit,
      timestamp: new Date().toISOString()
    });
    try {
      const { chatId } = req.params;
      const userId = req.user.userId;
      const page = parseInt(req.query.page) || 1;
      const limit = Math.min(parseInt(req.query.limit) || 50, 100);
      
      console.log('🔵 [BACKEND_MSG_CTRL] Calling MessageService.getChatMessages...', { chatId, userId, page, limit });
      const result = await MessageService.getChatMessages(chatId, userId, page, limit);
      console.log('✅ [BACKEND_MSG_CTRL] MessageService.getChatMessages success:', { 
        messagesCount: result.messages?.length || 0,
        hasPagination: !!result.pagination,
        chatId
      });
      
      res.status(200).json(createResponse(
        'Messages retrieved successfully',
        result,
        { chatId, pagination: result.pagination }
      ));
      console.log('✅ [BACKEND_MSG_CTRL] Response sent to client');
      
    } catch (error) {
      console.error('❌ [BACKEND_MSG_CTRL] getChatMessages error:', { 
        error: error.message, 
        stack: error.stack,
        chatId: req.params?.chatId,
        userId: req.user?.userId
      });
      
      let statusCode = 500;
      if (error.message.includes('not found') || error.message.includes('Access denied')) {
        statusCode = 404;
      } else if (error.message.includes('required') || error.message.includes('Invalid')) {
        statusCode = 400;
      }
      
      res.status(statusCode).json(createErrorResponse(error.message));
    }
  }
  
  /**
   * Mark messages as read in a chat
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async markMessagesAsRead(req, res) {
    try {
      const { chatId } = req.params;
      const userId = req.user.userId;
      
      const result = await MessageService.markMessagesAsRead(chatId, userId);
      
      res.status(200).json(createResponse(
        'Messages marked as read successfully',
        result,
        { chatId }
      ));
      
    } catch (error) {
      console.error('[MessageController] markMessagesAsRead error:', error);
      
      let statusCode = 500;
      if (error.message.includes('not found') || error.message.includes('Access denied')) {
        statusCode = 404;
      } else if (error.message.includes('required')) {
        statusCode = 400;
      }
      
      res.status(statusCode).json(createErrorResponse(error.message));
    }
  }
  
  /**
   * Edit a message
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async editMessage(req, res) {
    try {
      const { messageId } = req.params;
      const { content } = req.body;
      const userId = req.user.userId;
      
      if (!content || content.trim() === '') {
        return res.status(400).json(createErrorResponse('Message content is required'));
      }
      
      const result = await MessageService.editMessage(messageId, userId, content);
      
      res.status(200).json(createResponse(
        'Message edited successfully',
        result,
        { messageId }
      ));
      
    } catch (error) {
      console.error('[MessageController] editMessage error:', error);
      
      let statusCode = 500;
      if (error.message.includes('not found') || error.message.includes('Access denied')) {
        statusCode = 404;
      } else if (error.message.includes('required') || error.message.includes('too old') || error.message.includes('deleted')) {
        statusCode = 400;
      } else if (error.message.includes('only edit your own')) {
        statusCode = 403;
      }
      
      res.status(statusCode).json(createErrorResponse(error.message));
    }
  }
  
  /**
   * Delete a message
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async deleteMessage(req, res) {
    try {
      const { messageId } = req.params;
      const { deleteForEveryone = false } = req.body; // Default to false (Delete for Me)
      const userId = req.user.userId;
      
      const result = await MessageService.deleteMessage(messageId, userId, deleteForEveryone);
      
      res.status(200).json(createResponse(
        deleteForEveryone ? 'Message deleted for everyone' : 'Message deleted successfully',
        result,
        { messageId, deleteForEveryone: result.deletedForEveryone }
      ));
      
    } catch (error) {
      console.error('[MessageController] deleteMessage error:', error);
      
      let statusCode = 500;
      if (error.message.includes('not found') || error.message.includes('Access denied')) {
        statusCode = 404;
      } else if (error.message.includes('required') || error.message.includes('already deleted')) {
        statusCode = 400;
      } else if (error.message.includes('only delete your own') || error.message.includes('older than 1 hour')) {
        statusCode = 400; // Bad request for time restrictions
      } else if (error.message.includes('only delete your own')) {
        statusCode = 403;
      }
      
      res.status(statusCode).json(createErrorResponse(error.message));
    }
  }
  
  /**
   * Add reaction to a message
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async reactToMessage(req, res) {
    try {
      const { messageId } = req.params;
      const { emoji } = req.body;
      const userId = req.user.userId;
      
      if (!emoji) {
        return res.status(400).json(createErrorResponse('Emoji is required'));
      }
      
      const result = await MessageService.reactToMessage(messageId, userId, emoji);
      
      res.status(200).json(createResponse(
        'Reaction added successfully',
        result,
        { messageId }
      ));
      
    } catch (error) {
      console.error('[MessageController] reactToMessage error:', error);
      
      let statusCode = 500;
      if (error.message.includes('not found') || error.message.includes('Access denied')) {
        statusCode = 404;
      } else if (error.message.includes('required') || error.message.includes('deleted')) {
        statusCode = 400;
      }
      
      res.status(statusCode).json(createErrorResponse(error.message));
    }
  }
  
  /**
   * Remove reaction from a message
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async removeReaction(req, res) {
    try {
      const { messageId } = req.params;
      const userId = req.user.userId;
      
      const result = await MessageService.removeReaction(messageId, userId);
      
      res.status(200).json(createResponse(
        'Reaction removed successfully',
        result,
        { messageId }
      ));
      
    } catch (error) {
      console.error('[MessageController] removeReaction error:', error);
      
      let statusCode = 500;
      if (error.message.includes('not found') || error.message.includes('Access denied')) {
        statusCode = 404;
      } else if (error.message.includes('required')) {
        statusCode = 400;
      }
      
      res.status(statusCode).json(createErrorResponse(error.message));
    }
  }
  
  /**
   * Forward a message to another chat
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async forwardMessage(req, res) {
    try {
      const { messageId } = req.params;
      const { targetChatId } = req.body;
      const userId = req.user.userId;
      
      if (!targetChatId) {
        return res.status(400).json(createErrorResponse('Target chat ID is required'));
      }
      
      const result = await MessageService.forwardMessage(messageId, targetChatId, userId);
      
      res.status(200).json(createResponse(
        'Message forwarded successfully',
        result,
        { messageId, targetChatId }
      ));
      
    } catch (error) {
      console.error('[MessageController] forwardMessage error:', error);
      
      let statusCode = 500;
      if (error.message.includes('not found') || error.message.includes('Access denied')) {
        statusCode = 404;
      } else if (error.message.includes('required')) {
        statusCode = 400;
      }
      
      res.status(statusCode).json(createErrorResponse(error.message));
    }
  }
  
  /**
   * Search messages in a chat
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async searchMessages(req, res) {
    try {
      const { chatId } = req.params;
      const { q: query, page = 1, limit = 20 } = req.query;
      const userId = req.user.userId;
      
      if (!query || query.trim() === '') {
        return res.status(400).json(createErrorResponse('Search query is required'));
      }
      
      const result = await MessageService.searchMessages(chatId, userId, query, parseInt(page), parseInt(limit));
      
      res.status(200).json(createResponse(
        'Messages search completed successfully',
        result,
        { chatId, query, pagination: result.pagination }
      ));
      
    } catch (error) {
      console.error('[MessageController] searchMessages error:', error);
      
      let statusCode = 500;
      if (error.message.includes('not found') || error.message.includes('Access denied')) {
        statusCode = 404;
      } else if (error.message.includes('required') || error.message.includes('Invalid')) {
        statusCode = 400;
      }
      
      res.status(statusCode).json(createErrorResponse(error.message));
    }
  }
  
  /**
   * Get media messages in a chat
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getChatMedia(req, res) {
    try {
      const { chatId } = req.params;
      const { type, page = 1, limit = 20 } = req.query;
      const userId = req.user.userId;
      
      const result = await MessageService.getChatMedia(chatId, userId, type, parseInt(page), parseInt(limit));
      
      res.status(200).json(createResponse(
        'Chat media retrieved successfully',
        result,
        { chatId, type, pagination: result.pagination }
      ));
      
    } catch (error) {
      console.error('[MessageController] getChatMedia error:', error);
      
      let statusCode = 500;
      if (error.message.includes('not found') || error.message.includes('Access denied')) {
        statusCode = 404;
      } else if (error.message.includes('required') || error.message.includes('Invalid')) {
        statusCode = 400;
      }
      
      res.status(statusCode).json(createErrorResponse(error.message));
    }
  }
  
  /**
   * Get message details
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getMessageDetails(req, res) {
    try {
      const { messageId } = req.params;
      const userId = req.user.userId;
      
      const message = await MessageService.getMessageDetails(messageId, userId);
      
      res.status(200).json(createResponse(
        'Message details retrieved successfully',
        { message },
        { messageId }
      ));
      
    } catch (error) {
      console.error('[MessageController] getMessageDetails error:', error);
      
      let statusCode = 500;
      if (error.message.includes('not found') || error.message.includes('Access denied')) {
        statusCode = 404;
      } else if (error.message.includes('required')) {
        statusCode = 400;
      }
      
      res.status(statusCode).json(createErrorResponse(error.message));
    }
  }

  /**
   * Mark a one-view message as viewed
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async markOneViewAsViewed(req, res) {
    try {
      const { messageId } = req.params;
      const userId = req.user.userId;
      
      const message = await MessageService.markOneViewAsViewed(messageId, userId);
      
      res.status(200).json(createResponse(
        'One-view message marked as viewed',
        { message },
        { messageId }
      ));
      
    } catch (error) {
      console.error('[MessageController] markOneViewAsViewed error:', error);
      
      let statusCode = 500;
      if (error.message.includes('not found')) {
        statusCode = 404;
      } else if (error.message.includes('not a one-view') || error.message.includes('already viewed')) {
        statusCode = 400;
      }
      
      res.status(statusCode).json(createErrorResponse(error.message));
    }
  }
}

module.exports = MessageController;
