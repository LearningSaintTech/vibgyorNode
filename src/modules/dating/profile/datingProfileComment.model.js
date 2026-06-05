const mongoose = require('mongoose');

const DatingProfileCommentSchema = new mongoose.Schema(
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
		text: {
			type: String,
			required: true,
			maxlength: 500
		},
		likes: [{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User'
		}],
		likesCount: {
			type: Number,
			default: 0
		},
		isPinned: {
			type: Boolean,
			default: false
		},
		isDeleted: {
			type: Boolean,
			default: false
		}
	},
	{ timestamps: true }
);

DatingProfileCommentSchema.index({ targetUser: 1, createdAt: -1 });

DatingProfileCommentSchema.methods.toggleLike = async function(userId) {
	const hasLiked = this.likes.some(id => id.toString() === userId.toString());
	if (hasLiked) {
		this.likes = this.likes.filter(id => id.toString() !== userId.toString());
	} else {
		this.likes.push(userId);
	}
	this.likesCount = this.likes.length;
	await this.save();
	return !hasLiked;
};

const DatingProfileComment =
	mongoose.models.DatingProfileComment ||
	mongoose.model('DatingProfileComment', DatingProfileCommentSchema);

module.exports = DatingProfileComment;

