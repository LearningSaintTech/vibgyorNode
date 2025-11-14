const ChatService = require('../services/chatService');
const MessageService = require('../services/messageService');
const { createResponse, createErrorResponse } = require('../../../utils/apiResponse');

/**
 * Enhanced Chat Controller with comprehensive error handling
 */
class ChatController {
  
  /**
   * Create or get chat between users
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async createOrGetChat(req, res) {
    try {
      const { otherUserId } = req.body;
      const userId = req.user.userId;
      
      // Input validation
      if (!otherUserId) {
        return res.status(400).json(createErrorResponse('Other user ID is required'));
      }
      
      if (otherUserId === userId.toString()) {
        return res.status(400).json(createErrorResponse('Cannot create chat with yourself'));
      }
      
      const result = await ChatService.createOrGetChat(userId, otherUserId, userId);
      
      res.status(200).json(createResponse(
        'Chat retrieved successfully',
        result,
        { chatId: result.chat._id }
      ));
      
    } catch (error) {
      console.error('[ChatController] createOrGetChat error:', error);
      
      let statusCode = 500;
      if (error.message.includes('not found') || error.message.includes('Access denied')) {
        statusCode = 404;
      } else if (error.message.includes('permission') || error.message.includes('inactive')) {
        statusCode = 403;
      } else if (error.message.includes('required') || error.message.includes('Invalid')) {
        statusCode = 400;
      }
      
      res.status(statusCode).json(createErrorResponse(error.message));
    }
  }
  
  /**
   * Get user's chats with pagination
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getUserChats(req, res) {
    try {
      const userId = req.user.userId;
      const page = parseInt(req.query.page) || 1;
      const limit = Math.min(parseInt(req.query.limit) || 20, 100);
      
      const chats = await ChatService.getUserChats(userId, page, limit);
      
      res.status(200).json(createResponse(
        'Chats retrieved successfully',
        { chats },
        { pagination: { page, limit, total: chats.length } }
      ));
      
    } catch (error) {
      console.error('[ChatController] getUserChats error:', error);
      
      let statusCode = 500;
      if (error.message.includes('required') || error.message.includes('Invalid')) {
        statusCode = 400;
      }
      
      res.status(statusCode).json(createErrorResponse(error.message));
    }
  }
  
  /**
   * Get chat details
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getChatDetails(req, res) {
    try {
      const { chatId } = req.params;
      const userId = req.user.userId;
      
      const chat = await ChatService.getChatDetails(chatId, userId);
      
      res.status(200).json(createResponse(
        'Chat details retrieved successfully',
        { chat },
        { chatId }
      ));
      
    } catch (error) {
      console.error('[ChatController] getChatDetails error:', error);
      
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
   * Update chat settings (archive, pin, mute)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async updateChatSettings(req, res) {
    try {
      const { chatId } = req.params;
      const userId = req.user.userId;
      const { isArchived, isPinned, isMuted } = req.body;
      
      // Validate at least one setting is provided
      if (typeof isArchived !== 'boolean' && typeof isPinned !== 'boolean' && typeof isMuted !== 'boolean') {
        return res.status(400).json(createErrorResponse('At least one setting must be provided'));
      }
      
      const result = await ChatService.updateChatSettings(chatId, userId, {
        isArchived,
        isPinned,
        isMuted
      });
      
      res.status(200).json(createResponse(
        'Chat settings updated successfully',
        result,
        { chatId }
      ));
      
    } catch (error) {
      console.error('[ChatController] updateChatSettings error:', error);
      
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
   * Delete chat (archive for user)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async deleteChat(req, res) {
    try {
      const { chatId } = req.params;
      const userId = req.user.userId;
      
      const result = await ChatService.deleteChat(chatId, userId);
      
      res.status(200).json(createResponse(
        'Chat deleted successfully',
        result,
        { chatId }
      ));
      
    } catch (error) {
      console.error('[ChatController] deleteChat error:', error);
      
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
   * Search chats by participant name
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async searchChats(req, res) {
    try {
      const userId = req.user.userId;
      const { q: query, page = 1, limit = 20 } = req.query;
      
      if (!query || query.trim() === '') {
        return res.status(400).json(createErrorResponse('Search query is required'));
      }
      
      const result = await ChatService.searchChats(userId, query, parseInt(page), parseInt(limit));
      
      res.status(200).json(createResponse(
        'Chats search completed successfully',
        result,
        { query, pagination: result.pagination }
      ));
      
    } catch (error) {
      console.error('[ChatController] searchChats error:', error);
      
      let statusCode = 500;
      if (error.message.includes('required') || error.message.includes('Invalid')) {
        statusCode = 400;
      }
      
      res.status(statusCode).json(createErrorResponse(error.message));
    }
  }
  
  /**
   * Get chat statistics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getChatStats(req, res) {
    try {
      const userId = req.user.userId;
      
      const stats = await ChatService.getChatStats(userId);
      
      res.status(200).json(createResponse(
        'Chat statistics retrieved successfully',
        { stats },
        { userId }
      ));
      
    } catch (error) {
      console.error('[ChatController] getChatStats error:', error);
      
      let statusCode = 500;
      if (error.message.includes('required')) {
        statusCode = 400;
      }
      
      res.status(statusCode).json(createErrorResponse(error.message));
    }
  }
  
  /**
   * Join chat room for real-time updates
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async joinChat(req, res) {
    try {
      const { chatId } = req.params;
      const userId = req.user.userId;
      
      const result = await ChatService.joinChat(chatId, userId);
      
      res.status(200).json(createResponse(
        'Joined chat successfully',
        result,
        { chatId }
      ));
      
    } catch (error) {
      console.error('[ChatController] joinChat error:', error);
      
      let statusCode = 500;
      if (error.message.includes('Access denied')) {
        statusCode = 403;
      } else if (error.message.includes('required')) {
        statusCode = 400;
      }
      
      res.status(statusCode).json(createErrorResponse(error.message));
    }
  }
  
  /**
   * Leave chat room
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async leaveChat(req, res) {
    try {
      const { chatId } = req.params;
      const userId = req.user.userId;
      
      const result = await ChatService.leaveChat(chatId, userId);
      
      res.status(200).json(createResponse(
        'Left chat successfully',
        result,
        { chatId }
      ));
      
    } catch (error) {
      console.error('[ChatController] leaveChat error:', error);
      
      let statusCode = 500;
      if (error.message.includes('required')) {
        statusCode = 400;
      }
      
      res.status(statusCode).json(createErrorResponse(error.message));
    }
  }
}

module.exports = ChatController;
