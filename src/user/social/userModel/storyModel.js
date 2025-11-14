const mongoose = require('mongoose');

const StorySchema = new mongoose.Schema(
  {
    // Basic Story Information
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    content: {
      type: String,
      maxlength: 2200,
      trim: true
    },
    
    // Media Information
    media: {
      type: {
        type: String,
        enum: ['image', 'video', 'text'],
        required: true
      },
      url: {
        type: String,
        required: true
      },
      thumbnail: {
        type: String,
        default: null
      },
      filename: {
        type: String,
        required: true
      },
      fileSize: {
        type: Number,
        required: true
      },
      mimeType: {
        type: String,
        required: true
      },
      duration: {
        type: Number, // For video duration in seconds
        default: null
      },
      dimensions: {
        width: Number,
        height: Number
      },
      s3Key: {
        type: String,
        required: true
      }
    },
    
    // Mentions
    mentions: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      position: {
        start: {
          type: Number,
          required: true
        },
        end: {
          type: Number,
          required: true
        }
      },
      notified: {
        type: Boolean,
        default: false
      },
      notificationSentAt: {
        type: Date,
        default: null
      }
    }],
    
    // Story Engagement
    views: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      viewedAt: {
        type: Date,
        default: Date.now
      },
      viewDuration: {
        type: Number, // Time spent viewing in seconds
        default: 0
      },
      isLiked: {
        type: Boolean,
        default: false
      }
    }],
    replies: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      content: {
        type: String,
        required: true,
        maxlength: 200,
        trim: true
      },
      repliedAt: {
        type: Date,
        default: Date.now
      },
      isDirectMessage: {
        type: Boolean,
        default: true
      }
    }],
    
    // Story Status and Expiry
    status: {
      type: String,
      enum: ['active'],
      default: 'active'
    },
    expiresAt: {
      type: Date,
      // MongoDB TTL index - Automatically deletes document when expiresAt is reached
      // expireAfterSeconds: 0 means delete immediately when date passes
      index: { expireAfterSeconds: 0 }
    },
    
    // Privacy Settings
    privacy: {
      type: String,
      enum: ['public', 'followers', 'close_friends'],
      default: 'public'
    },
    closeFriends: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    
    // Analytics
    analytics: {
      viewsCount: {
        type: Number,
        default: 0
      },
      likesCount: {
        type: Number,
        default: 0
      },
      repliesCount: {
        type: Number,
        default: 0
      },
      sharesCount: {
        type: Number,
        default: 0
      }
    },
    
    // Moderation
    isReported: {
      type: Boolean,
      default: false
    },
    reports: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      reason: {
        type: String,
        enum: ['spam', 'inappropriate', 'harassment', 'fake_news', 'violence', 'other'],
        required: true
      },
      description: {
        type: String,
        maxlength: 500
      },
      reportedAt: {
        type: Date,
        default: Date.now
      }
    }],
    
    // Timestamps
    createdAt: {
      type: Date,
      default: Date.now
    },
    lastEngagementAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for performance
StorySchema.index({ author: 1, createdAt: -1 });
StorySchema.index({ status: 1, expiresAt: 1 });
StorySchema.index({ privacy: 1, status: 1 });
StorySchema.index({ 'mentions.user': 1 });
StorySchema.index({ 'views.user': 1 });
StorySchema.index({ isReported: 1 });

// Virtual for time remaining
StorySchema.virtual('timeRemaining').get(function() {
  const now = new Date();
  const remaining = this.expiresAt - now;
  return Math.max(0, Math.floor(remaining / 1000)); // seconds remaining
});

// Virtual for engagement rate
StorySchema.virtual('engagementRate').get(function() {
  if (this.analytics.viewsCount === 0) return 0;
  const engagement = this.analytics.likesCount + this.analytics.repliesCount;
  return ((engagement / this.analytics.viewsCount) * 100).toFixed(2);
});

// Methods
StorySchema.methods.addView = function(userId, viewDuration = 0) {
  // Check if user already viewed this story
  const existingView = this.views.find(view => view.user.toString() === userId.toString());
  if (!existingView) {
    this.views.push({ user: userId, viewDuration });
    this.analytics.viewsCount = this.views.length;
    this.lastEngagementAt = new Date();
  }
  return this.save();
};

StorySchema.methods.toggleLike = function(userId) {
  // Find the user in views array
  const existingView = this.views.find(view => view.user.toString() === userId.toString());
  
  if (existingView) {
    // Toggle isLiked status
    existingView.isLiked = !existingView.isLiked;
  } else {
    // User hasn't viewed the story yet, add them with isLiked: true
    this.views.push({ 
      user: userId, 
      viewDuration: 0,
      isLiked: true 
    });
    this.analytics.viewsCount = this.views.length;
  }
  
  // Update likes count
  this.analytics.likesCount = this.views.filter(view => view.isLiked).length;
  this.lastEngagementAt = new Date();
  
  return this.save();
};

StorySchema.methods.addReply = function(userId, content, isDirectMessage = true) {
  const reply = {
    user: userId,
    content,
    isDirectMessage
  };
  this.replies.push(reply);
  this.analytics.repliesCount = this.replies.length;
  this.lastEngagementAt = new Date();
  return this.save();
};

StorySchema.methods.addMention = function(userId, start, end) {
  const existingMention = this.mentions.find(m => 
    m.user.toString() === userId.toString() && 
    m.position.start === start && 
    m.position.end === end
  );
  
  if (!existingMention) {
    this.mentions.push({
      user: userId,
      position: { start, end },
      notified: false
    });
  }
  
  return this.save();
};

StorySchema.methods.reportStory = function(userId, reason, description = '') {
  const report = {
    user: userId,
    reason,
    description,
    reportedAt: new Date()
  };
  this.reports.push(report);
  this.isReported = true;
  return this.save();
};

// Static methods
StorySchema.statics.getActiveStories = function(userId, page = 1, limit = 20) {
  return this.find({
    status: 'active',
    expiresAt: { $gt: new Date() },
    $or: [
      { privacy: 'public' },
      { privacy: 'followers', author: { $in: userId } },
      { privacy: 'close_friends', author: { $in: userId } }
    ]
  })
  .populate('author', 'username fullName profilePictureUrl isVerified')
  .populate('mentions.user', 'username fullName profilePictureUrl isVerified')
  .populate('views.user', 'username fullName profilePictureUrl isVerified')
  .populate('replies.user', 'username fullName profilePictureUrl isVerified')
  .sort({ createdAt: -1 })
  .skip((page - 1) * limit)
  .limit(limit);
};

StorySchema.statics.getUserStories = function(userId, includeExpired = false) {
  const query = { author: userId };
  if (!includeExpired) {
    query.status = 'active';
    query.expiresAt = { $gt: new Date() };
  }
  
  return this.find(query)
    .populate('author', 'username fullName profilePictureUrl isVerified privacySettings')
    .populate('mentions.user', 'username fullName profilePictureUrl isVerified')
    .populate('views.user', 'username fullName profilePictureUrl isVerified')
    .populate('replies.user', 'username fullName profilePictureUrl isVerified')
    .sort({ createdAt: -1 });
};

StorySchema.statics.getStoriesByHashtag = function(hashtag, page = 1, limit = 20) {
  return this.find({
    status: 'active',
    expiresAt: { $gt: new Date() },
    privacy: 'public',
    content: { $regex: `#${hashtag}`, $options: 'i' }
  })
  .populate('author', 'username fullName profilePictureUrl isVerified')
  .populate('mentions.user', 'username fullName profilePictureUrl isVerified')
  .populate('views.user', 'username fullName profilePictureUrl isVerified')
  .populate('replies.user', 'username fullName profilePictureUrl isVerified')
  .sort({ createdAt: -1 })
  .skip((page - 1) * limit)
  .limit(limit);
};

// Pre-save middleware to set expiry time (24 hours from creation)
// MongoDB TTL index will automatically DELETE the story from DB when expiresAt is reached
StorySchema.pre('save', function(next) {
  if (this.isNew && !this.expiresAt) {
    this.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  }
  next();
});

// Pre-save middleware to update counts
StorySchema.pre('save', function(next) {
  if (this.isModified('views')) {
    this.analytics.viewsCount = this.views.length;
    this.analytics.likesCount = this.views.filter(view => view.isLiked).length;
  }
  if (this.isModified('replies')) {
    this.analytics.repliesCount = this.replies.length;
  }
  next();
});

const Story = mongoose.models.Story || mongoose.model('Story', StorySchema);

module.exports = Story;
