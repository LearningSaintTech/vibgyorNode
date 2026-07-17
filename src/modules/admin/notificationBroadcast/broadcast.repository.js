const Broadcast = require('./broadcast.model');

function buildUserFilter({ isActive = true, verifiedOnly = false } = {}) {
	const filter = { role: 'user' };
	if (isActive !== undefined && isActive !== null) {
		filter.isActive = Boolean(isActive);
	}
	if (verifiedOnly) {
		filter.verificationStatus = 'approved';
	}
	return filter;
}

async function createBroadcast(data) {
	return Broadcast.create(data);
}

async function findBroadcastById(id) {
	return Broadcast.findById(id).lean();
}

async function findBroadcasts({ page = 1, limit = 10 } = {}) {
	const pageNum = Math.max(1, parseInt(page, 10) || 1);
	const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
	const skip = (pageNum - 1) * limitNum;

	const [items, total] = await Promise.all([
		Broadcast.find().sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
		Broadcast.countDocuments(),
	]);

	return {
		items,
		pagination: {
			page: pageNum,
			limit: limitNum,
			total,
			pages: Math.ceil(total / limitNum) || 1,
		},
	};
}

async function updateBroadcast(id, update) {
	return Broadcast.findByIdAndUpdate(id, update, { new: true }).lean();
}

async function claimBroadcastForProcessing(id) {
	return Broadcast.findOneAndUpdate(
		{ _id: id, status: 'pending' },
		{ status: 'processing', startedAt: new Date() },
		{ new: true }
	).lean();
}

module.exports = {
	buildUserFilter,
	createBroadcast,
	findBroadcastById,
	findBroadcasts,
	updateBroadcast,
	claimBroadcastForProcessing,
};
