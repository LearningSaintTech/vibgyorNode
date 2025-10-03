const mongoose = require('mongoose');

const UserStatusSchema = new mongoose.Schema(
	{
		userId: { 
			type: mongoose.Schema.Types.ObjectId, 
			ref: 'User', 
			required: true,
			unique: true,
			index: true
		},
		isOnline: { 
			type: Boolean, 
			default: false,
			index: true
		},
		lastSeen: { 
			type: Date, 
			default: Date.now,
			index: true
		},
		status: { 
			type: String, 
			default: '',
			maxlength: 100
		},
		// Connection details
		connectionId: { 
			type: String, 
			default: '' 
		},
		deviceInfo: {
			platform: { type: String, default: '' },
			browser: { type: String, default: '' },
			userAgent: { type: String, default: '' }
		},
		// Privacy settings
		privacySettings: {
			showOnlineStatus: { type: Boolean, default: true },
			showLastSeen: { type: Boolean, default: true },
			showTypingStatus: { type: Boolean, default: true }
		},
		// Activity tracking
		lastActivity: { 
			type: Date, 
			default: Date.now 
		},
		// Typing status for different chats
		typingIn: [{
			chatId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat' },
			startedAt: { type: Date, default: Date.now }
		}]
	},
	{ 
		timestamps: true,
		indexes: [
			{ userId: 1 }, // Primary lookup
			{ isOnline: 1 }, // For finding online users
			{ lastSeen: -1 }, // For sorting by last seen
			{ lastActivity: -1 } // For activity tracking
		]
	}
);

// Virtual for time since last seen
UserStatusSchema.virtual('timeSinceLastSeen').get(function() {
	const now = new Date();
	const diffMs = now - this.lastSeen;
	const diffMins = Math.floor(diffMs / (1000 * 60));
	const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
	const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
	
	if (diffMins < 1) return 'Just now';
	if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
	if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
	if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
	return 'Last seen recently';
});

// Method to set user online
UserStatusSchema.methods.setOnline = function(connectionId = '', deviceInfo = {}) {
	console.log(`[USER_STATUS] 🟢 Setting user ${this.userId} ONLINE`);
	this.isOnline = true;
	this.lastSeen = new Date();
	this.lastActivity = new Date();
	this.connectionId = connectionId;
	this.deviceInfo = { ...this.deviceInfo, ...deviceInfo };
	return this.save();
};

// Method to set user offline
UserStatusSchema.methods.setOffline = function() {
	console.log(`[USER_STATUS] 🔴 Setting user ${this.userId} OFFLINE`);
	this.isOnline = false;
	this.lastSeen = new Date();
	this.connectionId = '';
	this.typingIn = []; // Clear typing status
	return this.save();
};

// Method to update last activity
UserStatusSchema.methods.updateActivity = function() {
	this.lastActivity = new Date();
	if (!this.isOnline) {
		this.lastSeen = new Date();
	}
	return this.save();
};

// Method to start typing in chat
UserStatusSchema.methods.startTyping = function(chatId) {
	// Remove existing typing status for this chat
	this.typingIn = this.typingIn.filter(typing => 
		typing.chatId.toString() !== chatId.toString()
	);
	
	// Add new typing status
	this.typingIn.push({
		chatId,
		startedAt: new Date()
	});
	
	return this.save();
};

// Method to stop typing in chat
UserStatusSchema.methods.stopTyping = function(chatId) {
	this.typingIn = this.typingIn.filter(typing => 
		typing.chatId.toString() !== chatId.toString()
	);
	return this.save();
};

// Method to update status message
UserStatusSchema.methods.updateStatus = function(status) {
	this.status = status.substring(0, 100); // Limit to 100 characters
	this.lastActivity = new Date();
	return this.save();
};

// Method to update privacy settings
UserStatusSchema.methods.updatePrivacySettings = function(settings) {
	this.privacySettings = { ...this.privacySettings, ...settings };
	return this.save();
};

// Static method to get or create user status
UserStatusSchema.statics.getOrCreateUserStatus = async function(userId) {
	let userStatus = await this.findOne({ userId });
	
	if (!userStatus) {
		userStatus = await this.create({ userId });
	}
	
	return userStatus;
};

// Static method to get online users
UserStatusSchema.statics.getOnlineUsers = async function(userIds = [], limit = 50) {
	try {
		console.log('[USER_STATUS_MODEL] getOnlineUsers called with:', { userIds, limit });
		
		const query = { isOnline: true };
		
		if (userIds.length > 0) {
			query.userId = { $in: userIds };
		}
		
		console.log('[USER_STATUS_MODEL] Query:', query);
		
		const onlineUsers = await this.find(query)
			.populate('userId', 'username fullName profilePictureUrl')
			.sort({ lastActivity: -1 })
			.limit(limit)
			.lean();
		
		console.log('[USER_STATUS_MODEL] Found online users:', onlineUsers.length);
		return onlineUsers;
	} catch (error) {
		console.error('[USER_STATUS_MODEL] Error in getOnlineUsers:', error);
		throw error;
	}
};

// Static method to get user statuses for multiple users
UserStatusSchema.statics.getUserStatuses = async function(userIds) {
	const statuses = await this.find({ userId: { $in: userIds } })
		.populate('userId', 'username fullName profilePictureUrl')
		.lean();
	
	return statuses;
};

// Static method to get recently active users
UserStatusSchema.statics.getRecentlyActiveUsers = async function(hours = 24, limit = 100) {
	const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
	
	const activeUsers = await this.find({
		lastActivity: { $gte: cutoffTime }
	})
	.populate('userId', 'username fullName profilePictureUrl')
	.sort({ lastActivity: -1 })
	.limit(limit)
	.lean();
	
	return activeUsers;
};

// Static method to cleanup old typing statuses (older than 30 seconds)
UserStatusSchema.statics.cleanupTypingStatuses = async function() {
	const cutoffTime = new Date(Date.now() - 30 * 1000); // 30 seconds ago
	
	const result = await this.updateMany(
		{},
		{
			$pull: {
				typingIn: {
					startedAt: { $lt: cutoffTime }
				}
			}
		}
	);
	
	console.log(`[USER_STATUS] Cleaned up old typing statuses for ${result.modifiedCount} users`);
	return result.modifiedCount;
};

// Static method to get typing users in chat
UserStatusSchema.statics.getTypingUsersInChat = async function(chatId) {
	const typingUsers = await this.find({
		'typingIn.chatId': chatId,
		isOnline: true
	})
	.populate('userId', 'username fullName profilePictureUrl')
	.select('userId typingIn')
	.lean();
	
	return typingUsers.map(user => ({
		userId: user.userId,
		startedTyping: user.typingIn.find(typing => 
			typing.chatId.toString() === chatId.toString()
		)?.startedAt
	}));
};

// Static method to get status statistics
UserStatusSchema.statics.getStatusStats = async function() {
	const totalUsers = await this.countDocuments();
	const onlineUsers = await this.countDocuments({ isOnline: true });
	const recentlyActive = await this.countDocuments({
		lastActivity: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
	});
	
	return {
		totalUsers,
		onlineUsers,
		offlineUsers: totalUsers - onlineUsers,
		recentlyActive
	};
};

// Pre-save middleware to update lastActivity
UserStatusSchema.pre('save', function(next) {
	if (this.isModified() && !this.isModified('lastActivity')) {
		this.lastActivity = new Date();
	}
	next();
});

const UserStatus = mongoose.models.UserStatus || mongoose.model('UserStatus', UserStatusSchema);

module.exports = UserStatus;
