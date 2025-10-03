const Roles = Object.freeze({
	ADMIN: 'admin',
	SUBADMIN: 'subadmin',
	USER: 'user',
});

const AllRoles = Object.freeze([Roles.ADMIN, Roles.SUBADMIN, Roles.USER]);

// Generate unique call ID
const generateCallId = () => {
	const timestamp = Date.now().toString(36);
	const random = Math.random().toString(36).substr(2, 5);
	return `call_${timestamp}_${random}`;
};

module.exports = {
	Roles,
	AllRoles,
	generateCallId,
};


