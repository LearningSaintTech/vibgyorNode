const mongoose = require('mongoose');

const SubAdminSchema = new mongoose.Schema(
	{
		phoneNumber: { type: String, required: true, unique: true, index: true },
		countryCode: { type: String, default: '+91' },
		name: { type: String, default: '' },
		email: { type: String, default: '' },
		avatarUrl: { type: String, default: '' },
		isProfileCompleted: { type: Boolean, default: false },
		role: { type: String, default: 'subadmin' },
		gender: { type: String, enum: ['Male', 'Female', 'Other'], default: 'Male' },
		dateOfBirth: { type: Date, default: null },
		address: {
			type: String,
			default: ''
		},
		location: {
			city: { type: String, default: '' },
			state: { type: String, default: '' },
			country: { type: String, default: '' }
		},
		pinCode: {
			type: String,
			default: ''
		},

		isProfileCompleted: {
			type: Boolean,
			default: false
		},
		isVerified: { type: Boolean, default: false },
		isActive: { type: Boolean, default: false }, // Changed to false - needs admin approval
		approvalStatus: {
			type: String,
			enum: ['pending', 'approved', 'rejected'],
			default: 'pending'
		},
		approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
		approvedAt: { type: Date, default: null },
		rejectedAt: { type: Date, default: null },
		rejectionReason: { type: String, default: '' },
		// OTP fields (kept for parity with admin flow)
		otpCode: { type: String, default: null },
		otpExpiresAt: { type: Date, default: null },
		lastOtpSentAt: { type: Date, default: null },
		// 2Factor API session ID
		twoFactorSessionId: { type: String, default: null },
		lastLoginAt: { type: Date, default: null },
	},

	{ timestamps: true }
);

SubAdminSchema.methods.maskedPhone = function maskedPhone() {
	const pn = this.phoneNumber || '';
	if (pn.length < 4) return pn;
	return `${'*'.repeat(Math.max(0, pn.length - 4))}${pn.slice(-4)}`;
};

const SubAdmin = mongoose.models.SubAdmin || mongoose.model('SubAdmin', SubAdminSchema);

module.exports = SubAdmin;


