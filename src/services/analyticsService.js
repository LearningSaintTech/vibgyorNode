const Post = require('../user/social/userModel/postModel');
const Story = require('../user/social/userModel/storyModel');
const User = require('../user/auth/model/userAuthModel');
const Message = require('../user/social/userModel/messageModel');
const Call = require('../user/social/userModel/callModel');
const ContentModeration = require('../user/social/userModel/contentModerationModel');
const Notification = require('../user/social/userModel/notificationModel');

/**
 * Analytics Service
 * Provides comprehensive analytics for the platform
 */
class AnalyticsService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get platform overview analytics
   */
  async getPlatformOverview(period = '7d') {
    try {
      const periodMs = this.getPeriodMs(period);
      const startDate = new Date(Date.now() - periodMs);

      const [
        totalUsers,
        activeUsers,
        totalPosts,
        totalStories,
        totalMessages,
        totalCalls,
        moderationStats
      ] = await Promise.all([
        User.countDocuments(),
        User.countDocuments({ 
          lastActiveAt: { $gte: startDate },
          isActive: true 
        }),
        Post.countDocuments({ 
          createdAt: { $gte: startDate },
          status: 'published' 
        }),
        Story.countDocuments({ 
          createdAt: { $gte: startDate },
          status: 'active' 
        }),
        Message.countDocuments({ 
          createdAt: { $gte: startDate } 
        }),
        Call.countDocuments({ 
          createdAt: { $gte: startDate } 
        }),
        this.getModerationStats(period)
      ]);

      return {
        period,
        users: {
          total: totalUsers,
          active: activeUsers,
          growth: await this.calculateGrowth('users', period)
        },
        content: {
          posts: totalPosts,
          stories: totalStories,
          messages: totalMessages,
          calls: totalCalls,
          growth: await this.calculateGrowth('content', period)
        },
        moderation: moderationStats,
        engagement: await this.getEngagementMetrics(period),
        performance: await this.getPerformanceMetrics(period)
      };
    } catch (error) {
      console.error('[ANALYTICS] Platform overview error:', error);
      throw error;
    }
  }

  /**
   * Get user analytics
   */
  async getUserAnalytics(userId, period = '30d') {
    try {
      const periodMs = this.getPeriodMs(period);
      const startDate = new Date(Date.now() - periodMs);

      const [
        posts,
        stories,
        messages,
        calls,
        followers,
        following,
        engagement
      ] = await Promise.all([
        Post.countDocuments({ 
          author: userId,
          createdAt: { $gte: startDate } 
        }),
        Story.countDocuments({ 
          author: userId,
          createdAt: { $gte: startDate } 
        }),
        Message.countDocuments({ 
          $or: [{ sender: userId }, { recipient: userId }],
          createdAt: { $gte: startDate } 
        }),
        Call.countDocuments({ 
          $or: [{ caller: userId }, { recipient: userId }],
          createdAt: { $gte: startDate } 
        }),
        User.findById(userId).select('followers').then(user => user?.followers?.length || 0),
        User.findById(userId).select('following').then(user => user?.following?.length || 0),
        this.getUserEngagementMetrics(userId, period)
      ]);

      return {
        period,
        content: {
          posts,
          stories,
          messages,
          calls
        },
        social: {
          followers,
          following,
          engagement
        },
        growth: await this.getUserGrowthMetrics(userId, period)
      };
    } catch (error) {
      console.error('[ANALYTICS] User analytics error:', error);
      throw error;
    }
  }

  /**
   * Get content analytics
   */
  async getContentAnalytics(period = '7d') {
    try {
      const periodMs = this.getPeriodMs(period);
      const startDate = new Date(Date.now() - periodMs);

      const [
        topPosts,
        topStories,
        trendingHashtags,
        contentByType,
        engagementTrends
      ] = await Promise.all([
        this.getTopPosts(period, 10),
        this.getTopStories(period, 10),
        this.getTrendingHashtags(period, 20),
        this.getContentByType(period),
        this.getEngagementTrends(period)
      ]);

      return {
        period,
        topContent: {
          posts: topPosts,
          stories: topStories
        },
        discovery: {
          trendingHashtags
        },
        distribution: {
          contentByType
        },
        trends: {
          engagement: engagementTrends
        }
      };
    } catch (error) {
      console.error('[ANALYTICS] Content analytics error:', error);
      throw error;
    }
  }

  /**
   * Get moderation analytics
   */
  async getModerationStats(period = '7d') {
    try {
      const periodMs = this.getPeriodMs(period);
      const startDate = new Date(Date.now() - periodMs);

      const [
        totalFlagged,
        aiFlagged,
        userReported,
        reviewed,
        approved,
        rejected,
        pending
      ] = await Promise.all([
        ContentModeration.countDocuments({ 
          createdAt: { $gte: startDate },
          $or: [
            { 'moderationResults.aiAnalysis.flagged': true },
            { 'moderationResults.userReports.0': { $exists: true } }
          ]
        }),
        ContentModeration.countDocuments({ 
          createdAt: { $gte: startDate },
          'moderationResults.aiAnalysis.flagged': true 
        }),
        ContentModeration.countDocuments({ 
          createdAt: { $gte: startDate },
          'moderationResults.userReports.0': { $exists: true } 
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
        })
      ]);

      return {
        totalFlagged,
        aiFlagged,
        userReported,
        reviewed,
        approved,
        rejected,
        pending,
        reviewRate: reviewed > 0 ? ((reviewed / totalFlagged) * 100).toFixed(2) : 0,
        approvalRate: reviewed > 0 ? ((approved / reviewed) * 100).toFixed(2) : 0
      };
    } catch (error) {
      console.error('[ANALYTICS] Moderation stats error:', error);
      throw error;
    }
  }

  /**
   * Get engagement metrics
   */
  async getEngagementMetrics(period = '7d') {
    try {
      const periodMs = this.getPeriodMs(period);
      const startDate = new Date(Date.now() - periodMs);

      const [
        totalLikes,
        totalComments,
        totalShares,
        totalViews,
        totalReactions
      ] = await Promise.all([
        Post.aggregate([
          { $match: { createdAt: { $gte: startDate } } },
          { $group: { _id: null, total: { $sum: '$likesCount' } } }
        ]).then(result => result[0]?.total || 0),
        Post.aggregate([
          { $match: { createdAt: { $gte: startDate } } },
          { $group: { _id: null, total: { $sum: '$commentsCount' } } }
        ]).then(result => result[0]?.total || 0),
        Post.aggregate([
          { $match: { createdAt: { $gte: startDate } } },
          { $group: { _id: null, total: { $sum: '$sharesCount' } } }
        ]).then(result => result[0]?.total || 0),
        Post.aggregate([
          { $match: { createdAt: { $gte: startDate } } },
          { $group: { _id: null, total: { $sum: '$viewsCount' } } }
        ]).then(result => result[0]?.total || 0),
        Story.aggregate([
          { $match: { createdAt: { $gte: startDate } } },
          { $group: { _id: null, total: { $sum: '$analytics.reactionsCount' } } }
        ]).then(result => result[0]?.total || 0)
      ]);

      const totalEngagement = totalLikes + totalComments + totalShares + totalViews + totalReactions;

      return {
        likes: totalLikes,
        comments: totalComments,
        shares: totalShares,
        views: totalViews,
        reactions: totalReactions,
        total: totalEngagement,
        averagePerUser: await this.getAverageEngagementPerUser(period)
      };
    } catch (error) {
      console.error('[ANALYTICS] Engagement metrics error:', error);
      throw error;
    }
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(period = '7d') {
    try {
      const periodMs = this.getPeriodMs(period);
      const startDate = new Date(Date.now() - periodMs);

      const [
        responseTime,
        errorRate,
        uptime,
        throughput
      ] = await Promise.all([
        this.getAverageResponseTime(period),
        this.getErrorRate(period),
        this.getUptime(period),
        this.getThroughput(period)
      ]);

      return {
        responseTime,
        errorRate,
        uptime,
        throughput,
        availability: uptime
      };
    } catch (error) {
      console.error('[ANALYTICS] Performance metrics error:', error);
      throw error;
    }
  }

  // Helper methods
  getPeriodMs(period) {
    const periods = {
      '1d': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000
    };
    return periods[period] || periods['7d'];
  }

  async getTopPosts(period, limit = 10) {
    const periodMs = this.getPeriodMs(period);
    const startDate = new Date(Date.now() - periodMs);

    return await Post.find({
      createdAt: { $gte: startDate },
      status: 'published'
    })
    .populate('author', 'username fullName profilePictureUrl')
    .sort({ likesCount: -1, commentsCount: -1, sharesCount: -1 })
    .limit(limit);
  }

  async getTopStories(period, limit = 10) {
    const periodMs = this.getPeriodMs(period);
    const startDate = new Date(Date.now() - periodMs);

    return await Story.find({
      createdAt: { $gte: startDate },
      status: 'active'
    })
    .populate('author', 'username fullName profilePictureUrl isVerified')
    .populate('mentions.user', 'username fullName profilePictureUrl isVerified')
    .populate('views.user', 'username fullName profilePictureUrl isVerified')
    .populate('replies.user', 'username fullName profilePictureUrl isVerified')
    .sort({ 'analytics.viewsCount': -1, 'analytics.reactionsCount': -1 })
    .limit(limit);
  }

  async getTrendingHashtags(period, limit = 20) {
    const periodMs = this.getPeriodMs(period);
    const startDate = new Date(Date.now() - periodMs);

    return await Post.aggregate([
      { $match: { 
        createdAt: { $gte: startDate },
        status: 'published',
        hashtags: { $exists: true, $ne: [] }
      }},
      { $unwind: '$hashtags' },
      { $group: { 
        _id: '$hashtags', 
        count: { $sum: 1 },
        posts: { $push: '$_id' }
      }},
      { $sort: { count: -1 }},
      { $limit: limit }
    ]);
  }

  async getContentByType(period) {
    const periodMs = this.getPeriodMs(period);
    const startDate = new Date(Date.now() - periodMs);

    const [posts, stories, messages, calls] = await Promise.all([
      Post.countDocuments({ createdAt: { $gte: startDate } }),
      Story.countDocuments({ createdAt: { $gte: startDate } }),
      Message.countDocuments({ createdAt: { $gte: startDate } }),
      Call.countDocuments({ createdAt: { $gte: startDate } })
    ]);

    return { posts, stories, messages, calls };
  }

  async getEngagementTrends(period) {
    // This would typically return time-series data
    // For now, return summary data
    return {
      daily: await this.getDailyEngagement(period),
      hourly: await this.getHourlyEngagement(period)
    };
  }

  async getDailyEngagement(period) {
    const periodMs = this.getPeriodMs(period);
    const startDate = new Date(Date.now() - periodMs);

    return await Post.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        posts: { $sum: 1 },
        likes: { $sum: '$likesCount' },
        comments: { $sum: '$commentsCount' },
        shares: { $sum: '$sharesCount' }
      }},
      { $sort: { _id: 1 }}
    ]);
  }

  async getHourlyEngagement(period) {
    const periodMs = this.getPeriodMs(period);
    const startDate = new Date(Date.now() - periodMs);

    return await Post.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: {
        _id: { $dateToString: { format: '%H', date: '$createdAt' } },
        posts: { $sum: 1 },
        likes: { $sum: '$likesCount' }
      }},
      { $sort: { _id: 1 }}
    ]);
  }

  async calculateGrowth(type, period) {
    // Calculate growth compared to previous period
    const currentPeriodMs = this.getPeriodMs(period);
    const previousPeriodMs = this.getPeriodMs(period);
    
    const currentStart = new Date(Date.now() - currentPeriodMs);
    const previousStart = new Date(Date.now() - (currentPeriodMs * 2));
    const previousEnd = currentStart;

    let currentCount, previousCount;

    switch (type) {
      case 'users':
        currentCount = await User.countDocuments({ createdAt: { $gte: currentStart } });
        previousCount = await User.countDocuments({ 
          createdAt: { $gte: previousStart, $lt: previousEnd } 
        });
        break;
      case 'content':
        currentCount = await Post.countDocuments({ createdAt: { $gte: currentStart } });
        previousCount = await Post.countDocuments({ 
          createdAt: { $gte: previousStart, $lt: previousEnd } 
        });
        break;
      default:
        return 0;
    }

    return previousCount > 0 ? (((currentCount - previousCount) / previousCount) * 100).toFixed(2) : 0;
  }

  async getUserEngagementMetrics(userId, period) {
    const periodMs = this.getPeriodMs(period);
    const startDate = new Date(Date.now() - periodMs);

    const [totalLikes, totalComments, totalShares] = await Promise.all([
      Post.aggregate([
        { $match: { author: userId, createdAt: { $gte: startDate } } },
        { $group: { _id: null, total: { $sum: '$likesCount' } } }
      ]).then(result => result[0]?.total || 0),
      Post.aggregate([
        { $match: { author: userId, createdAt: { $gte: startDate } } },
        { $group: { _id: null, total: { $sum: '$commentsCount' } } }
      ]).then(result => result[0]?.total || 0),
      Post.aggregate([
        { $match: { author: userId, createdAt: { $gte: startDate } } },
        { $group: { _id: null, total: { $sum: '$sharesCount' } } }
      ]).then(result => result[0]?.total || 0)
    ]);

    return {
      likes: totalLikes,
      comments: totalComments,
      shares: totalShares,
      total: totalLikes + totalComments + totalShares
    };
  }

  async getUserGrowthMetrics(userId, period) {
    // This would track user-specific growth metrics
    return {
      followersGrowth: 0, // Implement follower growth tracking
      engagementGrowth: 0 // Implement engagement growth tracking
    };
  }

  async getAverageEngagementPerUser(period) {
    const periodMs = this.getPeriodMs(period);
    const startDate = new Date(Date.now() - periodMs);

    const [totalEngagement, activeUsers] = await Promise.all([
      Post.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { 
          _id: null, 
          total: { $sum: { $add: ['$likesCount', '$commentsCount', '$sharesCount'] } }
        }}
      ]).then(result => result[0]?.total || 0),
      User.countDocuments({ 
        lastActiveAt: { $gte: startDate },
        isActive: true 
      })
    ]);

    return activeUsers > 0 ? (totalEngagement / activeUsers).toFixed(2) : 0;
  }

  async getAverageResponseTime(period) {
    // This would typically come from your monitoring system
    return 150; // ms - placeholder
  }

  async getErrorRate(period) {
    // This would typically come from your monitoring system
    return 0.1; // % - placeholder
  }

  async getUptime(period) {
    // This would typically come from your monitoring system
    return 99.9; // % - placeholder
  }

  async getThroughput(period) {
    const periodMs = this.getPeriodMs(period);
    const startDate = new Date(Date.now() - periodMs);

    const totalRequests = await Promise.all([
      Post.countDocuments({ createdAt: { $gte: startDate } }),
      Story.countDocuments({ createdAt: { $gte: startDate } }),
      Message.countDocuments({ createdAt: { $gte: startDate } }),
      Call.countDocuments({ createdAt: { $gte: startDate } })
    ]).then(counts => counts.reduce((sum, count) => sum + count, 0));

    return (totalRequests / (periodMs / (24 * 60 * 60 * 1000))).toFixed(2); // requests per day
  }
}

// Singleton instance
const analyticsService = new AnalyticsService();

module.exports = analyticsService;
