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
			documentType: { type: String, default: '' }, // 'id_proof', 'passport', 'driving_license', etc.
			documentUrl: { type: String, default: '' },
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
		privacySettings: {
			isPrivate: { type: Boolean, default: false },
			allowFollowRequests: { type: Boolean, default: true },
			showOnlineStatus: { type: Boolean, default: true },
			allowMessages: { type: String, enum: ['everyone', 'followers', 'none'], default: 'followers' }
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
	},
	{ timestamps: true }
);

UserSchema.methods.maskedPhone = function maskedPhone() {
	const pn = this.phoneNumber || '';
	if (pn.length < 4) return pn;
	return `${'*'.repeat(Math.max(0, pn.length - 4))}${pn.slice(-4)}`;
};

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

const User = mongoose.models.User || mongoose.model('User', UserSchema);

// Ensure unique index on normalized username (optional when empty)
UserSchema.index({ usernameNorm: 1 }, { unique: true, partialFilterExpression: { usernameNorm: { $type: 'string', $ne: '' } } });

module.exports = User;


