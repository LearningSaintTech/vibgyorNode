const mongoose = require('mongoose');

const PostTemplateSchema = new mongoose.Schema(
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
    category: {
      type: String,
      enum: ['business', 'personal', 'marketing', 'education', 'entertainment', 'news', 'custom'],
      default: 'custom'
    },
    isPublic: {
      type: Boolean,
      default: false
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    template: {
      content: {
        type: String,
        default: ''
      },
      caption: {
        type: String,
        default: ''
      },
      hashtags: [{
        type: String,
        lowercase: true,
        trim: true
      }],
      media: [{
        type: {
          type: String,
          enum: ['image', 'video', 'audio', 'document'],
          required: true
        },
        placeholder: {
          type: String,
          required: true
        },
        required: {
          type: Boolean,
          default: false
        }
      }],
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
          type: String,
          default: ''
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
          }
        }
      },
      location: {
        required: {
          type: Boolean,
          default: false
        },
        placeholder: {
          type: String,
          default: 'Add location'
        }
      }
    },
    customFields: [{
      name: {
        type: String,
        required: true
      },
      type: {
        type: String,
        enum: ['text', 'number', 'date', 'boolean', 'select', 'multiselect'],
        default: 'text'
      },
      label: {
        type: String,
        required: true
      },
      placeholder: {
        type: String,
        default: ''
      },
      required: {
        type: Boolean,
        default: false
      },
      options: [{
        type: String
      }],
      defaultValue: {
        type: mongoose.Schema.Types.Mixed,
        default: null
      },
      validation: {
        min: Number,
        max: Number,
        pattern: String,
        message: String
      }
    }],
    usage: {
      totalUses: {
        type: Number,
        default: 0
      },
      lastUsed: {
        type: Date,
        default: null
      }
    },
    tags: [{
      type: String,
      lowercase: true,
      trim: true
    }],
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
PostTemplateSchema.index({ name: 1, createdBy: 1 });
PostTemplateSchema.index({ category: 1, isPublic: 1 });
PostTemplateSchema.index({ tags: 1 });
PostTemplateSchema.index({ isActive: 1 });

// Virtual for usage count
PostTemplateSchema.virtual('popularity').get(function() {
  return this.usage.totalUses;
});

// Methods
PostTemplateSchema.methods.incrementUsage = function() {
  this.usage.totalUses += 1;
  this.usage.lastUsed = new Date();
  return this.save();
};

PostTemplateSchema.methods.addTag = function(tag) {
  const cleanTag = tag.toLowerCase().trim();
  if (!this.tags.includes(cleanTag)) {
    this.tags.push(cleanTag);
  }
  return this.save();
};

PostTemplateSchema.methods.removeTag = function(tag) {
  const cleanTag = tag.toLowerCase().trim();
  this.tags = this.tags.filter(t => t !== cleanTag);
  return this.save();
};

// Static methods
PostTemplateSchema.statics.getPublicTemplates = function(category = null, limit = 20) {
  const query = { isPublic: true, isActive: true };
  if (category) {
    query.category = category;
  }
  
  return this.find(query)
    .populate('createdBy', 'username fullName profilePictureUrl')
    .sort({ 'usage.totalUses': -1, createdAt: -1 })
    .limit(limit);
};

PostTemplateSchema.statics.getUserTemplates = function(userId, limit = 20) {
  return this.find({ createdBy: userId, isActive: true })
    .sort({ updatedAt: -1 })
    .limit(limit);
};

PostTemplateSchema.statics.searchTemplates = function(query, category = null, limit = 20) {
  const searchQuery = {
    isPublic: true,
    isActive: true,
    $or: [
      { name: { $regex: query, $options: 'i' } },
      { description: { $regex: query, $options: 'i' } },
      { tags: { $in: [new RegExp(query, 'i')] } }
    ]
  };
  
  if (category) {
    searchQuery.category = category;
  }
  
  return this.find(searchQuery)
    .populate('createdBy', 'username fullName profilePictureUrl')
    .sort({ 'usage.totalUses': -1, createdAt: -1 })
    .limit(limit);
};

const PostTemplate = mongoose.models.PostTemplate || mongoose.model('PostTemplate', PostTemplateSchema);

module.exports = PostTemplate;
