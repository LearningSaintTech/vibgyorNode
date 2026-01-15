const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Dating Chat Schema - Separate from social chats
 * Collection: datingchats
 */
const datingChatSchema = new Schema({
  // Match reference
  matchId: {
    type: Schema.Types.ObjectId,
    ref: 'DatingMatch',
    required: true,
    unique: true,
    index: true
  },
  
  // Core chat properties
  participants: [{ 
    type: Schema.Types.ObjectId,
    ref: 'User', 
    required: true
  }],
  
  // Chat metadata
  chatType: {
    type: String,
    enum: ['direct'],
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
    ref: 'DatingMessage', 
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
    deletedAt: {
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
  versionKey: false,
  collection: 'datingchats' // Explicit collection name
});

// Indexes for optimal performance
datingChatSchema.index({ matchId: 1 }, { unique: true });
datingChatSchema.index({ participants: 1, isActive: 1 });
datingChatSchema.index({ lastMessageAt: -1 });
datingChatSchema.index({ 'userSettings.userId': 1, isActive: 1 });
datingChatSchema.index({ 'activeCall.callId': 1 });

// Schema-level validation
datingChatSchema.pre('validate', function(next) {
  if (this.participants.length !== 2) {
    return next(new Error('Dating chat must have exactly 2 participants'));
  }
  next();
});

// Pre-save middleware
datingChatSchema.pre('save', function(next) {
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
datingChatSchema.statics.findOrCreateByMatch = async function(matchId, userId) {
  try {
    if (!matchId || !userId) {
      throw new Error('Match ID and User ID are required');
    }
    
    const DatingMatch = mongoose.model('DatingMatch');
    const match = await DatingMatch.findById(matchId);
    
    if (!match) {
      throw new Error('Match not found');
    }
    
    // Check if user is part of this match
    const userAId = match.userA.toString();
    const userBId = match.userB.toString();
    const currentUserIdStr = userId.toString();
    
    if (userAId !== currentUserIdStr && userBId !== currentUserIdStr) {
      throw new Error('User is not part of this match');
    }
    
    if (match.status !== 'active') {
      throw new Error('Match is not active');
    }
    
    // Look for existing chat
    let chat = await this.findOne({ matchId: matchId, isActive: true });
    
    if (!chat) {
      // Create new chat
      chat = new this({
        matchId: matchId,
        participants: [match.userA, match.userB],
        chatType: 'direct'
      });
      
      await chat.save();
    }
    
    return chat;
  } catch (error) {
    throw new Error(`Failed to find or create dating chat: ${error.message}`);
  }
};

datingChatSchema.statics.getUserDatingChats = async function(userId, page = 1, limit = 20) {
  try {
    const skip = (page - 1) * limit;
    
    const chats = await this.find({
      participants: userId,
      isActive: true
    })
    .populate('participants', 'username fullName profilePictureUrl isActive')
    .populate('matchId', 'status createdAt lastInteractionAt')
    .populate('lastMessage')
    .sort({ lastMessageAt: -1, updatedAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
    
    return chats;
  } catch (error) {
    throw new Error(`Failed to get user dating chats: ${error.message}`);
  }
};

// Instance methods
datingChatSchema.methods.updateUserSettings = async function(userId, updates) {
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

datingChatSchema.methods.getUserSettings = function(userId) {
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

datingChatSchema.methods.incrementUnreadCount = function(userId) {
  const userSetting = this.userSettings.find(
    setting => setting.userId.toString() === userId.toString()
  );
  
  if (userSetting) {
    userSetting.unreadCount = (userSetting.unreadCount || 0) + 1;
  }
};

datingChatSchema.methods.resetUnreadCount = function(userId) {
  const userSetting = this.userSettings.find(
    setting => setting.userId.toString() === userId.toString()
  );
  
  if (userSetting) {
    userSetting.unreadCount = 0;
    userSetting.lastReadAt = new Date();
  }
};

datingChatSchema.methods.setActiveCall = async function(callData) {
  this.activeCall = {
    callId: callData.callId,
    type: callData.type,
    status: callData.status,
    startedAt: callData.startedAt || new Date()
  };
  await this.save();
};

datingChatSchema.methods.clearActiveCall = async function() {
  this.activeCall = {
    callId: null,
    type: null,
    status: null,
    startedAt: null
  };
  await this.save();
};

// Export model
const DatingChat = mongoose.model('DatingChat', datingChatSchema);

module.exports = DatingChat;

