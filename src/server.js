require('dotenv').config();
const { server } = require('./app'); // Import server from app.js
const { connectToDatabase } = require('./dbConfig/db');require('dotenv').config();
const PORT = process.env.PORT || 3000;
console.log("portt",PORT);

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
	
	// Force close after 10 seconds
	setTimeout(() => {
		console.error('❌ Forced shutdown after timeout');
		process.exit(1);
	}, 10000);
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
		server.listen(PORT, "0.0.0.0",() => {
			console.log('🚀 VibgyorNode v2.0 Server Started!');
			console.log(`📡 Server running on: http://localhost:${PORT}`);
			console.log(`🔌 WebSocket available at: ws://localhost:${PORT}`);
			console.log(`📋 API Info: http://localhost:${PORT}/api/v1/info`);
			console.log(`❤️  Health Check: http://localhost:${PORT}/health`);
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


