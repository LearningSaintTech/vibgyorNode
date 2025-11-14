const Message = require('../userModel/messageModel');
const Chat = require('../userModel/chatModel');
const User = require('../../auth/model/userAuthModel');
const { uploadBuffer } = require('../../../services/s3Service');
const enhancedRealtimeService = require('../../../services/enhancedRealtimeService');

/**
 * Enhanced Message Service with comprehensive error handling and edge cases
 */
class MessageService {
  
  /**
   * Send a message to a chat
   * @param {Object} messageData - Message data
   * @param {Object} file - Optional file attachment
   * @returns {Promise<Object>} Created message
   */
  static async sendMessage(messageData, file = null) {
    try {
      const {
        chatId,
        senderId,
        type = 'text',
        content = '',
        replyTo = null,
        forwardedFrom = null
      } = messageData;
      
      // Input validation
      if (!chatId || !senderId) {
        throw new Error('Chat ID and Sender ID are required');
      }
      
      if (!['text', 'audio', 'video', 'image', 'document', 'system', 'forwarded'].includes(type)) {
        throw new Error('Invalid message type');
      }
      
      if (type === 'text' && (!content || content.trim() === '')) {
        throw new Error('Message content is required for text messages');
      }
      
      // Validate chat exists and user is participant
      const chat = await Chat.findById(chatId);
      if (!chat) {
        throw new Error('Chat not found');
      }
      
      const isParticipant = chat.participants.some(p => p.toString() === senderId.toString());
      if (!isParticipant) {
        throw new Error('Access denied to this chat');
      }
      
      // Handle media upload if file is present
      let mediaData = {};
      if (file && ['audio', 'video', 'image', 'document'].includes(type)) {
        // Validate file size (50MB limit)
        if (file.size > 50 * 1024 * 1024) {
          throw new Error('File size too large. Maximum 50MB allowed.');
        }
        
        // Validate file type
        const allowedTypes = {
          audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4'],
          video: ['video/mp4', 'video/webm', 'video/ogg'],
          image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
          document: ['application/pdf', 'text/plain', 'application/msword']
        };
        
        if (allowedTypes[type] && !allowedTypes[type].includes(file.mimetype)) {
          throw new Error(`Invalid file type for ${type} message`);
        }
        
        // Upload to S3
        const uploadResult = await uploadBuffer({
          buffer: file.buffer,
          contentType: file.mimetype,
          userId: senderId,
          category: 'messages',
          type: type,
          filename: `${Date.now()}-${file.originalname}`
        });
        
        mediaData = {
          url: uploadResult.url,
          mimeType: file.mimetype,
          fileName: file.originalname,
          fileSize: file.size
        };
        
        // Set content to filename if not provided
        if (!content || content.trim() === '') {
          content = file.originalname;
        }
      }
      
      // Validate replyTo message if provided
      if (replyTo) {
        const replyMessage = await Message.findById(replyTo);
        if (!replyMessage || replyMessage.chatId.toString() !== chatId) {
          throw new Error('Invalid reply message');
        }
      }
      
      // Validate forwardedFrom message if provided
      if (forwardedFrom) {
        const forwardedMessage = await Message.findById(forwardedFrom);
        if (!forwardedMessage) {
          throw new Error('Invalid forwarded message');
        }
      }
      
      // Create message
      const message = new Message({
        chatId,
        senderId,
        type,
        content: content.trim(),
        media: mediaData,
        replyTo: replyTo || null,
        forwardedFrom: forwardedFrom || null,
        status: 'sent'
      });
      
      await message.save();
      await message.populate([
        { path: 'senderId', select: 'username fullName profilePictureUrl' },
        { path: 'replyTo', select: 'content type senderId' },
        { path: 'forwardedFrom', select: 'content type senderId' }
      ]);
      
      // Update chat's last message and increment unread count
      chat.lastMessage = message._id;
      chat.lastMessageAt = new Date();
      
      // Increment unread count for all participants except the sender
      chat.participants.forEach(participantId => {
        if (participantId.toString() !== senderId.toString()) {
          chat.incrementUnreadCount(participantId);
        }
      });
      
      await chat.save();
      
      // Emit real-time message to chat participants
      const realtime = enhancedRealtimeService;
      if (realtime && realtime.emitNewMessage) {
        realtime.emitNewMessage(chatId, {
          _id: message._id,
          chatId: message.chatId,
          senderId: message.senderId,
          type: message.type,
          content: message.content,
          media: message.media,
          replyTo: message.replyTo,
          forwardedFrom: message.forwardedFrom,
          createdAt: message.createdAt,
          status: message.status,
          sender: {
            _id: message.senderId._id,
            username: message.senderId.username,
            fullName: message.senderId.fullName,
            profilePictureUrl: message.senderId.profilePictureUrl
          }
        });
      }
      
      return {
        _id: message._id,
        messageId: message._id, // Keep both for backward compatibility
        chatId: message.chatId,
        senderId: message.senderId,
        type: message.type,
        content: message.content,
        media: message.media,
        replyTo: message.replyTo,
        forwardedFrom: message.forwardedFrom,
        createdAt: message.createdAt,
        status: message.status
      };
      
    } catch (error) {
      console.error('[MessageService] sendMessage error:', error);
      throw error;
    }
  }
  
  /**
   * Get messages in a chat with pagination
   * @param {string} chatId - Chat ID
   * @param {string} userId - User ID
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise<Array>} Array of messages
   */
  static async getChatMessages(chatId, userId, page = 1, limit = 50) {
    try {
      // Input validation
      if (!chatId || !userId) {
        throw new Error('Chat ID and User ID are required');
      }
      
      if (page < 1 || limit < 1 || limit > 100) {
        throw new Error('Invalid pagination parameters');
      }
      
      // Validate chat access
      const chat = await Chat.findById(chatId);
      if (!chat) {
        throw new Error('Chat not found');
      }
      
      const isParticipant = chat.participants.some(p => p.toString() === userId.toString());
      if (!isParticipant) {
        throw new Error('Access denied to this chat');
      }
      
      const messages = await Message.getChatMessages(chatId, page, limit, userId);
      
      return {
        messages,
        pagination: {
          page,
          limit,
          total: messages.length,
          hasMore: messages.length === limit
        }
      };
      
    } catch (error) {
      console.error('[MessageService] getChatMessages error:', error);
      throw error;
    }
  }
  
  /**
   * Mark messages as read in a chat
   * @param {string} chatId - Chat ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Read result
   */
  static async markMessagesAsRead(chatId, userId) {
    try {
      // Input validation
      if (!chatId || !userId) {
        throw new Error('Chat ID and User ID are required');
      }
      
      // Validate chat access
      const chat = await Chat.findById(chatId);
      if (!chat) {
        throw new Error('Chat not found');
      }
      
      const isParticipant = chat.participants.some(p => p.toString() === userId.toString());
      if (!isParticipant) {
        throw new Error('Access denied to this chat');
      }
      
      const readCount = await Message.markChatAsRead(chatId, userId);
      
      // Reset unread count for this user in the chat
      chat.resetUnreadCount(userId);
      await chat.save();
      
      return {
        chatId,
        readCount,
        unreadCount: 0
      };
      
    } catch (error) {
      console.error('[MessageService] markMessagesAsRead error:', error);
      throw error;
    }
  }
  
  /**
   * Edit a message
   * @param {string} messageId - Message ID
   * @param {string} userId - User ID
   * @param {string} newContent - New message content
   * @returns {Promise<Object>} Updated message
   */
  static async editMessage(messageId, userId, newContent) {
    try {
      // Input validation
      if (!messageId || !userId || !newContent || newContent.trim() === '') {
        throw new Error('Message ID, User ID, and content are required');
      }
      
      const message = await Message.findById(messageId);
      if (!message) {
        throw new Error('Message not found');
      }
      
      // Check if user is the sender
      if (message.senderId.toString() !== userId.toString()) {
        throw new Error('You can only edit your own messages');
      }
      
      // Check if message is too old to edit (24 hours)
      const messageAge = Date.now() - message.createdAt.getTime();
      if (messageAge > 24 * 60 * 60 * 1000) {
        throw new Error('Message is too old to edit');
      }
      
      // Check if message is deleted
      if (message.isDeleted) {
        throw new Error('Cannot edit deleted message');
      }
      
      await message.editMessage(newContent.trim());
      
      // Emit message update to chat participants
      try {
        const realtime = enhancedRealtimeService;
        if (realtime && typeof realtime.to === 'function') {
          realtime.to(`chat:${message.chatId}`).emit('message_update', {
            messageId: message._id,
            chatId: message.chatId,
            content: message.content,
            editedAt: message.editedAt
          });
          
          // Also emit to all participants' global rooms for chat list updates
          const chat = await Chat.findById(message.chatId);
          chat.participants.forEach(participantId => {
            realtime.to(`user:${participantId}`).emit('message_update', {
              messageId: message._id,
              chatId: message.chatId,
              content: message.content,
              editedAt: message.editedAt
            });
          });
        }
      } catch (wsError) {
        console.error('[MessageService] WebSocket emission error:', wsError);
        // Continue execution - don't fail the message edit because of WebSocket issues
      }
      
      return {
        messageId: message._id,
        content: message.content,
        editedAt: message.editedAt
      };
      
    } catch (error) {
      console.error('[MessageService] editMessage error:', error);
      throw error;
    }
  }
  
  /**
   * Delete a message
   * @param {string} messageId - Message ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Deletion result
   */
  static async deleteMessage(messageId, userId) {
    try {
      // Input validation
      if (!messageId || !userId) {
        throw new Error('Message ID and User ID are required');
      }
      
      const message = await Message.findById(messageId);
      if (!message) {
        throw new Error('Message not found');
      }
      
      // Check if user is the sender
      if (message.senderId.toString() !== userId.toString()) {
        throw new Error('You can only delete your own messages');
      }
      
      // Check if message is already deleted by this user
      if (message.deletedBy.includes(userId)) {
        throw new Error('Message already deleted');
      }
      
      await message.deleteForUser(userId);
      
      return {
        messageId: message._id,
        isDeleted: message.isDeleted
      };
      
    } catch (error) {
      console.error('[MessageService] deleteMessage error:', error);
      throw error;
    }
  }
  
  /**
   * Add reaction to a message
   * @param {string} messageId - Message ID
   * @param {string} userId - User ID
   * @param {string} emoji - Emoji reaction
   * @returns {Promise<Object>} Updated reactions
   */
  static async reactToMessage(messageId, userId, emoji) {
    try {
      // Input validation
      if (!messageId || !userId || !emoji) {
        throw new Error('Message ID, User ID, and emoji are required');
      }
      
      const message = await Message.findById(messageId);
      if (!message) {
        throw new Error('Message not found');
      }
      
      // Check if user is participant in the chat
      const chat = await Chat.findById(message.chatId);
      const isParticipant = chat.participants.some(p => p.toString() === userId.toString());
      if (!isParticipant) {
        throw new Error('Access denied to this message');
      }
      
      // Check if message is deleted
      if (message.isDeleted) {
        throw new Error('Cannot react to deleted message');
      }
      
      await message.addReaction(userId, emoji);
      
      // Emit reaction to chat participants
      try {
        const realtime = enhancedRealtimeService;
        if (realtime && typeof realtime.to === 'function') {
          const reactionData = {
            messageId: message._id,
            chatId: message.chatId,
            reactions: message.reactions
          };
          
          realtime.to(`chat:${message.chatId}`).emit('message_reaction', reactionData);
          
          // Also emit to all participants' global rooms for chat list updates
          chat.participants.forEach(participantId => {
            realtime.to(`user:${participantId}`).emit('message_reaction', reactionData);
          });
        }
      } catch (wsError) {
        console.error('[MessageService] WebSocket emission error:', wsError);
        // Continue execution - don't fail the reaction because of WebSocket issues
      }
      
      return {
        messageId: message._id,
        reactions: message.reactions
      };
      
    } catch (error) {
      console.error('[MessageService] reactToMessage error:', error);
      throw error;
    }
  }
  
  /**
   * Remove reaction from a message
   * @param {string} messageId - Message ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Updated reactions
   */
  static async removeReaction(messageId, userId) {
    try {
      // Input validation
      if (!messageId || !userId) {
        throw new Error('Message ID and User ID are required');
      }
      
      const message = await Message.findById(messageId);
      if (!message) {
        throw new Error('Message not found');
      }
      
      // Check if user is participant in the chat
      const chat = await Chat.findById(message.chatId);
      const isParticipant = chat.participants.some(p => p.toString() === userId.toString());
      if (!isParticipant) {
        throw new Error('Access denied to this message');
      }
      
      await message.removeReaction(userId);
      
      // Emit reaction update to chat participants
      try {
        const realtime = enhancedRealtimeService;
        if (realtime && typeof realtime.to === 'function') {
          realtime.to(`chat:${message.chatId}`).emit('message_reaction', {
            messageId: message._id,
            chatId: message.chatId,
            reactions: message.reactions
          });
          
          // Also emit to all participants' global rooms for chat list updates
          chat.participants.forEach(participantId => {
            realtime.to(`user:${participantId}`).emit('message_reaction', {
              messageId: message._id,
              chatId: message.chatId,
              reactions: message.reactions
            });
          });
        }
      } catch (wsError) {
        console.error('[MessageService] WebSocket emission error:', wsError);
        // Continue execution - don't fail the reaction removal because of WebSocket issues
      }
      
      return {
        messageId: message._id,
        reactions: message.reactions
      };
      
    } catch (error) {
      console.error('[MessageService] removeReaction error:', error);
      throw error;
    }
  }
  
  /**
   * Forward a message to another chat
   * @param {string} messageId - Original message ID
   * @param {string} targetChatId - Target chat ID
   * @param {string} userId - User ID forwarding the message
   * @returns {Promise<Object>} Forwarded message
   */
  static async forwardMessage(messageId, targetChatId, userId) {
    try {
      // Input validation
      if (!messageId || !targetChatId || !userId) {
        throw new Error('Message ID, Target Chat ID, and User ID are required');
      }
      
      // Find the original message
      const originalMessage = await Message.findById(messageId)
        .populate('senderId', 'username fullName profilePictureUrl');
      
      if (!originalMessage) {
        throw new Error('Original message not found');
      }
      
      // Check if user has access to the original message
      const originalChat = await Chat.findById(originalMessage.chatId);
      if (!originalChat || !originalChat.participants.includes(userId)) {
        throw new Error('Access denied to original message');
      }
      
      // Check if user has access to target chat
      const targetChat = await Chat.findById(targetChatId);
      if (!targetChat || !targetChat.participants.includes(userId)) {
        throw new Error('Access denied to target chat');
      }
      
      // Create forwarded message
      const forwardedMessage = new Message({
        chatId: targetChatId,
        senderId: userId,
        type: 'forwarded',
        content: originalMessage.content,
        media: originalMessage.media,
        forwardedFrom: originalMessage._id,
        status: 'sent'
      });
      
      await forwardedMessage.save();
      
      // Update target chat's last message
      targetChat.lastMessage = forwardedMessage._id;
      targetChat.lastMessageAt = new Date();
      
      // Increment unread count for all participants except the sender
      targetChat.participants.forEach(participantId => {
        if (participantId.toString() !== userId.toString()) {
          targetChat.incrementUnreadCount(participantId);
        }
      });
      
      await targetChat.save();
      
      // Emit real-time message to target chat participants
      const realtime = enhancedRealtimeService;
      if (realtime && realtime.emitNewMessage) {
        realtime.emitNewMessage(targetChatId, {
          _id: forwardedMessage._id,
          chatId: forwardedMessage.chatId,
          senderId: forwardedMessage.senderId,
          type: forwardedMessage.type,
          content: forwardedMessage.content,
          media: forwardedMessage.media,
          forwardedFrom: forwardedMessage.forwardedFrom,
          createdAt: forwardedMessage.createdAt,
          status: forwardedMessage.status
        });
      }
      
      return {
        messageId: forwardedMessage._id,
        chatId: targetChatId,
        content: forwardedMessage.content,
        forwardedFrom: originalMessage._id
      };
      
    } catch (error) {
      console.error('[MessageService] forwardMessage error:', error);
      throw error;
    }
  }
  
  /**
   * Search messages in a chat
   * @param {string} chatId - Chat ID
   * @param {string} userId - User ID
   * @param {string} query - Search query
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise<Array>} Search results
   */
  static async searchMessages(chatId, userId, query, page = 1, limit = 20) {
    try {
      // Input validation
      if (!chatId || !userId || !query || query.trim() === '') {
        throw new Error('Chat ID, User ID, and search query are required');
      }
      
      if (page < 1 || limit < 1 || limit > 100) {
        throw new Error('Invalid pagination parameters');
      }
      
      // Validate chat access
      const chat = await Chat.findById(chatId);
      if (!chat) {
        throw new Error('Chat not found');
      }
      
      const isParticipant = chat.participants.some(p => p.toString() === userId.toString());
      if (!isParticipant) {
        throw new Error('Access denied to this chat');
      }
      
      const messages = await Message.searchMessages(chatId, query.trim(), userId, page, limit);
      
      return {
        messages,
        pagination: {
          page,
          limit,
          total: messages.length,
          hasMore: messages.length === limit
        }
      };
      
    } catch (error) {
      console.error('[MessageService] searchMessages error:', error);
      throw error;
    }
  }
  
  /**
   * Get media messages in a chat
   * @param {string} chatId - Chat ID
   * @param {string} userId - User ID
   * @param {string} type - Media type filter
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise<Array>} Media messages
   */
  static async getChatMedia(chatId, userId, type = null, page = 1, limit = 20) {
    try {
      // Input validation
      if (!chatId || !userId) {
        throw new Error('Chat ID and User ID are required');
      }
      
      if (page < 1 || limit < 1 || limit > 100) {
        throw new Error('Invalid pagination parameters');
      }
      
      // Validate chat access
      const chat = await Chat.findById(chatId);
      if (!chat) {
        throw new Error('Chat not found');
      }
      
      const isParticipant = chat.participants.some(p => p.toString() === userId.toString());
      if (!isParticipant) {
        throw new Error('Access denied to this chat');
      }
      
      const mediaMessages = await Message.getChatMedia(chatId, type, userId, page, limit);
      
      return {
        mediaMessages,
        pagination: {
          page,
          limit,
          total: mediaMessages.length,
          hasMore: mediaMessages.length === limit
        }
      };
      
    } catch (error) {
      console.error('[MessageService] getChatMedia error:', error);
      throw error;
    }
  }
  
  /**
   * Get message details
   * @param {string} messageId - Message ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Message details
   */
  static async getMessageDetails(messageId, userId) {
    try {
      // Input validation
      if (!messageId || !userId) {
        throw new Error('Message ID and User ID are required');
      }
      
      const message = await Message.findById(messageId)
        .populate('senderId', 'username fullName profilePictureUrl')
        .populate('replyTo', 'content type senderId')
        .populate('forwardedFrom', 'content type senderId')
        .populate('reactions.userId', 'username fullName')
        .lean();
      
      if (!message) {
        throw new Error('Message not found');
      }
      
      // Check if user is participant in the chat
      const chat = await Chat.findById(message.chatId);
      const isParticipant = chat.participants.some(p => p.toString() === userId.toString());
      if (!isParticipant) {
        throw new Error('Access denied to this message');
      }
      
      // Check if message is deleted by this user
      if (message.deletedBy.includes(userId)) {
        throw new Error('Message not found');
      }
      
      return message;
      
    } catch (error) {
      console.error('[MessageService] getMessageDetails error:', error);
      throw error;
    }
  }
}

module.exports = MessageService;
