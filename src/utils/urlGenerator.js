/**
 * URL Generator Utility
 * Generates deep link URLs for push notifications
 * 
 * URL Format: vibgyor://{context}/{type}/{id}?{params}
 */

class URLGenerator {
  /**
   * Base URL scheme
   */
  static get BASE_SCHEME() {
    return 'vibgyor://';
  }

  /**
   * Generate deep link URL for a post
   * @param {string} postId - Post ID
   * @returns {string} Deep link URL
   */
  static generatePostUrl(postId) {
    if (!postId) {
      throw new Error('Post ID is required');
    }
    return `${this.BASE_SCHEME}post/${postId}`;
  }

  /**
   * Generate deep link URL for a user profile
   * @param {string} userId - User ID
   * @returns {string} Deep link URL
   */
  static generateUserUrl(userId) {
    if (!userId) {
      throw new Error('User ID is required');
    }
    return `${this.BASE_SCHEME}user/${userId}`;
  }

  /**
   * Generate deep link URL for a chat
   * @param {string} chatId - Chat ID
   * @returns {string} Deep link URL
   */
  static generateChatUrl(chatId) {
    if (!chatId) {
      throw new Error('Chat ID is required');
    }
    return `${this.BASE_SCHEME}chat/${chatId}`;
  }

  /**
   * Generate deep link URL for a story
   * @param {string} storyId - Story ID
   * @param {string} userId - Optional user ID for query params
   * @returns {string} Deep link URL
   */
  static generateStoryUrl(storyId, userId = null) {
    if (!storyId) {
      throw new Error('Story ID is required');
    }
    let url = `${this.BASE_SCHEME}story/${storyId}`;
    if (userId) {
      url += `?userId=${userId}`;
    }
    return url;
  }

  /**
   * Generate deep link URL for a dating match
   * @param {string} matchId - Match ID
   * @returns {string} Deep link URL
   */
  static generateMatchUrl(matchId) {
    if (!matchId) {
      throw new Error('Match ID is required');
    }
    return `${this.BASE_SCHEME}dating/match/${matchId}`;
  }

  /**
   * Generate deep link URL for dating chat
   * @param {string} chatId - Chat ID
   * @returns {string} Deep link URL
   */
  static generateDatingChatUrl(chatId) {
    if (!chatId) {
      throw new Error('Chat ID is required');
    }
    return `${this.BASE_SCHEME}dating/chat/${chatId}`;
  }

  /**
   * Generate deep link URL for dating discovery
   * @returns {string} Deep link URL
   */
  static generateDatingDiscoveryUrl() {
    return `${this.BASE_SCHEME}dating/discovery`;
  }

  /**
   * Generate deep link URL for notifications list
   * @returns {string} Deep link URL
   */
  static generateNotificationsUrl() {
    return `${this.BASE_SCHEME}notifications`;
  }

  /**
   * Generate deep link URL for message requests
   * @returns {string} Deep link URL
   */
  static generateMessageRequestsUrl() {
    return `${this.BASE_SCHEME}messages/requests`;
  }

  /**
   * Generate deep link URL for a call
   * @param {string} callId - Call ID
   * @returns {string} Deep link URL
   */
  static generateCallUrl(callId) {
    if (!callId) {
      throw new Error('Call ID is required');
    }
    return `${this.BASE_SCHEME}call/${callId}`;
  }

  /**
   * Generate deep link URL based on notification type and data
   * @param {string} type - Notification type
   * @param {string} context - Notification context (social/dating)
   * @param {Object} data - Notification data
   * @returns {string|null} Deep link URL or null if cannot generate
   */
  static generateUrlFromNotification(type, context, data = {}) {
    try {
      // Social notifications
      if (context === 'social') {
        switch (type) {
          case 'post_like':
          case 'post_comment':
          case 'post_mention':
          case 'post_share':
            // Try multiple sources for postId
            const postId = data.postId || data?.relatedContent?.contentId || null;
            if (postId) {
              // Convert to string if it's an ObjectId
              const postIdStr = postId.toString ? postId.toString() : String(postId);
              return this.generatePostUrl(postIdStr);
            }
            console.warn(`[URLGenerator] No postId found for ${type}`, { data });
            break;

          case 'follow_request':
          case 'follow_request_accepted':
            // Try multiple sources for userId
            const userId = data.userId || data.senderId || data?.relatedContent?.contentId || null;
            if (userId) {
              const userIdStr = userId.toString ? userId.toString() : String(userId);
              return this.generateUserUrl(userIdStr);
            }
            console.warn(`[URLGenerator] No userId found for ${type}`, { data });
            break;

          case 'story_view':
          case 'story_like':
          case 'story_reply':
          case 'story_reaction':
          case 'story_mention':
            // Try multiple sources for storyId
            const storyId = data.storyId || data?.relatedContent?.contentId || null;
            if (storyId) {
              const storyIdStr = storyId.toString ? storyId.toString() : String(storyId);
              const storyUserId = data.userId || data.senderId || null;
              return this.generateStoryUrl(storyIdStr, storyUserId);
            }
            console.warn(`[URLGenerator] No storyId found for ${type}`, { data });
            break;

          case 'message_received':
            // Try multiple sources for chatId
            const chatId = data.chatId || data?.relatedContent?.contentId || null;
            if (chatId) {
              const chatIdStr = chatId.toString ? chatId.toString() : String(chatId);
              return this.generateChatUrl(chatIdStr);
            }
            console.warn(`[URLGenerator] No chatId found for ${type}`, { data });
            break;

          case 'message_request':
            return this.generateMessageRequestsUrl();

          case 'message_request_accepted':
            if (data.chatId || data?.relatedContent?.contentId) {
              return this.generateChatUrl(data.chatId || data.relatedContent.contentId);
            }
            break;

          case 'call_incoming':
            if (data.callId || data?.relatedContent?.contentId) {
              return this.generateCallUrl(data.callId || data.relatedContent.contentId);
            }
            break;

          case 'call_missed':
            return this.generateNotificationsUrl();

          default:
            console.warn(`[URLGenerator] Unknown social notification type: ${type}`);
            return null;
        }
      }

      // Dating notifications
      if (context === 'dating') {
        switch (type) {
          case 'match':
            if (data.matchId || data?.relatedContent?.contentId) {
              return this.generateMatchUrl(data.matchId || data.relatedContent.contentId);
            }
            break;

          case 'like':
          case 'super_like':
            return this.generateDatingDiscoveryUrl();

          case 'message_received':
            if (data.chatId || data.matchId || data?.relatedContent?.contentId) {
              // Prefer chatId, fallback to matchId
              const id = data.chatId || data.matchId || data.relatedContent.contentId;
              if (data.chatId) {
                return this.generateDatingChatUrl(id);
              } else {
                return this.generateMatchUrl(id);
              }
            }
            break;

          default:
            console.warn(`[URLGenerator] Unknown dating notification type: ${type}`);
            return null;
        }
      }

      return null;
    } catch (error) {
      console.error(`[URLGenerator] Error generating URL for ${type}:`, error);
      return null;
    }
  }

  /**
   * Validate a deep link URL
   * @param {string} url - URL to validate
   * @returns {boolean} True if valid
   */
  static isValidUrl(url) {
    if (!url || typeof url !== 'string') {
      return false;
    }
    return url.startsWith(this.BASE_SCHEME);
  }
}

module.exports = URLGenerator;

