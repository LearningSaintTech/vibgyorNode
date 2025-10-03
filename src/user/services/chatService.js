const Chat = require('../userModel/chatModel');
const Message = require('../userModel/messageModel');
const User = require('../userModel/userAuthModel');
const MessageRequest = require('../userModel/messageRequestModel');
const enhancedRealtimeService = require('../../services/enhancedRealtimeService');

/**
 * Enhanced Chat Service with comprehensive error handling and edge cases
 */
class ChatService {
  
  /**
   * Create or get existing chat between two users
   * @param {string} userId1 - First user ID
   * @param {string} userId2 - Second user ID
   * @param {string} createdBy - User who initiated the chat
   * @returns {Promise<Object>} Chat object
   */
  static async createOrGetChat(userId1, userId2, createdBy = null) {
    try {
      // Input validation
      if (!userId1 || !userId2) {
        throw new Error('Both user IDs are required');
      }
      
      if (userId1 === userId2) {
        throw new Error('Cannot create chat with yourself');
      }
      
      // Validate users exist and are active
      const [user1, user2] = await Promise.all([
        User.findById(userId1).select('isActive'),
        User.findById(userId2).select('isActive')
      ]);
      
      if (!user1 || !user2) {
        throw new Error('One or both users not found');
      }
      
      if (!user1.isActive || !user2.isActive) {
        throw new Error('Cannot chat with inactive users');
      }
      
      // Check if users can chat
      const canChatResult = await Chat.canUsersChat(userId1, userId2);
      
      if (!canChatResult.canChat) {
        if (canChatResult.reason === 'no_permission') {
          // Check for existing message request
          const existingRequest = await MessageRequest.findOne({
            $or: [
              { fromUserId: userId1, toUserId: userId2 },
              { fromUserId: userId2, toUserId: userId1 }
            ],
            status: 'pending'
          });
          
          if (existingRequest) {
            throw new Error('Message request already sent and pending');
          }
          
          throw new Error('Cannot start chat. Send a message request first.');
        }
      }
      
      // Create or get existing chat
      const chat = await Chat.findOrCreateChat(userId1, userId2, createdBy || userId1);
      
      // Get unread count for the requesting user
      const unreadCount = await Message.getUnreadCount(chat._id, userId1);
      
      return {
        chat,
        unreadCount,
        canChat: true,
        reason: canChatResult.reason
      };
      
    } catch (error) {
      console.error('[ChatService] createOrGetChat error:', error);
      throw error;
    }
  }
  
  /**
   * Get user's chats with pagination and sorting
   * @param {string} userId - User ID
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise<Array>} Array of chats
   */
  static async getUserChats(userId, page = 1, limit = 20) {
    try {
      // Input validation
      if (!userId) {
        throw new Error('User ID is required');
      }
      
      if (page < 1 || limit < 1 || limit > 100) {
        throw new Error('Invalid pagination parameters');
      }
      
      const chats = await Chat.getUserChats(userId, page, limit);
      
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
          
          return {
            ...chat,
            unreadCount: userSettings?.unreadCount || 0,
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
      console.error('[ChatService] getUserChats error:', error);
      throw error;
    }
  }
  
  /**
   * Get chat details with validation
   * @param {string} chatId - Chat ID
   * @param {string} userId - User ID requesting the details
   * @returns {Promise<Object>} Chat details
   */
  static async getChatDetails(chatId, userId) {
    try {
      // Input validation
      if (!chatId || !userId) {
        throw new Error('Chat ID and User ID are required');
      }
      
      const chat = await Chat.findById(chatId)
        .populate('participants', 'username fullName profilePictureUrl verificationStatus isActive')
        .populate('lastMessage')
        .lean();
      
      if (!chat) {
        throw new Error('Chat not found');
      }
      
      // Check if user is participant
      const isParticipant = chat.participants.some(p => 
        p._id.toString() === userId.toString()
      );
      
      if (!isParticipant) {
        throw new Error('Access denied to this chat');
      }
      
      // Get unread count
      const unreadCount = await Message.getUnreadCount(chatId, userId);
      
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
      console.error('[ChatService] getChatDetails error:', error);
      throw error;
    }
  }
  
  /**
   * Update chat settings (archive, pin, mute)
   * @param {string} chatId - Chat ID
   * @param {string} userId - User ID
   * @param {Object} settings - Settings to update
   * @returns {Promise<Object>} Updated settings
   */
  static async updateChatSettings(chatId, userId, settings) {
    try {
      // Input validation
      if (!chatId || !userId) {
        throw new Error('Chat ID and User ID are required');
      }
      
      const { isArchived, isPinned, isMuted } = settings;
      
      const chat = await Chat.findById(chatId);
      if (!chat) {
        throw new Error('Chat not found');
      }
      
      // Check if user is participant
      const isParticipant = chat.participants.some(p => 
        p.toString() === userId.toString()
      );
      
      if (!isParticipant) {
        throw new Error('Access denied to this chat');
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
      console.error('[ChatService] updateChatSettings error:', error);
      throw error;
    }
  }
  
  /**
   * Delete chat (archive for user)
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
      
      const chat = await Chat.findById(chatId);
      if (!chat) {
        throw new Error('Chat not found');
      }
      
      // Check if user is participant
      const isParticipant = chat.participants.some(p => 
        p.toString() === userId.toString()
      );
      
      if (!isParticipant) {
        throw new Error('Access denied to this chat');
      }
      
      // Mark chat as archived for this user
      await chat.updateUserSettings(userId, {
        isArchived: true,
        archivedAt: new Date()
      });
      
      // Check if both users have archived the chat
      const allArchived = chat.userSettings.every(setting => setting.isArchived);
      if (allArchived) {
        chat.isActive = false;
        await chat.save();
      }
      
      return {
        chatId: chat._id,
        message: 'Chat deleted successfully'
      };
      
    } catch (error) {
      console.error('[ChatService] deleteChat error:', error);
      throw error;
    }
  }
  
  /**
   * Search chats by participant name
   * @param {string} userId - User ID
   * @param {string} query - Search query
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise<Array>} Filtered chats
   */
  static async searchChats(userId, query, page = 1, limit = 20) {
    try {
      // Input validation
      if (!userId || !query || query.trim() === '') {
        throw new Error('User ID and search query are required');
      }
      
      if (page < 1 || limit < 1 || limit > 100) {
        throw new Error('Invalid pagination parameters');
      }
      
      const searchTerm = query.trim();
      const skip = (page - 1) * limit;
      
      // Find chats where the other participant matches the search
      const chats = await Chat.find({
        participants: userId,
        isActive: true
      })
      .populate('participants', 'username fullName profilePictureUrl')
      .populate('lastMessage')
      .lean();
      
      // Filter chats where other participant matches search
      const filteredChats = chats.filter(chat => {
        const otherParticipant = chat.participants.find(p => 
          p._id.toString() !== userId.toString()
        );
        
        if (!otherParticipant) return false;
        
        return (
          otherParticipant.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
          otherParticipant.fullName.toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
      
      // Get unread counts for filtered chats
      const chatsWithDetails = await Promise.all(
        filteredChats.slice(skip, skip + limit).map(async (chat) => {
          const unreadCount = await Message.getUnreadCount(chat._id, userId);
          return {
            ...chat,
            unreadCount
          };
        })
      );
      
      return {
        chats: chatsWithDetails,
        pagination: {
          page,
          limit,
          total: filteredChats.length,
          hasMore: skip + limit < filteredChats.length
        }
      };
      
    } catch (error) {
      console.error('[ChatService] searchChats error:', error);
      throw error;
    }
  }
  
  /**
   * Get chat statistics for user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Chat statistics
   */
  static async getChatStats(userId) {
    try {
      // Input validation
      if (!userId) {
        throw new Error('User ID is required');
      }
      
      const [totalChats, archivedChats, pinnedChats, totalUnreadMessages] = await Promise.all([
        Chat.countDocuments({
          participants: userId,
          isActive: true
        }),
        Chat.countDocuments({
          participants: userId,
          'userSettings.userId': userId,
          'userSettings.isArchived': true
        }),
        Chat.countDocuments({
          participants: userId,
          'userSettings.userId': userId,
          'userSettings.isPinned': true
        }),
        Message.countDocuments({
          chatId: { $in: await Chat.find({ participants: userId }).distinct('_id') },
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
      console.error('[ChatService] getChatStats error:', error);
      throw error;
    }
  }
  
  /**
   * Join chat room for real-time updates
   * @param {string} chatId - Chat ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Join result
   */
  static async joinChat(chatId, userId) {
    try {
      // Validate chat access
      const chat = await Chat.findById(chatId);
      if (!chat || !chat.participants.includes(userId)) {
        throw new Error('Access denied to this chat');
      }
      
      // Mark messages as read
      await Message.markChatAsRead(chatId, userId);
      
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
      console.error('[ChatService] joinChat error:', error);
      throw error;
    }
  }
  
  /**
   * Leave chat room
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
      console.error('[ChatService] leaveChat error:', error);
      throw error;
    }
  }
}

module.exports = ChatService;
