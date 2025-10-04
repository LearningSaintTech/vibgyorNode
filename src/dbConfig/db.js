const mongoose = require('mongoose');

const DEFAULT_URI = 'mongodb://localhost:27017/';

const getMongoUri = () => process.env.MONGODB_URI || DEFAULT_URI;

let isConnected = false;

async function connectToDatabase() {
	if (isConnected) return mongoose.connection;

	const mongoUri = getMongoUri();

	mongoose.connection.on('connected', () => {
		// eslint-disable-next-line no-console
		console.log('MongoDB connected');
		isConnected = true;
	});

	mongoose.connection.on('error', (err) => {
		// eslint-disable-next-line no-console
		console.error('MongoDB connection error:', err?.message || err);
	});

	mongoose.connection.on('disconnected', () => {
		// eslint-disable-next-line no-console
		console.log('MongoDB disconnected');
		isConnected = false;
	});

	await mongoose.connect(mongoUri);
	return mongoose.connection;
}

async function disconnectFromDatabase() {
	if (!isConnected) return;
	await mongoose.disconnect();
	isConnected = false;
}

module.exports = {
	connectToDatabase,
	disconnectFromDatabase,
};


