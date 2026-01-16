const mongoose = require('mongoose');
const { Schema } = mongoose;

// Enhanced Message Schema with comprehensive validation
const messageSchema = new Schema({
  // Core message properties
		chatId: { 
    type: Schema.Types.ObjectId,
			ref: 'Chat', 
			required: true,
			index: true
		},
  
		senderId: { 
    type: Schema.Types.ObjectId,
			ref: 'User', 
			required: true,
			index: true
		},
  
  // Message content
  content: {
    type: String,
    required: function() {
      return this.type === 'text' || this.type === 'system';
    },
    maxlength: 4096, // 4KB limit for text messages
    trim: true
  },
  
  // Message type with validation
		type: { 
			type: String, 
    enum: ['text', 'audio', 'video', 'image', 'document', 'gif', 'location', 'voice', 'system', 'forwarded'],
			required: true,
			default: 'text'
		},
  
  // Media properties
  media: {
    url: {
      type: String,
      required: function() {
        return ['audio', 'video', 'image', 'document', 'gif', 'voice'].includes(this.type);
      }
    },
    mimeType: {
			type: String, 
      required: function() {
        return this.url;
      }
    },
    fileName: String,
    fileSize: {
      type: Number,
      min: 0,
      max: 50 * 1024 * 1024 // 50MB max file size
    },
    duration: {
      type: Number,
      min: 0,
      default: 0, // Default to 0 if not provided
      required: function() {
        // Duration is required but can be 0 (will be set to 0 if not provided)
        return ['audio', 'video', 'voice'].includes(this.type);
      },
      validate: {
        validator: function(v) {
          // Allow 0 or positive numbers
          return v >= 0;
        },
        message: 'Duration must be a non-negative number'
      }
    },
    thumbnail: String, // For video/image thumbnails
    dimensions: {
      width: Number,
      height: Number
    },
    // GIF-specific fields
    isAnimated: {
      type: Boolean,
      default: false
    },
    gifSource: {
      type: String,
      enum: ['upload', 'giphy', 'tenor', null],
      default: null
    },
    gifId: String // External GIF ID if from service
  },
  
		// Message threading
		replyTo: { 
    type: Schema.Types.ObjectId,
			ref: 'Message', 
			default: null 
		},
  
		forwardedFrom: { 
    type: Schema.Types.ObjectId,
			ref: 'Message', 
			default: null 
		},
  
  // Message status tracking
		status: {
			type: String,
    enum: ['sending', 'sent', 'delivered', 'read', 'failed'],
			default: 'sent'
		},
  
  // Read receipts
  readBy: [{
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Message reactions
  reactions: [{
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    emoji: {
      type: String,
      required: true,
      maxlength: 10
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Message editing
  editedAt: {
    type: Date,
    default: null
  },
  
  editHistory: [{
    content: String,
    editedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Message deletion
		isDeleted: { 
			type: Boolean, 
			default: false 
  },
  
  // Track if message was deleted for everyone (WhatsApp-style)
  deletedForEveryone: {
    type: Boolean,
    default: false
  },
  
  deletedBy: [{
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
		},
		deletedAt: { 
			type: Date, 
      default: Date.now
    },
    // Track deletion type for each user
    deletedForEveryone: {
      type: Boolean,
      default: false
    }
  }],
  
  // One-view (disappearing message) properties
  isOneView: {
    type: Boolean,
    default: false
  },
  oneViewExpiresAt: {
    type: Date,
    default: null
  },
  viewedBy: [{
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    viewedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Location data (for location messages)
  location: {
    latitude: {
      type: Number,
      required: function() {
        return this.type === 'location';
      },
      min: -90,
      max: 90
    },
    longitude: {
      type: Number,
      required: function() {
        return this.type === 'location';
      },
      min: -180,
      max: 180
    },
    address: String,
    name: String,
    placeType: String // e.g., 'restaurant', 'hotel', 'park', etc.
  },

  // Music metadata (for music/audio files)
  musicMetadata: {
    title: String,
    artist: String,
    album: String,
    duration: Number, // in seconds
    genre: String
  },

  // Message metadata
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
messageSchema.index({ chatId: 1, createdAt: -1 });
messageSchema.index({ chatId: 1, isDeleted: 1, 'deletedBy.userId': 1, createdAt: -1 });
messageSchema.index({ chatId: 1, deletedForEveryone: 1, createdAt: -1 });
messageSchema.index({ chatId: 1, senderId: 1, 'readBy.userId': 1, isDeleted: 1 });
messageSchema.index({ chatId: 1, type: 1, isDeleted: 1, 'deletedBy.userId': 1 }); // For getChatMedia
messageSchema.index({ senderId: 1, createdAt: -1 });
messageSchema.index({ type: 1, createdAt: -1 });
messageSchema.index({ isDeleted: 1, deletedBy: 1 });
messageSchema.index({ 'readBy.userId': 1 });
messageSchema.index({ content: 'text' }); // Text index for search

// Pre-save middleware
messageSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Validate message content based on type
  if (this.type === 'text' && (!this.content || this.content.trim().length === 0)) {
    return next(new Error('Text message content cannot be empty'));
  }
  
  // Validate media messages
  if (['audio', 'video', 'image', 'document', 'gif', 'voice'].includes(this.type) && !this.media?.url) {
    return next(new Error('Media message must have a URL'));
  }

  // Validate location messages
  if (this.type === 'location') {
    if (!this.location || typeof this.location.latitude !== 'number' || typeof this.location.longitude !== 'number') {
      return next(new Error('Location message must have valid latitude and longitude'));
    }
  }

  // Validate one-view messages
  if (this.isOneView) {
    if (!this.oneViewExpiresAt) {
      // Default to 24 hours if not specified
      this.oneViewExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    }
    // Only images and videos can be one-view
    if (!['image', 'video', 'gif'].includes(this.type)) {
      return next(new Error('One-view messages are only supported for images, videos, and GIFs'));
    }
  }
  
  // Limit edit history
  if (this.editHistory && this.editHistory.length > 10) {
    this.editHistory = this.editHistory.slice(-10); // Keep only last 10 edits
  }
  
  next();
});

// Static methods
messageSchema.statics.getChatMessages = async function(chatId, page = 1, limit = 50, userId = null, deletedAt = null) {
  try {
	const skip = (page - 1) * limit;
	
	// Convert chatId to ObjectId if needed
	const chatIdObj = mongoose.Types.ObjectId.isValid(chatId) ? new mongoose.Types.ObjectId(chatId) : chatId;
	const userIdObj = userId && mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
	
	// Build base match query with proper ObjectId
	const baseMatch = {
		chatId: chatIdObj
	};
	
	// If deletedAt timestamp provided, only show messages created after deletion
	// This implements Instagram/WhatsApp behavior: when chat is deleted and then reappears,
	// only messages sent after deletion are visible
	if (deletedAt) {
		baseMatch.createdAt = { $gt: deletedAt };
	}
	
	const pipeline = [
		{ $match: baseMatch },
		{
			$addFields: {
				userDeletedForMe: userIdObj ? {
					$anyElementTrue: {
						$map: {
							input: { $ifNull: ['$deletedBy', []] },
							as: 'deletion',
							in: {
								$and: [
									{ $eq: ['$$deletion.userId', userIdObj] },
									{ $ne: ['$$deletion.deletedForEveryone', true] }
								]
							}
						}
					}
				} : false
			}
		},
		{
			$match: userIdObj ? {
				$or: [
					{ isDeleted: false },
					{ deletedForEveryone: true },
					{ userDeletedForMe: false }
				]
			} : {
				$or: [
					{ isDeleted: false },
					{ deletedForEveryone: true }
				]
			}
		},
		{ $sort: { createdAt: -1 } },
		{ $skip: skip },
		{ $limit: limit }
	];
	
	// Use $lookup to populate in the same aggregation pipeline (more efficient)
	// Get collection names dynamically to avoid hardcoding
	const User = mongoose.model('User');
	const userCollectionName = User.collection.name;
	const messageCollectionName = this.collection.name;
	
	const populatedPipeline = [
		...pipeline,
		{
			$lookup: {
				from: userCollectionName,
				localField: 'senderId',
				foreignField: '_id',
				as: 'senderId',
				pipeline: [
					{
						$project: {
							username: 1,
							fullName: 1,
							profilePictureUrl: 1
						}
					}
				]
			}
		},
		{
			$addFields: {
				senderId: { $arrayElemAt: ['$senderId', 0] }
			}
		},
		{
			$lookup: {
				from: messageCollectionName,
				localField: 'replyTo',
				foreignField: '_id',
				as: 'replyTo',
				pipeline: [
					{
						$project: {
							content: 1,
							type: 1,
							senderId: 1
						}
					},
					{
						$lookup: {
							from: userCollectionName,
							localField: 'senderId',
							foreignField: '_id',
							as: 'senderId',
							pipeline: [
								{
									$project: {
										username: 1,
										fullName: 1,
										profilePictureUrl: 1
									}
								}
							]
						}
					},
					{
						$addFields: {
							senderId: { $arrayElemAt: ['$senderId', 0] }
						}
					},
					{ $limit: 1 }
				]
			}
		},
		{
			$addFields: {
				replyTo: { $arrayElemAt: ['$replyTo', 0] }
			}
		},
		{
			$lookup: {
				from: messageCollectionName,
				localField: 'forwardedFrom',
				foreignField: '_id',
				as: 'forwardedFrom',
				pipeline: [
					{
						$project: {
							content: 1,
							type: 1,
							senderId: 1
						}
					},
					{
						$lookup: {
							from: userCollectionName,
							localField: 'senderId',
							foreignField: '_id',
							as: 'senderId',
							pipeline: [
								{
									$project: {
										username: 1,
										fullName: 1,
										profilePictureUrl: 1
									}
								}
							]
						}
					},
					{
						$addFields: {
							senderId: { $arrayElemAt: ['$senderId', 0] }
						}
					},
					{ $limit: 1 }
				]
			}
		},
		{
			$addFields: {
				forwardedFrom: { $arrayElemAt: ['$forwardedFrom', 0] }
			}
		},
		// For reactions, we'll populate separately as it's complex with nested arrays
		// The main performance gain is from combining senderId, replyTo, forwardedFrom lookups
	];
	
	let messages = await this.aggregate(populatedPipeline);
	
	// Populate reactions separately (complex nested array structure)
	// Only populate if messages have reactions to avoid unnecessary query
	if (messages.length > 0 && messages.some(m => m.reactions && m.reactions.length > 0)) {
		const messageIds = messages.map(m => m._id);
		const messagesWithReactions = await this.find({ _id: { $in: messageIds } })
			.populate('reactions.userId', 'username fullName')
			.lean();
		
		// Merge reactions into messages using Map for O(1) lookup
		const reactionsMap = new Map(messagesWithReactions.map(m => [m._id.toString(), m.reactions || []]));
		messages = messages.map(m => {
			m.reactions = reactionsMap.get(m._id.toString()) || m.reactions || [];
			return m;
		});
	}

	// Transform deleted messages to show placeholder
	const transformedMessages = messages.map(msg => {
		// If message is deleted for everyone, show placeholder
		if (msg.isDeleted && msg.deletedForEveryone) {
			return {
				...msg,
				content: 'This message was deleted',
				type: 'deleted',
				media: null, // Remove media for deleted messages
				location: null, // Remove location for deleted messages
				musicMetadata: null // Remove music metadata for deleted messages
			};
		}
		return msg;
	});

	return transformedMessages.reverse(); // Return in chronological order
  } catch (error) {
    throw new Error(`Failed to get chat messages: ${error.message}`);
  }
};

messageSchema.statics.getUnreadCount = async function(chatId, userId) {
  try {
	// Use aggregation for better performance with complex conditions
	const chatIdObj = mongoose.Types.ObjectId.isValid(chatId) ? new mongoose.Types.ObjectId(chatId) : chatId;
	const userIdObj = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
	
	const result = await this.aggregate([
		{
			$match: {
				chatId: chatIdObj,
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
		{ $count: 'count' }
	]);
	
	return result[0]?.count || 0;
  } catch (error) {
    throw new Error(`Failed to get unread count: ${error.message}`);
  }
};

messageSchema.statics.markChatAsRead = async function(chatId, userId) {
  try {
    // Convert to ObjectId for consistency
    const chatIdObj = mongoose.Types.ObjectId.isValid(chatId) ? new mongoose.Types.ObjectId(chatId) : chatId;
    const userIdObj = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
    
    const result = await this.updateMany(
      {
        chatId: chatIdObj,
		senderId: { $ne: userIdObj },
		'readBy.userId': { $ne: userIdObj },
        isDeleted: false
      },
      {
        $addToSet: {
          readBy: {
            userId: userIdObj,
            readAt: new Date()
          }
        },
        $set: {
          status: 'read'
        }
      }
    );
    
    return result.modifiedCount;
  } catch (error) {
    throw new Error(`Failed to mark messages as read: ${error.message}`);
  }
};

messageSchema.statics.searchMessages = async function(chatId, query, userId, page = 1, limit = 20) {
  try {
	const skip = (page - 1) * limit;
	
	// Convert to ObjectId for consistency
	const chatIdObj = mongoose.Types.ObjectId.isValid(chatId) ? new mongoose.Types.ObjectId(chatId) : chatId;
	const userIdObj = userId && mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
	
    const searchQuery = {
      chatId: chatIdObj,
      isDeleted: false
    };
    
    // Try text search first (faster), fall back to regex
    // Use try-catch instead of expensive index check
    try {
      searchQuery.$text = { $search: query };
      // Text search requires score projection
      const messages = await this.find(searchQuery, { score: { $meta: 'textScore' } })
        .populate('senderId', 'username fullName profilePictureUrl')
        .sort({ score: { $meta: 'textScore' }, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
      
      // Exclude messages deleted by this user (post-filter for text search)
      // Use Set for O(1) lookup if filtering many messages
      if (userIdObj) {
        const userIdStr = userIdObj.toString();
        return messages.filter(msg => {
          if (!msg.deletedBy || msg.deletedBy.length === 0) return true;
          // Use Set for O(1) lookup when filtering many messages
          const deletedBySet = new Set(msg.deletedBy.map(d => d.userId?.toString()));
          return !deletedBySet.has(userIdStr);
        });
      }
      return messages;
    } catch (textSearchError) {
      // Fall back to regex search if text index not available
      searchQuery.content = { $regex: query, $options: 'i' };
    }
    
    // Exclude messages deleted by this user
    if (userIdObj) {
      searchQuery['deletedBy.userId'] = { $ne: userIdObj };
    }
    
    const messages = await this.find(searchQuery)
		.populate('senderId', 'username fullName profilePictureUrl')
		.sort({ createdAt: -1 })
		.skip(skip)
		.limit(limit)
		.lean();

	return messages;
  } catch (error) {
    throw new Error(`Failed to search messages: ${error.message}`);
  }
};

messageSchema.statics.getChatMedia = async function(chatId, type = null, userId, page = 1, limit = 20) {
  try {
	const skip = (page - 1) * limit;
	
	// Convert to ObjectId for consistency
	const chatIdObj = mongoose.Types.ObjectId.isValid(chatId) ? new mongoose.Types.ObjectId(chatId) : chatId;
	const userIdObj = userId && mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
	
	const query = {
      chatId: chatIdObj,
      type: { $in: ['audio', 'video', 'image', 'document', 'gif', 'voice'] },
      isDeleted: false
    };
    
    if (userIdObj) {
      query['deletedBy.userId'] = { $ne: userIdObj };
    }
    
    if (type) {
      query.type = type;
	}
	
	const messages = await this.find(query)
		.populate('senderId', 'username fullName profilePictureUrl')
		.sort({ createdAt: -1 })
		.skip(skip)
		.limit(limit)
		.lean();

	return messages;
  } catch (error) {
    throw new Error(`Failed to get chat media: ${error.message}`);
  }
};

// Instance methods
messageSchema.methods.editMessage = async function(newContent) {
  try {
    // Validate edit permission (24 hours limit)
    const editTimeLimit = 24 * 60 * 60 * 1000; // 24 hours
    const messageAge = Date.now() - this.createdAt.getTime();
    
    if (messageAge > editTimeLimit) {
      throw new Error('Message is too old to edit');
    }
    
    // Store edit history and update content atomically
    if (this.content !== newContent) {
      await this.constructor.updateOne(
        { _id: this._id },
        {
          $push: {
            editHistory: {
              content: this.content,
              editedAt: new Date()
            }
          },
          $set: {
            content: newContent,
            editedAt: new Date()
          }
        }
      );
      
      // Update local instance
      this.editHistory.push({
        content: this.content,
        editedAt: new Date()
      });
      this.content = newContent;
      this.editedAt = new Date();
    }
    
    return this;
  } catch (error) {
    throw new Error(`Failed to edit message: ${error.message}`);
  }
};

// Helper method to check if message can be deleted for everyone (1 hour limit)
// Works for ALL message types: text, image, video, audio, voice, location, gif, document, forwarded, system
messageSchema.methods.canDeleteForEveryone = function() {
  const messageAge = Date.now() - this.createdAt.getTime();
  const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds
  return messageAge < oneHour;
};

// Delete message for user - works for ALL message types
// No restrictions based on message type (text, image, video, audio, voice, location, gif, document, forwarded, system)
messageSchema.methods.deleteForUser = async function(userId, deleteForEveryone = false) {
  try {
    // Convert userId to ObjectId for consistency (do this first)
    const userIdObj = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
    const userIdStr = userIdObj.toString();
    
    // Check if already deleted by this user - use Set for O(1) lookup
    const deletedByUserIdsSet = new Set(this.deletedBy.map(d => d.userId.toString()));
    const alreadyDeleted = deletedByUserIdsSet.has(userIdStr);
    
    if (alreadyDeleted) {
      throw new Error('Message already deleted by this user');
    }
    
    // Validate "Delete for Everyone" restrictions
    if (deleteForEveryone) {
      // Only sender can delete for everyone
      if (this.senderId.toString() !== userIdStr) {
        throw new Error('You can only delete your own messages for everyone');
      }
      
      // Check time restriction (1 hour limit)
      if (!this.canDeleteForEveryone()) {
        throw new Error('Cannot delete for everyone: Message is older than 1 hour');
      }
    }
    
    // Build atomic update operation
    const updateOps = {
      $push: {
        deletedBy: {
          userId: userIdObj,
          deletedAt: new Date(),
          deletedForEveryone: deleteForEveryone
        }
      }
    };
    
    // Handle deletion logic based on type
    if (deleteForEveryone) {
      // "Delete for Everyone" - hard delete, visible to all
      updateOps.$set = {
        isDeleted: true,
        deletedForEveryone: true
      };
    } else {
      // "Delete for Me" - soft delete, only affects this user's view
      // Check if all participants have deleted the message (for cleanup)
      const Chat = mongoose.model('Chat');
      // Use projection to fetch only participants field
      const chat = await Chat.findById(this.chatId).select('participants').lean();
      
      if (this.senderId.toString() !== userIdObj.toString()) {
        // Check if all participants have deleted the message
        // Use Set for O(1) lookups
        const participantIdsSet = new Set((chat.participants || []).map(p => p.toString()));
        const currentDeletedBy = [...this.deletedBy, { userId: userIdObj, deletedForEveryone: false }];
        const deletedByParticipantsSet = new Set(currentDeletedBy.map(d => d.userId.toString()));
        const allParticipantsDeleted = Array.from(participantIdsSet).every(id => 
          deletedByParticipantsSet.has(id)
        );
        
        if (allParticipantsDeleted) {
          updateOps.$set = { isDeleted: true };
        }
      }
    }
    
    // Execute atomic update
    await this.constructor.updateOne({ _id: this._id }, updateOps);
    
    // Update local instance
    this.deletedBy.push({
      userId: userIdObj,
      deletedAt: new Date(),
      deletedForEveryone: deleteForEveryone
    });
    if (updateOps.$set) {
      Object.assign(this, updateOps.$set);
    }
    
    return this;
  } catch (error) {
    throw new Error(`Failed to delete message: ${error.message}`);
  }
};

messageSchema.methods.addReaction = async function(userId, emoji) {
  try {
    // Convert userId to ObjectId for consistency
    const userIdObj = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
    
    // Use atomic update instead of full document save
    await this.constructor.updateOne(
      { _id: this._id },
      {
        $pull: { reactions: { userId: userIdObj } },
        $push: {
          reactions: {
            userId: userIdObj,
            emoji: emoji,
            createdAt: new Date()
          }
        }
      }
    );
    
    // Update local instance
    const userIdStr = userIdObj.toString();
    this.reactions = this.reactions.filter(
      reaction => reaction.userId.toString() !== userIdStr
    );
    this.reactions.push({
      userId: userIdObj,
      emoji: emoji,
      createdAt: new Date()
    });
    
    return this;
  } catch (error) {
    throw new Error(`Failed to add reaction: ${error.message}`);
  }
};

messageSchema.methods.removeReaction = async function(userId) {
  try {
    // Convert userId to ObjectId for consistency
    const userIdObj = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
    
    // Use atomic update instead of full document save
    await this.constructor.updateOne(
      { _id: this._id },
      { $pull: { reactions: { userId: userIdObj } } }
    );
    
    // Update local instance
    const userIdStr = userIdObj.toString();
    this.reactions = this.reactions.filter(
      reaction => reaction.userId.toString() !== userIdStr
    );
    
    return this;
  } catch (error) {
    throw new Error(`Failed to remove reaction: ${error.message}`);
  }
};

messageSchema.methods.markAsRead = async function(userId) {
  try {
    // Convert userId to ObjectId for consistency
    const userIdObj = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
    
    // Use Set for O(1) lookup instead of O(n) array.some()
    const userIdStr = userIdObj.toString();
    const readByUserIdsSet = new Set(this.readBy.map(r => r.userId.toString()));
    const alreadyRead = readByUserIdsSet.has(userIdStr);
    
    if (!alreadyRead) {
      // Use atomic update instead of full document save
      const updateObj = {
        $addToSet: {
          readBy: {
            userId: userIdObj,
            readAt: new Date()
          }
        }
      };
      
      // Update status to delivered if not already read
      if (this.status !== 'read') {
        updateObj.$set = { status: 'delivered' };
      }
      
      await this.constructor.updateOne(
        { _id: this._id },
        updateObj
      );
      
      // Update local instance
      this.readBy.push({
        userId: userIdObj,
        readAt: new Date()
      });
      if (this.status !== 'read') {
        this.status = 'delivered';
      }
    }
    
    return this;
  } catch (error) {
    throw new Error(`Failed to mark message as read: ${error.message}`);
  }
};

// Virtual fields
messageSchema.virtual('isEdited').get(function() {
  return !!this.editedAt;
});

messageSchema.virtual('reactionCount').get(function() {
  return this.reactions.length;
});

messageSchema.virtual('readCount').get(function() {
  return this.readBy.length;
});

// Export model
const Message = mongoose.model('Message', messageSchema);

module.exports = Message;