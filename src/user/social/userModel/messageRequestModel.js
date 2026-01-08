const mongoose = require('mongoose');

const MessageRequestSchema = new mongoose.Schema(
	{
		fromUserId: { 
			type: mongoose.Schema.Types.ObjectId, 
			ref: 'User', 
			required: true,
			index: true
		},
		toUserId: { 
			type: mongoose.Schema.Types.ObjectId, 
			ref: 'User', 
			required: true,
			index: true
		},
		status: { 
			type: String, 
			enum: ['pending', 'accepted', 'rejected', 'expired'], 
			default: 'pending',
			index: true
		},
		message: { 
			type: String, 
			default: '',
			maxlength: 500
		},
		// Request metadata
		requestedAt: { 
			type: Date, 
			default: Date.now 
		},
		respondedAt: { 
			type: Date, 
			default: null 
		},
		expiresAt: { 
			type: Date, 
			default: function() {
				// Request expires after 7 days
				return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
			}
		},
		// Response details
		responseMessage: { 
			type: String, 
			default: '' 
		},
		// Chat reference (created when accepted)
		chatId: { 
			type: mongoose.Schema.Types.ObjectId, 
			ref: 'Chat', 
			default: null 
		}
	},
	{ 
		timestamps: true,
		indexes: [
			{ fromUserId: 1, toUserId: 1 }, // For finding requests between users
			{ toUserId: 1, status: 1 }, // For getting pending requests for user
			{ status: 1, requestedAt: -1 }, // For filtering by status
			{ expiresAt: 1 } // For cleanup of expired requests
		]
	}
);

// Prevent duplicate requests
MessageRequestSchema.index({ fromUserId: 1, toUserId: 1 }, { unique: true });

// Virtual for request age
MessageRequestSchema.virtual('ageInHours').get(function() {
	return Math.floor((Date.now() - this.requestedAt.getTime()) / (1000 * 60 * 60));
});

// Virtual for time until expiry
MessageRequestSchema.virtual('timeUntilExpiry').get(function() {
	return Math.floor((this.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60));
});

// Method to check if request is expired
MessageRequestSchema.methods.isExpired = function() {
	return Date.now() > this.expiresAt.getTime();
};

// Method to accept request
MessageRequestSchema.methods.accept = async function(responseMessage = '') {
	const Chat = mongoose.model('Chat');
	const Message = mongoose.model('Message');
	
	this.status = 'accepted';
	this.respondedAt = new Date();
	this.responseMessage = responseMessage;
	
	// Create chat between users
	const chat = await Chat.findOrCreateChat(this.fromUserId, this.toUserId, this.fromUserId);
	
	// Update chat request status
	chat.requestStatus = 'accepted';
	chat.acceptedAt = new Date();
	await chat.save();
	
	this.chatId = chat._id;
	await this.save();
	
	// ALWAYS send initial message if one was included in the request
	// Extract and validate message from request
	const requestMessage = this.message ? String(this.message).trim() : '';
	
	if (requestMessage && requestMessage !== '') {
		try {
			console.log('[MESSAGE_REQUEST] Sending initial message from request:', {
				chatId: chat._id,
				senderId: this.fromUserId,
				toUserId: this.toUserId,
				messageLength: requestMessage.length,
				messagePreview: requestMessage.substring(0, 50) + (requestMessage.length > 50 ? '...' : ''),
				requestId: this._id
			});
			
			// Create the initial message from the request (MANDATORY: always send the message from the request)
			const initialMessage = new Message({
				chatId: chat._id,
				senderId: this.fromUserId,
				type: 'text',
				content: requestMessage,
				status: 'sent'
			});
			
			await initialMessage.save();
			console.log('[MESSAGE_REQUEST] Initial message saved:', { messageId: initialMessage._id });
			
			// Update chat's last message
			chat.lastMessage = initialMessage._id;
			chat.lastMessageAt = new Date();
			
			// Increment unread count for the recipient (toUserId) using chat method
			chat.incrementUnreadCount(this.toUserId);
			
			await chat.save();
			console.log('[MESSAGE_REQUEST] Chat updated with initial message');
			
			console.log('[MESSAGE_REQUEST] ✅ Initial message sent successfully:', {
				messageId: initialMessage._id,
				chatId: chat._id,
				senderId: this.fromUserId,
				toUserId: this.toUserId,
				contentLength: requestMessage.length
			});
		} catch (error) {
			console.error('[MESSAGE_REQUEST] ❌ Error sending initial message:', {
				error: error.message,
				stack: error.stack,
				chatId: chat._id,
				senderId: this.fromUserId,
				messageLength: requestMessage.length
			});
			// Don't fail the acceptance if message sending fails
			// The chat is already created, so continue
		}
	} else {
		console.log('[MESSAGE_REQUEST] No initial message to send (empty message in request):', {
			requestId: this._id,
			chatId: chat._id,
			hasMessage: !!this.message,
			messageValue: this.message
		});
	}
	
	return chat;
};

// Method to reject request
MessageRequestSchema.methods.reject = function(responseMessage = '') {
	this.status = 'rejected';
	this.respondedAt = new Date();
	this.responseMessage = responseMessage;
	return this.save();
};

// Method to expire request
MessageRequestSchema.methods.expire = function() {
	this.status = 'expired';
	this.respondedAt = new Date();
	return this.save();
};

// Static method to create message request
MessageRequestSchema.statics.createRequest = async function(fromUserId, toUserId, message = '') {
	const User = mongoose.model('User');
	
	// Check if users exist and are active
	const [fromUser, toUser] = await Promise.all([
		User.findById(fromUserId),
		User.findById(toUserId)
	]);
	
	if (!fromUser || !toUser) {
		throw new Error('One or both users not found');
	}
	
	if (!fromUser.isActive || !toUser.isActive) {
		throw new Error('Cannot send request to inactive users');
	}
	
	// Check if users are blocked
	if (fromUser.blockedUsers.includes(toUserId) || toUser.blockedUsers.includes(fromUserId)) {
		throw new Error('Cannot send request to blocked users');
	}
	
	// Check if request already exists
	const existingRequest = await this.findOne({
		fromUserId,
		toUserId,
		status: { $in: ['pending', 'accepted'] }
	});
	
	if (existingRequest) {
		if (existingRequest.status === 'accepted') {
			throw new Error('Chat already exists between these users');
		}
		throw new Error('Request already sent and pending');
	}
	
	// Create new request with message (always save message, even if empty)
	const messageText = message ? message.trim() : '';
	console.log('[MESSAGE_REQUEST] Creating request with message:', {
		fromUserId,
		toUserId,
		messageLength: messageText.length,
		hasMessage: messageText.length > 0
	});
	
	const request = await this.create({
		fromUserId,
		toUserId,
		message: messageText
	});
	
	console.log('[MESSAGE_REQUEST] Request created:', {
		requestId: request._id,
		savedMessage: request.message,
		messageLength: request.message?.length || 0
	});
	
	await request.populate([
		{ path: 'fromUserId', select: 'username fullName profilePictureUrl' },
		{ path: 'toUserId', select: 'username fullName profilePictureUrl' }
	]);
	
	return request;
};

// Static method to get pending requests for user
MessageRequestSchema.statics.getPendingRequests = async function(userId, page = 1, limit = 20) {
	const skip = (page - 1) * limit;
	
	const requests = await this.find({
		toUserId: userId,
		status: 'pending',
		expiresAt: { $gt: new Date() } // Not expired
	})
	.populate('fromUserId', 'username fullName profilePictureUrl verificationStatus')
	.sort({ requestedAt: -1 })
	.skip(skip)
	.limit(limit)
	.lean();
	
	return requests;
};

// Static method to get sent requests by user
MessageRequestSchema.statics.getSentRequests = async function(userId, page = 1, limit = 20) {
	const skip = (page - 1) * limit;
	
	const requests = await this.find({
		fromUserId: userId,
		status: { $in: ['pending', 'accepted', 'rejected'] }
	})
	.populate('toUserId', 'username fullName profilePictureUrl verificationStatus')
	.sort({ requestedAt: -1 })
	.skip(skip)
	.limit(limit)
	.lean();
	
	return requests;
};

// Static method to get request between two users
MessageRequestSchema.statics.getRequestBetweenUsers = async function(user1Id, user2Id) {
	return this.findOne({
		$or: [
			{ fromUserId: user1Id, toUserId: user2Id },
			{ fromUserId: user2Id, toUserId: user1Id }
		],
		status: { $in: ['pending', 'accepted'] }
	})
	.populate('fromUserId', 'username fullName profilePictureUrl')
	.populate('toUserId', 'username fullName profilePictureUrl');
};

// Static method to cleanup expired requests
MessageRequestSchema.statics.cleanupExpiredRequests = async function() {
	const result = await this.updateMany(
		{
			status: 'pending',
			expiresAt: { $lt: new Date() }
		},
		{
			status: 'expired',
			respondedAt: new Date()
		}
	);
	
	console.log(`[MESSAGE_REQUEST] Cleaned up ${result.modifiedCount} expired requests`);
	return result.modifiedCount;
};

// Static method to get request statistics
MessageRequestSchema.statics.getRequestStats = async function(userId) {
	const stats = await this.aggregate([
		{
			$match: {
				$or: [
					{ fromUserId: mongoose.Types.ObjectId(userId) },
					{ toUserId: mongoose.Types.ObjectId(userId) }
				]
			}
		},
		{
			$group: {
				_id: '$status',
				count: { $sum: 1 }
			}
		}
	]);
	
	const totalRequests = await this.countDocuments({
		$or: [
			{ fromUserId: userId },
			{ toUserId: userId }
		]
	});
	
	const pendingReceived = await this.countDocuments({
		toUserId: userId,
		status: 'pending',
		expiresAt: { $gt: new Date() }
	});
	
	return {
		totalRequests,
		pendingReceived,
		byStatus: stats.reduce((acc, stat) => {
			acc[stat._id] = stat.count;
			return acc;
		}, {})
	};
};

const MessageRequest = mongoose.models.MessageRequest || mongoose.model('MessageRequest', MessageRequestSchema);

module.exports = MessageRequest;
