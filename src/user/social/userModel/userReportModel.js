const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema(
	{
		reporter: { 
			type: mongoose.Schema.Types.ObjectId, 
			ref: 'User', 
			required: true,
			index: true
		},
		reportedUser: { 
			type: mongoose.Schema.Types.ObjectId, 
			ref: 'User', 
			required: true,
			index: true
		},
		reportType: { 
			type: String, 
			enum: ['spam', 'harassment', 'inappropriate_content', 'fake_profile', 'violence', 'hate_speech', 'other'], 
			required: true 
		},
		description: { 
			type: String, 
			required: true,
			maxlength: 1000
		},
		status: { 
			type: String, 
			enum: ['pending', 'under_review', 'resolved', 'dismissed'], 
			default: 'pending',
			index: true
		},
		priority: {
			type: String,
			enum: ['low', 'medium', 'high', 'urgent'],
			default: 'medium'
		},
		reviewedBy: { 
			type: mongoose.Schema.Types.ObjectId, 
			ref: 'Admin', 
			default: null 
		},
		reviewedAt: { 
			type: Date, 
			default: null 
		},
		actionTaken: {
			type: String,
			enum: ['none', 'warning', 'temporary_ban', 'permanent_ban', 'content_removed', 'account_suspended'],
			default: 'none'
		},
		reviewerRole: { 
			type: String, 
			enum: ['admin', 'subadmin'], 
			default: null 
		},
		reviewNotes: {
			type: String,
			maxlength: 500
		},
		// Additional metadata
		reportedContent: {
			contentType: { type: String, enum: ['profile', 'post', 'message', 'comment'], default: 'profile' },
			contentId: { type: String, default: '' },
			contentUrl: { type: String, default: '' }
		},
		// Track if reporter has been notified
		notifiedReporter: { type: Boolean, default: false },
		notifiedAt: { type: Date, default: null }
	},
	{ 
		timestamps: true,
		indexes: [
			{ reporter: 1, reportedUser: 1 }, // Compound index for duplicate prevention
			{ status: 1, createdAt: -1 }, // For admin queries
			{ reportType: 1, status: 1 } // For filtering
		]
	}
);

// Prevent duplicate reports from same user
ReportSchema.index({ reporter: 1, reportedUser: 1 }, { unique: true });

// Virtual for report age
ReportSchema.virtual('ageInHours').get(function() {
	return Math.floor((Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60));
});

// Method to check if report is recent
ReportSchema.methods.isRecent = function(hours = 24) {
	return this.ageInHours < hours;
};

// Static method to get reports by status
ReportSchema.statics.getByStatus = function(status, limit = 10, skip = 0) {
	return this.find({ status })
		.populate('reporter', 'username fullName email')
		.populate('reportedUser', 'username fullName email')
		.populate('reviewedBy', 'name email')
		.sort({ createdAt: -1 })
		.limit(limit)
		.skip(skip);
};

// Static method to get report statistics
ReportSchema.statics.getStats = async function() {
	const stats = await this.aggregate([
		{
			$group: {
				_id: '$status',
				count: { $sum: 1 }
			}
		}
	]);
	
	const reportTypeStats = await this.aggregate([
		{
			$group: {
				_id: '$reportType',
				count: { $sum: 1 }
			}
		}
	]);

	return {
		byStatus: stats.reduce((acc, stat) => {
			acc[stat._id] = stat.count;
			return acc;
		}, {}),
		byType: reportTypeStats.reduce((acc, stat) => {
			acc[stat._id] = stat.count;
			return acc;
		}, {})
	};
};

const Report = mongoose.models.Report || mongoose.model('Report', ReportSchema);

module.exports = Report;
