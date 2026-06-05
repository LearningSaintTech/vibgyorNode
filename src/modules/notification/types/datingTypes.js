/**
 * Dating Notification Types
 * Defines all dating notification types and their default configurations
 * (Ready for future implementation)
 */

const DATING_NOTIFICATION_TYPES = {
  // Match notifications
  match: {
    context: 'dating',
    type: 'match',
    defaultTitle: 'New Match!',
    defaultMessage: 'You and {sender} liked each other',
    priority: 'high',
    defaultChannels: {
      inApp: true,
      push: true,
      email: false,
      sms: false
    },
    expiry: 30 * 24 * 60 * 60 * 1000 // 30 days
  },
  like: {
    context: 'dating',
    type: 'like',
    defaultTitle: 'New Like',
    defaultMessage: '{sender} liked your profile',
    priority: 'normal',
    defaultChannels: {
      inApp: true,
      push: true,
      email: false,
      sms: false
    },
    expiry: 7 * 24 * 60 * 60 * 1000 // 7 days
  },
  super_like: {
    context: 'dating',
    type: 'super_like',
    defaultTitle: 'Super Like!',
    defaultMessage: '{sender} super liked your profile',
    priority: 'high',
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
    context: 'dating',
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
  match_request: {
    context: 'dating',
    type: 'match_request',
    defaultTitle: 'Match Request',
    defaultMessage: '{sender} wants to match with you',
    priority: 'high',
    defaultChannels: {
      inApp: true,
      push: true,
      email: true,
      sms: false
    },
    expiry: 30 * 24 * 60 * 60 * 1000 // 30 days
  },
  match_accepted: {
    context: 'dating',
    type: 'match_accepted',
    defaultTitle: 'Match Accepted',
    defaultMessage: '{sender} accepted your match request',
    priority: 'high',
    defaultChannels: {
      inApp: true,
      push: true,
      email: false,
      sms: false
    },
    expiry: 7 * 24 * 60 * 60 * 1000 // 7 days
  },
  match_rejected: {
    context: 'dating',
    type: 'match_rejected',
    defaultTitle: 'Match Rejected',
    defaultMessage: '{sender} rejected your match request',
    priority: 'normal',
    defaultChannels: {
      inApp: true,
      push: false,
      email: false,
      sms: false
    },
    expiry: 7 * 24 * 60 * 60 * 1000 // 7 days
  },
  
  // Date notifications
  date_suggestion: {
    context: 'dating',
    type: 'date_suggestion',
    defaultTitle: 'Date Suggestion',
    defaultMessage: '{sender} suggested a date',
    priority: 'high',
    defaultChannels: {
      inApp: true,
      push: true,
      email: true,
      sms: false
    },
    expiry: 7 * 24 * 60 * 60 * 1000 // 7 days
  },
  date_accepted: {
    context: 'dating',
    type: 'date_accepted',
    defaultTitle: 'Date Accepted',
    defaultMessage: '{sender} accepted your date suggestion',
    priority: 'high',
    defaultChannels: {
      inApp: true,
      push: true,
      email: false,
      sms: false
    },
    expiry: 7 * 24 * 60 * 60 * 1000 // 7 days
  },
  date_rejected: {
    context: 'dating',
    type: 'date_rejected',
    defaultTitle: 'Date Rejected',
    defaultMessage: '{sender} rejected your date suggestion',
    priority: 'normal',
    defaultChannels: {
      inApp: true,
      push: false,
      email: false,
      sms: false
    },
    expiry: 7 * 24 * 60 * 60 * 1000 // 7 days
  },
  reminder: {
    context: 'dating',
    type: 'reminder',
    defaultTitle: 'Date Reminder',
    defaultMessage: 'You have a date coming up with {sender}',
    priority: 'high',
    defaultChannels: {
      inApp: true,
      push: true,
      email: true,
      sms: false
    },
    expiry: 1 * 24 * 60 * 60 * 1000 // 1 day
  },
  
  // Safety notifications
  safety_alert: {
    context: 'dating',
    type: 'safety_alert',
    defaultTitle: 'Safety Alert',
    defaultMessage: '{message}',
    priority: 'urgent',
    defaultChannels: {
      inApp: true,
      push: true,
      email: true,
      sms: true
    },
    expiry: 7 * 24 * 60 * 60 * 1000 // 7 days
  },
  
  // Call notifications
  call_incoming: {
    context: 'dating',
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
    context: 'dating',
    type: 'call_missed',
    defaultTitle: 'Missed Call',
    defaultMessage: 'You missed a call from {sender}',
    priority: 'high',
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
  return DATING_NOTIFICATION_TYPES[type] || null;
}

/**
 * Check if notification type exists
 * @param {string} type - Notification type
 * @returns {boolean} True if type exists
 */
function isValidType(type) {
  return type in DATING_NOTIFICATION_TYPES;
}

/**
 * Get all notification types
 * @returns {Object} All notification types
 */
function getAllTypes() {
  return DATING_NOTIFICATION_TYPES;
}

/**
 * Get notification types by context
 * @param {string} context - Context (social/dating)
 * @returns {Object} Notification types for context
 */
function getTypesByContext(context) {
  return Object.keys(DATING_NOTIFICATION_TYPES)
    .filter(type => DATING_NOTIFICATION_TYPES[type].context === context)
    .reduce((acc, type) => {
      acc[type] = DATING_NOTIFICATION_TYPES[type];
      return acc;
    }, {});
}

module.exports = {
  DATING_NOTIFICATION_TYPES,
  getNotificationType,
  isValidType,
  getAllTypes,
  getTypesByContext
};

