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
			{ fromUserId: 1, toUserId: 1, unique: true }, // For finding requests between users, prevent duplicates
			{ toUserId: 1, status: 1 }, // For getting pending requests for user
			{ status: 1, requestedAt: -1 }, // For filtering by status
			{ expiresAt: 1 } // For cleanup of expired requests
		]
	}
);

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

// Method to accept request - optimized with transaction for atomicity
MessageRequestSchema.methods.accept = async function(responseMessage = '') {
	const Chat = mongoose.model('Chat');
	const Message = mongoose.model('Message');
	const session = await mongoose.startSession();
	let chatId = null;
	
	try {
		await session.withTransaction(async () => {
			// Update request status
			this.status = 'accepted';
			this.respondedAt = new Date();
			this.responseMessage = responseMessage;
			
			// Create chat between users (pass session for transaction)
			const chat = await Chat.findOrCreateChat(this.fromUserId, this.toUserId, this.fromUserId, session);
			this.chatId = chat._id;
			chatId = chat._id;
			
			// Update chat request status if fields exist
			if (chat.requestStatus !== undefined) {
				chat.requestStatus = 'accepted';
			}
			if (chat.acceptedAt !== undefined) {
				chat.acceptedAt = new Date();
			}
			
			// Save request and chat in transaction
			await Promise.all([
				this.save({ session }),
				chat.save({ session })
			]);
			
			// ALWAYS send initial message if one was included in the request
			const requestMessage = this.message ? String(this.message).trim() : '';
			
			if (requestMessage && requestMessage !== '') {
				try {
					// Create the initial message from the request
					const initialMessage = new Message({
						chatId: chat._id,
						senderId: this.fromUserId,
						type: 'text',
						content: requestMessage,
						status: 'sent'
					});
					
					await initialMessage.save({ session });
					
					// Convert toUserId to ObjectId for consistency
					const toUserIdObj = mongoose.Types.ObjectId.isValid(this.toUserId) ? new mongoose.Types.ObjectId(this.toUserId) : this.toUserId;
					
					// Update chat's last message and increment unread count atomically
					await chat.constructor.updateOne(
						{ _id: chat._id, 'userSettings.userId': toUserIdObj },
						{
							$set: {
								lastMessage: initialMessage._id,
								lastMessageAt: new Date()
							},
							$inc: { 'userSettings.$.unreadCount': 1 }
						},
						{ session }
					);
					
					// Update local instance
					chat.lastMessage = initialMessage._id;
					chat.lastMessageAt = new Date();
					const toUserIdStr = toUserIdObj.toString();
					const userSetting = chat.userSettings.find(
						setting => setting.userId && setting.userId.toString() === toUserIdStr
					);
					if (userSetting) {
						userSetting.unreadCount = (userSetting.unreadCount || 0) + 1;
					}
				} catch (error) {
					// Don't fail the acceptance if message sending fails
					// The chat is already created, so continue without aborting transaction
					// Error is non-fatal - chat creation succeeded, message sending failed
					// Could log to proper logging service if needed
				}
			}
		});
		
		// Fetch and return the chat after transaction
		const chat = await Chat.findById(chatId || this.chatId);
		return chat;
	} catch (error) {
		throw new Error(`Failed to accept message request: ${error.message}`);
	} finally {
		await session.endSession();
	}
};

// Method to reject request - optimized with atomic update
MessageRequestSchema.methods.reject = async function(responseMessage = '') {
	await this.constructor.updateOne(
		{ _id: this._id },
		{
			$set: {
				status: 'rejected',
				respondedAt: new Date(),
				responseMessage: responseMessage
			}
		}
	);
	// Update local instance
	this.status = 'rejected';
	this.respondedAt = new Date();
	this.responseMessage = responseMessage;
	return this;
};

// Method to expire request - optimized with atomic update
MessageRequestSchema.methods.expire = async function() {
	await this.constructor.updateOne(
		{ _id: this._id },
		{
			$set: {
				status: 'expired',
				respondedAt: new Date()
			}
		}
	);
	// Update local instance
	this.status = 'expired';
	this.respondedAt = new Date();
	return this;
};

// Static method to create message request - optimized with projection
MessageRequestSchema.statics.createRequest = async function(fromUserId, toUserId, message = '') {
	const User = mongoose.model('User');
	
	// Check if users exist and are active - use projection to fetch only needed fields
	const [fromUser, toUser] = await Promise.all([
		User.findById(fromUserId).select('isActive blockedUsers').lean(),
		User.findById(toUserId).select('isActive blockedUsers').lean()
	]);
	
	if (!fromUser || !toUser) {
		throw new Error('One or both users not found');
	}
	
	if (!fromUser.isActive || !toUser.isActive) {
		throw new Error('Cannot send request to inactive users');
	}
	
	// Check if users are blocked - use Set for O(1) lookup
	const fromUserBlockedSet = new Set((fromUser.blockedUsers || []).map(id => id.toString()));
	const toUserBlockedSet = new Set((toUser.blockedUsers || []).map(id => id.toString()));
	const fromUserIdStr = fromUserId.toString();
	const toUserIdStr = toUserId.toString();
	
	if (fromUserBlockedSet.has(toUserIdStr) || toUserBlockedSet.has(fromUserIdStr)) {
		throw new Error('Cannot send request to blocked users');
	}
	
	// Check if request already exists - convert to ObjectId for consistency
	const fromUserIdObj = mongoose.Types.ObjectId.isValid(fromUserId) ? new mongoose.Types.ObjectId(fromUserId) : fromUserId;
	const toUserIdObj = mongoose.Types.ObjectId.isValid(toUserId) ? new mongoose.Types.ObjectId(toUserId) : toUserId;
	
	const existingRequest = await this.findOne({
		fromUserId: fromUserIdObj,
		toUserId: toUserIdObj,
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
	
	const request = await this.create({
		fromUserId: fromUserIdObj,
		toUserId: toUserIdObj,
		message: messageText
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
	
	// Convert to ObjectId for consistency
	const userIdObj = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
	
	const requests = await this.find({
		toUserId: userIdObj,
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
	
	// Convert to ObjectId for consistency
	const userIdObj = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
	
	const requests = await this.find({
		fromUserId: userIdObj,
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
	// Convert to ObjectId for consistency
	const user1IdObj = mongoose.Types.ObjectId.isValid(user1Id) ? new mongoose.Types.ObjectId(user1Id) : user1Id;
	const user2IdObj = mongoose.Types.ObjectId.isValid(user2Id) ? new mongoose.Types.ObjectId(user2Id) : user2Id;
	
	return this.findOne({
		$or: [
			{ fromUserId: user1IdObj, toUserId: user2IdObj },
			{ fromUserId: user2IdObj, toUserId: user1IdObj }
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
	
	return result.modifiedCount;
};

// Static method to get request statistics - optimized single aggregation
MessageRequestSchema.statics.getRequestStats = async function(userId) {
	const userIdObj = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
	
	// Combine all stats into single aggregation pipeline
	const [statsResult] = await this.aggregate([
		{
			$match: {
				$or: [
					{ fromUserId: userIdObj },
					{ toUserId: userIdObj }
				]
			}
		},
		{
			$facet: {
				byStatus: [
					{
						$group: {
							_id: '$status',
							count: { $sum: 1 }
						}
					}
				],
				totalCount: [
					{ $count: 'total' }
				],
				pendingReceived: [
					{
						$match: {
							toUserId: userIdObj,
							status: 'pending',
							expiresAt: { $gt: new Date() }
						}
					},
					{ $count: 'count' }
				]
			}
		}
	]);
	
	return {
		totalRequests: statsResult?.totalCount[0]?.total || 0,
		pendingReceived: statsResult?.pendingReceived[0]?.count || 0,
		byStatus: (statsResult?.byStatus || []).reduce((acc, stat) => {
			acc[stat._id] = stat.count;
			return acc;
		}, {})
	};
};

const MessageRequest = mongoose.models.MessageRequest || mongoose.model('MessageRequest', MessageRequestSchema);

module.exports = MessageRequest;
