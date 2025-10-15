const path = require('path');

// Load environment variables
// In production (Render), environment variables are provided directly
// In development, load from .env file
if (process.env.NODE_ENV !== 'production') {
    const envPath = path.resolve(__dirname, '..', '.env');
    console.log('🔧 Development mode - Loading .env from:', envPath);
    require('dotenv').config({ path: envPath });
} else {
    console.log('🚀 Production mode - Using Render environment variables');
}

const { server } = require('./app'); // Import server from app.js
const { connectToDatabase } = require('./dbConfig/db');

// Get port from environment variable (Render provides PORT automatically)
const PORT = process.env.PORT || 3000;
const SHUTDOWN_TIMEOUT = parseInt(process.env.SHUTDOWN_TIMEOUT) || 10000;

console.log('📋 Environment Configuration:');
console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
console.log(`   PORT: ${PORT}`);
console.log(`   SHUTDOWN_TIMEOUT: ${SHUTDOWN_TIMEOUT}ms`);
console.log(`   APP_URL: ${process.env.APP_URL || 'http://localhost:' + PORT}`);
console.log(`   HOST: 0.0.0.0 (allows external connections)`);
console.log('');

// Graceful shutdown handler
const gracefulShutdown = (signal) => {
	console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
	
	server.close((err) => {
		if (err) {
			console.error('❌ Error during server shutdown:', err);
			process.exit(1);
		}
		
		console.log('✅ Server closed successfully');
		process.exit(0);
	});
	
	// Force close after configured timeout
	setTimeout(() => {
		console.error('❌ Forced shutdown after timeout');
		process.exit(1);
	}, SHUTDOWN_TIMEOUT);
};

// Handle different termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
	console.error('❌ Uncaught Exception:', err);
	gracefulShutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
	console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
	gracefulShutdown('unhandledRejection');
});

(async () => {
	try {
		// Connect to database
		await connectToDatabase();
		console.log('✅ Database connected successfully');
		
		// Start server with error handling
		// Use localhost for development, 0.0.0.0 for production (Render)
		const host = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';
		
		server.listen(PORT, host, () => {
			console.log('🚀 VibgyorNode v2.0 Server Started!');
			console.log(`📡 Server running on: http://${host}:${PORT}`);
			console.log(`🔌 WebSocket available at: ws://${host}:${PORT}`);
			console.log(`📋 API Info: http://${host}:${PORT}/api/v1/info`);
			console.log(`❤️  Health Check: http://${host}:${PORT}/health`);
			console.log(`🌐 Local Access: http://localhost:${PORT}`);
			console.log('');
			console.log('🎯 Enhanced Features Available:');
			console.log('   • Real-time messaging with Socket.IO');
			console.log('   • Audio/Video calls with WebRTC');
			console.log('   • Enhanced UI with modern design');
			console.log('   • Performance optimizations');
			console.log('   • Comprehensive error handling');
			console.log('');
			console.log('🔑 Test with these phone numbers:');
			console.log('   • +1234567890 (Test User 1)');
			console.log('   • +1234567891 (Test User 2)');
			console.log('   • Password: password123');
			console.log('');
			console.log('💡 Use Ctrl+C to stop the server gracefully');
			
			// Verify server is listening (useful for Render debugging)
			console.log(`✅ Server successfully listening on port ${PORT}`);
		});
		
		// Handle server errors
		server.on('error', (err) => {
			if (err.code === 'EADDRINUSE') {
				console.error(`❌ Port ${PORT} is already in use!`);
				console.log('💡 Solutions:');
				console.log('   1. Kill the process using the port:');
				console.log(`      netstat -ano | findstr :${PORT}`);
				console.log('      taskkill /PID <PID> /F');
				console.log('   2. Or use the helper script: kill-port-3000.bat');
				console.log('   3. Or change the PORT in .env file');
			} else {
				console.error('❌ Server error:', err);
			}
			process.exit(1);
		});
		
	} catch (err) {
		console.error('❌ Failed to start server:', err?.message || err);
		process.exit(1);
	}
})();


