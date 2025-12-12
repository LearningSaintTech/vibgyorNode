/**
 * Cache Middleware
 * Provides caching for GET requests
 */

const cacheService = require('../services/cacheService');
const ApiResponse = require('../utils/apiResponse');

/**
 * Cache middleware factory
 * @param {Object} options - Cache options
 * @param {number} options.ttl - Time to live in seconds (default: 300)
 * @param {Function} options.keyGenerator - Custom key generator function
 * @param {Function} options.shouldCache - Function to determine if response should be cached
 * @returns {Function} - Express middleware
 */
const cacheMiddleware = (options = {}) => {
  const {
    ttl = 300, // 5 minutes default
    keyGenerator = (req) => {
      // Default key generator: method + path + query + userId
      const userId = req.user?.userId || req.user?.id || 'anonymous';
      return `cache:${req.method}:${req.path}:${JSON.stringify(req.query)}:${userId}`;
    },
    shouldCache = (req, res) => {
      // Only cache GET requests with 200 status
      return req.method === 'GET' && res.statusCode === 200;
    }
  } = options;

  return async (req, res, next) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Generate cache key
    const cacheKey = keyGenerator(req);

    // Try to get from cache
    const cached = cacheService.get(cacheKey);
    if (cached) {
      // Set cache headers
      res.set('X-Cache', 'HIT');
      return res.json(cached);
    }

    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json method to cache response
    res.json = function(data) {
      // Only cache if shouldCache returns true
      if (shouldCache(req, res)) {
        cacheService.set(cacheKey, data, ttl);
        res.set('X-Cache', 'MISS');
      }

      // Call original json method
      return originalJson(data);
    };

    next();
  };
};

/**
 * Cache invalidation middleware
 * Invalidates cache based on patterns
 */
const invalidateCache = (patterns = []) => {
  return (req, res, next) => {
    // Invalidate cache after successful mutation
    if (req.method !== 'GET' && res.statusCode >= 200 && res.statusCode < 300) {
      patterns.forEach(pattern => {
        cacheService.deletePattern(pattern);
      });
    }

    next();
  };
};

/**
 * Cache user-specific data
 * @param {string} userId - User ID
 * @param {string} key - Cache key suffix
 * @param {any} value - Value to cache
 * @param {number} ttl - Time to live in seconds
 */
const cacheUserData = (userId, key, value, ttl = 300) => {
  return cacheService.set(`user:${userId}:${key}`, value, ttl);
};

/**
 * Get cached user data
 * @param {string} userId - User ID
 * @param {string} key - Cache key suffix
 * @returns {any|null} - Cached value or null
 */
const getCachedUserData = (userId, key) => {
  return cacheService.get(`user:${userId}:${key}`);
};

/**
 * Invalidate user cache
 * @param {string} userId - User ID
 * @param {string} pattern - Pattern to match (optional)
 */
const invalidateUserCache = (userId, pattern = '*') => {
  return cacheService.deletePattern(`user:${userId}:${pattern}`);
};

module.exports = {
  cacheMiddleware,
  invalidateCache,
  cacheUserData,
  getCachedUserData,
  invalidateUserCache,
  cacheService
};

