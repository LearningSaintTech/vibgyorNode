const adminAssociateRepository = require('./adminAssociate.repository');

async function createSubadmin(body, createdBy) {
	const { name, email, phoneNumber, countryCode, city, state, country } = body || {};

	if (!name || !email || !phoneNumber) {
		return {
			ok: false,
			statusCode: 400,
			useRawResponse: true,
			body: { success: false, message: 'name, email, and phone number are required' },
		};
	}

	const exists = await adminAssociateRepository.findDuplicateSubadmin(email, phoneNumber);
	if (exists) {
		return {
			ok: false,
			statusCode: 409,
			useRawResponse: true,
			body: { success: false, message: 'Subadmin already exists' },
		};
	}

	const subadmin = await adminAssociateRepository.createSubadmin({
		name,
		email,
		phoneNumber,
		countryCode: countryCode || '+91',
		role: 'subadmin',
		location: { city, state, country },
		isActive: true,
		createdBy,
	});

	return {
		ok: true,
		statusCode: 201,
		useRawResponse: true,
		body: {
			success: true,
			message: 'Subadmin created successfully',
			data: {
				id: subadmin._id,
				associateName: subadmin.name,
				email: subadmin.email,
				contact: `${subadmin.countryCode} ${subadmin.phoneNumber}`,
				location: [city, state, country].filter(Boolean).join(', '),
				date: subadmin.createdAt,
			},
		},
	};
}

async function getSubadmins(query = {}) {
	const { search, page = 1, limit = 10, export: isExport } = query;
	const filter = adminAssociateRepository.buildSubadminFilter(search);

	if (isExport === 'true') {
		const users = await adminAssociateRepository.findSubadminsForExport(filter);
		return { ok: true, export: true, users };
	}

	const skip = (Number(page) - 1) * Number(limit);
	const { users, total } = await adminAssociateRepository.findSubadminsPaginated(filter, {
		skip,
		limit: Number(limit),
	});

	const tableUsers = users.map((u, i) => ({
		sn: skip + i + 1,
		date: u.createdAt,
		associateName: u.name || '-',
		location: `${u.location?.city || '-'}, ${u.location?.state || '-'}, ${u.location?.country || '-'}`,
		contact: `${u.countryCode || ''} ${u.phoneNumber || '-'}`,
		email: u.email || '-',
	}));

	return {
		ok: true,
		message: 'Subadmins fetched successfully',
		data: {
			users: tableUsers,
			pagination: {
				total,
				page: Number(page),
				limit: Number(limit),
				totalPages: Math.ceil(total / limit),
			},
		},
	};
}

module.exports = { createSubadmin, getSubadmins };
