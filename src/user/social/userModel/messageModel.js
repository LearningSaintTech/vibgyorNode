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
    enum: ['text', 'audio', 'video', 'image', 'document', 'system', 'forwarded'],
			required: true,
			default: 'text'
		},
  
  // Media properties
  media: {
    url: {
      type: String,
      required: function() {
        return ['audio', 'video', 'image', 'document'].includes(this.type);
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
      required: function() {
        return ['audio', 'video'].includes(this.type);
      }
    },
    thumbnail: String, // For video/image thumbnails
			dimensions: {
      width: Number,
      height: Number
			}
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
  
  deletedBy: [{
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
		},
		deletedAt: { 
			type: Date, 
      default: Date.now
    }
  }],
  
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
  if (['audio', 'video', 'image', 'document'].includes(this.type) && !this.media?.url) {
    return next(new Error('Media message must have a URL'));
  }
  
  // Limit edit history
  if (this.editHistory && this.editHistory.length > 10) {
    this.editHistory = this.editHistory.slice(-10); // Keep only last 10 edits
  }
  
  next();
});

// Static methods
messageSchema.statics.getChatMessages = async function(chatId, page = 1, limit = 50, userId = null) {
  try {
	const skip = (page - 1) * limit;
	
    // Build query to exclude messages deleted by the user
	const query = { 
      chatId: chatId,
		isDeleted: false 
	};
	
	// If userId provided, exclude messages deleted by that user
	if (userId) {
      query['deletedBy.userId'] = { $ne: userId };
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

	return messages.reverse(); // Return in chronological order
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
      type: { $in: ['audio', 'video', 'image', 'document'] },
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

messageSchema.methods.deleteForUser = async function(userId) {
  try {
    // Check if already deleted by this user
    const alreadyDeleted = this.deletedBy.some(
      deletion => deletion.userId.toString() === userId.toString()
    );
    
    if (alreadyDeleted) {
      throw new Error('Message already deleted by this user');
    }
    
    this.deletedBy.push({
      userId: userId,
      deletedAt: new Date()
    });
    
    // Mark as deleted if deleted by sender or all participants
    const Chat = mongoose.model('Chat');
    const chat = await Chat.findById(this.chatId);
    
    if (this.senderId.toString() === userId.toString()) {
      this.isDeleted = true;
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