const userCountRepository = require('./userCount.repository');

async function getUserCounts() {
	const [
		totalUsers,
		verifiedUsers,
		verificationPending,
		deactivatedUsers,
		rejectedUsers,
		sampleVerifiedUsers,
	] = await Promise.all([
		userCountRepository.countTotalUsers(),
		userCountRepository.countVerifiedUsers(),
		userCountRepository.countVerificationPending(),
		userCountRepository.countDeactivatedUsers(),
		userCountRepository.countRejectedUsers(),
		userCountRepository.findSampleVerifiedUsers(5),
	]);

	return {
		ok: true,
		message: 'User counts fetched successfully',
		data: {
			totalUsers,
			verifiedUsers,
			verificationPending,
			deactivatedUsers,
			rejectedUsers,
		},
		debug: {
			sampleVerifiedUsers: sampleVerifiedUsers.map((u) => ({
				id: u._id,
				username: u.username,
				role: u.role,
				verificationStatus: u.verificationStatus,
			})),
		},
	};
}

module.exports = { getUserCounts };
