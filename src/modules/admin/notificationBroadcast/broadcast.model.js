const mongoose = require('mongoose');

const BroadcastSchema = new mongoose.Schema(
	{
		title: {
			type: String,
			required: true,
			trim: true,
			maxlength: 100,
		},
		message: {
			type: String,
			required: true,
			trim: true,
			maxlength: 500,
		},
		actionUrl: {
			type: String,
			trim: true,
			maxlength: 500,
			default: '',
		},
		filters: {
			isActive: { type: Boolean, default: true },
			verifiedOnly: { type: Boolean, default: false },
		},
		status: {
			type: String,
			enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
			default: 'pending',
			index: true,
		},
		createdBy: {
			type: mongoose.Schema.Types.ObjectId,
			required: true,
			refPath: 'createdByModel',
		},
		createdByModel: {
			type: String,
			enum: ['Admin', 'SubAdmin'],
			required: true,
		},
		createdByRole: {
			type: String,
			enum: ['admin', 'subadmin'],
			required: true,
		},
		stats: {
			totalRecipients: { type: Number, default: 0 },
			processed: { type: Number, default: 0 },
			succeeded: { type: Number, default: 0 },
			failed: { type: Number, default: 0 },
		},
		error: {
			type: String,
			default: '',
		},
		startedAt: { type: Date, default: null },
		completedAt: { type: Date, default: null },
	},
	{ timestamps: true }
);

BroadcastSchema.index({ createdAt: -1 });

module.exports = mongoose.model('NotificationBroadcast', BroadcastSchema);
