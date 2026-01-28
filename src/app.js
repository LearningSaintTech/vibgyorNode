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

// Unified /SubAdmin Auth Routes (Single endpoint for both)
const unifiedAdminAuthRoutes = require('./admin/adminRoutes/unifiedAdminAuthRoutes');

// Legacy routes (keeping for backward compatibility)
const adminRoutes = require('./admin/adminRoutes/adminAuthRoutes');
const adminUserManagementRoutes = require('./admin/adminRoutes/adminUserManagementRoutes');
const adminSubAdminManagementRoutes = require('./admin/adminRoutes/adminSubAdminManagementRoutes');
const adminContentModerationRoutes = require('./admin/adminRoutes/contentModerationRoutes');
const adminUserRoutes = require("./admin/adminRoutes/adminuserSearchRoutes");
const adminAssociateRoutes = require("./admin/adminRoutes/subadminAssociateRoutes");
const adminAnalyticsRoutes = require('./admin/adminRoutes/analyticsRoutes');
const adminUserCountRoutes = require('./admin/adminRoutes/userCountRoutes');
const adminUserStatisticsRoutes = require('./admin/adminRoutes/userStatisticsRoutes');
const subAdminRoutes = require('./subAdmin/subAdminRoutes/subAdminAuthRoutes');
const subAdminUserManagementRoutes = require('./subAdmin/subAdminRoutes/userManagementRoutes');
const subdminVerifiedUserRoutes = require('./subAdmin/subAdminRoutes/subAdminVerifiedUserRoute');
const subAdminUserStatisticsRoutes = require('./subAdmin/subAdminRoutes/userStaticRoutes');


const userAuthRoutes = require('./user/auth/routes/userAuthRoutes');
const userCatalogRoutes = require('./user/auth/routes/userCatalogRoutes');
const userUsernameRoutes = require('./user/auth/routes/userUsernameRoutes');
const userSocialRoutes = require('./user/social/userRoutes/userSocialRoutes');
const userMessageRequestRoutes = require('./user/social/userRoutes/userMessageRequestRoutes');
const userStatusRoutes = require('./user/social/userRoutes/userStatusRoutes');
const userFileUploadRoutes = require('./user/auth/routes/userFileUploadRoutes');
const deleteAccountRoutes = require('./user/DeleteAccount/deleteAccountRoutes');
const postRoutes = require('./user/social/userRoutes/postRoutes');
const storyRoutes = require('./user/social/userRoutes/storyRoutes');
const datingMediaRoutes = require('./user/auth/controller/datingMediaRoutes');
const datingProfileRoutes = require('./user/dating/routes/datingProfileRoutes');
const datingInteractionRoutes = require('./user/dating/routes/datingInteractionRoutes');
const datingMessageRoutes = require('./user/dating/routes/datingMessageRoutes');
const datingChatRoutes = require('./user/dating/routes/datingChatRoutes');
const datingCallRoutes = require('./user/dating/routes/datingCallRoutes');
const cookieParser = require('cookie-parser');


// Enhanced routes
const enhancedUserRoutes = require('./user/social/userRoutes/index');

const app = express();

app.use((cookieParser()));

// Enhanced Middleware
app.use(helmet());
// app.use(cors({ 
//   origin: [
//     'http://localhost:5173',
//     'https://localhost:5173',
//     'http://127.0.0.1:5173',
//     'https://127.0.0.1:5173',
//     process.env.CORS_ORIGIN
//   ].filter(Boolean), 
//   credentials: true 
// }));

app.use(cors({
	origin: (origin, callback) => {
		callback(null, true); // allow all origins
	},
	credentials: true
}));

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

// Unified Admin/SubAdmin Auth Routes (Single endpoint for both)
// Phone: 9999999999 (admin), 8888888888 (subadmin) | OTP: 123456
app.use('/admin-auth', unifiedAdminAuthRoutes);

// Legacy Routes (keeping for backward compatibility)
app.use('/admin', adminRoutes);
app.use('/admin', adminUserManagementRoutes);
app.use('/admin', adminSubAdminManagementRoutes);
app.use('/admin/content-moderation', adminContentModerationRoutes);
app.use('/admin/analytics', adminAnalyticsRoutes);
app.use('/admin', adminUserCountRoutes);
app.use("/api/admin", adminUserRoutes);
app.use('/admin', adminUserStatisticsRoutes);

app.use('/subadmin', subAdminRoutes);
app.use('/subadmin', subAdminUserManagementRoutes);
app.use('/subadmin', subdminVerifiedUserRoutes);
app.use('/subadmin', subAdminUserStatisticsRoutes);

app.use('/admin', adminAssociateRoutes);


// Legacy User routes (keeping only non-conflicting routes)
app.use('/user/auth', userAuthRoutes);
app.use('/user/catalog', userCatalogRoutes);
app.use('/user/username', userUsernameRoutes);
app.use('/user/social', userSocialRoutes);
app.use('/user/message-requests', userMessageRequestRoutes);
app.use('/user/status', userStatusRoutes);
app.use('/user/upload', userFileUploadRoutes);
app.use('/user', deleteAccountRoutes);
app.use('/user/posts', postRoutes);
app.use('/user/stories', storyRoutes);
app.use('/user/dating', datingMediaRoutes);
app.use('/user/dating', datingProfileRoutes);
app.use('/user/dating', datingInteractionRoutes);
app.use('/user/dating/chats', datingChatRoutes); // Dating chat routes
app.use('/user/dating/messages', datingMessageRoutes); // Dating messages routes - must come after interaction routes
app.use('/user/dating/calls', datingCallRoutes); // Dating call routes

// Notification routes (new architecture)
const notificationRoutes = require('./notification/routes/notificationRoutes');
const notificationPreferencesRoutes = require('./notification/routes/notificationPreferencesRoutes');

// Debug middleware to log ALL requests to /api/notification (BEFORE routes)
app.use('/api/notification', (req, res, next) => {
	console.log('[APP] 🔍 Request to /api/notification:', {
		method: req.method,
		path: req.path,
		url: req.url,
		originalUrl: req.originalUrl,
		hasBody: !!req.body,
		bodyKeys: req.body ? Object.keys(req.body) : [],
		hasAuth: !!req.headers.authorization,
		authHeader: req.headers.authorization ? `${req.headers.authorization.substring(0, 30)}...` : 'MISSING'
	});
	console.log('[APP] 🔍 Will route to notificationRoutes with path:', req.path);
	next();
});

app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/notification-preferences', notificationPreferencesRoutes);
// Also register for /api/notification (without v1) for FCM token endpoints
app.use('/api/notification', notificationRoutes);

// // Device token routes for push notifications
// const deviceTokenRoutes = require('./user/auth/routes/deviceTokenRoutes');
// app.use('/api/v1/user/device-token', deviceTokenRoutes);

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

// Force HTTP for local development to avoid HTTPS issues
if (process.env.NODE_ENV === 'production') {
	server = createServer(app);
	console.log('🚀 Production mode - Using HTTP server (Render handles HTTPS)');
} else {
	// Local development - use HTTP for now (can enable HTTPS later)
	server = createServer(app);
	console.log('🌐 Local development - Using HTTP server');
	console.log('💡 To enable HTTPS: run mkcert localhost 127.0.0.1 and restart server');
}

// Initialize Socket.IO
const io = enhancedRealtimeService.init(server);

// Export both app, server, and io
module.exports = { app, server, io };




