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
  versionKey: false
});

// Indexes for optimal performance
chatSchema.index({ participants: 1, isActive: 1 });
chatSchema.index({ lastMessageAt: -1 });
chatSchema.index({ 'userSettings.userId': 1, isActive: 1 });
chatSchema.index({ 'userSettings.userId': 1, 'userSettings.isArchived': 1, isActive: 1 });
chatSchema.index({ participants: 1, isActive: 1, lastMessageAt: -1 });
chatSchema.index({ 'activeCall.callId': 1 });

// Schema-level validation for participants
chatSchema.pre('validate', function(next) {
  if (this.chatType === 'direct' && this.participants.length !== 2) {
    return next(new Error('Direct chat must have exactly 2 participants'));
  }
  next();
});

// Pre-save middleware - optimized with Set for O(1) lookups
chatSchema.pre('save', function(next) {
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
chatSchema.statics.findOrCreateChat = async function(userId1, userId2, createdBy, session = null) {
  try {
    // Validate input
    if (!userId1 || !userId2) {
      throw new Error('Both user IDs are required');
    }
    
    if (userId1 === userId2) {
      throw new Error('Cannot create chat with yourself');
    }
    
    // Convert to ObjectId for consistency
    const userId1Obj = mongoose.Types.ObjectId.isValid(userId1) ? new mongoose.Types.ObjectId(userId1) : userId1;
    const userId2Obj = mongoose.Types.ObjectId.isValid(userId2) ? new mongoose.Types.ObjectId(userId2) : userId2;
    const createdByObj = createdBy ? (mongoose.Types.ObjectId.isValid(createdBy) ? new mongoose.Types.ObjectId(createdBy) : createdBy) : userId1Obj;
    
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
        participants: { $all: [userId1Obj, userId2Obj] },
        isActive: true,
        chatType: 'direct'
      },
      {
        $setOnInsert: {
          participants: [userId1Obj, userId2Obj],
          chatType: 'direct',
          createdBy: createdByObj,
          isActive: true
        }
      },
      options
    );

	return chat;
  } catch (error) {
    throw new Error(`Failed to find or create chat: ${error.message}`);
  }
};

chatSchema.statics.getUserChats = async function(userId, page = 1, limit = 20, includeArchived = false) {
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
	const Message = mongoose.model('Message');
	const userCollectionName = User.collection.name;
	const messageCollectionName = Message.collection.name;
	
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
    throw new Error(`Failed to get user chats: ${error.message}`);
  }
};

chatSchema.statics.canUsersChat = async function(userId1, userId2) {
  try {
    // Check if users exist and are active
	const User = mongoose.model('User');
	const [user1, user2] = await Promise.all([
      User.findById(userId1).select('isActive following privacySettings'),
      User.findById(userId2).select('isActive following privacySettings')
    ]);
    
    if (!user1 || !user2) {
      return { canChat: false, reason: 'user_not_found' };
    }
    
    if (!user1.isActive || !user2.isActive) {
      return { canChat: false, reason: 'user_inactive' };
    }
    
    // Convert userIds to ObjectId for consistent querying
    const userId1Obj = mongoose.Types.ObjectId.isValid(userId1) ? new mongoose.Types.ObjectId(userId1) : userId1;
    const userId2Obj = mongoose.Types.ObjectId.isValid(userId2) ? new mongoose.Types.ObjectId(userId2) : userId2;
    
    // Check if there's an existing chat and message request in parallel
    const MessageRequest = mongoose.model('MessageRequest');
    const [existingChat, messageRequest] = await Promise.all([
      this.findOne({
        participants: { $all: [userId1Obj, userId2Obj] },
        isActive: true
      }),
      MessageRequest.findOne({
        $or: [
          { fromUserId: userId1Obj, toUserId: userId2Obj },
          { fromUserId: userId2Obj, toUserId: userId1Obj }
        ],
        status: 'accepted'
      })
    ]);
    
    if (existingChat) {
      return { canChat: true, reason: 'existing_chat' };
    }
    
    if (messageRequest) {
      return { canChat: true, reason: 'accepted_request' };
    }
    
    // Check if users follow each other and privacy settings
    // Use Set for O(1) lookups instead of array.includes() which is O(n)
    const user1FollowingSet = new Set((user1.following || []).map(id => id.toString()));
    const user2FollowingSet = new Set((user2.following || []).map(id => id.toString()));
    
    const userId1Str = userId1.toString();
    const userId2Str = userId2.toString();
    
    const user1FollowsUser2 = user1FollowingSet.has(userId2Str);
    const user2FollowsUser1 = user2FollowingSet.has(userId1Str);
    const isMutualFollow = user1FollowsUser2 && user2FollowsUser1;
    
    // Get privacy settings
    const user1AllowMessages = user1.privacySettings?.allowMessages || 'followers';
    const user2AllowMessages = user2.privacySettings?.allowMessages || 'followers';
    
    // Mutual follow - always allows chat
    if (isMutualFollow) {
      return { canChat: true, reason: 'mutual_follow' };
    }
    
    // Check privacy settings for one-way following
    // If user2 allows messages from followers and user1 follows user2
    if (user2AllowMessages === 'followers' && user1FollowsUser2) {
      return { canChat: true, reason: 'follower_can_message' };
    }
    
    // If user1 allows messages from followers and user2 follows user1
    if (user1AllowMessages === 'followers' && user2FollowsUser1) {
      return { canChat: true, reason: 'follower_can_message' };
    }
    
    // If user2 allows messages from everyone
    if (user2AllowMessages === 'everyone') {
      return { canChat: true, reason: 'public_messaging_allowed' };
    }
    
    // If user1 allows messages from everyone
    if (user1AllowMessages === 'everyone') {
      return { canChat: true, reason: 'public_messaging_allowed' };
    }

	return { canChat: false, reason: 'no_permission' };
  } catch (error) {
    throw new Error(`Failed to check chat permissions: ${error.message}`);
  }
};

// Instance methods
chatSchema.methods.updateUserSettings = async function(userId, updates) {
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

chatSchema.methods.incrementUnreadCount = async function(userId) {
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

chatSchema.methods.resetUnreadCount = async function(userId) {
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

chatSchema.methods.setActiveCall = async function(callData) {
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

chatSchema.methods.clearActiveCall = async function() {
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

// Virtual fields - removed broken virtual that references non-existent currentUserId
// If needed, should be implemented as a method with userId parameter

// Export model
const Chat = mongoose.model('Chat', chatSchema);

module.exports = Chat;