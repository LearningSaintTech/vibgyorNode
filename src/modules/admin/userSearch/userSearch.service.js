const userSearchRepository = require('./userSearch.repository');

async function getUsers(query = {}) {
	const { type, search, page = 1, limit = 10, export: isExport } = query;
	const filter = userSearchRepository.buildUserSearchFilter({ type, search });

	if (isExport === 'true') {
		const users = await userSearchRepository.findUsersForExport(filter);
		return { ok: true, export: true, users };
	}

	const skip = (Number(page) - 1) * Number(limit);
	const { users, total } = await userSearchRepository.findUsersPaginated(filter, {
		skip,
		limit: Number(limit),
	});

	const usersWithSN = users.map((user, index) => ({
		sn: (Number(page) - 1) * Number(limit) + index + 1,
		...user,
	}));

	return {
		ok: true,
		message: 'Users fetched successfully',
		data: {
			users: usersWithSN,
			pagination: {
				total,
				page: Number(page),
				limit: Number(limit),
				totalPages: Math.ceil(total / limit),
			},
		},
	};
}

async function updateUserStatus(userId, isActive) {
	if (typeof isActive !== 'boolean') {
		return { ok: false, statusCode: 400, message: 'isActive must be true or false' };
	}

	const user = await userSearchRepository.updateUserStatus(userId, isActive);
	if (!user) {
		return { ok: false, statusCode: 404, message: 'User not found' };
	}

	return {
		ok: true,
		message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
		data: user,
	};
}

module.exports = { getUsers, updateUserStatus };
