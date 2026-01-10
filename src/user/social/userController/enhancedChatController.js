const ChatService = require('../services/chatService');
const MessageService = require('../services/messageService');
const Chat = require('../userModel/chatModel');
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
    console.log('🔵 [BACKEND_CHAT_CTRL] createOrGetChat called:', { 
      userId: req.user?.userId,
      otherUserId: req.body?.otherUserId,
      timestamp: new Date().toISOString()
    });
    try {
      const { otherUserId } = req.body;
      const userId = req.user.userId;
      
      // Input validation
      if (!otherUserId) {
        console.warn('⚠️ [BACKEND_CHAT_CTRL] Other user ID missing');
        return res.status(400).json(createErrorResponse('Other user ID is required'));
      }
      
      if (otherUserId === userId.toString()) {
        console.warn('⚠️ [BACKEND_CHAT_CTRL] Cannot create chat with self');
        return res.status(400).json(createErrorResponse('Cannot create chat with yourself'));
      }
      
      console.log('🔵 [BACKEND_CHAT_CTRL] Calling ChatService.createOrGetChat...', { userId, otherUserId });
      const result = await ChatService.createOrGetChat(userId, otherUserId, userId);
      
      // Check if result indicates message request is needed
      if (result && result.canChat === false && result.needsMessageRequest) {
        console.log('🔵 [BACKEND_CHAT_CTRL] Message request needed:', {
          messageRequestExists: result.messageRequestExists,
          reason: result.reason
        });
        
        return res.status(400).json(createErrorResponse(
          result.message || 'Cannot start chat. Send a message request first.',
          400,
          {
            needsMessageRequest: true,
            messageRequestExists: result.messageRequestExists || false,
            messageRequestId: result.messageRequestId || null,
            reason: result.reason
          }
        ));
      }
      
      console.log('✅ [BACKEND_CHAT_CTRL] ChatService.createOrGetChat success:', { chatId: result.chat._id, canChat: result.canChat });
      
      res.status(200).json(createResponse(
        'Chat retrieved successfully',
        result,
        { chatId: result.chat._id }
      ));
      console.log('✅ [BACKEND_CHAT_CTRL] Response sent to client');
      
    } catch (error) {
      console.error('❌ [BACKEND_CHAT_CTRL] createOrGetChat error:', { 
        error: error.message, 
        stack: error.stack,
        userId: req.user?.userId,
        otherUserId: req.body?.otherUserId
      });
      
      // Normalize error message for comparison (case-insensitive)
      const errorMsg = (error.message || '').toLowerCase();
      
      let statusCode = 500;
      if (errorMsg.includes('not found') || errorMsg.includes('access denied')) {
        statusCode = 404;
      } else if (errorMsg.includes('permission') || errorMsg.includes('inactive')) {
        statusCode = 403;
      } else if (
        errorMsg.includes('required') || 
        errorMsg.includes('invalid') ||
        errorMsg.includes('message request') ||
        errorMsg.includes('cannot start chat') ||
        errorMsg.includes('send a message request')
      ) {
        statusCode = 400; // Bad Request for business logic errors
      }
      
      console.log('🔵 [BACKEND_CHAT_CTRL] Returning error response:', {
        statusCode,
        errorMessage: error.message,
        errorMsg
      });
      
      // Pass statusCode to createErrorResponse to ensure response object has correct status
      res.status(statusCode).json(createErrorResponse(error.message, statusCode));
    }
  }
  
  /**
   * Get user's chats with pagination and optional search
   * Unified endpoint for both get all chats and search
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getUserChats(req, res) {
    console.log('🔵 [BACKEND_CHAT_CTRL] getUserChats called:', { 
      userId: req.user?.userId,
      page: req.query?.page,
      limit: req.query?.limit,
      search: req.query?.q || req.query?.search,
      hasSearch: !!(req.query?.q || req.query?.search),
      timestamp: new Date().toISOString()
    });
    try {
      const userId = req.user.userId;
      const page = parseInt(req.query.page) || 1;
      const limit = Math.min(parseInt(req.query.limit) || 20, 100);
      const searchQuery = (req.query.q || req.query.search || '').trim();
      
      let result;
      if (searchQuery) {
        console.log('🔵 [BACKEND_CHAT_CTRL] Searching chats...', { userId, searchQuery, page, limit });
        const searchResult = await ChatService.searchChats(userId, searchQuery, page, limit);
        console.log('✅ [BACKEND_CHAT_CTRL] ChatService.searchChats success:', { 
          chatsCount: searchResult.chats?.length || 0,
          total: searchResult.total,
          hasMore: searchResult.hasMore
        });
        
        // Transform to match expected format
        result = {
          chats: searchResult.chats || [],
          pagination: {
            page,
            limit,
            total: searchResult.total || 0,
            hasMore: searchResult.hasMore || false
          }
        };
      } else {
        const includeArchived = req.query.includeArchived === 'true';
        console.log('🔵 [BACKEND_CHAT_CTRL] Getting all chats...', { userId, page, limit, includeArchived });
        const chats = await ChatService.getUserChats(userId, page, limit, includeArchived);
        console.log('✅ [BACKEND_CHAT_CTRL] ChatService.getUserChats success:', { 
          chatsCount: chats.length || 0
        });
        
        // Get total count for pagination (only on first page for performance)
        let totalCount = chats.length;
        let hasMore = chats.length === limit;
        
        if (page === 1) {
          totalCount = await Chat.countDocuments({ 
            participants: userId, 
            isActive: true 
          });
          hasMore = totalCount > limit;
        } else {
          // For subsequent pages, hasMore is true if we got a full page
          hasMore = chats.length === limit;
        }
        
        // Transform to match search result format
        result = {
          chats: chats,
          pagination: {
            page,
            limit,
            total: totalCount,
            hasMore: hasMore
          }
        };
      }
      
      res.status(200).json(createResponse(
        searchQuery ? 'Chats searched successfully' : 'Chats retrieved successfully',
        { chats: result.chats || result },
        { pagination: result.pagination || { page, limit, total: result.chats?.length || result.length || 0, hasMore: false } }
      ));
      console.log('✅ [BACKEND_CHAT_CTRL] Response sent to client');
      
    } catch (error) {
      console.error('❌ [BACKEND_CHAT_CTRL] getUserChats error:', { 
        error: error.message, 
        stack: error.stack,
        userId: req.user?.userId
      });
      
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
