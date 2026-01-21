const { Server } = require('socket.io');
const { verifyAccessToken } = require('../utils/Jwt');
const Chat = require('../user/social/userModel/chatModel');
const Message = require('../user/social/userModel/messageModel');
const Call = require('../user/social/userModel/callModel');
const User = require('../user/auth/model/userAuthModel');
const UserStatus = require('../user/social/userModel/userStatusModel');

/**
 * Enhanced Real-time Service with comprehensive WebRTC and chat features
 */
class EnhancedRealtimeService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // userId -> Set of socketIds (supports multiple connections per user)
    this.userRooms = new Map(); // userId -> Set of room names
    this.activeCalls = new Map(); // callId -> call data
  }

  /**
   * Initialize the real-time service
   * @param {Object} server - HTTP server instance
   * @param {Object} options - Configuration options
   */
  init(server, options = {}) {
    const {
      corsOrigin = process.env.CORS_ORIGIN || '*',
      requireAuth = true,
      cleanupInterval = 30000 // 30 seconds
    } = options;

    this.io = new Server(server, {
      cors: {
        origin: corsOrigin,
        credentials: true,
        methods: ['GET', 'POST']
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000
    });

    this.setupMiddleware(requireAuth);
    this.setupEventHandlers();
    this.startCleanupInterval(cleanupInterval);

    console.log('Enhanced Real-time Service initialized');
    return this.io;
  }

  /**
   * Setup middleware for authentication and user management
   */
  setupMiddleware(requireAuth) {
    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        if (!requireAuth) {
          return next();
        }

        const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        let decoded;
        try {
          decoded = verifyAccessToken(token);
        } catch (error) {
          // If token is expired, allow connection but emit token:expired event
          if (error.name === 'TokenExpiredError' || error.message?.includes('expired')) {
            // Decode without verification to get userId
            const { decodeToken } = require('../utils/Jwt');
            decoded = decodeToken(token);
            
            if (decoded && decoded.userId) {
              const user = await User.findById(decoded.userId).select('_id username fullName isActive');
              if (user && user.isActive !== false) {
                // Allow connection but mark token as expired
                socket.userId = user._id.toString();
                socket.user = user;
                socket.tokenExpired = true;
                socket.userInfo = {
                  _id: user._id,
                  username: user.username,
                  fullName: user.fullName,
                  profilePictureUrl: user.profilePictureUrl
                };
                
                // Emit token expired event after connection
                setTimeout(() => {
                  socket.emit('token:expired', {
                    message: 'Token expired. Please refresh your token.',
                    timestamp: new Date()
                  });
                }, 100);
                
                return next();
              }
            }
          }
          throw error; // Re-throw if not expired or can't decode
        }
        
        const user = await User.findById(decoded.userId).select('_id username fullName isActive');
        
        if (!user) {
          return next(new Error('User not found'));
        }
        
        // For testing: only reject if explicitly set to false
        // In production, you should enforce isActive: true
        if (user.isActive === false) {
          return next(new Error('User account is deactivated'));
        }

        socket.userId = user._id.toString();
        socket.user = user;
        
        // Store user info in socket for easy access
        socket.userInfo = {
          _id: user._id,
          username: user.username,
          fullName: user.fullName,
          profilePictureUrl: user.profilePictureUrl
        };
        
        next();
      } catch (error) {
        console.error('Socket authentication error:', error);
        next(new Error('Authentication failed'));
      }
    });

    // Connection middleware
    this.io.use((socket, next) => {
      // Store connection metadata
      socket.connectedAt = new Date();
      socket.lastActivity = new Date();
      next();
    });
  }

  /**
   * Setup event handlers for all socket events
   */
  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`[REALTIME_SERVICE] 🔗 User ${socket.userId} connected with socket ${socket.id}`, {
        userId: socket.userId,
        socketId: socket.id,
        connectedAt: socket.connectedAt,
        timestamp: new Date().toISOString(),
        totalConnections: this.connectedUsers.size
      });

      // Handle user connection
      this.handleUserConnection(socket);

      // Chat events
      this.setupChatEvents(socket);
      
      // Call events
      this.setupCallEvents(socket);
      
      // WebRTC signaling events
      this.setupWebRTCEvents(socket);
      
      // User presence events
      this.setupPresenceEvents(socket);
      
      // Notification events
      this.setupNotificationEvents(socket);
      
      // Token refresh events
      this.setupTokenRefreshEvents(socket);
      
      // Error handling
      this.setupErrorHandling(socket);
      
      // Disconnection handling
      this.setupDisconnectionHandling(socket);
    });
  }

  /**
   * Handle user connection and setup
   * Supports multiple connections per user (multiple devices/tabs)
   */
  handleUserConnection(socket) {
    const userId = socket.userId;
    
    // Get or create Set of socket IDs for this user
    if (!this.connectedUsers.has(userId)) {
      this.connectedUsers.set(userId, new Set());
    }
    
    const userSockets = this.connectedUsers.get(userId);
    const isNewConnection = !userSockets.has(socket.id);
    
    if (isNewConnection) {
      userSockets.add(socket.id);
      console.log(`[CONNECTION] ➕ User ${userId} added new connection (socket ${socket.id}). Total connections: ${userSockets.size}`);
    } else {
      console.log(`[CONNECTION] 🔄 User ${userId} reconnected with existing socket ${socket.id}`);
    }
    
    // Join user's personal room
    socket.join(`user:${userId}`);
    
    // Update user online status (only if this is the first connection)
    if (isNewConnection && userSockets.size === 1) {
      this.updateUserStatus(userId, 'online');
      
      // Notify other users about online status (only once, not for each connection)
      socket.broadcast.emit('user_online', {
        userId: userId,
        username: socket.user.username,
        fullName: socket.user.fullName,
        profilePictureUrl: socket.user.profilePictureUrl,
        timestamp: new Date()
      });
    }
    
    // Emit connection success
    socket.emit('connection_success', {
      userId: userId,
      socketId: socket.id,
      totalConnections: userSockets.size,
      timestamp: new Date()
    });
    
    console.log(`[CONNECTION] ✅ User ${userId} (${socket.user.username}) connected successfully (${userSockets.size} active connection(s))`);
  }

  /**
   * Setup chat-related event handlers (social chats)
   */
  setupChatEvents(socket) {
    // Join social chat room
    socket.on('join_chat', async (chatId) => {
      console.log('🔵 [REALTIME_SVC] join_chat event received:', {
        userId: socket.userId,
        username: socket.user?.username,
        chatId: chatId,
        socketId: socket.id,
        timestamp: new Date().toISOString()
      });
      try {
        const userId = socket.userId;
        
        // Validate chat access (social chat)
        console.log('🔵 [REALTIME_SVC] Validating chat access...', { chatId, userId });
        const chat = await Chat.findById(chatId);
        if (!chat || !chat.participants.includes(userId)) {
          console.error('❌ [REALTIME_SVC] Access denied to social chat:', { chatId, userId, participants: chat?.participants, chatExists: !!chat });
          socket.emit('error', { message: 'Access denied to this chat' });
          return;
        }
        console.log('✅ [REALTIME_SVC] Chat access validated');

        // Join social chat room
        const room = `chat:${chatId}`;
        console.log('🔵 [REALTIME_SVC] Joining room:', room);
        socket.join(room);
        
        const clientsInRoom = this.io.sockets.adapter.rooms.get(room);
        const clientCount = clientsInRoom ? clientsInRoom.size : 0;
        console.log('✅ [REALTIME_SVC] User joined social chat room:', { userId, chatId, room, clientCount });
        
        // Mark messages as read and emit status updates
        console.log('🔵 [REALTIME_SVC] Marking messages as read...', { chatId, userId });
        const updatedMessages = await Message.find({
          chatId: chatId,
          senderId: { $ne: userId },
          'readBy.userId': { $ne: userId },
          isDeleted: false
        }).limit(100); // Limit to recent messages to avoid performance issues
        
        await Message.markChatAsRead(chatId, userId);
        console.log('✅ [REALTIME_SVC] Messages marked as read');
        
        // Emit status updates for each message that was marked as read
        // Note: room variable is already declared above
        for (const msg of updatedMessages) {
          this.io.to(room).emit('message_status_update', {
            messageId: msg._id,
            chatId: chatId,
            status: 'read',
            timestamp: new Date()
          });
        }
        console.log('✅ [REALTIME_SVC] Status updates emitted for', updatedMessages.length, 'messages');
        
        // Reset unread count
        console.log('🔵 [REALTIME_SVC] Resetting unread count...', { chatId, userId });
        chat.resetUnreadCount(userId);
        await chat.save();
        console.log('✅ [REALTIME_SVC] Unread count reset');
        
        // Notify other participants
        console.log('🔵 [REALTIME_SVC] Notifying other participants...', { chatId, room });
        socket.to(room).emit('user_joined_chat', {
          userId: userId,
          username: socket.user.username,
          chatId: chatId,
          timestamp: new Date()
        });
        console.log('✅ [REALTIME_SVC] Other participants notified');

        socket.emit('chat_joined', { chatId, timestamp: new Date() });
        console.log('✅ [REALTIME_SVC] Join confirmation sent to user');
      } catch (error) {
        console.error('❌ [REALTIME_SVC] Error joining social chat:', { error: error.message, stack: error.stack, chatId, userId: socket.userId });
        socket.emit('error', { message: 'Failed to join chat' });
      }
    });

    // Join dating chat room
    socket.on('join_dating_chat', async (chatId) => {
      try {
        console.log('[REALTIME_SERVICE] 💕 Join dating chat request:', {
          userId: socket.userId,
          username: socket.user?.username,
          chatId: chatId
        });
        
        const userId = socket.userId;
        
        // Validate chat access (dating chat)
        const DatingChat = require('../user/dating/models/datingChatModel');
        const chat = await DatingChat.findById(chatId);
        if (!chat || !chat.participants.some(p => p.toString() === userId)) {
          console.log('[REALTIME_SERVICE] ❌ Access denied to dating chat:', { chatId, userId, participants: chat?.participants });
          socket.emit('error', { message: 'Access denied to this dating chat' });
          return;
        }

        // Join dating chat room
        socket.join(`dating-chat:${chatId}`);
        console.log('[REALTIME_SERVICE] ✅ User joined dating chat room:', { userId, chatId, room: `dating-chat:${chatId}` });
        
        // Mark messages as read
        const DatingMessage = require('../user/dating/models/datingMessageModel');
        await DatingMessage.markChatAsRead(chatId, userId);
        
        // Reset unread count
        chat.resetUnreadCount(userId);
        await chat.save();
        
        // Notify other participants
        socket.to(`dating-chat:${chatId}`).emit('user_joined_dating_chat', {
          userId: userId,
          username: socket.user.username,
          chatId: chatId,
          timestamp: new Date()
        });

        socket.emit('dating_chat_joined', { chatId, timestamp: new Date() });
      } catch (error) {
        console.error('Error joining dating chat:', error);
        socket.emit('error', { message: 'Failed to join dating chat' });
      }
    });

    // Leave social chat room
    socket.on('leave_chat', (chatId) => {
      socket.leave(`chat:${chatId}`);
      
      socket.to(`chat:${chatId}`).emit('user_left_chat', {
        userId: socket.userId,
        username: socket.user.username,
        chatId: chatId,
        timestamp: new Date()
      });
    });

    // Leave dating chat room
    socket.on('leave_dating_chat', (chatId) => {
      socket.leave(`dating-chat:${chatId}`);
      
      socket.to(`dating-chat:${chatId}`).emit('user_left_dating_chat', {
        userId: socket.userId,
        username: socket.user.username,
        chatId: chatId,
        timestamp: new Date()
      });
    });

    // Typing indicators
    socket.on('typing_start', (data) => {
      console.log('[REALTIME_SERVICE] ⌨️ Typing start received:', {
        userId: socket.userId,
        username: socket.user?.username,
        chatId: data.chatId,
        data: data
      });
      
      const { chatId } = data;
      socket.to(`chat:${chatId}`).emit('user_typing', {
        userId: socket.userId,
        username: socket.user.username,
        chatId: chatId,
        isTyping: true,
        timestamp: new Date()
      });
      
      console.log('[REALTIME_SERVICE] ✅ Typing start broadcasted to chat:', chatId);
    });

    socket.on('typing_stop', (data) => {
      console.log('[REALTIME_SERVICE] ⌨️ Typing stop received:', {
        userId: socket.userId,
        username: socket.user?.username,
        chatId: data.chatId,
        data: data
      });
      
      const { chatId } = data;
      socket.to(`chat:${chatId}`).emit('user_typing', {
        userId: socket.userId,
        username: socket.user.username,
        chatId: chatId,
        isTyping: false,
        timestamp: new Date()
      });
      
      console.log('[REALTIME_SERVICE] ✅ Typing stop broadcasted to chat:', chatId);
    });

    // Dating typing indicators
    socket.on('typing_start_dating', async (data) => {
      try {
        console.log('[REALTIME_SERVICE] ⌨️💕 Typing start (dating) received:', {
          userId: socket.userId,
          username: socket.user?.username,
          chatId: data.chatId,
          data: data
        });
        
        const { chatId } = data;
        const userId = socket.userId;
        
        // Validate chat access (dating chat)
        const DatingChat = require('../user/dating/models/datingChatModel');
        const chat = await DatingChat.findById(chatId);
        if (!chat || !chat.participants.some(p => p.toString() === userId)) {
          console.log('[REALTIME_SERVICE] ❌ Access denied to dating chat for typing:', { chatId, userId });
          socket.emit('error', { message: 'Access denied to this dating chat' });
          return;
        }
        
        socket.to(`dating-chat:${chatId}`).emit('user_typing_dating', {
          userId: socket.userId,
          username: socket.user.username,
          chatId: chatId,
          isTyping: true,
          timestamp: new Date()
        });
        
        console.log('[REALTIME_SERVICE] ✅ Typing start (dating) broadcasted to chat:', chatId);
      } catch (error) {
        console.error('[REALTIME_SERVICE] Error handling dating typing start:', error);
        socket.emit('error', { message: 'Failed to send typing indicator' });
      }
    });

    socket.on('typing_stop_dating', async (data) => {
      try {
        console.log('[REALTIME_SERVICE] ⌨️💕 Typing stop (dating) received:', {
          userId: socket.userId,
          username: socket.user?.username,
          chatId: data.chatId,
          data: data
        });
        
        const { chatId } = data;
        const userId = socket.userId;
        
        // Validate chat access (dating chat)
        const DatingChat = require('../user/dating/models/datingChatModel');
        const chat = await DatingChat.findById(chatId);
        if (!chat || !chat.participants.some(p => p.toString() === userId)) {
          console.log('[REALTIME_SERVICE] ❌ Access denied to dating chat for typing:', { chatId, userId });
          socket.emit('error', { message: 'Access denied to this dating chat' });
          return;
        }
        
        socket.to(`dating-chat:${chatId}`).emit('user_typing_dating', {
          userId: socket.userId,
          username: socket.user.username,
          chatId: chatId,
          isTyping: false,
          timestamp: new Date()
        });
        
        console.log('[REALTIME_SERVICE] ✅ Typing stop (dating) broadcasted to chat:', chatId);
      } catch (error) {
        console.error('[REALTIME_SERVICE] Error handling dating typing stop:', error);
        socket.emit('error', { message: 'Failed to send typing indicator' });
      }
    });

    // Social message events
    socket.on('new_message', async (data) => {
      console.log('🔵 [REALTIME_SVC] new_message event received via socket:', {
        userId: socket.userId,
        username: socket.user?.username,
        chatId: data?.chatId,
        type: data?.type,
        hasContent: !!data?.content,
        timestamp: new Date().toISOString()
      });
      try {
        const { chatId, content, type, replyTo, forwardedFrom } = data;
        
        // Validate chat access (social chat)
        console.log('🔵 [REALTIME_SVC] Validating chat access for socket message...', { chatId, userId: socket.userId });
        const chat = await Chat.findById(chatId);
        if (!chat || !chat.participants.includes(socket.userId)) {
          console.error('❌ [REALTIME_SVC] Access denied to social chat via socket:', { chatId, userId: socket.userId, chatExists: !!chat });
          socket.emit('error', { message: 'Access denied to this chat' });
          return;
        }
        console.log('✅ [REALTIME_SVC] Chat access validated');

        // Check for duplicate message (same content, sender, and chat within last 5 seconds)
        // This prevents duplicate creation when API and socket both try to create the same message
        const fiveSecondsAgo = new Date(Date.now() - 5000);
        const duplicateCheck = await Message.findOne({
          chatId: chatId,
          senderId: socket.userId,
          content: content,
          createdAt: { $gte: fiveSecondsAgo }
        });

        if (duplicateCheck) {
          console.log('⚠️ [REALTIME_SVC] Duplicate message detected, skipping creation:', { 
            existingMessageId: duplicateCheck._id,
            chatId,
            contentPreview: content?.substring(0, 50)
          });
          
          // Populate and broadcast the existing message instead
          await duplicateCheck.populate('senderId', 'username fullName profilePictureUrl');
          const messageDataForBroadcast = {
            _id: duplicateCheck._id,
            chatId: duplicateCheck.chatId,
            senderId: duplicateCheck.senderId,
            type: duplicateCheck.type,
            content: duplicateCheck.content,
            createdAt: duplicateCheck.createdAt,
            status: duplicateCheck.status,
            media: duplicateCheck.media,
            location: duplicateCheck.location,
            musicMetadata: duplicateCheck.musicMetadata,
            isOneView: duplicateCheck.isOneView,
            oneViewExpiresAt: duplicateCheck.oneViewExpiresAt,
            viewedBy: duplicateCheck.viewedBy,
            gifSource: duplicateCheck.gifSource,
            gifId: duplicateCheck.gifId,
            isAnimated: duplicateCheck.isAnimated,
            sender: {
              _id: duplicateCheck.senderId._id,
              username: duplicateCheck.senderId.username,
              fullName: duplicateCheck.senderId.fullName,
              profilePictureUrl: duplicateCheck.senderId.profilePictureUrl
            }
          };
          
          const room = `chat:${chatId}`;
          this.io.to(room).emit('message_received', messageDataForBroadcast);
          console.log('✅ [REALTIME_SVC] Existing message broadcasted to room:', { room, messageId: duplicateCheck._id });
          return;
        }

        // Create message
        console.log('🔵 [REALTIME_SVC] Creating message from socket event...', { chatId, type, contentLength: content?.length });
        const message = new Message({
          chatId,
          senderId: socket.userId,
          type: type || 'text',
          content,
          replyTo,
          forwardedFrom,
          status: 'sent'
        });

        await message.save();
        console.log('✅ [REALTIME_SVC] Message saved:', { messageId: message._id });
        
        await message.populate('senderId', 'username fullName profilePictureUrl');
        console.log('✅ [REALTIME_SVC] Message populated');

        // Update chat's last message
        console.log('🔵 [REALTIME_SVC] Updating chat...', { chatId });
        chat.lastMessage = message._id;
        chat.lastMessageAt = new Date();
        await chat.save();
        console.log('✅ [REALTIME_SVC] Chat updated');

        // Broadcast message to social chat participants
        const room = `chat:${chatId}`;
        const clientsInRoom = this.io.sockets.adapter.rooms.get(room);
        const clientCount = clientsInRoom ? clientsInRoom.size : 0;
        console.log('🔵 [REALTIME_SVC] Broadcasting message to room:', { room, clientCount });
        
        const messageDataForBroadcast = {
          _id: message._id,
          chatId: message.chatId,
          senderId: message.senderId,
          type: message.type,
          content: message.content,
          createdAt: message.createdAt,
          status: message.status,
          media: message.media,
          location: message.location,
          musicMetadata: message.musicMetadata,
          isOneView: message.isOneView,
          oneViewExpiresAt: message.oneViewExpiresAt,
          viewedBy: message.viewedBy,
          gifSource: message.gifSource,
          gifId: message.gifId,
          isAnimated: message.isAnimated,
          sender: {
            _id: message.senderId._id,
            username: message.senderId.username,
            fullName: message.senderId.fullName,
            profilePictureUrl: message.senderId.profilePictureUrl
          }
        };
        
        this.io.to(room).emit('message_received', messageDataForBroadcast);
        console.log('✅ [REALTIME_SVC] Message broadcasted to room:', { room, clientCount, messageId: message._id });

        // Emit delivered status update to sender (if they're in the room)
        // Check if sender is online and in the chat room
        const senderRoom = `user:${socket.userId}`;
        this.io.to(senderRoom).emit('message_status_update', {
          messageId: message._id,
          chatId: chatId,
          status: 'delivered',
          timestamp: new Date()
        });
        console.log('✅ [REALTIME_SVC] Delivered status update emitted to sender');

        // Update unread counts for other participants
        let notificationsSent = 0;
        chat.participants.forEach(participantId => {
          if (participantId.toString() !== socket.userId) {
            chat.incrementUnreadCount(participantId);
            
            // Notify user about new message
            const userRoom = `user:${participantId}`;
            this.io.to(userRoom).emit('new_message_notification', {
              chatId: chatId,
              messageId: message._id,
              sender: message.senderId.username,
              content: message.content,
              type: message.type,
              timestamp: message.createdAt
            });
            notificationsSent++;
          }
        });
        console.log('✅ [REALTIME_SVC] Unread counts updated and notifications sent:', { notificationsSent });

      } catch (error) {
        console.error('❌ [REALTIME_SVC] Error handling new social message:', { error: error.message, stack: error.stack, chatId: data?.chatId, userId: socket.userId });
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Dating message events
    socket.on('new_dating_message', async (data) => {
      try {
        const { chatId, content, type, replyTo, forwardedFrom } = data;
        
        // Validate chat access (dating chat)
        const DatingChat = require('../user/dating/models/datingChatModel');
        const chat = await DatingChat.findById(chatId);
        if (!chat || !chat.participants.some(p => p.toString() === socket.userId)) {
          socket.emit('error', { message: 'Access denied to this dating chat' });
          return;
        }

        // Create message
        const DatingMessage = require('../user/dating/models/datingMessageModel');
        const message = new DatingMessage({
          chatId,
          senderId: socket.userId,
          type: type || 'text',
          content,
          replyTo,
          forwardedFrom,
          status: 'sent'
        });

        await message.save();
        await message.populate('senderId', 'username fullName profilePictureUrl');

        // Update chat's last message
        chat.lastMessage = message._id;
        chat.lastMessageAt = new Date();
        await chat.save();

        // Broadcast message to dating chat participants
        this.io.to(`dating-chat:${chatId}`).emit('dating_message_received', {
          _id: message._id,
          chatId: message.chatId,
          senderId: message.senderId,
          type: message.type,
          content: message.content,
          createdAt: message.createdAt,
          status: message.status,
          sender: {
            _id: message.senderId._id,
            username: message.senderId.username,
            fullName: message.senderId.fullName,
            profilePictureUrl: message.senderId.profilePictureUrl
          }
        });

        // Update unread counts for other participants
        chat.participants.forEach(participantId => {
          if (participantId.toString() !== socket.userId) {
            chat.incrementUnreadCount(participantId);
            
            // Notify user about new dating message
            this.io.to(`user:${participantId}`).emit('dating_new_message_notification', {
              chatId: chatId,
              messageId: message._id,
              sender: message.senderId.username,
              content: message.content,
              type: message.type,
              timestamp: message.createdAt
            });
          }
        });

      } catch (error) {
        console.error('Error handling new dating message:', error);
        socket.emit('error', { message: 'Failed to send dating message' });
      }
    });
  }

  /**
   * Setup call-related event handlers
   */
  setupCallEvents(socket) {
    // Call initiation
    socket.on('call:initiate', async (data) => {
      try {
        const { chatId, type, targetUserId } = data;
        
        // Validate chat access
        const chat = await Chat.findById(chatId);
        if (!chat || !chat.participants.includes(socket.userId)) {
          socket.emit('call:error', { message: 'Access denied to this chat' });
          return;
        }

        // Check if target user is online (has at least one connection)
        const targetSockets = this.connectedUsers.get(targetUserId);
        if (!targetSockets || targetSockets.size === 0) {
          socket.emit('call:error', { message: 'User is not available for calls' });
          return;
        }

        // Create call record
        const call = new Call({
          callId: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          chatId,
          initiator: socket.userId,
          participants: [socket.userId, targetUserId],
          type: type || 'audio',
          status: 'ringing'
        });

        await call.save();

        // Store active call
        this.activeCalls.set(call.callId, {
          callId: call.callId,
          chatId,
          initiator: socket.userId,
          participants: [socket.userId, targetUserId],
          type: call.type,
          status: call.status,
          startedAt: call.startedAt
        });

        // Emit call to target user
        this.io.to(`user:${targetUserId}`).emit('call:incoming', {
          callId: call.callId,
          chatId: chatId,
          type: call.type,
          from: {
            _id: socket.userId,
            username: socket.user.username,
            fullName: socket.user.fullName,
            profilePictureUrl: socket.user.profilePictureUrl
          },
          timestamp: new Date()
        });

        // Emit call initiated to caller
        socket.emit('call:initiated', {
          callId: call.callId,
          chatId: chatId,
          type: call.type,
          status: call.status,
          timestamp: new Date()
        });

      } catch (error) {
        console.error('Error initiating call:', error);
        socket.emit('call:error', { message: 'Failed to initiate call' });
      }
    });

    // Call acceptance
    socket.on('call:accept', async (data) => {
      try {
        const { callId } = data;
        
        const callData = this.activeCalls.get(callId);
        if (!callData) {
          socket.emit('call:error', { message: 'Call not found' });
          return;
        }

        // Update call status
        callData.status = 'connected';
        
        // Update database
        const call = await Call.findOne({ callId });
        if (call) {
          call.status = 'connected';
          call.answeredAt = new Date();
          await call.save();
        }

        // Notify both participants
        this.io.to(`user:${callData.initiator}`).emit('call:accepted', {
          callId: callId,
          status: 'connected',
          timestamp: new Date()
        });

        socket.emit('call:accepted', {
          callId: callId,
          status: 'connected',
          timestamp: new Date()
        });

      } catch (error) {
        console.error('Error accepting call:', error);
        socket.emit('call:error', { message: 'Failed to accept call' });
      }
    });

    // Call rejection
    socket.on('call:reject', async (data) => {
      try {
        const { callId, reason } = data;
        
        const callData = this.activeCalls.get(callId);
        if (!callData) {
          socket.emit('call:error', { message: 'Call not found' });
          return;
        }

        // Update call status
        callData.status = 'rejected';
        
        // Update database
        const call = await Call.findOne({ callId });
        if (call) {
          call.status = 'rejected';
          call.endedAt = new Date();
          call.endReason = 'user_rejected';
          call.rejectionReason = reason || 'Call rejected';
          await call.save();
        }

        // Notify caller
        this.io.to(`user:${callData.initiator}`).emit('call:rejected', {
          callId: callId,
          reason: reason || 'Call rejected',
          timestamp: new Date()
        });

        // Remove from active calls
        this.activeCalls.delete(callId);

      } catch (error) {
        console.error('Error rejecting call:', error);
        socket.emit('call:error', { message: 'Failed to reject call' });
      }
    });

    // Call end
    socket.on('call:end', async (data) => {
      try {
        const { callId, reason } = data;
        
        const callData = this.activeCalls.get(callId);
        if (!callData) {
          socket.emit('call:error', { message: 'Call not found' });
          return;
        }

        // Update call status
        callData.status = 'ended';
        
        // Update database
        const call = await Call.findOne({ callId });
        if (call) {
          call.status = 'ended';
          call.endedAt = new Date();
          call.endReason = reason || 'user_ended';
          if (call.startedAt) {
            call.duration = Math.floor((call.endedAt - call.startedAt) / 1000);
          }
          await call.save();
        }

        // Notify all participants
        callData.participants.forEach(participantId => {
          this.io.to(`user:${participantId}`).emit('call:ended', {
            callId: callId,
            reason: reason || 'user_ended',
            duration: call?.duration || 0,
            timestamp: new Date()
          });
        });

        // Remove from active calls
        this.activeCalls.delete(callId);

      } catch (error) {
        console.error('Error ending call:', error);
        socket.emit('call:error', { message: 'Failed to end call' });
      }
    });
  }

  /**
   * Setup WebRTC signaling event handlers
   * Note: WebRTC signaling is handled via HTTP API endpoints, not direct Socket.IO events
   * This method is kept for potential future direct Socket.IO signaling implementation
   */
  setupWebRTCEvents(socket) {
    // WebRTC signaling is currently handled via HTTP API endpoints in CallController
    // Direct Socket.IO WebRTC events are disabled to avoid conflicts
    console.log(`[REALTIME_SERVICE] [WEBRTC] WebRTC signaling for user ${socket.userId} is handled via HTTP API endpoints`);
  }

  /**
   * Emit WebRTC event with comprehensive logging
   * @param {string} event - Event name
   * @param {string} targetRoom - Target room/user
   * @param {Object} data - Event data
   */
  emitWebRTCEvent(event, targetRoom, data) {
    if (!this.io) {
      console.log(`[REALTIME_SERVICE] ❌ Cannot emit ${event} - Socket.IO not initialized`);
      return;
    }

    console.log(`[REALTIME_SERVICE] 📡 Emitting WebRTC event:`, {
      event,
      targetRoom,
      callId: data.callId,
      from: data.from,
      timestamp: data.timestamp,
      hasOffer: !!data.offer,
      hasAnswer: !!data.answer,
      hasCandidate: !!data.candidate,
      sdpLength: data.offer?.sdp?.length || data.answer?.sdp?.length || 0
    });

    // Get room size for debugging
    const room = this.io.sockets.adapter.rooms.get(targetRoom);
    const roomSize = room ? room.size : 0;
    console.log(`[REALTIME_SERVICE] 🔍 Target room info:`, {
      targetRoom,
      roomSize,
      hasListeners: roomSize > 0,
      roomSockets: room ? Array.from(room) : []
    });

    // Get all connected sockets for debugging
    const allSockets = Array.from(this.io.sockets.sockets.keys());
    console.log(`[REALTIME_SERVICE] 🔍 All connected sockets:`, {
      totalSockets: allSockets.length,
      socketIds: allSockets
    });

    // Check if the target user is actually connected
    const targetUserId = targetRoom.replace('user:', '');
    const connectedUserId = this.connectedUsers.get(targetUserId);
    console.log(`[REALTIME_SERVICE] 🔍 Target user connection status:`, {
      targetUserId,
      connectedUserId,
      isConnected: !!connectedUserId,
      socketExists: connectedUserId ? this.io.sockets.sockets.has(connectedUserId) : false
    });

    this.io.to(targetRoom).emit(event, data);
    console.log(`[REALTIME_SERVICE] ✅ WebRTC event ${event} emitted to ${targetRoom}`);
  }

  /**
   * Setup notification event handlers
   */
  setupNotificationEvents(socket) {
    // Listen for notification read events
    socket.on('notification:read', async (data) => {
      try {
        const { notificationId } = data;
        const userId = socket.userId;
        
        // Update notification status via notification service
        const notificationService = require('../notification/services/notificationService');
        await notificationService.markAsRead(notificationId, userId);
        
        // Emit confirmation
        socket.emit('notification:read_confirmed', {
          notificationId,
          timestamp: new Date()
        });
      } catch (error) {
        console.error('[REALTIME] Error handling notification read:', error);
        socket.emit('error', { message: 'Failed to mark notification as read' });
      }
    });

    // Listen for notification preferences updates
    socket.on('notification:preferences_updated', (data) => {
      // Broadcast to user's other connections
      socket.broadcast.to(`user:${socket.userId}`).emit('notification:preferences_changed', data);
    });

    // Listen for notification click/tap events
    socket.on('notification:clicked', async (data) => {
      try {
        const { notificationId } = data;
        const userId = socket.userId;
        
        // Record click analytics
        const Notification = require('../notification/models/notificationModel');
        const notification = await Notification.findOne({
          _id: notificationId,
          recipient: userId
        });
        
        if (notification) {
          await notification.recordClick();
        }
      } catch (error) {
        console.error('[REALTIME] Error recording notification click:', error);
      }
    });
  }

  /**
   * Setup user presence event handlers
   */
  setupPresenceEvents(socket) {
    // Update user status
    socket.on('update_status', async (data) => {
      try {
        const { status } = data;
        await this.updateUserStatus(socket.userId, status);
        
        // Broadcast status update
        socket.broadcast.emit('user_status_update', {
          userId: socket.userId,
          status: status,
          timestamp: new Date()
        });
      } catch (error) {
        console.error('Error updating user status:', error);
        socket.emit('error', { message: 'Failed to update status' });
      }
    });

    // Heartbeat to keep connection alive
    socket.on('ping', () => {
      socket.emit('pong');
      socket.lastActivity = new Date();
      console.log(`[HEARTBEAT] 💓 Ping received from user ${socket.userId}`);
      
      // Update user activity
      this.updateUserActivity(socket.userId);
    });
  }

  /**
   * Setup token refresh event handlers
   */
  setupTokenRefreshEvents(socket) {
    // Handle token refresh request from client
    socket.on('token:refresh', async (data) => {
      try {
        const { refreshToken } = data;
        
        if (!refreshToken) {
          socket.emit('token:refresh_error', { message: 'Refresh token required' });
          return;
        }

        const { verifyRefreshToken, signAccessToken } = require('../utils/Jwt');
        
        // Verify refresh token
        const decoded = verifyRefreshToken(refreshToken);
        const user = await User.findById(decoded.userId).select('_id username fullName isActive');
        
        if (!user || user.isActive === false) {
          socket.emit('token:refresh_error', { message: 'Invalid refresh token or user not found' });
          return;
        }

        // Generate new access token
        const newAccessToken = signAccessToken({ userId: user._id.toString() });
        
        // Update socket with new token info
        socket.tokenRefreshed = true;
        socket.tokenRefreshedAt = new Date();
        
        // Emit new token to client
        socket.emit('token:refresh_success', {
          accessToken: newAccessToken,
          timestamp: new Date()
        });
        
        console.log(`[TOKEN REFRESH] ✅ Token refreshed for user ${socket.userId}`);
      } catch (error) {
        console.error(`[TOKEN REFRESH] ❌ Error refreshing token for user ${socket.userId}:`, error);
        socket.emit('token:refresh_error', { 
          message: 'Token refresh failed',
          error: error.message 
        });
      }
    });
  }

  /**
   * Setup error handling
   */
  setupErrorHandling(socket) {
    socket.on('error', (error) => {
      console.error(`Socket error for user ${socket.userId}:`, error);
      
      // Check if error is due to token expiration
      if (error.message && error.message.includes('jwt expired')) {
        socket.emit('token:expired', {
          message: 'Token expired. Please refresh your token.',
          timestamp: new Date()
        });
      }
    });
  }

  /**
   * Setup disconnection handling
   * Handles multiple connections per user properly
   */
  setupDisconnectionHandling(socket) {
    socket.on('disconnect', async (reason) => {
      const userId = socket.userId;
      
      console.log(`[CONNECTION] 🔌 User ${userId} disconnected socket ${socket.id}: ${reason}`);
      
      // Get user's socket Set
      const userSockets = this.connectedUsers.get(userId);
      if (!userSockets) {
        console.log(`[CONNECTION] ⚠️ User ${userId} not found in connected users`);
        return;
      }
      
      // Remove this specific socket
      userSockets.delete(socket.id);
      
      // If user has no more connections, mark as offline
      if (userSockets.size === 0) {
        this.connectedUsers.delete(userId);
        await this.updateUserStatus(userId, 'offline');
        
        // End any active calls for this user
        for (const [callId, callData] of this.activeCalls.entries()) {
          if (callData.participants.includes(userId)) {
            // End the call
            this.io.to(`user:${callData.initiator}`).emit('call:ended', {
              callId: callId,
              reason: 'user_disconnected',
              timestamp: new Date()
            });
            
            // Remove from active calls
            this.activeCalls.delete(callId);
          }
        }
        
        // Notify other users about offline status (only when all connections are gone)
        this.io.emit('user_offline', {
          userId: userId,
          username: socket.user?.username,
          fullName: socket.user?.fullName,
          profilePictureUrl: socket.user?.profilePictureUrl,
          timestamp: new Date()
        });
        
        console.log(`[CONNECTION] ✅ User ${userId} offline status broadcasted (all connections closed)`);
      } else {
        console.log(`[CONNECTION] ℹ️ User ${userId} still has ${userSockets.size} active connection(s)`);
      }
    });
  }

  /**
   * Update user online status
   */
  async updateUserStatus(userId, status) {
    try {
      console.log(`[ONLINE_STATUS] Updating user ${userId} to ${status}`);
      const userStatus = await UserStatus.getOrCreateUserStatus(userId);
      
      if (status === 'online') {
        await userStatus.setOnline();
        console.log(`[ONLINE_STATUS] ✅ User ${userId} is now ONLINE`);
      } else {
        await userStatus.setOffline();
        console.log(`[ONLINE_STATUS] ❌ User ${userId} is now OFFLINE`);
      }
      
      await userStatus.updateActivity();
      console.log(`[ONLINE_STATUS] Activity updated for user ${userId}`);
    } catch (error) {
      console.error('[ONLINE_STATUS] Error updating user status:', error);
    }
  }

  /**
   * Update user activity
   */
  async updateUserActivity(userId) {
    try {
      const userStatus = await UserStatus.getOrCreateUserStatus(userId);
      await userStatus.updateActivity();
    } catch (error) {
      console.error('[ONLINE_STATUS] Error updating user activity:', error);
    }
  }

  /**
   * Start cleanup interval for stale connections and calls
   */
  startCleanupInterval(interval) {
    setInterval(async () => {
      await this.cleanupStaleConnections();
      await this.cleanupStaleCalls();
    }, interval);
  }

  /**
   * Cleanup stale connections
   * Handles multiple connections per user
   */
  async cleanupStaleConnections() {
    const now = new Date();
    const staleTimeout = 5 * 60 * 1000; // 5 minutes

    for (const [userId, socketIds] of this.connectedUsers.entries()) {
      const staleSockets = [];
      
      for (const socketId of socketIds) {
        const socket = this.io.sockets.sockets.get(socketId);
        if (!socket || (now - socket.lastActivity) > staleTimeout) {
          staleSockets.push(socketId);
          
          if (socket) {
            socket.disconnect(true);
          }
        }
      }
      
      // Remove stale sockets
      staleSockets.forEach(socketId => socketIds.delete(socketId));
      
      // If no more connections, remove user and mark offline
      if (socketIds.size === 0) {
        this.connectedUsers.delete(userId);
        await this.updateUserStatus(userId, 'offline');
        console.log(`[CLEANUP] 🧹 Cleaned up all connections for user ${userId}`);
      } else if (staleSockets.length > 0) {
        console.log(`[CLEANUP] 🧹 Cleaned up ${staleSockets.length} stale connection(s) for user ${userId} (${socketIds.size} remaining)`);
      }
    }
  }

  /**
   * Cleanup stale calls
   */
  async cleanupStaleCalls() {
    const now = new Date();
    const staleTimeout = 10 * 60 * 1000; // 10 minutes

    for (const [callId, callData] of this.activeCalls.entries()) {
      if ((now - callData.startedAt) > staleTimeout) {
        // End stale call
        await Call.findOneAndUpdate(
          { callId: callId },
          {
            status: 'timeout',
            endedAt: now,
            endReason: 'timeout'
          }
        );

        // Notify participants
        callData.participants.forEach(participantId => {
          this.io.to(`user:${participantId}`).emit('call:ended', {
            callId: callId,
            reason: 'timeout',
            timestamp: now
          });
        });

        // Remove from active calls
        this.activeCalls.delete(callId);
      }
    }
  }

  /**
   * Get connected users count
   */
  getConnectedUsersCount() {
    return this.connectedUsers.size;
  }

  /**
   * Get active calls count
   */
  getActiveCallsCount() {
    return this.activeCalls.size;
  }

  /**
   * Emit to specific user (all their connections)
   */
  emitToUser(userId, event, data) {
    const socketIds = this.connectedUsers.get(userId);
    if (socketIds && socketIds.size > 0) {
      // Emit to user's room (includes all their socket connections)
      this.io.to(`user:${userId}`).emit(event, data);
    }
  }

  /**
   * Emit to chat room
   */
  emitToChat(chatId, event, data) {
    this.io.to(`chat:${chatId}`).emit(event, data);
  }

  /**
   * Emit event to all users viewing a specific post (room-based)
   */
  emitToPost(postId, event, data) {
    if (this.io) {
      const room = `post:${postId}`;
      const clientCount = this.io.sockets.adapter.rooms.get(room)?.size || 0;
      this.io.to(room).emit(event, data);
      console.log(`[REALTIME_SERVICE] ✅ Event ${event} emitted to post room ${room} (${clientCount} client(s))`);
    } else {
      console.error('[REALTIME_SERVICE] ❌ Cannot emit to post - Socket.IO not initialized');
    }
  }

  /**
   * Emit event to all users viewing a specific story (room-based)
   */
  emitToStory(storyId, event, data) {
    if (this.io) {
      const room = `story:${storyId}`;
      const clientCount = this.io.sockets.adapter.rooms.get(room)?.size || 0;
      this.io.to(room).emit(event, data);
      console.log(`[REALTIME_SERVICE] ✅ Event ${event} emitted to story room ${room} (${clientCount} client(s))`);
    } else {
      console.error('[REALTIME_SERVICE] ❌ Cannot emit to story - Socket.IO not initialized');
    }
  }

  /**
   * Broadcast to all connected users
   */
  broadcast(event, data) {
    this.io.emit(event, data);
  }

  /**
   * Broadcast user offline status
   */
  broadcastUserOffline(userId, userDetails) {
    if (this.io) {
      this.io.emit('user_offline', {
        userId: userId,
        username: userDetails?.username,
        fullName: userDetails?.fullName,
        profilePictureUrl: userDetails?.profilePictureUrl,
        timestamp: new Date()
      });
      console.log(`[REALTIME_SERVICE] ✅ User ${userId} offline status broadcasted to all users`);
    }
  }

  /**
   * Emit new message to chat participants (social chats)
   */
  emitNewMessage(chatId, messageData) {
    console.log('🔵 [REALTIME_SVC] emitNewMessage called:', { 
      chatId, 
      messageId: messageData._id,
      senderId: messageData.senderId?._id || messageData.senderId,
      type: messageData.type,
      contentPreview: messageData.content?.substring(0, 50),
      timestamp: new Date().toISOString()
    });
    if (this.io) {
      console.log(`🔵 [REALTIME_SVC] Broadcasting new message to social chat ${chatId}:`, {
        messageId: messageData._id,
        senderId: messageData.senderId?._id || messageData.senderId,
        content: messageData.content?.substring(0, 50) + '...',
        room: `chat:${chatId}`
      });
      
      // Emit to all participants in the social chat room
      const room = `chat:${chatId}`;
      const clientsInRoom = this.io.sockets.adapter.rooms.get(room);
      const clientCount = clientsInRoom ? clientsInRoom.size : 0;
      console.log(`🔵 [REALTIME_SVC] Emitting to room ${room}, ${clientCount} client(s) connected`);
      
      this.io.to(room).emit('message_received', messageData);
      
      console.log(`✅ [REALTIME_SVC] Social message broadcasted to chat ${chatId} (${clientCount} client(s))`);
    } else {
      console.error('❌ [REALTIME_SVC] Cannot broadcast message - Socket.IO not initialized');
    }
  }

  /**
   * Emit new message to dating chat participants
   */
  emitDatingMessage(chatId, messageData) {
    if (this.io) {
      console.log(`[REALTIME_SERVICE] 💕 Broadcasting new message to dating chat ${chatId}:`, {
        messageId: messageData._id,
        senderId: messageData.senderId._id,
        content: messageData.content?.substring(0, 50) + '...'
      });
      
      // Emit to all participants in the dating chat room
      this.io.to(`dating-chat:${chatId}`).emit('dating_message_received', messageData);
      
      // Also emit to user rooms for notifications
      const DatingChat = require('../user/dating/models/datingChatModel');
      DatingChat.findById(chatId)
        .then(chat => {
          if (chat) {
            chat.participants.forEach(participantId => {
              if (participantId.toString() !== messageData.senderId._id?.toString() && 
                  participantId.toString() !== messageData.senderId.toString()) {
                this.io.to(`user:${participantId}`).emit('dating_new_message_notification', {
                  chatId: chatId,
                  messageId: messageData._id,
                  sender: messageData.sender,
                  content: messageData.content,
                  type: messageData.type,
                  timestamp: messageData.createdAt
                });
              }
            });
          }
        })
        .catch(err => console.error('[REALTIME_SERVICE] Error emitting dating notifications:', err));
      
      console.log(`[REALTIME_SERVICE] ✅ Dating message broadcasted to chat ${chatId}`);
    } else {
      console.error('[REALTIME_SERVICE] ❌ Cannot broadcast dating message - Socket.IO not initialized');
    }
  }
}

// Create singleton instance
const enhancedRealtimeService = new EnhancedRealtimeService();

module.exports = enhancedRealtimeService;


