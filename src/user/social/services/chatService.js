const mongoose = require('mongoose');
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
      
      // Validate users exist and are active (optimized with lean)
      const [user1, user2] = await Promise.all([
        User.findById(userId1).select('isActive').lean(),
        User.findById(userId2).select('isActive').lean()
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
      const userIdStr = userId.toString();
      const enhancedChats = await Promise.all(
        chats.map(async (chat, index) => {
          const userSettings = chat.userSettings?.find(setting => {
            const settingUserId = setting.userId?.toString() || String(setting.userId);
            return settingUserId === userIdStr;
          });
          
          // Get other participant info
          const otherParticipant = chat.participants?.find(p => {
            const pId = p._id?.toString() || p?.toString();
            return pId && pId !== userIdStr;
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
      
      // Check if user is participant using Set for O(1) lookup
      const userIdStr = userId.toString();
      const participantSet = new Set(chat.participants.map(p => 
        (p._id?.toString() || p?.toString())
      ));
      if (!participantSet.has(userIdStr)) {
        throw new Error('Access denied to this chat');
      }
      
      // Get unread count
      const unreadCount = await Message.getUnreadCount(chatId, userId);
      
      // Get user settings (userIdStr already declared above)
      const userSettings = chat.userSettings?.find(setting => {
        const settingUserId = setting.userId?.toString() || String(setting.userId);
        return settingUserId === userIdStr;
      });
      
      // Get other participant
      const otherParticipant = chat.participants.find(p => {
        const pId = p._id?.toString() || p?.toString();
        return pId && pId !== userIdStr;
      });
      
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
      
      const chat = await Chat.findById(chatId)
        .select('participants')
        .lean();
      if (!chat) {
        throw new Error('Chat not found');
      }
      
      // Check if user is participant using Set for O(1) lookup
      const userIdStr = userId.toString();
      const participantSet = new Set(chat.participants.map(p => p.toString()));
      if (!participantSet.has(userIdStr)) {
        throw new Error('Access denied to this chat');
      }
      
      // Prepare updates with timestamps
      const updates = {};
      const updateObj = {};
      if (typeof isArchived === 'boolean') {
        updates.isArchived = isArchived;
        updateObj['userSettings.$.isArchived'] = isArchived;
        updateObj['userSettings.$.archivedAt'] = isArchived ? new Date() : null;
      }
      if (typeof isPinned === 'boolean') {
        updates.isPinned = isPinned;
        updateObj['userSettings.$.isPinned'] = isPinned;
        updateObj['userSettings.$.pinnedAt'] = isPinned ? new Date() : null;
      }
      if (typeof isMuted === 'boolean') {
        updates.isMuted = isMuted;
        updateObj['userSettings.$.isMuted'] = isMuted;
        updateObj['userSettings.$.mutedAt'] = isMuted ? new Date() : null;
      }
      
      // Update user settings atomically
      const userIdObj = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
      await Chat.updateOne(
        { _id: chatId, 'userSettings.userId': userIdObj },
        { $set: updateObj }
      );
      
      return {
        chatId: chatId,
        settings: updates
      };
      
    } catch (error) {
      console.error('[ChatService] updateChatSettings error:', error);
      throw error;
    }
  }
  
  /**
   * Delete chat for user (archive and hide messages before deletion timestamp)
   * Similar to Instagram/WhatsApp: Chat is hidden for user, but reappears if other user sends message
   * Only messages sent after deletion will be visible when chat reappears
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
      
      const chat = await Chat.findById(chatId)
        .select('_id participants')
        .lean();
      if (!chat) {
        throw new Error('Chat not found');
      }
      
      // Check if user is participant using Set for O(1) lookup
      const userIdStr = userId.toString();
      const participantSet = new Set(chat.participants.map(p => p.toString()));
      if (!participantSet.has(userIdStr)) {
        throw new Error('Access denied to this chat');
      }
      
      // Archive chat for user and set deletion timestamp atomically
      // This hides the chat from user's list, but keeps it in database
      // When other user sends message, chat will reappear but only show new messages
      const deletionTimestamp = new Date();
      const userIdObj = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
      const updateResult = await Chat.updateOne(
        { _id: chatId, 'userSettings.userId': userIdObj },
        {
          $set: {
            'userSettings.$.isArchived': true,
            'userSettings.$.archivedAt': deletionTimestamp,
            'userSettings.$.deletedAt': deletionTimestamp
          }
        }
      );
      
      if (updateResult.matchedCount === 0) {
        throw new Error('User settings not found in chat');
      }
      
      console.log(`🔵 [CHAT_SERVICE] Chat ${chatId} archived and marked as deleted for user ${userId} at ${deletionTimestamp}`);
      
      return {
        chatId: chatId,
        message: 'Chat deleted successfully',
        deletedAt: deletionTimestamp
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
      const userIdStr = userId.toString();
      
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
          return settingUserId === userIdStr;
        });
        
        if (userSetting?.isArchived) {
          return false;
        }
        
        // Find other participant
        const otherParticipant = chat.participants?.find(p => {
          const pId = p._id?.toString() || p?.toString();
          return pId && pId !== userIdStr;
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
            return settingUserId === userIdStr;
          });
          
          // Get other participant info
          const otherParticipant = chat.participants?.find(p => {
            const pId = p._id?.toString() || p?.toString();
            return pId && pId !== userIdStr;
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
      
      const userIdObj = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
      
      // Get chat IDs first, then use them for unread message count
      const userChatIds = await Chat.find({ participants: userId, isActive: true })
        .select('_id')
        .lean()
        .then(chats => chats.map(chat => chat._id));
      
      const [totalChats, archivedChats, pinnedChats, totalUnreadMessagesResult] = await Promise.all([
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
        Message.aggregate([
          {
            $match: {
              chatId: { $in: userChatIds },
              senderId: { $ne: userIdObj },
              isDeleted: false
            }
          },
          {
            $addFields: {
              readByUser: {
                $anyElementTrue: {
                  $map: {
                    input: { $ifNull: ['$readBy', []] },
                    as: 'read',
                    in: { $eq: ['$$read.userId', userIdObj] }
                  }
                }
              },
              deletedByUser: {
                $anyElementTrue: {
                  $map: {
                    input: { $ifNull: ['$deletedBy', []] },
                    as: 'deletion',
                    in: { $eq: ['$$deletion.userId', userIdObj] }
                  }
                }
              }
            }
          },
          {
            $match: {
              readByUser: false,
              deletedByUser: false
            }
          },
          { $count: 'total' }
        ])
      ]);
      
      const totalUnreadMessages = totalUnreadMessagesResult[0]?.total || 0;
      
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
      // Validate chat access with lean query and Set lookup
      const chat = await Chat.findById(chatId)
        .select('participants')
        .lean();
      if (!chat) {
        throw new Error('Access denied to this chat');
      }
      
      const userIdStr = userId.toString();
      const participantSet = new Set(chat.participants.map(p => p.toString()));
      if (!participantSet.has(userIdStr)) {
        throw new Error('Access denied to this chat');
      }
      
      // Mark messages as read and reset unread count atomically
      const userIdObj = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
      const [readCount] = await Promise.all([
        Message.markChatAsRead(chatId, userId),
        Chat.updateOne(
          { _id: chatId, 'userSettings.userId': userIdObj },
          {
            $set: {
              'userSettings.$.unreadCount': 0,
              'userSettings.$.lastReadAt': new Date()
            }
          }
        )
      ]);
      
      return {
        chatId,
        userId,
        joined: true,
        readCount,
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
