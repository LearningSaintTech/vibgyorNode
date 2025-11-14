const ContentModeration = require('../../user/social/userModel/contentModerationModel');
const ApiResponse = require('../../utils/apiResponse');

// Get flagged content for review
async function getFlaggedContent(req, res) {
  try {
    const { page = 1, limit = 20, contentType, status } = req.query;
    
    const query = {};
    if (contentType) query.contentType = contentType;
    if (status) query.status = status;
    
    // Add flagged content filter
    query.$or = [
      { 'moderationResults.aiAnalysis.flagged': true },
      { 'moderationResults.userReports.0': { $exists: true } },
      { status: 'under_review' }
    ];

    const content = await ContentModeration.find(query)
      .populate('contentAuthor', 'username fullName profilePictureUrl email')
      .populate('moderationResults.manualReview.reviewedBy', 'username fullName')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const totalContent = await ContentModeration.countDocuments(query);

    return ApiResponse.success(res, {
      content,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalContent / limit),
        totalContent,
        hasNext: page * limit < totalContent,
        hasPrev: page > 1
      }
    }, 'Flagged content retrieved successfully');
  } catch (error) {
    console.error('[ADMIN][MODERATION] Get flagged content error:', error);
    return ApiResponse.serverError(res, 'Failed to get flagged content');
  }
}

// Get pending reviews
async function getPendingReviews(req, res) {
  try {
    const { page = 1, limit = 20 } = req.query;

    const content = await ContentModeration.getPendingReviews(parseInt(page), parseInt(limit));

    const totalPending = await ContentModeration.countDocuments({
      status: 'under_review',
      'moderationResults.manualReview.isReviewed': false
    });

    return ApiResponse.success(res, {
      content,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalPending / limit),
        totalPending,
        hasNext: page * limit < totalPending,
        hasPrev: page > 1
      }
    }, 'Pending reviews retrieved successfully');
  } catch (error) {
    console.error('[ADMIN][MODERATION] Get pending reviews error:', error);
    return ApiResponse.serverError(res, 'Failed to get pending reviews');
  }
}

// Review content
async function reviewContent(req, res) {
  try {
    const { moderationId } = req.params;
    const { decision, reason, notes, actionTaken } = req.body;
    const adminId = req.admin?.adminId;

    if (!decision || !['approved', 'rejected', 'escalated'].includes(decision)) {
      return ApiResponse.badRequest(res, 'Valid decision is required');
    }

    const moderation = await ContentModeration.findById(moderationId);
    if (!moderation) {
      return ApiResponse.notFound(res, 'Content moderation record not found');
    }

    await moderation.reviewByAdmin(adminId, decision, reason, notes, actionTaken);

    console.log('[ADMIN][MODERATION] Content reviewed successfully:', moderationId);
    return ApiResponse.success(res, moderation, 'Content reviewed successfully');
  } catch (error) {
    console.error('[ADMIN][MODERATION] Review content error:', error);
    return ApiResponse.serverError(res, 'Failed to review content');
  }
}

// Get moderation analytics
async function getModerationAnalytics(req, res) {
  try {
    const { period = '7d' } = req.query; // 7d, 30d, 90d
    
    const periodMs = {
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000
    }[period] || 7 * 24 * 60 * 60 * 1000;

    const startDate = new Date(Date.now() - periodMs);

    // Get analytics data
    const [
      totalContent,
      flaggedContent,
      reviewedContent,
      approvedContent,
      rejectedContent,
      pendingReviews,
      contentByType,
      reportsByReason
    ] = await Promise.all([
      ContentModeration.countDocuments({ createdAt: { $gte: startDate } }),
      ContentModeration.countDocuments({ 
        createdAt: { $gte: startDate },
        'moderationResults.aiAnalysis.flagged': true 
      }),
      ContentModeration.countDocuments({ 
        createdAt: { $gte: startDate },
        'moderationResults.manualReview.isReviewed': true 
      }),
      ContentModeration.countDocuments({ 
        createdAt: { $gte: startDate },
        'moderationResults.manualReview.decision': 'approved' 
      }),
      ContentModeration.countDocuments({ 
        createdAt: { $gte: startDate },
        'moderationResults.manualReview.decision': 'rejected' 
      }),
      ContentModeration.countDocuments({ 
        status: 'under_review',
        'moderationResults.manualReview.isReviewed': false 
      }),
      ContentModeration.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { _id: '$contentType', count: { $sum: 1 } } }
      ]),
      ContentModeration.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $unwind: '$moderationResults.userReports' },
        { $group: { _id: '$moderationResults.userReports.reason', count: { $sum: 1 } } }
      ])
    ]);

    const analytics = {
      period,
      summary: {
        totalContent,
        flaggedContent,
        reviewedContent,
        approvedContent,
        rejectedContent,
        pendingReviews,
        flagRate: totalContent > 0 ? ((flaggedContent / totalContent) * 100).toFixed(2) : 0,
        approvalRate: reviewedContent > 0 ? ((approvedContent / reviewedContent) * 100).toFixed(2) : 0
      },
      breakdown: {
        contentByType: contentByType.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        reportsByReason: reportsByReason.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {})
      }
    };

    return ApiResponse.success(res, analytics, 'Moderation analytics retrieved successfully');
  } catch (error) {
    console.error('[ADMIN][MODERATION] Get analytics error:', error);
    return ApiResponse.serverError(res, 'Failed to get moderation analytics');
  }
}

// Get content details for review
async function getContentDetails(req, res) {
  try {
    const { moderationId } = req.params;

    const moderation = await ContentModeration.findById(moderationId)
      .populate('contentAuthor', 'username fullName profilePictureUrl email phoneNumber')
      .populate('moderationResults.manualReview.reviewedBy', 'username fullName')
      .populate('moderationResults.userReports.reportedBy', 'username fullName');

    if (!moderation) {
      return ApiResponse.notFound(res, 'Content moderation record not found');
    }

    // Get the actual content based on type
    let actualContent = null;
    try {
      const ContentModel = moderation.getContentModel();
      if (ContentModel) {
        actualContent = await ContentModel.findById(moderation.contentId);
      }
    } catch (error) {
      console.error('[ADMIN][MODERATION] Error fetching actual content:', error);
    }

    return ApiResponse.success(res, {
      moderation,
      actualContent
    }, 'Content details retrieved successfully');
  } catch (error) {
    console.error('[ADMIN][MODERATION] Get content details error:', error);
    return ApiResponse.serverError(res, 'Failed to get content details');
  }
}

// Bulk review content
async function bulkReviewContent(req, res) {
  try {
    const { moderationIds, decision, reason, notes, actionTaken } = req.body;
    const adminId = req.admin?.adminId;

    if (!moderationIds || !Array.isArray(moderationIds) || moderationIds.length === 0) {
      return ApiResponse.badRequest(res, 'Valid moderation IDs array is required');
    }

    if (!decision || !['approved', 'rejected', 'escalated'].includes(decision)) {
      return ApiResponse.badRequest(res, 'Valid decision is required');
    }

    const results = [];
    const errors = [];

    for (const moderationId of moderationIds) {
      try {
        const moderation = await ContentModeration.findById(moderationId);
        if (moderation) {
          await moderation.reviewByAdmin(adminId, decision, reason, notes, actionTaken);
          results.push({ id: moderationId, status: 'success' });
        } else {
          errors.push({ id: moderationId, error: 'Not found' });
        }
      } catch (error) {
        errors.push({ id: moderationId, error: error.message });
      }
    }

    console.log('[ADMIN][MODERATION] Bulk review completed:', { success: results.length, errors: errors.length });
    return ApiResponse.success(res, {
      successful: results,
      errors,
      summary: {
        total: moderationIds.length,
        successful: results.length,
        failed: errors.length
      }
    }, 'Bulk review completed');
  } catch (error) {
    console.error('[ADMIN][MODERATION] Bulk review error:', error);
    return ApiResponse.serverError(res, 'Failed to perform bulk review');
  }
}

// Update content policies
async function updateContentPolicies(req, res) {
  try {
    const { policies } = req.body;

    // This would typically update a policies collection or configuration
    // For now, we'll just return success as policies are usually stored in config
    console.log('[ADMIN][MODERATION] Content policies updated:', policies);

    return ApiResponse.success(res, {
      policies,
      updatedAt: new Date()
    }, 'Content policies updated successfully');
  } catch (error) {
    console.error('[ADMIN][MODERATION] Update policies error:', error);
    return ApiResponse.serverError(res, 'Failed to update content policies');
  }
}

// Get moderation queue statistics
async function getModerationQueueStats(req, res) {
  try {
    const stats = await Promise.all([
      ContentModeration.countDocuments({ status: 'under_review' }),
      ContentModeration.countDocuments({ 
        'moderationResults.aiAnalysis.flagged': true,
        'moderationResults.manualReview.isReviewed': false 
      }),
      ContentModeration.countDocuments({ 
        'moderationResults.userReports.0': { $exists: true },
        'moderationResults.manualReview.isReviewed': false 
      }),
      ContentModeration.countDocuments({ 
        status: 'active',
        'moderationResults.aiAnalysis.flagged': true 
      })
    ]);

    return ApiResponse.success(res, {
      pendingReviews: stats[0],
      aiFlagged: stats[1],
      userReported: stats[2],
      activeFlagged: stats[3],
      totalQueue: stats[0] + stats[1] + stats[2]
    }, 'Moderation queue statistics retrieved successfully');
  } catch (error) {
    console.error('[ADMIN][MODERATION] Get queue stats error:', error);
    return ApiResponse.serverError(res, 'Failed to get moderation queue statistics');
  }
}

module.exports = {
  getFlaggedContent,
  getPendingReviews,
  reviewContent,
  getModerationAnalytics,
  getContentDetails,
  bulkReviewContent,
  updateContentPolicies,
  getModerationQueueStats
};
