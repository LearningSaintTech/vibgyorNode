const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const helmet = require('helmet');
const { createServer } = require('http');
const { createHttpsServer } = require('../https-setup');

// Import enhanced middleware
const { responseTime, compressionMiddleware, apiRateLimit, authRateLimit } = require('./middleware/performanceMiddleware');

// Import enhanced realtime service
const enhancedRealtimeService = require('./services/enhancedRealtimeService');

// Legacy routes (keeping for backward compatibility)
const adminRoutes = require('./admin/adminRoutes/adminAuthRoutes');
const adminUserManagementRoutes = require('./admin/adminRoutes/adminUserManagementRoutes');
const adminSubAdminManagementRoutes = require('./admin/adminRoutes/adminSubAdminManagementRoutes');
const subAdminRoutes = require('./subAdmin/subAdminRoutes/subAdminAuthRoutes');
const subAdminUserManagementRoutes = require('./subAdmin/subAdminRoutes/userManagementRoutes');
const userAuthRoutes = require('./user/userRoutes/userAuthRoutes');
const userCatalogRoutes = require('./user/userRoutes/userCatalogRoutes');
const userUsernameRoutes = require('./user/userRoutes/userUsernameRoutes');
const userSocialRoutes = require('./user/userRoutes/userSocialRoutes');
const userMessageRequestRoutes = require('./user/userRoutes/userMessageRequestRoutes');
const userStatusRoutes = require('./user/userRoutes/userStatusRoutes');
const userFileUploadRoutes = require('./user/userRoutes/userFileUploadRoutes');

// Enhanced routes
const enhancedUserRoutes = require('./user/userRoutes/index');

const app = express();

// Enhanced Middleware
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(compressionMiddleware); // Add compression
app.use(express.json({ limit: '10mb' })); // Increase JSON limit for file uploads
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(responseTime); // Add response time logging

// Rate limiting - COMMENTED OUT FOR TESTING
// app.use('/api/v1', apiRateLimit);
// app.use('/user/auth', authRateLimit);

// API Versioning
app.use('/api/v1', (req, res, next) => {
  req.apiVersion = 'v1';
  next();
});

// Legacy Routes (keeping for backward compatibility)
app.use('/admin', adminRoutes);
app.use('/admin', adminUserManagementRoutes);
app.use('/admin', adminSubAdminManagementRoutes);
app.use('/subadmin', subAdminRoutes);
app.use('/subadmin', subAdminUserManagementRoutes);

// Legacy User routes (keeping only non-conflicting routes)
app.use('/user/auth', userAuthRoutes);
app.use('/user/catalog', userCatalogRoutes);
app.use('/user/username', userUsernameRoutes);
app.use('/user/social', userSocialRoutes);
app.use('/user/message-requests', userMessageRequestRoutes);
app.use('/user/status', userStatusRoutes);
app.use('/user/upload', userFileUploadRoutes);

// Enhanced API Routes (new optimized routes)
app.use('/api/v1/user', enhancedUserRoutes);

// Health check
app.get('/health', (req, res) => {
	res.status(200).json({ 
		status: 'ok', 
		service: 'vibgyorNode',
		version: '2.0.0',
		timestamp: new Date().toISOString(),
		features: ['chat', 'calls', 'realtime', 'webrtc']
	});
});

// API Info
app.get('/api/v1/info', (req, res) => {
	res.status(200).json({
		service: 'VibgyorNode API',
		version: '2.0.0',
		description: 'Enhanced chat and calling platform with WebRTC support',
		endpoints: {
			chats: '/api/v1/user/chats',
			messages: '/api/v1/user/messages',
			calls: '/api/v1/user/calls',
			realtime: 'WebSocket connection available'
		},
		features: [
			'Real-time messaging',
			'Audio/Video calls with WebRTC',
			'File sharing',
			'Message reactions',
			'Typing indicators',
			'Online status',
			'Call history',
			'Message search'
		]
	});
});

// Root
app.get('/', (req, res) => {
	res.json({
		message: 'VibgyorNode API v2.0 is running',
		version: '2.0.0',
		docs: '/api/v1/info',
		health: '/health'
	});
});

// Error handling middleware
app.use((err, req, res, next) => {
	console.error('Error:', err);
	res.status(err.status || 500).json({
		error: {
			message: err.message || 'Internal Server Error',
			status: err.status || 500,
			timestamp: new Date().toISOString()
		}
	});
});

// 404 handler
app.use((req, res) => {
	res.status(404).json({
		error: {
			message: 'Route not found',
			status: 404,
			path: req.originalUrl,
			timestamp: new Date().toISOString()
		}
	});
});

// Create server (HTTPS for local dev, HTTP for production/Render)
let server;

// On Render, always use HTTP (Render handles HTTPS termination)
if (process.env.NODE_ENV === 'production') {
  server = createServer(app);
  console.log('🚀 Production mode - Using HTTP server (Render handles HTTPS)');
} else {
  // Local development - try HTTPS first, fallback to HTTP
  const httpsServer = createHttpsServer(app);
  
  if (httpsServer) {
    server = httpsServer;
    console.log('🔒 Using HTTPS server for WebRTC and WebSocket');
  } else {
    server = createServer(app);
    console.log('⚠️  Using HTTP server (HTTPS certificates not found)');
    console.log('📋 WebRTC may not work properly without HTTPS');
  }
}

// Initialize Socket.IO
const io = enhancedRealtimeService.init(server);

// Export both app, server, and io
module.exports = { app, server, io };


