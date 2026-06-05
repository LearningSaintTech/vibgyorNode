const Admin = require('./admin.model');

async function findAdminByPhone(phoneNumber) {
	return Admin.findOne({ phoneNumber });
}

async function createAdmin({ phoneNumber, countryCode = '+91' }) {
	return Admin.create({ phoneNumber, countryCode });
}

async function findAdminById(adminId) {
	return Admin.findById(adminId);
}

async function saveAdmin(admin) {
	return admin.save();
}

module.exports = {
	findAdminByPhone,
	createAdmin,
	findAdminById,
	saveAdmin,
};
