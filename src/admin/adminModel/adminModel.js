const mongoose = require('mongoose');

const AdminSchema = new mongoose.Schema(
	{
		phoneNumber: { type: String, required: true, unique: true, index: true },
		countryCode: { type: String, default: '+91' },
		firstName: { type: String, default: '' },
		lastName: { type: String, default: '' },
		email: { type: String, default: '' },
		avatarUrl: { type: String, default: '' },
		role: { type: String, default: 'admin' },

		isVerified: { type: Boolean, default: false },
		// OTP flow
		gender: { type: String, enum: ['Male', 'Female', 'Other'], default: 'Male' },
		dateOfBirth: { type: Date, default: null },
		address: {
			type: String,
			default: ''
		},
		city: {
			type: String,
			default: ''
		},
		state: {
			type: String,
			default: ''
		},
		pinCode: {
			type: String,
			default: ''
		},

		isProfileCompleted: {
			type: Boolean,
			default: false
		},
		otpCode: { type: String, default: null },
		otpExpiresAt: { type: Date, default: null },
		lastOtpSentAt: { type: Date, default: null },
		// 2Factor API session ID
		twoFactorSessionId: { type: String, default: null },
		// Session meta
		lastLoginAt: { type: Date, default: null },
	},
	{ timestamps: true }
);

AdminSchema.methods.maskedPhone = function maskedPhone() {
	const pn = this.phoneNumber || '';
	if (pn.length < 4) return pn;
	return `${'*'.repeat(Math.max(0, pn.length - 4))}${pn.slice(-4)}`;
};

const Admin = mongoose.models.Admin || mongoose.model('Admin', AdminSchema);

module.exports = Admin;


