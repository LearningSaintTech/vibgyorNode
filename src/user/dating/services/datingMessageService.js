const mongoose = require('mongoose');
const DatingMessage = require('../models/datingMessageModel');
const DatingChat = require('../models/datingChatModel');
const DatingMatch = require('../models/datingMatchModel');
const User = require('../../auth/model/userAuthModel');
const { uploadBuffer } = require('../../../services/s3Service');
const enhancedRealtimeService = require('../../../services/enhancedRealtimeService');
const notificationService = require('../../../notification/services/notificationService');

/**
 * Dating Message Service - Separate from social messages
 */
class DatingMessageService {
  
  /**
   * Send a message to a dating chat
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
      
      if (!['text', 'audio', 'video', 'image', 'document', 'gif', 'location', 'voice', 'system', 'forwarded'].includes(type)) {
        throw new Error('Invalid message type');
      }
      
      if (type === 'text' && (!content || content.trim() === '')) {
        throw new Error('Message content is required for text messages');
      }
      
      // Validate chat exists and user is participant
      const chat = await DatingChat.findById(chatId)
        .select('participants lastMessage lastMessageAt')
        .lean();
      if (!chat) {
        throw new Error('Dating chat not found');
      }
      
      // Use Set for O(1) participant lookup
      const participantSet = new Set(chat.participants.map(p => p.toString()));
      const senderIdStr = senderId.toString();
      if (!participantSet.has(senderIdStr)) {
        throw new Error('Access denied to this dating chat');
      }
      
      // Check if users are blocked (bidirectional check)
      // Get the other participant
      const otherParticipantId = chat.participants.find(p => p.toString() !== senderIdStr);
      if (otherParticipantId) {
        const [senderUser, otherUser] = await Promise.all([
          User.findById(senderId).select('blockedUsers blockedBy'),
          User.findById(otherParticipantId).select('blockedUsers blockedBy')
        ]);
        
        if (senderUser && otherUser) {
          // Check all blocking scenarios using Set for O(1) lookups:
          // 1. Sender has blocked the other user
          // 2. Other user has blocked the sender
          // 3. Sender is in other user's blockedBy list
          // 4. Other user is in sender's blockedBy list
          const senderBlockedSet = new Set((senderUser.blockedUsers || []).map(id => id.toString()));
          const otherBlockedSet = new Set((otherUser.blockedUsers || []).map(id => id.toString()));
          const senderBlockedBySet = new Set((senderUser.blockedBy || []).map(id => id.toString()));
          const otherBlockedBySet = new Set((otherUser.blockedBy || []).map(id => id.toString()));
          
          const otherParticipantIdStr = otherParticipantId.toString();
          // senderIdStr already declared above (line 55)
          const senderBlockedOther = senderBlockedSet.has(otherParticipantIdStr);
          const otherBlockedSender = otherBlockedSet.has(senderIdStr);
          const senderInOtherBlockedBy = otherBlockedBySet.has(senderIdStr);
          const otherInSenderBlockedBy = senderBlockedBySet.has(otherParticipantIdStr);
          
          const isBlocked = senderBlockedOther || otherBlockedSender || senderInOtherBlockedBy || otherInSenderBlockedBy;
          
          if (isBlocked) {
            console.log('[DATING_MESSAGE_SERVICE] Message blocked - users have blocked each other:', {
              senderId,
              otherParticipantId,
              senderBlockedOther,
              otherBlockedSender,
              senderInOtherBlockedBy,
              otherInSenderBlockedBy
            });
            throw new Error('Cannot send message: Users have blocked each other');
          }
        }
      }
      
      // Handle location messages (no file upload needed)
      let locationData = null;
      if (type === 'location' && messageData.location) {
        locationData = {
          latitude: messageData.location.latitude,
          longitude: messageData.location.longitude,
          address: messageData.location.address || '',
          name: messageData.location.name || '',
          placeType: messageData.location.placeType || ''
        };
      }
      
      // Handle media upload if file is present
      let mediaData = {};
      let musicMetadata = null;
      
      if (file && ['audio', 'video', 'image', 'document', 'gif', 'voice'].includes(type)) {
        // Validate file size based on type
        const maxSizes = {
          audio: 50 * 1024 * 1024, // 50MB for music
          voice: 10 * 1024 * 1024, // 10MB for voice messages
          video: 50 * 1024 * 1024, // 50MB for videos
          image: 10 * 1024 * 1024, // 10MB for images
          gif: 10 * 1024 * 1024, // 10MB for GIFs
          document: 25 * 1024 * 1024 // 25MB for documents
        };
        
        const maxSize = maxSizes[type] || 10 * 1024 * 1024;
        if (file.size > maxSize) {
          throw new Error(`File size too large. Maximum ${maxSize / (1024 * 1024)}MB allowed for ${type} messages.`);
        }
        
        // Validate file type
        const allowedTypes = {
          audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3', 'audio/m4a', 'audio/aac', 'audio/flac', 'audio/opus', 'audio/wma'],
          voice: ['audio/mpeg', 'audio/wav', 'audio/m4a', 'audio/aac', 'audio/ogg', 'audio/opus'],
          video: ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/avi', 'video/mov', 'video/mkv', 'video/3gpp', 'video/x-msvideo'],
          image: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/bmp', 'image/heic', 'image/heif'],
          gif: ['image/gif'],
          document: [
            'application/pdf', 
            'text/plain', 
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'text/csv',
            'application/rtf',
            'application/zip',
            'application/x-rar-compressed'
          ]
        };
        
        // Normalize MIME type
        const normalizedMimeType = file.mimetype?.toLowerCase().replace(/jpg$/, 'jpeg');
        
        if (allowedTypes[type] && !allowedTypes[type].includes(normalizedMimeType)) {
          throw new Error(`Invalid file type for ${type} message. Detected: ${file.mimetype}. Allowed types: ${allowedTypes[type].join(', ')}`);
        }
        
        // Determine S3 category and type
        const s3Category = 'dating-messages';
        let s3Type = type;
        if (type === 'voice') {
          s3Type = 'voice';
        } else if (type === 'audio') {
          s3Type = 'music';
        }
        
        // Upload to S3
        const uploadResult = await uploadBuffer({
          buffer: file.buffer,
          contentType: file.mimetype,
          userId: senderId,
          category: s3Category,
          type: s3Type,
          filename: `${Date.now()}-${file.originalname}`
        });
        
        mediaData = {
          url: uploadResult.url,
          mimeType: file.mimetype,
          fileName: file.originalname,
          fileSize: file.size
        };
        
        // Add duration for video, audio, and voice messages
        if (['video', 'audio', 'voice'].includes(type)) {
          const duration = messageData.duration ? parseFloat(messageData.duration) : 0;
          mediaData.duration = isNaN(duration) ? 0 : Math.max(0, duration);
        }
        
        // Add dimensions for images and videos if available
        if ((type === 'image' || type === 'video')) {
          const width = messageData.width ? parseInt(messageData.width) : null;
          const height = messageData.height ? parseInt(messageData.height) : null;
          
          if (width && height) {
            mediaData.dimensions = {
              width: width,
              height: height
            };
          }
        }
        
        // Add GIF-specific fields
        if (type === 'gif') {
          mediaData.isAnimated = true;
          if (messageData.gifSource) {
            mediaData.gifSource = messageData.gifSource;
            mediaData.gifId = messageData.gifId || null;
          } else {
            mediaData.gifSource = 'upload';
          }
        }
        
        // Extract music metadata for audio files
        if (type === 'audio' && messageData.musicMetadata) {
          musicMetadata = messageData.musicMetadata;
        }
        
        // Set content to filename if not provided
        if (!content || content.trim() === '') {
          content = file.originalname;
        }
      }
      
      // Validate replyTo message if provided (optimized with lean and select)
      if (replyTo) {
        const replyMessage = await DatingMessage.findById(replyTo)
          .select('chatId')
          .lean();
        if (!replyMessage || replyMessage.chatId.toString() !== chatId) {
          throw new Error('Invalid reply message');
        }
      }
      
      // Validate forwardedFrom message if provided (optimized with lean)
      if (forwardedFrom) {
        const forwardedMessage = await DatingMessage.findById(forwardedFrom)
          .select('_id')
          .lean();
        if (!forwardedMessage) {
          throw new Error('Invalid forwarded message');
        }
      }
      
      // Handle one-view flag
      const isOneView = messageData.isOneView === true || messageData.isOneView === 'true';
      let oneViewExpiresAt = null;
      if (isOneView) {
        const expirationHours = messageData.oneViewExpirationHours || 24;
        oneViewExpiresAt = new Date(Date.now() + expirationHours * 60 * 60 * 1000);
      }
      
      // Create message
      const message = new DatingMessage({
        chatId,
        senderId,
        type,
        content: content.trim(),
        media: Object.keys(mediaData).length > 0 ? mediaData : undefined,
        location: locationData,
        musicMetadata: musicMetadata,
        isOneView: isOneView,
        oneViewExpiresAt: oneViewExpiresAt,
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
      
      // Update chat's last message and increment unread count atomically
      // Note: chat is now a lean object, so we need to use updateOne
      const senderIdObj = mongoose.Types.ObjectId.isValid(senderId) ? new mongoose.Types.ObjectId(senderId) : senderId;
      await DatingChat.updateOne(
        { _id: chatId },
        {
          $set: {
            lastMessage: message._id,
            lastMessageAt: new Date()
          },
          $inc: {
            'userSettings.$[elem].unreadCount': 1
          }
        },
        {
          arrayFilters: [
            { 'elem.userId': { $ne: senderIdObj } }
          ]
        }
      );
      
      // Send notifications to all participants except sender in parallel
      await Promise.allSettled(
        chat.participants
          .filter(p => p.toString() !== senderIdStr)
          .map(participantId => 
            notificationService.create({
              context: 'dating',
              type: 'message_received',
              recipientId: participantId.toString(),
              senderId: senderIdStr,
              data: {
                chatId: chatId,
                messageId: message._id.toString(),
                messageType: type,
                contentType: 'message'
              }
            }).catch(err => {
              console.error('[DATING_MESSAGE_SERVICE] Notification error for participant:', participantId, err);
              return null; // Don't fail message send if notification fails
            })
          )
      );
      
      // Emit real-time message to chat participants (dating-specific room)
      const realtime = enhancedRealtimeService;
      if (realtime && realtime.emitDatingMessage) {
        realtime.emitDatingMessage(chatId, {
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
      } else if (realtime && realtime.emitNewMessage) {
        // Fallback to general emitNewMessage
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
      
      const responseMessage = {
        _id: message._id,
        messageId: message._id,
        chatId: message.chatId,
        senderId: message.senderId,
        type: message.type,
        content: message.content,
        media: message.media,
        location: message.location,
        musicMetadata: message.musicMetadata,
        isOneView: message.isOneView,
        oneViewExpiresAt: message.oneViewExpiresAt,
        replyTo: message.replyTo,
        forwardedFrom: message.forwardedFrom,
        createdAt: message.createdAt,
        status: message.status
      };
      
      // Emit delivered status update to sender after a short delay
      setTimeout(() => {
        if (realtime && realtime.io) {
          const senderRoom = `user:${senderId}`;
          realtime.io.to(senderRoom).emit('dating_message_status_update', {
            messageId: message._id,
            chatId: chatId,
            status: 'delivered',
            timestamp: new Date()
          });
        }
      }, 500);
      
      return responseMessage;
    } catch (error) {
      console.error('[DatingMessageService] sendMessage error:', error);
      throw error;
    }
  }
  
  /**
   * Get messages in a dating chat with pagination
   * @param {string} chatId - Chat ID
   * @param {string} userId - User ID
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise<Array>} Array of messages
   */
  static async getChatMessages(chatId, userId, page = 1, limit = 50) {
    try {
      if (!chatId || !userId) {
        throw new Error('Chat ID and User ID are required');
      }
      
      if (page < 1 || limit < 1 || limit > 100) {
        throw new Error('Invalid pagination parameters');
      }
      
      // Validate chat access with lean query and Set lookup
      const chat = await DatingChat.findById(chatId)
        .select('participants')
        .lean();
      if (!chat) {
        throw new Error('Dating chat not found');
      }
      
      const participantSet = new Set(chat.participants.map(p => p.toString()));
      const userIdStr = userId.toString();
      if (!participantSet.has(userIdStr)) {
        throw new Error('Access denied to this dating chat');
      }
      
      const messages = await DatingMessage.getChatMessages(chatId, page, limit, userId);
      
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
      console.error('[DatingMessageService] getChatMessages error:', error);
      throw error;
    }
  }
  
  /**
   * Mark messages as read in a dating chat
   * @param {string} chatId - Chat ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Read result
   */
  static async markMessagesAsRead(chatId, userId) {
    try {
      if (!chatId || !userId) {
        throw new Error('Chat ID and User ID are required');
      }
      
      // Validate chat access with lean query and Set lookup
      const chat = await DatingChat.findById(chatId)
        .select('participants')
        .lean();
      if (!chat) {
        throw new Error('Dating chat not found');
      }
      
      const participantSet = new Set(chat.participants.map(p => p.toString()));
      const userIdStr = userId.toString();
      if (!participantSet.has(userIdStr)) {
        throw new Error('Access denied to this dating chat');
      }
      
      // Mark messages as read and reset unread count atomically
      const [readCount] = await Promise.all([
        DatingMessage.markChatAsRead(chatId, userId),
        DatingChat.updateOne(
          { _id: chatId, 'userSettings.userId': userId },
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
        readCount,
        unreadCount: 0
      };
    } catch (error) {
      console.error('[DatingMessageService] markMessagesAsRead error:', error);
      throw error;
    }
  }

  /**
   * Edit a dating message
   * @param {string} messageId - Message ID
   * @param {string} userId - User ID
   * @param {string} newContent - New message content
   * @returns {Promise<Object>} Updated message
   */
  static async editMessage(messageId, userId, newContent) {
    try {
      if (!messageId || !userId || !newContent || newContent.trim() === '') {
        throw new Error('Message ID, User ID, and content are required');
      }
      
      const message = await DatingMessage.findById(messageId)
        .select('senderId createdAt isDeleted')
        .lean();
      if (!message) {
        throw new Error('Dating message not found');
      }
      
      // Check if user is the sender
      const userIdStr = userId.toString();
      if (message.senderId.toString() !== userIdStr) {
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
      
      // Fetch full message document for editing (need mongoose document for instance method)
      const messageDoc = await DatingMessage.findById(messageId);
      await messageDoc.editMessage(newContent.trim());
      
      // Emit message update to chat participants
      try {
        const realtime = enhancedRealtimeService;
        if (realtime && typeof realtime.to === 'function') {
          realtime.to(`dating-chat:${messageDoc.chatId}`).emit('dating_message_update', {
            messageId: messageDoc._id,
            chatId: messageDoc.chatId,
            content: messageDoc.content,
            editedAt: messageDoc.editedAt
          });
          
          const chat = await DatingChat.findById(messageDoc.chatId)
            .select('participants')
            .lean();
          chat.participants.forEach(participantId => {
            realtime.to(`user:${participantId}`).emit('dating_message_update', {
              messageId: messageDoc._id,
              chatId: messageDoc.chatId,
              content: messageDoc.content,
              editedAt: messageDoc.editedAt
            });
          });
        }
      } catch (wsError) {
        console.error('[DatingMessageService] WebSocket emission error:', wsError);
      }
      
      return {
        messageId: messageDoc._id,
        content: messageDoc.content,
        editedAt: messageDoc.editedAt
      };
      
    } catch (error) {
      console.error('[DatingMessageService] editMessage error:', error);
      throw error;
    }
  }

  /**
   * Delete a dating message
   * @param {string} messageId - Message ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Deletion result
   */
  static async deleteMessage(messageId, userId, deleteForEveryone = false) {
    try {
      // Input validation
      if (!messageId || !userId) {
        throw new Error('Message ID and User ID are required');
      }
      
      const message = await DatingMessage.findById(messageId)
        .select('senderId chatId deletedBy createdAt');
      if (!message) {
        throw new Error('Dating message not found');
      }
      
      // Check ownership for "Delete for Everyone"
      const userIdStr = userId.toString();
      if (deleteForEveryone && message.senderId.toString() !== userIdStr) {
        throw new Error('You can only delete your own messages for everyone');
      }
      
      // Check if message is already deleted by this user using Set for O(1) lookup
      const deletedBySet = new Set((message.deletedBy || []).map(d => d.userId.toString()));
      if (deletedBySet.has(userIdStr)) {
        throw new Error('Message already deleted by this user');
      }
      
      // Delete message (method handles time restrictions and validation)
      await message.deleteForUser(userId, deleteForEveryone);
      
      // Reload message to get updated values
      let refreshedMessage = null;
      try {
        refreshedMessage = await DatingMessage.findById(messageId);
      } catch (refreshError) {
        console.error('[DatingMessageService] Error reloading message:', refreshError);
        // Continue with original message if reload fails
      }
      
      // Get chat for real-time updates (lean for read-only access)
      const DatingChat = require('../models/datingChatModel');
      const chat = await DatingChat.findById(message.chatId)
        .select('participants')
        .lean();
      
      // Emit real-time deletion event
      const realtime = enhancedRealtimeService;
      if (realtime && realtime.io) {
        if (deleteForEveryone) {
          // Emit to all chat participants
          realtime.io.to(`dating-chat:${message.chatId}`).emit('dating_message_deleted', {
            messageId: message._id,
            chatId: message.chatId,
            deletedForEveryone: true,
            deletedBy: userId,
            timestamp: new Date()
          });
          console.log(`🔵 [DATING_MESSAGE_SERVICE] Message ${message._id} deleted for everyone - event emitted to chat ${message.chatId}`);
        } else {
          // Emit only to deleting user
          realtime.io.to(`user:${userId}`).emit('dating_message_deleted', {
            messageId: message._id,
            chatId: message.chatId,
            deletedForEveryone: false,
            deletedBy: userId,
            timestamp: new Date()
          });
          console.log(`🔵 [DATING_MESSAGE_SERVICE] Message ${message._id} deleted for user ${userId} only`);
        }
      }
      
      // Use refreshed message if available, otherwise use original message or fallback values
      const finalMessage = refreshedMessage || message;
      const finalMessageId = finalMessage && finalMessage._id ? finalMessage._id.toString() : messageId.toString();
      const finalIsDeleted = finalMessage && finalMessage.isDeleted === true;
      
      // Use the deleteForEveryone parameter we already have, or get it from the message if available
      let finalDeletedForEveryone = deleteForEveryone;
      if (finalMessage && typeof finalMessage.deletedForEveryone === 'boolean') {
        finalDeletedForEveryone = finalMessage.deletedForEveryone;
      }
      
      return {
        messageId: finalMessageId,
        isDeleted: finalIsDeleted,
        deletedForEveryone: finalDeletedForEveryone
      };
      
    } catch (error) {
      console.error('[DatingMessageService] deleteMessage error:', error);
      throw error;
    }
  }

  /**
   * Add reaction to a dating message
   * @param {string} messageId - Message ID
   * @param {string} userId - User ID
   * @param {string} emoji - Emoji reaction
   * @returns {Promise<Object>} Updated reactions
   */
  static async reactToMessage(messageId, userId, emoji) {
    try {
      if (!messageId || !userId || !emoji) {
        throw new Error('Message ID, User ID, and emoji are required');
      }
      
      const message = await DatingMessage.findById(messageId)
        .select('chatId isDeleted');
      if (!message) {
        throw new Error('Dating message not found');
      }
      
      // Check if user is participant in the chat with lean query and Set lookup
      const chat = await DatingChat.findById(message.chatId)
        .select('participants')
        .lean();
      const participantSet = new Set(chat.participants.map(p => p.toString()));
      const userIdStr = userId.toString();
      if (!participantSet.has(userIdStr)) {
        throw new Error('Access denied to this message');
      }
      
      // Check if message is deleted
      if (message.isDeleted) {
        throw new Error('Cannot react to deleted message');
      }
      
      // Fetch full message for instance method
      const messageDoc = await DatingMessage.findById(messageId);
      await messageDoc.addReaction(userId, emoji);
      
      // Emit reaction to chat participants
      try {
        const realtime = enhancedRealtimeService;
        if (realtime && typeof realtime.to === 'function') {
          const reactionData = {
            messageId: messageDoc._id,
            chatId: messageDoc.chatId,
            reactions: messageDoc.reactions
          };
          
          realtime.to(`dating-chat:${messageDoc.chatId}`).emit('dating_message_reaction', reactionData);
          
          chat.participants.forEach(participantId => {
            realtime.to(`user:${participantId}`).emit('dating_message_reaction', reactionData);
          });
        }
      } catch (wsError) {
        console.error('[DatingMessageService] WebSocket emission error:', wsError);
      }
      
      return {
        messageId: messageDoc._id,
        reactions: messageDoc.reactions
      };
      
    } catch (error) {
      console.error('[DatingMessageService] reactToMessage error:', error);
      throw error;
    }
  }

  /**
   * Remove reaction from a dating message
   * @param {string} messageId - Message ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Updated reactions
   */
  static async removeReaction(messageId, userId) {
    try {
      if (!messageId || !userId) {
        throw new Error('Message ID and User ID are required');
      }
      
      const message = await DatingMessage.findById(messageId)
        .select('chatId');
      if (!message) {
        throw new Error('Dating message not found');
      }
      
      // Check if user is participant in the chat with lean query and Set lookup
      const chat = await DatingChat.findById(message.chatId)
        .select('participants')
        .lean();
      const participantSet = new Set(chat.participants.map(p => p.toString()));
      const userIdStr = userId.toString();
      if (!participantSet.has(userIdStr)) {
        throw new Error('Access denied to this message');
      }
      
      // Fetch full message for instance method
      const messageDoc = await DatingMessage.findById(messageId);
      await messageDoc.removeReaction(userId);
      
      // Emit reaction update to chat participants
      try {
        const realtime = enhancedRealtimeService;
        if (realtime && typeof realtime.to === 'function') {
          realtime.to(`dating-chat:${messageDoc.chatId}`).emit('dating_message_reaction', {
            messageId: messageDoc._id,
            chatId: messageDoc.chatId,
            reactions: messageDoc.reactions
          });
          
          chat.participants.forEach(participantId => {
            realtime.to(`user:${participantId}`).emit('dating_message_reaction', {
              messageId: messageDoc._id,
              chatId: messageDoc.chatId,
              reactions: messageDoc.reactions
            });
          });
        }
      } catch (wsError) {
        console.error('[DatingMessageService] WebSocket emission error:', wsError);
      }
      
      return {
        messageId: messageDoc._id,
        reactions: messageDoc.reactions
      };
      
    } catch (error) {
      console.error('[DatingMessageService] removeReaction error:', error);
      throw error;
    }
  }

  /**
   * Forward a dating message to another chat
   * @param {string} messageId - Original message ID
   * @param {string} targetChatId - Target chat ID
   * @param {string} userId - User ID forwarding the message
   * @returns {Promise<Object>} Forwarded message
   */
  static async forwardMessage(messageId, targetChatId, userId) {
    try {
      if (!messageId || !targetChatId || !userId) {
        throw new Error('Message ID, Target Chat ID, and User ID are required');
      }
      
      // Find the original message first, then fetch both chats in parallel
      const originalMessage = await DatingMessage.findById(messageId)
        .populate('senderId', 'username fullName profilePictureUrl')
        .select('chatId content media senderId')
        .lean();
      
      if (!originalMessage) {
        throw new Error('Original message not found');
      }
      
      // Fetch both chats in parallel with lean queries
      const [originalChat, targetChat] = await Promise.all([
        DatingChat.findById(originalMessage.chatId)
          .select('participants')
          .lean(),
        DatingChat.findById(targetChatId)
          .select('participants lastMessage lastMessageAt')
          .lean()
      ]);
      
      // Check access using Set for O(1) lookup
      const userIdStr = userId.toString();
      const originalParticipantSet = new Set(originalChat.participants.map(p => p.toString()));
      const targetParticipantSet = new Set(targetChat.participants.map(p => p.toString()));
      
      if (!originalParticipantSet.has(userIdStr)) {
        throw new Error('Access denied to original message');
      }
      if (!targetParticipantSet.has(userIdStr)) {
        throw new Error('Access denied to target chat');
      }
      
      // Create forwarded message
      const forwardedMessage = new DatingMessage({
        chatId: targetChatId,
        senderId: userId,
        type: 'forwarded',
        content: originalMessage.content,
        media: originalMessage.media,
        forwardedFrom: originalMessage._id,
        status: 'sent'
      });
      
      await forwardedMessage.save();
      
      // Update target chat's last message and increment unread count atomically
      const userIdObj = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
      await DatingChat.updateOne(
        { _id: targetChatId },
        {
          $set: {
            lastMessage: forwardedMessage._id,
            lastMessageAt: new Date()
          },
          $inc: {
            'userSettings.$[elem].unreadCount': 1
          }
        },
        {
          arrayFilters: [
            { 'elem.userId': { $ne: userIdObj } }
          ]
        }
      );
      
      // Emit real-time message to target chat participants
      const realtime = enhancedRealtimeService;
      if (realtime && realtime.emitDatingMessage) {
        realtime.emitDatingMessage(targetChatId, {
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
      } else if (realtime && realtime.emitNewMessage) {
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
      console.error('[DatingMessageService] forwardMessage error:', error);
      throw error;
    }
  }

  /**
   * Search messages in a dating chat
   * @param {string} chatId - Chat ID
   * @param {string} userId - User ID
   * @param {string} query - Search query
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise<Object>} Search results
   */
  static async searchMessages(chatId, userId, query, page = 1, limit = 20) {
    try {
      if (!chatId || !userId || !query || query.trim() === '') {
        throw new Error('Chat ID, User ID, and search query are required');
      }
      
      if (page < 1 || limit < 1 || limit > 100) {
        throw new Error('Invalid pagination parameters');
      }
      
      // Validate chat access with lean query and Set lookup
      const chat = await DatingChat.findById(chatId)
        .select('participants')
        .lean();
      if (!chat) {
        throw new Error('Dating chat not found');
      }
      
      const participantSet = new Set(chat.participants.map(p => p.toString()));
      const userIdStr = userId.toString();
      if (!participantSet.has(userIdStr)) {
        throw new Error('Access denied to this dating chat');
      }
      
      const messages = await DatingMessage.searchMessages(chatId, query.trim(), userId, page, limit);
      
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
      console.error('[DatingMessageService] searchMessages error:', error);
      throw error;
    }
  }

  /**
   * Get media messages in a dating chat
   * @param {string} chatId - Chat ID
   * @param {string} userId - User ID
   * @param {string} type - Media type filter
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise<Object>} Media messages
   */
  static async getChatMedia(chatId, userId, type = null, page = 1, limit = 20) {
    try {
      if (!chatId || !userId) {
        throw new Error('Chat ID and User ID are required');
      }
      
      if (page < 1 || limit < 1 || limit > 100) {
        throw new Error('Invalid pagination parameters');
      }
      
      // Validate chat access with lean query and Set lookup
      const chat = await DatingChat.findById(chatId)
        .select('participants')
        .lean();
      if (!chat) {
        throw new Error('Dating chat not found');
      }
      
      const participantSet = new Set(chat.participants.map(p => p.toString()));
      const userIdStr = userId.toString();
      if (!participantSet.has(userIdStr)) {
        throw new Error('Access denied to this dating chat');
      }
      
      const mediaMessages = await DatingMessage.getChatMedia(chatId, type, userId, page, limit);
      
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
      console.error('[DatingMessageService] getChatMedia error:', error);
      throw error;
    }
  }

  /**
   * Get dating message details
   * @param {string} messageId - Message ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Message details
   */
  static async getMessageDetails(messageId, userId) {
    try {
      if (!messageId || !userId) {
        throw new Error('Message ID and User ID are required');
      }
      
      const message = await DatingMessage.findById(messageId)
        .populate('senderId', 'username fullName profilePictureUrl')
        .populate('replyTo', 'content type senderId')
        .populate('forwardedFrom', 'content type senderId')
        .populate('reactions.userId', 'username fullName')
        .lean();
      
      if (!message) {
        throw new Error('Dating message not found');
      }
      
      // Check if user is participant in the chat with lean query and Set lookup
      const chat = await DatingChat.findById(message.chatId)
        .select('participants')
        .lean();
      const participantSet = new Set(chat.participants.map(p => p.toString()));
      const userIdStr = userId.toString();
      if (!participantSet.has(userIdStr)) {
        throw new Error('Access denied to this message');
      }
      
      // Check if message is deleted by this user using Set for O(1) lookup
      const deletedBySet = new Set((message.deletedBy || []).map(d => d.userId?.toString() || d.toString()));
      if (deletedBySet.has(userIdStr)) {
        throw new Error('Message not found');
      }
      
      return message;
      
    } catch (error) {
      console.error('[DatingMessageService] getMessageDetails error:', error);
      throw error;
    }
  }

  /**
   * Mark a one-view message as viewed
   * @param {string} messageId - Message ID
   * @param {string} userId - User ID who viewed the message
   * @returns {Promise<Object>} Updated message
   */
  static async markOneViewAsViewed(messageId, userId) {
    try {
      // Find the message
      const message = await DatingMessage.findById(messageId);
      if (!message) {
        throw new Error('Dating message not found');
      }
      
      // Check if it's a one-view message
      if (!message.isOneView) {
        throw new Error('Message is not a one-view message');
      }
      
      // Check if already viewed by this user using Set for O(1) lookup
      const userIdStr = userId.toString();
      const viewedBySet = new Set((message.viewedBy || []).map(v => v.userId?.toString() || v.toString()));
      if (viewedBySet.has(userIdStr)) {
        return message;
      }
      
      // Add user to viewedBy array
      message.viewedBy.push({
        userId: userId,
        viewedAt: new Date()
      });
      
      // Check if message has expired
      if (message.oneViewExpiresAt && new Date() > message.oneViewExpiresAt) {
        // Optionally delete the media or mark as expired
        message.isDeleted = true;
      }
      
      await message.save();
      await message.populate([
        { path: 'senderId', select: 'username fullName profilePictureUrl' },
        { path: 'viewedBy.userId', select: 'username fullName' }
      ]);
      
      return message;
      
    } catch (error) {
      console.error('[DatingMessageService] markOneViewAsViewed error:', error);
      throw error;
    }
  }
}

module.exports = DatingMessageService;

