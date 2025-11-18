const { getNotificationType: getSocialType, isValidType: isValidSocialType } = require('../types/socialTypes');
const { getNotificationType: getDatingType, isValidType: isValidDatingType } = require('../types/datingTypes');

/**
 * Notification Registry
 * Central registry for all notification types across contexts
 */
class NotificationRegistry {
  constructor() {
    this.registry = new Map();
    this.handlers = new Map();
    this.initialize();
  }

  /**
   * Initialize the registry with all notification types
   */
  initialize() {
    // Register social notification types
    this.registerContext('social', getSocialType, isValidSocialType);
    
    // Register dating notification types
    this.registerContext('dating', getDatingType, isValidDatingType);
  }

  /**
   * Register a context's notification types
   * @param {string} context - Context name (social/dating)
   * @param {Function} getTypeFn - Function to get type configuration
   * @param {Function} isValidFn - Function to validate type
   */
  registerContext(context, getTypeFn, isValidFn) {
    this.registry.set(context, {
      getType: getTypeFn,
      isValid: isValidFn
    });
  }

  /**
   * Register a handler for a context
   * @param {string} context - Context name
   * @param {Object} handler - Handler instance
   */
  registerHandler(context, handler) {
    this.handlers.set(context, handler);
  }

  /**
   * Get handler for a context
   * @param {string} context - Context name
   * @returns {Object|null} Handler instance
   */
  getHandler(context) {
    return this.handlers.get(context) || null;
  }

  /**
   * Get notification type configuration
   * @param {string} context - Context (social/dating)
   * @param {string} type - Notification type
   * @returns {Object|null} Notification type configuration
   */
  getType(context, type) {
    const contextRegistry = this.registry.get(context);
    if (!contextRegistry) {
      return null;
    }
    
    return contextRegistry.getType(type);
  }

  /**
   * Check if notification type is valid
   * @param {string} context - Context (social/dating)
   * @param {string} type - Notification type
   * @returns {boolean} True if type is valid
   */
  isValidType(context, type) {
    const contextRegistry = this.registry.get(context);
    if (!contextRegistry) {
      return false;
    }
    
    return contextRegistry.isValid(type);
  }

  /**
   * Validate notification data
   * @param {string} context - Context (social/dating)
   * @param {string} type - Notification type
   * @param {Object} data - Notification data
   * @returns {Object} Validation result
   */
  validate(context, type, data) {
    const errors = [];
    
    // Check if context is valid
    if (!this.registry.has(context)) {
      errors.push(`Invalid context: ${context}`);
      return { valid: false, errors };
    }
    
    // Check if type is valid
    if (!this.isValidType(context, type)) {
      errors.push(`Invalid type: ${type} for context: ${context}`);
      return { valid: false, errors };
    }
    
    // Get type configuration
    const typeConfig = this.getType(context, type);
    if (!typeConfig) {
      errors.push(`Type configuration not found: ${type}`);
      return { valid: false, errors };
    }
    
    // Validate required fields
    if (!data.recipientId) {
      errors.push('recipientId is required');
    }
    
    return {
      valid: errors.length === 0,
      errors,
      typeConfig
    };
  }

  /**
   * Get default configuration for a type
   * @param {string} context - Context (social/dating)
   * @param {string} type - Notification type
   * @returns {Object|null} Default configuration
   */
  getDefaultConfig(context, type) {
    const typeConfig = this.getType(context, type);
    if (!typeConfig) {
      return null;
    }
    
    return {
      context: typeConfig.context,
      type: typeConfig.type,
      priority: typeConfig.priority,
      channels: typeConfig.defaultChannels,
      expiry: typeConfig.expiry
    };
  }
}

// Singleton instance
const notificationRegistry = new NotificationRegistry();

module.exports = notificationRegistry;

