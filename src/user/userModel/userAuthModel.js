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

const User = mongoose.models.User || mongoose.model('User', UserSchema);

// Ensure unique index on normalized username (optional when empty)
UserSchema.index({ usernameNorm: 1 }, { unique: true, partialFilterExpression: { usernameNorm: { $type: 'string', $ne: '' } } });

module.exports = User;


