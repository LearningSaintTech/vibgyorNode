const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema(
  {
    // Context: social or dating
    context: {
      type: String,
      enum: ['social', 'dating'],
      default: 'social',
      required: true,
      index: true
    },
    
    // Basic Information
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false // System notifications may not have a sender
    },
    
    // Notification Content
    type: {
      type: String,
      required: true,
      index: true
    },
    
    title: {
      type: String,
      required: true,
      maxlength: 100,
      trim: true
    },
    message: {
      type: String,
      required: true,
      maxlength: 500,
      trim: true
    },
    
    // Rich Content
    image: {
      url: String,
      alt: String
    },
    actionUrl: {
      type: String,
      maxlength: 500
    },
    
    // Related Content References
    relatedContent: {
      contentType: {
        type: String,
        enum: ['post', 'story', 'message', 'call', 'user', 'highlight', 'poll', 'question', 'match', 'like', 'date'],
        default: null
      },
      contentId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null
      },
      metadata: {
        type: Map,
        of: mongoose.Schema.Types.Mixed,
        default: {}
      }
    },
    
    // Context-specific data
    data: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {}
    },
    
    // Notification Status
    status: {
      type: String,
      enum: ['unread', 'read', 'archived', 'deleted'],
      default: 'unread',
      index: true
    },
    
    // Delivery Status
    deliveryStatus: {
      type: String,
      enum: ['pending', 'sent', 'delivered', 'failed'],
      default: 'pending',
      index: true
    },
    
    // Delivery Channels
    deliveryChannels: {
      inApp: {
        delivered: {
          type: Boolean,
          default: false
        },
        deliveredAt: {
          type: Date,
          default: null
        }
      },
      push: {
        delivered: {
          type: Boolean,
          default: false
        },
        deliveredAt: {
          type: Date,
          default: null
        },
        deviceTokens: [{
          token: String,
          platform: {
            type: String,
            enum: ['ios', 'android', 'web']
          }
        }]
      },
      email: {
        delivered: {
          type: Boolean,
          default: false
        },
        deliveredAt: {
          type: Date,
          default: null
        },
        emailAddress: String
      },
      sms: {
        delivered: {
          type: Boolean,
          default: false
        },
        deliveredAt: {
          type: Date,
          default: null
        },
        phoneNumber: String
      }
    },
    
    // Notification Priority
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
      index: true
    },
    
    // Scheduling
    scheduledFor: {
      type: Date,
      default: null,
      index: true
    },
    
    // Expiry
    expiresAt: {
      type: Date,
      default: null,
      index: { expireAfterSeconds: 0 }
    },
    
    // User Preferences Override
    userPreferences: {
      skipInApp: {
        type: Boolean,
        default: false
      },
      skipPush: {
        type: Boolean,
        default: false
      },
      skipEmail: {
        type: Boolean,
        default: false
      },
      skipSMS: {
        type: Boolean,
        default: false
      }
    },
    
    // Analytics
    analytics: {
      openCount: {
        type: Number,
        default: 0
      },
      clickCount: {
        type: Number,
        default: 0
      },
      lastOpenedAt: {
        type: Date,
        default: null
      },
      lastClickedAt: {
        type: Date,
        default: null
      }
    },
    
    // Timestamps
    createdAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    readAt: {
      type: Date,
      default: null
    },
    archivedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for performance
NotificationSchema.index({ recipient: 1, status: 1, createdAt: -1 });
NotificationSchema.index({ context: 1, type: 1, createdAt: -1 });
NotificationSchema.index({ recipient: 1, context: 1, status: 1, createdAt: -1 });
NotificationSchema.index({ deliveryStatus: 1, scheduledFor: 1 });
NotificationSchema.index({ 'relatedContent.contentType': 1, 'relatedContent.contentId': 1 });

// Virtual for time ago
NotificationSchema.virtual('timeAgo').get(function() {
  const now = new Date();
  const diff = now - this.createdAt;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return `${seconds}s ago`;
});

// Virtual for is expired
NotificationSchema.virtual('isExpired').get(function() {
  return this.expiresAt && this.expiresAt < new Date();
});

// Methods
NotificationSchema.methods.markAsRead = function() {
  if (this.status === 'unread') {
    this.status = 'read';
    this.readAt = new Date();
    this.analytics.openCount++;
    this.analytics.lastOpenedAt = new Date();
  }
  return this.save();
};

NotificationSchema.methods.markAsUnread = function() {
  this.status = 'unread';
  this.readAt = null;
  return this.save();
};

NotificationSchema.methods.archive = function() {
  this.status = 'archived';
  this.archivedAt = new Date();
  return this.save();
};

NotificationSchema.methods.delete = function() {
  this.status = 'deleted';
  return this.save();
};

NotificationSchema.methods.recordClick = function() {
  this.analytics.clickCount++;
  this.analytics.lastClickedAt = new Date();
  return this.save();
};

NotificationSchema.methods.updateDeliveryStatus = function(channel, status, deliveredAt = new Date()) {
  if (this.deliveryChannels[channel]) {
    this.deliveryChannels[channel].delivered = status === 'delivered';
    this.deliveryChannels[channel].deliveredAt = deliveredAt;
  }
  
  // Update overall delivery status
  const channels = Object.keys(this.deliveryChannels);
  const deliveredChannels = channels.filter(ch => 
    this.deliveryChannels[ch].delivered === true
  );
  
  if (deliveredChannels.length === channels.length) {
    this.deliveryStatus = 'delivered';
  } else if (deliveredChannels.length > 0) {
    this.deliveryStatus = 'sent';
  } else {
    this.deliveryStatus = status;
  }
  
  return this.save();
};

// Static methods
NotificationSchema.statics.getUserNotifications = function(userId, options = {}) {
  const {
    page = 1,
    limit = 20,
    status = 'all', // 'all', 'unread', 'read', 'archived'
    type = 'all',
    context = 'all', // 'all', 'social', 'dating'
    priority = 'all'
  } = options;

  const query = { recipient: userId };
  
  // Filter by status
  if (status !== 'all') {
    query.status = status;
  } else {
    // When status is 'all', include unread, read, and archived, but exclude deleted
    query.status = { $in: ['unread', 'read', 'archived'] };
  }
  
  // Filter by type
  if (type !== 'all') {
    query.type = type;
  }
  
  // Filter by context
  if (context !== 'all') {
    query.context = context;
  }
  
  // Filter by priority
  if (priority !== 'all') {
    query.priority = priority;
  }

  return this.find(query)
    .populate({
      path: 'sender',
      select: 'username fullName profilePictureUrl isVerified',
      // Handle invalid sender references gracefully - populate will return null for deleted users
      strictPopulate: false
    })
    // Note: relatedContent.contentId is not populated because it can reference different models
    // (post, story, message, etc.) and requires dynamic population based on contentType
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit))
    .lean() // Use lean() for better performance - returns plain objects
    .select('-deliveryChannels -userPreferences -analytics') // Exclude heavy fields
    .maxTimeMS(10000); // Add timeout: 10 seconds max query time to prevent hangs
};

NotificationSchema.statics.getUnreadCount = function(userId, context = 'all') {
  const query = {
    recipient: userId,
    status: 'unread'
  };
  
  if (context !== 'all') {
    query.context = context;
  }
  
  return this.countDocuments(query);
};

NotificationSchema.statics.markAllAsRead = function(userId, context = 'all') {
  const query = {
    recipient: userId,
    status: 'unread'
  };
  
  if (context !== 'all') {
    query.context = context;
  }
  
  return this.updateMany(
    query,
    { 
      status: 'read', 
      readAt: new Date(),
      'analytics.lastOpenedAt': new Date()
    }
  );
};

NotificationSchema.statics.cleanupExpired = function() {
  return this.deleteMany({
    expiresAt: { $lt: new Date() }
  });
};

NotificationSchema.statics.getPendingDeliveries = function() {
  return this.find({
    deliveryStatus: 'pending',
    $or: [
      { scheduledFor: null },
      { scheduledFor: { $lte: new Date() } }
    ]
  })
  .populate('recipient', 'notificationPreferences')
  .populate('sender', 'username fullName profilePictureUrl');
};

// Pre-save middleware to set expiry if not provided
NotificationSchema.pre('save', function(next) {
  if (this.isNew && !this.expiresAt) {
    // Set default expiry based on notification type
    const expiryMap = {
      'post_like': 7 * 24 * 60 * 60 * 1000, // 7 days
      'post_comment': 7 * 24 * 60 * 60 * 1000, // 7 days
      'story_view': 24 * 60 * 60 * 1000, // 1 day
      'follow_request': 30 * 24 * 60 * 60 * 1000, // 30 days
      'system_announcement': 30 * 24 * 60 * 60 * 1000, // 30 days
      'match': 30 * 24 * 60 * 60 * 1000, // 30 days
      'default': 7 * 24 * 60 * 60 * 1000 // 7 days default
    };
    
    const expiryMs = expiryMap[this.type] || expiryMap.default;
    this.expiresAt = new Date(Date.now() + expiryMs);
  }
  next();
});

const Notification = mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);

module.exports = Notification;

