const mongoose = require('mongoose');
const { Schema } = mongoose;

// Enhanced Chat Schema with comprehensive validation
const chatSchema = new Schema({
  // Core chat properties
		participants: [{ 
    type: Schema.Types.ObjectId,
			ref: 'User', 
    required: true
  }],
  
  // Chat metadata
  chatType: {
    type: String,
    enum: ['direct', 'group'],
    default: 'direct',
			required: true 
  },
  
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  
  // Last message tracking
		lastMessage: { 
    type: Schema.Types.ObjectId,
			ref: 'Message', 
			default: null 
		},
  
		lastMessageAt: { 
			type: Date, 
    default: null,
    index: true
  },
  
  // User-specific settings for each participant
  userSettings: [{
    userId: {
      type: Schema.Types.ObjectId,
			ref: 'User', 
			required: true 
		},
    isArchived: {
      type: Boolean,
      default: false
    },
    isPinned: {
      type: Boolean,
      default: false
    },
    isMuted: {
			type: Boolean, 
      default: false
    },
    unreadCount: {
      type: Number,
      default: 0,
      min: 0
    },
    lastReadAt: {
      type: Date,
			default: null 
		},
    archivedAt: {
			type: Date, 
			default: null 
		},
    pinnedAt: {
			type: Date, 
			default: null 
		},
    mutedAt: {
      type: Date,
      default: null
    }
  }],
  
  // Active call tracking
		activeCall: {
    callId: {
      type: String,
      default: null
    },
    type: {
      type: String,
      enum: ['audio', 'video'],
      default: null
    },
    status: {
      type: String,
      enum: ['initiating', 'ringing', 'connected', 'ended'],
      default: null
    },
    startedAt: {
      type: Date,
			default: null
		}
	},
  
  // Chat metadata
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  versionKey: false
});

// Indexes for optimal performance
chatSchema.index({ participants: 1, isActive: 1 });
chatSchema.index({ lastMessageAt: -1 });
chatSchema.index({ 'userSettings.userId': 1, isActive: 1 });
chatSchema.index({ 'activeCall.callId': 1 });

// Schema-level validation for participants
chatSchema.pre('validate', function(next) {
  if (this.chatType === 'direct' && this.participants.length !== 2) {
    return next(new Error('Direct chat must have exactly 2 participants'));
  }
  next();
});

// Pre-save middleware
chatSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Ensure userSettings exists for all participants
  if (this.isNew || this.isModified('participants')) {
    const participantIds = this.participants.map(p => p.toString());
    const existingUserIds = this.userSettings.map(us => us.userId.toString());
    
    participantIds.forEach(participantId => {
      if (!existingUserIds.includes(participantId)) {
        this.userSettings.push({
          userId: participantId,
          unreadCount: 0,
          lastReadAt: new Date()
        });
      }
    });
  }
  
  next();
});

// Static methods
chatSchema.statics.findOrCreateChat = async function(userId1, userId2, createdBy) {
  try {
    // Validate input
    if (!userId1 || !userId2) {
      throw new Error('Both user IDs are required');
    }
    
    if (userId1 === userId2) {
      throw new Error('Cannot create chat with yourself');
    }
    
    // Look for existing chat
	let chat = await this.findOne({
      participants: { $all: [userId1, userId2] },
      isActive: true,
      chatType: 'direct'
    });

	if (!chat) {
		// Create new chat
      chat = new this({
        participants: [userId1, userId2],
        chatType: 'direct',
        createdBy: createdBy || userId1
      });
      
      await chat.save();
	}

	return chat;
  } catch (error) {
    throw new Error(`Failed to find or create chat: ${error.message}`);
  }
};

chatSchema.statics.getUserChats = async function(userId, page = 1, limit = 20) {
  console.log('🔵 [CHAT_MODEL] getUserChats called:', { userId, page, limit, timestamp: new Date().toISOString() });
  try {
	const skip = (page - 1) * limit;
	
	const query = {
		participants: userId,
		isActive: true
	};
	console.log('🔵 [CHAT_MODEL] Query:', JSON.stringify(query));
	
	const chats = await this.find(query)
	.populate('participants', 'username fullName profilePictureUrl isActive')
	.populate('lastMessage')
	.sort({ lastMessageAt: -1, updatedAt: -1 })
	.skip(skip)
	.limit(limit)
	.lean();

	console.log('🔵 [CHAT_MODEL] Raw query result:', { 
		chatsCount: chats.length,
		chatIds: chats.map(c => c._id),
		hasParticipants: chats.map(c => c.participants?.length)
	});
	
	// Filter out archived chats for this user
	const filteredChats = chats.filter(chat => {
		const userSetting = chat.userSettings?.find(setting => 
			setting.userId?.toString() === userId.toString() || 
			setting.userId?.toString() === userId
		);
		const isArchived = userSetting?.isArchived || false;
		if (isArchived) {
			console.log('🔵 [CHAT_MODEL] Filtering out archived chat:', { chatId: chat._id, userId });
		}
		return !isArchived;
	});
	
	console.log('✅ [CHAT_MODEL] getUserChats result:', { 
		rawCount: chats.length, 
		filteredCount: filteredChats.length,
		userId
	});

	return filteredChats;
  } catch (error) {
    console.error('❌ [CHAT_MODEL] getUserChats error:', { error: error.message, stack: error.stack, userId });
    throw new Error(`Failed to get user chats: ${error.message}`);
  }
};

chatSchema.statics.canUsersChat = async function(userId1, userId2) {
  try {
    // Check if users exist and are active
	const User = mongoose.model('User');
	const [user1, user2] = await Promise.all([
      User.findById(userId1).select('isActive'),
      User.findById(userId2).select('isActive')
    ]);
    
    if (!user1 || !user2) {
      return { canChat: false, reason: 'user_not_found' };
    }
    
    if (!user1.isActive || !user2.isActive) {
      return { canChat: false, reason: 'user_inactive' };
    }
    
    // Check if there's an existing chat
    const existingChat = await this.findOne({
      participants: { $all: [userId1, userId2] },
      isActive: true
    });
    
    if (existingChat) {
      return { canChat: true, reason: 'existing_chat' };
    }
    
    // Check message request permissions
    const MessageRequest = mongoose.model('MessageRequest');
    const messageRequest = await MessageRequest.findOne({
      $or: [
        { fromUserId: userId1, toUserId: userId2 },
        { fromUserId: userId2, toUserId: userId1 }
      ],
      status: 'accepted'
    });
    
    if (messageRequest) {
		return { canChat: true, reason: 'accepted_request' };
	}

	return { canChat: false, reason: 'no_permission' };
  } catch (error) {
    throw new Error(`Failed to check chat permissions: ${error.message}`);
  }
};

// Instance methods
chatSchema.methods.updateUserSettings = async function(userId, updates) {
  try {
    const userSetting = this.userSettings.find(
      setting => setting.userId.toString() === userId.toString()
    );
    
    if (!userSetting) {
      throw new Error('User not found in chat participants');
    }
    
    // Update settings with timestamps
    Object.keys(updates).forEach(key => {
      userSetting[key] = updates[key];
      if (key.includes('At') && updates[key]) {
        userSetting[key] = new Date();
      }
    });
    
    await this.save();
    return userSetting;
  } catch (error) {
    throw new Error(`Failed to update user settings: ${error.message}`);
  }
};

chatSchema.methods.getUserSettings = function(userId) {
  return this.userSettings.find(
    setting => setting.userId.toString() === userId.toString()
  ) || {
    isArchived: false,
    isPinned: false,
    isMuted: false,
    unreadCount: 0,
    lastReadAt: null
  };
};

chatSchema.methods.incrementUnreadCount = function(userId) {
  const userSetting = this.userSettings.find(
    setting => setting.userId.toString() === userId.toString()
  );
  
  if (userSetting) {
    userSetting.unreadCount = (userSetting.unreadCount || 0) + 1;
  }
};

chatSchema.methods.resetUnreadCount = function(userId) {
  const userSetting = this.userSettings.find(
    setting => setting.userId.toString() === userId.toString()
  );
  
  if (userSetting) {
    userSetting.unreadCount = 0;
    userSetting.lastReadAt = new Date();
  }
};

chatSchema.methods.setActiveCall = async function(callData) {
  this.activeCall = {
    callId: callData.callId,
    type: callData.type,
    status: callData.status,
    startedAt: callData.startedAt || new Date()
  };
  await this.save();
};

chatSchema.methods.clearActiveCall = async function() {
  this.activeCall = {
    callId: null,
    type: null,
    status: null,
    startedAt: null
  };
  await this.save();
};

// Virtual fields
chatSchema.virtual('otherParticipant').get(function() {
  return this.participants.find(p => p._id.toString() !== this.currentUserId);
});

// Export model
const Chat = mongoose.model('Chat', chatSchema);

module.exports = Chat;