const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema(
  {
    // Basic Post Information
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    content: {
      type: String,
      required: true,
      maxlength: 2200, // Instagram-like limit
      trim: true
    },
    caption: {
      type: String,
      maxlength: 500,
      trim: true
    },
    
    // Media Information
    media: [{
      type: {
        type: String,
        enum: ['image', 'video'],
        required: true
      },
      url: {
        type: String,
        required: true
      },
      thumbnail: {
        type: String, // For video thumbnails
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
    }],
    
    // Engagement Metrics
    likes: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      likedAt: {
        type: Date,
        default: Date.now
      }
    }],
    comments: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      content: {
        type: String,
        required: true,
        maxlength: 500,
        trim: true
      },
      parentComment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comment',
        default: null // For nested comments
      },
      likes: [{
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true
        },
        likedAt: {
          type: Date,
          default: Date.now
        }
      }],
      isEdited: {
        type: Boolean,
        default: false
      },
      editedAt: {
        type: Date,
        default: null
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }],
    shares: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      sharedAt: {
        type: Date,
        default: Date.now
      },
      shareType: {
        type: String,
        enum: ['repost', 'quote', 'external'],
        default: 'repost'
      },
      shareMessage: {
        type: String,
        maxlength: 200,
        trim: true
      }
    }],
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
      }
    }],
    
    // Post Metadata
    hashtags: [{
      type: String,
      lowercase: true,
      trim: true
    }],
    
    // Privacy and Visibility
    privacy: {
      type: String,
      enum: ['public', 'followers', 'close_friends', 'private'],
      default: 'public'
    },
    closeFriends: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    
    // Post Status
    status: {
      type: String,
      enum: ['draft', 'published', 'archived', 'deleted'],
      default: 'published'
    },
    
    // Enhanced Location Tagging
    location: {
      name: String,
      coordinates: {
        lat: Number,
        lng: Number
      },
      address: String,
      placeId: String, // Google Places ID
      placeType: {
        type: String,
        enum: ['country', 'administrative_area_level_1', 'administrative_area_level_2', 'locality', 'sublocality', 'neighborhood', 'premise', 'subpremise', 'postal_code', 'natural_feature', 'airport', 'park', 'point_of_interest', 'establishment', 'subway_station', 'transit_station', 'other'],
        default: 'other'
      },
      accuracy: {
        type: String,
        enum: ['exact', 'approximate', 'city', 'region', 'country'],
        default: 'approximate'
      },
      isVisible: {
        type: Boolean,
        default: true
      }
    },
    
    // Advanced Mentions
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
      context: {
        type: String,
        enum: ['content', 'caption', 'comment'],
        default: 'content'
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
    
    // Engagement Counts (for performance)
    likesCount: {
      type: Number,
      default: 0,
      min: 0
    },
    commentsCount: {
      type: Number,
      default: 0,
      min: 0
    },
    sharesCount: {
      type: Number,
      default: 0,
      min: 0
    },
    viewsCount: {
      type: Number,
      default: 0,
      min: 0
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
    
    // Analytics
    analytics: {
      reach: {
        type: Number,
        default: 0
      },
      impressions: {
        type: Number,
        default: 0
      },
      engagement: {
        type: Number,
        default: 0
      },
      lastAnalyzed: {
        type: Date,
        default: Date.now
      }
    },
    
    // Timestamps
    publishedAt: {
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
PostSchema.index({ author: 1, publishedAt: -1 });
PostSchema.index({ status: 1, publishedAt: -1 });
PostSchema.index({ hashtags: 1 });
PostSchema.index({ mentions: 1 });
PostSchema.index({ 'likes.user': 1 });
PostSchema.index({ 'comments.user': 1 });
PostSchema.index({ privacy: 1, publishedAt: -1 });
PostSchema.index({ isReported: 1 });

// Virtual for engagement rate
PostSchema.virtual('engagementRate').get(function() {
  if (this.viewsCount === 0) return 0;
  return ((this.likesCount + this.commentsCount + this.sharesCount) / this.viewsCount * 100).toFixed(2);
});

// Virtual for time since posted
PostSchema.virtual('timeAgo').get(function() {
  const now = new Date();
  const diff = now - this.publishedAt;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
});

// Methods
PostSchema.methods.addLike = function(userId) {
  const existingLike = this.likes.find(like => like.user.toString() === userId.toString());
  if (!existingLike) {
    this.likes.push({ user: userId });
    this.likesCount = this.likes.length;
    this.lastEngagementAt = new Date();
    return this.save();
  }
  return Promise.resolve(this);
};

PostSchema.methods.removeLike = function(userId) {
  this.likes = this.likes.filter(like => like.user.toString() !== userId.toString());
  this.likesCount = this.likes.length;
  this.lastEngagementAt = new Date();
  return this.save();
};

PostSchema.methods.addComment = function(userId, content, parentCommentId = null) {
  const comment = {
    user: userId,
    content,
    parentComment: parentCommentId,
    createdAt: new Date()
  };
  this.comments.push(comment);
  this.commentsCount = this.comments.length;
  this.lastEngagementAt = new Date();
  return this.save();
};

PostSchema.methods.addShare = function(userId, shareType = 'repost', shareMessage = '') {
  const share = {
    user: userId,
    shareType,
    shareMessage,
    sharedAt: new Date()
  };
  this.shares.push(share);
  this.sharesCount = this.shares.length;
  this.lastEngagementAt = new Date();
  return this.save();
};

PostSchema.methods.addView = function(userId, viewDuration = 0) {
  // Check if user already viewed this post
  const existingView = this.views.find(view => view.user.toString() === userId.toString());
  if (!existingView) {
    this.views.push({ user: userId, viewDuration });
    this.viewsCount = this.views.length;
  }
  return this.save();
};

PostSchema.methods.reportPost = function(userId, reason, description = '') {
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

// Advanced Mentions Methods
PostSchema.methods.addMention = function(userId, start, end, context = 'content') {
  const existingMention = this.mentions.find(m => 
    m.user.toString() === userId.toString() && 
    m.position.start === start && 
    m.position.end === end
  );
  
  if (!existingMention) {
    this.mentions.push({
      user: userId,
      position: { start, end },
      context,
      notified: false
    });
  }
  
  return this.save();
};

PostSchema.methods.markMentionAsNotified = function(userId, start, end) {
  const mention = this.mentions.find(m => 
    m.user.toString() === userId.toString() && 
    m.position.start === start && 
    m.position.end === end
  );
  
  if (mention) {
    mention.notified = true;
    mention.notificationSentAt = new Date();
  }
  
  return this.save();
};

// Static methods
PostSchema.statics.getFeedPosts = async function(userId, page = 1, limit = 20) {
  const followingIds = await this.getUserFollowing(userId);
  const closeFriendsIds = await this.getUserCloseFriends(userId);
  
  return this.find({
    status: 'published',
    $or: [
      { privacy: 'public' },
      { privacy: 'followers', author: { $in: followingIds } },
      { privacy: 'close_friends', author: { $in: closeFriendsIds } }
    ]
  })
  .populate('author', 'username fullName profilePictureUrl isVerified')
  .populate('comments.user', 'username fullName profilePictureUrl')
  .populate('likes.user', 'username fullName')
  .sort({ publishedAt: -1 })
  .skip((page - 1) * limit)
  .limit(limit);
};

PostSchema.statics.getUserFollowing = async function(userId) {
  const User = require('./userAuthModel');
  const user = await User.findById(userId).select('following');
  return user ? user.following : [];
};

PostSchema.statics.getUserCloseFriends = async function(userId) {
  const User = require('./userAuthModel');
  const user = await User.findById(userId).select('closeFriends');
  return user ? user.closeFriends : [];
};

PostSchema.statics.searchPosts = function(query, page = 1, limit = 20) {
  return this.find({
    status: 'published',
    privacy: 'public',
    $or: [
      { content: { $regex: query, $options: 'i' } },
      { caption: { $regex: query, $options: 'i' } },
      { hashtags: { $in: [new RegExp(query, 'i')] } }
    ]
  })
  .populate('author', 'username fullName profilePictureUrl isVerified')
  .sort({ publishedAt: -1 })
  .skip((page - 1) * limit)
  .limit(limit);
};

// Pre-save middleware to update counts
PostSchema.pre('save', function(next) {
  if (this.isModified('likes')) {
    this.likesCount = this.likes.length;
  }
  if (this.isModified('comments')) {
    this.commentsCount = this.comments.length;
  }
  if (this.isModified('shares')) {
    this.sharesCount = this.shares.length;
  }
  if (this.isModified('views')) {
    this.viewsCount = this.views.length;
  }
  next();
});

const Post = mongoose.models.Post || mongoose.model('Post', PostSchema);

module.exports = Post;
