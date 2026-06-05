const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { createServer } = require('http');
const { createHttpsServer } = require('../https-setup');
const cookieParser = require('cookie-parser');

const {
	responseTime,
	compressionMiddleware,
	apiRateLimit,
	authRateLimit,
	messageWriteRateLimit
} = require('./middleware/performanceMiddleware');

const { encryptionMiddleware } = require('./middleware/encryptionMiddleware');
const enhancedRealtimeService = require('./services/enhancedRealtimeService');
const { registerRoutes } = require('./routes');

const app = express();

app.use(cookieParser());
app.use(helmet());

function corsOriginCallback() {
	const raw = process.env.CORS_ORIGIN;
	if (!raw || String(raw).trim() === '') {
		return (origin, callback) => callback(null, true);
	}
	const allowed = String(raw)
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean);
	return (origin, callback) => {
		if (!origin) {
			return callback(null, true);
		}
		if (allowed.includes(origin)) {
			return callback(null, true);
		}
		return callback(null, false);
	};
}

app.use(
	cors({
		origin: corsOriginCallback(),
		credentials: true
	})
);

app.use(compressionMiddleware);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(encryptionMiddleware);
app.use(responseTime);

if (process.env.ENABLE_API_RATE_LIMIT === 'true') {
	app.use('/api/v1', apiRateLimit);
	app.use('/user/auth', authRateLimit);
	app.use('/api/v1/user/messages', messageWriteRateLimit);
	app.use('/user/dating/messages', messageWriteRateLimit);
	console.log('✅ API rate limiting enabled (ENABLE_API_RATE_LIMIT=true)');
}

app.use('/api/v1', (req, res, next) => {
	req.apiVersion = 'v1';
	next();
});

registerRoutes(app);

app.get('/health', (req, res) => {
	res.status(200).json({
		status: 'ok',
		service: 'vibgyorNode',
		version: '2.0.0',
		timestamp: new Date().toISOString(),
		features: ['chat', 'calls', 'realtime', 'webrtc']
	});
});

app.get('/api/v1/metrics', (req, res) => {
	if (process.env.ENABLE_METRICS !== 'true') {
		return res.status(404).json({ error: 'Not found' });
	}
	const secret = process.env.METRICS_SECRET;
	if (secret && req.get('X-Metrics-Secret') !== secret) {
		return res.status(403).json({ error: 'Forbidden' });
	}
	res.status(200).json({
		uptimeSeconds: Math.round(process.uptime()),
		connectedUsers: enhancedRealtimeService.getConnectedUsersCount(),
		activeCalls: enhancedRealtimeService.getActiveCallsCount(),
		scopedPresence: enhancedRealtimeService.usesScopedPresence(),
		memory: process.memoryUsage(),
		timestamp: new Date().toISOString()
	});
});

app.get('/api/v1/info', (req, res) => {
	res.status(200).json({
		service: 'VibgyorNode API',
		version: '2.0.0',
		description: 'Enhanced chat and calling platform with WebRTC support',
		endpoints: {
			chats: '/api/v1/user/chats',
			messages: '/api/v1/user/messages',
			calls: '/api/v1/user/calls',
			geo: {
				reverse: '/api/v1/geo/reverse?lat=&lon=',
				search: '/api/v1/geo/search?q=',
			},
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

app.get('/', (req, res) => {
	res.json({
		message: 'VibgyorNode API v2.0 is running',
		version: '2.0.0',
		docs: '/api/v1/info',
		health: '/health'
	});
});

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

let server;
if (process.env.NODE_ENV === 'production') {
	server = createServer(app);
	console.log('🚀 Production mode - Using HTTP server (Render handles HTTPS)');
} else {
	server = createServer(app);
	console.log('🌐 Local development - Using HTTP server');
	console.log('💡 To enable HTTPS: run mkcert localhost 127.0.0.1 and restart server');
}

const io = enhancedRealtimeService.init(server);

module.exports = { app, server, io };
