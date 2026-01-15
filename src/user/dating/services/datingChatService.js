const DatingChat = require('../models/datingChatModel');
const DatingMessage = require('../models/datingMessageModel');
const DatingMatch = require('../models/datingMatchModel');
const User = require('../../auth/model/userAuthModel');

/**
 * Dating Chat Service - Separate from social chats
 */
class DatingChatService {
  
  /**
   * Get or create a chat for a dating match
   * @param {string} matchId - Dating match ID
   * @param {string} currentUserId - Current user ID
   * @returns {Promise<Object>} Chat object
   */
  static async getOrCreateMatchChat(matchId, currentUserId) {
    try {
      if (!matchId || !currentUserId) {
        throw new Error('Match ID and User ID are required');
      }
      
      const chat = await DatingChat.findOrCreateByMatch(matchId, currentUserId);
      
      return chat;
    } catch (error) {
      console.error('[DatingChatService] getOrCreateMatchChat error:', error);
      throw error;
    }
  }
  
  /**
   * Get user's dating chats with pagination
   * @param {string} userId - User ID
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise<Array>} Array of chats
   */
  static async getUserDatingChats(userId, page = 1, limit = 20) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }
      
      if (page < 1 || limit < 1 || limit > 100) {
        throw new Error('Invalid pagination parameters');
      }
      
      const chats = await DatingChat.getUserDatingChats(userId, page, limit);
      
      // Enhance chats with additional data
      const enhancedChats = await Promise.all(
        chats.map(async (chat) => {
          const userSettings = chat.userSettings?.find(setting => 
            setting.userId.toString() === userId.toString()
          );
          
          // Get other participant info
          const otherParticipant = chat.participants.find(p => 
            p._id.toString() !== userId.toString()
          );
          
          // Get unread count
          const unreadCount = await DatingMessage.getUnreadCount(chat._id, userId);
          
          return {
            ...chat,
            unreadCount: unreadCount,
            userSettings: userSettings || {
              isArchived: false,
              isPinned: false,
              isMuted: false,
              unreadCount: 0,
              lastReadAt: null
            },
            otherParticipant
          };
        })
      );
      
      // Sort chats: pinned first, then by last message time
      enhancedChats.sort((a, b) => {
        if (a.userSettings.isPinned && !b.userSettings.isPinned) return -1;
        if (!a.userSettings.isPinned && b.userSettings.isPinned) return 1;
        
        const aTime = a.lastMessageAt || a.updatedAt;
        const bTime = b.lastMessageAt || b.updatedAt;
        return new Date(bTime) - new Date(aTime);
      });
      
      return enhancedChats;
    } catch (error) {
      console.error('[DatingChatService] getUserDatingChats error:', error);
      throw error;
    }
  }
  
  /**
   * Get dating chat details
   * @param {string} chatId - Chat ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Chat details
   */
  static async getChatDetails(chatId, userId) {
    try {
      if (!chatId || !userId) {
        throw new Error('Chat ID and User ID are required');
      }
      
      const chat = await DatingChat.findById(chatId)
        .populate('participants', 'username fullName profilePictureUrl verificationStatus isActive')
        .populate('matchId', 'status createdAt lastInteractionAt')
        .populate('lastMessage')
        .lean();
      
      if (!chat) {
        throw new Error('Dating chat not found');
      }
      
      // Check if user is participant
      const isParticipant = chat.participants.some(p => 
        p._id.toString() === userId.toString()
      );
      
      if (!isParticipant) {
        throw new Error('Access denied to this dating chat');
      }
      
      // Get unread count
      const unreadCount = await DatingMessage.getUnreadCount(chatId, userId);
      
      // Get user settings
      const userSettings = chat.userSettings?.find(setting => 
        setting.userId.toString() === userId.toString()
      );
      
      // Get other participant
      const otherParticipant = chat.participants.find(p => 
        p._id.toString() !== userId.toString()
      );
      
      return {
        ...chat,
        unreadCount,
        userSettings: userSettings || {
          isArchived: false,
          isPinned: false,
          isMuted: false,
          unreadCount: 0,
          lastReadAt: null
        },
        otherParticipant
      };
    } catch (error) {
      console.error('[DatingChatService] getChatDetails error:', error);
      throw error;
    }
  }
  
  /**
   * Update dating chat settings
   * @param {string} chatId - Chat ID
   * @param {string} userId - User ID
   * @param {Object} settings - Settings to update
   * @returns {Promise<Object>} Updated settings
   */
  static async updateChatSettings(chatId, userId, settings) {
    try {
      if (!chatId || !userId) {
        throw new Error('Chat ID and User ID are required');
      }
      
      const { isArchived, isPinned, isMuted } = settings;
      
      const chat = await DatingChat.findById(chatId);
      if (!chat) {
        throw new Error('Dating chat not found');
      }
      
      // Check if user is participant
      const isParticipant = chat.participants.some(p => 
        p.toString() === userId.toString()
      );
      
      if (!isParticipant) {
        throw new Error('Access denied to this dating chat');
      }
      
      // Prepare updates with timestamps
      const updates = {};
      if (typeof isArchived === 'boolean') {
        updates.isArchived = isArchived;
        updates.archivedAt = isArchived ? new Date() : null;
      }
      if (typeof isPinned === 'boolean') {
        updates.isPinned = isPinned;
        updates.pinnedAt = isPinned ? new Date() : null;
      }
      if (typeof isMuted === 'boolean') {
        updates.isMuted = isMuted;
        updates.mutedAt = isMuted ? new Date() : null;
      }
      
      await chat.updateUserSettings(userId, updates);
      
      return {
        chatId: chat._id,
        settings: updates
      };
    } catch (error) {
      console.error('[DatingChatService] updateChatSettings error:', error);
      throw error;
    }
  }
  
  /**
   * Get chat ID from match ID
   * @param {string} matchId - Dating match ID
   * @param {string} currentUserId - Current user ID
   * @returns {Promise<string>} Chat ID
   */
  static async getChatIdFromMatch(matchId, currentUserId) {
    try {
      const chat = await this.getOrCreateMatchChat(matchId, currentUserId);
      return chat._id.toString();
    } catch (error) {
      console.error('[DatingChatService] getChatIdFromMatch error:', error);
      throw error;
    }
  }

  /**
   * Delete dating chat (archive for user)
   * @param {string} chatId - Chat ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Deletion result
   */
  static async deleteChat(chatId, userId) {
    try {
      // Input validation
      if (!chatId || !userId) {
        throw new Error('Chat ID and User ID are required');
      }
      
      const chat = await DatingChat.findById(chatId);
      if (!chat) {
        throw new Error('Dating chat not found');
      }
      
      // Check if user is participant
      const isParticipant = chat.participants.some(p => 
        p.toString() === userId.toString()
      );
      
      if (!isParticipant) {
        throw new Error('Access denied to this dating chat');
      }
      
      // Archive chat for user and set deletion timestamp
      // This hides the chat from user's list, but keeps it in database
      // When other user sends message, chat will reappear but only show new messages
      const deletionTimestamp = new Date();
      await chat.updateUserSettings(userId, {
        isArchived: true,
        archivedAt: deletionTimestamp,
        deletedAt: deletionTimestamp
      });
      
      console.log(`🔵 [DATING_CHAT_SERVICE] Chat ${chatId} archived and marked as deleted for user ${userId} at ${deletionTimestamp}`);
      
      return {
        chatId: chat._id,
        message: 'Dating chat deleted successfully',
        deletedAt: deletionTimestamp
      };
      
    } catch (error) {
      console.error('[DatingChatService] deleteChat error:', error);
      throw error;
    }
  }

  /**
   * Search dating chats by participant name
   * @param {string} userId - User ID
   * @param {string} query - Search query
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise<Object>} Filtered chats
   */
  static async searchChats(userId, query, page = 1, limit = 20) {
    try {
      if (!userId || !query || query.trim() === '') {
        throw new Error('User ID and search query are required');
      }
      
      if (page < 1 || limit < 1 || limit > 100) {
        throw new Error('Invalid pagination parameters');
      }
      
      const searchTerm = query.trim().toLowerCase();
      const skip = (page - 1) * limit;
      
      // Find chats where the other participant matches the search
      const chats = await DatingChat.find({
        participants: userId,
        isActive: true
      })
      .populate('participants', 'username fullName profilePictureUrl isActive')
      .populate('matchId', 'status createdAt lastInteractionAt')
      .populate('lastMessage')
      .lean();
      
      // Filter chats where other participant matches search AND not archived
      const filteredChats = chats.filter(chat => {
        // Filter out archived chats for this user
        const userSetting = chat.userSettings?.find(setting => {
          const settingUserId = setting.userId?.toString() || setting.userId;
          return settingUserId === userId.toString();
        });
        
        if (userSetting?.isArchived) {
          return false;
        }
        
        // Find other participant
        const otherParticipant = chat.participants?.find(p => {
          const pId = p._id?.toString() || p?.toString();
          return pId && pId !== userId.toString();
        });
        
        if (!otherParticipant) {
          return false;
        }
        
        // Check if other participant matches search
        const otherUsername = (otherParticipant.username || '').toLowerCase();
        const otherFullName = (otherParticipant.fullName || '').toLowerCase();
        
        const matchesUsername = otherUsername.includes(searchTerm);
        const matchesFullName = otherFullName.includes(searchTerm);
        
        return matchesUsername || matchesFullName;
      });
      
      // Apply pagination
      const paginatedChats = filteredChats.slice(skip, skip + limit);
      
      // Enhance chats with additional data
      const enhancedChats = await Promise.all(
        paginatedChats.map(async (chat) => {
          const userSettings = chat.userSettings?.find(setting => {
            const settingUserId = setting.userId?.toString() || setting.userId;
            return settingUserId === userId.toString();
          });
          
          // Get other participant info
          const otherParticipant = chat.participants?.find(p => {
            const pId = p._id?.toString() || p?.toString();
            return pId && pId !== userId.toString();
          });
          
          // Get unread count
          const unreadCount = await DatingMessage.getUnreadCount(chat._id, userId);
          
          return {
            ...chat,
            unreadCount: unreadCount,
            userSettings: userSettings || {
              isArchived: false,
              isPinned: false,
              isMuted: false,
              unreadCount: 0,
              lastReadAt: null
            },
            otherParticipant
          };
        })
      );
      
      // Sort chats
      enhancedChats.sort((a, b) => {
        if (a.userSettings.isPinned && !b.userSettings.isPinned) return -1;
        if (!a.userSettings.isPinned && b.userSettings.isPinned) return 1;
        
        const aTime = a.lastMessageAt || a.updatedAt;
        const bTime = b.lastMessageAt || b.updatedAt;
        return new Date(bTime) - new Date(aTime);
      });
      
      const total = filteredChats.length;
      const hasMore = (skip + limit) < total;
      
      return {
        chats: enhancedChats,
        total,
        hasMore
      };
      
    } catch (error) {
      console.error('[DatingChatService] searchChats error:', error);
      throw error;
    }
  }

  /**
   * Get dating chat statistics for user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Chat statistics
   */
  static async getChatStats(userId) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }
      
      const [totalChats, archivedChats, pinnedChats, totalUnreadMessages] = await Promise.all([
        DatingChat.countDocuments({
          participants: userId,
          isActive: true
        }),
        DatingChat.countDocuments({
          participants: userId,
          'userSettings.userId': userId,
          'userSettings.isArchived': true
        }),
        DatingChat.countDocuments({
          participants: userId,
          'userSettings.userId': userId,
          'userSettings.isPinned': true
        }),
        DatingMessage.countDocuments({
          chatId: { $in: await DatingChat.find({ participants: userId }).distinct('_id') },
          senderId: { $ne: userId },
          'readBy.userId': { $ne: userId },
          isDeleted: false,
          'deletedBy.userId': { $ne: userId }
        })
      ]);
      
      return {
        totalChats,
        archivedChats,
        pinnedChats,
        totalUnreadMessages
      };
      
    } catch (error) {
      console.error('[DatingChatService] getChatStats error:', error);
      throw error;
    }
  }

  /**
   * Join dating chat room for real-time updates
   * @param {string} chatId - Chat ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Join result
   */
  static async joinChat(chatId, userId) {
    try {
      // Validate chat access
      const chat = await DatingChat.findById(chatId);
      if (!chat || !chat.participants.includes(userId)) {
        throw new Error('Access denied to this dating chat');
      }
      
      // Mark messages as read
      await DatingMessage.markChatAsRead(chatId, userId);
      
      // Reset unread count
      chat.resetUnreadCount(userId);
      await chat.save();
      
      return {
        chatId,
        userId,
        joined: true,
        unreadCount: 0
      };
      
    } catch (error) {
      console.error('[DatingChatService] joinChat error:', error);
      throw error;
    }
  }

  /**
   * Leave dating chat room
   * @param {string} chatId - Chat ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Leave result
   */
  static async leaveChat(chatId, userId) {
    try {
      return {
        chatId,
        userId,
        left: true
      };
      
    } catch (error) {
      console.error('[DatingChatService] leaveChat error:', error);
      throw error;
    }
  }
}

module.exports = DatingChatService;
