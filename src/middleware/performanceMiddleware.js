const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const compression = require('compression');
const helmet = require('helmet');

/**
 * Performance and Security Middleware
 */

// Rate limiting configurations
const createRateLimit = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message: message || 'Too many requests, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Skip rate limiting for certain conditions
      return req.ip === '127.0.0.1' || req.ip === '::1';
    }
  });
};

// General API rate limiting
const apiRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  100, // 100 requests per window
  'Too many API requests, please try again later.'
);

// Auth endpoints rate limiting
const authRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  5, // 5 requests per window
  'Too many authentication attempts, please try again later.'
);

// Call endpoints rate limiting
const callRateLimit = createRateLimit(
  60 * 1000, // 1 minute
  10, // 10 calls per minute
  'Too many call attempts, please try again later.'
);

// Message rate limiting
const messageRateLimit = createRateLimit(
  60 * 1000, // 1 minute
  30, // 30 messages per minute
  'Too many messages, please slow down.'
);

// File upload rate limiting
const uploadRateLimit = createRateLimit(
  60 * 60 * 1000, // 1 hour
  20, // 20 uploads per hour
  'Too many file uploads, please try again later.'
);

// Speed limiting (gradually slow down requests)
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50, // Allow 50 requests per window without delay
  delayMs: () => 500, // Add 500ms delay per request after delayAfter
  maxDelayMs: 20000, // Max delay of 20 seconds
  skipFailedRequests: false,
  skipSuccessfulRequests: false
});

// Compression middleware
const compressionMiddleware = compression({
  filter: (req, res) => {
    // Don't compress if the client doesn't support it
    if (req.headers['x-no-compression']) {
      return false;
    }
    
    // Use compression for text-based responses
    return compression.filter(req, res);
  },
  level: 6, // Compression level (1-9)
  threshold: 1024, // Only compress responses larger than 1KB
});

// Security headers
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"],
      mediaSrc: ["'self'", "blob:"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false, // Disable for WebRTC
});

// Request logging middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    };
    
    // Log slow requests
    if (duration > 1000) {
      console.warn('Slow request detected:', logData);
    } else {
      console.log('Request:', logData);
    }
  });
  
  next();
};

// Memory usage monitoring
const memoryMonitor = (req, res, next) => {
  const memUsage = process.memoryUsage();
  const memUsageMB = {
    rss: Math.round(memUsage.rss / 1024 / 1024),
    heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
    external: Math.round(memUsage.external / 1024 / 1024)
  };
  
  // Add memory usage to response headers for monitoring
  res.set('X-Memory-Usage', JSON.stringify(memUsageMB));
  
  // Log high memory usage
  if (memUsageMB.heapUsed > 500) { // 500MB threshold
    console.warn('High memory usage detected:', memUsageMB);
  }
  
  next();
};

// Database query optimization middleware
const dbOptimization = (req, res, next) => {
  const originalJson = res.json;
  
  res.json = function(data) {
    // Add performance headers
    if (req.query && Object.keys(req.query).length > 0) {
      res.set('X-Query-Params', Object.keys(req.query).join(','));
    }
    
    // Add pagination info if available
    if (data && data.pagination) {
      res.set('X-Pagination', JSON.stringify(data.pagination));
    }
    
    return originalJson.call(this, data);
  };
  
  next();
};

// Cache control middleware
const cacheControl = (maxAge = 300) => {
  return (req, res, next) => {
    // Set cache headers for GET requests
    if (req.method === 'GET') {
      res.set('Cache-Control', `public, max-age=${maxAge}`);
      res.set('ETag', `"${Date.now()}"`);
    } else {
      // No cache for non-GET requests
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
    
    next();
  };
};

// Response time middleware
const responseTime = (req, res, next) => {
  const start = Date.now();
  
  // Override res.json to add response time before sending
  const originalJson = res.json;
  res.json = function(data) {
    const duration = Date.now() - start;
    
    // Set response time header
    res.set('X-Response-Time', `${duration}ms`);
    
    // Add response time to JSON data if it's an object
    if (data && typeof data === 'object') {
      data._meta = data._meta || {};
      data._meta.responseTime = `${duration}ms`;
    }
    
    // Log response time
    console.log(`${req.method} ${req.originalUrl} - ${duration}ms`);
    
    return originalJson.call(this, data);
  };
  
  // Also handle other response methods
  const originalSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - start;
    res.set('X-Response-Time', `${duration}ms`);
    console.log(`${req.method} ${req.originalUrl} - ${duration}ms`);
    return originalSend.call(this, data);
  };
  
  next();
};

// Error boundary middleware
const errorBoundary = (error, req, res, next) => {
  console.error('Unhandled error:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });
  
  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(error.status || 500).json({
    success: false,
    message: isDevelopment ? error.message : 'Internal server error',
    ...(isDevelopment && { stack: error.stack })
  });
};

// Graceful shutdown handler
const gracefulShutdown = (server) => {
  const shutdown = (signal) => {
    console.log(`Received ${signal}. Starting graceful shutdown...`);
    
    server.close(() => {
      console.log('HTTP server closed.');
      
      // Close database connections
      process.exit(0);
    });
    
    // Force close after 10 seconds
    setTimeout(() => {
      console.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  };
  
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

// Health check endpoint
const healthCheck = (req, res) => {
  const healthData = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  };
  
  res.json(healthData);
};

module.exports = {
  // Rate limiting
  apiRateLimit,
  authRateLimit,
  callRateLimit,
  messageRateLimit,
  uploadRateLimit,
  speedLimiter,
  
  // Performance
  compressionMiddleware,
  securityHeaders,
  requestLogger,
  memoryMonitor,
  dbOptimization,
  cacheControl,
  responseTime,
  
  // Error handling
  errorBoundary,
  gracefulShutdown,
  healthCheck,
  
  // Utility
  createRateLimit
};
