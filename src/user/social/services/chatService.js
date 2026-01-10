const Chat = require('../userModel/chatModel');
const Message = require('../userModel/messageModel');
const User = require('../../auth/model/userAuthModel');
const MessageRequest = require('../userModel/messageRequestModel');
const enhancedRealtimeService = require('../../../services/enhancedRealtimeService');

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
      console.log('[ChatService] canUsersChat result:', {
        canChat: canChatResult.canChat,
        reason: canChatResult.reason,
        userId1: userId1.toString(),
        userId2: userId2.toString()
      });
      
      if (!canChatResult.canChat) {
        if (canChatResult.reason === 'user_not_found') {
          throw new Error('One or both users not found');
        }
        
        if (canChatResult.reason === 'user_inactive') {
          throw new Error('Cannot chat with inactive users');
        }
        
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
            // Return structured response instead of throwing error
            return {
              canChat: false,
              needsMessageRequest: true,
              messageRequestExists: true,
              messageRequestId: existingRequest._id,
              reason: 'message_request_pending',
              message: 'Message request already sent and pending'
            };
          }
          
          // Return structured response indicating message request is needed
          return {
            canChat: false,
            needsMessageRequest: true,
            messageRequestExists: false,
            reason: 'no_permission',
            message: 'Cannot start chat. Send a message request first.'
          };
        }
        
        // Handle any other unknown reasons - return structured response
        return {
          canChat: false,
          needsMessageRequest: true,
          messageRequestExists: false,
          reason: canChatResult.reason || 'unknown',
          message: 'Cannot start chat. Send a message request first.'
        };
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
   * @param {boolean} includeArchived - Whether to include archived chats (if true, returns only archived; if false, excludes archived)
   * @returns {Promise<Array>} Array of chats
   */
  static async getUserChats(userId, page = 1, limit = 20, includeArchived = false) {
    console.log('🔵 [BACKEND_CHAT_SVC] getUserChats called:', { userId, page, limit, includeArchived, timestamp: new Date().toISOString() });
    try {
      // Input validation
      if (!userId) {
        console.error('❌ [BACKEND_CHAT_SVC] User ID missing');
        throw new Error('User ID is required');
      }
      
      if (page < 1 || limit < 1 || limit > 100) {
        console.error('❌ [BACKEND_CHAT_SVC] Invalid pagination:', { page, limit });
        throw new Error('Invalid pagination parameters');
      }
      
      // Diagnostic: Check total chats in database (only on first page)
      if (page === 1) {
        const totalChatsInDB = await Chat.countDocuments({ isActive: true });
        const chatsWithUser = await Chat.countDocuments({ 
          participants: userId, 
          isActive: true 
        });
        console.log('🔵 [BACKEND_CHAT_SVC] Database diagnostics:', { 
          totalActiveChats: totalChatsInDB,
          chatsWithThisUser: chatsWithUser,
          userId
        });
      }
      
      console.log('🔵 [BACKEND_CHAT_SVC] Calling Chat.getUserChats...', { userId, page, limit, includeArchived });
      const chats = await Chat.getUserChats(userId, page, limit, includeArchived);
      console.log('🔵 [BACKEND_CHAT_SVC] Chat.getUserChats returned:', { 
        chatsCount: chats.length, 
        chatIds: chats.map(c => c._id)
      });
      
      // Enhance chats with additional data
      console.log('🔵 [BACKEND_CHAT_SVC] Enhancing chats with additional data...');
      const enhancedChats = await Promise.all(
        chats.map(async (chat, index) => {
          const userSettings = chat.userSettings?.find(setting => 
            setting.userId?.toString() === userId.toString() ||
            setting.userId?.toString() === userId
          );
          
          // Get other participant info
          const otherParticipant = chat.participants?.find(p => 
            p._id?.toString() !== userId.toString() &&
            p._id?.toString() !== userId
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
      console.log('✅ [BACKEND_CHAT_SVC] Chats enhanced:', { enhancedCount: enhancedChats.length });
      
      // Sort chats: pinned first, then by last message time
      console.log('🔵 [BACKEND_CHAT_SVC] Sorting chats...');
      enhancedChats.sort((a, b) => {
        if (a.userSettings.isPinned && !b.userSettings.isPinned) return -1;
        if (!a.userSettings.isPinned && b.userSettings.isPinned) return 1;
        
        const aTime = a.lastMessageAt || a.updatedAt;
        const bTime = b.lastMessageAt || b.updatedAt;
        return new Date(bTime) - new Date(aTime);
      });
      console.log('✅ [BACKEND_CHAT_SVC] Chats sorted');
      
      console.log('✅ [BACKEND_CHAT_SVC] getUserChats completed:', { 
        finalCount: enhancedChats.length,
        hasMore: enhancedChats.length === limit
      });
      
      return enhancedChats;
      
    } catch (error) {
      console.error('❌ [BACKEND_CHAT_SVC] getUserChats error:', { error: error.message, stack: error.stack, userId });
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
   * Delete chat permanently (delete chat and all associated messages)
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
      
      // Delete all messages associated with this chat
      const deleteMessagesResult = await Message.deleteMany({ chatId: chatId });
      console.log(`🔵 [CHAT_SERVICE] Deleted ${deleteMessagesResult.deletedCount} messages for chat ${chatId}`);
      
      // Permanently delete the chat
      await Chat.findByIdAndDelete(chatId);
      console.log(`🔵 [CHAT_SERVICE] Permanently deleted chat ${chatId}`);
      
      return {
        chatId: chat._id,
        message: 'Chat deleted successfully',
        deletedMessagesCount: deleteMessagesResult.deletedCount
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
    console.log('🔵 [BACKEND_CHAT_SVC] searchChats called:', { userId, query, page, limit, timestamp: new Date().toISOString() });
    try {
      // Input validation
      if (!userId || !query || query.trim() === '') {
        console.error('❌ [BACKEND_CHAT_SVC] User ID and search query are required');
        throw new Error('User ID and search query are required');
      }
      
      if (page < 1 || limit < 1 || limit > 100) {
        console.error('❌ [BACKEND_CHAT_SVC] Invalid pagination:', { page, limit });
        throw new Error('Invalid pagination parameters');
      }
      
      const searchTerm = query.trim().toLowerCase();
      const skip = (page - 1) * limit;
      
      console.log('🔵 [BACKEND_CHAT_SVC] Finding chats for user...', { userId, searchTerm });
      
      // Find chats where the other participant matches the search
      const chats = await Chat.find({
        participants: userId,
        isActive: true
      })
      .populate('participants', 'username fullName profilePictureUrl isActive')
      .populate('lastMessage')
      .lean();
      
      console.log('🔵 [BACKEND_CHAT_SVC] Found chats:', { totalChats: chats.length });
      
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
          console.warn('⚠️ [BACKEND_CHAT_SVC] No other participant found for chat:', chat._id);
          return false;
        }
        
        // Check if other participant matches search
        const otherUsername = (otherParticipant.username || '').toLowerCase();
        const otherFullName = (otherParticipant.fullName || '').toLowerCase();
        
        const matchesUsername = otherUsername.includes(searchTerm);
        const matchesFullName = otherFullName.includes(searchTerm);
        
        const matches = matchesUsername || matchesFullName;
        
        if (matches) {
          console.log('✅ [BACKEND_CHAT_SVC] Chat matches search:', {
            chatId: chat._id,
            otherParticipant: otherParticipant.fullName || otherParticipant.username,
            matchesUsername,
            matchesFullName,
            searchTerm
          });
        }
        
        return matches;
      });
      
      console.log('🔵 [BACKEND_CHAT_SVC] Filtered chats:', { filteredCount: filteredChats.length });
      
      // Apply pagination
      const paginatedChats = filteredChats.slice(skip, skip + limit);
      console.log('🔵 [BACKEND_CHAT_SVC] Paginated chats:', { 
        paginatedCount: paginatedChats.length,
        skip,
        limit
      });
      
      // Enhance chats with additional data (same as getUserChats)
      console.log('🔵 [BACKEND_CHAT_SVC] Enhancing search result chats...');
      const enhancedChats = await Promise.all(
        paginatedChats.map(async (chat, index) => {
          console.log(`🔵 [BACKEND_CHAT_SVC] Processing search chat ${index + 1}/${paginatedChats.length}:`, { chatId: chat._id });
          
          const userSettings = chat.userSettings?.find(setting => {
            const settingUserId = setting.userId?.toString() || setting.userId;
            return settingUserId === userId.toString();
          });
          
          // Get other participant info
          const otherParticipant = chat.participants?.find(p => {
            const pId = p._id?.toString() || p?.toString();
            return pId && pId !== userId.toString();
          });
          
          console.log(`🔵 [BACKEND_CHAT_SVC] Chat ${chat._id} otherParticipant:`, { 
            found: !!otherParticipant,
            participantId: otherParticipant?._id,
            name: otherParticipant?.fullName || otherParticipant?.username
          });
          
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
      console.log('✅ [BACKEND_CHAT_SVC] Search result chats enhanced:', { enhancedCount: enhancedChats.length });
      
      // Sort chats (same as getUserChats)
      console.log('🔵 [BACKEND_CHAT_SVC] Sorting search result chats...');
      enhancedChats.sort((a, b) => {
        if (a.userSettings.isPinned && !b.userSettings.isPinned) return -1;
        if (!a.userSettings.isPinned && b.userSettings.isPinned) return 1;
        
        const aTime = a.lastMessageAt || a.updatedAt;
        const bTime = b.lastMessageAt || b.updatedAt;
        return new Date(bTime) - new Date(aTime);
      });
      console.log('✅ [BACKEND_CHAT_SVC] Search result chats sorted.');
      
      const total = filteredChats.length;
      const hasMore = (skip + limit) < total;
      
      console.log('✅ [BACKEND_CHAT_SVC] searchChats completed:', { 
        finalCount: enhancedChats.length, 
        total,
        hasMore
      });
      
      return {
        chats: enhancedChats,
        total,
        hasMore
      };
      
    } catch (error) {
      console.error('❌ [BACKEND_CHAT_SVC] searchChats error:', { error: error.message, stack: error.stack });
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
