const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
	{
		phoneNumber: { type: String, required: true, unique: true, index: true },
		countryCode: { type: String, default: '+91' },
		email: { type: String, default: '' },
		emailVerified: { type: Boolean, default: false },
		username: { type: String, default: '', index: true },
		usernameNorm: { type: String, default: '' },
		fullName: { type: String, default: '' },
		dob: { type: Date, default: null },
		bio: { type: String, default: '' },
		gender: { type: String, default: '' },
	pronouns: { type: String, default: '' },
	likes: [{ type: String }],
	interests: [{ type: String }],
	preferences: {
		hereFor: { type: String, default: '' },
		wantToMeet: { type: String, default: '' },
		primaryLanguage: { type: String, default: '' },
		secondaryLanguage: { type: String, default: '' }
	},
	idProofUrl: { type: String, default: '' },
		profilePictureUrl: { type: String, default: '' },
		location: {
			lat: { type: Number, default: null },
			lng: { type: Number, default: null },
			city: { type: String, default: '' },
			country: { type: String, default: '' },
		},
		role: { type: String, default: 'user' },
		isProfileCompleted: { type: Boolean, default: false },
	profileCompletionStep: { 
		type: String, 
		enum: ['basic_info', 'gender', 'pronouns', 'likes_interests', 'preferences', 'location', 'completed'], 
		default: 'basic_info' 
	},
		isActive: { type: Boolean, default: true },
		// Verification Badge System
		verificationStatus: { 
			type: String, 
			enum: ['none', 'pending', 'approved', 'rejected'], 
			default: 'none' 
		},
		verificationDocument: {
			documentType: { type: String, default: '' }, // 'id_proof', 'passport', 'driving_license', 'aadhaar', etc.
			documentUrl: { type: String, default: '' }, // Primary/first document URL (for backward compatibility)
			documentUrls: [{ type: String }], // Array of all document URLs (for multiple files like Aadhaar front & back)
			documentNumber: { type: String, default: '' },
			uploadedAt: { type: Date, default: null },
			reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
			reviewedAt: { type: Date, default: null },
			rejectionReason: { type: String, default: '' },
			reviewerRole: { type: String, enum: ['admin', 'subadmin'], default: null }
		},
		// Social Media Features
		following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
		followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
		closeFriends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
		blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
		blockedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
		savedPosts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post', index: true }],
	privacySettings: {
		isPrivate: { type: Boolean, default: false },
		allowFollowRequests: { type: Boolean, default: true },
		showOnlineStatus: { type: Boolean, default: true },
		allowMessages: { type: String, enum: ['everyone', 'followers', 'none'], default: 'followers' },
		allowCommenting: { type: Boolean, default: true },
		allowTagging: { type: Boolean, default: true },
		allowStoriesSharing: { type: Boolean, default: true }
	},
		// Dating Profile Features
		dating: {
			photos: [{
				url: { type: String, default: '' },
				thumbnailUrl: { type: String, default: '' },
				blurhash: { type: String, default: null }, // BlurHash for instant placeholders
				responsiveUrls: { type: mongoose.Schema.Types.Mixed, default: null }, // Multiple sizes (thumbnail, small, medium, large, original)
				order: { type: Number, default: 0 },
				uploadedAt: { type: Date, default: Date.now }
			}],
			videos: [{
				url: { type: String, default: '' },
				thumbnailUrl: { type: String, default: '' },
				blurhash: { type: String, default: null }, // BlurHash for video thumbnail (if thumbnail is an image)
				duration: { type: Number, default: 0 }, // in seconds
				order: { type: Number, default: 0 },
				uploadedAt: { type: Date, default: Date.now }
			}],
			isDatingProfileActive: { type: Boolean, default: false },
			preferences: {
				hereTo: { type: String, default: '' },
				wantToMeet: { type: String, default: '' },
				ageRange: {
					min: { type: Number, default: 18 },
					max: { type: Number, default: 100 }
				},
				languages: [{ type: String }],
				location: {
					city: { type: String, default: '' },
					country: { type: String, default: '' },
					coordinates: {
						lat: { type: Number, default: null },
						lng: { type: Number, default: null }
					}
				},
				distanceRange: {
					min: { type: Number, default: 0 },
					max: { type: Number, default: 100 }
				}
			},
			lastUpdatedAt: { type: Date, default: null }
		},
		// phone OTP
		otpCode: { type: String, default: null },
		otpExpiresAt: { type: Date, default: null },
		lastOtpSentAt: { type: Date, default: null },
		// email OTP
		emailOtpCode: { type: String, default: null },
		emailOtpExpiresAt: { type: Date, default: null },
		lastEmailOtpSentAt: { type: Date, default: null },
		lastLoginAt: { type: Date, default: null },
		// Device tokens for push notifications
		deviceTokens: [{
			token: {
				type: String,
				required: true,
				index: true
			},
			platform: {
				type: String,
				enum: ['ios', 'android', 'web'],
				required: true
			},
			deviceId: {
				type: String,
				default: ''
			},
			deviceName: {
				type: String,
				default: ''
			},
			appVersion: {
				type: String,
				default: ''
			},
			isActive: {
				type: Boolean,
				default: true
			},
			lastUsedAt: {
				type: Date,
				default: Date.now
			},
			createdAt: {
				type: Date,
				default: Date.now
			}
		}],
	},
	{ timestamps: true }
);

UserSchema.methods.maskedPhone = function maskedPhone() {
	const pn = this.phoneNumber || '';
	if (pn.length < 4) return pn;
	return `${'*'.repeat(Math.max(0, pn.length - 4))}${pn.slice(-4)}`;
};

// Pre-save validation for dating profile
UserSchema.pre('save', function(next) {
	// Validate dating photos and videos limits
	if (this.dating) {
		if (this.dating.photos && this.dating.photos.length > 5) {
			return next(new Error('Maximum 5 photos allowed for dating profile'));
		}
		if (this.dating.videos && this.dating.videos.length > 5) {
			return next(new Error('Maximum 5 videos allowed for dating profile'));
		}
	}
	next();
});

// Profile completion step validation
UserSchema.methods.getNextProfileStep = function getNextProfileStep() {
	console.log("3333333333333333333333333333333")
	// Removed 'id_upload' from required steps - it's optional and not required for profile completion
	const steps = ['basic_info', 'gender', 'pronouns', 'likes_interests', 'preferences', 'location', 'completed'];
	const currentStepIndex = steps.indexOf(this.profileCompletionStep);
	console.log("4444444444444444444444444444444", currentStepIndex);
	
	// Check if current step is completed
	if (this.isStepCompleted(this.profileCompletionStep)) {
		// Move to next step
		console.log("5555555555555555555555555555555");
		const nextStepIndex = currentStepIndex + 1;
		if (nextStepIndex < steps.length) {
			return steps[nextStepIndex];
		}
		return 'completed';
	}
	console.log("6666666666666666666666666666666");
	// Current step is not completed, return current step
	return this.profileCompletionStep;
};

UserSchema.methods.isStepCompleted = function isStepCompleted(step) {
	console.log("7777777777777777777777777777777", step);
	switch (step) {
		case 'basic_info':
			return !!(this.fullName && this.username && this.email && this.dob && this.bio);
		case 'gender':
			return !!(this.gender);
		case 'pronouns':
			return !!(this.pronouns);
		case 'likes_interests':
			return !!(this.likes && this.likes.length > 0 && this.interests && this.interests.length > 0);
		case 'preferences':
			return !!(this.preferences && this.preferences.hereFor && this.preferences.primaryLanguage);
		case 'location':
			return !!(this.location && this.location.city && this.location.country);
		case 'id_upload':
			// ID upload is optional - always return true so it doesn't block profile completion
			return true;
		case 'completed':
			return this.isProfileCompleted;
		default:
			return false;
	}
};

UserSchema.methods.updateProfileStep = function updateProfileStep() {
	console.log("8888888888888888888888888888888");
	const nextStep = this.getNextProfileStep();
	this.profileCompletionStep = nextStep;
	
	// If all steps are completed, mark profile as completed
	if (nextStep === 'completed') {
		this.isProfileCompleted = true;
	}
	console.log("9999999999999999999999999999999");
	return nextStep;
};

// Device token methods for push notifications
UserSchema.methods.addDeviceToken = async function addDeviceToken(token, platform, deviceInfo = {}) {
	console.log('[USER MODEL] 🔔 addDeviceToken called:', {
		userId: this._id,
		token: token ? `${token.substring(0, 20)}...` : 'MISSING',
		platform,
		deviceInfo,
		currentTokensCount: this.deviceTokens?.length || 0
	});
	
	// Remove existing token if present
	const beforeFilter = this.deviceTokens?.length || 0;
	this.deviceTokens = this.deviceTokens.filter(
		dt => dt.token !== token
	);
	const afterFilter = this.deviceTokens?.length || 0;
	console.log('[USER MODEL] 🔍 Filtered existing tokens:', { beforeFilter, afterFilter, removed: beforeFilter - afterFilter });
	
	// Add new token
	const newToken = {
		token,
		platform,
		deviceId: deviceInfo.deviceId || '',
		deviceName: deviceInfo.deviceName || '',
		appVersion: deviceInfo.appVersion || '',
		isActive: true,
		lastUsedAt: new Date(),
		createdAt: new Date()
	};
	
	this.deviceTokens.push(newToken);
	console.log('[USER MODEL] ➕ Added new token to array. Total tokens now:', this.deviceTokens.length);
	console.log('[USER MODEL] 💾 Calling save()...');
	
	try {
		const savedUser = await this.save();
		console.log('[USER MODEL] ✅ Save successful!');
		console.log('[USER MODEL] 📊 Saved user deviceTokens count:', savedUser.deviceTokens?.length || 0);
		console.log('[USER MODEL] 📋 Saved tokens:', savedUser.deviceTokens?.map(dt => ({
			token: dt.token ? `${dt.token.substring(0, 20)}...` : 'MISSING',
			platform: dt.platform,
			isActive: dt.isActive
		})) || []);
		return savedUser;
	} catch (saveError) {
		console.error('[USER MODEL] ❌ Save failed:', saveError);
		console.error('[USER MODEL] ❌ Save error name:', saveError.name);
		console.error('[USER MODEL] ❌ Save error message:', saveError.message);
		console.error('[USER MODEL] ❌ Save error stack:', saveError.stack);
		throw saveError;
	}
};

UserSchema.methods.removeDeviceToken = async function removeDeviceToken(token) {
	this.deviceTokens = this.deviceTokens.filter(
		dt => dt.token !== token
	);
	return this.save();
};

UserSchema.methods.getActiveDeviceTokens = function getActiveDeviceTokens(platform = null) {
	let tokens = this.deviceTokens.filter(dt => dt.isActive);
	
	if (platform) {
		tokens = tokens.filter(dt => dt.platform === platform);
	}
	
	return tokens.map(dt => ({
		token: dt.token,
		platform: dt.platform
	}));
};

// Dating profile methods
UserSchema.methods.addDatingPhoto = async function addDatingPhoto(photoData) {
	if (!this.dating) {
		this.dating = {
			photos: [],
			videos: [],
			isDatingProfileActive: false,
			lastUpdatedAt: null
		};
	}
	
	// Validate max 5 photos
	if (this.dating.photos.length >= 5) {
		throw new Error('Maximum 5 photos allowed for dating profile');
	}
	
	// Add order if not provided
	const order = photoData.order !== undefined ? photoData.order : this.dating.photos.length;
	
	this.dating.photos.push({
		url: photoData.url || '',
		thumbnailUrl: photoData.thumbnailUrl || photoData.url || '',
		blurhash: photoData.blurhash || null,
		responsiveUrls: photoData.responsiveUrls || null,
		order: order,
		uploadedAt: new Date()
	});
	
	this.dating.lastUpdatedAt = new Date();
	return this.save();
};

UserSchema.methods.removeDatingPhoto = async function removeDatingPhoto(photoIndex) {
	if (!this.dating || !this.dating.photos || photoIndex < 0 || photoIndex >= this.dating.photos.length) {
		throw new Error('Invalid photo index');
	}
	
	this.dating.photos.splice(photoIndex, 1);
	this.dating.lastUpdatedAt = new Date();
	return this.save();
};

UserSchema.methods.updateDatingPhotoOrder = async function updateDatingPhotoOrder(photoIndex, newOrder) {
	if (!this.dating || !this.dating.photos || photoIndex < 0 || photoIndex >= this.dating.photos.length) {
		throw new Error('Invalid photo index');
	}
	
	this.dating.photos[photoIndex].order = newOrder;
	this.dating.lastUpdatedAt = new Date();
	return this.save();
};

UserSchema.methods.addDatingVideo = async function addDatingVideo(videoData) {
	if (!this.dating) {
		this.dating = {
			photos: [],
			videos: [],
			isDatingProfileActive: false,
			lastUpdatedAt: null
		};
	}
	
	// Validate max 5 videos
	if (this.dating.videos.length >= 5) {
		throw new Error('Maximum 5 videos allowed for dating profile');
	}
	
	// Add order if not provided
	const order = videoData.order !== undefined ? videoData.order : this.dating.videos.length;
	
	this.dating.videos.push({
		url: videoData.url || '',
		thumbnailUrl: videoData.thumbnailUrl || '',
		duration: videoData.duration || 0,
		order: order,
		uploadedAt: new Date()
	});
	
	this.dating.lastUpdatedAt = new Date();
	return this.save();
};

UserSchema.methods.removeDatingVideo = async function removeDatingVideo(videoIndex) {
	if (!this.dating || !this.dating.videos || videoIndex < 0 || videoIndex >= this.dating.videos.length) {
		throw new Error('Invalid video index');
	}
	
	this.dating.videos.splice(videoIndex, 1);
	this.dating.lastUpdatedAt = new Date();
	return this.save();
};

UserSchema.methods.updateDatingVideoOrder = async function updateDatingVideoOrder(videoIndex, newOrder) {
	if (!this.dating || !this.dating.videos || videoIndex < 0 || videoIndex >= this.dating.videos.length) {
		throw new Error('Invalid video index');
	}
	
	this.dating.videos[videoIndex].order = newOrder;
	this.dating.lastUpdatedAt = new Date();
	return this.save();
};

UserSchema.methods.toggleDatingProfile = async function toggleDatingProfile(isActive) {
	if (!this.dating) {
		this.dating = {
			photos: [],
			videos: [],
			isDatingProfileActive: false,
			lastUpdatedAt: null
		};
	}
	
	this.dating.isDatingProfileActive = isActive !== undefined ? isActive : !this.dating.isDatingProfileActive;
	this.dating.lastUpdatedAt = new Date();
	return this.save();
};

UserSchema.methods.getDatingProfile = function getDatingProfile() {
	if (!this.dating) {
		return {
			photos: [],
			videos: [],
			isDatingProfileActive: false,
			lastUpdatedAt: null
		};
	}
	
	// Sort photos and videos by order
	const sortedPhotos = [...this.dating.photos].sort((a, b) => a.order - b.order);
	const sortedVideos = [...this.dating.videos].sort((a, b) => a.order - b.order);
	
	return {
		photos: sortedPhotos,
		videos: sortedVideos,
		isDatingProfileActive: this.dating.isDatingProfileActive || false,
		lastUpdatedAt: this.dating.lastUpdatedAt
	};
};

const User = mongoose.models.User || mongoose.model('User', UserSchema);

// Ensure unique index on normalized username (optional when empty)
UserSchema.index({ usernameNorm: 1 }, { unique: true, partialFilterExpression: { usernameNorm: { $type: 'string', $ne: '' } } });

// CRITICAL: Performance indexes for dating and social queries (Phase 1 Optimization)
UserSchema.index({ 'dating.isDatingProfileActive': 1, isActive: 1 }); // Dating profile queries
UserSchema.index({ 'location.coordinates': '2dsphere' }); // Geospatial for distance-based queries
UserSchema.index({ fullName: 'text', username: 'text' }); // Text search index
UserSchema.index({ dob: 1 }); // Age filtering for dating
UserSchema.index({ gender: 1, 'dating.isDatingProfileActive': 1 }); // Gender + dating filter
UserSchema.index({ isActive: 1, 'dating.isDatingProfileActive': 1 }); // Active dating profiles
UserSchema.index({ 'preferences.hereFor': 1, 'dating.isDatingProfileActive': 1 }); // HereTo filter
UserSchema.index({ 'location.city': 1, 'location.country': 1 }); // Location search
UserSchema.index({ createdAt: -1 }); // New user sorting

module.exports = User;


