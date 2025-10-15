const Post = require('../user/userModel/postModel');
const User = require('../user/userModel/userAuthModel');

/**
 * Smart Feed Algorithm Service
 * Implements a sophisticated algorithm to rank posts based on:
 * 1. Engagement Score (likes, comments, shares)
 * 2. Recency Score (how recent the post is)
 * 3. User Relationship Score (following, close friends)
 * 4. Content Quality Score (hashtags, mentions, media)
 * 5. User Behavior Score (past interactions)
 */

class FeedAlgorithmService {
  constructor() {
    this.weights = {
      engagement: 0.4,      // 40% - likes, comments, shares
      recency: 0.3,         // 30% - how recent the post is
      relationship: 0.2,    // 20% - following, close friends
      content: 0.1          // 10% - hashtags, mentions, media
    };
  }

  /**
   * Calculate engagement score for a post
   * @param {Object} post - Post object with engagement metrics
   * @returns {number} Engagement score (0-100)
   */
  calculateEngagementScore(post) {
    const likes = post.likesCount || 0;
    const comments = post.commentsCount || 0;
    const shares = post.sharesCount || 0;
    const views = post.viewsCount || 1; // Avoid division by zero

    // Weighted engagement calculation
    const engagementScore = (likes * 1) + (comments * 2) + (shares * 3);
    
    // Normalize by views to get engagement rate
    const engagementRate = (engagementScore / views) * 100;
    
    // Cap at 100 and apply logarithmic scaling for better distribution
    return Math.min(100, Math.log(engagementRate + 1) * 20);
  }

  /**
   * Calculate recency score for a post
   * @param {Date} publishedAt - When the post was published
   * @returns {number} Recency score (0-100)
   */
  calculateRecencyScore(publishedAt) {
    const now = new Date();
    const hoursAgo = (now - publishedAt) / (1000 * 60 * 60);
    
    // Exponential decay: newer posts get higher scores
    if (hoursAgo <= 1) return 100;      // First hour: 100%
    if (hoursAgo <= 6) return 90;       // First 6 hours: 90%
    if (hoursAgo <= 24) return 70;      // First day: 70%
    if (hoursAgo <= 72) return 50;      // First 3 days: 50%
    if (hoursAgo <= 168) return 30;     // First week: 30%
    
    // Older than a week: exponential decay
    return Math.max(5, 100 * Math.exp(-hoursAgo / 168));
  }

  /**
   * Calculate relationship score based on user connections
   * @param {Object} post - Post object
   * @param {Array} followingIds - User's following list
   * @param {Array} closeFriendsIds - User's close friends list
   * @returns {number} Relationship score (0-100)
   */
  calculateRelationshipScore(post, followingIds, closeFriendsIds) {
    const authorId = post.author.toString();
    
    if (closeFriendsIds.includes(authorId)) {
      return 100; // Close friends get maximum score
    }
    
    if (followingIds.includes(authorId)) {
      return 80;  // Following users get high score
    }
    
    return 20;    // Non-following users get low score
  }

  /**
   * Calculate content quality score
   * @param {Object} post - Post object
   * @returns {number} Content quality score (0-100)
   */
  calculateContentScore(post) {
    let score = 0;
    
    // Hashtags boost (up to 30 points)
    const hashtagCount = post.hashtags ? post.hashtags.length : 0;
    score += Math.min(30, hashtagCount * 5);
    
    // Mentions boost (up to 20 points)
    const mentionCount = post.mentions ? post.mentions.length : 0;
    score += Math.min(20, mentionCount * 10);
    
    // Media content boost (up to 30 points)
    const mediaCount = post.media ? post.media.length : 0;
    if (mediaCount > 0) {
      score += 30; // Any media gets full points
    }
    
    // Content length boost (up to 20 points)
    const contentLength = post.content ? post.content.length : 0;
    if (contentLength > 100) {
      score += 20; // Substantial content gets full points
    } else if (contentLength > 50) {
      score += 10; // Medium content gets half points
    }
    
    return Math.min(100, score);
  }

  /**
   * Calculate user behavior score based on past interactions
   * @param {string} userId - Current user ID
   * @param {string} authorId - Post author ID
   * @param {Object} userInteractions - User's interaction history
   * @returns {number} Behavior score (0-100)
   */
  calculateBehaviorScore(userId, authorId, userInteractions = {}) {
    // This would typically come from a user behavior tracking system
    // For now, we'll use a simplified approach
    
    const authorInteractions = userInteractions[authorId] || {};
    const totalInteractions = authorInteractions.likes + authorInteractions.comments + authorInteractions.shares;
    
    if (totalInteractions > 50) return 100;      // Very active interaction
    if (totalInteractions > 20) return 80;       // High interaction
    if (totalInteractions > 10) return 60;       // Medium interaction
    if (totalInteractions > 5) return 40;        // Low interaction
    if (totalInteractions > 0) return 20;        // Minimal interaction
    
    return 10; // No interaction history
  }

  /**
   * Generate personalized feed for a user
   * @param {string} userId - User ID
   * @param {number} page - Page number
   * @param {number} limit - Number of posts per page
   * @returns {Array} Sorted array of posts
   */
  async generatePersonalizedFeed(userId, page = 1, limit = 20) {
    try {
      // Get user's social connections
      const user = await User.findById(userId).select('following closeFriends');
      const followingIds = user?.following || [];
      const closeFriendsIds = user?.closeFriends || [];

      // Get posts that user can see
      const posts = await Post.aggregate([
        {
          $match: {
            status: 'published',
            $or: [
              { privacy: 'public' },
              { privacy: 'followers', author: { $in: followingIds } },
              { privacy: 'close_friends', author: { $in: closeFriendsIds } }
            ]
          }
        },
        {
          $addFields: {
            // Calculate all scores
            engagementScore: {
              $add: [
                { $multiply: ['$likesCount', 1] },
                { $multiply: ['$commentsCount', 2] },
                { $multiply: ['$sharesCount', 3] }
              ]
            },
            recencyScore: {
              $divide: [
                { $subtract: [new Date(), '$publishedAt'] },
                1000 * 60 * 60 * 24 // Convert to days
              ]
            },
            isFollowing: { $in: ['$author', followingIds] },
            isCloseFriend: { $in: ['$author', closeFriendsIds] },
            hasMedia: { $gt: [{ $size: { $ifNull: ['$media', []] } }, 0] },
            hasHashtags: { $gt: [{ $size: { $ifNull: ['$hashtags', []] } }, 0] },
            hasMentions: { $gt: [{ $size: { $ifNull: ['$mentions', []] } }, 0] }
          }
        },
        {
          $addFields: {
            // Calculate final weighted score
            finalScore: {
              $add: [
                // Engagement component (40%)
                {
                  $multiply: [
                    {
                      $min: [
                        100,
                        {
                          $multiply: [
                            { $divide: ['$engagementScore', { $max: ['$viewsCount', 1] }] },
                            100
                          ]
                        }
                      ]
                    },
                    0.4
                  ]
                },
                // Recency component (30%)
                {
                  $multiply: [
                    {
                      $cond: [
                        { $lte: ['$recencyScore', 1] }, 100,  // First day
                        {
                          $cond: [
                            { $lte: ['$recencyScore', 7] }, 70,   // First week
                            {
                              $cond: [
                                { $lte: ['$recencyScore', 30] }, 30,  // First month
                                5  // Older than a month
                              ]
                            }
                          ]
                        }
                      ]
                    },
                    0.3
                  ]
                },
                // Relationship component (20%)
                {
                  $multiply: [
                    {
                      $cond: ['$isCloseFriend', 100,
                        { $cond: ['$isFollowing', 80, 20] }
                      ]
                    },
                    0.2
                  ]
                },
                // Content component (10%)
                {
                  $multiply: [
                    {
                      $add: [
                        { $cond: ['$hasMedia', 30, 0] },
                        { $cond: ['$hasHashtags', 20, 0] },
                        { $cond: ['$hasMentions', 20, 0] },
                        {
                          $cond: [
                            { $gt: [{ $strLenCP: { $ifNull: ['$content', ''] } }, 100] },
                            30, 0
                          ]
                        }
                      ]
                    },
                    0.1
                  ]
                }
              ]
            }
          }
        },
        {
          $sort: { finalScore: -1, publishedAt: -1 }
        },
        {
          $skip: (page - 1) * limit
        },
        {
          $limit: limit
        },
        {
          $lookup: {
            from: 'users',
            localField: 'author',
            foreignField: '_id',
            as: 'author',
            pipeline: [
              {
                $project: {
                  username: 1,
                  fullName: 1,
                  profilePictureUrl: 1,
                  isVerified: 1
                }
              }
            ]
          }
        },
        {
          $unwind: '$author'
        },
        {
          $lookup: {
            from: 'users',
            localField: 'comments.user',
            foreignField: '_id',
            as: 'comments.user',
            pipeline: [
              {
                $project: {
                  username: 1,
                  fullName: 1,
                  profilePictureUrl: 1
                }
              }
            ]
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'likes.user',
            foreignField: '_id',
            as: 'likes.user',
            pipeline: [
              {
                $project: {
                  username: 1,
                  fullName: 1
                }
              }
            ]
          }
        }
      ]);

      return posts;
    } catch (error) {
      console.error('[FEED] Error generating personalized feed:', error);
      throw error;
    }
  }

  /**
   * Get trending posts based on recent engagement
   * @param {number} hours - Time window for trending (default: 24)
   * @param {number} limit - Number of posts to return
   * @returns {Array} Trending posts
   */
  async getTrendingPosts(hours = 24, limit = 20) {
    try {
      const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);

      const trendingPosts = await Post.aggregate([
        {
          $match: {
            status: 'published',
            privacy: 'public',
            publishedAt: { $gte: cutoffTime }
          }
        },
        {
          $addFields: {
            trendingScore: {
              $add: [
                { $multiply: ['$likesCount', 1] },
                { $multiply: ['$commentsCount', 3] },
                { $multiply: ['$sharesCount', 5] }
              ]
            }
          }
        },
        {
          $sort: { trendingScore: -1, publishedAt: -1 }
        },
        {
          $limit: limit
        },
        {
          $lookup: {
            from: 'users',
            localField: 'author',
            foreignField: '_id',
            as: 'author',
            pipeline: [
              {
                $project: {
                  username: 1,
                  fullName: 1,
                  profilePictureUrl: 1,
                  isVerified: 1
                }
              }
            ]
          }
        },
        {
          $unwind: '$author'
        }
      ]);

      return trendingPosts;
    } catch (error) {
      console.error('[FEED] Error getting trending posts:', error);
      throw error;
    }
  }

  /**
   * Get posts by hashtag with smart ranking
   * @param {string} hashtag - Hashtag to search for
   * @param {number} page - Page number
   * @param {number} limit - Number of posts per page
   * @returns {Array} Posts with the hashtag
   */
  async getPostsByHashtag(hashtag, page = 1, limit = 20) {
    try {
      const posts = await Post.aggregate([
        {
          $match: {
            status: 'published',
            privacy: 'public',
            hashtags: { $in: [hashtag.toLowerCase()] }
          }
        },
        {
          $addFields: {
            hashtagScore: {
              $add: [
                { $multiply: ['$likesCount', 1] },
                { $multiply: ['$commentsCount', 2] },
                { $multiply: ['$sharesCount', 3] }
              ]
            }
          }
        },
        {
          $sort: { hashtagScore: -1, publishedAt: -1 }
        },
        {
          $skip: (page - 1) * limit
        },
        {
          $limit: limit
        },
        {
          $lookup: {
            from: 'users',
            localField: 'author',
            foreignField: '_id',
            as: 'author',
            pipeline: [
              {
                $project: {
                  username: 1,
                  fullName: 1,
                  profilePictureUrl: 1,
                  isVerified: 1
                }
              }
            ]
          }
        },
        {
          $unwind: '$author'
        }
      ]);

      return posts;
    } catch (error) {
      console.error('[FEED] Error getting posts by hashtag:', error);
      throw error;
    }
  }
}

module.exports = new FeedAlgorithmService();
