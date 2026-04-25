const { Server } = require('socket.io');
const mongoose = require('mongoose');
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
    /** @type {Map<string, { count: number, resetAt: number }>} */
    this._socketUserMessageBuckets = new Map();
  }

  /**
   * Per-user cap for socket-originated sends (all tabs share bucket).
   * On when ENABLE_SOCKET_MESSAGE_RATE_LIMIT=true or NODE_ENV=production; off when DISABLE_SOCKET_MESSAGE_RATE_LIMIT=1.
   */
  checkUserSocketMessageBurst(userId) {
    if (process.env.DISABLE_SOCKET_MESSAGE_RATE_LIMIT === '1') return true;
    const enabled =
      process.env.ENABLE_SOCKET_MESSAGE_RATE_LIMIT === 'true' ||
      process.env.NODE_ENV === 'production';
    if (!enabled) return true;

    const max = Math.max(1, parseInt(process.env.SOCKET_MESSAGE_RATE_MAX || '60', 10));
    const windowMs = Math.max(1000, parseInt(process.env.SOCKET_MESSAGE_RATE_WINDOW_MS || '60000', 10));
    const now = Date.now();
    let b = this._socketUserMessageBuckets.get(userId);
    if (!b || now >= b.resetAt) {
      b = { count: 0, resetAt: now + windowMs };
      this._socketUserMessageBuckets.set(userId, b);
    }
    b.count += 1;
    return b.count <= max;
  }

  /**
   * Global presence fan-out (legacy). Set USE_LEGACY_GLOBAL_PRESENCE=1 to force.
   * Otherwise scoped in production or when USE_SCOPED_PRESENCE=true.
   */
  usesLegacyGlobalPresence() {
    return process.env.USE_LEGACY_GLOBAL_PRESENCE === '1';
  }

  usesScopedPresence() {
    if (this.usesLegacyGlobalPresence()) return false;
    if (process.env.USE_SCOPED_PRESENCE === 'true') return true;
    return process.env.NODE_ENV === 'production';
  }

  /**
   * Emit user_online / user_offline / user_status_update only to users who share an active chat (cap on chat scan).
   */
  async emitPresenceToChatPartners(subjectUserId, event, payload) {
    if (!this.io) return;
    const maxChats = Math.min(
      500,
      Math.max(1, parseInt(process.env.PRESENCE_MAX_CHATS_SCAN || '200', 10))
    );
    const uidObj = mongoose.Types.ObjectId.isValid(subjectUserId)
      ? new mongoose.Types.ObjectId(subjectUserId)
      : subjectUserId;
    const uidStr = subjectUserId.toString();
    let targets;
    try {
      const chats = await Chat.find({ participants: uidObj, isActive: true })
        .select('participants')
        .limit(maxChats)
        .lean();
      targets = new Set();
      for (const c of chats) {
        for (const p of c.participants || []) {
          const ps = p.toString();
          if (ps !== uidStr) targets.add(ps);
        }
      }
    } catch (e) {
      console.error('[PRESENCE] emitPresenceToChatPartners query failed:', e.message);
      this.io.emit(event, { ...payload, presenceScope: 'global_fallback' });
      return;
    }
    const out = { ...payload, presenceScope: 'chat_partners' };
    for (const pid of targets) {
      this.io.to(`user:${pid}`).emit(event, out);
    }
  }

  /**
   * REST / controller: user came online (no socket instance).
   */
  async broadcastUserOnline(userId, payload) {
    if (!this.io) return;
    if (!this.usesScopedPresence()) {
      this.io.emit('user_online', { ...payload, presenceScope: 'global' });
      return;
    }
    await this.emitPresenceToChatPartners(userId, 'user_online', payload);
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

      socket.onAny(() => {
        socket.lastActivity = new Date();
      });

      // Handle user connection
      this.handleUserConnection(socket);

      // Chat events
      this.setupChatEvents(socket);
      
      // Profile room events
      this.setupProfileEvents(socket);
      
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
      
      const onlinePayload = {
        userId: userId,
        username: socket.user.username,
        fullName: socket.user.fullName,
        profilePictureUrl: socket.user.profilePictureUrl,
        timestamp: new Date()
      };
      if (this.usesScopedPresence()) {
        this.emitPresenceToChatPartners(userId, 'user_online', onlinePayload).catch((err) =>
          console.error('[PRESENCE] scoped user_online failed:', err.message)
        );
      } else {
        socket.broadcast.emit('user_online', { ...onlinePayload, presenceScope: 'global' });
      }
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
        const participantOk =
          chat &&
          chat.participants.some((p) => p.toString() === userId.toString());
        if (!participantOk) {
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
        
        // IMPORTANT: Joining a room must NOT imply read.
        // Read status should be driven only by explicit mark-as-read actions
        // from an actively open chat screen.
        console.log('ℹ️ [REALTIME_SVC] join_chat subscribed without read side-effects', { chatId, userId });
        
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
        
        // IMPORTANT: Joining a room must NOT imply read for dating chats either.
        console.log('[REALTIME_SERVICE] ℹ️ join_dating_chat subscribed without read side-effects', { chatId, userId });
        
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

    // Typing indicators (membership required — same as dating)
    socket.on('typing_start', async (data) => {
      try {
        const chatId = data?.chatId;
        const userId = socket.userId;
        if (!chatId) return;

        const chat = await Chat.findById(chatId).select('participants').lean();
        if (!chat) {
          socket.emit('error', { message: 'Chat not found' });
          return;
        }
        const participantSet = new Set(chat.participants.map((p) => p.toString()));
        if (!participantSet.has(userId)) {
          socket.emit('error', { message: 'Access denied to this chat' });
          return;
        }

        socket.to(`chat:${chatId}`).emit('user_typing', {
          userId,
          username: socket.user.username,
          chatId,
          isTyping: true,
          timestamp: new Date()
        });
      } catch (error) {
        console.error('[REALTIME_SERVICE] Error handling typing_start:', error);
        socket.emit('error', { message: 'Failed to send typing indicator' });
      }
    });

    socket.on('typing_stop', async (data) => {
      try {
        const chatId = data?.chatId;
        const userId = socket.userId;
        if (!chatId) return;

        const chat = await Chat.findById(chatId).select('participants').lean();
        if (!chat) {
          socket.emit('error', { message: 'Chat not found' });
          return;
        }
        const participantSet = new Set(chat.participants.map((p) => p.toString()));
        if (!participantSet.has(userId)) {
          socket.emit('error', { message: 'Access denied to this chat' });
          return;
        }

        socket.to(`chat:${chatId}`).emit('user_typing', {
          userId,
          username: socket.user.username,
          chatId,
          isTyping: false,
          timestamp: new Date()
        });
      } catch (error) {
        console.error('[REALTIME_SERVICE] Error handling typing_stop:', error);
        socket.emit('error', { message: 'Failed to send typing indicator' });
      }
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

    // Social message events — single path via MessageService (encrypt, chat update, notify, emit)
    socket.on('new_message', async (data) => {
      const allowSocketSend =
        process.env.ALLOW_SOCKET_MESSAGE_SEND !== 'false' &&
        process.env.ALLOW_SOCKET_MESSAGE_SEND !== '0';
      if (!allowSocketSend) {
        socket.emit('error', {
          message: 'Sending via socket is disabled. Use the REST API to send messages.',
          code: 'USE_REST_FOR_SEND'
        });
        return;
      }
      if (!this.checkUserSocketMessageBurst(socket.userId)) {
        socket.emit('error', { message: 'Too many messages. Please slow down.', code: 'RATE_LIMIT' });
        return;
      }
      console.log('🔵 [REALTIME_SVC] new_message event received via socket:', {
        userId: socket.userId,
        username: socket.user?.username,
        chatId: data?.chatId,
        type: data?.type,
        hasContent: !!data?.content,
        timestamp: new Date().toISOString()
      });
      try {
        const payload = data || {};
        const MessageService = require('../user/social/services/messageService');
        const saved = await MessageService.sendMessage(
          {
            chatId: payload.chatId,
            senderId: socket.userId,
            type: payload.type || 'text',
            content: typeof payload.content === 'string' ? payload.content : '',
            replyTo: payload.replyTo || null,
            forwardedFrom: payload.forwardedFrom || null,
            clientMessageId: payload.clientMessageId,
            location: payload.location,
            isOneView: payload.isOneView,
            oneViewExpirationHours: payload.oneViewExpirationHours,
            gifSource: payload.gifSource,
            gifId: payload.gifId,
            musicMetadata: payload.musicMetadata,
            duration: payload.duration,
            width: payload.width,
            height: payload.height
          },
          null
        );

        const chatId = payload.chatId;
        if (!saved.isIdempotentReplay) {
          const chatDoc = await Chat.findById(chatId).select('participants').lean();
          if (chatDoc && this.io) {
            const senderUsername =
              (saved.senderId && saved.senderId.username) || socket.user?.username || 'user';
            for (const participantId of chatDoc.participants) {
              if (participantId.toString() !== socket.userId) {
                this.io.to(`user:${participantId}`).emit('new_message_notification', {
                  chatId,
                  messageId: saved._id,
                  sender: senderUsername,
                  content: saved.content,
                  type: saved.type,
                  timestamp: saved.createdAt
                });
              }
            }
          }
        }
      } catch (error) {
        console.error('❌ [REALTIME_SVC] Error handling new social message:', {
          error: error.message,
          stack: error.stack,
          chatId: data?.chatId,
          userId: socket.userId
        });
        socket.emit('error', { message: error.message || 'Failed to send message' });
      }
    });

    // Dating message events — single path via DatingMessageService (encrypt, notify, emitDatingMessage)
    socket.on('new_dating_message', async (data) => {
      const allowSocketSend =
        process.env.ALLOW_SOCKET_MESSAGE_SEND !== 'false' &&
        process.env.ALLOW_SOCKET_MESSAGE_SEND !== '0';
      if (!allowSocketSend) {
        socket.emit('error', {
          message: 'Sending via socket is disabled. Use the REST API to send messages.',
          code: 'USE_REST_FOR_SEND'
        });
        return;
      }
      if (!this.checkUserSocketMessageBurst(socket.userId)) {
        socket.emit('error', { message: 'Too many messages. Please slow down.', code: 'RATE_LIMIT' });
        return;
      }
      try {
        const payload = data || {};
        const DatingMessageService = require('../user/dating/services/datingMessageService');
        await DatingMessageService.sendMessage(
          {
            chatId: payload.chatId,
            senderId: socket.userId,
            type: payload.type || 'text',
            content: typeof payload.content === 'string' ? payload.content : '',
            replyTo: payload.replyTo || null,
            forwardedFrom: payload.forwardedFrom || null,
            clientMessageId: payload.clientMessageId,
            location: payload.location,
            isOneView: payload.isOneView,
            oneViewExpirationHours: payload.oneViewExpirationHours,
            gifSource: payload.gifSource,
            gifId: payload.gifId,
            musicMetadata: payload.musicMetadata,
            duration: payload.duration,
            width: payload.width,
            height: payload.height
          },
          null
        );
      } catch (error) {
        console.error('Error handling new dating message:', error);
        socket.emit('error', { message: error.message || 'Failed to send dating message' });
      }
    });
  }

  /**
   * Setup profile-related event handlers
   */
  setupProfileEvents(socket) {
    // Join profile room (when viewing a user's profile)
    socket.on('join_profile', (userId) => {
      try {
        console.log('[REALTIME_SERVICE] 👤 Join profile room request:', {
          userId: socket.userId,
          username: socket.user?.username,
          profileUserId: userId,
          socketId: socket.id
        });
        
        const room = `profile:${userId}`;
        socket.join(room);
        
        const clientsInRoom = this.io.sockets.adapter.rooms.get(room);
        const clientCount = clientsInRoom ? clientsInRoom.size : 0;
        console.log('[REALTIME_SERVICE] ✅ User joined profile room:', {
          userId: socket.userId,
          profileUserId: userId,
          room,
          clientCount
        });
      } catch (error) {
        console.error('[REALTIME_SERVICE] ❌ Error joining profile room:', error);
      }
    });

    // Leave profile room (when leaving a user's profile)
    socket.on('leave_profile', (userId) => {
      try {
        console.log('[REALTIME_SERVICE] 👤 Leave profile room request:', {
          userId: socket.userId,
          username: socket.user?.username,
          profileUserId: userId,
          socketId: socket.id
        });
        
        const room = `profile:${userId}`;
        socket.leave(room);
        
        const clientsInRoom = this.io.sockets.adapter.rooms.get(room);
        const clientCount = clientsInRoom ? clientsInRoom.size : 0;
        console.log('[REALTIME_SERVICE] ✅ User left profile room:', {
          userId: socket.userId,
          profileUserId: userId,
          room,
          remainingClients: clientCount
        });
      } catch (error) {
        console.error('[REALTIME_SERVICE] ❌ Error leaving profile room:', error);
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
        
        const statusPayload = {
          userId: socket.userId,
          status: status,
          timestamp: new Date()
        };
        if (this.usesScopedPresence()) {
          await this.emitPresenceToChatPartners(socket.userId, 'user_status_update', statusPayload);
        } else {
          socket.broadcast.emit('user_status_update', { ...statusPayload, presenceScope: 'global' });
        }
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
        
        const offlinePayload = {
          userId: userId,
          username: socket.user?.username,
          fullName: socket.user?.fullName,
          profilePictureUrl: socket.user?.profilePictureUrl,
          timestamp: new Date()
        };
        if (this.usesScopedPresence()) {
          await this.emitPresenceToChatPartners(userId, 'user_offline', offlinePayload);
        } else {
          this.io.emit('user_offline', { ...offlinePayload, presenceScope: 'global' });
        }
        
        console.log(`[CONNECTION] ✅ User ${userId} offline presence emitted (all connections closed)`);
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
   * Emit event to all users viewing a specific profile (room-based)
   */
  emitToProfile(userId, event, data) {
    if (this.io) {
      const room = `profile:${userId}`;
      const clientCount = this.io.sockets.adapter.rooms.get(room)?.size || 0;
      this.io.to(room).emit(event, data);
      console.log(`[REALTIME_SERVICE] ✅ Event ${event} emitted to profile room ${room} (${clientCount} client(s))`);
    } else {
      console.error('[REALTIME_SERVICE] ❌ Cannot emit to profile - Socket.IO not initialized');
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
  async broadcastUserOffline(userId, userDetails) {
    if (!this.io) return;
    const payload = {
      userId: userId,
      username: userDetails?.username,
      fullName: userDetails?.fullName,
      profilePictureUrl: userDetails?.profilePictureUrl,
      timestamp: new Date()
    };
    if (this.usesScopedPresence()) {
      await this.emitPresenceToChatPartners(userId, 'user_offline', payload);
    } else {
      this.io.emit('user_offline', { ...payload, presenceScope: 'global' });
    }
    console.log(`[REALTIME_SERVICE] User ${userId} offline presence emitted`);
  }

  /**
   * Emit new message to chat participants (social chats)
   */
  emitNewMessage(chatId, messageData, options = {}) {
    console.log('🔵 [REALTIME_SVC] emitNewMessage called:', { 
      chatId, 
      messageId: messageData._id,
      senderId: messageData.senderId?._id || messageData.senderId,
      type: messageData.type,
      content: messageData.content,
      timestamp: new Date().toISOString()
    });
    if (messageData.type === 'image' && messageData.media) {
      const u = messageData.media.url;
      console.log('[IMG_MSG_FLOW] realtime.emitNewMessage payload', {
        chatId: String(chatId),
        messageId: String(messageData._id),
        mediaUrlPrefix: typeof u === 'string' ? u.slice(0, 120) : u,
        mediaUrlLen: typeof u === 'string' ? u.length : 0,
        hasDimensions: !!(messageData.media.dimensions || (messageData.media.width && messageData.media.height)),
      });
    }
    if (this.io) {
      console.log(`🔵 [REALTIME_SVC] Broadcasting new message to social chat ${chatId}:`, {
        messageId: messageData._id,
        senderId: messageData.senderId?._id || messageData.senderId,
        content: messageData.content,
        room: `chat:${chatId}`
      });
      
      // Emit to all participants in the social chat room
      const room = `chat:${chatId}`;
      const clientsInRoom = this.io.sockets.adapter.rooms.get(room);
      const clientCount = clientsInRoom ? clientsInRoom.size : 0;
      console.log(`🔵 [REALTIME_SVC] Emitting to room ${room}, ${clientCount} client(s) connected`);
      
      this.io.to(room).emit('message_received', messageData);
      const recipientIds = Array.isArray(options.recipientIds) ? options.recipientIds : [];
      recipientIds.forEach((recipientId) => {
        if (!recipientId) return;
        this.io.to(`user:${recipientId}`).emit('message_received', messageData);
      });
      
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

  /**
   * Multi-node: attach Redis adapter when REDIS_URL is set. Call after init() (e.g. from server.js after DB connect).
   */
  async attachRedisAdapterIfConfigured() {
    const redisUrl = process.env.REDIS_URL && process.env.REDIS_URL.trim();
    if (!redisUrl) {
      console.log('[REALTIME] REDIS_URL not set — Socket.IO single-node mode');
      return;
    }
    if (!this.io) {
      console.warn('[REALTIME] Cannot attach Redis adapter: Socket.IO not initialized');
      return;
    }
    try {
      const { createAdapter } = require('@socket.io/redis-adapter');
      const { createClient } = require('redis');
      const pubClient = createClient({ url: redisUrl });
      const subClient = pubClient.duplicate();
      pubClient.on('error', (err) => console.error('[REALTIME] Redis pub client error:', err.message));
      subClient.on('error', (err) => console.error('[REALTIME] Redis sub client error:', err.message));
      await Promise.all([pubClient.connect(), subClient.connect()]);
      this.io.adapter(createAdapter(pubClient, subClient));
      console.log('[REALTIME] Socket.IO Redis adapter attached');
    } catch (err) {
      console.error('[REALTIME] Redis adapter failed:', err.message);
      if (process.env.REDIS_REQUIRED === 'true') {
        throw err;
      }
    }
  }
}

// Create singleton instance
const enhancedRealtimeService = new EnhancedRealtimeService();

module.exports = enhancedRealtimeService;


