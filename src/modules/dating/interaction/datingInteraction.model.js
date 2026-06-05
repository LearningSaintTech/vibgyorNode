const mongoose = require('mongoose');

const DatingInteractionSchema = new mongoose.Schema(
	{
		user: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: true,
			index: true
		},
		targetUser: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: true,
			index: true
		},
		action: {
			type: String,
			enum: ['like', 'dislike'],
			required: true
		},
		comment: {
			text: { type: String, default: '' },
			createdAt: { type: Date, default: null }
		},
		status: {
			type: String,
			enum: ['pending', 'matched', 'dismissed'],
			default: 'pending'
		},
		matchedAt: {
			type: Date,
			default: null
		},
		isMatchNotified: {
			type: Boolean,
			default: false
		},
		metadata: {
			type: Map,
			of: mongoose.Schema.Types.Mixed,
			default: {}
		}
	},
	{ timestamps: true }
);

DatingInteractionSchema.index({ user: 1, targetUser: 1 }, { unique: true });

// CRITICAL: Compound indexes for dating queries (Phase 1 Optimization)
DatingInteractionSchema.index({ user: 1, targetUser: 1, action: 1 }); // Compound for interaction checks
DatingInteractionSchema.index({ targetUser: 1, action: 1 }); // "Liked you" queries
DatingInteractionSchema.index({ user: 1, action: 1, createdAt: -1 }); // User interaction history
DatingInteractionSchema.index({ targetUser: 1, action: 1, createdAt: -1 }); // "Liked you" with sorting
DatingInteractionSchema.index({ user: 1, status: 1 }); // Match status queries
DatingInteractionSchema.index({ targetUser: 1, action: 1, status: 1 }); // "Liked you" with status filter (for matched/unmatched likes)

const DatingInteraction =
	mongoose.models.DatingInteraction ||
	mongoose.model('DatingInteraction', DatingInteractionSchema);

module.exports = DatingInteraction;

