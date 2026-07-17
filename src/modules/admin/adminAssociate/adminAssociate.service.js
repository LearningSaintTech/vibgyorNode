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
	const { search, page = 1, limit = 10, export: isExport, status } = query;
	const filter = adminAssociateRepository.buildSubadminFilter(search, status);

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
		_id: u._id,
		sn: skip + i + 1,
		date: u.createdAt,
		createdAt: u.createdAt,
		name: u.name || '-',
		associateName: u.name || '-',
		location: u.location || {},
		locationLabel: `${u.location?.city || '-'}, ${u.location?.state || '-'}, ${u.location?.country || '-'}`,
		contact: `${u.countryCode || ''} ${u.phoneNumber || '-'}`,
		phoneNumber: u.phoneNumber || '',
		countryCode: u.countryCode || '+91',
		email: u.email || '-',
		isActive: u.isActive,
	}));

	return {
		ok: true,
		message: 'Subadmins fetched successfully',
		data: {
			users: tableUsers,
			subAdmins: tableUsers,
			pagination: {
				total,
				page: Number(page),
				limit: Number(limit),
				totalPages: Math.ceil(total / limit),
				pages: Math.ceil(total / limit),
			},
		},
	};
}

async function getAssignedUsersBySubadmin(subadminId, query = {}) {
	const User = require('../../user/user.model');
	const { page = 1, limit = 10, search } = query;
	const pageNum = Number(page) || 1;
	const limitNum = Number(limit) || 10;
	const skip = (pageNum - 1) * limitNum;

	const filter = {
		'verificationDocument.reviewedBy': subadminId,
		role: { $nin: ['admin', 'subadmin'] },
	};

	if (search && String(search).trim()) {
		const term = String(search).trim();
		filter.$or = [
			{ fullName: { $regex: term, $options: 'i' } },
			{ username: { $regex: term, $options: 'i' } },
			{ email: { $regex: term, $options: 'i' } },
			{ phoneNumber: { $regex: term, $options: 'i' } },
		];
	}

	const [users, total] = await Promise.all([
		User.find(filter)
			.select('fullName username email phoneNumber countryCode profilePictureUrl verificationStatus createdAt')
			.sort({ 'verificationDocument.reviewedAt': -1, createdAt: -1 })
			.skip(skip)
			.limit(limitNum)
			.lean(),
		User.countDocuments(filter),
	]);

	const mapped = users.map((u) => ({
		_id: u._id,
		fullName: u.fullName || u.username || '—',
		phoneNumber: u.phoneNumber || '',
		countryCode: u.countryCode || '',
		email: u.email || '',
		verificationStatus: u.verificationStatus || 'none',
		image: u.profilePictureUrl || '',
		createdAt: u.createdAt,
	}));

	return {
		ok: true,
		message: 'Assigned users fetched successfully',
		data: {
			users: mapped,
			pagination: {
				total,
				page: pageNum,
				limit: limitNum,
				pages: Math.ceil(total / limitNum),
			},
		},
	};
}

module.exports = { createSubadmin, getSubadmins, getAssignedUsersBySubadmin };
