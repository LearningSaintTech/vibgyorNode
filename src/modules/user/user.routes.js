/**
 * User module route exports (Khush-style aggregator).
 * Mount paths unchanged — wired in app.js.
 */
const { authRoutes } = require('./auth');
const { usernameRoutes } = require('./username');
const { deleteAccountRoutes } = require('./deleteAccount');
const { catalogRoutes } = require('./catalog');
const { uploadRoutes } = require('./upload');

module.exports = {
	authRoutes,
	usernameRoutes,
	deleteAccountRoutes,
	catalogRoutes,
	uploadRoutes,
};
