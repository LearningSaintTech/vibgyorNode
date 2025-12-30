const User = require('../../user/auth/model/userAuthModel');
const ApiResponse = require('../../utils/apiResponse');

// Get user counts (Total Users, Verified Users, Verification Pending)
async function getUserCounts(req, res) {
	const userRole = req.user?.role || 'unknown';
	try {
		// eslint-disable-next-line no-console
		console.log(`[${userRole.toUpperCase()}][USER_COUNT] getUserCounts request`);

		// Get total users count (excluding admin and subadmin roles)
		// Explicitly exclude admin and subadmin roles
		const baseFilter = {
			role: { $nin: ['admin', 'subadmin'] }
		};

		const totalUsers = await User.countDocuments(baseFilter);


		// Get verified users count (verificationStatus === 'approved')
		const verifiedUsers = await User.countDocuments({
			role: { $nin: ['admin', 'subadmin'] },
			verificationStatus: 'approved'
		});

		// Get verification pending count (verificationStatus === 'pending')
		const verificationPending = await User.countDocuments({
			role: { $nin: ['admin', 'subadmin'] },
			verificationStatus: 'pending'
		});

		// ✅ NEW: Total Deactivated Users
		const deactivatedUsers = await User.countDocuments({
			...baseFilter,
			isActive: false
		});
		// Get rejected users count (verificationStatus === 'rejected')
		const rejectedUsers = await User.countDocuments({
			role: { $nin: ['admin', 'subadmin'] },
			verificationStatus: 'rejected'
		});



		// Debug: Get sample of verified users to verify query
		const sampleVerifiedUsers = await User.find({
			role: { $nin: ['admin', 'subadmin'] },
			verificationStatus: 'approved'
		}).select('_id username fullName role verificationStatus').limit(5).lean();

		// eslint-disable-next-line no-console
		console.log(`[${userRole.toUpperCase()}][USER_COUNT] User counts fetched successfully`, {
			totalUsers,
			verifiedUsers,
			verificationPending,
			deactivatedUsers,
			rejectedUsers,
			sampleVerifiedUsers: sampleVerifiedUsers.map(u => ({
				id: u._id,
				username: u.username,
				role: u.role,
				verificationStatus: u.verificationStatus
			}))
		});

		return ApiResponse.success(res, {
			totalUsers,
			verifiedUsers,
			verificationPending,
			deactivatedUsers,
			rejectedUsers
		}, 'User counts fetched successfully');
	} catch (e) {
		// eslint-disable-next-line no-console
		console.error(`[${userRole.toUpperCase()}][USER_COUNT] getUserCounts error:`, e?.message || e);
		return ApiResponse.serverError(res, 'Failed to fetch user counts');
	}
}

module.exports = {
	getUserCounts
};

