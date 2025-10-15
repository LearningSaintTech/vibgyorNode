const mongoose = require('mongoose');

const ContentModerationSchema = new mongoose.Schema(
  {
    // Content Reference
    contentType: {
      type: String,
      enum: ['post', 'story', 'comment', 'message', 'profile'],
      required: true,
      index: true
    },
    contentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true
    },
    contentAuthor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    
    // Content Details
    content: {
      text: {
        type: String,
        required: true
      },
      media: [{
        type: {
          type: String,
          enum: ['image', 'video', 'audio']
        },
        url: String,
        filename: String,
        fileSize: Number,
        mimeType: String,
        s3Key: String
      }],
      hashtags: [String],
      mentions: [String]
    },
    
    // Moderation Results
    moderationResults: {
      // AI Analysis
      aiAnalysis: {
        isAnalyzed: {
          type: Boolean,
          default: false
        },
        analyzedAt: {
          type: Date,
          default: null
        },
        confidence: {
          type: Number,
          min: 0,
          max: 100,
          default: 0
        },
        categories: [{
          category: {
            type: String,
            enum: ['spam', 'inappropriate', 'harassment', 'hate_speech', 'violence', 'adult_content', 'fake_news', 'copyright', 'safe']
          },
          confidence: {
            type: Number,
            min: 0,
            max: 100
          },
          details: {
            type: Map,
            of: mongoose.Schema.Types.Mixed
          }
        }],
        flagged: {
          type: Boolean,
          default: false
        },
        flagReason: {
          type: String,
          default: null
        },
        riskScore: {
          type: Number,
          min: 0,
          max: 100,
          default: 0
        }
      },
      
      // Manual Review
      manualReview: {
        isReviewed: {
          type: Boolean,
          default: false
        },
        reviewedAt: {
          type: Date,
          default: null
        },
        reviewedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Admin',
          default: null
        },
        decision: {
          type: String,
          enum: ['approved', 'rejected', 'pending', 'escalated'],
          default: 'pending'
        },
        reason: {
          type: String,
          default: null
        },
        notes: {
          type: String,
          default: null
        },
        actionTaken: {
          type: String,
          enum: ['none', 'warning', 'hide', 'delete', 'ban_user', 'escalate'],
          default: 'none'
        }
      },
      
      // User Reports
      userReports: [{
        reportedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true
        },
        reason: {
          type: String,
          enum: ['spam', 'inappropriate', 'harassment', 'hate_speech', 'violence', 'adult_content', 'fake_news', 'copyright', 'other'],
          required: true
        },
        description: {
          type: String,
          maxlength: 500
        },
        reportedAt: {
          type: Date,
          default: Date.now
        },
        status: {
          type: String,
          enum: ['pending', 'reviewed', 'resolved', 'dismissed'],
          default: 'pending'
        }
      }],
      
      // Automated Actions
      automatedActions: [{
        action: {
          type: String,
          enum: ['hide', 'delete', 'warn_user', 'flag_for_review', 'rate_limit'],
          required: true
        },
        triggeredBy: {
          type: String,
          enum: ['ai_analysis', 'user_report', 'pattern_detection', 'admin_review'],
          required: true
        },
        executedAt: {
          type: Date,
          default: Date.now
        },
        details: {
          type: Map,
          of: mongoose.Schema.Types.Mixed
        }
      }]
    },
    
    // Content Status
    status: {
      type: String,
      enum: ['active', 'hidden', 'deleted', 'under_review', 'quarantined'],
      default: 'active',
      index: true
    },
    
    // Visibility Controls
    visibility: {
      isPublic: {
        type: Boolean,
        default: true
      },
      isHidden: {
        type: Boolean,
        default: false
      },
      hiddenReason: {
        type: String,
        default: null
      },
      hiddenAt: {
        type: Date,
        default: null
      },
      hiddenBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        default: null
      }
    },
    
    // Analytics
    analytics: {
      viewCount: {
        type: Number,
        default: 0
      },
      reportCount: {
        type: Number,
        default: 0
      },
      lastReportedAt: {
        type: Date,
        default: null
      },
      moderationScore: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
      }
    },
    
    // Timestamps
    createdAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    lastAnalyzedAt: {
      type: Date,
      default: null
    },
    lastReportedAt: {
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
ContentModerationSchema.index({ contentType: 1, contentId: 1 });
ContentModerationSchema.index({ contentAuthor: 1, createdAt: -1 });
ContentModerationSchema.index({ status: 1, createdAt: -1 });
ContentModerationSchema.index({ 'moderationResults.aiAnalysis.flagged': 1 });
ContentModerationSchema.index({ 'moderationResults.manualReview.decision': 1 });
ContentModerationSchema.index({ 'moderationResults.userReports.status': 1 });

// Virtual for total reports
ContentModerationSchema.virtual('totalReports').get(function() {
  return this.moderationResults.userReports.length;
});

// Virtual for is flagged
ContentModerationSchema.virtual('isFlagged').get(function() {
  return this.moderationResults.aiAnalysis.flagged || 
         this.moderationResults.userReports.length > 0 ||
         this.moderationResults.manualReview.decision === 'rejected';
});

// Methods
ContentModerationSchema.methods.analyzeContent = async function() {
  try {
    // Simulate AI analysis (integrate with your AI service)
    const analysisResult = await this.performAIAnalysis();
    
    this.moderationResults.aiAnalysis = {
      isAnalyzed: true,
      analyzedAt: new Date(),
      confidence: analysisResult.confidence,
      categories: analysisResult.categories,
      flagged: analysisResult.flagged,
      flagReason: analysisResult.flagReason,
      riskScore: analysisResult.riskScore
    };
    
    this.lastAnalyzedAt = new Date();
    
    // Take automated action if flagged
    if (analysisResult.flagged) {
      await this.takeAutomatedAction('ai_analysis', analysisResult);
    }
    
    return await this.save();
  } catch (error) {
    console.error('[MODERATION] AI analysis error:', error);
    throw error;
  }
};

ContentModerationSchema.methods.performAIAnalysis = async function() {
  // This is a placeholder - integrate with your AI service (OpenAI, Google Cloud AI, etc.)
  const content = this.content.text.toLowerCase();
  
  // Simple keyword-based analysis (replace with actual AI)
  const spamKeywords = ['buy now', 'click here', 'free money', 'winner', 'congratulations'];
  const inappropriateKeywords = ['hate', 'kill', 'violence', 'abuse'];
  const adultKeywords = ['nsfw', 'adult', 'xxx'];
  
  let categories = [];
  let riskScore = 0;
  let flagged = false;
  let flagReason = null;
  
  // Check for spam
  if (spamKeywords.some(keyword => content.includes(keyword))) {
    categories.push({ category: 'spam', confidence: 85, details: {} });
    riskScore += 30;
    flagged = true;
    flagReason = 'Spam content detected';
  }
  
  // Check for inappropriate content
  if (inappropriateKeywords.some(keyword => content.includes(keyword))) {
    categories.push({ category: 'inappropriate', confidence: 90, details: {} });
    riskScore += 40;
    flagged = true;
    flagReason = 'Inappropriate content detected';
  }
  
  // Check for adult content
  if (adultKeywords.some(keyword => content.includes(keyword))) {
    categories.push({ category: 'adult_content', confidence: 80, details: {} });
    riskScore += 35;
    flagged = true;
    flagReason = 'Adult content detected';
  }
  
  // Default to safe if no issues found
  if (categories.length === 0) {
    categories.push({ category: 'safe', confidence: 95, details: {} });
  }
  
  return {
    confidence: Math.max(...categories.map(c => c.confidence)),
    categories,
    flagged,
    flagReason,
    riskScore: Math.min(riskScore, 100)
  };
};

ContentModerationSchema.methods.takeAutomatedAction = async function(triggeredBy, details = {}) {
  const riskScore = this.moderationResults.aiAnalysis.riskScore;
  
  let action = 'none';
  
  // Determine action based on risk score
  if (riskScore >= 80) {
    action = 'delete';
  } else if (riskScore >= 60) {
    action = 'hide';
  } else if (riskScore >= 40) {
    action = 'flag_for_review';
  }
  
  if (action !== 'none') {
    this.moderationResults.automatedActions.push({
      action,
      triggeredBy,
      executedAt: new Date(),
      details
    });
    
    // Execute the action
    await this.executeAction(action, triggeredBy);
  }
  
  return await this.save();
};

ContentModerationSchema.methods.executeAction = async function(action, triggeredBy) {
  try {
    switch (action) {
      case 'hide':
        this.visibility.isHidden = true;
        this.visibility.hiddenReason = `Automated action: ${triggeredBy}`;
        this.visibility.hiddenAt = new Date();
        this.status = 'hidden';
        break;
        
      case 'delete':
        this.status = 'deleted';
        // Also delete the actual content
        await this.deleteOriginalContent();
        break;
        
      case 'flag_for_review':
        this.status = 'under_review';
        break;
        
      case 'warn_user':
        // Send warning to user
        await this.sendWarningToUser();
        break;
        
      case 'rate_limit':
        // Implement rate limiting for user
        await this.applyRateLimit();
        break;
    }
    
    console.log(`[MODERATION] Action executed: ${action} for content ${this.contentId}`);
  } catch (error) {
    console.error('[MODERATION] Action execution error:', error);
    throw error;
  }
};

ContentModerationSchema.methods.addUserReport = function(reportedBy, reason, description = '') {
  this.moderationResults.userReports.push({
    reportedBy,
    reason,
    description,
    reportedAt: new Date(),
    status: 'pending'
  });
  
  this.analytics.reportCount = this.moderationResults.userReports.length;
  this.lastReportedAt = new Date();
  
  // Flag for review if multiple reports
  if (this.moderationResults.userReports.length >= 3) {
    this.status = 'under_review';
    this.moderationResults.automatedActions.push({
      action: 'flag_for_review',
      triggeredBy: 'user_report',
      executedAt: new Date(),
      details: { reportCount: this.moderationResults.userReports.length }
    });
  }
  
  return this.save();
};

ContentModerationSchema.methods.reviewByAdmin = function(adminId, decision, reason = '', notes = '', actionTaken = 'none') {
  this.moderationResults.manualReview = {
    isReviewed: true,
    reviewedAt: new Date(),
    reviewedBy: adminId,
    decision,
    reason,
    notes,
    actionTaken
  };
  
  // Update status based on decision
  switch (decision) {
    case 'approved':
      this.status = 'active';
      this.visibility.isHidden = false;
      break;
    case 'rejected':
      this.status = 'deleted';
      this.visibility.isHidden = true;
      break;
    case 'escalated':
      this.status = 'under_review';
      break;
  }
  
  return this.save();
};

// Helper methods
ContentModerationSchema.methods.deleteOriginalContent = async function() {
  // Delete the original content based on type
  const ContentModel = this.getContentModel();
  if (ContentModel) {
    await ContentModel.findByIdAndDelete(this.contentId);
  }
};

ContentModerationSchema.methods.getContentModel = function() {
  switch (this.contentType) {
    case 'post':
      return require('./postModel');
    case 'story':
      return require('./storyModel');
    case 'comment':
      return require('./commentModel');
    case 'message':
      return require('./messageModel');
    default:
      return null;
  }
};

ContentModerationSchema.methods.sendWarningToUser = async function() {
  // Send warning notification to user
  const notificationService = require('../services/notificationService');
  await notificationService.createNotification({
    recipientId: this.contentAuthor,
    senderId: null, // System notification
    type: 'system_announcement',
    title: 'Content Policy Warning',
    message: 'Your content has been flagged for review. Please review our community guidelines.',
    priority: 'normal'
  });
};

ContentModerationSchema.methods.applyRateLimit = async function() {
  // Implement rate limiting for user
  // This would typically involve updating user model with rate limit flags
  console.log(`[MODERATION] Applying rate limit to user: ${this.contentAuthor}`);
};

// Static methods
ContentModerationSchema.statics.createModerationRecord = async function(contentType, contentId, contentData) {
  try {
    // Check if record already exists
    let record = await this.findOne({ contentType, contentId });
    
    if (!record) {
      record = new this({
        contentType,
        contentId,
        contentAuthor: contentData.author,
        content: {
          text: contentData.text || '',
          media: contentData.media || [],
          hashtags: contentData.hashtags || [],
          mentions: contentData.mentions || []
        }
      });
      
      await record.save();
    }
    
    // Analyze content immediately
    await record.analyzeContent();
    
    return record;
  } catch (error) {
    console.error('[MODERATION] Create moderation record error:', error);
    throw error;
  }
};

ContentModerationSchema.statics.getFlaggedContent = function(page = 1, limit = 20) {
  return this.find({
    $or: [
      { 'moderationResults.aiAnalysis.flagged': true },
      { 'moderationResults.userReports.0': { $exists: true } },
      { status: 'under_review' }
    ]
  })
  .populate('contentAuthor', 'username fullName profilePictureUrl')
  .populate('moderationResults.manualReview.reviewedBy', 'username fullName')
  .sort({ createdAt: -1 })
  .skip((page - 1) * limit)
  .limit(limit);
};

ContentModerationSchema.statics.getPendingReviews = function(page = 1, limit = 20) {
  return this.find({
    status: 'under_review',
    'moderationResults.manualReview.isReviewed': false
  })
  .populate('contentAuthor', 'username fullName profilePictureUrl')
  .sort({ lastReportedAt: -1 })
  .skip((page - 1) * limit)
  .limit(limit);
};

const ContentModeration = mongoose.models.ContentModeration || mongoose.model('ContentModeration', ContentModerationSchema);

module.exports = ContentModeration;
