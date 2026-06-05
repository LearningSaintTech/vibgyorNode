const User = require('../../user/user.model');

const BASE_USER_FILTER = { role: { $nin: ['admin', 'subadmin'] } };

async function countTotalUsers() {
	return User.countDocuments(BASE_USER_FILTER);
}

async function countVerifiedUsers() {
	return User.countDocuments({ ...BASE_USER_FILTER, verificationStatus: 'approved' });
}

async function countVerificationPending() {
	return User.countDocuments({ ...BASE_USER_FILTER, verificationStatus: 'pending' });
}

async function countDeactivatedUsers() {
	return User.countDocuments({ ...BASE_USER_FILTER, isActive: false });
}

async function countRejectedUsers() {
	return User.countDocuments({ ...BASE_USER_FILTER, verificationStatus: 'rejected' });
}

async function findSampleVerifiedUsers(limit = 5) {
	return User.find({ ...BASE_USER_FILTER, verificationStatus: 'approved' })
		.select('_id username fullName role verificationStatus')
		.limit(limit)
		.lean();
}

module.exports = {
	countTotalUsers,
	countVerifiedUsers,
	countVerificationPending,
	countDeactivatedUsers,
	countRejectedUsers,
	findSampleVerifiedUsers,
};
