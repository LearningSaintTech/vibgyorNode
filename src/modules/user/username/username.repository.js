const User = require('../user.model');

async function findByUsernameNorm(usernameNorm) {
	return User.findOne({ usernameNorm }).lean();
}

async function findTakenUsernameNorms(usernameNorms) {
	return User.find({ usernameNorm: { $in: usernameNorms } })
		.select('usernameNorm')
		.lean();
}

module.exports = {
	findByUsernameNorm,
	findTakenUsernameNorms,
};
