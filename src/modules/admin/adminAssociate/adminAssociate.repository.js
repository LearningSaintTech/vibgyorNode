const SubAdmin = require('../../subAdmin/auth/subAdmin.model');

const LIST_PROJECTION = 'name email phoneNumber countryCode location createdAt';

function buildSubadminFilter(search) {
	const filter = { role: 'subadmin' };
	if (search) {
		filter.$or = [
			{ name: { $regex: search, $options: 'i' } },
			{ email: { $regex: search, $options: 'i' } },
			{ phoneNumber: { $regex: search, $options: 'i' } },
		];
	}
	return filter;
}

async function findDuplicateSubadmin(email, phoneNumber) {
	return SubAdmin.findOne({ $or: [{ email }, { phoneNumber }] });
}

async function createSubadmin(data) {
	return SubAdmin.create(data);
}

async function findSubadminsForExport(filter) {
	return SubAdmin.find(filter).select(LIST_PROJECTION).sort({ createdAt: -1 }).lean();
}

async function findSubadminsPaginated(filter, { skip, limit }) {
	const [users, total] = await Promise.all([
		SubAdmin.find(filter).select(LIST_PROJECTION).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
		SubAdmin.countDocuments(filter),
	]);
	return { users, total };
}

module.exports = {
	buildSubadminFilter,
	findDuplicateSubadmin,
	createSubadmin,
	findSubadminsForExport,
	findSubadminsPaginated,
};
