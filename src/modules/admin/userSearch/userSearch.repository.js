const User = require('../../user/user.model');

const LIST_SELECT =
	'fullName profilePictureUrl username phoneNumber countryCode location createdAt isActive';

function buildUserSearchFilter({ type, search } = {}) {
	const filter = { role: { $nin: ['admin', 'subadmin'] } };
	if (type === 'verified') filter.verificationStatus = 'approved';
	if (type === 'pending') filter.verificationStatus = 'pending';
	if (type === 'deactivated') filter.isActive = false;

	if (search) {
		filter.$or = [
			{ fullName: { $regex: search, $options: 'i' } },
			{ username: { $regex: search, $options: 'i' } },
			{ email: { $regex: search, $options: 'i' } },
			{ role: { $regex: search, $options: 'i' } },
			{ userId: { $regex: search, $options: 'i' } },
			{ phoneNumber: { $regex: search, $options: 'i' } },
		];
	}
	return filter;
}

async function findUsersForExport(filter) {
	return User.find(filter).sort({ createdAt: -1 }).lean();
}

async function findUsersPaginated(filter, { skip, limit }) {
	const [users, total] = await Promise.all([
		User.find(filter).select(LIST_SELECT).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
		User.countDocuments(filter),
	]);
	return { users, total };
}

async function updateUserStatus(userId, isActive) {
	return User.findOneAndUpdate(
		{ _id: userId, role: { $nin: ['admin', 'subadmin'] } },
		{ isActive },
		{ new: true }
	).select('fullName email isActive');
}

module.exports = {
	buildUserSearchFilter,
	findUsersForExport,
	findUsersPaginated,
	updateUserStatus,
};
