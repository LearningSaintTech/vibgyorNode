const mongoose = require('mongoose');

const PostCollectionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: '',
      trim: true
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    isPublic: {
      type: Boolean,
      default: false
    },
    posts: [{
      post: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post',
        required: true
      },
      addedAt: {
        type: Date,
        default: Date.now
      },
      addedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      notes: {
        type: String,
        default: ''
      }
    }],
    collaborators: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      role: {
        type: String,
        enum: ['viewer', 'contributor', 'editor'],
        default: 'viewer'
      },
      permissions: {
        canAddPosts: {
          type: Boolean,
          default: false
        },
        canRemovePosts: {
          type: Boolean,
          default: false
        },
        canEditCollection: {
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
    tags: [{
      type: String,
      lowercase: true,
      trim: true
    }],
    coverImage: {
      type: String,
      default: ''
    },
    settings: {
      allowPublicViewing: {
        type: Boolean,
        default: false
      },
      allowPublicContributions: {
        type: Boolean,
        default: false
      },
      autoApprovePosts: {
        type: Boolean,
        default: true
      },
      maxPosts: {
        type: Number,
        default: 1000
      }
    },
    stats: {
      totalPosts: {
        type: Number,
        default: 0
      },
      totalViews: {
        type: Number,
        default: 0
      },
      totalLikes: {
        type: Number,
        default: 0
      },
      totalShares: {
        type: Number,
        default: 0
      },
      lastActivity: {
        type: Date,
        default: Date.now
      }
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes
PostCollectionSchema.index({ owner: 1, name: 1 });
PostCollectionSchema.index({ isPublic: 1, isActive: 1 });
PostCollectionSchema.index({ tags: 1 });
PostCollectionSchema.index({ 'posts.post': 1 });

// Virtual for engagement rate
PostCollectionSchema.virtual('engagementRate').get(function() {
  if (this.stats.totalViews === 0) return 0;
  return ((this.stats.totalLikes + this.stats.totalShares) / this.stats.totalViews * 100).toFixed(2);
});

// Methods
PostCollectionSchema.methods.addPost = function(postId, userId, notes = '') {
  const existingPost = this.posts.find(p => p.post.toString() === postId.toString());
  if (!existingPost) {
    this.posts.push({
      post: postId,
      addedBy: userId,
      notes,
      addedAt: new Date()
    });
    this.stats.totalPosts = this.posts.length;
    this.stats.lastActivity = new Date();
  }
  return this.save();
};

PostCollectionSchema.methods.removePost = function(postId) {
  this.posts = this.posts.filter(p => p.post.toString() !== postId.toString());
  this.stats.totalPosts = this.posts.length;
  this.stats.lastActivity = new Date();
  return this.save();
};

PostCollectionSchema.methods.addCollaborator = function(userId, role = 'viewer', permissions = {}) {
  const existingCollaborator = this.collaborators.find(c => c.user.toString() === userId.toString());
  if (!existingCollaborator) {
    this.collaborators.push({
      user: userId,
      role,
      permissions: {
        canAddPosts: permissions.canAddPosts || false,
        canRemovePosts: permissions.canRemovePosts || false,
        canEditCollection: permissions.canEditCollection || false,
        canInvite: permissions.canInvite || false
      },
      invitedAt: new Date(),
      status: 'pending'
    });
  }
  return this.save();
};

PostCollectionSchema.methods.acceptCollaboration = function(userId) {
  const collaborator = this.collaborators.find(c => c.user.toString() === userId.toString());
  if (collaborator && collaborator.status === 'pending') {
    collaborator.status = 'accepted';
    collaborator.acceptedAt = new Date();
  }
  return this.save();
};

PostCollectionSchema.methods.removeCollaborator = function(userId) {
  this.collaborators = this.collaborators.filter(c => c.user.toString() !== userId.toString());
  return this.save();
};

PostCollectionSchema.methods.updateStats = function() {
  this.stats.totalPosts = this.posts.length;
  this.stats.lastActivity = new Date();
  return this.save();
};

PostCollectionSchema.methods.addTag = function(tag) {
  const cleanTag = tag.toLowerCase().trim();
  if (!this.tags.includes(cleanTag)) {
    this.tags.push(cleanTag);
  }
  return this.save();
};

PostCollectionSchema.methods.removeTag = function(tag) {
  const cleanTag = tag.toLowerCase().trim();
  this.tags = this.tags.filter(t => t !== cleanTag);
  return this.save();
};

// Static methods
PostCollectionSchema.statics.getPublicCollections = function(limit = 20) {
  return this.find({ isPublic: true, isActive: true })
    .populate('owner', 'username fullName profilePictureUrl')
    .populate('posts.post', 'content media likesCount commentsCount publishedAt')
    .sort({ 'stats.lastActivity': -1 })
    .limit(limit);
};

PostCollectionSchema.statics.getUserCollections = function(userId, limit = 20) {
  return this.find({ owner: userId, isActive: true })
    .populate('posts.post', 'content media likesCount commentsCount publishedAt')
    .sort({ updatedAt: -1 })
    .limit(limit);
};

PostCollectionSchema.statics.searchCollections = function(query, limit = 20) {
  return this.find({
    isPublic: true,
    isActive: true,
    $or: [
      { name: { $regex: query, $options: 'i' } },
      { description: { $regex: query, $options: 'i' } },
      { tags: { $in: [new RegExp(query, 'i')] } }
    ]
  })
  .populate('owner', 'username fullName profilePictureUrl')
  .populate('posts.post', 'content media likesCount commentsCount publishedAt')
  .sort({ 'stats.lastActivity': -1 })
  .limit(limit);
};

const PostCollection = mongoose.models.PostCollection || mongoose.model('PostCollection', PostCollectionSchema);

module.exports = PostCollection;
