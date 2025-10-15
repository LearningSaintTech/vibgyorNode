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
        enum: ['image', 'video', 'audio', 'document'],
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
        type: Number, // For video/audio duration in seconds
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
      enum: ['draft', 'published', 'scheduled', 'archived', 'deleted'],
      default: 'published'
    },
    scheduledAt: {
      type: Date,
      default: null
    },
    
    // Post Scheduling
    scheduling: {
      isScheduled: {
        type: Boolean,
        default: false
      },
      scheduledFor: {
        type: Date,
        default: null
      },
      timezone: {
        type: String,
        default: 'UTC'
      },
      repeatSettings: {
        enabled: {
          type: Boolean,
          default: false
        },
        frequency: {
          type: String,
          enum: ['daily', 'weekly', 'monthly', 'yearly'],
          default: 'daily'
        },
        interval: {
          type: Number,
          default: 1
        },
        endDate: {
          type: Date,
          default: null
        },
        lastScheduled: {
          type: Date,
          default: null
        }
      }
    },
    
    // Post Collections
    collections: [{
      name: {
        type: String,
        required: true
      },
      description: {
        type: String,
        default: ''
      },
      isPublic: {
        type: Boolean,
        default: false
      },
      addedAt: {
        type: Date,
        default: Date.now
      }
    }],
    
    // Post Templates
    template: {
      templateId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PostTemplate',
        default: null
      },
      templateName: {
        type: String,
        default: ''
      },
      customFields: {
        type: Map,
        of: mongoose.Schema.Types.Mixed,
        default: {}
      }
    },
    
    // Post Collaboration
    collaboration: {
      isCollaborative: {
        type: Boolean,
        default: false
      },
      collaborators: [{
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true
        },
        role: {
          type: String,
          enum: ['editor', 'contributor', 'viewer'],
          default: 'contributor'
        },
        permissions: {
          canEdit: {
            type: Boolean,
            default: true
          },
          canDelete: {
            type: Boolean,
            default: false
          },
          canInvite: {
            type: Boolean,
            default: false
          }
        },
        invitedAt: {
          type: Date,
          default: Date.now
        },
        acceptedAt: {
          type: Date,
          default: null
        },
        status: {
          type: String,
          enum: ['pending', 'accepted', 'declined', 'removed'],
          default: 'pending'
        }
      }],
      editHistory: [{
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true
        },
        action: {
          type: String,
          enum: ['created', 'edited', 'added_media', 'removed_media', 'changed_privacy', 'added_collaborator', 'removed_collaborator'],
          required: true
        },
        changes: {
          type: Map,
          of: mongoose.Schema.Types.Mixed,
          default: {}
        },
        timestamp: {
          type: Date,
          default: Date.now
        }
      }]
    },
    
    // Interactive Polls
    poll: {
      isPoll: {
        type: Boolean,
        default: false
      },
      question: {
        type: String,
        default: ''
      },
      options: [{
        text: {
          type: String,
          required: true
        },
        votes: [{
          user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
          },
          votedAt: {
            type: Date,
            default: Date.now
          }
        }],
        voteCount: {
          type: Number,
          default: 0
        }
      }],
      settings: {
        allowMultipleVotes: {
          type: Boolean,
          default: false
        },
        showResultsBeforeVoting: {
          type: Boolean,
          default: false
        },
        allowVoteChanges: {
          type: Boolean,
          default: true
        },
        endDate: {
          type: Date,
          default: null
        }
      },
      totalVotes: {
        type: Number,
        default: 0
      }
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
        enum: ['content', 'caption', 'comment', 'poll_option'],
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
PostSchema.index({ scheduledAt: 1 });
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

// Post Scheduling Methods
PostSchema.methods.schedulePost = function(scheduledFor, timezone = 'UTC', repeatSettings = null) {
  this.scheduling.isScheduled = true;
  this.scheduling.scheduledFor = scheduledFor;
  this.scheduling.timezone = timezone;
  this.status = 'scheduled';
  
  if (repeatSettings) {
    this.scheduling.repeatSettings = { ...this.scheduling.repeatSettings, ...repeatSettings };
  }
  
  return this.save();
};

PostSchema.methods.unschedulePost = function() {
  this.scheduling.isScheduled = false;
  this.scheduling.scheduledFor = null;
  this.scheduling.repeatSettings.enabled = false;
  this.status = 'draft';
  return this.save();
};

// Post Collections Methods
PostSchema.methods.addToCollection = function(collectionName, description = '', isPublic = false) {
  const existingCollection = this.collections.find(c => c.name === collectionName);
  if (!existingCollection) {
    this.collections.push({
      name: collectionName,
      description,
      isPublic,
      addedAt: new Date()
    });
  }
  return this.save();
};

PostSchema.methods.removeFromCollection = function(collectionName) {
  this.collections = this.collections.filter(c => c.name !== collectionName);
  return this.save();
};

// Post Collaboration Methods
PostSchema.methods.addCollaborator = function(userId, role = 'contributor', permissions = {}) {
  const existingCollaborator = this.collaboration.collaborators.find(c => c.user.toString() === userId.toString());
  if (!existingCollaborator) {
    this.collaboration.collaborators.push({
      user: userId,
      role,
      permissions: {
        canEdit: permissions.canEdit !== undefined ? permissions.canEdit : true,
        canDelete: permissions.canDelete !== undefined ? permissions.canDelete : false,
        canInvite: permissions.canInvite !== undefined ? permissions.canInvite : false
      },
      invitedAt: new Date(),
      status: 'pending'
    });
    this.collaboration.isCollaborative = true;
  }
  return this.save();
};

PostSchema.methods.acceptCollaboration = function(userId) {
  const collaborator = this.collaboration.collaborators.find(c => c.user.toString() === userId.toString());
  if (collaborator && collaborator.status === 'pending') {
    collaborator.status = 'accepted';
    collaborator.acceptedAt = new Date();
  }
  return this.save();
};

PostSchema.methods.removeCollaborator = function(userId) {
  this.collaboration.collaborators = this.collaboration.collaborators.filter(c => c.user.toString() !== userId.toString());
  if (this.collaboration.collaborators.length === 0) {
    this.collaboration.isCollaborative = false;
  }
  return this.save();
};

PostSchema.methods.addEditHistory = function(userId, action, changes = {}) {
  this.collaboration.editHistory.push({
    user: userId,
    action,
    changes,
    timestamp: new Date()
  });
  return this.save();
};

// Poll Methods
PostSchema.methods.createPoll = function(question, options, settings = {}) {
  this.poll.isPoll = true;
  this.poll.question = question;
  this.poll.options = options.map(option => ({
    text: option,
    votes: [],
    voteCount: 0
  }));
  this.poll.settings = {
    allowMultipleVotes: settings.allowMultipleVotes || false,
    showResultsBeforeVoting: settings.showResultsBeforeVoting || false,
    allowVoteChanges: settings.allowVoteChanges !== undefined ? settings.allowVoteChanges : true,
    endDate: settings.endDate || null
  };
  this.poll.totalVotes = 0;
  return this.save();
};

PostSchema.methods.voteInPoll = function(userId, optionIndex) {
  if (!this.poll.isPoll) {
    throw new Error('This post is not a poll');
  }
  
  if (optionIndex < 0 || optionIndex >= this.poll.options.length) {
    throw new Error('Invalid option index');
  }
  
  const option = this.poll.options[optionIndex];
  const existingVote = option.votes.find(vote => vote.user.toString() === userId.toString());
  
  if (existingVote) {
    if (this.poll.settings.allowVoteChanges) {
      // Remove existing vote
      option.votes = option.votes.filter(vote => vote.user.toString() !== userId.toString());
      option.voteCount = option.votes.length;
      this.poll.totalVotes--;
    } else {
      throw new Error('Vote changes not allowed');
    }
  }
  
  // Add new vote
  option.votes.push({
    user: userId,
    votedAt: new Date()
  });
  option.voteCount = option.votes.length;
  this.poll.totalVotes++;
  
  return this.save();
};

PostSchema.methods.removeVoteFromPoll = function(userId, optionIndex) {
  if (!this.poll.isPoll) {
    throw new Error('This post is not a poll');
  }
  
  const option = this.poll.options[optionIndex];
  const existingVote = option.votes.find(vote => vote.user.toString() === userId.toString());
  
  if (existingVote) {
    option.votes = option.votes.filter(vote => vote.user.toString() !== userId.toString());
    option.voteCount = option.votes.length;
    this.poll.totalVotes--;
    return this.save();
  }
  
  return Promise.resolve(this);
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
