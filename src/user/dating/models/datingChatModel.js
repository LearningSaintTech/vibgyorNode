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
datingChatSchema.index({ 'userSettings.userId': 1, 'userSettings.isArchived': 1, isActive: 1 });
datingChatSchema.index({ participants: 1, isActive: 1, lastMessageAt: -1 });
datingChatSchema.index({ 'activeCall.callId': 1 });

// Schema-level validation
datingChatSchema.pre('validate', function(next) {
  if (this.participants.length !== 2) {
    return next(new Error('Dating chat must have exactly 2 participants'));
  }
  next();
});

// Pre-save middleware - optimized with Set for O(1) lookups
datingChatSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Only process if participants or userSettings are modified
  if (this.isModified('participants') || this.isModified('userSettings') || this.isNew) {
    // Clean up invalid userSettings entries (those with undefined/null userId)
    this.userSettings = (this.userSettings || []).filter(us => us && us.userId != null);
    
    // Ensure userSettings exists for all participants
    // Always check to fix existing broken data
    if (this.participants && this.participants.length > 0) {
      // Use Set for O(1) lookups instead of array.includes() which is O(n)
      const existingUserIdsSet = new Set(
        this.userSettings
          .filter(us => us.userId)
          .map(us => {
            return us.userId.toString ? us.userId.toString() : String(us.userId);
          })
      );
      
      // Create a Map for quick participant lookup
      const participantMap = new Map();
      this.participants.forEach(p => {
        const pId = p.toString ? p.toString() : String(p);
        participantMap.set(pId, p);
      });
      
      // Add missing userSettings
      participantMap.forEach((participantObjId, participantId) => {
        if (!existingUserIdsSet.has(participantId)) {
          this.userSettings.push({
            userId: participantObjId, // Use ObjectId, not string
            unreadCount: 0,
            lastReadAt: new Date()
          });
        }
      });
    }
  }
  
  next();
});

// Static methods
datingChatSchema.statics.findOrCreateByMatch = async function(matchId, userId, session = null) {
  try {
    if (!matchId || !userId) {
      throw new Error('Match ID and User ID are required');
    }
    
    const DatingMatch = mongoose.model('DatingMatch');
    // Use projection to fetch only needed fields for better performance
    const match = await DatingMatch.findById(matchId)
      .select('userA userB status')
      .lean();
    
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
    
    // Convert to ObjectId for consistency
    const matchIdObj = mongoose.Types.ObjectId.isValid(matchId) ? new mongoose.Types.ObjectId(matchId) : matchId;
    const userAObj = mongoose.Types.ObjectId.isValid(match.userA) ? new mongoose.Types.ObjectId(match.userA) : match.userA;
    const userBObj = mongoose.Types.ObjectId.isValid(match.userB) ? new mongoose.Types.ObjectId(match.userB) : match.userB;
    
    // Use findOneAndUpdate with upsert for atomic operation (prevents race conditions)
    // This ensures only one chat is created even with concurrent requests
    // Support session for transaction compatibility
    const options = {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true
    };
    if (session) {
      options.session = session;
    }
    
    const chat = await this.findOneAndUpdate(
      {
        matchId: matchIdObj,
        isActive: true
      },
      {
        $setOnInsert: {
          matchId: matchIdObj,
          participants: [userAObj, userBObj],
          chatType: 'direct',
          isActive: true
        }
      },
      options
    );

    return chat;
  } catch (error) {
    throw new Error(`Failed to find or create dating chat: ${error.message}`);
  }
};

datingChatSchema.statics.getUserDatingChats = async function(userId, page = 1, limit = 20, includeArchived = false) {
  try {
    const skip = (page - 1) * limit;
    
    // Use aggregation pipeline to filter archived chats in MongoDB instead of JavaScript
    // This is much more efficient and uses indexes
    const userIdObj = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
    
    const pipeline = [
      {
        $match: {
          participants: userIdObj,
          isActive: true
        }
      },
      {
        $addFields: {
          userSetting: {
            $arrayElemAt: [
              {
                $filter: {
                  input: '$userSettings',
                  as: 'setting',
                  cond: {
                    $or: [
                      { $eq: ['$$setting.userId', userIdObj] },
                      { $eq: [{ $toString: '$$setting.userId' }, userIdObj.toString()] }
                    ]
                  }
                }
              },
              0
            ]
          }
        }
      },
      {
        $match: {
          $expr: includeArchived
            ? { $eq: ['$userSetting.isArchived', true] }
            : {
              $or: [
                { $ne: ['$userSetting.isArchived', true] },
                { $eq: ['$userSetting', null] }
              ]
            }
        }
      },
      {
        $sort: { lastMessageAt: -1, updatedAt: -1 }
      },
      {
        $skip: skip
      },
      {
        $limit: limit
      }
    ];
    
    // Use $lookup to populate in the same aggregation pipeline (more efficient)
    // Get collection names dynamically to avoid hardcoding
    const User = mongoose.model('User');
    const DatingMatch = mongoose.model('DatingMatch');
    const DatingMessage = mongoose.model('DatingMessage');
    const userCollectionName = User.collection.name;
    const matchCollectionName = DatingMatch.collection.name;
    const messageCollectionName = DatingMessage.collection.name;
    
    const populatedPipeline = [
      ...pipeline,
      {
        $lookup: {
          from: userCollectionName,
          localField: 'participants',
          foreignField: '_id',
          as: 'participants',
          pipeline: [
            {
              $project: {
                username: 1,
                fullName: 1,
                profilePictureUrl: 1,
                isActive: 1
              }
            }
          ]
        }
      },
      {
        $lookup: {
          from: matchCollectionName,
          localField: 'matchId',
          foreignField: '_id',
          as: 'matchId',
          pipeline: [
            {
              $project: {
                status: 1,
                createdAt: 1,
                lastInteractionAt: 1
              }
            },
            { $limit: 1 }
          ]
        }
      },
      {
        $addFields: {
          matchId: { $arrayElemAt: ['$matchId', 0] }
        }
      },
      {
        $lookup: {
          from: messageCollectionName,
          localField: 'lastMessage',
          foreignField: '_id',
          as: 'lastMessage',
          pipeline: [{ $limit: 1 }]
        }
      },
      {
        $addFields: {
          lastMessage: { $arrayElemAt: ['$lastMessage', 0] }
        }
      }
    ];
    
    const chats = await this.aggregate(populatedPipeline);
    
    return chats;
  } catch (error) {
    throw new Error(`Failed to get user dating chats: ${error.message}`);
  }
};

// Instance methods
datingChatSchema.methods.updateUserSettings = async function(userId, updates) {
  try {
    // Convert userId to ObjectId for consistency
    const userIdObj = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
    
    // Build update object with timestamps
    const updateObj = {};
    Object.keys(updates).forEach(key => {
      updateObj[`userSettings.$.${key}`] = key.includes('At') && updates[key] ? new Date() : updates[key];
    });
    
    // Use findOneAndUpdate to return updated document in one operation
    // Note: $elemMatch in projection doesn't work with findOneAndUpdate, so fetch full document
    const updatedChat = await this.constructor.findOneAndUpdate(
      { _id: this._id, 'userSettings.userId': userIdObj },
      { $set: updateObj },
      { new: true }
    ).lean();
    
    if (!updatedChat) {
      throw new Error('User not found in chat participants');
    }
    
    // Find the updated userSetting
    const userIdStr = userIdObj.toString();
    const userSetting = updatedChat.userSettings?.find(
      setting => setting.userId && setting.userId.toString() === userIdStr
    );
    
    if (!userSetting) {
      throw new Error('User not found in chat participants');
    }
    
    return userSetting;
  } catch (error) {
    throw new Error(`Failed to update user settings: ${error.message}`);
  }
};

datingChatSchema.methods.getUserSettings = function(userId) {
  // Convert userId to string for comparison
  const userIdStr = userId.toString ? userId.toString() : String(userId);
  
  // Use find with early return - userSettings array is typically small (2 participants)
  // For consistency, we could use Set, but for small arrays, find() is acceptable
  // However, if userSettings grows, this could be optimized further
  const userSetting = this.userSettings.find(
    setting => {
      if (!setting || !setting.userId) return false;
      const settingUserIdStr = setting.userId.toString ? setting.userId.toString() : String(setting.userId);
      return settingUserIdStr === userIdStr;
    }
  );
  
  return userSetting || {
    isArchived: false,
    isPinned: false,
    isMuted: false,
    unreadCount: 0,
    lastReadAt: null
  };
};

datingChatSchema.methods.incrementUnreadCount = async function(userId) {
  // Convert userId to ObjectId for consistency
  const userIdObj = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
  
  // Use atomic update for thread-safety and immediate persistence
  await this.constructor.updateOne(
    { _id: this._id, 'userSettings.userId': userIdObj },
    { $inc: { 'userSettings.$.unreadCount': 1 } }
  );
  // Update local instance if needed
  const userIdStr = userIdObj.toString();
  const userSetting = this.userSettings.find(
    setting => setting.userId && setting.userId.toString() === userIdStr
  );
  if (userSetting) {
    userSetting.unreadCount = (userSetting.unreadCount || 0) + 1;
  }
};

datingChatSchema.methods.resetUnreadCount = async function(userId) {
  // Convert userId to ObjectId for consistency
  const userIdObj = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
  
  // Use atomic update for thread-safety and immediate persistence
  await this.constructor.updateOne(
    { _id: this._id, 'userSettings.userId': userIdObj },
    {
      $set: {
        'userSettings.$.unreadCount': 0,
        'userSettings.$.lastReadAt': new Date()
      }
    }
  );
  // Update local instance if needed
  const userIdStr = userIdObj.toString();
  const userSetting = this.userSettings.find(
    setting => setting.userId && setting.userId.toString() === userIdStr
  );
  if (userSetting) {
    userSetting.unreadCount = 0;
    userSetting.lastReadAt = new Date();
  }
};

datingChatSchema.methods.setActiveCall = async function(callData) {
  // Use updateOne for atomic update instead of full document save
  await this.constructor.updateOne(
    { _id: this._id },
    {
      $set: {
        'activeCall.callId': callData.callId,
        'activeCall.type': callData.type,
        'activeCall.status': callData.status,
        'activeCall.startedAt': callData.startedAt || new Date()
      }
    }
  );
  // Update local instance
  this.activeCall = {
    callId: callData.callId,
    type: callData.type,
    status: callData.status,
    startedAt: callData.startedAt || new Date()
  };
};

datingChatSchema.methods.clearActiveCall = async function() {
  // Use updateOne for atomic update instead of full document save
  await this.constructor.updateOne(
    { _id: this._id },
    {
      $set: {
        'activeCall.callId': null,
        'activeCall.type': null,
        'activeCall.status': null,
        'activeCall.startedAt': null
      }
    }
  );
  // Update local instance
  this.activeCall = {
    callId: null,
    type: null,
    status: null,
    startedAt: null
  };
};

// Export model
const DatingChat = mongoose.model('DatingChat', datingChatSchema);

module.exports = DatingChat;

