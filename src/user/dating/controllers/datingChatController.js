const DatingChatService = require('../services/datingChatService');
const DatingChat = require('../models/datingChatModel');
const { createResponse, createErrorResponse } = require('../../../utils/apiResponse');

/**
 * Dating Chat Controller with comprehensive error handling
 */
class DatingChatController {
  
  /**
   * Create or get chat for a dating match
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async createOrGetChat(req, res) {
    try {
      const { matchId } = req.body;
      const userId = req.user.userId;
      
      if (!matchId) {
        return res.status(400).json(createErrorResponse('Match ID is required'));
      }
      
      const chat = await DatingChatService.getOrCreateMatchChat(matchId, userId);
      
      // Get unread count
      const DatingMessage = require('../models/datingMessageModel');
      const unreadCount = await DatingMessage.getUnreadCount(chat._id, userId);
      
      res.status(200).json(createResponse(
        'Dating chat retrieved successfully',
        { chat, unreadCount, canChat: true },
        { chatId: chat._id }
      ));
      
    } catch (error) {
      const errorMsg = error?.message || String(error);
      console.error('[DatingChatController] createOrGetChat error:', errorMsg);
      
      let statusCode = 500;
      if (errorMsg.includes('not found') || errorMsg.includes('Access denied')) {
        statusCode = 404;
      } else if (errorMsg.includes('required') || errorMsg.includes('Invalid')) {
        statusCode = 400;
      } else if (errorMsg.includes('permission') || errorMsg.includes('inactive')) {
        statusCode = 403;
      }
      
      res.status(statusCode).json(createErrorResponse(errorMsg));
    }
  }
  
  /**
   * Get user's dating chats with pagination and optional search
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getUserChats(req, res) {
    try {
      const userId = req.user.userId;
      const page = parseInt(req.query.page) || 1;
      const limit = Math.min(parseInt(req.query.limit) || 20, 100);
      const searchQuery = (req.query.q || req.query.search || '').trim();
      
      let result;
      if (searchQuery) {
        const searchResult = await DatingChatService.searchChats(userId, searchQuery, page, limit);
        
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
        const chats = await DatingChatService.getUserDatingChats(userId, page, limit);
        
        // Get total count for pagination (only on first page for performance)
        let totalCount = chats.length;
        let hasMore = chats.length === limit;
        
        if (page === 1) {
          totalCount = await DatingChat.countDocuments({ 
            participants: userId, 
            isActive: true 
          });
          hasMore = totalCount > limit;
        } else {
          hasMore = chats.length === limit;
        }
        
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
        searchQuery ? 'Dating chats searched successfully' : 'Dating chats retrieved successfully',
        { chats: result.chats || result },
        { pagination: result.pagination || { page, limit, total: result.chats?.length || result.length || 0, hasMore: false } }
      ));
      
    } catch (error) {
      const errorMsg = error?.message || String(error);
      console.error('[DatingChatController] getUserChats error:', errorMsg);
      
      let statusCode = 500;
      if (errorMsg.includes('required') || errorMsg.includes('Invalid')) {
        statusCode = 400;
      }
      
      res.status(statusCode).json(createErrorResponse(errorMsg));
    }
  }
  
  /**
   * Get dating chat details
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getChatDetails(req, res) {
    try {
      const { chatId } = req.params;
      const userId = req.user.userId;
      
      const chat = await DatingChatService.getChatDetails(chatId, userId);
      
      res.status(200).json(createResponse(
        'Dating chat details retrieved successfully',
        { chat },
        { chatId }
      ));
      
    } catch (error) {
      const errorMsg = error?.message || String(error);
      console.error('[DatingChatController] getChatDetails error:', errorMsg);
      
      let statusCode = 500;
      if (errorMsg.includes('not found') || errorMsg.includes('Access denied')) {
        statusCode = 404;
      } else if (errorMsg.includes('required')) {
        statusCode = 400;
      }
      
      res.status(statusCode).json(createErrorResponse(errorMsg));
    }
  }
  
  /**
   * Update dating chat settings (archive, pin, mute)
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
      
      const result = await DatingChatService.updateChatSettings(chatId, userId, {
        isArchived,
        isPinned,
        isMuted
      });
      
      res.status(200).json(createResponse(
        'Dating chat settings updated successfully',
        result,
        { chatId }
      ));
      
    } catch (error) {
      const errorMsg = error?.message || String(error);
      console.error('[DatingChatController] updateChatSettings error:', errorMsg);
      
      let statusCode = 500;
      if (errorMsg.includes('not found') || errorMsg.includes('Access denied')) {
        statusCode = 404;
      } else if (errorMsg.includes('required')) {
        statusCode = 400;
      }
      
      res.status(statusCode).json(createErrorResponse(errorMsg));
    }
  }
  
  /**
   * Delete dating chat (archive for user)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async deleteChat(req, res) {
    try {
      const { chatId } = req.params;
      const userId = req.user.userId;
      
      const result = await DatingChatService.deleteChat(chatId, userId);
      
      res.status(200).json(createResponse(
        'Dating chat deleted successfully',
        result,
        { chatId }
      ));
      
    } catch (error) {
      const errorMsg = error?.message || String(error);
      console.error('[DatingChatController] deleteChat error:', errorMsg);
      
      let statusCode = 500;
      if (errorMsg.includes('not found') || errorMsg.includes('Access denied')) {
        statusCode = 404;
      } else if (errorMsg.includes('required')) {
        statusCode = 400;
      }
      
      res.status(statusCode).json(createErrorResponse(errorMsg));
    }
  }
  
  /**
   * Search dating chats by participant name
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
      
      const result = await DatingChatService.searchChats(userId, query, parseInt(page), parseInt(limit));
      
      res.status(200).json(createResponse(
        'Dating chats search completed successfully',
        result,
        { query, pagination: result.pagination }
      ));
      
    } catch (error) {
      const errorMsg = error?.message || String(error);
      console.error('[DatingChatController] searchChats error:', errorMsg);
      
      let statusCode = 500;
      if (errorMsg.includes('required') || errorMsg.includes('Invalid')) {
        statusCode = 400;
      }
      
      res.status(statusCode).json(createErrorResponse(errorMsg));
    }
  }
  
  /**
   * Get dating chat statistics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getChatStats(req, res) {
    try {
      const userId = req.user.userId;
      
      const stats = await DatingChatService.getChatStats(userId);
      
      res.status(200).json(createResponse(
        'Dating chat statistics retrieved successfully',
        { stats },
        { userId }
      ));
      
    } catch (error) {
      const errorMsg = error?.message || String(error);
      console.error('[DatingChatController] getChatStats error:', errorMsg);
      
      let statusCode = 500;
      if (errorMsg.includes('required')) {
        statusCode = 400;
      }
      
      res.status(statusCode).json(createErrorResponse(errorMsg));
    }
  }
  
  /**
   * Join dating chat room for real-time updates
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async joinChat(req, res) {
    try {
      const { chatId } = req.params;
      const userId = req.user.userId;
      
      const result = await DatingChatService.joinChat(chatId, userId);
      
      res.status(200).json(createResponse(
        'Joined dating chat successfully',
        result,
        { chatId }
      ));
      
    } catch (error) {
      const errorMsg = error?.message || String(error);
      console.error('[DatingChatController] joinChat error:', errorMsg);
      
      let statusCode = 500;
      if (errorMsg.includes('Access denied')) {
        statusCode = 403;
      } else if (errorMsg.includes('required')) {
        statusCode = 400;
      }
      
      res.status(statusCode).json(createErrorResponse(errorMsg));
    }
  }
  
  /**
   * Leave dating chat room
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async leaveChat(req, res) {
    try {
      const { chatId } = req.params;
      const userId = req.user.userId;
      
      const result = await DatingChatService.leaveChat(chatId, userId);
      
      res.status(200).json(createResponse(
        'Left dating chat successfully',
        result,
        { chatId }
      ));
      
    } catch (error) {
      const errorMsg = error?.message || String(error);
      console.error('[DatingChatController] leaveChat error:', errorMsg);
      
      let statusCode = 500;
      if (errorMsg.includes('required')) {
        statusCode = 400;
      }
      
      res.status(statusCode).json(createErrorResponse(errorMsg));
    }
  }
}

module.exports = DatingChatController;

