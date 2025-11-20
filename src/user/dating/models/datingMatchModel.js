const mongoose = require('mongoose');

function sortUserIds(userId1, userId2) {
	const a = userId1.toString();
	const b = userId2.toString();
	return a < b ? [userId1, userId2] : [userId2, userId1];
}

const DatingMatchSchema = new mongoose.Schema(
	{
		userA: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: true,
			index: true
		},
		userB: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: true,
			index: true
		},
		status: {
			type: String,
			enum: ['active', 'blocked', 'ended'],
			default: 'active'
		},
		matchedBy: {
			type: String,
			enum: ['mutual_like', 'manual'],
			default: 'mutual_like'
		},
		lastInteractionAt: {
			type: Date,
			default: Date.now
		},
		metadata: {
			type: Map,
			of: mongoose.Schema.Types.Mixed,
			default: {}
		}
	},
	{ timestamps: true }
);

DatingMatchSchema.index({ userA: 1, userB: 1 }, { unique: true });

DatingMatchSchema.statics.createOrGetMatch = async function(userId1, userId2) {
	const [sortedA, sortedB] = sortUserIds(userId1, userId2);

	let match = await this.findOne({ userA: sortedA, userB: sortedB });
	if (match) {
		if (match.status !== 'active') {
			match.status = 'active';
			match.lastInteractionAt = new Date();
			await match.save();
		}
		return match;
	}

	match = await this.create({
		userA: sortedA,
		userB: sortedB,
		status: 'active',
		matchedBy: 'mutual_like',
		lastInteractionAt: new Date()
	});

	return match;
};

DatingMatchSchema.statics.endMatch = async function(userId1, userId2, reason = 'ended') {
	const [sortedA, sortedB] = sortUserIds(userId1, userId2);
	const match = await this.findOne({ userA: sortedA, userB: sortedB });
	if (match) {
		match.status = reason === 'blocked' ? 'blocked' : 'ended';
		match.metadata.set('endedReason', reason);
		match.lastInteractionAt = new Date();
		await match.save();
	}
	return match;
};

const DatingMatch = mongoose.models.DatingMatch || mongoose.model('DatingMatch', DatingMatchSchema);

module.exports = DatingMatch;

