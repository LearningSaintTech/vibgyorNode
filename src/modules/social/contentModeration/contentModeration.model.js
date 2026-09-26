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
        required: false,
        default: '',
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
            enum: [
              'spam',
              'inappropriate',
              'harassment',
              'hate_speech',
              'violence',
              'adult_content',
              'fake_news',
              'copyright',
              'scam',
              'self_harm',
              'dangerous_activities',
              'safe',
            ],
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
          enum: [
            'spam',
            'inappropriate',
            'harassment',
            'hate_speech',
            'violence',
            'adult_content',
            'fake_news',
            'copyright',
            'scam',
            'self_harm',
            'dangerous_activities',
            'other',
          ],
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
ContentModerationSchema.methods.analyzeContent = async function(options = {}) {
  try {
    const { precomputedAnalysis = null, skipAutomatedAction = false } = options;
    const analysisResult = precomputedAnalysis || (await this.performAIAnalysis());
    
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
    if (analysisResult.flagged && !skipAutomatedAction) {
      await this.takeAutomatedAction('ai_analysis', analysisResult);
    }
    
    return await this.save();
  } catch (error) {
    console.error('[MODERATION] AI analysis error:', error);
    throw error;
  }
};

ContentModerationSchema.methods.performAIAnalysis = async function() {
  const rekognitionService = require('../../../services/rekognitionService');
  const { analyzeTextPolicy } = require('../../../services/moderationPolicy');
  const media = this.content?.media || [];
  const text = String(this.content?.text || '');

  let mediaAnalysis = {
    confidence: 95,
    categories: [],
    flagged: false,
    flagReason: null,
    riskScore: 0,
  };

  if (rekognitionService.isEnabled() && media.some((m) => m?.s3Key)) {
    try {
      const result = await rekognitionService.moderateMedia(media);
      mediaAnalysis = result.analysis || mediaAnalysis;
    } catch (err) {
      console.error('[MODERATION] Rekognition analysis failed, falling back to text checks', err.message);
    }
  }

  const textAnalysis = analyzeTextPolicy(text);

  const categories = [
    ...(mediaAnalysis.categories || []).filter((c) => c.category !== 'safe'),
    ...(textAnalysis.categories || []),
  ];

  if (categories.length === 0) {
    categories.push({ category: 'safe', confidence: 95, details: {} });
  }

  const riskScore = Math.min(100, Math.max(mediaAnalysis.riskScore || 0, textAnalysis.riskScore || 0));
  const flagged = Boolean(mediaAnalysis.flagged || textAnalysis.flagged);
  const flagReason = mediaAnalysis.flagReason || textAnalysis.flagReason;

  return {
    confidence: Math.max(...categories.map((c) => c.confidence || 0)),
    categories,
    flagged,
    flagReason,
    riskScore,
    shouldBlock: riskScore >= Number(process.env.REKOGNITION_BLOCK_THRESHOLD || 80),
    shouldFlag: riskScore >= Number(process.env.REKOGNITION_FLAG_THRESHOLD || 40),
  };
};

ContentModerationSchema.methods.takeAutomatedAction = async function(triggeredBy, details = {}) {
  const riskScore = this.moderationResults.aiAnalysis.riskScore;
  const blockThreshold = Number(process.env.REKOGNITION_BLOCK_THRESHOLD || 80);
  const flagThreshold = Number(process.env.REKOGNITION_FLAG_THRESHOLD || 40);
  
  let action = 'none';
  
  // Instagram-like tiers: hard remove vs admin review (no mid-tier auto-hide from feed)
  if (riskScore >= blockThreshold) {
    action = 'delete';
  } else if (riskScore >= flagThreshold) {
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
        await this.hideOriginalContent(triggeredBy);
        break;
        
      case 'delete':
        this.status = 'deleted';
        // Soft-delete the actual content (keep audit trail)
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
ContentModerationSchema.methods.hideOriginalContent = async function(triggeredBy) {
  const ContentModel = this.getContentModel();
  if (!ContentModel) return;

  if (this.contentType === 'post') {
    await ContentModel.findByIdAndUpdate(this.contentId, {
      status: 'archived',
    });
    return;
  }

  if (this.contentType === 'story') {
    await ContentModel.findByIdAndUpdate(this.contentId, {
      isHidden: true,
      hiddenReason: `Automated action: ${triggeredBy}`,
    }).catch(() => null);
  }
};

ContentModerationSchema.methods.deleteOriginalContent = async function() {
  const ContentModel = this.getContentModel();
  if (!ContentModel) return;

  // Soft-delete posts so feeds exclude them without wiping history
  if (this.contentType === 'post') {
    await ContentModel.findByIdAndUpdate(this.contentId, {
      status: 'deleted',
    });
    return;
  }

  await ContentModel.findByIdAndDelete(this.contentId);
};

ContentModerationSchema.methods.getContentModel = function() {
  switch (this.contentType) {
    case 'post':
      return require('../post/post.model');
    case 'story':
      return require('../story/story.model');
    case 'comment':
      return null;
    case 'message':
      return require('../message/message.model');
    default:
      return null;
  }
};

ContentModerationSchema.methods.sendWarningToUser = async function() {
  // TODO: Notification will be implemented in new notification system
  // Send warning notification to user
  console.log('[MODERATION] Warning notification will be sent via new notification system');
};

ContentModerationSchema.methods.applyRateLimit = async function() {
  // Implement rate limiting for user
  // This would typically involve updating user model with rate limit flags
  console.log(`[MODERATION] Applying rate limit to user: ${this.contentAuthor}`);
};

// Static methods
ContentModerationSchema.statics.createModerationRecord = async function(contentType, contentId, contentData, options = {}) {
  try {
    const { precomputedAnalysis = null, skipAutomatedAction = false } = options;

    // Check if record already exists
    let record = await this.findOne({ contentType, contentId });
    
    if (!record) {
      record = new this({
        contentType,
        contentId,
        contentAuthor: contentData.author,
        content: {
          text: contentData.text != null ? String(contentData.text) : '',
          media: contentData.media || [],
          hashtags: contentData.hashtags || [],
          mentions: contentData.mentions || []
        }
      });
      
      await record.save();
    }
    
    // Analyze content (uses Rekognition when enabled, or precomputed results from post pipeline)
    await record.analyzeContent({ precomputedAnalysis, skipAutomatedAction });
    
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
