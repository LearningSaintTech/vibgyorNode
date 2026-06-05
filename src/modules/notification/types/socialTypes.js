/**
 * Social Notification Types
 * Defines all social notification types and their default configurations
 */

const SOCIAL_NOTIFICATION_TYPES = {
  // Post notifications
  post_like: {
    context: 'social',
    type: 'post_like',
    defaultTitle: 'New Like',
    defaultMessage: '{sender} liked your post',
    priority: 'normal',
    defaultChannels: {
      inApp: true,
      push: true,
      email: false,
      sms: false
    },
    expiry: 7 * 24 * 60 * 60 * 1000 // 7 days
  },
  post_comment: {
    context: 'social',
    type: 'post_comment',
    defaultTitle: 'New Comment',
    defaultMessage: '{sender} commented on your post',
    priority: 'normal',
    defaultChannels: {
      inApp: true,
      push: true,
      email: false,
      sms: false
    },
    expiry: 7 * 24 * 60 * 60 * 1000 // 7 days
  },
  post_share: {
    context: 'social',
    type: 'post_share',
    defaultTitle: 'Post Shared',
    defaultMessage: '{sender} shared your post',
    priority: 'normal',
    defaultChannels: {
      inApp: true,
      push: false,
      email: false,
      sms: false
    },
    expiry: 7 * 24 * 60 * 60 * 1000 // 7 days
  },
  post_mention: {
    context: 'social',
    type: 'post_mention',
    defaultTitle: 'You were mentioned',
    defaultMessage: '{sender} mentioned you in a post',
    priority: 'high',
    defaultChannels: {
      inApp: true,
      push: true,
      email: true,
      sms: false
    },
    expiry: 7 * 24 * 60 * 60 * 1000 // 7 days
  },
  
  // Story notifications
  story_view: {
    context: 'social',
    type: 'story_view',
    defaultTitle: 'Story View',
    defaultMessage: '{sender} viewed your story',
    priority: 'low',
    defaultChannels: {
      inApp: false,
      push: false,
      email: false,
      sms: false
    },
    expiry: 24 * 60 * 60 * 1000 // 1 day
  },
  story_reaction: {
    context: 'social',
    type: 'story_reaction',
    defaultTitle: 'Story Reaction',
    defaultMessage: '{sender} reacted to your story',
    priority: 'normal',
    defaultChannels: {
      inApp: true,
      push: true,
      email: false,
      sms: false
    },
    expiry: 24 * 60 * 60 * 1000 // 1 day
  },
  story_reply: {
    context: 'social',
    type: 'story_reply',
    defaultTitle: 'Story Reply',
    defaultMessage: '{sender} replied to your story',
    priority: 'normal',
    defaultChannels: {
      inApp: true,
      push: true,
      email: false,
      sms: false
    },
    expiry: 24 * 60 * 60 * 1000 // 1 day
  },
  story_mention: {
    context: 'social',
    type: 'story_mention',
    defaultTitle: 'You were mentioned',
    defaultMessage: '{sender} mentioned you in a story',
    priority: 'high',
    defaultChannels: {
      inApp: true,
      push: true,
      email: true,
      sms: false
    },
    expiry: 24 * 60 * 60 * 1000 // 1 day
  },
  
  // Follow notifications
  follow_request: {
    context: 'social',
    type: 'follow_request',
    defaultTitle: 'Follow Request',
    defaultMessage: '{sender} sent you a follow request',
    priority: 'high',
    defaultChannels: {
      inApp: true,
      push: true,
      email: true,
      sms: false
    },
    expiry: 30 * 24 * 60 * 60 * 1000 // 30 days
  },
  follow_accepted: {
    context: 'social',
    type: 'follow_accepted',
    defaultTitle: 'Follow Request Accepted',
    defaultMessage: '{sender} accepted your follow request',
    priority: 'normal',
    defaultChannels: {
      inApp: true,
      push: false,
      email: false,
      sms: false
    },
    expiry: 7 * 24 * 60 * 60 * 1000 // 7 days
  },
  follow: {
    context: 'social',
    type: 'follow',
    defaultTitle: 'New Follower',
    defaultMessage: '{sender} started following you',
    priority: 'normal',
    defaultChannels: {
      inApp: true,
      push: true,
      email: false,
      sms: false
    },
    expiry: 7 * 24 * 60 * 60 * 1000 // 7 days
  },
  
  // Message notifications
  message_received: {
    context: 'social',
    type: 'message_received',
    defaultTitle: 'New Message',
    defaultMessage: '{sender} sent you a message',
    priority: 'high',
    defaultChannels: {
      inApp: true,
      push: true,
      email: false,
      sms: false
    },
    expiry: 30 * 24 * 60 * 60 * 1000 // 30 days
  },
  message_request: {
    context: 'social',
    type: 'message_request',
    defaultTitle: 'Message Request',
    defaultMessage: '{sender} sent you a message request',
    priority: 'high',
    defaultChannels: {
      inApp: true,
      push: true,
      email: true,
      sms: false
    },
    expiry: 30 * 24 * 60 * 60 * 1000 // 30 days
  },
  
  // Call notifications
  call_incoming: {
    context: 'social',
    type: 'call_incoming',
    defaultTitle: 'Incoming Call',
    defaultMessage: '{sender} is calling you',
    priority: 'urgent',
    defaultChannels: {
      inApp: true,
      push: true,
      email: false,
      sms: false
    },
    expiry: 1 * 60 * 60 * 1000 // 1 hour
  },
  call_missed: {
    context: 'social',
    type: 'call_missed',
    defaultTitle: 'Missed Call',
    defaultMessage: 'You missed a call from {sender}',
    priority: 'normal',
    defaultChannels: {
      inApp: true,
      push: true,
      email: true,
      sms: false
    },
    expiry: 7 * 24 * 60 * 60 * 1000 // 7 days
  },
  call_ended: {
    context: 'social',
    type: 'call_ended',
    defaultTitle: 'Call Ended',
    defaultMessage: 'Call with {sender} ended',
    priority: 'low',
    defaultChannels: {
      inApp: false,
      push: false,
      email: false,
      sms: false
    },
    expiry: 1 * 60 * 60 * 1000 // 1 hour
  },
  
  // System notifications
  system_announcement: {
    context: 'social',
    type: 'system_announcement',
    defaultTitle: 'System Announcement',
    defaultMessage: '{message}',
    priority: 'high',
    defaultChannels: {
      inApp: true,
      push: true,
      email: true,
      sms: false
    },
    expiry: 30 * 24 * 60 * 60 * 1000 // 30 days
  },
  content_moderation: {
    context: 'social',
    type: 'content_moderation',
    defaultTitle: 'Content Warning',
    defaultMessage: 'Your content has been flagged for review',
    priority: 'high',
    defaultChannels: {
      inApp: true,
      push: true,
      email: true,
      sms: false
    },
    expiry: 30 * 24 * 60 * 60 * 1000 // 30 days
  },
  account_update: {
    context: 'social',
    type: 'account_update',
    defaultTitle: 'Account Update',
    defaultMessage: 'Your account has been updated',
    priority: 'normal',
    defaultChannels: {
      inApp: true,
      push: true,
      email: true,
      sms: false
    },
    expiry: 7 * 24 * 60 * 60 * 1000 // 7 days
  },
  
  // Highlight notifications
  highlight_added: {
    context: 'social',
    type: 'highlight_added',
    defaultTitle: 'Highlight Added',
    defaultMessage: '{sender} added a highlight',
    priority: 'low',
    defaultChannels: {
      inApp: true,
      push: false,
      email: false,
      sms: false
    },
    expiry: 7 * 24 * 60 * 60 * 1000 // 7 days
  },
  highlight_view: {
    context: 'social',
    type: 'highlight_view',
    defaultTitle: 'Highlight View',
    defaultMessage: '{sender} viewed your highlight',
    priority: 'low',
    defaultChannels: {
      inApp: false,
      push: false,
      email: false,
      sms: false
    },
    expiry: 7 * 24 * 60 * 60 * 1000 // 7 days
  },
  
  // Poll notifications
  poll_vote: {
    context: 'social',
    type: 'poll_vote',
    defaultTitle: 'Poll Vote',
    defaultMessage: '{sender} voted on your poll',
    priority: 'normal',
    defaultChannels: {
      inApp: true,
      push: false,
      email: false,
      sms: false
    },
    expiry: 7 * 24 * 60 * 60 * 1000 // 7 days
  },
  poll_ended: {
    context: 'social',
    type: 'poll_ended',
    defaultTitle: 'Poll Ended',
    defaultMessage: 'Your poll has ended',
    priority: 'normal',
    defaultChannels: {
      inApp: true,
      push: false,
      email: false,
      sms: false
    },
    expiry: 7 * 24 * 60 * 60 * 1000 // 7 days
  },
  
  // Question notifications
  question_answer: {
    context: 'social',
    type: 'question_answer',
    defaultTitle: 'Question Answered',
    defaultMessage: '{sender} answered your question',
    priority: 'normal',
    defaultChannels: {
      inApp: true,
      push: true,
      email: false,
      sms: false
    },
    expiry: 7 * 24 * 60 * 60 * 1000 // 7 days
  }
};

/**
 * Get notification type configuration
 * @param {string} type - Notification type
 * @returns {Object|null} Notification type configuration
 */
function getNotificationType(type) {
  return SOCIAL_NOTIFICATION_TYPES[type] || null;
}

/**
 * Check if notification type exists
 * @param {string} type - Notification type
 * @returns {boolean} True if type exists
 */
function isValidType(type) {
  return type in SOCIAL_NOTIFICATION_TYPES;
}

/**
 * Get all notification types
 * @returns {Object} All notification types
 */
function getAllTypes() {
  return SOCIAL_NOTIFICATION_TYPES;
}

/**
 * Get notification types by context
 * @param {string} context - Context (social/dating)
 * @returns {Object} Notification types for context
 */
function getTypesByContext(context) {
  return Object.keys(SOCIAL_NOTIFICATION_TYPES)
    .filter(type => SOCIAL_NOTIFICATION_TYPES[type].context === context)
    .reduce((acc, type) => {
      acc[type] = SOCIAL_NOTIFICATION_TYPES[type];
      return acc;
    }, {});
}

module.exports = {
  SOCIAL_NOTIFICATION_TYPES,
  getNotificationType,
  isValidType,
  getAllTypes,
  getTypesByContext
};

