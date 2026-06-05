const SubAdmin = require('./subAdmin.model');

async function findSubAdminByPhone(phoneNumber) {
	return SubAdmin.findOne({ phoneNumber });
}

async function findOrCreateSubAdmin(phoneNumber, countryCode = '+91') {
	let subadmin = await findSubAdminByPhone(phoneNumber);
	if (!subadmin) {
		subadmin = await SubAdmin.create({ phoneNumber, countryCode });
	}
	return subadmin;
}

async function findSubAdminById(id) {
	return SubAdmin.findById(id);
}

async function saveSubAdmin(subadmin) {
	return subadmin.save();
}

module.exports = {
	findSubAdminByPhone,
	findOrCreateSubAdmin,
	findSubAdminById,
	saveSubAdmin,
};
