const DatingChatService = require('../services/datingChatService');
const DatingChat = require('../models/datingChatModel');
const { createResponse, createErrorResponse } = require('../../../utils/apiResponse');

/**
 * Dating Chat Controller — response shape and status codes aligned with social `enhancedChatController`.
 */
class DatingChatController {
  /**
   * Create or get chat for a dating match
   */
  static async createOrGetChat(req, res) {
    try {
      const { matchId } = req.body;
      const userId = req.user.userId;

      if (!matchId) {
        return res.status(400).json(createErrorResponse('Match ID is required'));
      }

      const chat = await DatingChatService.getOrCreateMatchChat(matchId, userId);

      const DatingMessage = require('../models/datingMessageModel');
      const unreadCount = await DatingMessage.getUnreadCount(chat._id, userId);

      res.status(200).json(
        createResponse(
          'Dating chat retrieved successfully',
          { chat, unreadCount, canChat: true },
          { chatId: chat._id }
        )
      );
    } catch (error) {
      console.error('[DatingChatController] createOrGetChat error:', error.message);

      const errorMsg = (error.message || '').toLowerCase();
      let statusCode = 500;
      if (errorMsg.includes('not found') || errorMsg.includes('access denied')) {
        statusCode = 404;
      } else if (errorMsg.includes('permission') || errorMsg.includes('inactive')) {
        statusCode = 403;
      } else if (errorMsg.includes('required') || errorMsg.includes('invalid')) {
        statusCode = 400;
      }

      res.status(statusCode).json(createErrorResponse(error.message, statusCode));
    }
  }

  /**
   * Get user's dating chats with pagination and optional search (same flow as social list + search).
   */
  static async getUserChats(req, res) {
    try {
      const userId = req.user.userId;
      const page = parseInt(req.query.page, 10) || 1;
      const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
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
        const includeArchived = req.query.includeArchived === 'true';
        const chats = await DatingChatService.getUserDatingChats(userId, page, limit, includeArchived);

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
          chats,
          pagination: {
            page,
            limit,
            total: totalCount,
            hasMore
          }
        };
      }

      res.status(200).json(
        createResponse(
          searchQuery ? 'Dating chats searched successfully' : 'Dating chats retrieved successfully',
          { chats: result.chats || result },
          {
            pagination:
              result.pagination || {
                page,
                limit,
                total: result.chats?.length || result.length || 0,
                hasMore: false
              }
          }
        )
      );
    } catch (error) {
      console.error('[DatingChatController] getUserChats error:', error.message);

      let statusCode = 500;
      if (error.message.includes('required') || error.message.includes('Invalid')) {
        statusCode = 400;
      }

      res.status(statusCode).json(createErrorResponse(error.message));
    }
  }

  static async getChatDetails(req, res) {
    try {
      const { chatId } = req.params;
      const userId = req.user.userId;

      const chat = await DatingChatService.getChatDetails(chatId, userId);

      res.status(200).json(
        createResponse('Dating chat details retrieved successfully', { chat }, { chatId })
      );
    } catch (error) {
      console.error('[DatingChatController] getChatDetails error:', error.message);

      let statusCode = 500;
      if (error.message.includes('not found') || error.message.includes('Access denied')) {
        statusCode = 404;
      } else if (error.message.includes('required')) {
        statusCode = 400;
      }

      res.status(statusCode).json(createErrorResponse(error.message));
    }
  }

  static async updateChatSettings(req, res) {
    try {
      const { chatId } = req.params;
      const userId = req.user.userId;
      const { isArchived, isPinned, isMuted } = req.body;

      console.log('[DATING_CHAT_ARCHIVE_API] Request received', {
        chatId: chatId != null ? String(chatId) : chatId,
        userId: userId != null ? String(userId) : userId,
        isArchived,
        isPinned,
        isMuted,
        timestamp: new Date().toISOString(),
      });

      if (typeof isArchived !== 'boolean' && typeof isPinned !== 'boolean' && typeof isMuted !== 'boolean') {
        console.warn('[DATING_CHAT_ARCHIVE_API] Rejected: no valid settings provided', {
          chatId: chatId != null ? String(chatId) : chatId,
          userId: userId != null ? String(userId) : userId,
          bodyKeys: req.body ? Object.keys(req.body) : [],
        });
        return res.status(400).json(createErrorResponse('At least one setting must be provided'));
      }

      const result = await DatingChatService.updateChatSettings(chatId, userId, {
        isArchived,
        isPinned,
        isMuted
      });

      console.log('[DATING_CHAT_ARCHIVE_API] Update success', {
        chatId: chatId != null ? String(chatId) : chatId,
        userId: userId != null ? String(userId) : userId,
        requestedIsArchived: isArchived,
        appliedSettings: result?.settings || null,
      });

      res.status(200).json(
        createResponse('Dating chat settings updated successfully', result, { chatId })
      );
    } catch (error) {
      console.error('[DatingChatController] updateChatSettings error:', error.message);
      console.error('[DATING_CHAT_ARCHIVE_API] Update failed', {
        chatId: req?.params?.chatId != null ? String(req.params.chatId) : req?.params?.chatId,
        userId: req?.user?.userId != null ? String(req.user.userId) : req?.user?.userId,
        isArchived: req?.body?.isArchived,
        isPinned: req?.body?.isPinned,
        isMuted: req?.body?.isMuted,
        error: error?.message || 'Unknown error',
      });

      let statusCode = 500;
      if (error.message.includes('not found') || error.message.includes('Access denied')) {
        statusCode = 404;
      } else if (error.message.includes('required')) {
        statusCode = 400;
      }

      res.status(statusCode).json(createErrorResponse(error.message));
    }
  }

  static async deleteChat(req, res) {
    try {
      const { chatId } = req.params;
      const userId = req.user.userId;

      const result = await DatingChatService.deleteChat(chatId, userId);

      res.status(200).json(
        createResponse('Chat deleted successfully', result, { chatId })
      );
    } catch (error) {
      console.error('[DatingChatController] deleteChat error:', error.message);

      let statusCode = 500;
      if (error.message.includes('not found') || error.message.includes('Access denied')) {
        statusCode = 404;
      } else if (error.message.includes('required')) {
        statusCode = 400;
      }

      res.status(statusCode).json(createErrorResponse(error.message));
    }
  }

  static async searchChats(req, res) {
    try {
      const userId = req.user.userId;
      const { q: query, page = 1, limit = 20 } = req.query;

      if (!query || query.trim() === '') {
        return res.status(400).json(createErrorResponse('Search query is required'));
      }

      const result = await DatingChatService.searchChats(userId, query, parseInt(page, 10), parseInt(limit, 10));

      res.status(200).json(
        createResponse('Dating chats search completed successfully', result, {
          query,
          pagination: result.pagination
        })
      );
    } catch (error) {
      console.error('[DatingChatController] searchChats error:', error.message);

      let statusCode = 500;
      if (error.message.includes('required') || error.message.includes('Invalid')) {
        statusCode = 400;
      }

      res.status(statusCode).json(createErrorResponse(error.message));
    }
  }

  static async getChatStats(req, res) {
    try {
      const userId = req.user.userId;

      const stats = await DatingChatService.getChatStats(userId);

      res.status(200).json(
        createResponse('Dating chat statistics retrieved successfully', { stats }, { userId })
      );
    } catch (error) {
      console.error('[DatingChatController] getChatStats error:', error.message);

      let statusCode = 500;
      if (error.message.includes('required')) {
        statusCode = 400;
      }

      res.status(statusCode).json(createErrorResponse(error.message));
    }
  }

  static async joinChat(req, res) {
    try {
      const { chatId } = req.params;
      const userId = req.user.userId;

      const result = await DatingChatService.joinChat(chatId, userId);

      res.status(200).json(
        createResponse('Joined dating chat successfully', result, { chatId })
      );
    } catch (error) {
      console.error('[DatingChatController] joinChat error:', error.message);

      let statusCode = 500;
      if (error.message.includes('Access denied')) {
        statusCode = 403;
      } else if (error.message.includes('required')) {
        statusCode = 400;
      }

      res.status(statusCode).json(createErrorResponse(error.message));
    }
  }

  static async leaveChat(req, res) {
    try {
      const { chatId } = req.params;
      const userId = req.user.userId;

      const result = await DatingChatService.leaveChat(chatId, userId);

      res.status(200).json(
        createResponse('Left dating chat successfully', result, { chatId })
      );
    } catch (error) {
      console.error('[DatingChatController] leaveChat error:', error.message);

      let statusCode = 500;
      if (error.message.includes('required')) {
        statusCode = 400;
      }

      res.status(statusCode).json(createErrorResponse(error.message));
    }
  }
}

module.exports = DatingChatController;
