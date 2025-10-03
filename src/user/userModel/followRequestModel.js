const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const followRequestSchema = new Schema({
	requester: { 
		type: Schema.Types.ObjectId, 
		ref: 'User', 
		required: true 
	},
	recipient: { 
		type: Schema.Types.ObjectId, 
		ref: 'User', 
		required: true 
	},
	status: {
		type: String,
		enum: ['pending', 'accepted', 'rejected'],
		default: 'pending'
	},
	message: {
		type: String,
		default: '',
		maxlength: 200
	},
	respondedAt: {
		type: Date,
		default: null
	},
	expiresAt: {
		type: Date,
		default: function() {
			// Follow requests expire after 7 days
			return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
		}
	}
}, { 
	timestamps: true 
});

// Indexes for efficient queries
followRequestSchema.index({ requester: 1, recipient: 1 }, { unique: true });
followRequestSchema.index({ recipient: 1, status: 1 });
followRequestSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Virtual for checking if request is expired
followRequestSchema.virtual('isExpired').get(function() {
	return this.expiresAt && new Date() > this.expiresAt;
});

const FollowRequest = mongoose.models.FollowRequest || mongoose.model('FollowRequest', followRequestSchema);

module.exports = FollowRequest;
