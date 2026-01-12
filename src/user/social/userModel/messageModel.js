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
messageSchema.index({ senderId: 1, createdAt: -1 });
messageSchema.index({ type: 1, createdAt: -1 });
messageSchema.index({ isDeleted: 1, deletedBy: 1 });
messageSchema.index({ 'readBy.userId': 1 });

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
	
    // Build query - include messages deleted for everyone (to show placeholder)
    // but exclude messages deleted "for me" by this user
	const query = { 
      chatId: chatId
	};
	
	// If userId provided, exclude messages deleted "for me" by that user
	// But include messages deleted "for everyone" (to show placeholder)
	if (userId) {
      // Exclude messages where user deleted it "for me" (not for everyone)
      // Include messages that are:
      // 1. Not deleted at all
      // 2. Deleted for everyone (show placeholder)
      // 3. Deleted by other users (not this user)
      query.$or = [
        { isDeleted: false }, // Not deleted
        { deletedForEveryone: true }, // Deleted for everyone (show placeholder)
        { 
          // Not deleted by this user "for me"
          $and: [
            { 'deletedBy.userId': { $ne: userId } },
            { deletedForEveryone: { $ne: true } }
          ]
        }
      ];
	} else {
      // If no userId, just exclude hard-deleted messages that aren't deleted for everyone
      query.$or = [
        { isDeleted: false },
        { deletedForEveryone: true }
      ];
	}
	
	// If deletedAt timestamp provided, only show messages created after deletion
	// This implements Instagram/WhatsApp behavior: when chat is deleted and then reappears,
	// only messages sent after deletion are visible
	if (deletedAt) {
      query.createdAt = { $gt: deletedAt };
      console.log(`🔵 [MESSAGE_MODEL] Filtering messages after deletion timestamp: ${deletedAt}`);
	}
	
	const messages = await this.find(query)
		.populate('senderId', 'username fullName profilePictureUrl')
		.populate('replyTo', 'content type senderId')
		.populate('forwardedFrom', 'content type senderId')
		.populate('reactions.userId', 'username fullName')
		.sort({ createdAt: -1 })
		.skip(skip)
		.limit(limit)
		.lean();

	// Filter out messages deleted "for me" by this user (post-query filter for accuracy)
	let filteredMessages = messages;
	if (userId) {
      filteredMessages = messages.filter(msg => {
        // Include if not deleted
        if (!msg.isDeleted) return true;
        
        // Include if deleted for everyone (show placeholder)
        if (msg.deletedForEveryone) return true;
        
        // Exclude if this user deleted it "for me"
        const userDeleted = msg.deletedBy?.some(deletion => 
          deletion.userId?.toString() === userId.toString() && 
          !deletion.deletedForEveryone
        );
        
        return !userDeleted;
      });
	}

	// Transform deleted messages to show placeholder
	const transformedMessages = filteredMessages.map(msg => {
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

	// Debug: Log voice messages to check duration
	const voiceMessages = transformedMessages.filter(msg => msg.type === 'voice');
	if (voiceMessages.length > 0) {
		console.log('🔵 [MESSAGE_MODEL] Voice messages from database:', voiceMessages.map(msg => ({
			messageId: msg._id,
			hasMedia: !!msg.media,
			mediaDuration: msg.media?.duration,
			mediaKeys: msg.media ? Object.keys(msg.media) : [],
			mediaUrl: msg.media?.url,
			fullMedia: JSON.stringify(msg.media)
		})));
	}

	return transformedMessages.reverse(); // Return in chronological order
  } catch (error) {
    throw new Error(`Failed to get chat messages: ${error.message}`);
  }
};

messageSchema.statics.getUnreadCount = async function(chatId, userId) {
  try {
	const count = await this.countDocuments({
      chatId: chatId,
		senderId: { $ne: userId },
		'readBy.userId': { $ne: userId },
		isDeleted: false,
      'deletedBy.userId': { $ne: userId }
	});
	
	return count;
  } catch (error) {
    throw new Error(`Failed to get unread count: ${error.message}`);
  }
};

messageSchema.statics.markChatAsRead = async function(chatId, userId) {
  try {
    const result = await this.updateMany(
      {
        chatId: chatId,
		senderId: { $ne: userId },
		'readBy.userId': { $ne: userId },
        isDeleted: false
      },
      {
        $addToSet: {
          readBy: {
            userId: userId,
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
	
    const searchQuery = {
      chatId: chatId,
      content: { $regex: query, $options: 'i' },
      isDeleted: false,
      'deletedBy.userId': { $ne: userId }
    };
    
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
	
	const query = {
      chatId: chatId,
      type: { $in: ['audio', 'video', 'image', 'document', 'gif', 'voice'] },
      isDeleted: false,
      'deletedBy.userId': { $ne: userId }
    };
    
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
    
    // Store edit history
    if (this.content !== newContent) {
      this.editHistory.push({
        content: this.content,
        editedAt: new Date()
      });
      
      this.content = newContent;
      this.editedAt = new Date();
      
      await this.save();
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
    // Check if already deleted by this user
    const alreadyDeleted = this.deletedBy.some(
      deletion => deletion.userId.toString() === userId.toString()
    );
    
    if (alreadyDeleted) {
      throw new Error('Message already deleted by this user');
    }
    
    // Validate "Delete for Everyone" restrictions
    if (deleteForEveryone) {
      // Only sender can delete for everyone
      if (this.senderId.toString() !== userId.toString()) {
        throw new Error('You can only delete your own messages for everyone');
      }
      
      // Check time restriction (1 hour limit)
      if (!this.canDeleteForEveryone()) {
        throw new Error('Cannot delete for everyone: Message is older than 1 hour');
      }
    }
    
    // Add deletion record
    this.deletedBy.push({
      userId: userId,
      deletedAt: new Date(),
      deletedForEveryone: deleteForEveryone
    });
    
    // Handle deletion logic based on type
    if (deleteForEveryone) {
      // "Delete for Everyone" - hard delete, visible to all
      this.isDeleted = true;
      this.deletedForEveryone = true;
    } else {
      // "Delete for Me" - soft delete, only affects this user's view
      // Check if all participants have deleted the message (for cleanup)
      const Chat = mongoose.model('Chat');
      const chat = await Chat.findById(this.chatId);
      
      if (this.senderId.toString() === userId.toString()) {
        // If sender deletes "for me", don't hard delete
        // Message remains visible to other participants
      } else {
        // Check if all participants have deleted the message
        const participantIds = chat.participants.map(p => p.toString());
        const deletedByParticipants = this.deletedBy.map(d => d.userId.toString());
        const allParticipantsDeleted = participantIds.every(id => 
          deletedByParticipants.includes(id)
        );
        
        if (allParticipantsDeleted) {
          this.isDeleted = true;
        }
      }
    }
    
    await this.save();
    return this;
  } catch (error) {
    throw new Error(`Failed to delete message: ${error.message}`);
  }
};

messageSchema.methods.addReaction = async function(userId, emoji) {
  try {
    // Remove existing reaction from this user
    this.reactions = this.reactions.filter(
      reaction => reaction.userId.toString() !== userId.toString()
    );
    
    // Add new reaction
    this.reactions.push({
      userId: userId,
      emoji: emoji,
      createdAt: new Date()
    });
    
    await this.save();
    return this;
  } catch (error) {
    throw new Error(`Failed to add reaction: ${error.message}`);
  }
};

messageSchema.methods.removeReaction = async function(userId) {
  try {
    this.reactions = this.reactions.filter(
      reaction => reaction.userId.toString() !== userId.toString()
    );
    
    await this.save();
    return this;
  } catch (error) {
    throw new Error(`Failed to remove reaction: ${error.message}`);
  }
};

messageSchema.methods.markAsRead = async function(userId) {
  try {
    const alreadyRead = this.readBy.some(
      read => read.userId.toString() === userId.toString()
    );
    
    if (!alreadyRead) {
      this.readBy.push({
        userId: userId,
        readAt: new Date()
      });
      
      // Update status to delivered if not already read
      if (this.status !== 'read') {
        this.status = 'delivered';
      }
      
      await this.save();
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